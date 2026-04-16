/**
 * src/services/mqtt.service.js
 * =============================
 * Thin disconnect registry.
 *
 * The real Paho client lives inside useMqttClient (hook).
 * This module exists solely so that non-React code (api.js, Topbar) can call
 * mqttService.disconnect() on logout without needing to import React hooks.
 *
 * Usage (hook side):
 *   mqttService.register(disconnectFn)   ← called inside useMqttClient
 *
 * Usage (consumer side — unchanged):
 *   mqttService.disconnect()             ← Topbar / api.js
 */

class MqttDisconnectRegistry {
  constructor() {
    this._fn = null
  }

  /**
   * Register the hook's internal disconnect.
   * Pass null to deregister (called on unmount).
   * @param {(() => void) | null} fn
   */
  register(fn) {
    this._fn = fn
  }

  /**
   * Trigger disconnect — forwarded to the hook's Paho client.
   * Safe to call even if nothing is registered.
   */
  disconnect() {
    if (this._fn) {
      this._fn()
      this._fn = null
    }
    console.log('[MQTT] mqttService.disconnect() called')
  }
}

export default new MqttDisconnectRegistry()
