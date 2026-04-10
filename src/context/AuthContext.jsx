/**
 * src/context/AuthContext.jsx
 * ============================
 * Authentication context — current user, role, login/logout for the entire app.
 *
 * Pattern: useReducer (state) + services/auth.service.js (API calls)
 *
 * Provider:
 *  @export AuthProvider — Wrap the app root (in main.jsx or router)
 *
 * Hook:
 *  @export useAuth — Returns context value
 *
 * Context value:
 *  @prop {Object|null} user            — Profile object
 *  @prop {string|null} role            — "admin" | "manager" | "data-entry" | null
 *  @prop {boolean}     loading         — True while an auth API call is in-flight
 *  @prop {string|null} error           — Last auth error message (null if none)
 *  @prop {boolean}     isAuthenticated — True when auth_token exists in sessionStorage
 *  @prop {Function}    login(credentials) — Calls loginApi, persists session
 *  @prop {Function}    logout()           — Clears sessionStorage, resets state
 *  @prop {Function}    clearError()       — Resets error to null
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { loginApi } from '../services/auth.service'

// ── State shape ───────────────────────────────────────────────────────────────

const getInitialState = () => {
  try {
    const user = sessionStorage.getItem('user_profile_data')
    const role = sessionStorage.getItem('user_role')
    return {
      user: user ? JSON.parse(user) : null,
      role: role || null,
      loading: false,
      error: null,
    }
  } catch {
    return { user: null, role: null, loading: false, error: null }
  }
}

// ── Reducer ───────────────────────────────────────────────────────────────────

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null }

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        error: null,
        user: action.payload.user,
        role: action.payload.role,
      }

    case 'LOGIN_ERROR':
      return { ...state, loading: false, error: action.payload }

    case 'LOGOUT':
      return { user: null, role: null, loading: false, error: null }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, null, getInitialState)

  /**
   * Login — calls the API, persists session, updates state.
   * @param {{ userid: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, message?: string }>}
   */
  const login = useCallback(async (credentials) => {
    dispatch({ type: 'LOGIN_START' })
    const result = await loginApi(credentials)

    if (result.success) {
      const user = result.data?.user || result.data
      const role = result.data?.role || result.data?.userRole

      // Persist to sessionStorage (survives refresh, clears on tab close)
      sessionStorage.setItem('user_profile_data', JSON.stringify(user))
      sessionStorage.setItem('user_role', role)
      sessionStorage.setItem('auth_token', result.data?.token || 'token_' + Date.now())

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, role } })
      return { success: true }
    } else {
      dispatch({ type: 'LOGIN_ERROR', payload: result.message || 'Invalid credentials.' })
      return { success: false, message: result.message }
    }
  }, [])

  /**
   * Logout — clears sessionStorage and resets state.
   */
  const logout = useCallback(() => {
    sessionStorage.clear()
    dispatch({ type: 'LOGOUT' })
  }, [])

  /**
   * Clear the error (e.g. when user starts typing again)
   */
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [])

  const isAuthenticated = !!sessionStorage.getItem('auth_token')

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        role: state.role,
        loading: state.loading,
        error: state.error,
        isAuthenticated,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
