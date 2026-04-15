/**
 * src/utils/api.js
 * =================
 * Centralized Axios instance for SCS.
 *
 * ── How to use in service files ──────────────────────────────────────────────
 *
 *   import api, { handleRequest, AUTH_URL } from '../utils/api'
 *
 *   // RPC-style (all SCS APIs):
 *   export const getAllUserRoles = () =>
 *     handleRequest(
 *       api.post(AUTH_URL, {
 *         RequestData:   {},
 *         RequestMethod: 'ServiceManager.GetAllUserRoles',
 *       })
 *     )
 *
 * ── Environment variables (.env) ─────────────────────────────────────────────
 *   VITE_BASE_URL = http://192.168.18.243   ← server IP
 *   VITE_AUTH_API = :6000/Auth              ← auth service port & path
 *   Combined →      http://192.168.18.243:6000/Auth
 *
 * ── Return shape ─────────────────────────────────────────────────────────────
 *   Success: { success: true,  data, status }
 *   Error:   { success: false, message, status, errors }
 */

import axios from 'axios'
import loaderStore from './loaderStore'

// ─── Token-refresh queue ──────────────────────────────────────────────────────
// Holds pending requests while a 417 refresh is in-flight.
// Once the new token arrives every queued request is retried automatically.
let isRefreshing = false
let failedQueue = []

const processQueue = (error, newToken = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(newToken)))
  failedQueue = []
}

// ─── Logout helper (used by refresh-failure path, avoids circular import) ────
const callLogoutAndRedirect = async () => {
  try {
    const profile  = (() => { try { return JSON.parse(sessionStorage.getItem('user_profile_data')) || {} } catch { return {} } })()
    const deviceId = localStorage.getItem('scs_device_id') || ''
    const fd = new FormData()
    fd.append('RequestMethod', import.meta.env.VITE_RM_LOGOUT)
    fd.append('RequestData', JSON.stringify({ UserID: profile.userID || 0, DeviceID: deviceId }))
    await axios.post(import.meta.env.VITE_BASE_URL + import.meta.env.VITE_AUTH_API, fd, {
      headers: { 'Content-Type': undefined },
    })
  } catch { /* best-effort */ }
  sessionStorage.clear()
  window.location.replace('/login')
}

// ─── URL constants ────────────────────────────────────────────────────────────
//
//  DEV  (npm run dev):
//    Browser  →  http://localhost:5173/Auth
//    Vite proxy forwards  →  http://192.168.18.243:6000/Auth
//    ✅ No CORS — browser only sees localhost
//
//  PROD (npm run build):
//    Browser hits full URL directly  →  http://192.168.18.243:6000/Auth
//    ✅ Backend must have CORS enabled for production domain
//
//  Helper: strips the port part from ':6000/Auth' → '/Auth' for dev proxy
const toPath = (api) => api.replace(/^:\d+/, '')

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost'
const AUTH_API = import.meta.env.VITE_AUTH_API || ':6000/Auth'
const Admin_API = import.meta.env.VITE_Admin_API || ':6001/Admin'

export const AUTH_URL = `${BASE_URL}${AUTH_API}`
export const Admin_URL = `${BASE_URL}${Admin_API}`
// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '', // keep empty — all URLs are either relative (dev) or absolute (prod)
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ─── Request interceptor — attach auth token + show loader ───────────────────

api.interceptors.request.use(
  (config) => {
    loaderStore.show()
    if (!config.skipAuth) {
      const token = sessionStorage.getItem('auth_token')
      if (token) config.headers['_token'] = token
      else delete config.headers['_token']
    }
    return config
  },
  (error) => {
    loaderStore.hide()
    return Promise.reject(error)
  }
)

// ─── Response interceptor — hide loader, handle 401 & 417 ───────────────────

