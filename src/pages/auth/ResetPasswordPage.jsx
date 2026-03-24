/**
 * ResetPasswordPage.jsx
 *
 * Screen 1 — Empty: inputs + grey policy labels + grey "Match the password"
 * Screen 2 — Typing: thin colored bar above each label turns teal as rules pass
 * Screen 3 — Success: navy padlock icon + 4 teal stars + "Password Changed!" + Login btn
 *
 * Policy bar design (Image 2):
 *   Each rule = thin horizontal bar on top + label below
 *   Bar: grey when not met, teal (#00B894) when met
 *   Label: grey when not met, teal when met
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { AuthLeftPanel, AlHilalLogo } from './ForgotPasswordPage.jsx'

/* ── Password policy rules ─────────────────────────── */
const POLICY = [
  { label: 'No Space 8-20', test: p => p.length >= 8 && p.length <= 20 && !/\s/.test(p) },
  { label: 'Capital Letter', test: p => /[A-Z]/.test(p) },
  { label: 'Numeric',        test: p => /[0-9]/.test(p) },
  { label: 'Special character', test: p => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
]

/* ── Eye-toggle input ──────────────────────────────── */
const PwdInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center bg-white rounded-[10px] px-4 py-[11px]
                    border border-[#dde4ee] w-full
                    focus-within:border-[#00B894]
                    focus-within:shadow-[0_0_0_3px_rgba(0,184,148,0.12)]
                    transition-all">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={20}
        className="flex-1 bg-transparent border-none outline-none
                   text-[13px] text-[#1B3A6B] placeholder:text-[#a0aec0]"
      />
      <button type="button" onClick={() => setShow(p => !p)}
        className="text-[#a0aec0] hover:text-[#1B3A6B] transition-colors shrink-0">
        {show ? <Eye size={17} /> : <EyeOff size={17} />}
      </button>
    </div>
  )
}

/* ── Success screen (Image 3) ──────────────────────── */
const SuccessScreen = () => (
  <div className="flex min-h-screen font-sans">
    <AuthLeftPanel />
    <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
        <div className="w-full max-w-[320px] text-center">

          <AlHilalLogo />

          {/* Navy padlock icon */}
          <div className="flex justify-center mb-3">
            <svg width="68" height="72" viewBox="0 0 68 72" fill="none"
                 xmlns="http://www.w3.org/2000/svg">
              {/* Shackle (arc on top) */}
              <path d="M18 30 L18 18 C18 9 50 9 50 18 L50 30"
                    stroke="#1B3A6B" strokeWidth="6"
                    strokeLinecap="round" fill="none"/>
              {/* Lock body */}
              <rect x="8" y="30" width="52" height="38" rx="6"
                    fill="#1B3A6B"/>
              {/* Keyhole circle */}
              <circle cx="34" cy="47" r="6" fill="white"/>
              {/* Keyhole stem */}
              <rect x="31" y="50" width="6" height="9" rx="2" fill="white"/>
            </svg>
          </div>

          {/* 4 teal stars */}
          <div className="flex justify-center gap-3 mb-4">
            {[0,1,2,3].map(i => (
              <span key={i} className="text-[#00B894] text-[22px]">✦</span>
            ))}
          </div>

          {/* Title */}
          <h2 className="text-[20px] font-bold text-[#1B3A6B] mb-3">
            Password Changed!
          </h2>

          {/* Body */}
          <p className="text-[14px] text-[#4a5568] leading-relaxed mb-6">
            Your account password has been changed successfully.
            Use your new password to log in.
          </p>

          {/* Login button */}
          <Link to="/login">
            <button className="w-full py-[11px] rounded-[10px] text-[14px] font-semibold
                               text-white bg-[#1B3A6B] hover:bg-[#132e57] transition-colors">
              Login
            </button>
          </Link>

        </div>
      </div>
      <p className="text-center text-[12px] text-[#a0aec0] py-4">
        © Copyright 2025. All Rights Reserved.
      </p>
    </div>
  </div>
)

/* ── Main page ─────────────────────────────────────── */
const ResetPasswordPage = () => {
  const [newPwd,   setNewPwd]  = useState('')
  const [confirm,  setConfirm] = useState('')
  const [done,     setDone]    = useState(false)

  const results   = POLICY.map(r => ({ ...r, ok: newPwd.length > 0 && r.test(newPwd) }))
  const allPass   = results.every(r => r.ok)
  const matches   = newPwd.length > 0 && newPwd === confirm
  const canSubmit = allPass && matches

  if (done) return <SuccessScreen />

  return (
    <div className="flex min-h-screen font-sans">

      <AuthLeftPanel />

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px]">

            <AlHilalLogo />

            {/* Heading */}
            <h2 className="text-[18px] font-bold text-[#1B3A6B] text-center mb-5">
              Reset your Password
            </h2>

            {/* New password input */}
            <PwdInput
              value={newPwd}
              onChange={setNewPwd}
              placeholder="New password"
            />

            {/* Policy segments — 4 bars + labels */}
            <div className="flex gap-1 mt-2 mb-5">
              {results.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-[3px]">
                  {/* Bar */}
                  <div className={`h-[3px] w-full rounded-full transition-colors duration-200
                    ${r.ok ? 'bg-[#00B894]' : 'bg-[#d1dae6]'}`}
                  />
                  {/* Label */}
                  <span className={`text-[10px] font-medium text-center leading-tight
                    transition-colors duration-200
                    ${r.ok ? 'text-[#00B894]' : 'text-[#a0aec0]'}`}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Re-enter password input */}
            <PwdInput
              value={confirm}
              onChange={setConfirm}
              placeholder="Re-enter Password"
            />

            {/* "Match the password" hint */}
            <p className={`text-[11px] text-center mt-1.5 mb-5 transition-colors duration-200
              ${matches ? 'text-[#00B894]' : 'text-[#a0aec0]'}`}>
              {confirm.length > 0 && !matches
                ? 'Passwords do not match'
                : 'Match the password'
              }
            </p>

            {/* Reset Password button */}
            <button
              onClick={() => { if (canSubmit) setDone(true) }}
              className={`w-full py-[11px] rounded-[10px] text-[14px] font-semibold
                          text-white transition-colors
                          ${canSubmit
                            ? 'bg-[#1B3A6B] hover:bg-[#132e57] cursor-pointer'
                            : 'bg-[#1B3A6B] opacity-80 cursor-not-allowed'
                          }`}
            >
              Reset Password
            </button>

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-[#a0aec0] py-4">
          © Copyright 2025. All Rights Reserved.
        </p>
      </div>

    </div>
  )
}

export const CreatePasswordPage = ResetPasswordPage
export default ResetPasswordPage
