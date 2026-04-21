/**
 * src/utils/api.js
 * =================
 * Centralized Axios instance for SCS.
 *
 * ── Token expiry flow ────────────────────────────────────────────────────────
 *
 *  PROACTIVE (timer / per-request check):
 *    Token expires within 1 min  →  doRefreshToken() before the request goes out
 *
 *  REACTIVE (responseCode 417):
 *    API returns 417 (expired)   →  doRefreshToken() then retry original request
 *
 *  Both paths share the same isRefreshing flag + failedQueue so only ONE refresh
 *  ever runs at a time no matter how many concurrent requests are in-flight.
 *
 *  On refresh failure → forceLogout():
 *    calls logout API → waits → disconnects MQTT → clears session → /login
 *
 * ── Environment variables (.env) ─────────────────────────────────────────────
 *   VITE_BASE_URL = http://192.168.18.243
 *   VITE_AUTH_API = :6000/Auth
 *   VITE_Admin_API = :6001/Admin
 */

import axios from 'axios'
import loaderStore from './loaderStore'
import { toAPIDate } from './helpers'
import mqttService from '../services/mqtt.service'
import {
  isTokenExpiringSoon,
  restartTokenTimer,
  stopTokenTimer,
  registerRefreshHandler,
} from './tokenTimer'

// ─── URL constants ────────────────────────────────────────────────────────────
const BASE_URL  = import.meta.env.VITE_BASE_URL  || 'http://localhost'
const AUTH_API  = import.meta.env.VITE_AUTH_API  || ':6000/Auth'
const Admin_API = import.meta.env.VITE_Admin_API || ':6001/Admin'

export const AUTH_URL  = `${BASE_URL}${AUTH_API}`
export const Admin_URL = `${BASE_URL}${Admin_API}`

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
})

// ─── Refresh-queue state ──────────────────────────────────────────────────────
// While a refresh is in-flight, every other expiring request waits here.
// On success → all retried with the new token.
// On failure → all rejected, user is logged out.
let isRefreshing = false
let failedQueue  = []   // [{ resolve, reject }]

const flushQueue = (error, newToken = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  )
  failedQueue = []
}

// ─── forceLogout ──────────────────────────────────────────────────────────────
// Calls the logout API (best-effort), stops the timer, disconnects MQTT,
// clears session, then redirects to /login.
const forceLogout = async () => {
  try {
    const profile  = JSON.parse(sessionStorage.getItem('user_profile_data') || '{}')
    const deviceId = localStorage.getItem('scs_device_id') || ''

    const fd = new FormData()
    fd.append('RequestMethod', import.meta.env.VITE_RM_LOGOUT)
    fd.append('RequestData', JSON.stringify({
      UserID:   profile.userID || 0,
      DeviceID: deviceId,
    }))

    // Wait for the logout API regardless of its response code —
    // we clear the session locally either way
    await axios.post(AUTH_URL, fd, { headers: { 'Content-Type': undefined } })
  } catch {
    // Network or server error on logout — still clear locally
  }

  stopTokenTimer()
  mqttService.disconnect()
  sessionStorage.clear()
  window.location.replace('/login')
}

// ─── doRefreshToken ───────────────────────────────────────────────────────────
// Calls the refresh-token API.
// Returns the new token string on success, throws on failure.
const doRefreshToken = async () => {
  const storedToken        = sessionStorage.getItem('auth_token')
  const storedRefreshToken = sessionStorage.getItem('refresh_token')
  const lastLoginDateTime  = sessionStorage.getItem('last_login_datetime') || toAPIDate(new Date())

  const fd = new FormData()
  fd.append('RequestMethod', import.meta.env.VITE_RM_REFRESH_TOKEN)
  fd.append('RequestData', JSON.stringify({
    Token:             storedToken,
    RefreshToken:      storedRefreshToken,
    LastLoginDateTime: lastLoginDateTime,
  }))

  const res = await axios.post(AUTH_URL, fd, {
    headers: {
      'Content-Type': undefined,
      ...(storedToken ? { _token: storedToken } : {}),
    },
  })

  const rr   = res.data?.responseResult
  const code = rr?.ResponseMessage

  if (code !== 'ERM_Auth_AuthServiceManager_RefreshToken_01') {
    throw new Error(code || 'Refresh token failed')
  }

  const newToken     = rr?.RefreshToken?.Token
  const newRefresh   = rr?.RefreshToken?.RefreshToken
  const newLastLogin = rr?.RefreshToken?.LastLoginDateTime

  if (!newToken) throw new Error('Refresh response missing token')

  // Persist new tokens
  sessionStorage.setItem('auth_token', newToken)
  if (newRefresh)   sessionStorage.setItem('refresh_token',       newRefresh)
  if (newLastLogin) sessionStorage.setItem('last_login_datetime', newLastLogin)

  // Keep axios default header in sync
  api.defaults.headers.common['_token'] = newToken

  // Restart the expiry countdown with the same token lifetime
  restartTokenTimer()

  return newToken
}

// ─── proactiveRefresh ─────────────────────────────────────────────────────────
// Called by tokenTimer when the countdown reaches 1 minute.
// Also used by the request interceptor for per-call checks.
// Guards with isRefreshing so only ONE refresh runs at a time.
const proactiveRefresh = async () => {
  if (isRefreshing) return   // another path already handling it

  isRefreshing = true
  try {
    const newToken = await doRefreshToken()
    flushQueue(null, newToken)
    console.log('[API] Proactive token refresh ✓')
  } catch (err) {
    console.error('[API] Proactive refresh failed:', err.message)
    flushQueue(err, null)
    await forceLogout()
  } finally {
    isRefreshing = false
  }
}

