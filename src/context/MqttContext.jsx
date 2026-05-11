/**
 * src/context/MqttContext.jsx
 * ============================
 * Provides MQTT state and functions to the entire authenticated app.
 * The handler registry lives in AppLayout — no circular dependency.
 *
 * ─── Available hooks ──────────────────────────────────────────────────────────
 *
 * useMqtt()
 *   Low-level access to the full context (subscribe, publish, register, etc.)
 *
 * useSubscribe(topic, handler)
 *   Registers a handler for a specific topic. Auto-removes on unmount.
 *   Multi-subscriber safe — multiple components can subscribe to the same topic.
 *   ⚠ Wrap handler in useCallback to prevent re-registration on every render.
 *
 * useGlobalMqttListener(handler)
 *   Fires for EVERY message on ANY topic. Use for app-wide concerns.
 *   ⚠ Wrap handler in useCallback.
 *
 * ─── Recommended page pattern ─────────────────────────────────────────────────
 *
 *   import { useSubscribe } from '../context/MqttContext'
 *   import { createMqttTypeRouter } from '../utils/mqttRouter'
 *   import { MQTT_TYPE } from '../hooks/useMqttListener'
 *
 *   const topic = sessionStorage.getItem('user_mqtt_topic')  // 'SCS_{userID}'
 *
 *   useSubscribe(topic, useCallback(
 *     createMqttTypeRouter({
 *       [MQTT_TYPE.APPROVAL_UPDATED]: (payload) => refetch(),
 *     }),
 *     [refetch]
 *   ))
 */

import React, { createContext, useContext, useEffect } from 'react'

const MqttContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export const MqttProvider = ({ children, value }) => (
  <MqttContext.Provider value={value}>{children}</MqttContext.Provider>
)

// ── useMqtt — low-level access ────────────────────────────────────────────────
export const useMqtt = () => {
  const ctx = useContext(MqttContext)
  if (!ctx) throw new Error('useMqtt must be used inside <MqttProvider>')
  return ctx
}

// ── useSubscribe ──────────────────────────────────────────────────────────────
/**
 * Registers a message handler for a specific MQTT topic.
 * Automatically unregisters on component unmount.
 * Multiple components can call this for the same topic independently.
 *
 * @param {string|null} topic   — e.g. `SCS_${userID}`. Pass null to skip.
 * @param {Function}    handler — (payload, topic) => void. Wrap in useCallback.
 */
export const useSubscribe = (topic, handler) => {
  const { registerHandler, unregisterHandler } = useMqtt()
  useEffect(() => {
    if (!topic || !handler) return
    registerHandler(topic, handler)
    return () => unregisterHandler(topic, handler)
  }, [topic, handler, registerHandler, unregisterHandler])
}

// ── useGlobalMqttListener ─────────────────────────────────────────────────────
/**
 * Registers a handler that fires for EVERY incoming message on ANY topic.
 * Used internally by MqttListenerSetup. Pages should prefer useSubscribe.
 *
 * @param {Function} handler — (payload, topic) => void. Wrap in useCallback.
 */
export const useGlobalMqttListener = (handler) => {
  const { addGlobalListener, removeGlobalListener } = useMqtt()
  useEffect(() => {
    if (!handler) return
    addGlobalListener(handler)
    return () => removeGlobalListener(handler)
  }, [handler, addGlobalListener, removeGlobalListener])
}
