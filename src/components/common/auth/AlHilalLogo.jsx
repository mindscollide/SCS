/**
 * src/components/common/auth/AlHilalLogo.jsx
 * ============================================
 * Reusable Al-Hilal logo used on all auth pages.
 *
 * Props:
 *  variant  {"default" | "login"} — "login" uses gradient SVG (LoginPage style)
 *                                   "default" uses simple circle style (SignupPage style)
 *  className {string}             — extra wrapper classes
 */

import React from 'react'

/* ── Login variant — gradient ring + leaf SVG ─────────────────────────────── */
// Uses unique gradient IDs (ahRing / ahLeaf) to avoid SVG ID conflicts
const LoginLogo = () => (
  <div className="flex flex-col items-center mb-8 select-none">
    <div className="w-[90px] h-[90px] mb-3">
      <svg viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="45" cy="45" r="42" stroke="url(#ahRing)" strokeWidth="4" fill="white" />
        <path
          d="M45 18 C58 18 68 30 68 44 C68 56 60 66 48 68 C40 69 32 65 28 58
             C24 51 24 42 28 35 C33 26 39 18 45 18Z"
          fill="url(#ahLeaf)"
        />
        <path d="M45 18 L45 70" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M45 44 C50 38 59 36 64 40" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <defs>
          <linearGradient id="ahRing" x1="0" y1="0" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3A6B" />
            <stop offset="100%" stopColor="#00B894" />
          </linearGradient>
          <linearGradient id="ahLeaf" x1="28" y1="18" x2="68" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00B894" />
            <stop offset="100%" stopColor="#007a60" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    <div className="text-[28px] font-extrabold text-[#1B3A6B] leading-none tracking-tight">
      Al-Hilal
    </div>
    <div className="text-[13px] font-semibold text-[#00B894] tracking-widest mt-0.5 uppercase">
      Shariah Advisors
    </div>
  </div>
)

/* ── Default variant — bordered circle + leaf icon ───────────────────────── */
const DefaultLogo = () => (
  <div className="flex flex-col items-center mb-4">
    <div
      className="w-[88px] h-[88px] rounded-full border-[3px] border-[#1565c0]
                 flex items-center justify-center bg-white relative overflow-hidden"
    >
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#00897b]/10 rounded-b-full" />
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
        <path
          d="M23 7 C23 7 37 14 37 27 C37 35 30.6 40 23 40 C15.4 40 9 35 9 27 C9 14 23 7 23 7Z"
          fill="#00897b"
        />
        <path d="M23 12 C23 12 21 23 23 32" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M23 19 C23 19 27 17 30 21" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M23 25 C23 25 19 23 16 27" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
    <p className="text-[23px] font-extrabold text-[#1565c0] tracking-wide mt-2 leading-none">
      Al-Hilal
    </p>
    <p className="text-[11px] font-semibold text-[#00897b] tracking-[3px] uppercase mt-0.5">
      Shariah Advisors
    </p>
  </div>
)

/* ── Main export ─────────────────────────────────────────────────────────── */
const AlHilalLogo = ({ variant = 'default', className = '' }) => (
  <div className={className}>
    {variant === 'login' ? <LoginLogo /> : <DefaultLogo />}
  </div>
)

export default AlHilalLogo
