/**
 * src/pages/auth/LoginPage.jsx
 * ==============================
 * Login page — email + password form with Remember Me functionality.
 *
 * @description
 * Public route at /login. Authenticates against DEMO_USERS (mock).
 * Remember Me saves credentials to localStorage and auto-fills on next visit.
 * On success, calls useAuth().login() and navigates to the role's dashboard.
 *
 * Notes:
 *  - Replace DEMO_USERS/DEMO_PWD with real API call on backend integration
 *  - Role-based redirect map: admin → /scs/admin/users, manager → /scs/manager/..., data-entry → /scs/data-entry/...
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Eye, EyeOff } from 'lucide-react'
import Input from '../../components/common/Input/Input'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import AlHilalLogo from '../../components/common/auth/AlHilalLogo'
import AuthLeftPanel from '../../components/common/auth/AuthLeftPanel'
import { toast } from 'react-toastify'
import { getAllUserRoles, GET_ALL_USER_ROLES_CODES } from '../../services/auth.service'

const DEMO_USERS = {
  'admin@scs.com': {
    role: 'admin',
    fullName: 'James Smith',
    email: 'admin@scs.com',
  },
  'manager@scs.com': {
    role: 'manager',
    fullName: 'Sara Ahmed',
    email: 'manager@scs.com',
  },
  'data@scs.com': {
    role: 'data-entry',
    fullName: 'Bilal Khan',
    email: 'data@scs.com',
  },
}
const DEMO_PWD = 'Admin@123'
const ROLE_PATH = {
  admin: '/scs/admin/users',
  manager: '/scs/manager/pending-approvals',
  'data-entry': '/scs/data-entry/financial-data',
}

// Key used to store/read credentials in localStorage
const STORAGE_KEY = 'scs_remember'

/* ── Login Page ──────────────────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate()

  // On first render, read any saved credentials from localStorage
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch {
      return {}
    }
  })()

  // Pre-fill fields if credentials were saved previously
  const [userId, setUserId] = useState(saved.userId || '')
  const [pwd, setPwd] = useState(saved.pwd || '')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(!!saved.userId) // check the box if already saved
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    if (!userId || !pwd) {
      setError('Please enter User ID and Password.')
      return
    }
    setLoading(true)
    setTimeout(() => {
      const user = DEMO_USERS[userId.toLowerCase()]
      if (user && pwd === DEMO_PWD) {
        // Save or clear credentials depending on Remember Me checkbox
        if (remember) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, pwd }))
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
        sessionStorage.setItem('auth_token', 'mock_' + Date.now())
        sessionStorage.setItem('user_profile_data', JSON.stringify(user))
        sessionStorage.setItem('user_role', user.role)
        navigate(ROLE_PATH[user.role])
      } else {
        setError('Invalid User ID or Password.')
        setLoading(false)
      }
    }, 600)
  }

  const handleSignup = async () => {
    setSignupLoading(true)
    const result = await getAllUserRoles()
    setSignupLoading(false)

    const code = result.data?.responseResult?.responseMessage
    const roles = result.data?.responseResult?.userRoles

    if (
      result.success &&
      code === 'Admin_AdminServiceManager_GetAllUserRoles_02' &&
      roles?.length > 0
    ) {
      navigate('/signup', { state: { roles } })
    } else {
      const msg =
        GET_ALL_USER_ROLES_CODES[code] ||
        result.message ||
        'Unable to load roles. Please try again.'
      toast.error(msg, {
        style: { backgroundColor: '#E74C3C', color: '#ffffff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
    }
  }

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
              {/* Error */}
              {error && <p className="text-[12px] font-medium text-[#E74C3C]">{error}</p>}

              {/* User ID */}
              <Input
                type="text"
                value={userId}
                onChange={(v) => {
                  setUserId(v)
                  setError('')
                }}
                placeholder="User ID"
                error={!!error}
                rightIcon={<User size={17} />}
                bgColor="#ffffff"
                borderColor={error ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                textColor="#1B3A6B"
              />

              {/* Password */}
              <Input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(v) => {
                  setPwd(v)
                  setError('')
                }}
                placeholder="Password"
                error={!!error}
                rightIcon={showPwd ? <Eye size={17} /> : <EyeOff size={17} />}
                onRightIconClick={() => setShowPwd((p) => !p)}
                bgColor="#ffffff"
                borderColor={error ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                textColor="#1B3A6B"
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

              {/* Login + Signup */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-[10px] rounded-[10px] text-[14px] font-semibold
                             text-white bg-[#1B3A6B] hover:bg-[#132e57]
                             disabled:opacity-60 transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Login'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSignup}
                  disabled={signupLoading}
                  className="flex-1 py-[10px] rounded-[10px] text-[14px] font-semibold
                             text-white bg-[#00B894] hover:bg-[#00a07e]
                             disabled:opacity-60 transition-colors flex items-center justify-center"
                >
                  {signupLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Signup'
                  )}
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
