/**
 * pages/auth/SignupPage.jsx
 * ==========================
 * Pixel-matched to the provided design screens.
 *
 * Layout: Left gradient panel | Right white/grey form panel
 *
 * Left panel  → Dark blue-to-teal gradient, radar rings, bold heading + subtitle
 * Right panel → Al-Hilal logo, 6 fields, Back (amber) + Proceed (grey-blue) buttons
 *
 * States:
 *  1. Default        — empty form, Proceed greyed out visually
 *  2. Error          — red border + inline error text per invalid field
 *  3. Dropdown open  — custom role dropdown shows Data Entry / Manager
 *  4. Success        — teal badge checkmark + "Sign-up Request Submitted" + Login btn
 *
 * Mobile field: Pakistan flag 🇵🇰 | +92 | number input (digits only, 10 chars)
 * Role field:   Custom dropdown (not native <select>) — Data Entry default
 */

import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Globe, Mail, ChevronDown } from 'lucide-react'

const ROLE_OPTIONS = ['Data Entry', 'Manager']

/* ─── Al-Hilal Logo ──────────────────────────────────────────────────────── */
const AlHilalLogo = () => (
  <div className="flex flex-col items-center mb-4">
    <div className="w-[88px] h-[88px] rounded-full border-[3px] border-[#1565c0]
                    flex items-center justify-center bg-white relative overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#00897b]/10 rounded-b-full" />
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
        <path d="M23 7 C23 7 37 14 37 27 C37 35 30.6 40 23 40 C15.4 40 9 35 9 27 C9 14 23 7 23 7Z"
          fill="#00897b"/>
        <path d="M23 12 C23 12 21 23 23 32" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M23 19 C23 19 27 17 30 21" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M23 25 C23 25 19 23 16 27" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
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

/* ─── Left gradient panel ─────────────────────────────────────────────────── */
const LeftPanel = () => (
  <div
    className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-end pb-20 px-14"
    style={{ background: 'linear-gradient(150deg, #1a237e 0%, #1565c0 40%, #00897b 100%)' }}
  >
    {/* Radar rings — top right */}
    <div className="absolute top-[-100px] right-[-100px] opacity-[0.15]">
      {[360, 280, 200, 130, 70].map((size, i) => (
        <div
          key={i}
          className="absolute border border-white rounded-full"
          style={{
            width: size, height: size,
            top: 100 - size / 2, right: 100 - size / 2,
          }}
        />
      ))}
    </div>

    {/* Diagonal decorative lines */}
    <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
      <line x1="40%" y1="0%" x2="0%" y2="70%" stroke="white" strokeWidth="1"/>
      <line x1="60%" y1="0%" x2="10%" y2="80%" stroke="white" strokeWidth="0.5"/>
    </svg>

    {/* Small circles */}
    <div className="absolute top-[47%] left-[7%] w-7 h-7 border-[2px] border-purple-300/50 rounded-full"/>
    <div className="absolute bottom-[28%] left-[5%] w-4 h-4 border-[2px] border-purple-300/40 rounded-full"/>

    {/* Watermark leaf circle — right side */}
    <div className="absolute right-[-60px] top-[15%] w-[380px] h-[380px] border border-white/10 rounded-full"/>
    <div className="absolute right-[-20px] top-[22%] w-[260px] h-[260px] opacity-[0.08]">
      <div className="w-full h-full rounded-full bg-white"/>
    </div>

    {/* Text */}
    <div className="relative z-10">
      <h1 className="text-white font-extrabold leading-[1.1] mb-5"
          style={{ fontSize: 'clamp(36px, 4vw, 54px)' }}>
        Shariah Compliance<br/>Solution
      </h1>
      <p className="text-white/80 text-[15px] leading-relaxed max-w-[480px]">
        Welcome to Shariah Compliance Solution, a robust framework for managing
        &amp; performing Shariah Screening / Compliance &amp; Shariah Advisory
      </p>
    </div>
  </div>
)

/* ─── Custom Role Dropdown ────────────────────────────────────────────────── */
const RoleDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between bg-white border border-slate-200
                   rounded-xl px-4 py-3.5 text-[14px] text-slate-700
                   hover:border-slate-300 focus:border-[#1565c0] transition-colors"
      >
        <span>{value}</span>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+3px)] left-0 right-0 bg-white
                        border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {ROLE_OPTIONS.map(role => (
            <button
              key={role}
              type="button"
              onClick={() => { onChange(role); setOpen(false) }}
              className={`w-full text-left px-4 py-3 text-[14px] transition-colors
                          ${value === role
                            ? 'bg-slate-100 font-medium text-slate-800'
                            : 'text-slate-700 hover:bg-slate-50'
                          }`}
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Success Screen ──────────────────────────────────────────────────────── */
const SuccessScreen = () => (
  <div className="flex min-h-screen">
    <LeftPanel />
    <div className="w-full lg:w-[440px] bg-[#f0f2f5] flex flex-col items-center
                    justify-between px-10 py-10">
      <AlHilalLogo />

      <div className="flex flex-col items-center text-center">
        {/* Teal badge checkmark */}
        <div className="w-[100px] h-[100px] mb-6">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="46" stroke="#00897b" strokeWidth="4" fill="none"/>
            <circle cx="50" cy="50" r="38" fill="#00897b"/>
            <polyline
              points="28,52 43,67 72,34"
              stroke="white" strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-slate-800 mb-3">
          Sign-up Request Submitted
        </h2>
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[290px]">
          Your application is now under review. You will receive an email notification
          when your application is reviewed.
        </p>
      </div>

      <div className="w-full">
        <Link to="/login">
          <button
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px]
                       hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #1565c0, #00897b)' }}
          >
            Login
          </button>
        </Link>
        <p className="text-center text-[11px] text-slate-400 mt-5">
          © Copyright 2025. All Rights Reserved.
        </p>
      </div>
    </div>
  </div>
)

/* ─── Main Signup Page ────────────────────────────────────────────────────── */
const SignupPage = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', lastName: '', org: '', email: '', mobile: '', role: 'Data Entry'
  })
  const [errors,    setErrors]    = useState({})
  const [submitted, setSubmitted] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'First Name is required'
    if (!form.lastName.trim())  e.lastName  = 'Last Name is required'
    if (!form.org.trim())       e.org       = 'Organization is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid Email'
    if (!form.mobile.trim())    e.mobile    = 'Mobile number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  if (submitted) return <SuccessScreen />

  /* ── Reusable field row ── */
  const InputField = ({ id, placeholder, icon: Icon, type = 'text', maxLength = 100 }) => (
    <div>
      <div className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3.5
                       transition-colors duration-150
                       ${errors[id]
                         ? 'border-red-500'
                         : 'border-slate-200 focus-within:border-[#1565c0]'
                       }`}>
        <input
          type={type}
          maxLength={maxLength}
          value={form[id]}
          onChange={e => set(id, e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-[14px] text-slate-700 placeholder:text-slate-400
                     bg-transparent border-none outline-none min-w-0"
        />
        <Icon size={17} className={`shrink-0 ${errors[id] ? 'text-red-400' : 'text-slate-400'}`} />
      </div>
      {errors[id] && (
        <p className="text-[12px] text-red-500 mt-1 ml-1 font-medium">{errors[id]}</p>
      )}
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* ── Right panel ── */}
      <div className="w-full lg:w-[440px] bg-[#f0f2f5] flex flex-col items-center
                      justify-between px-10 py-8 min-h-screen">

        {/* Logo */}
        <AlHilalLogo />

        {/* Fields */}
        <div className="w-full space-y-3">
          <InputField id="firstName" placeholder="First Name *"        icon={User} />
          <InputField id="lastName"  placeholder="Last Name *"         icon={User} />
          <InputField id="org"       placeholder="Organization Name *"  icon={Globe} />
          <InputField id="email"     placeholder="Email Address *"      icon={Mail} type="email" />

          {/* Mobile — flag + code + number */}
          <div>
            <div className={`flex items-stretch bg-white border rounded-xl overflow-hidden
                             transition-colors duration-150
                             ${errors.mobile
                               ? 'border-red-500'
                               : 'border-slate-200 focus-within:border-[#1565c0]'
                             }`}>
              {/* Flag + code prefix */}
              <div className="flex items-center gap-1.5 px-3 border-r border-slate-200 shrink-0">
                <span className="text-[17px] leading-none">🇵🇰</span>
                <span className="text-[14px] font-medium text-slate-600">+92</span>
              </div>
              {/* Number */}
              <input
                type="tel"
                maxLength={10}
                value={form.mobile}
                onChange={e => set('mobile', e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-3.5 text-[14px] text-slate-700
                           bg-transparent border-none outline-none"
              />
            </div>
            {errors.mobile && (
              <p className="text-[12px] text-red-500 mt-1 ml-1 font-medium">{errors.mobile}</p>
            )}
          </div>

          {/* Role */}
          <RoleDropdown value={form.role} onChange={v => set('role', v)} />
        </div>

        {/* Action buttons + footer */}
        <div className="w-full">
          <div className="flex gap-3 mb-5">
            {/* Back — amber */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex-1 py-3.5 rounded-xl text-white font-bold text-[15px]
                         hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#F5A623' }}
            >
              Back
            </button>

            {/* Proceed — grey-blue (design shows muted colour always) */}
            <button
              type="button"
              onClick={() => { if (validate()) setSubmitted(true) }}
              className="flex-1 py-3.5 rounded-xl text-white font-bold text-[15px]
                         hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#8B9DC3' }}
            >
              Proceed
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            © Copyright 2025. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
