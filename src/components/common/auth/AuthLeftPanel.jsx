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

/* ── Login variant — used on Login, ForgotPassword, ResetPassword ─────────── */
const LoginPanel = () => (
  <div
    className="relative hidden lg:flex w-[65%] flex-col justify-center px-16 overflow-hidden
               bg-[linear-gradient(135deg,#1a3ab5_0%,#1565c0_35%,#0097a7_70%,#00bfa5_100%)]"
  >
    {/* Concentric arcs — bottom-left */}
    <div className="absolute rounded-full border border-white/10 pointer-events-none w-[320px] h-[320px] -bottom-40 -left-40" />
    <div className="absolute rounded-full border border-white/10 pointer-events-none w-[240px] h-[240px] -bottom-[120px] -left-[120px]" />
    <div className="absolute rounded-full border border-white/10 pointer-events-none w-[160px] h-[160px] -bottom-20 -left-20" />
    <div className="absolute rounded-full border border-white/10 pointer-events-none w-[80px] h-[80px] -bottom-10 -left-10" />

    {/* Concentric arcs — top-right */}
    <div className="absolute rounded-full border border-white/[0.08] pointer-events-none w-[500px] h-[500px] -top-[167px] -right-[167px]" />
    <div className="absolute rounded-full border border-white/[0.08] pointer-events-none w-[380px] h-[380px] -top-[127px] -right-[127px]" />
    <div className="absolute rounded-full border border-white/[0.08] pointer-events-none w-[260px] h-[260px] -top-[87px] -right-[87px]" />

    {/* Ghost leaf watermark */}
    <div className="absolute top-[5%] right-[3%] w-[300px] h-[300px] opacity-10 pointer-events-none">
      <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
        <path
          d="M100 10 C140 10 175 45 175 90 C175 130 150 165 110 175
             C80 182 48 168 32 143 C16 118 16 85 32 62 C52 33 68 10 100 10Z"
          stroke="white"
          strokeWidth="3"
          fill="none"
        />
        <line x1="100" y1="10" x2="100" y2="180" stroke="white" strokeWidth="2" />
        <path
          d="M100 90 C115 70 145 65 162 78"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>

    {/* Small hollow circle */}
    <div className="absolute w-7 h-7 bottom-[28%] left-[7%] border-2 border-white/20 rounded-full pointer-events-none" />

    {/* Diagonal line */}
    <svg
      className="absolute bottom-[15%] left-[5%] w-[200px] h-[200px] opacity-20 pointer-events-none"
      viewBox="0 0 200 200"
    >
      <line
        x1="0"
        y1="200"
        x2="200"
        y2="50"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>

    {/* Text */}
    <div className="relative z-10 max-w-lg">
      <h1 className="text-white font-extrabold leading-tight mb-6 text-[3.2rem] tracking-[-0.5px]">
        Shariah Compliance
        <br />
        Solution
      </h1>
      <p className="text-white/80 text-[15px] leading-relaxed">
        Welcome to Shariah Compliance Solution, a robust framework for managing &amp; performing
        Shariah Screening / Compliance &amp; Shariah Advisory
      </p>
    </div>
  </div>
)

/* ── Signup variant — used on Signup page ─────────────────────────────────── */
const SignupPanel = () => (
  <div
    className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-end pb-20 px-14"
    style={{ background: 'linear-gradient(150deg, #1a237e 0%, #1565c0 40%, #00897b 100%)' }}
  >
    {/* Radar rings */}
    <div className="absolute top-[-100px] right-[-100px] opacity-[0.15]">
      {[360, 280, 200, 130, 70].map((size, i) => (
        <div
          key={i}
          className="absolute border border-white rounded-full"
          style={{ width: size, height: size, top: 100 - size / 2, right: 100 - size / 2 }}
        />
      ))}
    </div>
    <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
      <line x1="40%" y1="0%" x2="0%" y2="70%" stroke="white" strokeWidth="1" />
      <line x1="60%" y1="0%" x2="10%" y2="80%" stroke="white" strokeWidth="0.5" />
    </svg>
    <div className="absolute top-[47%] left-[7%] w-7 h-7 border-[2px] border-purple-300/50 rounded-full" />
    <div className="absolute bottom-[28%] left-[5%] w-4 h-4 border-[2px] border-purple-300/40 rounded-full" />
    <div className="absolute right-[-60px] top-[15%] w-[380px] h-[380px] border border-white/10 rounded-full" />
    <div className="absolute right-[-20px] top-[22%] w-[260px] h-[260px] opacity-[0.08]">
      <div className="w-full h-full rounded-full bg-white" />
    </div>
    <div className="relative z-10">
      <h1
        className="text-white font-extrabold leading-[1.1] mb-5 whitespace-pre-line"
        style={{ fontSize: 'clamp(36px, 4vw, 54px)' }}
      >
        Shariah Compliance{'\n'}Solution
      </h1>
      <p className="text-white/80 text-[15px] leading-relaxed max-w-[480px]">
        Welcome to Shariah Compliance Solution, a robust framework for managing &amp; performing
        Shariah Screening / Compliance &amp; Shariah Advisory
      </p>
    </div>
  </div>
)

/* ── Main export ─────────────────────────────────────────────────────────── */
const AuthLeftPanel = ({ variant = 'login' }) =>
  variant === 'signup' ? <SignupPanel /> : <LoginPanel />

export default AuthLeftPanel
