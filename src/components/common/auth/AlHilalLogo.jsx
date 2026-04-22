/**
 * src/components/common/auth/AlHilalLogo.jsx
 * ============================================
 * Al-Hilal brand logo using the official PNG asset.
 *
 * ⚠️  One-time setup:
 *   Save the logo PNG to → src/assets/logo.png
 *
 * Props:
 *  variant   {"default" | "login"}
 *              "login"   — 120px wide  (Login / ForgotPassword / ResetPassword)
 *              "default" — 100px wide  (Signup right panel)
 *  className  {string}
 */

import React from 'react'

const AlHilalLogo = ({ variant = 'default', className = '' }) => {
  // login  → Login / ForgotPassword / ResetPassword pages (right panel ~35% width)
  // default → Signup page (right panel 440px) + success screens
  const width = variant === 'login' ? 200 : 180

  return (
    <div className={`flex justify-center select-none  ${className}`}>
      <img
        src="/logo.png"
        alt="Al-Hilal Shariah Advisors"
        // width={width}
        className={`object-contain h-auto ${!className.includes('w-') ? width : ''}`}
        // className="object-contain"
        draggable={false}
      />
    </div>
  )
}

export default AlHilalLogo
