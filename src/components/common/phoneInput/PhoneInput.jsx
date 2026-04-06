/**
 * src/components/common/phoneInput/PhoneInput.jsx
 * =================================================
 * Reusable phone number input with country flag + dial code prefix.
 *
 * Features:
 *  - Flag emoji + dial code shown as a non-editable prefix
 *  - Only digits allowed (non-digit characters stripped automatically)
 *  - Optional label with required asterisk
 *  - Error state with red border + error message below
 *  - Teal focus border ring
 *  - Configurable country, dial code, max digits
 *
 * Props:
 *  value            {string}   — controlled input value (digits only)
 *  onChange         {Function} — called with new string (digits only)
 *  label            {string}   — label shown above the input
 *  required         {boolean}  — shows red asterisk next to label
 *  placeholder      {string}   — input placeholder (default: "Mobile Number")
 *  maxLength        {number}   — max digits allowed (default: 10)
 *  flag             {string}   — flag emoji (default: "🇵🇰")
 *  dialCode         {string}   — dial code prefix (default: "+92")
 *  error            {boolean}  — true = red border
 *  errorMessage     {string}   — message shown below when error is true
 *  focusBorderColor {string}   — border color on focus (default: "#01C9A4")
 *  className        {string}   — extra Tailwind classes for wrapper div
 *
 * Usage:
 *  import PhoneInput from "../../components/common/PhoneInput";
 *
 *  // Default Pakistan (+92)
 *  <PhoneInput
 *    label="Mobile Number"
 *    required
 *    value={form.mobile}
 *    onChange={(v) => set("mobile", v)}
 *    error={!!errors.mobile}
 *    errorMessage={errors.mobile}
 *  />
 *
 *  // Custom country (UAE)
 *  <PhoneInput
 *    label="Phone"
 *    value={form.phone}
 *    onChange={(v) => set("phone", v)}
 *    flag="🇦🇪"
 *    dialCode="+971"
 *    maxLength={9}
 *    focusBorderColor="#1565c0"
 *    error={!!errors.phone}
 *    errorMessage={errors.phone}
 *  />
 */

import React, { useRef } from 'react'

const PhoneInput = ({
  value,
  onChange,
  label = '',
  required = false,
  placeholder = 'Mobile Number',
  maxLength = 10,
  flag = '🇵🇰',
  dialCode = '+92',
  error = false,
  errorMessage = '',
  focusBorderColor = '#01C9A4',
  className = '',
}) => {
  const inputRef = useRef(null)

  /** Strip non-digits and enforce maxLength */
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLength)
    onChange(digits)
  }

  /** Clicking the prefix focuses the number input */
  const focusInput = () => inputRef.current?.focus()

  return (
    <div className={`w-full ${className}`}>
      {/* ── Label ── */}
      {label && (
        <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* ── Input wrapper ── */}
      <div
        className={`flex items-stretch bg-white border rounded-xl overflow-hidden
                    transition-all duration-150
                    ${error ? 'border-red-500' : 'border-slate-200'}`}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = focusBorderColor
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = '#e2e8f0'
        }}
      >
        {/* ── Flag + dial code (non-editable prefix) ── */}
        <div
          onClick={focusInput}
          className="flex items-center gap-1.5 px-3 border-r border-slate-200
                     shrink-0 cursor-default select-none"
        >
          <span className="text-[17px] leading-none">{flag}</span>
          <span className="text-[13px] font-medium text-[#041E66]">{dialCode}</span>
        </div>

        {/* ── Number input — digits only via inputMode + onChange strip ── */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 px-3 py-[10px] text-[13px] text-[#041E66]
                     placeholder:text-[#a0aec0] bg-transparent
                     border-none outline-none"
        />
      </div>

      {/* ── Error message ── */}
      {error && errorMessage && (
        <p className="text-[11px] text-red-500 mt-1 font-medium">{errorMessage}</p>
      )}
    </div>
  )
}

export default PhoneInput
