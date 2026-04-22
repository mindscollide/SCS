/**
 * src/components/common/auth/AuthSuccessScreen.jsx
 * ==================================================
 * Reusable success screen used after signup, password reset, etc.
 *
 * Props:
 *  variant      {"default" | "login"}
 *                 "default" — signup layout: wide right panel (lg:w-[440px]),
 *                             logo top / content middle / btn bottom
 *                 "login"   — reset/forgot layout: narrow right panel (lg:w-[35%]),
 *                             all content centered
 *  heading      {string}    — bold heading text
 *  message      {string}    — paragraph below heading
 *  btnText      {string}    — button label (default: "Login")
 *  btnTo        {string}    — react-router link target (default: "/login")
 *  onBtnClick   {Function}  — optional onClick instead of navigation
 *  icon         {ReactNode} — custom icon replaces the default green checkmark
 *  extras       {ReactNode} — optional slot rendered between icon and heading
 *                             (e.g. decorative stars)
 */

import React from 'react'
import { Link } from 'react-router-dom'
import AlHilalLogo from './AlHilalLogo'
import AuthLeftPanel from './AuthLeftPanel'
import tickIcon from '../../../../public/Signup-SuccessMessage_Tick_icon.png'

/* ── Default green checkmark icon ─────────────────────────────────────────── */
const DefaultIcon = () => (
  <div className="w-[100px] h-[100px] mb-6">
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="#00897b" strokeWidth="4" fill="none" />
      <circle cx="50" cy="50" r="38" fill="#00897b" />
      <polyline
        points="28,52 43,67 72,34"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  </div>
)

/* ── Shared action button ─────────────────────────────────────────────────── */
const ActionButton = ({ btnText, btnTo, onBtnClick, className = '' }) =>
  onBtnClick ? (
    <button
      onClick={onBtnClick}
      className={`w-full py-3.5 rounded-xl text-white font-bold text-[15px]
                  hover:opacity-90 transition-opacity ${className}`}
      style={{ background: 'linear-gradient(135deg, #1565c0, #00897b)' }}
    >
      {btnText}
    </button>
  ) : (
    <Link to={btnTo}>
      <button
        className={`w-full py-3.5 rounded-xl text-white font-bold text-[15px]
                    hover:opacity-90 transition-opacity ${className}`}
        style={{ background: 'linear-gradient(135deg, #1565c0, #00897b)' }}
      >
        {btnText}
      </button>
    </Link>
  )

/* ── Main component ───────────────────────────────────────────────────────── */
const AuthSuccessScreen = ({
  variant = 'default',
  heading = 'Sign-up Request Submitted',
  message = 'Your application is now under review. You will receive an email notification when your application is reviewed.',
  btnText = 'Login',
  btnTo = '/login',
  onBtnClick,
  icon,
  extras,
}) => {
  const logoVariant = variant === 'login' ? 'login' : 'default'

  /* ── "default" (signup) layout ── */
  if (variant === 'default') {
    return (
      <div className="flex min-h-screen">
        <AuthLeftPanel variant="login" />

        {/* Added 'justify-between' or ensure children can grow */}
        <div className="flex-1 bg-[#f0f2f5] flex flex-col items-center justify-between px-10 py-5">
          <AlHilalLogo variant={logoVariant} className="w-[400px]" />

          {/* This wrapper contains your main content */}
          <div className="flex flex-col items-center text-center">
            {/* {icon ?? <DefaultIcon />}
             */}
            <img src={tickIcon} alt="Success" className="w-[100px] h-[100px] mb-6 object-contain" />
            {extras}
            <h2 className="text-[20px] font-bold text-[#000000] mb-3">{heading}</h2>
            <p className="text-[13px] text-[#000000]  max-w-[290px]">{message}</p>
          </div>

          <div className="w-[150px]  mt-10">
            <ActionButton btnText={btnText} btnTo={btnTo} onBtnClick={onBtnClick} />
          </div>

          {/* 'mt-auto' pushes this div to the very bottom of the flex container */}
          <div className="mt-auto pt-5 text-slate font-bold text-xs flex">
            © Copyright 2025. All Rights Reserved.
          </div>
        </div>
      </div>
    )
  }

  /* ── "login" (reset password) layout ── */
  return (
    <div className="flex min-h-screen font-sans">
      <AuthLeftPanel variant="login" />
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8] ">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px] text-center">
            <AlHilalLogo variant="login" />
            {icon ?? <DefaultIcon />}
            {/* <img src={tickIcon} alt="Success" className="w-[100px] h-[100px] mb-6 object-contain" /> */}
            {extras}
            <h2 className="text-[20px] font-bold text-[#2f20b0] mb-3">{heading}</h2>
            <p className="text-[14px] text-[#4a5568] leading-relaxed mb-6">{message}</p>
            <ActionButton btnText={btnText} btnTo={btnTo} onBtnClick={onBtnClick} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthSuccessScreen
