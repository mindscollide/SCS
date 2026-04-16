/**
 * src/context/MqttContext.jsx
 * ============================
 * Provides MQTT state and functions to the entire authenticated app.
 * The handler registry lives in AppLayout so there is no circular dependency.
 *
 * Usage in any page / component:
 *
 *   import { useMqtt } from '../context/MqttContext'
 *
 *   const { isConnected, subscribeToTopics, unsubscribeFromTopics,
 *           registerHandler, unregisterHandler, publish } = useMqtt()
 *
 *   // Subscribe to a topic and react to its messages:
 *   useEffect(() => {
 *     subscribeToTopics(['some/topic'])
 *     registerHandler('some/topic', (payload) => {
 *       console.log('got message:', payload)
 *     })
 *     return () => {
 *       unsubscribeFromTopics(['some/topic'])
 *       unregisterHandler('some/topic')
 *     }
 *   }, [])
 */

import React, { createContext, useContext } from 'react'

const MqttContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
// value is built entirely in AppLayout and passed straight through.
export const MqttProvider = ({ children, value }) => (
  <MqttContext.Provider value={value}>{children}</MqttContext.Provider>
)

// ── Consumer hook ─────────────────────────────────────────────────────────────
export const useMqtt = () => {
  const ctx = useContext(MqttContext)
  if (!ctx) throw new Error('useMqtt must be used inside <MqttProvider>')
  return ctx
}
