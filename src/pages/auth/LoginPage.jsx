/**
 * src/pages/auth/LoginPage.jsx
 * ==============================
 * Login page — integrates the ServiceManager.Login API.
 *
 * Mount behaviour:
 *  - If auth_token exists in sessionStorage (back-button while logged in): calls logoutApi,
 *    then clearLocalSession() + sessionStorage.clear() to fully invalidate the session.
 *  - Otherwise: sessionStorage.clear() only (no localStorage touch — other tabs may still
 *    need the bootstrap data stored there).
 *  - Restores Remember Me credentials (email + AES-decrypted password) from localStorage.
 *
 * Login flow:
 *  1. Client-side validation (email format + password required)
 *  2. generateDeviceSuffix() — creates a unique browser-level device ID:
 *       - Written to localStorage as 'scs_device_id' (shared across all tabs in this browser)
 *         so the force_logout MQTT handler can identify same-browser tabs and skip kicking them.
 *       - Also written to sessionStorage as 'user_device_id' for backward compatibility.
 *  3. Calls loginApi with EmailAddress, Password, DeviceID, DeviceName
 *  4. On success — written to sessionStorage (tab-specific):
 *       auth_token, refresh_token, last_login_datetime,
 *       user_profile_data, user_roles, user_role, user_mqtt_ip_Address, user_mqtt_Port
 *     Default compliance criteria → localStorage via setDefaultCriteria (shared across tabs).
 *     Written to localStorage (shared across tabs — enables multi-tab restore):
 *       scs_auth_token, scs_refresh_token, scs_last_login,
 *       scs_user_profile, scs_user_roles, scs_user_role,
 *       scs_token_timeout, scs_mqtt_ip, scs_mqtt_port, scs_device_id
 *     Starts proactive token-refresh timer via startTokenTimer(tokenTimeOut).
 *  5. Holds the global loader open (loaderStore.show()) for a smooth login transition,
 *     then fires two background pre-fetches concurrently inside the held loader:
 *       a. fetchAndCacheSuggestedReasons(roleName)
 *            → sessionStorage 'approve_reasons' + 'decline_reasons'
 *       b. getAllNotifications (Admin) | getAllManagerNotifications (Manager)
 *            → sessionStorage 'cached_notifications'
 *     Both calls use { skipLoader: true } — released in finally, giving one uninterrupted
 *     load animation all the way to the dashboard.
 *  6. navigate() to role-based home:
 *       roleID 1 (Admin)      → /admin/users
 *       roleID 2 (Manager)    → /manager/pending-approvals
 *       roleID 3 (Data Entry) → /data-entry/financial-data
 *
 * Multi-tab support:
 *  - localStorage bootstrap data allows new tabs (right-click / middle-click → Open in
 *    new tab) to restore the session without redirecting to login. See PrivateRoute.jsx
 *    and sessionRestore.js for the restore flow.
 *
 * Remember Me:
 *  - Email and AES-GCM-encrypted password saved to localStorage key 'scs_remember'.
 *  - Cleared from localStorage on successful login when checkbox is unchecked.
 *
 * Sign-up flow (handleSignup):
 *  - Fetches roles (GetAllUserRoles) then countries (GetAllCountries) and navigates
 *    to /signup with both lists in route state.
 *  - "_01" (no records) on either call is treated as success with an empty list —
 *    silent, never a snackbar. Only exceptions/network failures show an error toast.
 */

import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import Input from '../../components/common/Input/Input'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import AlHilalLogo from '../../components/common/auth/AlHilalLogo'
import AuthLeftPanel from '../../components/common/auth/AuthLeftPanel'
import { BtnDark, BtnGreen } from '../../components/common'
import { toast } from 'react-toastify'
import {
  loginApi,
  LOGIN_CODES,
  logoutApi,
  getAllUserRoles,
  GET_ALL_USER_ROLES_CODES,
  getCountriesApi,
} from '../../services/auth.service'
import { toAPIDate } from '../../utils/helpers'
import { startTokenTimer, stopTokenTimer } from '../../utils/tokenTimer'
import { encryptText, decryptText } from '../../utils/crypto'
import eye from '../../../public/eye-blue-icon.png'
import EyeCloseIcon from '../../../public/eye-close-icon.png'
import { getAllSuggestedReasoningAPI, getAllNotifications } from '../../services/admin.service'
import { getAllManagerNotifications } from '../../services/manager.service'
import loaderStore from '../../utils/loaderStore'
import { clearLocalSession, LS_KEYS } from '../../utils/sessionRestore'
import { dropdownCache } from '../../utils/dropdownCache'
import { setDefaultCriteria } from '../../utils/defaultCriteria'
// ─── Password eye icon ─────────────────────────────────────────────────────
const EyeIcon = ({ color }) => (
  <img
    src={eye}
    alt="eye"
    className="h-[20px] w-auto object-contain select-none"
    style={{
      filter:
        color === '#E74C3C'
          ? 'invert(29%) sepia(93%) saturate(747%) hue-rotate(337deg) brightness(95%) contrast(92%)'
          : 'none',
    }}
    // draggable={false}
  />
)

