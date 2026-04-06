/**
 * src/components/common/Input/Input.jsx
 * =======================================
 * Reusable styled text input — matches the SCS design system.
 *
 * Props:
 *  value            {string}   — controlled input value
 *  onChange         {Function} — called with new string value on change
 *  type             {string}   — input type (default: "text")
 *  label            {string}   — label shown above input
 *  required         {boolean}  — shows red asterisk next to label
 *  placeholder      {string}   — input placeholder text
 *  maxLength        {number}   — max characters allowed
 *  showCount        {boolean}  — shows character count below input (default: false)
 *  regex            {RegExp}   — if provided, only allows characters matching regex
 *  error            {boolean}  — true = red border + white bg
 *  errorMessage     {string}   — message shown below input when error is true
 *  disabled         {boolean}  — disables the input
 *  multiline        {boolean}  — renders a <textarea> instead of <input> (default: false)
 *  rows             {number}   — number of visible rows for textarea (default: 4)
 *  bgColor          {string}   — background color (default: "#ffffff")
 *  borderColor      {string}   — border color (default: "#e2e8f0")
 *  focusBorderColor {string}   — border on focus (default: "#01C9A4")
 *  textColor        {string}   — text color (default: "#041E66")
 *  className        {string}   — extra Tailwind classes for the wrapper div
 *
 * Usage:
 *  import Input from "../../components/common/Input";
 *
 *  // Basic
 *  <Input
 *    label="User Name"
 *    required
 *    value={form.userName}
 *    onChange={(v) => set("userName", v)}
 *    maxLength={50}
 *    placeholder="Enter user name"
 *    regex={/^[a-zA-Z\s]*$/}
 *    error={!!errors.userName}
 *    errorMessage={errors.userName}
 *  />
 *
 *  // Email
 *  <Input
 *    label="Email ID"
 *    type="email"
 *    value={form.email}
 *    onChange={(v) => set("email", v)}
 *    maxLength={50}
 *    placeholder="email@example.com"
 *  />
 *
 *  // With character counter
 *  <Input
 *    label="Notes"
 *    value={form.notes}
 *    onChange={(v) => set("notes", v)}
 *    maxLength={500}
 *    showCount
 *  />
 *
 *  // Multiline textarea
 *  <Input
 *    label="Description"
 *    multiline
 *    rows={5}
 *    value={form.desc}
 *    onChange={(v) => set("desc", v)}
 *    maxLength={300}
 *    showCount
 *    placeholder="Enter description"
 *  />
 *
 *  // Custom colors (EFF3FF bg style used in forms)
 *  <Input
 *    value={form.ip}
 *    onChange={(v) => setF("ip", v)}
 *    bgColor="#EFF3FF"
 *    borderColor="transparent"
 *    placeholder="999.999.999.999"
 *    maxLength={15}
 *    regex={/^[0-9.]*$/}
 *  />
 */

import React from 'react'

const Input = ({
  value,
  onChange,
  type = 'text',
  label = '',
  required = false,
  placeholder = '',
  maxLength,
  showCount = false,
  regex,
  error = false,
  errorMessage = '',
  disabled = false,
  multiline = false, // renders <textarea> when true
  rows = 4, // visible rows for textarea
  bgColor = '#ffffff',
  borderColor = '#e2e8f0',
  focusBorderColor = '#01C9A4',
  textColor = '#041E66',
  rightIcon = null, // ReactNode — icon shown on the right side of the input
  onRightIconClick, // Function — called when right icon is clicked (e.g. toggle password)
  onBlur, // Function — called on blur (used for unique-check, etc.)
  className = '',
}) => {
  /**
   * Handle change with optional regex validation.
   * Only calls onChange if the new value matches the regex,
   * or if no regex is provided.
   */
  const handleChange = (e) => {
    const val = e.target.value
    if (regex && !regex.test(val)) return // block non-matching characters
    onChange(val)
  }

  const remaining = maxLength !== undefined ? maxLength - (value?.length || 0) : null

  return (
    <div className={`w-full ${className}`}>
      {/* ── Label ── */}
      {label && (
        <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* ── Input / Textarea wrapper ── */}
      <div
        className={`flex ${multiline ? 'items-start' : 'items-center'} rounded-lg border transition-all
              ${error ? 'border-red-400 bg-white' : 'border'}`}
        style={error ? {} : { backgroundColor: bgColor, borderColor: borderColor }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = focusBorderColor
        }}
        onBlur={(e) => {
          if (!error) e.currentTarget.style.borderColor = borderColor
        }}
      >
        {multiline ? (
          <textarea
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            rows={rows}
            className={`flex-1 px-3 py-[10px] text-[13px] bg-transparent
                  outline-none resize-none transition-all
                  placeholder:text-[#a0aec0]
                  disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ color: textColor }}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className={`flex-1 px-3 py-[10px] text-[13px] bg-transparent
                  outline-none transition-all
                  placeholder:text-[#a0aec0]
                  disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ color: textColor }}
          />
        )}
        {!multiline && rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            tabIndex={-1}
            className="pr-3 text-[#a0aec0] hover:text-[#041E66] transition-colors shrink-0"
          >
            {rightIcon}
          </button>
        )}
      </div>

      {/* ── Error message ── */}
      {error && errorMessage && (
        <p className="text-[11px] mt-1 text-red-500 font-medium">{errorMessage}</p>
      )}

      {/* ── Character count (shown below, outside error wrapper) ── */}
      {showCount && maxLength !== undefined && (
        <p
          className={`text-[11px] mt-1 text-right
                       ${remaining <= 10 ? 'text-red-400' : 'text-[#a0aec0]'}`}
        >
          {value?.length || 0} / {maxLength}
        </p>
      )}
    </div>
  )
}

export default Input
