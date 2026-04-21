/**
 * src/pages/auth/CreatePasswordPage.jsx
 * =======================================
 * Create Password page — newly approved user sets their password for the
 * first time using the link sent in the approval email.
 *
 * URL format (comma-separated, NOT standard & params):
 *   /create-password?usermail=john.doe@scs.com,data=<AES-encrypted>
 *
 * Parsing:
 *   Raw search string is read directly from useLocation() — NOT through
 *   URLSearchParams — so '+' characters in the Base64 data are preserved.
 *   The string is split at the FIRST comma to separate the two key=value pairs.
 *
 * Access control:
 *   If ?data= is missing (direct navigation, browser forward, etc.) the
 *   InvalidLinkScreen is shown — the form is never reachable without the link.
 *
 * Flow:
 *  1. Parse usermail → shown in disabled email field
 *  2. Parse data     → EncryptedData sent to createPasswordApi
 *  3. User enters NewPassword + ConfirmPassword with live policy validation
 *  4. On success → replace history entry (strips URL, blocks back/forward) → success screen
 */

import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { User } from 'lucide-react'
import { toast } from 'react-toastify'
import AuthLeftPanel     from '../../components/common/auth/AuthLeftPanel'
import AlHilalLogo       from '../../components/common/auth/AlHilalLogo'
import AuthSuccessScreen from '../../components/common/auth/AuthSuccessScreen'
import PasswordInput     from '../../components/common/Input/PasswordInput'
import Input             from '../../components/common/Input/Input'
import { createPasswordApi, CREATE_PASSWORD_CODES } from '../../services/auth.service'

