/**
 * MultiSelect.jsx
 * ================
 * Reusable multi-select dropdown — matches the SCS design system.
 * Displays a teal badge showing how many items are selected ("All X Items" / "X Items").
 * Supports optional search inside the dropdown panel.
 *
 * Props:
 *  label         {string}    — label shown above the field
 *  required      {boolean}   — shows red asterisk
 *  placeholder   {string}    — shown when nothing is selected (default: "-- Select --")
 *  options       {string[]}  — list of option strings
 *  value         {string[]}  — controlled array of selected values
 *  onChange      {Function}  — called with new string[] on change
 *  showSearch    {boolean}   — show search input inside panel (default: true)
 *  maxSelect     {number}    — max number of selections allowed (default: unlimited)
 *  hint          {string}    — grey hint text below the field
 *  error         {boolean}   — red border when true
 *  errorMessage  {string}    — red error text below field
 *  disabled      {boolean}   — disables the dropdown
 *  className     {string}    — extra wrapper classes
 *
 * Usage:
 *  import MultiSelect from '../../components/common/select/MultiSelect'
 *
 *  // All companies multi-select
 *  <MultiSelect
 *    label="Companies"
 *    required
 *    options={COMPANY_NAMES}
 *    value={selectedCompanies}
 *    onChange={setSelectedCompanies}
 *    hint="Multiple selections allowed"
 *  />
 *
 *  // Quarter select with max 4
 *  <MultiSelect
 *    label="Quarters"
 *    required
 *    options={QUARTER_OPTIONS}
 *    value={selectedQuarters}
 *    onChange={setSelectedQuarters}
 *    maxSelect={4}
 *    hint="Maximum 4 quarters allowed"
 *  />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import Checkbox from '../Checkbox/Checkbox'

// ─────────────────────────────────────────────────────────────────────────────

const MultiSelect = ({
  label        = '',
  required     = false,
  placeholder  = '-- Select --',
  options      = [],
  value        = [],
  onChange,
  showSearch   = true,
  maxSelect,
  hint         = '',
  error        = false,
  errorMessage = '',
  disabled     = false,
  className    = '',
}) => {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)

  // ── Close on outside click ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────
  const filtered    = search.trim()
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options

  const allSelected  = options.length > 0 && value.length === options.length
  const noneSelected = value.length === 0
  const atMax        = maxSelect != null && value.length >= maxSelect

  // ── Badge label ─────────────────────────────────────────────────────────
  const badgeLabel = noneSelected
    ? null
    : allSelected
      ? `All ${value.length} Item${value.length !== 1 ? 's' : ''}`
      : `${value.length} Item${value.length !== 1 ? 's' : ''}`

  // ── Handlers ────────────────────────────────────────────────────────────
  const toggleAll = useCallback(() => {
    onChange(allSelected ? [] : [...options])
  }, [allSelected, options, onChange])

  const toggleOne = useCallback((opt) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt))
    } else {
      if (atMax) return
      onChange([...value, opt])
    }
  }, [value, onChange, atMax])

  const handleTrigger = () => {
    if (!disabled) { setOpen(p => !p); setSearch('') }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`w-full ${className}`} ref={wrapRef}>

      {/* Label */}
      {label && (
        <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleTrigger}
          disabled={disabled}
          className={`w-full flex items-center justify-between px-3 py-[10px] rounded-lg
                      border text-[13px] text-left transition-all bg-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${error
                        ? 'border-red-400'
                        : open
                          ? 'border-[#01C9A4]'
                          : 'border-[#e2e8f0] hover:border-[#01C9A4]'}`}
        >
          <span className="flex items-center gap-2 flex-1 min-w-0">
            {badgeLabel
              ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full
                                 bg-[#01C9A4] text-white text-[12px] font-semibold
                                 whitespace-nowrap shrink-0">
                  {badgeLabel}
                </span>
              )
              : (
                <span className="text-[#a0aec0] truncate">{placeholder}</span>
              )
            }
          </span>
          <ChevronDown
            size={13}
            className={`text-[#a0aec0] shrink-0 ml-2 transition-transform duration-150
                        ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white
                          border border-[#dde4ee] rounded-xl
                          shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-50
                          flex flex-col max-h-[240px]">

            {/* Search */}
            {showSearch && (
              <div className="px-3 pt-3 pb-2 border-b border-[#eef2f7] shrink-0">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full text-[12px] px-2.5 py-[7px] border border-[#dde4ee]
                             rounded-lg outline-none focus:border-[#01C9A4] transition-all
                             text-[#041E66] placeholder:text-[#a0aec0]"
                />
              </div>
            )}

            {/* Options list */}
            <div className="overflow-y-auto">

              {/* Select All — only shown when not searching */}
              {!search.trim() && (
                <label
                  className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#eef2f7]
                             hover:bg-[#EFF3FF] cursor-pointer"
                >
                  <Checkbox
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  <span className="text-[12px] font-semibold text-[#041E66]">Select All</span>
                </label>
              )}

              {/* Individual options */}
              {filtered.map(opt => {
                const selected = value.includes(opt)
                const maxed    = !selected && atMax
                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-2.5 px-3 py-2.5
                                border-b border-[#eef2f7] last:border-0
                                ${maxed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#EFF3FF] cursor-pointer'}`}
                  >
                    <Checkbox
                      checked={selected}
                      onChange={() => !maxed && toggleOne(opt)}
                      disabled={maxed}
                    />
                    <span className="text-[12px] text-[#041E66] leading-snug">{opt}</span>
                  </label>
                )
              })}

              {filtered.length === 0 && (
                <div className="px-3 py-5 text-center text-[12px] text-[#a0aec0]">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint / error text */}
      {error && errorMessage
        ? <p className="text-[11px] mt-1 text-red-500 font-medium">{errorMessage}</p>
        : hint
          ? <p className="text-[11px] mt-1 text-[#a0aec0]">{hint}</p>
          : null
      }
    </div>
  )
}

export default MultiSelect
