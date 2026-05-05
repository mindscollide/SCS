/**
 * src/pages/auth/ResetPasswordPage.jsx
 * ======================================
 * Reset password page — called from the email reset link:
 *   /reset-password?data=<AES-encrypted string>
 *
 * Flow:
 *  1. Extract EncryptedData from ?data= query param
 *     (URLSearchParams decodes '+' as space — we restore '+' for Base64 integrity)
 *  2. User enters NewPassword + ConfirmNewPassword with live policy validation
 *  3. On submit → calls resetPasswordApi → handles all response codes
 *  4. On success → shows "Password Changed!" screen
 *
 * Invalid link (no ?data= param) → shows a standalone error screen.
 *
 * Screen 1 — Empty:   inputs + grey policy labels + grey "Match the password"
 * Screen 2 — Typing:  thin coloured bar above each label turns teal as rules pass
 * Screen 3 — Success: navy padlock icon + 4 teal stars + "Password Changed!" + Login btn
 */

import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLeftPanel from '../../components/common/auth/AuthLeftPanel'
import AlHilalLogo from '../../components/common/auth/AlHilalLogo'
import AuthSuccessScreen from '../../components/common/auth/AuthSuccessScreen'
import PasswordInput from '../../components/common/Input/PasswordInput'
import { resetPasswordApi, RESET_PASSWORD_CODES } from '../../services/auth.service'
import { BtnDark } from '../../components/common'

// ─── Password policy rules ────────────────────────────────────────────────────
const POLICY = [
  {
    label: 'No Space 8-20',
    test: (p) => p.length >= 8 && p.length <= 20 && !/\s/.test(p),
  },
  { label: 'Capital Letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Numeric', test: (p) => /[0-9]/.test(p) },
  {
    label: 'Special character',
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
  },
]

// ─── Padlock icon — passed to AuthSuccessScreen ───────────────────────────────
const PadlockIcon = () => (
  <div className="flex justify-center mb-3">
    <svg width="68" height="72" viewBox="0 0 68 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shackle arc */}
      <path
        d="M18 30 L18 18 C18 9 50 9 50 18 L50 30"
        stroke="#2f20b0"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lock body */}
      <rect x="8" y="30" width="52" height="38" rx="6" fill="#2f20b0" />
      {/* Keyhole circle */}
      <circle cx="34" cy="47" r="6" fill="white" />
      {/* Keyhole stem */}
      <rect x="31" y="50" width="6" height="9" rx="2" fill="white" />
    </svg>
  </div>
)

// ─── Teal stars — passed to AuthSuccessScreen ─────────────────────────────────
const TealStars = () => (
  <div className="flex justify-center gap-3 mb-4">
    {[0, 1, 2, 3].map((i) => (
      <span key={i} className="text-[#00B894] text-[22px]">
        ✦
      </span>
    ))}
  </div>
)

