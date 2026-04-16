/**
 * src/utils/api.js
 * =================
 * Centralized Axios instance for SCS.
 *
 * ── How to use in service files ──────────────────────────────────────────────
 *
 *   import api, { handleRequest, AUTH_URL } from '../utils/api'
 *
 *   // All SCS APIs use formPost:
 *   export const getAllUserRoles = () =>
 *     formPost(Admin_URL, 'ServiceManager.GetAllUserRoles', {})
 *
 * ── Token expiry flow (responseCode 417) ─────────────────────────────────────
 *
 *   Any API → 417
 *     └─► doRefreshToken()
 *           ├─ SUCCESS → save new tokens → retry original request → return result
 *           └─ FAIL    → forceLogout() → call logout API → clear session → /login
 *
 *   If multiple requests expire at once, only ONE refresh is made.
 *   The rest are queued and retried automatically when the new token arrives.
 *
 * ── Environment variables (.env) ─────────────────────────────────────────────
 *   VITE_BASE_URL = http://192.168.18.243
 *   VITE_AUTH_API = :6000/Auth
 */

import axios from 'axios'
import loaderStore from './loaderStore'
import { toAPIDate } from './helpers'
import mqttService from '../services/mqtt.service'

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
// While a refresh is in-flight every other 417'd request waits here.
// On success all queued requests are retried with the new token.
// On failure all queued requests are rejected and the user is logged out.
let isRefreshing = false
let failedQueue  = []   // [{ resolve, reject }]

const flushQueue = (error, newToken = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  )
  failedQueue = []
}

// ─── forceLogout ─────────────────────────────────────────────────────────────
// Calls the logout API (best-effort), disconnects MQTT, clears session, redirects.
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

    // Fire logout API and wait — regardless of response code we still redirect
    await axios.post(AUTH_URL, fd, { headers: { 'Content-Type': undefined } })
  } catch {
    // Network errors or server errors on logout are ignored —
    // we clear the session locally either way
  }

  mqttService.disconnect()
  sessionStorage.clear()
  window.location.replace('/login')
}

// ─── doRefreshToken ───────────────────────────────────────────────────────────
// Calls the refresh-token API with the current stored tokens.
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

  // Any code other than success → throw so the caller triggers forceLogout
  if (code !== 'ERM_Auth_AuthServiceManager_RefreshToken_01') {
    throw new Error(code || 'Refresh token failed')
  }

  const newToken     = rr?.RefreshToken?.Token
  const newRefresh   = rr?.RefreshToken?.RefreshToken
  const newLastLogin = rr?.RefreshToken?.LastLoginDateTime

  if (!newToken) throw new Error('Refresh response missing token')

  // Persist new tokens
  sessionStorage.setItem('auth_token', newToken)
  if (newRefresh)   sessionStorage.setItem('refresh_token',        newRefresh)
  if (newLastLogin) sessionStorage.setItem('last_login_datetime',  newLastLogin)

  // Keep axios default header in sync
  api.defaults.headers.common['_token'] = newToken

  return newToken
}

// ─── Request interceptor — attach token + show loader ────────────────────────
api.interceptors.request.use(
  (config) => {
    loaderStore.show()
    if (!config.skipAuth) {
      const token = sessionStorage.getItem('auth_token')
      if (token) config.headers['_token'] = token
      else       delete config.headers['_token']
    }
    return config
  },
  (error) => {
    loaderStore.hide()
    return Promise.reject(error)
  }
)

// ─── Response interceptor — hide loader, handle 401 / 417 ────────────────────
api.interceptors.response.use(
  async (response) => {
    const code = response.data?.responseCode

    // ── 401 — Token mismatch / invalid → logout immediately ──────────────
    if (code === 401 && !response.config?.skipAuth) {
      loaderStore.hide()
      await forceLogout()
      return response
    }

    // ── 417 — Token expired → refresh then retry ──────────────────────────
    if (code === 417 && !response.config?.skipAuth) {
      const originalRequest = response.config

      // Guard: if this retry itself returned 417 the refresh didn't help → logout
      if (originalRequest._retry) {
        loaderStore.hide()
        flushQueue(new Error('Token still expired after refresh'), null)
        isRefreshing = false
        await forceLogout()
        return response
      }

      // Another refresh is already in-flight → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            originalRequest.headers['_token'] = newToken
            return api(originalRequest)   // retry with new token
          })
          .catch((err) => Promise.reject(err))
      }

      // ── This request kicks off the refresh ──
      originalRequest._retry = true
      isRefreshing = true
      // Keep the loader visible through the whole refresh → retry cycle

      try {
        const newToken = await doRefreshToken()

        // Release queued requests with the new token
        flushQueue(null, newToken)
        isRefreshing = false

        // Retry the original request with the new token
        originalRequest.headers['_token'] = newToken
        return api(originalRequest)

      } catch (refreshError) {
        // Refresh failed → release queue with error, logout
        flushQueue(refreshError, null)
        isRefreshing = false
        loaderStore.hide()
        await forceLogout()
        return Promise.reject(refreshError)
      }
    }

    loaderStore.hide()
    return response
  },

  (error) => {
    loaderStore.hide()

    // HTTP-level 401 (rare — most APIs return 200 with body code)
    if (error.response?.status === 401) {
      sessionStorage.clear()
      window.location.replace('/login')
    }

    return Promise.reject(error)
  }
)

// ─── handleRequest — unified response wrapper ─────────────────────────────────
/**
 * Wraps any axios promise and returns a consistent shape.
 *
 * Success: { success: true,  data, status }
 * Error:   { success: false, message, status, errors, data }
 */
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

// ─── formPost — multipart/form-data POST (standard SCS API format) ────────────
//
//  All SCS APIs expect:
//    RequestMethod  → plain string  e.g. "ServiceManager.GetAllUserRoles"
//    RequestData    → JSON string   e.g. "{}"
//
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
