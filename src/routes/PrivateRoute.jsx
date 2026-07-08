/**
 * src/routes/PrivateRoute.jsx
 * ============================
 * Guards all authenticated routes.
 *
 * Fast path (normal tab):
 *   auth_token in sessionStorage → render <Outlet /> immediately.
 *
 * Restore path (new tab opened via right-click / middle-click):
 *   sessionStorage is empty but localStorage has bootstrap data
 *   → restoreSessionFromLocal() copies everything (including auth_token) to sessionStorage
 *   → render <Outlet /> immediately — no refresh call, no login prompt.
 *   If the restored JWT is expired, the first API call triggers the existing reactive
 *   417 refresh in api.js, which handles it transparently.
 *
 * Redirect path:
 *   No localStorage bootstrap data → navigate to /login.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { restoreSessionFromLocal, LS_KEYS } from '../utils/sessionRestore'
import { restartTokenTimer } from '../utils/tokenTimer'

const PrivateRoute = () => {
  const navigate = useNavigate()

  // Synchronously check the fast path to avoid a flash of the spinner
  const [status, setStatus] = useState(() =>
    sessionStorage.getItem('auth_token') ? 'ok' : 'checking'
  )

  const restoredRef = useRef(false)

  useEffect(() => {
    if (status !== 'checking') return
    if (restoredRef.current) return
    restoredRef.current = true

    const authToken    = localStorage.getItem(LS_KEYS.AUTH_TOKEN)
    const profile      = localStorage.getItem(LS_KEYS.USER_PROFILE)

    if (!authToken || !profile) {
      setStatus('redirect')
      return
    }

    // Copy all bootstrap data (including auth_token) into this tab's sessionStorage.
    // No refresh API call — use the same JWT the original tab is using.
    // If it has expired, the first API call returns 417 and api.js handles the refresh.
    restoreSessionFromLocal()
    restartTokenTimer()
    setStatus('ok')
  }, [status])

  // bfcache guard — browser restores tab from memory without re-running JS
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted && !sessionStorage.getItem('auth_token')) {
        navigate('/login', { replace: true })
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [navigate])

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-9 h-9 border-4 border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
      </div>
    )
  }

  return status === 'ok' ? <Outlet /> : <Navigate to="/login" replace />
}

export default PrivateRoute