// Register so tokenTimer can trigger a refresh without importing api.js directly
registerRefreshHandler(proactiveRefresh)

// ─── Request interceptor ──────────────────────────────────────────────────────
// 1. Show loader
// 2. If a refresh is in-flight  → wait in queue, attach new token, then proceed
// 3. If token expires within 1 min → proactive refresh before the request goes out
// 4. Attach current token normally
api.interceptors.request.use(
  async (config) => {
    // skipLoader: true → caller manages its own spinner; global loader stays hidden
    if (!config.skipLoader) loaderStore.show()

    if (!config.skipAuth) {
      // ── Another refresh already running → queue this request ──
      if (isRefreshing) {
        try {
          const newToken = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
          config.headers['_token'] = newToken
        } catch (err) {
          if (!config.skipLoader) loaderStore.hide()
          return Promise.reject(err)
        }
        return config
      }

      // ── Token expires within 1 min → proactive refresh before sending ──
      if (isTokenExpiringSoon()) {
        isRefreshing = true
        try {
          const newToken = await doRefreshToken()
          flushQueue(null, newToken)
          config.headers['_token'] = newToken
          console.log('[API] Pre-request proactive refresh ✓')
        } catch (err) {
          flushQueue(err, null)
          isRefreshing = false
          if (!config.skipLoader) loaderStore.hide()
          await forceLogout()
          return Promise.reject(err)
        }
        isRefreshing = false
        return config
      }

      // ── Normal: attach current token ──
      const token = sessionStorage.getItem('auth_token')
      if (token) config.headers['_token'] = token
      else       delete config.headers['_token']
    }

    return config
  },
  (error) => {
    if (!error.config?.skipLoader) loaderStore.hide()
    return Promise.reject(error)
  }
)

// ─── Response interceptor ────────────────────────────────────────────────────
// Handles body-level response codes 401 (invalid token) and 417 (expired token).
api.interceptors.response.use(
  async (response) => {
    const code = response.data?.responseCode

    const skip = response.config?.skipLoader

    // ── 401 — Token mismatch / invalid → logout immediately ──────────────
    if (code === 401 && !response.config?.skipAuth) {
      if (!skip) loaderStore.hide()
      await forceLogout()
      return response
    }

    // ── 417 — Token expired → refresh then retry ──────────────────────────
    if (code === 417 && !response.config?.skipAuth) {
      const originalRequest = response.config

      // Guard: this retry itself returned 417 — refresh didn't help → logout
      if (originalRequest._retry) {
        if (!skip) loaderStore.hide()
        flushQueue(new Error('Token still expired after refresh'), null)
        isRefreshing = false
        await forceLogout()
        return response
      }

      // Another refresh already in-flight → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            originalRequest.headers['_token'] = newToken
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      // ── This request kicks off the refresh ──
      originalRequest._retry = true
      isRefreshing = true
      // Loader stays visible through refresh → retry cycle (no flicker)

      try {
        const newToken = await doRefreshToken()
        flushQueue(null, newToken)
        isRefreshing = false

        // Retry the original request with the new token
        originalRequest.headers['_token'] = newToken
        return api(originalRequest)

      } catch (refreshError) {
        flushQueue(refreshError, null)
        isRefreshing = false
        if (!skip) loaderStore.hide()
        await forceLogout()
        return Promise.reject(refreshError)
      }
    }

    if (!skip) loaderStore.hide()
    return response
  },

  (error) => {
    if (!error.config?.skipLoader) loaderStore.hide()

    // HTTP-level 401 (rare — most APIs return 200 with a body response code)
    if (error.response?.status === 401) {
      sessionStorage.clear()
      window.location.replace('/login')
    }

    return Promise.reject(error)
  }
)

// ─── handleRequest — unified response wrapper ─────────────────────────────────
export const handleRequest = async (axiosPromise) => {
  try {
    const response = await axiosPromise
    return { success: true, data: response.data, status: response.status }
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        status:  error.response.status,
        message: error.response.data?.message || error.response.data?.detail || 'Something went wrong.',
        errors:  error.response.data?.errors || null,
        data:    error.response.data || null,
      }
    }
    if (error.request) {
      return {
        success: false,
        status:  null,
        message: 'Network error. Please check your connection.',
        errors:  null,
        data:    null,
      }
    }
    return {
      success: false,
      status:  null,
      message: error.message || 'An unexpected error occurred.',
      errors:  null,
      data:    null,
    }
  }
}

// ─── formPost ─────────────────────────────────────────────────────────────────
export const formPost = (url, requestMethod, requestData = {}, config = {}) => {
  const fd = new FormData()
  fd.append('RequestMethod', requestMethod)
  fd.append('RequestData', JSON.stringify(requestData))
  return handleRequest(
    api.post(url, fd, { headers: { 'Content-Type': undefined }, ...config })
  )
}

// ─── REST helpers ─────────────────────────────────────────────────────────────
export const get   = (url, params = {}, config = {}) => handleRequest(api.get(url, { params, ...config }))
export const post  = (url, body = {},   config = {}) => handleRequest(api.post(url, body, config))
export const put   = (url, body = {},   config = {}) => handleRequest(api.put(url, body, config))
export const patch = (url, body = {},   config = {}) => handleRequest(api.patch(url, body, config))
export const del   = (url, config = {}) => handleRequest(api.delete(url, config))

export const upload = (url, formData, onUploadProgress) =>
  handleRequest(
    api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onUploadProgress
        ? (e) => onUploadProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    })
  )

export default api
