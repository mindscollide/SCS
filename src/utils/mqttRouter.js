/**
 * src/utils/mqttRouter.js
 * ========================
 * Event-based MQTT message router utility.
 *
 * Routes incoming messages by `payload.event` to the matching handler.
 * Use MQTT_TYPE constants from useMqttListener as keys.
 *
 * Usage:
 *   import { useSubscribe } from '../context/MqttContext'
 *   import { createMqttTypeRouter } from '../utils/mqttRouter'
 *   import { MQTT_TYPE } from '../hooks/useMqttListener'
 *
 *   useSubscribe(topic, useCallback(
 *     createMqttTypeRouter({
 *       [MQTT_TYPE.APPROVAL_UPDATED]:    (payload) => refetch(),
 *       [MQTT_TYPE.SUBMISSION_RECEIVED]: (payload) => setBadge(n => n + 1),
 *       '*': (payload, topic) => console.log('unhandled', topic, payload),
 *     }),
 *     [refetch]
 *   ))
 */

/**
 * Builds a single MQTT handler that routes by `payload.event`.
 *
 * @param {Object} handlers
 *   Keys are event strings matching payload.event from the broker.
 *   Use MQTT_TYPE constants as keys.
 *   Use '*' as a catch-all for any unrecognised event.
 *   Each value is `(payload, topic) => void`.
 *
 * @returns {Function} (payload, topic) => void
 */
export const createMqttTypeRouter = (handlers) => (payload, topic) => {
  console.log('[MQTT] Router — event:', payload?.event, '| matched:', payload?.event in handlers ? payload.event : '* (fallback)', '| full payload:', payload)
  const fn = handlers[payload?.event] ?? handlers['*']
  fn?.(payload, topic)
}