const EyeClose = ({ color }) => (
  <img
    src={EyeCloseIcon}
    alt="eyeClose"
    className="h-[20px] w-auto object-contain select-none "
    style={{
      filter:
        color === '#E74C3C'
          ? 'invert(29%) sepia(93%) saturate(747%) hue-rotate(337deg) brightness(95%) contrast(92%)'
          : 'none',
    }}
    // draggable={false}
  />
)

// ─── roleID → home route ─────────────────────────────────────────────────────
const getRolePath = (roleID) => {
  switch (roleID) {
    case 1:
      return '/admin/users'
    case 2:
      return '/manager/pending-approvals'
    case 3:
      return '/data-entry/financial-data'
    default:
      return '/admin/users'
  }
}

// ─── Device helpers ───────────────────────────────────────────────────────────
// generateDeviceSuffix — creates a fresh unique ID for this login session.
// Format: {timestamp}{random5}  e.g. "17150000000042891"
// Stored in localStorage (scs_device_id) so ALL tabs in the same browser share
// the same device ID — the force_logout handler uses this to skip kicking out
// tabs in the same browser. Also written to sessionStorage for backward compat.
const generateDeviceSuffix = () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 100000)}`
  localStorage.setItem(LS_KEYS.DEVICE_ID, suffix)
  sessionStorage.setItem('user_device_id', suffix)
  return suffix
}

const getDeviceName = () => {
  const ua = navigator.userAgent
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
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
      logoutApi().finally(() => {
        stopTokenTimer()
        clearLocalSession()   // clears session bootstrap + dropdown cache
        sessionStorage.clear()
      })
    } else {
      stopTokenTimer()
      dropdownCache.clearAll() // clear stale dropdown data from any previous session
      sessionStorage.clear()
    }
  }, [])

  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(false)
  const [authError, setAuthError] = useState('')

  // Decrypt and restore Remember Me credentials on mount
  React.useEffect(() => {
    const restoreCredentials = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY))
        if (!saved?.email) return
        setEmail(saved.email)
        setRemember(true)
        if (saved.pwd) {
          const plain = await decryptText(saved.pwd)
          if (plain) setPwd(plain)
        }
      } catch {
        /* ignore malformed data */
      }
    }
    restoreCredentials()
  }, [])
  const [loading, setLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false) // ← add this
  const [errors, setErrors] = useState({ email: '', pwd: '' })

  const showToastError = (msg) =>
    toast.error(msg, {
      style: { backgroundColor: '#E74C3C', color: '#ffffff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })

  const clearError = (field) => setErrors((p) => ({ ...p, [field]: '' }))

  // ── Client-side validation ─────────────────────────────────────────────────
  const validate = () => {
    const e = { email: '', pwd: '' }
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.'
    if (!pwd.trim()) e.pwd = 'Password is required.'
    setErrors(e)
    return !e.email && !e.pwd
  }

  // ---Get Suggested Reasons-------------------------
  const fetchAndCacheSuggestedReasons = async (role) => {
    try {
      const result = await getAllSuggestedReasoningAPI({ skipLoader: true })

      if (!result?.success) return

      const rr = result.data?.responseResult
      const code = rr?.responseMessage

      // We only care about the Success code (02)
      if (code === 'Admin_AdminServiceManager_GetAllSuggestedReasons_02') {
        if (role === 'Admin') {
          // Store Admin specific reasons
          sessionStorage.setItem('approve_reasons', JSON.stringify(rr.adminApproval || []))
          sessionStorage.setItem('decline_reasons', JSON.stringify(rr.adminDecline || []))
        } else if (role === 'Manager') {
          // Store Manager specific reasons
          sessionStorage.setItem('approve_reasons', JSON.stringify(rr.managerApproval || []))
          sessionStorage.setItem('decline_reasons', JSON.stringify(rr.managerDecline || []))
        }
      }
    } catch (error) {
      console.error('Failed to pre-fetch suggested reasons:', error)
    }
  }

  // ── Login handler ──────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)

    // Generate and persist the device suffix BEFORE the API call.
    // AppLayout reads 'user_device_id' from sessionStorage to build the MQTT
    // clientId. The force_logout handler also reads it to decide whether this
    // session should be displaced.
    const deviceId = generateDeviceSuffix()

    const result = await loginApi({
      EmailAddress: email.trim(),
      Password: pwd,
      DeviceID: deviceId,
      DeviceName: getDeviceName(),
    })

    const responseResult = result.data?.responseResult
    const code = responseResult?.responseMessage

    if (code === 'ERM_Auth_AuthServiceManager_Login_03') {
      setLoading(false)
      showToastError('Your account is deactivated. Please contact SCS support team')
      setErrors({ email: '', pwd: '' })
      return
    }

    if (!result.success) {
      setLoading(false)
      if (code === 'ERM_Auth_AuthServiceManager_Login_04') {
        toast.error(LOGIN_CODES[code], {
          style: { backgroundColor: '#E74C3C', color: '#ffffff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        })
        setErrors({ email: '', pwd: '' })
      } else {
        setAuthError(LOGIN_CODES[code] || 'Invalid User ID or Password')
        setErrors({ email: true, pwd: true })
      }
      return
    }

    // ── Success ──
    // ── Success ──
    if (code === 'ERM_Auth_AuthServiceManager_Login_01') {
      if (remember) {
        const encryptedPwd = await encryptText(pwd)
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, pwd: encryptedPwd }))
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }

      const {
        userToken,
        userProfileData,
        userAssignedRoles,
        lastLoggedInDateTime,
        complianceCriteria,
        mqtt,
        tokenTimeOut,
      } = responseResult

      const profileJson = JSON.stringify({
        ...userProfileData,
        fullName: `${userProfileData.firstName} ${userProfileData.lastName}`,
      })
      const rolesJson    = JSON.stringify(userAssignedRoles)
      const lastLogin    = lastLoggedInDateTime || toAPIDate(new Date())

      // ── sessionStorage — JWT stays here only (cleared on tab/browser close) ──
      sessionStorage.setItem('auth_token', userToken.token)
      sessionStorage.setItem('refresh_token', userToken.refreshToken)
      sessionStorage.setItem('last_login_datetime', lastLogin)
      sessionStorage.setItem('user_profile_data', profileJson)
      sessionStorage.setItem('user_roles', rolesJson)
      sessionStorage.setItem('user_role', userAssignedRoles[0]?.roleName || '')
      // Default compliance criteria → localStorage (shared across all tabs).
      // Empty/absent → no default exists for this session.
      setDefaultCriteria(complianceCriteria || [])
      if (mqtt?.mqttipAddress && mqtt?.mqttPort) {
        sessionStorage.setItem('user_mqtt_ip_Address', mqtt.mqttipAddress)
        sessionStorage.setItem('user_mqtt_Port', String(mqtt.mqttPort))
      }

      // ── localStorage — bootstrap data shared across all tabs in this browser ──
      // Allows new tabs (right-click → Open in new tab) to restore session silently.
      // scs_auth_token is included because the backend RefreshToken endpoint reads
      // the JWT from the _token header — new tabs need it to call the refresh API.
      localStorage.setItem(LS_KEYS.AUTH_TOKEN,    userToken.token)
      localStorage.setItem(LS_KEYS.REFRESH_TOKEN, userToken.refreshToken)
      localStorage.setItem(LS_KEYS.LAST_LOGIN,    lastLogin)
      localStorage.setItem(LS_KEYS.USER_PROFILE,  profileJson)
      localStorage.setItem(LS_KEYS.USER_ROLES,    rolesJson)
      localStorage.setItem(LS_KEYS.USER_ROLE,     userAssignedRoles[0]?.roleName || '')
      if (tokenTimeOut) localStorage.setItem(LS_KEYS.TOKEN_TIMEOUT, String(tokenTimeOut))
      if (mqtt?.mqttipAddress) localStorage.setItem(LS_KEYS.MQTT_IP, mqtt.mqttipAddress)
      if (mqtt?.mqttPort)      localStorage.setItem(LS_KEYS.MQTT_PORT, String(mqtt.mqttPort))

      if (tokenTimeOut) startTokenTimer(tokenTimeOut)

      // ── Pre-fetch suggested reasons + notifications, then navigate ──────
      const roleID = userAssignedRoles[0]?.roleID
      const roleName = userAssignedRoles[0]?.roleName || ''

      // Hold the global loader open for the entire post-login sequence so the
      // transition from login → dashboard is one smooth continuous load.
      loaderStore.show()
      try {
        await fetchAndCacheSuggestedReasons(roleName)

        const notifFn =
          roleID === 1 ? getAllNotifications : roleID === 2 ? getAllManagerNotifications : null
        if (notifFn) {
          const notifRes = await notifFn({ skipLoader: true })
          if (notifRes?.success) {
            const raw =
              notifRes.data?.responseResult?.notifications ??
              notifRes.data?.responseResult?.Notifications ??
              []
            sessionStorage.setItem('cached_notifications', JSON.stringify(raw))
          }
        }
      } catch {
        /* non-critical */
      } finally {
        loaderStore.hide()
      }

      setLoading(false)
      setLoggedIn(true)
      navigate(getRolePath(roleID))
      return
    }

    // ── Error codes ──
    setLoading(false)
    setAuthError('Invalid User ID or Password')
    setErrors({ email: true, pwd: true })
  }

  // ── Signup handler (loads roles then navigates) ────────────────────────────
  const handleSignup = async () => {
    setSignupLoading(true)

    // First API Call - Get Roles
    const result = await getAllUserRoles()

    const rolesCode = result.data?.responseResult?.responseMessage
    const roles = result.data?.responseResult?.userRoles

    // Check Roles API first.
    // "_01" = no records found — treated as success with an empty list (silent,
    // no snackbar); only exceptions/network failures fall through to the toast.
    if (
      result.success &&
      (rolesCode === 'Admin_AdminServiceManager_GetAllUserRoles_02' ||
        rolesCode === 'Admin_AdminServiceManager_GetAllUserRoles_01')
    ) {
      // Second API Call - Get Countries
      const allCountriesResult = await getCountriesApi()

      const countriesCode = allCountriesResult.data?.responseResult?.responseMessage

      const countries = allCountriesResult.data?.responseResult?.countries

      setSignupLoading(false)

      // Check Countries API — "_01" (no records) is success-with-empty, same as roles.
      if (
        allCountriesResult.success &&
        (countriesCode === 'Auth_AuthServiceManager_GetAllCountries_02' ||
          countriesCode === 'Auth_AuthServiceManager_GetAllCountries_01')
      ) {
        navigate('/signup', {
          state: {
            roles: roles ?? [],
            countries: countries ?? [],
          },
        })
      } else {
        toast.error(
          GET_ALL_COUNTRIES_CODES[countriesCode] ||
            allCountriesResult.message ||
            'Unable to load countries. Please try again.',
          {
            style: {
              backgroundColor: '#E74C3C',
              color: '#ffffff',
            },
            progressStyle: {
              backgroundColor: '#ffffff50',
            },
          }
        )
      }
    } else {
      setSignupLoading(false)

      toast.error(
        GET_ALL_USER_ROLES_CODES[rolesCode] ||
          result.message ||
          'Unable to load roles. Please try again.',
        {
          style: {
            backgroundColor: '#E74C3C',
            color: '#ffffff',
          },
          progressStyle: {
            backgroundColor: '#ffffff50',
          },
        }
      )
    }
  }

  if (loggedIn) return null
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen font-sans">
      {/* LEFT — gradient panel */}
      <AuthLeftPanel variant="login" />

      {/* RIGHT — login form */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[360px]">
            <AlHilalLogo variant="login" />

            <form onSubmit={handleLogin} className="w-full space-y-3">
              {/* Email */}
              {authError && (
                <p className="text-[12px] text-red-500 mb-1 font-medium">{authError}</p>
              )}
              <Input
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v)
                  clearError('email')
                  setAuthError('')
                  // setErrors('')
                  setErrors({ email: '', pwd: '' })
                }}
                placeholder="Email Address"
                // rightIcon={<Mail size={17} />}
                rightIcon={
                  <User size={20} color={errors.email || authError ? '#E74C3C' : undefined} />
                  // <Mail size={17} color={errors.email || authError ? '#E74C3C' : undefined} />
                }
                bgColor="#ffffff"
                borderColor={errors.email || authError ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                // textColor="#1B3A6B"
                textColor={errors.email || authError ? '#E74C3C' : '#1B3A6B'}
                error={!!errors.email}
                errorMessage={errors.email}
              />

              {/* Password */}
              <Input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(v) => {
                  setPwd(v)
                  clearError('pwd')
                  setAuthError('')
                  // setErrors('')
                  setErrors({ email: '', pwd: '' })
                }}
                placeholder="Password"
                // rightIcon={showPwd ? <Eye size={17} /> : <EyeOff size={17} />}
                rightIcon={
                  showPwd ? (
                    <EyeIcon color={errors.pwd || authError ? '#E74C3C' : '#2f20b0'} />
                  ) : (
                    <EyeClose color={errors.pwd || authError ? '#E74C3C' : '#2f20b0'} />
                  )
                }
                onRightIconClick={() => setShowPwd((p) => !p)}
                bgColor="#ffffff"
                borderColor={errors.pwd || authError ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                // textColor="#1B3A6B"
                textColor={errors.pwd || authError ? '#E74C3C' : '#1B3A6B'}
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
                <BtnDark
                  type="submit"
                  loading={loading}
                  disabled={loading || signupLoading}
                  className="flex-1"
                >
                  Login
                </BtnDark>
                <BtnGreen
                  loading={signupLoading}
                  disabled={signupLoading || loading}
                  onClick={handleSignup}
                  className="flex-1"
                >
                  Signup
                </BtnGreen>
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

          <div className="mt-auto pt-5 text-slate font-bold text-xs flex">
            © Copyright {new Date().getFullYear()}. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
