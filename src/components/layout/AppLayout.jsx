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
 * MQTT message flow:
 *  broker → onMessageArrivedCallback (here) → handlersRef map
 *         → page-level handler registered via registerHandler()
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

import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar.jsx'
import Sidebar from './Sidebar.jsx'
import { useMqttClient } from '../../hooks/useMqttClient'
import { MqttProvider } from '../../context/MqttContext'

const AppLayout = () => {
  // topic → fn   — pages register handlers here on mount, remove on unmount
  const handlersRef = useRef(new Map())

  const mqttHook = useMqttClient({
    // Every incoming message is dispatched to whichever page registered
    // a handler for that topic. No re-render in AppLayout needed.
    onMessageArrivedCallback: (payload, topic) => {
      handlersRef.current.get(topic)?.(payload, topic)
    },
    onConnectionLostCallback: (err) => {
      console.warn('[MQTT] Connection lost:', err?.errorMessage)
    },
  })

  useEffect(() => {
    const profile = (() => {
      try { return JSON.parse(sessionStorage.getItem('user_profile_data')) } catch { return null }
    })()

    if (profile?.userID) {
      mqttHook.connectToMqtt({ subscribeID: String(profile.userID) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stable helpers — pages call these to opt-in to message handling
  const registerHandler = useCallback((topic, fn) => {
    handlersRef.current.set(topic, fn)
  }, [])

  const unregisterHandler = useCallback((topic) => {
    handlersRef.current.delete(topic)
  }, [])

  // Build the context value once; only re-computes when hook state changes
  const mqttContextValue = useMemo(() => ({
    isConnected:           mqttHook.isConnected,
    subscribedTopics:      mqttHook.subscribedTopics,
    subscribeToTopics:     mqttHook.subscribeToTopics,
    unsubscribeFromTopics: mqttHook.unsubscribeFromTopics,
    publish:               mqttHook.publish,
    registerHandler,
    unregisterHandler,
  }), [
    mqttHook.isConnected,
    mqttHook.subscribedTopics,
    mqttHook.subscribeToTopics,
    mqttHook.unsubscribeFromTopics,
    mqttHook.publish,
    registerHandler,
    unregisterHandler,
  ])

  return (
    <MqttProvider value={mqttContextValue}>
      <div className="min-h-screen bg-white">
        {/* Fixed topbar */}
        <Topbar />

        {/* Fixed sidebar */}
        <Sidebar />

        {/* Scrollable content — offset left by sidebar, down by topbar */}
        <div className="flex flex-col min-h-screen" style={{ marginLeft: '220px', paddingTop: '44px' }}>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </MqttProvider>
  )
}

export default AppLayout
