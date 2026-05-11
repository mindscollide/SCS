/**
 * src/hooks/useMqttListener.js
 * =============================
 * Central MQTT message listener for the SCS application.
 *
 * Mounted once inside <MqttProvider> in AppLayout — never unmounts during
 * a session, so no message is ever missed regardless of which page is active.
 *
 * Message routing
 * ───────────────
 * All messages arrive on the user's shared topic: "SCS_{userID}"
 * (e.g. "SCS_1"). Every browser session for the same user subscribes to
 * this same topic, so a single backend publish reaches all of them.
 * The topic is stored in sessionStorage under "user_mqtt_topic" by AppLayout.
 *
 * Each payload carries an `event` field that maps to one of the MQTT_TYPE
 * constants below. Unknown events are logged to the console (not silently dropped).
 *
 * Adding a new message type
 * ──────────────────────────
 * 1. Add the constant to MQTT_TYPE.
 * 2. Add a case to the router object inside useMqttListener.
 *
 * Broker payload shape
 * ─────────────────────
 * {
 *   event:   string   — one of MQTT_TYPE values (required)
 *   data:    object   — event-specific fields (see each handler)
 *   message: string   — human-readable description (optional)
 * }
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useSubscribe } from '../context/MqttContext'
import { createMqttTypeRouter } from '../utils/mqttRouter'
import mqttService from '../services/mqtt.service'
import { logoutApi } from '../services/auth.service'

// ─────────────────────────────────────────────────────────────────────────────
// MQTT EVENT CONSTANTS
// Keep in sync with the backend broker payload `event` values.
// ─────────────────────────────────────────────────────────────────────────────

export const MQTT_TYPE = {
  // ── Data Entry → Manager ──────────────────────────────────────────────────
  /** Manager receives: a Data Entry officer submitted financial data for approval */
  SUBMISSION_RECEIVED: 'submission_received',

  // ── Manager → Data Entry ──────────────────────────────────────────────────
  /** Data Entry receives: their submission was approved or declined.
   *  data: { status: 'Approved'|'Declined', company?, quarter?, notes? }
   */
  APPROVAL_UPDATED: 'approval_updated',

  // ── Admin → Any ───────────────────────────────────────────────────────────
  /** Admin receives: a new user registered and is waiting for approval.
   *  data: { userName?, email?, role? }
   */
  NEW_SIGNUP_REQUEST: 'user_registration_submitted',

  /** Pending user receives: admin approved or declined their registration.
   *  data: { status: 'Approved'|'Declined', notes? }
   */
  REQUEST_PROCESSED: 'request_processed',

  // ── Session control ───────────────────────────────────────────────────────
  /** Any role: another device just logged in with this account.
   *  data: { newDeviceId: string }
   *  Sessions whose deviceId ≠ newDeviceId are displaced and must log out.
   */
  FORCE_LOGOUT: 'force_logout',
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const errorToastStyle = {
  style: { backgroundColor: '#E74C3C', color: '#fff' },
  progressStyle: { backgroundColor: '#ffffff50' },
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

const useMqttListener = () => {
  const navigate = useNavigate()

  // Shared topic stored by AppLayout: "SCS_{userID}"
  // Falls back to null — useSubscribe skips registration when topic is null.
  const topic = sessionStorage.getItem('user_mqtt_topic') || null

  const handler = useCallback(
    createMqttTypeRouter({
      // ── submission_received ───────────────────────────────────────────────
      // payload: { event, data: { company?, quarter?, submittedBy? } }
      [MQTT_TYPE.SUBMISSION_RECEIVED]: (payload) => {
        const d = payload.data ?? {}
        const company = d.company ? ` for ${d.company}` : ''
        const quarter = d.quarter ? ` (${d.quarter})` : ''
        const by = d.submittedBy ? ` by ${d.submittedBy}` : ''
        toast.info(`📋 New submission received${company}${quarter}${by}.`)
      },

      // ── approval_updated ─────────────────────────────────────────────────
      // payload: { event, data: { status: 'Approved'|'Declined', company?, quarter?, notes? } }
      [MQTT_TYPE.APPROVAL_UPDATED]: (payload) => {
        const d = payload.data ?? {}
        const company = d.company ? ` for ${d.company}` : ''
        const quarter = d.quarter ? ` (${d.quarter})` : ''
        if (d.status === 'Approved') {
          toast.success(`✅ Your submission${company}${quarter} was approved.`)
        } else {
          const notes = d.notes ? ` — "${d.notes}"` : ''
          toast.error(
            `❌ Your submission${company}${quarter} was declined${notes}.`,
            errorToastStyle
          )
        }
      },

      // ── user_registration_submitted ───────────────────────────────────────
      // payload: { event, data: { userName?, email?, role? } }
      [MQTT_TYPE.NEW_SIGNUP_REQUEST]: (payload) => {
        const d = payload.data ?? {}
        const user = d.userName || d.email || 'a new user'
        const role = d.role ? ` (${d.role})` : ''
        toast.info(`🔔 New signup request from ${user}${role}.`)
      },

      // ── request_processed ────────────────────────────────────────────────
      // payload: { event, data: { status: 'Approved'|'Declined', notes? } }
      [MQTT_TYPE.REQUEST_PROCESSED]: (payload) => {
        const d = payload.data ?? {}
        if (d.status === 'Approved') {
          toast.success('🎉 Your account registration has been approved!')
        } else {
          const notes = d.notes ? ` — "${d.notes}"` : ''
          toast.error(`Your account registration was declined${notes}.`, errorToastStyle)
        }
      },

      // ── force_logout ──────────────────────────────────────────────────────
      // Backend publishes to SCS_{userID} (shared) so every open session
      // receives this. Only sessions whose deviceId ≠ newDeviceId log out.
      // payload: { event: 'force_logout', data: { newDeviceId: string } }
      [MQTT_TYPE.FORCE_LOGOUT]: (payload) => {
        const myDeviceId = sessionStorage.getItem('user_device_id')
        const newDeviceId = payload.data?.newDeviceId

        if (newDeviceId && newDeviceId === myDeviceId) {
          // This IS the new session — ignore.
          return
        }

        // This session was displaced by a newer login.
        // Call logout API first (best-effort — fire and forget, don't block navigation).
        logoutApi().catch(() => {/* ignore — session is being terminated anyway */})

        mqttService.disconnect()
        sessionStorage.clear()
        navigate('/multiple-login', { replace: true })
      },

      // ── Unknown event ─────────────────────────────────────────────────────
      '*': (payload, topic) => {
        console.warn(`[MQTT] Unhandled event: "${payload?.event}" on topic "${topic}"`, payload)
      },
    }),
    [navigate]
  )

  useSubscribe(topic, handler)
}

// ─────────────────────────────────────────────────────────────────────────────
// NULL-RENDER COMPONENT
// Renders nothing — exists only to call useMqttListener() so the hook has
// access to both MqttContext (useSubscribe) and React Router (useNavigate).
// Placed as the first child of <MqttProvider> in AppLayout, never unmounts.
// ─────────────────────────────────────────────────────────────────────────────

const MqttListenerSetup = () => {
  useMqttListener()
  return null
}

export default MqttListenerSetup
