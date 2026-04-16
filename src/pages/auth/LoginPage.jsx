/**
 * src/pages/auth/LoginPage.jsx
 * ==============================
 * Login page — integrates real ServiceManager.Login API.
 *
 * Flow:
 *  1. User enters EmailAddress + Password
 *  2. Calls loginApi → stores token, refreshToken, userProfileData in sessionStorage
 *  3. Navigates to role-based dashboard from userAssignedRoles[0]
 *  4. Remember Me saves email to localStorage
 */

import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Eye, EyeOff } from 'lucide-react'
import Input from '../../components/common/Input/Input'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import AlHilalLogo from '../../components/common/auth/AlHilalLogo'
import AuthLeftPanel from '../../components/common/auth/AuthLeftPanel'
import { toast } from 'react-toastify'
import {
  loginApi,
  LOGIN_CODES,
  logoutApi,
  getAllUserRoles,
  GET_ALL_USER_ROLES_CODES,
} from '../../services/auth.service'
import loaderStore from '../../utils/loaderStore'
import { toAPIDate } from '../../utils/helpers'

// ─── roleID → home route ─────────────────────────────────────────────────────
const getRolePath = (roleID) => {
  switch (roleID) {
    case 1:  return '/scs/admin/users'
    case 2:  return '/scs/manager/pending-approvals'
    case 3:  return '/scs/data-entry/financial-data'
    default: return '/scs/admin/users'
  }
}

// ─── Device helpers ───────────────────────────────────────────────────────────
const getDeviceId = () => {
  let id = localStorage.getItem('scs_device_id')
  if (!id) {
    id = 'device-' + Math.random().toString(36).substring(2, 11)
    localStorage.setItem('scs_device_id', id)
  }
  return id
}

const getDeviceName = () => {
  const ua = navigator.userAgent
  if (ua.includes('Edg'))     return 'Edge'
  if (ua.includes('Chrome'))  return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari'))  return 'Safari'
  return 'Browser'
}

// ─── Remember Me storage key ─────────────────────────────────────────────────
const REMEMBER_KEY = 'scs_remember'

