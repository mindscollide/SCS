/**
 * src/pages/auth/ResetPasswordPage.jsx
 * ======================================
 * Reset password page — new password entry with live policy validation.
 *
 * Screen 1 — Empty: inputs + grey policy labels + grey "Match the password"
 * Screen 2 — Typing: thin colored bar above each label turns teal as rules pass
 * Screen 3 — Success: navy padlock icon + 4 teal stars + "Password Changed!" + Login btn
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLeftPanel from '../../components/common/auth/AuthLeftPanel'
import AlHilalLogo from '../../components/common/auth/AlHilalLogo'
import AuthSuccessScreen from '../../components/common/auth/AuthSuccessScreen'
import PasswordInput from '../../components/common/Input/PasswordInput'

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD POLICY RULES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PADLOCK ICON — passed as `icon` prop to AuthSuccessScreen
// ─────────────────────────────────────────────────────────────────────────────

const PadlockIcon = () => (
  <div className="flex justify-center mb-3">
    <svg width="68" height="72" viewBox="0 0 68 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shackle arc */}
      <path
        d="M18 30 L18 18 C18 9 50 9 50 18 L50 30"
        stroke="#1B3A6B"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lock body */}
      <rect x="8" y="30" width="52" height="38" rx="6" fill="#1B3A6B" />
      {/* Keyhole circle */}
      <circle cx="34" cy="47" r="6" fill="white" />
      {/* Keyhole stem */}
      <rect x="31" y="50" width="6" height="9" rx="2" fill="white" />
    </svg>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// TEAL STARS — passed as `extras` prop to AuthSuccessScreen
// ─────────────────────────────────────────────────────────────────────────────

const TealStars = () => (
  <div className="flex justify-center gap-3 mb-4">
    {[0, 1, 2, 3].map((i) => (
      <span key={i} className="text-[#00B894] text-[22px]">
        ✦
      </span>
    ))}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const ResetPasswordPage = () => {
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  // ── Policy evaluation ─────────────────────────────────────────────────────
  const results = POLICY.map((r) => ({
    ...r,
    ok: newPwd.length > 0 && r.test(newPwd),
  }))
  const allPass = results.every((r) => r.ok)
  const matches = newPwd.length > 0 && newPwd === confirm
  const canSubmit = allPass && matches

  // ── Success screen ────────────────────────────────────────────────────────
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

  return (
    <div className="flex min-h-screen font-sans">
      <AuthLeftPanel variant="login" />

      {/* ── Right panel ── */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px]">
            <AlHilalLogo variant="login" />

            {/* Heading */}
            <h2 className="text-[18px] font-bold text-[#1B3A6B] text-center mb-5">
              Reset your Password
            </h2>

            {/* New password input */}
            <PasswordInput value={newPwd} onChange={setNewPwd} placeholder="New password" />

            {/*
             * Policy indicator bars
             * 4 segments — each has a thin bar + label below
             * Bar + label turn teal when the rule passes
             */}
            <div className="flex gap-1 mt-2 mb-5">
              {results.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-[3px]">
                  {/* Indicator bar */}
                  <div
                    className={`h-[3px] w-full rounded-full transition-colors duration-200
                                ${r.ok ? 'bg-[#00B894]' : 'bg-[#d1dae6]'}`}
                  />
                  {/* Rule label */}
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

            {/* Password match hint — turns teal when passwords match */}
            <p
              className={`text-[11px] text-center mt-1.5 mb-5 transition-colors duration-200
                          ${matches ? 'text-[#00B894]' : 'text-[#a0aec0]'}`}
            >
              {confirm.length > 0 && !matches ? 'Passwords do not match' : 'Match the password'}
            </p>

            {/* Reset Password button — disabled style when not ready */}
            <button
              onClick={() => {
                if (canSubmit) setDone(true)
              }}
              className={`w-full py-[11px] rounded-[10px] text-[14px] font-semibold
                          text-white transition-colors
                          ${
                            canSubmit
                              ? 'bg-[#1B3A6B] hover:bg-[#132e57] cursor-pointer'
                              : 'bg-[#1B3A6B] opacity-80 cursor-not-allowed'
                          }`}
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const CreatePasswordPage = ResetPasswordPage
export default ResetPasswordPage
