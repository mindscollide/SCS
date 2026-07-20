/**
 * src/hooks/useMqttClient.js
 * ===========================
 * React hook — Paho MQTT client.
 *
 * Features:
 *  ✓ Generation counter stops StrictMode double-mount (two live clients)
 *  ✓ Callback refs keep onMessageArrived / onConnectionLost always fresh
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
 *   // In a useEffect after login:
 *   //   subscribeID — unique Paho client ID:  SCS_{userID}_{deviceSuffix}
 *   //   topic       — shared per-user topic:  SCS_{userID}
 *   connectToMqtt({
 *     subscribeID: `SCS_${userID}_${sessionStorage.getItem('user_device_id')}`,
 *     topic:       `SCS_${userID}`,
 *   })
 *
 * Transport: Paho picks ws:// vs wss:// internally from `useSSL`, driven by
 * `VITE_MQTT_USE_SSL` (.env). Host/port come from sessionStorage (issued at
 * login — see LoginPage.jsx), not from this env var. UAT sets it `true` (the
 * broker sits behind the same TLS-terminating proxy as the HTTPS APIs); local
 * dev sets it `false` (plain broker, no TLS).
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import Paho from 'paho-mqtt'
import mqttService from '../services/mqtt.service'

export const useMqttClient = ({ onMessageArrivedCallback, onConnectionLostCallback } = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [subscribedTopics, setSubscribedTopics] = useState([])

  const clientRef = useRef(null)
  const isConnecting = useRef(false) // fast-path guard within a single tick
  const isDisconnecting = useRef(false) // suppresses the "Socket closed" reconnect loop
  const activeTopics = useRef([]) // source of truth for subscribed topics
  const pendingReconnect = useRef(null) // called by onConnectionLost to retry
  // Generation counter — incremented by every connectToMqtt call and by
  // disconnect(). Any async callback (onSuccess/onFailure) that captures a
  // stale generation aborts itself instead of touching shared state.
  const generationRef = useRef(0)

  // Sync latest parent callbacks into refs so Paho handlers never go stale.
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
  }, [])

  // ── onConnectionLost ───────────────────────────────────────────────────────
  const onConnectionLost = useCallback((res) => {
    // Paho fires this with errorCode 8 after an intentional .disconnect() — ignore.
    if (isDisconnecting.current) {
      isDisconnecting.current = false
      return
    }
    console.warn('[MQTT] Connection lost:', res.errorMessage)
    setIsConnected(false)
    isConnecting.current = false
    onConnectionLostCallbackRef.current?.(res)

    if (res.errorCode === 5) {
      console.error('[MQTT] Auth failure — not retrying')
      return
    }
    if (res.errorCode !== 0) {
      setTimeout(() => pendingReconnect.current?.(), 6000)
    }
  }, [])

  // ── connectToMqtt ──────────────────────────────────────────────────────────
  const connectToMqtt = useCallback(
    ({ subscribeID, topic }) => {
      // subscribeID — Paho client ID, unique per browser session
      //               format: SCS_{userID}_{deviceSuffix}
      // topic       — broker topic to subscribe to: SCS_{userID}  (shared)
      const subscribeTopic = topic ?? subscribeID

      if (!subscribeID) return
      if (isConnecting.current) return
      if (clientRef.current?.isConnected()) return

      const host = sessionStorage.getItem('user_mqtt_ip_Address')
      const port = sessionStorage.getItem('user_mqtt_Port')
      if (!host || !port) {
        console.warn('[MQTT] Config missing in sessionStorage — skipping connect')
        return
      }

      isConnecting.current = true
      // Claim this attempt; stale async callbacks from a prior attempt will bail.
      const thisGeneration = ++generationRef.current

      pendingReconnect.current = () => connectToMqtt({ subscribeID, topic })

      // Clean up any lingering client before creating a new one
      if (clientRef.current) {
        try {
          isDisconnecting.current = true
          clientRef.current.disconnect()
        } catch {
          isDisconnecting.current = false
        }
        clientRef.current = null
      }

      console.log(`[MQTT] Connecting — clientId: ${subscribeID}, topic: ${subscribeTopic}`)

      // Pass WebSocket path '/mqtt' as the third argument (required by this broker)
      const client = new Paho.Client(host, Number(port), '/mqtt', subscribeID)
      clientRef.current = client
      client.onConnectionLost = onConnectionLost
      client.onMessageArrived = onMessageArrived

      client.connect({
        onSuccess: () => {
          // Stale — a newer connect or disconnect has superseded this attempt.
          // Sever handlers so the ghost client delivers nothing, then drop it.
          if (thisGeneration !== generationRef.current) {
            client.onConnectionLost = () => {}
            client.onMessageArrived = () => {}
            try {
              client.disconnect()
            } catch {
              /* ignore */
            }
            return
          }
          console.log(`[MQTT] Connected ✓ — subscribing to "${subscribeTopic}"`)
          isConnecting.current = false
          setIsConnected(true)
          subscribeToTopics([subscribeTopic])
        },
        onFailure: (err) => {
          if (thisGeneration !== generationRef.current) return
          console.error('[MQTT] Connection failed:', err.errorMessage)
          isConnecting.current = false
          setIsConnected(false)
          if (err.errorCode === 5) {
            console.error('[MQTT] Bad credentials — check VITE_MQTT_USERNAME / VITE_MQTT_PASSWORD')
            return
          }
          setTimeout(() => connectToMqtt({ subscribeID, topic }), 6000)
        },
        userName: import.meta.env.VITE_MQTT_USERNAME || undefined,
        password: import.meta.env.VITE_MQTT_PASSWORD || undefined,
        keepAliveInterval: 300,
        reconnect: false,
        cleanSession: true,
        useSSL: import.meta.env.VITE_MQTT_USE_SSL === 'true',
      })
    },
    [onConnectionLost, onMessageArrived, subscribeToTopics]
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
    generationRef.current++ // invalidate any in-flight connect callbacks
    pendingReconnect.current = null // cancel pending reconnect
    if (clientRef.current) {
      try {
        if (clientRef.current.isConnected()) {
          isDisconnecting.current = true
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

  // Expose disconnect to non-React code (api.js, Topbar) via mqttService
  useEffect(() => {
    mqttService.register(disconnect)
    return () => mqttService.register(null)
  }, [disconnect])

  // Cleanup on unmount
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