// ─── Invalid link screen ──────────────────────────────────────────────────────
const InvalidLinkScreen = () => (
  <div className="flex min-h-screen font-sans">
    <AuthLeftPanel variant="login" />
    <div className="flex-1 lg:w-[35%] flex flex-col bg-[#f0f4f8]">
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
        <div className="w-full max-w-[360px] text-center">
          <AlHilalLogo variant="login" />

          {/* Broken link icon */}
          <div className="flex justify-center mb-5">
            <svg
              width="72"
              height="72"
              viewBox="0 0 72 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="36" cy="36" r="32" stroke="#E74C3C" strokeWidth="3.5" fill="#fff5f5" />
              <path d="M26 46 L46 26" stroke="#E74C3C" strokeWidth="3.5" strokeLinecap="round" />
              <path
                d="M22 32 L18 28 C15 25 15 20 18 17 L20 15 C23 12 28 12 31 15 L35 19"
                stroke="#E74C3C"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M37 53 L41 57 C44 60 49 60 52 57 L54 55 C57 52 57 47 54 44 L50 40"
                stroke="#E74C3C"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          <h2 className="text-[20px] font-bold text-[#2f20b0] mb-3">Invalid Reset Link</h2>
          <p className="text-[14px] text-[#4a5568] leading-relaxed mb-6">
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <a
            href="/forgot-password"
            className="inline-block w-full py-[10px] rounded-[10px] text-[14px]
                       font-semibold text-white bg-[#2f20b0] hover:bg-[#251a94]
                       transition-colors text-center"
          >
            Request New Link
          </a>
        </div>
        <div className="mt-auto pt-5 text-slate font-bold text-xs flex">
          © Copyright {new Date().getFullYear()}. All Rights Reserved.
        </div>
      </div>
    </div>
  </div>
)

// ─── Main page ────────────────────────────────────────────────────────────────
const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // URLSearchParams decodes '+' as space in query strings.
  // Base64 uses '+' as a valid character — restore it so the server receives
  // the exact encrypted string from the reset link.
  const encryptedData = (searchParams.get('data') || '').replace(/ /g, '+')

  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // ── Policy evaluation ─────────────────────────────────────────────────────
  const results = POLICY.map((r) => ({ ...r, ok: newPwd.length > 0 && r.test(newPwd) }))
  const allPass = results.every((r) => r.ok)
  const matches = newPwd.length > 0 && newPwd === confirm

  const showError = (msg) =>
    toast.error(msg, {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })

  // ── API call ──────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (loading) return

    // Client-side validation — show feedback instead of silently blocking
    if (!newPwd.trim()) {
      showError('Please enter a new password.')
      return
    }
    if (!allPass) {
      showError('Password does not meet all requirements.')
      return
    }
    if (!confirm.trim()) {
      showError('Please confirm your password.')
      return
    }
    if (!matches) {
      showError('Passwords do not match.')
      return
    }

    setLoading(true)
    const result = await resetPasswordApi({
      EncryptedData: encryptedData,
      NewPassword: newPwd,
      ConfirmNewPassword: confirm,
    })
    setLoading(false)

    const code = result.data?.responseResult?.responseMessage

    if (code === 'ERM_Auth_AuthServiceManager_ResetPassword_01') {
      // Replace the current history entry with the clean URL (no ?data=).
      // This strips the encrypted token from the address bar AND removes it
      // from browser history — back / forward can never return to this form.
      navigate('/reset-password', { replace: true })
      setDone(true)
      return
    }

    showError(
      RESET_PASSWORD_CODES[code] || result.message || 'Something went wrong, please try again.'
    )
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  // done MUST come first — after navigate('/reset-password', { replace:true })
  // clears ?data=, encryptedData becomes '' on the next render. Without this
  // order the InvalidLinkScreen would flash instead of the success screen.
  if (done)
    return (
      <AuthSuccessScreen
        variant="login"
        heading="Password Changed!"
        message="Your account password has been changed successfully. Use your new password to log in."
        btnText="Login"
        btnTo="/login"
        icon={<PadlockIcon />}
        extras={<TealStars />}
      />
    )

  if (!encryptedData) return <InvalidLinkScreen />

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen font-sans">
      <AuthLeftPanel variant="login" />

      {/* Right panel */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[360px]">
            <AlHilalLogo variant="login" />

            <h2 className="text-[18px] font-bold text-[#2f20b0] text-center mb-5">
              Reset your Password
            </h2>

            {/* New password input */}
            <PasswordInput value={newPwd} onChange={setNewPwd} placeholder="New password" />

            {/*
             * Policy indicator bars
             * 4 segments — bar + label turn teal when the rule passes
             */}
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

            {/* Confirm password input */}
            <PasswordInput value={confirm} onChange={setConfirm} placeholder="Re-enter Password" />

            {/* Match hint */}
            <p
              className={`text-[11px] text-center mt-1.5 mb-5 transition-colors duration-200
                          ${matches ? 'text-[#00B894]' : 'text-[#a0aec0]'}`}
            >
              {confirm.length > 0 && !matches ? 'Passwords do not match' : 'Match the password'}
            </p>

            {/* Reset button */}
            <BtnDark loading={loading} disabled={loading} onClick={handleReset} className="w-full">
              Reset Password
            </BtnDark>
          </div>
          <div className="mt-auto pt-5 text-slate font-bold text-xs flex">
            © Copyright {new Date().getFullYear()}. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
