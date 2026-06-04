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
 * (e.g. "SCS_1"). Every browser tab for the same user subscribes to this
 * same topic, so a single backend publish reaches all of them simultaneously.
 * The topic is stored in sessionStorage under "user_mqtt_topic" by AppLayout.
 *
 * Each payload carries an `event` field that maps to one of the MQTT_TYPE
 * constants below. Unknown events are logged to the console (not silently dropped).
 *
 * force_logout — multi-tab aware
 * ────────────────────────────────
 * When a user logs in from a different browser/device, the backend publishes
 * `force_logout` with `data.newDeviceId`. The handler compares this against
 * `localStorage.scs_device_id` (shared across all tabs in the same browser).
 * - Match    → this IS a tab in the same browser as the new login → skip logout
 * - No match → this is a different browser/device → force logout + redirect
 * This allows the same user to open multiple tabs within one browser freely
 * while still kicking out genuinely different browser/device sessions.
 *
 * Central handler responsibilities
 * ──────────────────────────────────
 * Each handler in this file may do two things:
 *  1. Invalidate the matching dropdown cache entry (dropdownCache.invalidate)
 *     so the next page that needs that dropdown fetches fresh data from the API.
 *  2. Page-level handlers (registered via useSubscribe in each page component)
 *     handle list refresh / row-level updates for the currently visible page.
 * Central handlers only run cache invalidation — they never touch page state.
 *
 * Adding a new message type
 * ──────────────────────────
 * 1. Add the constant to MQTT_TYPE.
 * 2. Add a case to the router object inside useMqttListener.
 * 3. If the event affects a dropdown list, add dropdownCache.invalidate(DD_KEYS.XXX).
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
import { useSubscribe } from '../context/MqttContext'
import { createMqttTypeRouter } from '../utils/mqttRouter'
import mqttService from '../services/mqtt.service'
import { logoutApi } from '../services/auth.service'
import { clearLocalSession, LS_KEYS } from '../utils/sessionRestore'
import { dropdownCache, DD_KEYS } from '../utils/dropdownCache'
import { setDefaultCriteria } from '../utils/defaultCriteria'

// ─────────────────────────────────────────────────────────────────────────────
// MQTT EVENT CONSTANTS
// Keep in sync with the backend broker payload `event` values.
// ─────────────────────────────────────────────────────────────────────────────

