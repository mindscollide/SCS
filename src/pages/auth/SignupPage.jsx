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

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { User, Globe, Mail, CheckCircle, XCircle, ChevronDown, Phone } from 'lucide-react'
import { BtnDark, BtnGreen } from '../../components/common'
import { toast } from 'react-toastify'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import Input from '../../components/common/Input/Input'
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

const ALPHA_SPECIAL = /^[A-Za-z0-9\s().'&]*$/

// Fallback roles if navigation state is missing
const FALLBACK_ROLES = [
  { roleName: 'Data Entry', roleID: 3 },
  { roleName: 'Manager', roleID: 2 },
  { roleName: 'View Only', roleID: 4 },
]

// Always guarantee View Only is present even if the API omits it
const VIEW_ONLY_ROLE = { roleName: 'View Only', roleID: 4 }

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

/* ─── Custom Phone Input ──────────────────────────────────────────────────── */
/**
 * Renders a country-code dropdown (from API countries) + a mobile number input.
 * Dropdown option format: countryCode  countryName  mobileCode
 *
 * Props:
 *   countries       — array of { pK_CountryID, countryName, countryCode, mobileCode }
 *   selectedCountry — currently selected country object
 *   onCountryChange — (countryObj) => void
 *   value           — mobile number string
 *   onChange        — (value: string) => void
 *   placeholder     — input placeholder
 *   maxLength       — input max length
 *   error           — boolean
 *   errorMessage    — string
 *   disabled        — boolean
 */
const ApiPhoneInput = ({
  countries = [],
  selectedCountry,
  onCountryChange,
  value,
  onChange,
  placeholder = 'Mobile Number *',
  maxLength = 11,
  error = false,
  errorMessage = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = countries.filter(
    (c) =>
      c.countryName?.toLowerCase().includes(search.toLowerCase()) ||
      c.countryCode?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobileCode?.includes(search)
  )

  const borderColor = error ? '#E74C3C' : '#dde4ee'
  const focusBorderColor = '#00B894'

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start',
        }}
      >
        {/* Country Selector */}
        <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) setOpen((p) => !p)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '44px',
              padding: '0 10px',
              background: '#ffffff',
              border: `1px solid ${error ? '#E74C3C' : '#dde4ee'}`,
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              color: '#334155',
              whiteSpace: 'nowrap',
              minWidth: '110px',
              opacity: disabled ? 0.6 : 1,
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = focusBorderColor)}
            onBlur={(e) => (e.currentTarget.style.borderColor = error ? '#E74C3C' : '#dde4ee')}
          >
            <span style={{ fontWeight: 500 }}>{selectedCountry?.countryCode ?? '—'}</span>
            <span
              style={{
                color: '#64748b',
                fontSize: '12px',
                maxWidth: '56px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedCountry?.mobileCode ?? ''}
            </span>
            <ChevronDown size={13} color="#64748b" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                left: 0,
                zIndex: 9999,
                background: '#ffffff',
                border: '1px solid #dde4ee',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                width: '280px',
                overflow: 'hidden',
              }}
            >
              {/* Search */}
              <div style={{ padding: '8px' }}>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid #dde4ee',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#334155',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Options list */}
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {filtered.length === 0 && (
                  <div style={{ padding: '12px 14px', fontSize: '13px', color: '#94a3b8' }}>
                    No results
                  </div>
                )}
                {filtered.map((c) => {
                  const isSelected = c.pK_CountryID === selectedCountry?.pK_CountryID
                  return (
                    <button
                      key={c.pK_CountryID}
                      type="button"
                      onClick={() => {
                        onCountryChange(c)
                        setOpen(false)
                        setSearch('')
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 14px',
                        background: isSelected ? '#f0fdf4' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        color: '#334155',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f8fafc'
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {/* countryCode */}
                      <span
                        style={{
                          fontWeight: 600,
                          color: '#334155',
                          minWidth: '32px',
                          fontSize: '12px',
                        }}
                      >
                        {c.countryCode}
                      </span>

                      {/* countryName */}
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#475569',
                        }}
                      >
                        {c.countryName}
                      </span>

                      {/* mobileCode */}
                      <span
                        style={{
                          color: '#00B894',
                          fontWeight: 500,
                          fontSize: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {c.mobileCode}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mobile number input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="tel"
            value={value}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, '')
              // if (v.length > 0 && !v.startsWith('0')) v = '0' + v
              // if (v.length === 0) v = ''
              onChange(v)
            }}
            onFocus={(e) => {
              if (!e.target.value) onChange()
              e.target.style.borderColor = focusBorderColor
            }}
            style={{
              width: '100%',
              height: '44px',
              padding: '0 40px 0 14px',
              background: '#ffffff',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              fontSize: '14px',
              color: '#334155',
              outline: 'none',
              boxSizing: 'border-box',
              opacity: disabled ? 0.6 : 1,
              transition: 'border-color 0.2s',
            }}
            onBlur={(e) => (e.target.style.borderColor = error ? '#E74C3C' : '#dde4ee')}
          />
          {/* Right icon */}
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Phone size={16} />
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && errorMessage && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: '#E74C3C',
          }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}

/* ─── Main Signup Page ────────────────────────────────────────────────────── */
const SignupPage = () => {
  const navigate = useNavigate()
  const { state } = useLocation()

  // Roles passed from LoginPage via GetAllUserRoles API
  const rawRoles = (state?.roles?.length > 0 ? state.roles : FALLBACK_ROLES).filter(
    (r) => r.roleName?.toLowerCase() !== 'admin'
  )
  // Always include View Only — add it if the API didn't return it
  const apiRoles = rawRoles.some((r) => r.roleID === 4)
    ? rawRoles
    : [...rawRoles, VIEW_ONLY_ROLE]

  // Countries from GetAllCountries API
  // Shape: { pK_CountryID, countryName, countryCode, mobileCode }
  const apiCountries = state?.countries || []

  const roleNames = apiRoles.map((r) => r.roleName)

  // Default to Pakistan; fall back to first country in list
  const defaultCountry = apiCountries.find((c) => c.countryCode === 'PK') ?? apiCountries[0] ?? null

  // ── Form state ──
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    org: '',
    email: '',
    mobile: '',
    // mobileCode prefix (e.g. "+92") — used to build MobileNumber
    dialCode: defaultCountry?.mobileCode ?? '+92',
    // pK_CountryID — sent as WorldCountryId in the signup body
    countryId: defaultCountry?.pK_CountryID ?? 1,
    role: roleNames[0] || 'Data Entry',
  })

  // Currently selected country object (drives the dropdown display)
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry)

  const [errors, setErrors] = useState({})

  // ── Email verification state ──
  const [emailStatus, setEmailStatus] = useState(EMAIL_STATUS.IDLE)

  const isVerifyingRef = useRef(false)
  const verifyResultRef = useRef(null)

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
    if (k === 'email') setEmailStatus(EMAIL_STATUS.IDLE)
  }

  // ── Country change handler ──
  const handleCountryChange = (country) => {
    setSelectedCountry(country)
    setForm((p) => ({
      ...p,
      dialCode: country.mobileCode, // prefix for MobileNumber string
      countryId: country.pK_CountryID, // sent as WorldCountryId
    }))
    if (errors.mobile) setErrors((p) => ({ ...p, mobile: '' }))
  }

  // ── Email field right icon ──
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

  const emailBorderColor = () => {
    if (errors.email) return '#ef4444'
    if (emailStatus === EMAIL_STATUS.VALID) return '#00897b'
    return '#e2e8f0'
  }

  // ── Shared email verify helper ──
  const runVerifyEmail = async () => {
    if (isVerifyingRef.current) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (!isVerifyingRef.current) {
            clearInterval(interval)
            resolve()
          }
        }, 50)
      })
      return verifyResultRef.current
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

  const handleEmailBlur = async () => {
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email)) return
    await runVerifyEmail()
  }

  // ── Client-side validation ──
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

  // ── Proceed ──
  const handleProceed = async () => {
    if (!validateFields()) return

    const alreadyValid = emailStatus === EMAIL_STATUS.VALID
    if (!alreadyValid) {
      const valid = await runVerifyEmail()
      if (!valid) return
    }

    setSignupLoading(true)

    const selectedRole = apiRoles.find((r) => r.roleName === form.role)
    const roleId = selectedRole?.roleID ?? 1

    const body = {
      FirstName: form.firstName.trim(),
      LastName: form.lastName.trim(),
      Email: form.email.trim(),
      UserRoleID: roleId,
      OrganizationName: form.org.trim(),
      // Full number: dialCode (mobileCode) + digits entered
      MobileNumber: `${form.dialCode}${form.mobile.trim()}`,
      // pK_CountryID of the selected country
      WorldCountryId: form.countryId,
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

      <div className="flex-1 lg:w-[35%] flex flex-col bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[360px] text-center">
            <AlHilalLogo variant="login" />

            <div className="w-full space-y-3">
              {/* First Name */}
              <Input
                value={form.firstName}
                onChange={(v) => set('firstName', v)}
                placeholder="First Name *"
                maxLength={50}
                regex={/^$|^[A-Za-z]+(?:\s?[A-Za-z]*)*$/}
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
                regex={/^$|^[A-Za-z]+(?:\s?[A-Za-z]*)*$/}
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
                regex={ALPHA_SPECIAL}
                errorMessage={errors.org}
                rightIcon={<Globe size={17} />}
                bgColor="#ffffff"
                borderColor={errors.org ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                textColor="#334155"
                disabled={signupLoading}
              />

              {/* Email */}
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

              {/* Phone — custom API-driven country selector */}
              <ApiPhoneInput
                countries={apiCountries}
                selectedCountry={selectedCountry}
                onCountryChange={handleCountryChange}
                value={form.mobile}
                onChange={(v) => set('mobile', v)}
                placeholder="Mobile Number *"
                maxLength={11}
                error={!!errors.mobile}
                errorMessage={errors.mobile}
                disabled={signupLoading}
              />

              {/* Role */}
              <SearchableSelect
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
