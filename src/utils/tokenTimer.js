/**
 * src/utils/tokenTimer.js
 * ========================
 * Manages the proactive token-refresh countdown.
 *
 * Performance:
 *   _expiryMs is kept in memory — isTokenExpiringSoon() never reads sessionStorage.
 *   sessionStorage is written only when the value changes (login / refresh / stop).
 *
 * Flow:
 *   startTokenTimer(seconds)    ← called on login
 *   resumeTokenTimer()          ← called by AppLayout on mount (survives F5)
 *   stopTokenTimer()            ← called by forceLogout
 *   restartTokenTimer()         ← called internally after a successful refresh
 *   isTokenExpiringSoon()       ← called by request interceptor on every API call
 */

let _timer     = null   // setTimeout handle
let _expiryMs  = 0      // in-memory mirror — avoids sessionStorage read per request
let _onRefresh = null   // registered by api.js (proactiveRefresh)

// ── Registration ──────────────────────────────────────────────────────────────
export const registerRefreshHandler = (fn) => { _onRefresh = fn }

// ── Internal ──────────────────────────────────────────────────────────────────
const _clearTimer = () => {
  if (_timer) { clearTimeout(_timer); _timer = null }
}

const _schedule = () => {
  _clearTimer()
  if (!_expiryMs) return

  const msUntilProactive = _expiryMs - Date.now() - 60_000

  if (msUntilProactive <= 0) {
    const label = (_expiryMs - Date.now()) <= 0 ? 'expired' : '≤ 1 min remaining'
    console.log(`[TokenTimer] Token ${label} — refreshing now`)
    _onRefresh?.()
    return
  }

  console.log(`[TokenTimer] Refresh in ${Math.round(msUntilProactive / 60_000)} min`)
  _timer = setTimeout(() => {
    console.log('[TokenTimer] 1 min until expiry — proactive refresh')
    _onRefresh?.()
  }, msUntilProactive)
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Start a fresh countdown after login. tokenTimeOut is in seconds. */
export const startTokenTimer = (timeoutSeconds) => {
  if (!timeoutSeconds || timeoutSeconds <= 0) {
    console.warn('[TokenTimer] Invalid timeout — not started')
    return
  }
  _expiryMs = Date.now() + timeoutSeconds * 1000
  sessionStorage.setItem('token_expiry_time', String(_expiryMs))
  sessionStorage.setItem('token_timeout_sec', String(timeoutSeconds))
  _schedule()
}

/** Restart using the stored duration — called after a successful token refresh. */
export const restartTokenTimer = () => {
  const sec = Number(sessionStorage.getItem('token_timeout_sec'))
  if (sec > 0) startTokenTimer(sec)
}

/** Restore the timer after F5 / hard refresh — call in AppLayout useEffect. */
export const resumeTokenTimer = () => {
  const stored = sessionStorage.getItem('token_expiry_time')
  if (!stored) return
  _expiryMs = Number(stored)
  console.log('[TokenTimer] Resuming after page refresh')
  _schedule()
}

/** Cancel the timer and wipe expiry data — called on logout. */
export const stopTokenTimer = () => {
  _clearTimer()
  _expiryMs = 0
  sessionStorage.removeItem('token_expiry_time')
  sessionStorage.removeItem('token_timeout_sec')
  console.log('[TokenTimer] Stopped')
}

/**
 * Returns true if the token expires within 60 seconds.
 * Reads from memory (_expiryMs) — zero sessionStorage access.
 */
export const isTokenExpiringSoon = () =>
  _expiryMs > 0 && _expiryMs - Date.now() <= 60_000