// ─── Password policy rules ────────────────────────────────────────────────────
const POLICY = [
  { label: 'No Space 8-20',     test: (p) => p.length >= 8 && p.length <= 20 && !/\s/.test(p) },
  { label: 'Capital Letter',    test: (p) => /[A-Z]/.test(p) },
  { label: 'Numeric',           test: (p) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
]

// ─── URL parser ───────────────────────────────────────────────────────────────
/**
 * Parses the non-standard comma-separated query string:
 *   ?usermail=john@example.com,data=<base64>
 *
 * We intentionally read the RAW location.search string (not URLSearchParams)
 * so that '+' characters in the Base64 data are preserved as '+' and are not
 * mistakenly decoded as spaces.
 *
 * Returns { email, encryptedData } — both empty string if not found.
 */
const parseCreateLink = (search) => {
  // Strip leading '?'
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return { email: '', encryptedData: '' }

  // Split at the FIRST comma only — everything before is usermail=...,
  // everything after is data=...
  const commaIdx = raw.indexOf(',')
  if (commaIdx === -1) return { email: '', encryptedData: '' }

  const part1 = raw.slice(0, commaIdx)          // "usermail=john@scs.com"
  const part2 = raw.slice(commaIdx + 1)          // "data=z1KnENky..."

  const email = part1.startsWith('usermail=')
    ? decodeURIComponent(part1.slice('usermail='.length))
    : ''

  const encryptedData = part2.startsWith('data=')
    ? part2.slice('data='.length)
    : ''

  return { email, encryptedData }
}

// ─── Success screen decorations ───────────────────────────────────────────────
const PadlockIcon = () => (
  <div className="flex justify-center mb-3">
    <svg width="68" height="72" viewBox="0 0 68 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 30 L18 18 C18 9 50 9 50 18 L50 30"
        stroke="#1B3A6B" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="8" y="30" width="52" height="38" rx="6" fill="#1B3A6B" />
      <circle cx="34" cy="47" r="6" fill="white" />
      <rect x="31" y="50" width="6" height="9" rx="2" fill="white" />
    </svg>
  </div>
)

const TealStars = () => (
  <div className="flex justify-center gap-3 mb-4">
    {[0, 1, 2, 3].map((i) => (
      <span key={i} className="text-[#00B894] text-[22px]">✦</span>
    ))}
  </div>
)

// ─── Invalid / missing link screen ────────────────────────────────────────────
// Shown when the user navigates directly to /create-password without the link,
// presses browser forward after success, or the link is malformed.
const InvalidLinkScreen = () => (
  <div className="flex min-h-screen font-sans">
    <AuthLeftPanel variant="login" />
    <div className="flex-1 lg:w-[35%] flex flex-col bg-[#f0f4f8]">
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
        <div className="w-full max-w-[320px] text-center">
          <AlHilalLogo variant="login" />
          <div className="flex justify-center mb-5">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="36" cy="36" r="32" stroke="#E74C3C" strokeWidth="3.5" fill="#fff5f5" />
              <path d="M26 46 L46 26" stroke="#E74C3C" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M22 32 L18 28 C15 25 15 20 18 17 L20 15 C23 12 28 12 31 15 L35 19"
                stroke="#E74C3C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M37 53 L41 57 C44 60 49 60 52 57 L54 55 C57 52 57 47 54 44 L50 40"
                stroke="#E74C3C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#1B3A6B] mb-3">Invalid Link</h2>
          <p className="text-[14px] text-[#4a5568] leading-relaxed mb-6">
            This invitation link is missing or invalid.
            Please contact your administrator.
          </p>
          <a
            href="/login"
            className="inline-block w-full py-[10px] rounded-[10px] text-[14px]
                       font-semibold text-white bg-[#1B3A6B] hover:bg-[#132e57]
                       transition-colors text-center"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────
const CreatePasswordPage = () => {
  const { search } = useLocation()
  const navigate   = useNavigate()

  // Parse usermail and data from the comma-separated URL format.
  // Memoised so the parse only runs when the URL changes.
  const { email, encryptedData } = useMemo(() => parseCreateLink(search), [search])

  const [newPwd,  setNewPwd]  = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  // ── Policy evaluation ─────────────────────────────────────────────────────
  const results = POLICY.map((r) => ({ ...r, ok: newPwd.length > 0 && r.test(newPwd) }))
  const allPass = results.every((r) => r.ok)
  const matches = newPwd.length > 0 && newPwd === confirm

  const showError = (msg) =>
    toast.error(msg, {
      style:         { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })

  // ── API call ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (loading) return

    if (!newPwd.trim())  { showError('Please enter a new password.'); return }
    if (!allPass)        { showError('Password does not meet all requirements.'); return }
    if (!confirm.trim()) { showError('Please confirm your password.'); return }
    if (!matches)        { showError('Passwords do not match.'); return }

    setLoading(true)
    const result = await createPasswordApi({
      EncryptedData:   encryptedData,
      NewPassword:     newPwd,
      ConfirmPassword: confirm,          // field name per API spec
    })
    setLoading(false)

    const code = result.data?.responseResult?.responseMessage

    if (code === 'ERM_Auth_AuthServiceManager_CreatePassword_01') {
      // Replace history entry — strips URL params + prevents back/forward returning to form
      navigate('/create-password', { replace: true })
      setDone(true)
      return
    }

    showError(CREATE_PASSWORD_CODES[code] || result.message || 'Something went wrong, please try again.')
  }

  // ── Guards — done MUST come before !encryptedData ─────────────────────────
  // After navigate('/create-password', { replace: true }) clears the search
  // string, encryptedData becomes '' on the next render. Checking done first
  // ensures the success screen renders instead of InvalidLinkScreen.
  if (done)
    return (
      <AuthSuccessScreen
        variant="login"
        heading="Password Created!"
        message="Your account password has been created successfully. Use it to log in."
        btnText="Login"
        btnTo="/login"
        icon={<PadlockIcon />}
        extras={<TealStars />}
      />
    )

  // No valid encrypted data → user arrived without the email link
  if (!encryptedData) return <InvalidLinkScreen />

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen font-sans">
      <AuthLeftPanel variant="login" />

      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px]">
            <AlHilalLogo variant="login" />

            <h2 className="text-[18px] font-bold text-[#1B3A6B] text-center mb-5">
              Create your Password
            </h2>

            {/* Email — disabled read-only, pre-filled from ?usermail= */}
            <div className="mb-4">
              <Input
                type="email"
                value={email}
                onChange={() => {}}
                disabled
                placeholder="Email Address"
                rightIcon={<User size={17} />}
                bgColor="#e8edf5"
                borderColor="#dde4ee"
                focusBorderColor="#dde4ee"
                textColor="#4a5568"
              />
            </div>

            {/* New password */}
            <PasswordInput value={newPwd} onChange={setNewPwd} placeholder="New password" />

            {/* Policy indicator bars */}
            <div className="flex gap-1 mt-2 mb-5">
              {results.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-[3px]">
                  <div
                    className={`h-[3px] w-full rounded-full transition-colors duration-200
                                ${r.ok ? 'bg-[#00B894]' : 'bg-[#d1dae6]'}`}
                  />
                  <span
                    className={`text-[10px] font-medium text-center leading-tight
                                transition-colors duration-200
                                ${r.ok ? 'text-[#00B894]' : 'text-[#a0aec0]'}`}
                  >
                    {r.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Confirm password */}
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="Re-enter Password" />

            {/* Match hint */}
            <p
              className={`text-[11px] text-center mt-1.5 mb-5 transition-colors duration-200
                          ${matches ? 'text-[#00B894]' : 'text-[#a0aec0]'}`}
            >
              {confirm.length > 0 && !matches ? 'Passwords do not match' : 'Match the password'}
            </p>

            {/* Create Password button */}
            <button
              onClick={handleCreate}
              disabled={loading}
              className={`w-full py-[11px] rounded-[10px] text-[14px] font-semibold
                          text-white transition-colors flex items-center justify-center
                          ${loading
                            ? 'bg-[#1B3A6B] opacity-60 cursor-not-allowed'
                            : 'bg-[#1B3A6B] hover:bg-[#132e57] cursor-pointer'
                          }`}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Create Password'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatePasswordPage
