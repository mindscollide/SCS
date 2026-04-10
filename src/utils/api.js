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

// ─── Request interceptor — attach auth token ─────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      delete config.headers.Authorization
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor — handle 401 globally ──────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear()
      window.location.href = '/login'
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

export const formPost = (url, requestMethod, requestData = {}) => {
  const fd = new FormData()
  fd.append('RequestMethod', requestMethod)
  fd.append('RequestData', JSON.stringify(requestData))
  // Delete Content-Type so the browser sets it automatically with the correct
  // multipart/form-data boundary — axios's default 'application/json' breaks it
  return handleRequest(api.post(url, fd, { headers: { 'Content-Type': undefined } }))
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