/* ── Login Page ──────────────────────────────────────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate()

  // Guard against React StrictMode double-invocation — logout must fire once only.
  const logoutCalled = useRef(false)

  // On login page load: call logout API (best-effort) then clear session.
  // Covers: back-button after logout, expired session, direct /login navigation.
  React.useEffect(() => {
    if (logoutCalled.current) return
    logoutCalled.current = true

    const token = sessionStorage.getItem('auth_token')
    if (token) {
      logoutApi().finally(() => sessionStorage.clear())
    } else {
      sessionStorage.clear()
    }
  }, [])

  // Read saved email from localStorage (Remember Me)
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(REMEMBER_KEY)) || {} }
    catch { return {} }
  })()

  const [email,    setEmail]    = useState(saved.email || '')
  const [pwd,      setPwd]      = useState(saved.pwd   || '')
  const [showPwd,  setShowPwd]  = useState(false)
  const [remember, setRemember] = useState(!!saved.email)
  const [loading,  setLoading]  = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [errors,   setErrors]   = useState({ email: '', pwd: '' })

  const showToastError = (msg) =>
    toast.error(msg, {
      style:         { backgroundColor: '#E74C3C', color: '#ffffff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })

  const clearError = (field) => setErrors((p) => ({ ...p, [field]: '' }))

  // ── Client-side validation ─────────────────────────────────────────────────
  const validate = () => {
    const e = { email: '', pwd: '' }
    if (!email.trim())
      e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Enter a valid email address.'
    if (!pwd.trim())
      e.pwd = 'Password is required.'
    setErrors(e)
    return !e.email && !e.pwd
  }

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    // Manually hold the loader open so it stays visible all the way through
    // login response → navigation → first page API response.
    // It will be released by the destination page after its first fetch.
    loaderStore.show()

    const result = await loginApi({
      EmailAddress: email.trim(),
      Password:     pwd,
      DeviceID:     getDeviceId(),
      DeviceName:   getDeviceName(),
    })

    setLoading(false)

    if (!result.success) {
      loaderStore.hide() // release manual hold — login failed
      showToastError(result.message || 'Login failed. Please try again.')
      return
    }

    const responseResult = result.data?.responseResult
    const code           = responseResult?.responseMessage

    // ── Success ──
    if (code === 'ERM_Auth_AuthServiceManager_Login_01') {
      if (remember) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, pwd }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }

      const { userToken, userProfileData, userAssignedRoles, lastLoggedInDateTime } = responseResult
      sessionStorage.setItem('auth_token',          userToken.token)
      sessionStorage.setItem('refresh_token',       userToken.refreshToken)
      sessionStorage.setItem('last_login_datetime', lastLoggedInDateTime || toAPIDate(new Date()))
      sessionStorage.setItem('user_profile_data', JSON.stringify({
        ...userProfileData,
        fullName: `${userProfileData.firstName} ${userProfileData.lastName}`,
      }))
      sessionStorage.setItem('user_roles',        JSON.stringify(userAssignedRoles))
      sessionStorage.setItem('user_role',         userAssignedRoles[0]?.roleName || '')

      navigate(getRolePath(userAssignedRoles[0]?.roleID))
      return
    }

    // ── Error codes ──
    loaderStore.hide() // release manual hold — API returned an error code
    showToastError(LOGIN_CODES[code] || 'Invalid email or password.')
  }

  // ── Signup handler (loads roles then navigates) ────────────────────────────
  const handleSignup = async () => {
    setSignupLoading(true)
    const result = await getAllUserRoles()
    setSignupLoading(false)

    const code  = result.data?.responseResult?.responseMessage
    const roles = result.data?.responseResult?.userRoles

    if (result.success && code === 'Admin_AdminServiceManager_GetAllUserRoles_02' && roles?.length > 0) {
      navigate('/signup', { state: { roles } })
    } else {
      toast.error(
        GET_ALL_USER_ROLES_CODES[code] || result.message || 'Unable to load roles. Please try again.',
        {
          style:         { backgroundColor: '#E74C3C', color: '#ffffff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        }
      )
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen font-sans">
      {/* LEFT — gradient panel */}
      <AuthLeftPanel variant="login" />

      {/* RIGHT — login form */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px]">
            <AlHilalLogo variant="login" />

            <form onSubmit={handleLogin} className="w-full space-y-3">
              {/* Email */}
              <Input
                type="email"
                value={email}
                onChange={(v) => { setEmail(v); clearError('email') }}
                placeholder="Email Address"
                rightIcon={<Mail size={17} />}
                bgColor="#ffffff"
                borderColor={errors.email ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                textColor="#1B3A6B"
                error={!!errors.email}
                errorMessage={errors.email}
              />

              {/* Password */}
              <Input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(v) => { setPwd(v); clearError('pwd') }}
                placeholder="Password"
                rightIcon={showPwd ? <Eye size={17} /> : <EyeOff size={17} />}
                onRightIconClick={() => setShowPwd((p) => !p)}
                bgColor="#ffffff"
                borderColor={errors.pwd ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                textColor="#1B3A6B"
                error={!!errors.pwd}
                errorMessage={errors.pwd}
              />

              {/* Remember me */}
              <Checkbox
                label="Remember me"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                accentColor="#00B894"
                className="pt-1"
                labelClassName="text-[#4a5568]"
              />

              {/* Login + Signup buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading || signupLoading}
                  className="flex-1 py-[10px] rounded-[10px] text-[14px] font-semibold
                             text-white bg-[#1B3A6B] hover:bg-[#132e57]
                             disabled:opacity-60 transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Login'}
                </button>

                <button
                  type="button"
                  onClick={handleSignup}
                  disabled={signupLoading || loading}
                  className="flex-1 py-[10px] rounded-[10px] text-[14px] font-semibold
                             text-white bg-[#00B894] hover:bg-[#00a07e]
                             disabled:opacity-60 transition-colors flex items-center justify-center"
                >
                  {signupLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Signup'}
                </button>
              </div>

              {/* Forgot Password */}
              <div className="text-center pt-2">
                <Link
                  to="/forgot-password"
                  className="text-[13px] font-semibold text-[#E67E22] hover:underline"
                >
                  Forgot Password
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
