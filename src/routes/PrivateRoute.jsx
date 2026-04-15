/**
 * src/routes/PrivateRoute.jsx
 * ============================
 * Blocks access to any route under /scs if no auth_token exists in sessionStorage.
 * Redirects unauthenticated users to /login.
 */

import { useEffect } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'

const PrivateRoute = () => {
  const token    = sessionStorage.getItem('auth_token')
  const navigate = useNavigate()

  // Guard against bfcache restoration (browser restores page from memory
  // without re-running JS — persisted flag check forces re-evaluation)
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted && !sessionStorage.getItem('auth_token')) {
        navigate('/login', { replace: true })
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [navigate])

  return token ? <Outlet /> : <Navigate to="/login" replace />
}

export default PrivateRoute
