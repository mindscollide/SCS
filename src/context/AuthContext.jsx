/**
 * src/context/AuthContext.jsx
 * ============================
 * Authentication context — current user, role, login/logout for the entire app.
 *
 * @description
 * Persists auth state to sessionStorage so it survives page refreshes within
 * the same tab but clears on tab close or explicit logout.
 *
 * Provider:
 *  @export AuthProvider — Wrap the app root (mounted in main.jsx)
 *
 * Hook:
 *  @export useAuth — Returns context value
 *
 * Context value:
 *  @prop {Object|null} user            - Profile object stored in sessionStorage
 *  @prop {string|null} role            - "admin" | "manager" | "data-entry" | null
 *  @prop {boolean}     loading         - Global loading flag (used by pages while awaiting API)
 *  @prop {Function}    setLoading      - Toggle loading state
 *  @prop {Function}    login(userData, userRole) - Persist session and set state
 *  @prop {Function}    logout()        - Clear sessionStorage and reset state
 *  @prop {boolean}     isAuthenticated - True when auth_token exists in sessionStorage
 *
 * Notes:
 *  - Uses sessionStorage (not localStorage) — does not survive browser close
 *  - Replace mock_token logic with real JWT on API integration
 */
import React, { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const data = sessionStorage.getItem('user_profile_data')
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  })

  const [role, setRole] = useState(() => sessionStorage.getItem('user_role') || null)
  const [loading, setLoading] = useState(false)

  const login = useCallback((userData, userRole) => {
    sessionStorage.setItem('user_profile_data', JSON.stringify(userData))
    sessionStorage.setItem('user_role', userRole)
    sessionStorage.setItem('auth_token', 'mock_token_' + Date.now())
    setUser(userData)
    setRole(userRole)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.clear()
    setUser(null)
    setRole(null)
  }, [])

  const isAuthenticated = !!sessionStorage.getItem('auth_token')

  return (
    <AuthContext.Provider
      value={{ user, role, loading, setLoading, login, logout, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