api.interceptors.response.use(
  async (response) => {
    loaderStore.hide()

    // Skip auth error handling for requests that don't send a token (e.g. logout)
    if (response.config?.skipAuth) return response

    // ── Body-level 401 — Token mismatch → logout immediately ─────────────
    if (response.data?.responseCode === 401) {
      await callLogoutAndRedirect()
      return response
    }

    // ── Body-level 417 — Token expired → refresh and retry ───────────────
    if (response.data?.responseCode === 417) {
      const originalRequest = response.config

      // Already retried once and still getting 417 → force logout
      if (originalRequest._retry) {
        await callLogoutAndRedirect()
        return response
      }

      // While a refresh is already in-flight, queue this request
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

      originalRequest._retry = true
      isRefreshing = true

      try {
        const storedToken        = sessionStorage.getItem('auth_token')
        const storedRefreshToken = sessionStorage.getItem('refresh_token')
        const pad = (n) => String(n).padStart(2, '0')
        const now = new Date()
        const nowFmt = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
        const lastLoginDateTime  = sessionStorage.getItem('last_login_datetime') || nowFmt

        const fd = new FormData()
        fd.append('RequestMethod', import.meta.env.VITE_RM_REFRESH_TOKEN)
        fd.append(
          'RequestData',
          JSON.stringify({
            Token:             storedToken,
            RefreshToken:      storedRefreshToken,
            LastLoginDateTime: lastLoginDateTime,
          })
        )

        const refreshResponse = await axios.post(AUTH_URL, fd, {
          headers: { 'Content-Type': undefined },
        })

        const rr       = refreshResponse.data?.responseResult
        const respCode = rr?.ResponseMessage

        // Refresh token itself expired → force logout
        if (respCode === 'ERM_Auth_AuthServiceManager_RefreshToken_02') {
          throw new Error('Refresh token expired')
        }

        if (respCode !== 'ERM_Auth_AuthServiceManager_RefreshToken_01') {
          throw new Error('Refresh token failed: ' + respCode)
        }

        const newToken     = rr?.RefreshToken?.Token
        const newRefresh   = rr?.RefreshToken?.RefreshToken
        const newLastLogin = rr?.RefreshToken?.LastLoginDateTime

        if (!newToken) throw new Error('Refresh token response missing token')

        // Persist updated tokens
        sessionStorage.setItem('auth_token',    newToken)
        sessionStorage.setItem('refresh_token', newRefresh)
        if (newLastLogin) sessionStorage.setItem('last_login_datetime', newLastLogin)

        api.defaults.headers.common['_token'] = newToken

        processQueue(null, newToken)
        isRefreshing = false

        // Retry the original request with the new token
        originalRequest.headers['_token'] = newToken
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        await callLogoutAndRedirect()
        return Promise.reject(refreshError)
      }
    }

    return response
  },
  (error) => {
    loaderStore.hide()

    const status = error.response?.status
    if (status === 401) {
      sessionStorage.clear()
      window.location.replace('/login')
    }

    return Promise.reject(error)
  }
)

// ─── Unified response handler — exported for use in service files ─────────────

/**
 * Wraps any axios promise and returns a consistent shape.
 *
 * @param   {Promise} axiosPromise
 * @returns {Promise<{ success, data, status } | { success, message, status, errors }>}
 */
export const handleRequest = async (axiosPromise) => {
  try {
    const response = await axiosPromise
    return { success: true, data: response.data, status: response.status }
  } catch (error) {
    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        message:
          error.response.data?.message || error.response.data?.detail || 'Something went wrong.',
        errors: error.response.data?.errors || null,
        data: error.response.data || null,
      }
    } else if (error.request) {
      return {
        success: false,
        status: null,
        message: 'Network error. Please check your connection.',
        errors: null,
        data: null,
      }
    } else {
      return {
        success: false,
        status: null,
        message: error.message || 'An unexpected error occurred.',
        errors: null,
        data: null,
      }
    }
  }
}

// ─── Form-data POST (matches Postman form-data format) ───────────────────────
//
//  All SCS APIs expect multipart/form-data with two fields:
//    RequestMethod  → plain string  e.g. "ServiceManager.GetAllUserRoles"
//    RequestData    → JSON string   e.g. "{}" or '{"Email":"abc@test.com"}'
//
//  Usage in service files:
//    export const getAllUserRoles = () =>
//      formPost(Admin_URL, 'ServiceManager.GetAllUserRoles', {})

export const formPost = (url, requestMethod, requestData = {}, config = {}) => {
  const fd = new FormData()
  fd.append('RequestMethod', requestMethod)
  fd.append('RequestData', JSON.stringify(requestData))
  // Delete Content-Type so the browser sets it automatically with the correct
  // multipart/form-data boundary — axios's default 'application/json' breaks it
  return handleRequest(api.post(url, fd, { headers: { 'Content-Type': undefined }, ...config }))
}

// ─── REST helpers (kept for financial.service.js and future use) ─────────────

/** GET  */
export const get = (url, params = {}, config = {}) =>
  handleRequest(api.get(url, { params, ...config }))

/** POST */
export const post = (url, body = {}, config = {}) => handleRequest(api.post(url, body, config))

/** PUT  */
export const put = (url, body = {}, config = {}) => handleRequest(api.put(url, body, config))

/** PATCH */
export const patch = (url, body = {}, config = {}) => handleRequest(api.patch(url, body, config))

/** DELETE */
export const del = (url, config = {}) => handleRequest(api.delete(url, config))

/** File upload */
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
