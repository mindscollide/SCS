/**
 * src/components/layout/AppLayout.jsx
 * =====================================
 * Shell for all authenticated pages.
 *
 * Also owns the MQTT connection for the entire authenticated session:
 *  - Connects on mount (or reconnects after hard refresh / new-tab restore)
 *  - Stays alive while the user navigates between pages
 *  - Disconnected by Topbar / api.js on logout
 *
 * Cross-tab logout sync:
 *  Listens to the browser 'storage' event. When any tab logs out,
 *  clearLocalSession() removes scs_auth_token from localStorage, which fires
 *  the storage event in every other tab. Each tab then stops its timer,
 *  disconnects MQTT, clears sessionStorage, and redirects to /login — keeping
 *  all open tabs in sync without any extra network call.
 *
 * MQTT connection parameters:
 *  clientId  = SCS_{userID}_{tabSuffix}   — unique PER TAB (random, generated on mount)
 *                                           Paho disconnects duplicate clientIds, so each
 *                                           tab must use a different suffix. This allows
 *                                           multiple tabs to subscribe simultaneously
 *                                           without kicking each other off the broker.
 *  topic     = SCS_{userID}               — shared; all tabs for this user subscribe here
 *
 *  Note: the device ID used for force_logout comparison (scs_device_id) lives in
 *  localStorage and is intentionally shared across tabs — see useMqttListener.js.
 *
 * MQTT message flow:
 *  broker → onMessageArrivedCallback → globalListenersRef (all topics)
 *                                    → listenersRef.get(topic) (topic-specific)
 *         → page handler registered via useSubscribe / registerHandler
 *
 * Structure:
 *  ┌──────────────────────────────────────────────────────┐
 *  │  Topbar  (fixed, h-[56px], z-50, full width)        │
 *  ├────────────┬─────────────────────────────────────────┤
 *  │  Sidebar   │  Content area (ml-[210px], pt-[56px])  │
 *  │  (fixed,   │                                         │
 *  │   210px)   │  <Outlet /> — page renders here         │
 *  │            │                                         │
 *  │            ├─────────────────────────────────────────┤
 *  │            │  Footer                                 │
 *  └────────────┴─────────────────────────────────────────┘
 */

import React, { useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar.jsx'
import Sidebar from './Sidebar.jsx'
import { useMqttClient } from '../../hooks/useMqttClient'
import { MqttProvider } from '../../context/MqttContext'
import { resumeTokenTimer, stopTokenTimer } from '../../utils/tokenTimer'
import MqttListenerSetup from '../../hooks/useMqttListener'
import mqttService from '../../services/mqtt.service'
import { LS_KEYS } from '../../utils/sessionRestore'

const AppLayout = () => {
  // topic → Set<fn>  — multi-subscriber safe (multiple components per topic)
  const listenersRef = useRef(new Map())

  // Always-on handlers — receive every message regardless of topic
  const globalListenersRef = useRef(new Set())

  const mqttHook = useMqttClient({
    onMessageArrivedCallback: (payload, topic) => {
      console.log('[MQTT] Dispatch — topic:', topic, '| payload:', payload)
      // 1. Global listeners
      globalListenersRef.current.forEach((fn) => fn(payload, topic))
      // 2. Topic-specific listeners
      listenersRef.current.get(topic)?.forEach((fn) => fn(payload, topic))
    },
    onConnectionLostCallback: (err) => {
      console.warn('[MQTT] Connection lost:', err?.errorMessage)
    },
  })

  useEffect(() => {
    const profile = (() => {
      try {
        return JSON.parse(sessionStorage.getItem('user_profile_data'))
      } catch {
        return null
      }
    })()

    // Restore token expiry countdown after F5 / hard refresh
    resumeTokenTimer()

    if (profile?.userID) {
      // MQTT clientId must be unique per tab — generate a fresh random suffix on
      // each AppLayout mount. This prevents a new tab from kicking the existing
      // tab off the broker (Paho disconnects duplicate clientIds).
      // The device ID used for force_logout comparison lives in localStorage (scs_device_id)
      // and is intentionally shared across tabs — see useMqttListener.js.
      const tabSuffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`
      const clientId  = `SCS_${profile.userID}_${tabSuffix}` // unique per tab
      const topic     = `SCS_${profile.userID}`              // shared per user

      // Persist topic so useMqttListener and page hooks can read it without prop-drilling
      sessionStorage.setItem('user_mqtt_topic', topic)

      mqttHook.connectToMqtt({ subscribeID: clientId, topic })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cross-tab logout sync ─────────────────────────────────────────────────
  // When any tab in this browser logs out, clearLocalSession() removes
  // scs_auth_token from localStorage. The browser fires a 'storage' event in
  // every OTHER tab. We detect the removal and log this tab out too so all
  // tabs stay in sync without any extra API call.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === LS_KEYS.AUTH_TOKEN && e.newValue === null) {
        stopTokenTimer()
        mqttService.disconnect()
        sessionStorage.clear()
        window.location.replace('/login')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // ── Topic-specific handler registry (multi-subscriber) ────────────────────
  const registerHandler = useCallback((topic, fn) => {
    if (!listenersRef.current.has(topic)) listenersRef.current.set(topic, new Set())
    listenersRef.current.get(topic).add(fn)
  }, [])

  const unregisterHandler = useCallback((topic, fn) => {
    listenersRef.current.get(topic)?.delete(fn)
  }, [])

  // ── Global (topic-independent) handler registry ────────────────────────────
  const addGlobalListener = useCallback((fn) => {
    globalListenersRef.current.add(fn)
  }, [])

  const removeGlobalListener = useCallback((fn) => {
    globalListenersRef.current.delete(fn)
  }, [])

  const mqttContextValue = useMemo(
    () => ({
      isConnected: mqttHook.isConnected,
      subscribedTopics: mqttHook.subscribedTopics,
      subscribeToTopics: mqttHook.subscribeToTopics,
      unsubscribeFromTopics: mqttHook.unsubscribeFromTopics,
      publish: mqttHook.publish,
      registerHandler,
      unregisterHandler,
      addGlobalListener,
      removeGlobalListener,
    }),
    [
      mqttHook.isConnected,
      mqttHook.subscribedTopics,
      mqttHook.subscribeToTopics,
      mqttHook.unsubscribeFromTopics,
      mqttHook.publish,
      registerHandler,
      unregisterHandler,
      addGlobalListener,
      removeGlobalListener,
    ]
  )

  return (
    <MqttProvider value={mqttContextValue}>
      {/* Central MQTT listener — handles all incoming messages, never unmounts */}
      <MqttListenerSetup />

      <div className="min-h-screen bg-white">
        <Topbar />
        <Sidebar />

        <div
          className="flex flex-col min-h-screen"
          style={{ marginLeft: '220px', paddingTop: '44px' }}
        >
          <main className="flex-1 p-6">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-[60vh]">
                  <div className="w-9 h-9 border-4 border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </MqttProvider>
  )
}

export default AppLayout
