/**
 * src/utils/loaderStore.js
 * =========================
 * Tiny pub/sub store for the global full-screen loader.
 * Works outside React (usable directly in axios interceptors or page logic).
 *
 * The counter is reference-counted — every show() must be paired with a hide().
 * The spinner is visible whenever activeRequests > 0.
 *
 * Standard API usage (axios interceptors handle this automatically):
 *   loaderStore.show()      — increments active-request counter → spinner appears
 *   loaderStore.hide()      — decrements counter → spinner hides when counter reaches 0
 *   loaderStore.subscribe() — called by <Loader /> to react to visibility changes
 *
 * Manual hold pattern (multi-step sequences that should show one continuous spinner):
 *   loaderStore.show()                      // hold spinner open
 *   try {
 *     await stepOne({ skipLoader: true })   // skipLoader prevents double-counting
 *     await stepTwo({ skipLoader: true })
 *   } catch { ... } finally {
 *     loaderStore.hide()                    // always release — even on error
 *   }
 *   Applied in: LoginPage.jsx — holds spinner across post-login pre-fetch calls so
 *   the transition from button-click to dashboard is one smooth uninterrupted animation.
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
