/**
 * src/components/common/index.jsx
 * =================================
 * Central export file for all shared/reusable UI components.
 *
 * Exports
 * ────────
 * SearchBar       — main search input with optional filter icon
 * StatusText      — coloured status label (Active, Inactive, etc.)
 * StatusBadge     — alias for StatusText
 * SortHeader      — sortable <th> element
 * SortIcon        — inline sort chevrons
 * SortIconTable   — A↑Z / A↓Z sort icon used in CommonTable
 * ConfirmModal    — "Are you sure?" modal with Yes/No buttons
 * PageHeader      — page title + optional action buttons
 * ExportBtn       — Export dropdown (Excel / PDF) with callbacks
 *
 * Buttons (all from buttons/Buttons.jsx):
 * BtnPrimary      — solid blue  (#0B39B5)
 * BtnDark         — solid purple (#2f20b0)
 * BtnGold         — solid gold  (#F5A623)
 * BtnTeal         — solid teal  (#01C9A4)
 * BtnGreen        — solid green (#00B894)  auth pages
 * BtnSlate        — outlined grey
 * BtnIconEdit     — ghost icon, navy hover
 * BtnIconDelete   — ghost icon, red hover
 * BtnIconGroup    — ghost icon, gold hover
 * BtnIconApprove  — emerald icon
 * BtnIconDecline  — red icon
 * BtnModalClose   — modal header X
 * BtnChipRemove   — chip X remove
 * BtnClearAll     — "Clear All" orange link
 * BtnReasonChip   — outlined pill chip
 *
 * MultiSelect     — multi-selection dropdown with checkboxes
 * ScrollTabs      — horizontally scrollable pill-tab row with arrow navigation
 * ROLE_OPTIONS    — ["Admin", "Manager", "Data Entry"]
 * STATUS_OPTIONS  — ["Active", "In-Active"]
 *
 * Usage:
 *  import { ConfirmModal, BtnPrimary, BtnDark, BtnIconEdit } from "../../components/common";
 */

import React, { useState, useRef } from 'react'
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  ArrowUpAZ,
  ArrowDownZA,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON COMPONENTS — all defined in buttons/Buttons.jsx
// Imported locally so ConfirmModal (below) can reference BtnPrimary & BtnGold,
// then re-exported so every page can consume them from this barrel.
// ─────────────────────────────────────────────────────────────────────────────
import {
  BtnPrimary,
  BtnDark,
  BtnGold,
  BtnTeal,
  BtnGreen,
  BtnSlate,
  BtnIconEdit,
  BtnIconDelete,
  BtnIconGroup,
  BtnIconApprove,
  BtnIconDecline,
  BtnModalClose,
  BtnChipRemove,
  BtnClearAll,
  BtnReasonChip,
} from './buttons/Buttons'

