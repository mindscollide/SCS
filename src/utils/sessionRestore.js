/**
 * src/utils/sessionRestore.js
 * ============================
 * Utilities for sharing session bootstrap data across browser tabs via localStorage.
 *
 * Why this exists
 * ───────────────
 * sessionStorage is per-tab — opening a new tab (e.g. right-click → Open in new tab)
 * gives it an empty sessionStorage. To allow the same logged-in user to open any
 * sidebar page in a new tab without being redirected to login, we store non-sensitive
 * session bootstrap data in localStorage (shared across all tabs in the same browser).
 * The JWT itself stays in sessionStorage only (cleared when the tab/browser closes).
 *
 * On new tab load:
 *  PrivateRoute detects no auth_token → calls restoreSessionFromLocal() to copy
 *  bootstrap data into the new tab's sessionStorage → calls silentTokenRefresh()
 *  to get a fresh JWT → tab works normally without any login prompt.
 *
 * localStorage keys
 * ─────────────────
 * All SCS session keys use the "scs_" prefix.
 * scs_device_id and scs_remember are intentionally excluded from clearLocalSession
 * so the browser fingerprint and remember-me credentials survive logout.
 */

import { dropdownCache } from './dropdownCache'

/** All localStorage keys written/read by the session-restore flow */
export const LS_KEYS = {
  AUTH_TOKEN:    'scs_auth_token',    // JWT — needed so new tabs can call the refresh endpoint
  REFRESH_TOKEN: 'scs_refresh_token',
  LAST_LOGIN:    'scs_last_login',
  USER_PROFILE:  'scs_user_profile',
  USER_ROLES:    'scs_user_roles',
  USER_ROLE:     'scs_user_role',
  DEVICE_ID:     'scs_device_id',
  MQTT_IP:       'scs_mqtt_ip',
  MQTT_PORT:     'scs_mqtt_port',
  TOKEN_TIMEOUT: 'scs_token_timeout',
}

// Maps each localStorage key to the sessionStorage key that existing code reads
const LS_TO_SS = [
  [LS_KEYS.AUTH_TOKEN,    'auth_token'],
  [LS_KEYS.REFRESH_TOKEN, 'refresh_token'],
  [LS_KEYS.LAST_LOGIN,    'last_login_datetime'],
  [LS_KEYS.USER_PROFILE,  'user_profile_data'],
  [LS_KEYS.USER_ROLES,    'user_roles'],
  [LS_KEYS.USER_ROLE,     'user_role'],
  [LS_KEYS.DEVICE_ID,     'user_device_id'],
  [LS_KEYS.MQTT_IP,       'user_mqtt_ip_Address'],
  [LS_KEYS.MQTT_PORT,     'user_mqtt_Port'],
  [LS_KEYS.TOKEN_TIMEOUT, 'token_timeout_sec'],
]

/**
 * Copy all session bootstrap data from localStorage into the current tab's
 * sessionStorage so that existing code (doRefreshToken, AppLayout, RoleRoute, etc.)
 * can read it without changes.
 * Call this BEFORE silentTokenRefresh() in PrivateRoute.
 */
export const restoreSessionFromLocal = () => {
  LS_TO_SS.forEach(([lsKey, ssKey]) => {
    const val = localStorage.getItem(lsKey)
    if (val !== null) sessionStorage.setItem(ssKey, val)
  })
}

/**
 * Clear all session bootstrap keys from localStorage on logout or force-logout.
 * Also clears the dropdown cache (dd_*) so stale reference data never leaks
 * into the next session.
 * Preserves scs_device_id (browser fingerprint — reused across logins) and
 * scs_remember (remember-me credentials).
 */
export const clearLocalSession = () => {
  const preserve = new Set([LS_KEYS.DEVICE_ID, 'scs_remember'])
  Object.values(LS_KEYS).forEach((k) => {
    if (!preserve.has(k)) localStorage.removeItem(k)
  })
  dropdownCache.clearAll()
}
