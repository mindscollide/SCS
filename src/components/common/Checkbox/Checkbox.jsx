/**
 * Checkbox.jsx
 * =============
 * Reusable styled checkbox — matches the SCS design system.
 *
 * Props:
 *  label          {string}   — optional label text shown to the right
 *  checked        {boolean}  — controlled checked state
 *  onChange       {Function} — called with the change event
 *  onClick        {Function} — optional: called on the container click
 *                              (useful for e.stopPropagation() in table rows)
 *  disabled       {boolean}  — disables the checkbox
 *  accentColor    {string}   — checkbox tick/fill color (default: #01C9A4)
 *  className      {string}   — extra classes for the outer container
 *  labelClassName {string}   — extra classes for the label text span
 *
 * Usage:
 *  import Checkbox from '../../components/common/Checkbox/Checkbox'
 *
 *  // Simple active toggle
 *  <Checkbox
 *    label="Active"
 *    checked={active}
 *    onChange={e => setActive(e.target.checked)}
 *  />
 *
 *  // Custom accent color (gold for "Exception")
 *  <Checkbox
 *    label="Exception by Shariah Advisor"
 *    checked={exception}
 *    onChange={e => setException(e.target.checked)}
 *    accentColor="#F5A623"
 *  />
 *
 *  // Stop row-click propagation in a table
 *  <Checkbox
 *    checked={selected.has(row.id)}
 *    onChange={() => toggleOne(row.id)}
 *    onClick={e => e.stopPropagation()}
 *  />
 */

import React from 'react'

const Checkbox = ({
  label,
  checked = false,
  onChange,
  onClick,
  disabled = false,
  accentColor = '#01C9A4',
  className = '',
  labelClassName = '',
}) => (
  <label
    onClick={onClick}
    className={`inline-flex items-center gap-2 select-none
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                ${className}`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 rounded"
      style={{ accentColor }}
    />
    {label && (
      <span className={`text-[13px] text-[#041E66] ${labelClassName}`}>
        {label}
      </span>
    )}
  </label>
)

export default Checkbox