export {
  BtnPrimary,
  BtnDark,
  BtnGold,
  BtnTeal,
  BtnGreen,
  BtnSlate,
  BtnIconEdit,
  BtnIconDelete,
  BtnIconGroup,
  BtnIconApprove,
  BtnIconDecline,
  BtnModalClose,
  BtnChipRemove,
  BtnClearAll,
  BtnReasonChip,
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH BAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main search input with optional filter icon button.
 *
 * Props:
 *  value        {string}   — controlled input value
 *  onChange     {Function} — called with new string value on change
 *  placeholder  {string}   — input placeholder text
 *  onFilterClick {Function}— optional: called when filter icon clicked
 */
export const SearchBar = ({ value, onChange, placeholder = 'Search by name', onFilterClick }) => (
  <div className="flex items-center gap-2">
    <div
      className="flex items-center bg-white border border-[#d8e0ea] rounded-[8px]
                 px-3 py-[8px] gap-2 min-w-[220px]
                 focus-within:border-[#01C9A4]
                 focus-within:shadow-[0_0_0_3px_rgba(1,201,164,0.12)]
                 transition-all duration-150"
    >
      <Search size={15} className="text-[#a0aec0] shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border-none outline-none bg-transparent text-[13px]
                   text-[#041E66] placeholder:text-[#a0aec0]"
      />
    </div>
    {onFilterClick && (
      <button
        onClick={onFilterClick}
        className="w-9 h-9 flex items-center justify-center rounded-[8px]
                   bg-[#041E66] text-white hover:bg-[#0B39B5]
                   transition-colors shrink-0"
      >
        <SlidersHorizontal size={16} />
      </button>
    )}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TEXT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Coloured status label — maps status strings to brand colours.
 *
 * Props:
 *  status {string} — e.g. "Active", "In-Active", "Approved", "Declined"
 */
export const StatusText = ({ status }) => {
  const colors = {
    Active: 'text-[#01C9A4]',
    Inactive: 'text-[#E74C3C]',
    'In-Active': 'text-[#E74C3C]',
    'In Progress': 'text-[#0B39B5]',
    'Pending For Approval': 'text-[#F5A623]',
    Approved: 'text-[#01C9A4]',
    Declined: 'text-[#E74C3C]',
    Compliant: 'text-[#01C9A4]',
    'Non-Compliant': 'text-[#E74C3C]',
  }
  return (
    <span className={`text-[13px] font-semibold ${colors[status] || 'text-[#a0aec0]'}`}>
      {status}
    </span>
  )
}

/** Alias for StatusText */
export const StatusBadge = StatusText

// ─────────────────────────────────────────────────────────────────────────────
// SORT HEADER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sortable <th> element with up/down chevron icons.
 *
 * Props:
 *  label     {string} — column header text
 *  className {string} — additional Tailwind classes
 */
export const SortHeader = ({ label, className = '' }) => (
  <th
    className={`px-4 py-3 text-left text-[12px] font-semibold text-[#041E66]
                bg-[#EFF3FF] whitespace-nowrap cursor-pointer
                hover:text-[#0B39B5] transition-colors ${className}`}
  >
    <span className="flex items-center gap-1">
      {label}
      <svg
        width="12"
        height="14"
        viewBox="0 0 12 14"
        fill="none"
        className="shrink-0 text-[#a0aec0]"
      >
        <path d="M6 1L9 5H3L6 1Z" fill="currentColor" opacity=".5" />
        <path d="M6 13L3 9H9L6 13Z" fill="currentColor" opacity=".5" />
      </svg>
    </span>
  </th>
)

// ─────────────────────────────────────────────────────────────────────────────
// SORT ICON (inline)
// ─────────────────────────────────────────────────────────────────────────────

/** Inline ↑↓ sort chevron SVG — use inside any element. */
export const SortIcon = () => (
  <svg
    width="12"
    height="14"
    viewBox="0 0 12 14"
    fill="none"
    className="inline ml-1 shrink-0 text-[#a0aec0]"
  >
    <path d="M6 1L9 5H3L6 1Z" fill="currentColor" opacity=".5" />
    <path d="M6 13L3 9H9L6 13Z" fill="currentColor" opacity=".5" />
  </svg>
)

// ─────────────────────────────────────────────────────────────────────────────
// SORT ICON TABLE (A↑Z / A↓Z) — used in CommonTable header
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort direction icon for table column headers.
 * Shows A↑Z (asc), A↓Z (desc), or greyed A↓Z (unsorted).
 *
 * Props:
 *  col     {string} — this column's key
 *  sortCol {string} — currently sorted column key
 *  sortDir {string} — "asc" | "desc"
 */
export const SortIconTable = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col)
    return (
      <span className="inline-flex flex-col ml-1 opacity-40">
        <ArrowDownZA className="w-[23px] h-[32.5px] -mt-[2px]" />
      </span>
    )
  return sortDir === 'asc' ? (
    <ArrowUpAZ className="inline ml-1 w-[23px] h-[32.5px] text-[#01C9A4]" />
  ) : (
    <ArrowDownZA className="inline ml-1 w-[23px] h-[32.5px] text-[#01C9A4]" />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic confirmation dialog with "Confirmation" teal heading,
 * a message, and Yes (blue) + No (gold) buttons.
 *
 * Props:
 *  open    {boolean}  — whether modal is visible
 *  message {string}   — body text shown to the user
 *  onYes   {Function} — called when Yes is clicked
 *  onNo    {Function} — called when No is clicked or backdrop is clicked
 */
export const ConfirmModal = ({ open, message, onYes, onNo }) => {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-5"
      onClick={onNo}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm
                   px-8 pt-8 pb-7 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[22px] font-bold text-[#0B39B5] mb-4">Confirmation</h2>
        <p className="text-[14px] text-[#000] leading-relaxed mb-7">{message}</p>
        <div className="flex justify-center gap-3">
          <BtnPrimary size="xl" onClick={onYes}>Yes</BtnPrimary>
          <BtnGold    size="xl" onClick={onNo}>No</BtnGold>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Page title row with optional action buttons on the right.
 *
 * Props:
 *  title   {string}  — page heading text
 *  actions {ReactNode} — optional buttons / controls shown on the right
 */
export const PageHeader = ({ title, actions }) => (
  <div className="flex items-center justify-between mb-5 gap-4">
    <h1 className="text-[26px] font-[400] text-[#0B39B5]">{title}</h1>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT BUTTON (callback-based)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dropdown export button with Excel and PDF options.
 * Calls onExcel / onPdf callbacks — you handle the actual export logic.
 *
 * Props:
 *  onExcel  {Function} — called when Excel is clicked
 *  onPdf    {Function} — called when PDF is clicked
 *  disabled {boolean}  — disables the button
 */
export const ExportBtn = ({ onExcel, onPdf, disabled }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-4 py-[9px] bg-[#01C9A4] text-white
                   rounded-[8px] text-[13px] font-semibold hover:bg-[#00a888]
                   disabled:opacity-40 transition-colors"
      >
        Export
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+4px)] right-0 w-[130px]
                     bg-white border border-[#dde4ee] rounded-[8px]
                     shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-50 py-1"
        >
          <button
            onClick={() => {
              onExcel?.()
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                       text-[#041E66] hover:bg-[#EFF3FF] transition-colors"
          >
            <FileSpreadsheet size={14} className="text-[#01C9A4]" /> Excel
          </button>
          <button
            onClick={() => {
              onPdf?.()
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                       text-[#041E66] hover:bg-[#EFF3FF] transition-colors"
          >
            <FileText size={14} className="text-[#E74C3C]" /> PDF
          </button>
        </div>
      )}
    </div>
  )
}

// Buttons are defined in ./buttons/Buttons.jsx and re-exported at the top of this file.

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS FROM SEPARATE FILES
// ─────────────────────────────────────────────────────────────────────────────

export { default as MultiSelect } from './multiSelect/MultiSelect.jsx'
export { default as ScrollTabs } from './scrollTabs/ScrollTabs.jsx'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Role options used in dropdowns and filter panels across the app */
export const ROLE_OPTIONS = ['Admin', 'Manager', 'Data Entry']

/** Status options used in dropdowns and filter panels across the app */
export const STATUS_OPTIONS = ['Active', 'In-Active']

// ─────────────────────────────────────────────────────────────────────────────
// CHECKBOX
// ─────────────────────────────────────────────────────────────────────────────

export { default as Checkbox } from './Checkbox/Checkbox'

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

export { default as Toggle } from './Toggle/Toggle'
