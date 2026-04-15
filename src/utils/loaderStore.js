/**
 * src/utils/loaderStore.js
 * =========================
 * Tiny pub/sub store for the global full-screen loader.
 * Works outside React (usable directly in axios interceptors).
 *
 * Usage:
 *   loaderStore.show()      — increment active-request counter
 *   loaderStore.hide()      — decrement counter (hides when counter reaches 0)
 *   loaderStore.subscribe() — called by <Loader /> to react to changes
 */

let activeRequests = 0
let listeners      = []

const notify = () => listeners.forEach((fn) => fn(activeRequests > 0))

const loaderStore = {
  show() {
    activeRequests++
    notify()
  },

  hide() {
    activeRequests = Math.max(0, activeRequests - 1)
    notify()
  },

  /** Returns an unsubscribe function */
  subscribe(listener) {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((fn) => fn !== listener)
    }
  },
}

export default loaderStore
