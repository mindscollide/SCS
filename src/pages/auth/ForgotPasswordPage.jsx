/**
 * src/pages/auth/ForgotPasswordPage.jsx
 * =======================================
 * Forgot password page — collects email to trigger a reset link.
 *
 * Design: Same left panel as Login. Right panel:
 *  - Al-Hilal logo (top center)
 *  - Bold heading "Enter your email address to reset password" (2 lines, centered)
 *  - Single email input (placeholder "Enter Email Address", envelope icon right)
 *  - "Reset Password" button — slate/disabled when empty, navy when filled
 *  - Footer
 */

import React, { useState } from 'react'
import { Mail } from 'lucide-react'
import { toast } from 'react-toastify'
import Input from '../../components/common/Input/Input'
import AlHilalLogo from '../../components/common/auth/AlHilalLogo'
import AuthLeftPanel from '../../components/common/auth/AuthLeftPanel'
import { forgotPasswordApi } from '../../services/auth.service'
import { EMAIL_REGEX } from '../../utils/helpers'

const FORGOT_CODES = {
  ERM_Auth_AuthServiceManager_ForgotPassword_01: null,
  ERM_Auth_AuthServiceManager_ForgotPassword_02: 'Email address is required.',
  ERM_Auth_AuthServiceManager_ForgotPassword_03: 'No account found with this email address.',
  ERM_Auth_AuthServiceManager_ForgotPassword_04: 'Your account has been deactivated.',
  ERM_Auth_AuthServiceManager_ForgotPassword_05: 'Something went wrong, please try again.',
}

/* ── Page ─────────────────────────────────────────── */
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const isValid = EMAIL_REGEX.test(email)

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email address is required.')
      return
    }
    if (!isValid) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setLoading(true)

    const result = await forgotPasswordApi({ EmailAddress: email.trim() })
    setLoading(false)

    const code = result.data?.responseResult?.responseMessage

    if (code === 'ERM_Auth_AuthServiceManager_ForgotPassword_01') {
      setSent(true)
      return
    }

    toast.error(FORGOT_CODES[code] || 'Something went wrong, please try again.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }

  if (sent)
    return (
      <div className="flex min-h-screen font-sans">
        <AuthLeftPanel />
        <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
          <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
            <div className="w-full max-w-[320px] text-center">
              {/* Logo */}
              <AlHilalLogo variant="login" />

              {/* Open envelope + checkmark icon (navy outlined, matches PSD) */}
              <div className="flex justify-center mb-5">
                <svg
                  width="80"
                  height="70"
                  viewBox="0 0 80 70"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Envelope body */}
                  <rect
                    x="4"
                    y="20"
                    width="72"
                    height="46"
                    rx="4"
                    stroke="#2f20b0"
                    strokeWidth="3.5"
                    fill="white"
                  />
                  {/* Envelope flap (open — two angled lines from top corners to center-top) */}
                  <path
                    d="M4 20 L40 2 L76 20"
                    stroke="#2f20b0"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Bottom-left diagonal fold line */}
                  <line
                    x1="4"
                    y1="66"
                    x2="30"
                    y2="42"
                    stroke="#2f20b0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Bottom-right diagonal fold line */}
                  <line
                    x1="76"
                    y1="66"
                    x2="50"
                    y2="42"
                    stroke="#2f20b0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Teal checkmark circle */}
                  <circle cx="55" cy="22" r="14" fill="white" stroke="#00B894" strokeWidth="3" />
                  <path
                    d="M48 22 L53 27 L63 17"
                    stroke="#00B894"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-bold text-[#2f20b0] mb-3">Check your Email</h2>

              {/* Body */}
              <p className="text-[14px] text-[#4a5568] leading-relaxed">
                You're almost there! We sent an email to
              </p>
              <p className="text-[14px] font-medium text-[#1B5FC1] mt-1">{email}</p>
            </div>
            <div className="mt-auto pt-5 text-slate font-bold text-xs flex">
              © Copyright {new Date().getFullYear()}. All Rights Reserved.
            </div>
          </div>
        </div>
      </div>
    )

  return (
    <div className="flex min-h-screen font-sans">
      <AuthLeftPanel />

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px]">
            {/* Logo */}
            <AlHilalLogo variant="login" />

            {/* Heading — bold, centered, 2 lines */}
            <h2
              className="text-[18px] font-bold text-[#000000] text-center
                           leading-snug mb-6"
            >
              Enter your email address to
              <br />
              reset password
            </h2>

            {/* Email input */}
            <div className="mb-5 ">
              <Input
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter Email Address"
                maxLength={100}
                rightIcon={<Mail size={17} />}
                bgColor="#ffffff"
                borderColor={error ? '#E74C3C' : '#dde4ee'}
                focusBorderColor="#00B894"
                textColor="#000000"
                error={!!error}
                errorMessage={error}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-[200px] mx-auto py-[10px] rounded-[10px] text-[14px] font-semibold
                          text-white transition-colors flex items-center justify-center
                          ${
                            isValid && !loading
                              ? 'bg-[#2f20b0] hover:bg-[#251a94] cursor-pointer'
                              : 'bg-[#94a8e1] cursor-not-allowed'
                          }`}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Reset Password'
              )}  
            </button>
          </div>
          <div className="mt-auto pt-5 text-slate font-bold text-xs flex">
            © Copyright {new Date().getFullYear()}. All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
