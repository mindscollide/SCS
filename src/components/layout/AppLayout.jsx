/**
 * src/components/layout/AppLayout.jsx
 * =====================================
 * Shell for all authenticated pages.
 *
 * Also owns the MQTT connection for the entire authenticated session:
 *  - Connects on mount (or reconnects after hard refresh)
 *  - Stays alive while the user navigates between pages
 *  - Disconnected by Topbar / api.js on logout
 *
 * MQTT connection parameters:
 *  clientId  = SCS_{userID}_{deviceSuffix}   — unique per browser session
 *  topic     = SCS_{userID}                  — shared; all sessions for this user
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
import { resumeTokenTimer } from '../../utils/tokenTimer'
import MqttListenerSetup from '../../hooks/useMqttListener'

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
      // deviceSuffix was generated in LoginPage before the login API call and
      // stored as 'user_device_id'. It was also sent as DeviceID to the backend
      // so the backend can include it in force_logout payloads.
      const suffix = sessionStorage.getItem('user_device_id') ?? Date.now()
      const clientId = `SCS_${profile.userID}_${suffix}` // unique per session
      const topic = `SCS_${profile.userID}` // shared per user

      // Persist topic so useMqttListener and page hooks can read it without
      // prop-drilling.
      sessionStorage.setItem('user_mqtt_topic', topic)

      mqttHook.connectToMqtt({ subscribeID: clientId, topic })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
