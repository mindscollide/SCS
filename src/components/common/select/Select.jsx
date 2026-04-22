/**
 * src/components/common/select/Select.jsx
 * =========================================
 * Reusable styled select dropdown — matches the SCS design system.
 *
 * Props:
 *  value       {string}   — controlled selected value
 *  onChange    {Function} — called with new string value on change
 *  options     {Array}    — string[] or [{ label, value }]
 *  placeholder {string}   — default empty option text (default: "-- Select --")
 *  label        {string}  — label text shown above the select
 *  required     {boolean} — shows red asterisk next to label
 *  error        {boolean} — true = red border + white bg
 *  errorMessage {string}  — message shown below input when error is true
 *  disabled     {boolean} — disables the select
 *  className        {string} — extra Tailwind classes for the wrapper div
 *  bgColor          {string} — background color (default: "#ffffff")
 *  borderColor      {string} — border color (default: "#e2e8f0")
 *  focusBorderColor {string} — border color on focus (default: "#01C9A4")
 *  textColor        {string} — text color (default: "#041E66")
 *  arrowColor       {string} — dropdown arrow color (default: "#a0aec0")
 *
 * Usage:
 *  import Select from "../../components/common/Select";
 *
 *  // Simple string array
 *  <Select
 *    value={form.role}
 *    onChange={(v) => set("role", v)}
 *    options={["Admin", "Manager", "Data Entry"]}
 *    error={!!errors.role}
 *  />
 *
 *  // Label/value pairs
 *  <Select
 *    value={form.status}
 *    onChange={(v) => set("status", v)}
 *    options={[{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]}
 *    placeholder="Select status"
 *  />
 */

import React from 'react'

const Select = ({
  value,
  onChange,
  options = [],
  placeholder = '-- Select --',
  showPlaceholder = true,
  label = '',
  required = false,
  error = false,
  errorMessage = '',
  disabled = false,
  className = '',
  bgColor = '#ffffff',
  borderColor = '#e2e8f0',
  focusBorderColor = '#01C9A4',
  textColor = '#041E66',
  arrowColor = '#a0aec0',
}) => {
  /**
   * Normalise options to { label, value } shape regardless of
   * whether strings or objects were passed.
   */
  const normalised = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o))

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className={`relative ${error && errorMessage ? 'pb-4' : ''}`}>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-[10px] pr-9 rounded-lg text-[13px]
              outline-none transition-all appearance-none cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border border-red-400 bg-white' : 'border'}`}
          style={
            error
              ? {}
              : {
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  color: textColor,
                  '--focus-border': focusBorderColor,
                }
          }
          onFocus={(e) => {
            if (!error) e.target.style.borderColor = focusBorderColor
          }}
          onBlur={(e) => {
            if (!error) e.target.style.borderColor = borderColor
          }}
        >
          {/* Empty / placeholder option — hidden when showPlaceholder=false */}
          {showPlaceholder && <option value="">{placeholder}</option>}

          {/* Dynamic options */}
          {normalised.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {/* Error message */}
        {error && errorMessage && (
          <p className="absolute top-full left-0 mt-1 text-[11px] text-red-500 font-medium">
            {errorMessage}
          </p>
        )}
        {/* Dropdown arrow icon */}
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ color: error ? '#f87171' : arrowColor }}
            className="transition-colors"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default Select
