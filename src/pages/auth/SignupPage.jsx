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

import React, { useState, useRef } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { User, Globe, Mail, CheckCircle, XCircle } from 'lucide-react'
import { BtnDark, BtnGreen } from '../../components/common'
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

  // Ref so blur and Proceed can share one in-flight verify call instead of racing
  const isVerifyingRef = useRef(false)
  const verifyResultRef = useRef(null) // stores the last verify outcome

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

  // ── Shared verify helper — used by both blur and Proceed ──────────────────
  // Returns true if email is available, false otherwise.
  // Uses a ref so two concurrent callers (blur + Proceed click) share one request.
  const runVerifyEmail = async () => {
    // Another caller already kicked off a request — wait for it to finish
    if (isVerifyingRef.current) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!isVerifyingRef.current) {
            clearInterval(interval)
            resolve()
          }
        }, 50)
      })
      return verifyResultRef.current // reuse the result
    }

    isVerifyingRef.current = true
    verifyResultRef.current = null

    setEmailStatus(EMAIL_STATUS.CHECKING)
    setErrors((p) => ({ ...p, email: '' }))

    const result = await verifyUserEmail(form.email, { skipLoader: true })
    let valid = false

    if (result.success) {
      const code = result.data?.responseResult?.responseMessage
      const info = VERIFY_EMAIL_CODES[code]

      if (info?.valid) {
        setEmailStatus(EMAIL_STATUS.VALID)
        valid = true
      } else {
        const isExists = code === 'ERMAuth_AuthServiceManager_VerifyUserEmail_03'
        setEmailStatus(isExists ? EMAIL_STATUS.EXISTS : EMAIL_STATUS.ERROR)
        setErrors((p) => ({ ...p, email: info?.msg || 'Email verification failed.' }))
      }
    } else {
      setEmailStatus(EMAIL_STATUS.ERROR)
      setErrors((p) => ({
        ...p,
        email: result.message || 'Could not verify email. Please try again.',
      }))
    }

    verifyResultRef.current = valid
    isVerifyingRef.current = false
    return valid
  }

  // ── Verify email on blur — small input spinner, no global loader ──
  const handleEmailBlur = async () => {
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email)) return
    await runVerifyEmail()
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
      e.email = 'Invalid Email'
    }
    if (!form.mobile.trim()) e.mobile = 'Mobile number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Proceed: verify email (if needed) then call signup in one click ──
  const handleProceed = async () => {
    // Step 1 — validate required fields & format
    if (!validateFields()) return

    // Step 2 — verify email if not already confirmed valid
    const alreadyValid = emailStatus === EMAIL_STATUS.VALID
    if (!alreadyValid) {
      const valid = await runVerifyEmail()
      if (!valid) return // email unavailable or error — stop here
    }

    // Step 3 — email confirmed valid → call signup API (global loader fires here)
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
        if (code !== 'ERMAuth_AuthServiceManager_RequestToSignUp_04') {
          showError(msg)
        }
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
    <div className="flex min-h-screen font-sans">
      <AuthLeftPanel />

      {/* Right panel — matches LoginPage structure */}
      <div className="flex-1 lg:w-[35%] flex flex-col bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[360px] text-center">
            <AlHilalLogo variant="login" />

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
                borderColor={errors.firstName ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
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
                borderColor={errors.lastName ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
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
                borderColor={errors.org ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
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
                focusBorderColor="#00B894"
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
                maxLength={10}
                error={!!errors.mobile}
                errorMessage={errors.mobile}
                disabled={signupLoading}
              />

              {/* Role */}
              <Select
                value={form.role}
                onChange={(v) => set('role', v)}
                options={roleNames}
                showPlaceholder={false}
                bgColor="#ffffff"
                borderColor="#dde4ee"
                focusBorderColor="#00B894"
                textColor="#334155"
                disabled={signupLoading}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-5">
              <BtnGreen
                disabled={signupLoading}
                onClick={() => navigate('/login')}
                className="flex-1"
              >
                Back
              </BtnGreen>
              <BtnDark
                loading={signupLoading}
                disabled={
                  signupLoading ||
                  !form.firstName ||
                  !form.lastName ||
                  !form.org ||
                  !form.email ||
                  !form.mobile
                }
                onClick={handleProceed}
                className="flex-1"
              >
                Proceed
              </BtnDark>
            </div>
          </div>
          <div className="mt-auto pt-5 text-slate font-bold text-xs flex">
            © Copyright {new Date().getFullYear()}. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
