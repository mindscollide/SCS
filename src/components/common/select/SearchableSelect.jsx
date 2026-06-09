/**
 * src/components/common/select/SearchableSelect.jsx
 * ===================================================
 * Searchable (combobox-style) dropdown — the standard dropdown component for the app.
 * Typing in the input filters the option list in real time. Select.jsx is the legacy
 * native-<select> alternative (kept for compat only — prefer this component).
 *
 * Props:
 *  value            {string|number} — controlled selected value
 *  onChange         {Function}      — called with the raw option value on selection.
 *                                     ⚠️ Unlike Select.jsx (which always emits a string via
 *                                     e.target.value), this component emits the raw o.value —
 *                                     so if options are [{label:'X', value:3}] the callback
 *                                     receives the number 3, not the string "3".
 *                                     Use Number() coercion in API calls to be safe.
 *                                     Deselect emits onChange('').
 *  options          {Array}         — string[] or [{ label, value }].
 *                                     Strings are normalised to { label: s, value: s }.
 *  placeholder      {string}        — shown when no value is selected (default: "-- Select --")
 *  label            {string}        — label text shown above the control
 *  required         {boolean}       — shows red asterisk next to label
 *  error            {boolean}       — true = red border
 *  errorMessage     {string}        — message shown below when error is true
 *  disabled         {boolean}       — disables the control
 *  className        {string}        — extra Tailwind classes for the outer wrapper div
 *  bgColor          {string}        — background color (default: "#ffffff")
 *  borderColor      {string}        — idle border color (default: "#e2e8f0")
 *  focusBorderColor {string}        — border color when open/focused (default: "#01C9A4")
 *  textColor        {string}        — selected-value text color (default: "#041E66")
 *  arrowColor       {string}        — dropdown arrow color (default: "#a0aec0")
 *  zIndex           {number}        — z-index of the dropdown list (default: 9999)
 *  usePortal        {boolean}       — render dropdown via portal to escape overflow:hidden
 *                                     parents (default: true). Set false to use in-flow
 *                                     positioning (original behaviour).
 *
 * Implementation notes:
 *  - Options are clicked via onMouseDown (not onClick) so the handler fires before the
 *    input's onBlur, preventing a race condition where the list closes before the click
 *    is registered.
 *  - Outside-click detection uses composedPath() instead of contains(e.target). React 18
 *    flushes state synchronously after its root handler, removing the clicked <li> from the
 *    DOM before document.mousedown fires. contains() would return false for the detached node
 *    and wrongly close the dropdown. composedPath() is captured at dispatch time and is
 *    unaffected by subsequent DOM mutations.
 *  - Selected-value matching uses String(o.value) === String(value) so numeric values stored
 *    as strings (or vice-versa) still highlight the correct option.
 *  - Portal mode (usePortal=true): the <ul> is rendered into document.body via
 *    ReactDOM.createPortal and positioned with fixed coords from getBoundingClientRect().
 *    A scroll/resize listener keeps it anchored while the dropdown is open.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import ReactDOM from 'react-dom'

const SearchableSelect = ({
  allowClear = true,
  value,
  onChange,
  options = [],
  placeholder = '-- Select --',
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
  zIndex = 9999,
  usePortal = true,
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 })
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Normalise options to { label, value } regardless of input shape
  const normalised = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o)),
    [options]
  )

  // The display label for the currently selected value
  const selectedLabel = useMemo(
    () => normalised.find((o) => String(o.value) === String(value))?.label ?? '',
    [normalised, value]
  )

  // Filtered list based on what the user typed
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return normalised
    return normalised.filter((o) => o.label.toLowerCase().includes(q))
  }, [normalised, query])

  // Compute and update the portal dropdown position from the wrapper's bounding rect
  const updateCoords = useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setDropdownCoords({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    })
  }, [])

  // Close when clicking outside.
  useEffect(() => {
    const handleOutside = (e) => {
      const path = e.composedPath ? e.composedPath() : []
      const clickedInsideWrapper = wrapperRef.current && path.includes(wrapperRef.current)
      const clickedInsideList = listRef.current && path.includes(listRef.current)
      if (!clickedInsideWrapper && !clickedInsideList) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Keep portal list anchored on scroll or resize
  useEffect(() => {
    if (!open || !usePortal) return
    const update = () => updateCoords()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, usePortal, updateCoords])

  const openDropdown = useCallback(() => {
    if (disabled) return
    updateCoords()
    setOpen(true)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [disabled, updateCoords])

  const handleSelect = useCallback(
    (optValue) => {
      onChange(optValue)
      setOpen(false)
      setQuery('')
    },
    [onChange]
  )

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation()
      onChange('')
      setOpen(false)
      setQuery('')
    },
    [onChange]
  )

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }, [])

  const baseBorderColor = error ? '#f87171' : borderColor
  const baseArrowColor = error ? '#f87171' : arrowColor

  // ── Dropdown list (shared between portal and in-flow modes) ──────────────
  const dropdownList = (
    <ul
      ref={listRef}
      onMouseDown={(e) => e.stopPropagation()} // ← add this
      className="rounded-lg border border-slate-200 bg-white shadow-lg overflow-y-auto max-h-52 py-1"
      style={
        usePortal
          ? {
              position: 'absolute',
              top: dropdownCoords.top + 4,
              left: dropdownCoords.left,
              width: dropdownCoords.width,
              zIndex,
            }
          : {
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              zIndex,
            }
      }
    >
      {allowClear && !!value && (
        <li
          onMouseDown={handleClear}
          className="px-3 py-2 text-[12px] text-slate-400 italic cursor-pointer hover:bg-slate-50 transition-colors"
        >
          — Clear selection —
        </li>
      )}

      {filtered.length === 0 ? (
        <li className="px-3 py-2 text-[12px] text-slate-400 italic">No options found</li>
      ) : (
        filtered.map((o) => {
          const isSelected = String(o.value) === String(value)
          return (
            <li
              key={o.value}
              onMouseDown={() => handleSelect(o.value)}
              className={`px-3 py-[9px] text-[13px] cursor-pointer transition-colors
                ${
                  isSelected
                    ? 'bg-[#01C9A4]/10 text-[#01C9A4] font-semibold'
                    : 'text-[#041E66] hover:bg-slate-50'
                }`}
            >
              <HighlightMatch text={o.label} query={query} />
            </li>
          )
        })
      )}
    </ul>
  )

  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className={`relative ${error && errorMessage ? 'pb-4' : ''}`}>
        {/* ── Trigger (closed state) ── */}
        {!open && (
          <div
            onClick={openDropdown}
            className={`w-full flex items-center justify-between
              px-3 py-[10px] pr-9 rounded-lg text-[13px]
              border outline-none cursor-pointer transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'border-red-400 bg-white' : ''}`}
            style={
              error
                ? {}
                : {
                    backgroundColor: bgColor,
                    borderColor: baseBorderColor,
                    color: selectedLabel ? textColor : '#a0aec0',
                  }
            }
          >
            <span className="truncate">
              {selectedLabel || <span style={{ color: '#a0aec0' }}>{placeholder}</span>}
            </span>
          </div>
        )}

        {/* ── Open state: search input ── */}
        {open && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search…"
            className={`w-full px-3 py-[10px] pr-9 rounded-lg text-[13px]
              border outline-none transition-all
              ${error ? 'border-red-400 bg-white' : ''}`}
            style={
              error
                ? { color: textColor }
                : {
                    backgroundColor: bgColor,
                    borderColor: focusBorderColor,
                    color: textColor,
                  }
            }
          />
        )}

        {/* ── In-flow dropdown (usePortal=false) ── */}
        {open && !usePortal && dropdownList}

        {/* Arrow */}
        {!open && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{ color: baseArrowColor }}
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
        )}

        {/* Error message */}
        {error && errorMessage && (
          <p className="absolute top-full left-0 mt-1 text-[11px] text-red-500 font-medium">
            {errorMessage}
          </p>
        )}
      </div>

      {/* ── Portal dropdown (usePortal=true, default) ── */}
      {open && usePortal && ReactDOM.createPortal(dropdownList, document.body)}
    </div>
  )
}

// ── Internal helper: bold the matching part of each option label ──────────────
const HighlightMatch = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold">{text.slice(idx, idx + query.trim().length)}</span>
      {text.slice(idx + query.trim().length)}
    </>
  )
}

export default SearchableSelect
