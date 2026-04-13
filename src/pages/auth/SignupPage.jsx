/**
 * src/pages/auth/SignupPage.jsx
 * ==============================
 * Signup request page.
 *
 * Flow:
 *  1. Only accessible via Signup button on LoginPage (roles passed via nav state).
 *     Direct URL access → redirect to /login.
 *  2. On email field blur → calls VerifyUserEmail API to check availability.
 *  3. On Proceed → validates form + calls RequestToSignUp API.
 *  4. On success (_06) → shows SuccessScreen.
 *
 * Email verification statuses:
 *  idle      — not yet verified
 *  checking  — API call in-flight (spinner shown)
 *  valid     — available (green tick shown)
 *  exists    — already registered (red X + inline error)
 *  error     — API/network error (red X + inline error)
 */

import React, { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { User, Globe, Mail, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import Select from '../../components/common/select/Select'
import Input from '../../components/common/Input/Input'
import PhoneInput from '../../components/common/phoneInput/PhoneInput'
import AlHilalLogo from '../../components/common/auth/AlHilalLogo'
import AuthLeftPanel from '../../components/common/auth/AuthLeftPanel'
import AuthSuccessScreen from '../../components/common/auth/AuthSuccessScreen'
import { EMAIL_REGEX } from '../../utils/helpers'
import {
  verifyUserEmail,
  signupApi,
  VERIFY_EMAIL_CODES,
  SIGNUP_CODES,
} from '../../services/auth.service'

// Fallback roles if navigation state is missing
const FALLBACK_ROLES = [
  { roleName: 'Data Entry', roleID: 3 },
  { roleName: 'Manager', roleID: 2 },
]

// Email verification status enum
const EMAIL_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  VALID: 'valid',
  EXISTS: 'exists',
  ERROR: 'error',
}

// Toast error shorthand
const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#ffffff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

/* ─── Main Signup Page ────────────────────────────────────────────────────── */
const SignupPage = () => {
  const navigate = useNavigate()
  const { state } = useLocation()

  // Roles passed from LoginPage via GetAllUserRoles API
  const apiRoles = (state?.roles?.length > 0 ? state.roles : FALLBACK_ROLES).filter(
    (r) => r.roleName?.toLowerCase() !== 'admin'
  )
  const roleNames = apiRoles.map((r) => r.roleName)

  // ── Form state ──
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    org: '',
    email: '',
    mobile: '',
    dialCode: '+92',
    role: roleNames[0] || 'Data Entry',
  })
  const [errors, setErrors] = useState({})

  // ── Email verification state ──
  const [emailStatus, setEmailStatus] = useState(EMAIL_STATUS.IDLE)

  // ── Signup loading ──
  const [signupLoading, setSignupLoading] = useState(false)

  // ── Submitted (show success screen) ──
  const [submitted, setSubmitted] = useState(false)

  // ── Block direct URL access ──
  if (!state?.roles) return <Navigate to="/login" replace />

  // ── Show success screen ──
  if (submitted)
    return (
      <AuthSuccessScreen
        heading="Sign-up Request Submitted"
        message="Your application is now under review. You will receive an email notification when your application is reviewed."
        btnText="Login"
        btnTo="/login"
      />
    )

  // ── Helpers ──
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
    // Reset email verification if email field changes
    if (k === 'email') setEmailStatus(EMAIL_STATUS.IDLE)
  }

  // ── Email field right icon based on verification status ──
  const emailIcon = () => {
    switch (emailStatus) {
      case EMAIL_STATUS.CHECKING:
        return (
          <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
        )
      case EMAIL_STATUS.VALID:
        return <CheckCircle size={17} color="#00897b" />
      case EMAIL_STATUS.EXISTS:
      case EMAIL_STATUS.ERROR:
        return <XCircle size={17} color="#ef4444" />
      default:
        return <Mail size={17} />
    }
  }

  // ── Email border color based on verification status ──
  const emailBorderColor = () => {
    if (errors.email) return '#ef4444'
    if (emailStatus === EMAIL_STATUS.VALID) return '#00897b'
    return '#e2e8f0'
  }

  // ── Verify email on blur ──
  const handleEmailBlur = async () => {
    // Skip if empty or invalid format — let client validation handle it
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email)) return

    setEmailStatus(EMAIL_STATUS.CHECKING)
    setErrors((p) => ({ ...p, email: '' }))

    const result = await verifyUserEmail(form.email)

    if (result.success) {
      const code = result.data?.responseResult?.responseMessage
      const info = VERIFY_EMAIL_CODES[code]

      if (info?.valid) {
        setEmailStatus(EMAIL_STATUS.VALID)
      } else {
        const isExists = code === 'ERMAuth_AuthServiceManager_VerifyUserEmail_03'
        setEmailStatus(isExists ? EMAIL_STATUS.EXISTS : EMAIL_STATUS.ERROR)
        setErrors((p) => ({
          ...p,
          email: info?.msg || 'Email verification failed.',
        }))
      }
    } else {
      // Network / server error
      setEmailStatus(EMAIL_STATUS.ERROR)
      setErrors((p) => ({
        ...p,
        email: result.message || 'Could not verify email. Please try again.',
      }))
    }
  }

  // ── Step 1: Client-side field validation (no email status check here) ──
  const validateFields = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'First Name is required'
    if (!form.lastName.trim()) e.lastName = 'Last Name is required'
    if (!form.org.trim()) e.org = 'Organization is required'
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!EMAIL_REGEX.test(form.email)) {
      e.email = 'Invalid email address'
    }
    if (!form.mobile.trim()) e.mobile = 'Mobile number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Step 2: Auto verify email if not yet verified, then signup ──
  const handleProceed = async () => {
    // Step 1 — validate required fields & format
    if (!validateFields()) return

    // Step 2 — if email not verified yet, verify it first
    if (emailStatus !== EMAIL_STATUS.VALID) {
      setEmailStatus(EMAIL_STATUS.CHECKING)
      setErrors((p) => ({ ...p, email: '' }))

      const verifyResult = await verifyUserEmail(form.email)

      if (verifyResult.success) {
        const code = verifyResult.data?.responseResult?.responseMessage
        const info = VERIFY_EMAIL_CODES[code]

        if (!info?.valid) {
          const isExists = code === 'ERMAuth_AuthServiceManager_VerifyUserEmail_03'
          setEmailStatus(isExists ? EMAIL_STATUS.EXISTS : EMAIL_STATUS.ERROR)
          setErrors((p) => ({ ...p, email: info?.msg || 'Email verification failed.' }))
          return // stop — email invalid
        }
        setEmailStatus(EMAIL_STATUS.VALID)
      } else {
        setEmailStatus(EMAIL_STATUS.ERROR)
        setErrors((p) => ({
          ...p,
          email: verifyResult.message || 'Could not verify email. Please try again.',
        }))
        return // stop — network error
      }
    }

    // Step 3 — call signup API
    setSignupLoading(true)

    const selectedRole = apiRoles.find((r) => r.roleName === form.role)
    const roleId = selectedRole?.roleID ?? 1

    const body = {
      FirstName: form.firstName.trim(),
      LastName: form.lastName.trim(),
      Email: form.email.trim(),
      UserRoleID: roleId,
      OrganizationName: form.org.trim(),
      MobileNumber: `${form.dialCode}${form.mobile.trim()}`,
      WorldCountryId: 1,
    }

    const result = await signupApi(body)
    setSignupLoading(false)

    if (result.success) {
      const code = result.data?.responseResult?.responseMessage

      if (code === 'ERMAuth_AuthServiceManager_RequestToSignUp_06') {
        setSubmitted(true)
      } else {
        const msg = SIGNUP_CODES[code] || 'Signup failed. Please try again.'
        showError(msg)
        if (code === 'ERMAuth_AuthServiceManager_RequestToSignUp_01') {
          setErrors((p) => ({ ...p, email: 'Email is required.' }))
        } else if (code === 'ERMAuth_AuthServiceManager_RequestToSignUp_02') {
          setEmailStatus(EMAIL_STATUS.EXISTS)
          setErrors((p) => ({ ...p, email: 'This email is already registered.' }))
        } else if (code === 'ERMAuth_AuthServiceManager_RequestToSignUp_04') {
          setErrors((p) => ({ ...p, mobile: 'This mobile number is already registered.' }))
        }
      }
    } else {
      showError(result.message || 'Signup failed. Please try again.')
    }
  }

  // ── Render ──
  return (
    <div className="flex min-h-screen">
      <AuthLeftPanel />

      {/* Right panel */}
      <div className="w-full lg:w-[440px] bg-[#f0f2f5] flex flex-col items-center justify-between px-10 py-8 min-h-screen">
        <AlHilalLogo />

        {/* Fields */}
        <div className="w-full space-y-3">
          {/* First Name */}
          <Input
            value={form.firstName}
            onChange={(v) => set('firstName', v)}
            placeholder="First Name *"
            maxLength={50}
            regex={/^[a-zA-Z\s]*$/}
            error={!!errors.firstName}
            errorMessage={errors.firstName}
            rightIcon={<User size={17} />}
            bgColor="#ffffff"
            borderColor={errors.firstName ? '#ef4444' : '#e2e8f0'}
            textColor="#334155"
            disabled={signupLoading}
          />

          {/* Last Name */}
          <Input
            value={form.lastName}
            onChange={(v) => set('lastName', v)}
            placeholder="Last Name *"
            maxLength={50}
            regex={/^[a-zA-Z\s]*$/}
            error={!!errors.lastName}
            errorMessage={errors.lastName}
            rightIcon={<User size={17} />}
            bgColor="#ffffff"
            borderColor={errors.lastName ? '#ef4444' : '#e2e8f0'}
            textColor="#334155"
            disabled={signupLoading}
          />

          {/* Organization Name */}
          <Input
            value={form.org}
            onChange={(v) => set('org', v)}
            placeholder="Organization Name *"
            maxLength={100}
            error={!!errors.org}
            errorMessage={errors.org}
            rightIcon={<Globe size={17} />}
            bgColor="#ffffff"
            borderColor={errors.org ? '#ef4444' : '#e2e8f0'}
            textColor="#334155"
            disabled={signupLoading}
          />

          {/* Email — with real-time verification on blur */}
          <Input
            type="email"
            value={form.email}
            onChange={(v) => set('email', v)}
            onBlur={handleEmailBlur}
            placeholder="Email Address *"
            maxLength={100}
            regex={/^[^\s]*$/}
            error={!!errors.email}
            errorMessage={errors.email}
            rightIcon={emailIcon()}
            bgColor="#ffffff"
            borderColor={emailBorderColor()}
            textColor="#334155"
            disabled={signupLoading}
          />

          {/* Mobile */}
          <PhoneInput
            value={form.mobile}
            onChange={(v) => set('mobile', v)}
            onCountryChange={(c) => setForm((p) => ({ ...p, dialCode: c.dialCode }))}
            defaultCountry="PK"
            placeholder="Mobile Number *"
            maxLength={12}
            error={!!errors.mobile}
            errorMessage={errors.mobile}
            disabled={signupLoading}
          />

          {/* Role */}
          <Select
            value={form.role}
            onChange={(v) => set('role', v)}
            options={roleNames}
            bgColor="#ffffff"
            borderColor="#e2e8f0"
            focusBorderColor="#1565c0"
            textColor="#334155"
            disabled={signupLoading}
          />
        </div>

        {/* Action buttons + footer */}
        <div className="w-full">
          <div className="flex gap-3 mb-5">
            {/* Back */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              disabled={signupLoading}
              className="flex-1 py-3.5 rounded-xl text-white font-bold text-[15px]
                         hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#F5A623' }}
            >
              Back
            </button>

            {/* Proceed */}
            <button
              type="button"
              onClick={handleProceed}
              disabled={signupLoading || emailStatus === EMAIL_STATUS.CHECKING}
              className="flex-1 py-[10px] rounded-[10px] text-[14px] font-semibold
                         text-white hover:opacity-90 transition-opacity
                         disabled:opacity-60 flex items-center justify-center"
              style={{ backgroundColor: '#1B3A6B' }}
            >
              {signupLoading || emailStatus === EMAIL_STATUS.CHECKING ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Proceed'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
