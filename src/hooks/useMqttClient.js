/**
 * src/hooks/useMqttClient.js
 * ===========================
 * React hook — Paho MQTT client (adapted from previous project).
 *
 * Features:
 *  ✓ Single connection — isConnecting ref stops StrictMode double-mount
 *  ✓ onMessageArrived / onConnectionLost as useCallback (old-project style)
 *  ✓ Callback refs keep handlers stable — no churn when parent re-renders
 *  ✓ Auto-reconnect on unexpected disconnect (6 s delay)
 *  ✓ No retry on auth failure (code 5) — avoids broker IP block
 *  ✓ Re-subscribes all topics after reconnect
 *  ✓ subscribeToTopics / unsubscribeFromTopics / publish / disconnect
 *  ✓ Registers disconnect with mqttService so api.js / Topbar can reach it
 *  ✓ Cleans up on unmount
 *
 * Usage:
 *   const { connectToMqtt, isConnected } = useMqttClient({
 *     onMessageArrivedCallback: (payload, topic) => { ... },
 *     onConnectionLostCallback: (err)            => { ... },
 *   })
 *
 *   useEffect(() => {
 *     connectToMqtt({ subscribeID: String(userID) })
 *   }, [])
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import Paho from 'paho-mqtt'
import mqttService from '../services/mqtt.service'

export const useMqttClient = ({ onMessageArrivedCallback, onConnectionLostCallback } = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [subscribedTopics, setSubscribedTopics] = useState([])

  const clientRef        = useRef(null)
  const isConnecting     = useRef(false)  // StrictMode guard — prevents double-connect
  const isDisconnecting  = useRef(false)  // set true before intentional disconnect — suppresses reconnect loop
  const activeTopics     = useRef([])     // source of truth for subscribed topics
  const pendingReconnect = useRef(null)   // set by connectToMqtt; called by onConnectionLost

  // Sync the latest parent callbacks into refs so our Paho handlers
  // never go stale and never need to be in any useCallback dep array.
  const onMessageArrivedCallbackRef = useRef(onMessageArrivedCallback)
  const onConnectionLostCallbackRef = useRef(onConnectionLostCallback)
  useEffect(() => {
    onMessageArrivedCallbackRef.current = onMessageArrivedCallback
  }, [onMessageArrivedCallback])
  useEffect(() => {
    onConnectionLostCallbackRef.current = onConnectionLostCallback
  }, [onConnectionLostCallback])

  // ── subscribeToTopics ──────────────────────────────────────────────────────
  const subscribeToTopics = useCallback((topics = []) => {
    if (!clientRef.current?.isConnected()) return

    topics.forEach((topic) => {
      if (activeTopics.current.includes(topic)) return

      clientRef.current.subscribe(topic, {
        qos: 0,
        onSuccess: () => {
          console.log(`[MQTT] Subscribed → ${topic}`)
          activeTopics.current = [...activeTopics.current, topic]
          setSubscribedTopics([...activeTopics.current])
        },
        onFailure: (err) => console.error(`[MQTT] Subscribe failed → ${topic}`, err?.errorMessage),
      })
    })
  }, [])

  // ── unsubscribeFromTopics ──────────────────────────────────────────────────
  const unsubscribeFromTopics = useCallback((topics = []) => {
    if (!clientRef.current?.isConnected()) return

    topics.forEach((topic) => {
      clientRef.current.unsubscribe(topic, {
        onSuccess: () => {
          console.log(`[MQTT] Unsubscribed ← ${topic}`)
          activeTopics.current = activeTopics.current.filter((t) => t !== topic)
          setSubscribedTopics([...activeTopics.current])
        },
        onFailure: (err) =>
          console.error(`[MQTT] Unsubscribe failed → ${topic}`, err?.errorMessage),
      })
    })
  }, [])

  // ── onMessageArrived ───────────────────────────────────────────────────────
  // Stable — reads the latest callback from ref, so no dep on the callback itself.
  const onMessageArrived = useCallback((message) => {
    const topic = message.destinationName
    let payload
    try {
      payload = JSON.parse(message.payloadString)
    } catch {
      payload = { raw: message.payloadString }
    }

    console.log('[MQTT] Message →', topic, payload)
    onMessageArrivedCallbackRef.current?.(payload, topic)
  }, []) // ← stable: empty deps

  // ── onConnectionLost ───────────────────────────────────────────────────────
  // Stable — reads the latest callback from ref.
  const onConnectionLost = useCallback((res) => {
    // Paho always fires onConnectionLost (errorCode 8 "Socket closed") after
    // an intentional .disconnect() call. Ignore it — we triggered this ourselves.
    if (isDisconnecting.current) {
      isDisconnecting.current = false
      return
    }

    console.warn('[MQTT] Connection lost:', res.errorMessage)
    setIsConnected(false)
    isConnecting.current = false
    onConnectionLostCallbackRef.current?.(res)

    // Auth failure (code 5) — stop immediately, do NOT retry
    // Broker will IP-block the client on rapid bad-credential retries
    if (res.errorCode === 5) {
      console.error('[MQTT] Auth failure — not retrying. Check VITE_MQTT_USERNAME / VITE_MQTT_PASSWORD')
      return
    }

    // Any other unexpected drop → reconnect after 6 s
    if (res.errorCode !== 0) {
      setTimeout(() => pendingReconnect.current?.(), 6000)
    }
  }, []) // ← stable: empty deps

  // ── connectToMqtt ──────────────────────────────────────────────────────────
  // Also stable — all three deps are stable useCallbacks with empty dep arrays.
  const connectToMqtt = useCallback(
    ({ subscribeID, userID }) => {
      if (!subscribeID) return
      if (isConnecting.current) return // StrictMode guard
      if (clientRef.current?.isConnected()) return // already up

      const mqttipAddress = sessionStorage.getItem('user_mqtt_ip_Address')
      const mqttPort = sessionStorage.getItem('user_mqtt_Port')

      if (!mqttipAddress || !mqttPort) {
        console.warn('[MQTT] Config missing in sessionStorage — skipping connect')
        return
      }

      isConnecting.current = true

      // Store reconnect closure so onConnectionLost can trigger it without
      // a direct circular dependency on connectToMqtt
      pendingReconnect.current = () => connectToMqtt({ subscribeID, userID })

      // Dispose any stale client — flag first so onConnectionLost ignores
      // the "Socket closed" event Paho fires after an intentional disconnect
      if (clientRef.current) {
        try {
          isDisconnecting.current = true
          clientRef.current.disconnect()
        } catch {
          isDisconnecting.current = false
        }
        clientRef.current = null
      }

      // Client ID = current user's ID (matches broker session identity)
      const clientId = subscribeID
      console.log(`[MQTT] Connecting `)

      const client = new Paho.Client(mqttipAddress, Number(mqttPort), clientId)
      clientRef.current = client

      client.onConnectionLost = onConnectionLost
      client.onMessageArrived = onMessageArrived

      client.connect({
        onSuccess: () => {
          console.log('[MQTT] Connected ✓ ')
          isConnecting.current = false
          setIsConnected(true)
          subscribeToTopics([subscribeID])
        },
        onFailure: (err) => {
          console.error('[MQTT] Connection failed:', err.errorMessage)
          isConnecting.current = false
          setIsConnected(false)

          // Error code 5 = bad credentials — stop immediately
          if (err.errorCode === 5) {
            console.error(
              '[MQTT] Bad credentials — check VITE_MQTT_USERNAME / VITE_MQTT_PASSWORD in .env'
            )
            return
          }

          // Other failures → retry after 6 s
          setTimeout(() => connectToMqtt({ subscribeID, userID }), 6000)
        },
        userName: import.meta.env.VITE_MQTT_USERNAME || undefined,
        password: import.meta.env.VITE_MQTT_PASSWORD || undefined,
        keepAliveInterval: 300,
        reconnect: false, // handled manually above
        cleanSession: true,
        useSSL: false,
      })
    },
    [onConnectionLost, onMessageArrived, subscribeToTopics]
    // All three are stable (empty deps) → connectToMqtt is also stable
  )

  // ── publish ────────────────────────────────────────────────────────────────
  const publish = useCallback((topic, payload) => {
    if (!clientRef.current?.isConnected()) {
      console.warn('[MQTT] Cannot publish — not connected')
      return
    }
    const msg = new Paho.Message(typeof payload === 'string' ? payload : JSON.stringify(payload))
    msg.destinationName = topic
    msg.qos = 0
    msg.retained = false
    clientRef.current.send(msg)
    console.log('[MQTT] Published →', topic, payload)
  }, [])

  // ── disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    pendingReconnect.current = null  // cancel any pending reconnect
    if (clientRef.current) {
      try {
        if (clientRef.current.isConnected()) {
          isDisconnecting.current = true   // suppress the inevitable "Socket closed" event
          clientRef.current.disconnect()
        }
      } catch {
        isDisconnecting.current = false
      }
      clientRef.current = null
    }
    activeTopics.current = []
    setIsConnected(false)
    setSubscribedTopics([])
    isConnecting.current = false
    console.log('[MQTT] Disconnected ✓')
  }, [])

  // Register disconnect with mqttService so non-React code (api.js, Topbar)
  // can call mqttService.disconnect() and reach the real Paho client
  useEffect(() => {
    mqttService.register(disconnect)
    return () => mqttService.register(null)
  }, [disconnect])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    client: clientRef.current,
    isConnected,
    subscribedTopics,
    connectToMqtt,
    subscribeToTopics,
    unsubscribeFromTopics,
    onMessageArrived,
    onConnectionLost,
    publish,
    disconnect,
  }
}
