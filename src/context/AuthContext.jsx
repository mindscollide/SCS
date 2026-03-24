import React, { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const data = sessionStorage.getItem('user_profile_data')
      return data ? JSON.parse(data) : null
    } catch { return null }
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
    <AuthContext.Provider value={{ user, role, loading, setLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
