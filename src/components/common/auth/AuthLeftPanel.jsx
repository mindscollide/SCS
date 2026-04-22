/**
 * src/components/common/auth/AuthLeftPanel.jsx
 * ==============================================
 * Reusable left gradient panel for all auth pages.
 *
 * Props:
 *  variant  {"login" | "signup"} — "login"  used on Login + ForgotPassword + ResetPassword
 *                                  "signup" used on Signup page
 */

import React from 'react'
import bgImage from '../../../../public/signup_background.png'

/* ── Login variant — used on Login, ForgotPassword, ResetPassword ─────────── */
const LoginPanel = () => (
  <div
    className="relative hidden lg:flex w-[65%] flex-col justify-center px-16 overflow-hidden"
    style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      // backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  >
    {/* Optional: Subtle overlay to ensure text readability 
        if the background image is too light.
    */}
    <div className="absolute inset-0 bg-black/10 pointer-events-none" />

    {/* Text content remains centered for the Login variant */}
    <div className="relative z-10 pr-32">
      <div className="text-white font-extrabold text-[79px] leading-[1.2]">
        Shariah Compliance Solutions
      </div>
      <p className="text-white font-thin text-[24px] leading-relaxed">
        Welcome to Shariah Compliance Solution, a robust framework for managing & performing Shariah
        Screening / Compliance & Shariah Advisory
      </p>
    </div>
  </div>
)

/* ── Signup variant — used on Signup page ─────────────────────────────────── */
const SignupPanel = () => (
  <div
    className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-end pb-20 px-14"
    style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  >
    <div className="relative z-10">
      <h1
        className="text-white font-extrabold leading-[1.1] mb-5 whitespace-pre-line"
        style={{ fontSize: 'clamp(36px, 4vw, 54px)' }}
      >
        Shariah Compliance{'\n'}Solution
      </h1>
      <p className="text-white/80 text-[15px] leading-relaxed max-w-[480px]">
        Welcome to Shariah Compliance Solution, a robust framework for managing{'\n'}& performing
        Shariah Screening / Compliance & Shariah Advisory
      </p>
    </div>
  </div>
)

/* ── Main export ─────────────────────────────────────────────────────────── */
const AuthLeftPanel = ({ variant = 'login' }) =>
  variant === 'signup' ? <SignupPanel /> : <LoginPanel />

export default AuthLeftPanel