export const MQTT_TYPE = {
  // ── Auth → Admin ──────────────────────────────────────────────────────────
  /** Admin receives: a new user submitted a signup request */
  NEW_SIGNUP_REQUEST: 'user_registration_submitted',

  // ── Admin → Admin ─────────────────────────────────────────────────────────
  /** Admin receives: a signup request was approved */
  SIGNUP_REQUEST_APPROVED: 'signup_request_approved',

  /** Admin receives: a signup request was declined */
  SIGNUP_REQUEST_DECLINED: 'signup_request_declined',

  /** Admin receives: a user's details were edited — silent list refresh */
  USER_DETAILS_UPDATED: 'user_details_updated',

  /** Admin receives: a new group was created — silent list refresh */
  GROUP_CREATED: 'group_created',

  /** Admin receives: a group was updated — silent list refresh */
  GROUP_UPDATED: 'group_updated',

  /** Admin receives: a group was deleted — silent list refresh */
  GROUP_DELETED: 'group_deleted',

  /** Admin receives: a new formula was created — silent list refresh */
  FORMULA_CREATED: 'formula_created',

  /** Admin receives: a formula was updated — silent list refresh */
  FORMULA_UPDATED: 'formula_updated',

  // ── Manager → Manager ─────────────────────────────────────────────────────
  /** Manager receives: a pending approval was approved/declined — silent list refresh */
  PENDING_APPROVAL_UPDATED: 'pending_approval_updated',

  // ── Manager → Data Entry ──────────────────────────────────────────────────
  /** Data Entry receives: their submission status was updated — silent list refresh */
  DATA_SUBMISSION_STATUS_UPDATED: 'data_submission_status_updated',

  // ── Data Entry → Manager ──────────────────────────────────────────────────
  /** Manager receives: market cap data saved */
  MARKET_CAP_SAVED: 'market_cap_saved',

  /** Manager receives: market cap data deleted */
  MARKET_CAP_DELETED: 'market_cap_deleted',

  /** Manager receives: market cap data uploaded */
  MARKET_CAP_UPLOADED: 'market_cap_uploaded',

  // ── Manager configuration saves ───────────────────────────────────────────
  /** Manager receives: a market was saved (add or edit) */
  MARKET_SAVED: 'market_saved',

  /** Manager receives: a sector was saved (add or edit) */
  SECTOR_SAVED: 'sector_saved',

  /** Manager receives: a quarter was saved (add or edit) */
  QUARTER_SAVED: 'quarter_saved',

  /** Manager receives: a classification was saved (add or edit) */
  CLASSIFICATION_SAVED: 'classification_saved',

  /** Manager receives: a financial ratio was saved (add or edit) */
  FINANCIAL_RATIO_SAVED: 'financial_ratio_saved',

  /** Manager receives: a company was saved (add or edit) */
  COMPANY_SAVED: 'company_saved',

  /** Manager receives: a sukuk was saved (add or edit) */
  SUKUK_SAVED: 'sukuk_saved',

  /** Manager receives: an Islamic bank was saved (add or edit) */
  ISLAMIC_BANK_SAVED: 'islamic_bank_saved',

  /** Manager receives: an Islamic bank window was saved (add or edit) */
  ISLAMIC_BANK_WINDOW_SAVED: 'islamic_bank_window_saved',

  /** Manager receives: a charitable org was saved (add or edit) */
  CHARITABLE_ORG_SAVED: 'charitable_org_saved',

  /** Manager receives: compliance criteria was saved (add or edit) */
  COMPLIANCE_CRITERIA_SAVED: 'compliance_criteria_saved',

  /** Manager receives: a suspended company was saved */
  SUSPENDED_COMPANY_SAVED: 'suspended_company_saved',

  /** Manager receives: a suspended company was deleted */
  SUSPENDED_COMPANY_DELETED: 'suspended_company_deleted',

  // ── Session control ───────────────────────────────────────────────────────
  /** Any role: another device logged in with this account */
  FORCE_LOGOUT: 'force_logout',
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
      // ── user_registration_submitted — silent ──────────────────────────────
      [MQTT_TYPE.NEW_SIGNUP_REQUEST]: () => {},

      // ── signup_request_approved — silent ──────────────────────────────────
      [MQTT_TYPE.SIGNUP_REQUEST_APPROVED]: () => {},

      // ── signup_request_declined — silent ──────────────────────────────────
      [MQTT_TYPE.SIGNUP_REQUEST_DECLINED]: () => {},

      // ── user_details_updated — silent, no toast ───────────────────────────
      [MQTT_TYPE.USER_DETAILS_UPDATED]: () => {},

      // ── group_created — silent ────────────────────────────────────────────
      [MQTT_TYPE.GROUP_CREATED]: () => {},

      // ── group_updated — silent ────────────────────────────────────────────
      [MQTT_TYPE.GROUP_UPDATED]: () => {},

      // ── group_deleted — silent ────────────────────────────────────────────
      [MQTT_TYPE.GROUP_DELETED]: () => {},

      // ── formula_created — silent ──────────────────────────────────────────
      [MQTT_TYPE.FORMULA_CREATED]: () => {},

      // ── formula_updated — silent ──────────────────────────────────────────
      [MQTT_TYPE.FORMULA_UPDATED]: () => {},

      // ── pending_approval_updated — silent ─────────────────────────────────
      [MQTT_TYPE.PENDING_APPROVAL_UPDATED]: () => {},

      // ── data_submission_status_updated — silent ───────────────────────────
      [MQTT_TYPE.DATA_SUBMISSION_STATUS_UPDATED]: () => {},

      // ── market_cap_saved/deleted/uploaded — silent (handled in MarketCapEntryPage)
      [MQTT_TYPE.MARKET_CAP_SAVED]: () => {},
      [MQTT_TYPE.MARKET_CAP_DELETED]: () => {},
      [MQTT_TYPE.MARKET_CAP_UPLOADED]: () => {},

      // ── manager config saves ──────────────────────────────────────────────
      // Each handler does two things:
      //  1. Invalidates the matching dropdown cache entry in localStorage so
      //     the next page that needs this dropdown fetches fresh data.
      //  2. Page-level handlers (useSubscribe in each page) do the list refresh.
      [MQTT_TYPE.MARKET_SAVED]: () => dropdownCache.invalidate(DD_KEYS.MARKETS),

      [MQTT_TYPE.SECTOR_SAVED]: () => dropdownCache.invalidate(DD_KEYS.SECTORS),

      [MQTT_TYPE.QUARTER_SAVED]: () => dropdownCache.invalidate(DD_KEYS.QUARTERS),

      [MQTT_TYPE.CLASSIFICATION_SAVED]: () => dropdownCache.invalidate(DD_KEYS.CLASSIFICATIONS),

      // financial_ratio_saved — also handled (list refresh) in FinancialRatiosPage
      [MQTT_TYPE.FINANCIAL_RATIO_SAVED]: () => dropdownCache.invalidate(DD_KEYS.FINANCIAL_RATIOS),

      // company_saved — invalidates both company names and tickers dropdowns
      [MQTT_TYPE.COMPANY_SAVED]: () => {
        dropdownCache.invalidate(DD_KEYS.COMPANY_NAMES)
        dropdownCache.invalidate(DD_KEYS.COMPANY_TICKERS)
      },

      [MQTT_TYPE.SUKUK_SAVED]: () => {},
      [MQTT_TYPE.ISLAMIC_BANK_SAVED]: () => {},
      [MQTT_TYPE.ISLAMIC_BANK_WINDOW_SAVED]: () => {},
      [MQTT_TYPE.CHARITABLE_ORG_SAVED]: () => {},

      // compliance_criteria_saved — keep the shared default value fresh app-wide.
      // Payload: data[0] = { criteria:{ pkComplianceCriteriaID, criteriaName, isDefault, … }, ratioMappings:[…] }
      // ComplianceCriteriaPage also subscribes (list refresh); this central handler
      // only updates the localStorage default so every tab/role stays in sync.
      [MQTT_TYPE.COMPLIANCE_CRITERIA_SAVED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        const c = d?.criteria
        if (c?.isDefault) {
          setDefaultCriteria([
            { pK_ComplianceCriteriaID: c.pkComplianceCriteriaID, criteriaName: c.criteriaName },
          ])
        }
      },
      [MQTT_TYPE.SUSPENDED_COMPANY_SAVED]: () => {},
      [MQTT_TYPE.SUSPENDED_COMPANY_DELETED]: () => {},

      // ── force_logout ──────────────────────────────────────────────────────
      // Reads scs_device_id from localStorage (shared across all tabs in the
      // same browser) so same-browser tabs are never kicked out by each other.
      // Only a genuinely different browser/device has a different device ID.
      [MQTT_TYPE.FORCE_LOGOUT]: (payload) => {
        const myDeviceId  = localStorage.getItem(LS_KEYS.DEVICE_ID)
        const newDeviceId = payload.data?.newDeviceId

        if (newDeviceId && newDeviceId === myDeviceId) return

        logoutApi().catch(() => {})
        mqttService.disconnect()
        clearLocalSession()
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
