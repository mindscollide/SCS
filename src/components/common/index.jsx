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
 * BtnPrimary      — solid blue button
 * BtnSlate        — outlined grey button
 * BtnGold         — solid gold button
 * BtnTeal         — solid teal button
 * ROLE_OPTIONS    — ["Admin", "Manager", "Data Entry"]
 * STATUS_OPTIONS  — ["Active", "In-Active"]
 *
 * Usage:
 *  import { ConfirmModal, BtnPrimary, StatusText } from "../../components/common";
 */

import React, { useState, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  ArrowUpAZ,
  ArrowDownZA,
} from "lucide-react";

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
export const SearchBar = ({
  value,
  onChange,
  placeholder = "Search by name",
  onFilterClick,
}) => (
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
);

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
    Active: "text-[#01C9A4]",
    Inactive: "text-[#E74C3C]",
    "In-Active": "text-[#E74C3C]",
    "In Progress": "text-[#0B39B5]",
    "Pending For Approval": "text-[#F5A623]",
    Approved: "text-[#01C9A4]",
    Declined: "text-[#E74C3C]",
    Compliant: "text-[#01C9A4]",
    "Non-Compliant": "text-[#E74C3C]",
  };
  return (
    <span
      className={`text-[13px] font-semibold ${colors[status] || "text-[#a0aec0]"}`}
    >
      {status}
    </span>
  );
};

/** Alias for StatusText */
export const StatusBadge = StatusText;

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
export const SortHeader = ({ label, className = "" }) => (
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
);

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
);

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
    );
  return sortDir === "asc" ? (
    <ArrowUpAZ className="inline ml-1 w-[23px] h-[32.5px] text-[#01C9A4]" />
  ) : (
    <ArrowDownZA className="inline ml-1 w-[23px] h-[32.5px] text-[#01C9A4]" />
  );
};

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
  if (!open) return null;
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
        <h2 className="text-[22px] font-bold text-[#01C9A4] mb-4">
          Confirmation
        </h2>
        <p className="text-[14px] text-[#041E66] leading-relaxed mb-7">
          {message}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onYes}
            className="px-10 py-[10px] bg-[#0B39B5] hover:bg-[#0a2e94]
                       text-white rounded-lg text-[14px] font-semibold
                       transition-colors"
          >
            Yes
          </button>
          <button
            onClick={onNo}
            className="px-10 py-[10px] bg-[#F5A623] hover:bg-[#e09a1a]
                       text-white rounded-lg text-[14px] font-semibold
                       transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

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
    {actions && (
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    )}
  </div>
);

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
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
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
              onExcel?.();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                       text-[#041E66] hover:bg-[#EFF3FF] transition-colors"
          >
            <FileSpreadsheet size={14} className="text-[#01C9A4]" /> Excel
          </button>
          <button
            onClick={() => {
              onPdf?.();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                       text-[#041E66] hover:bg-[#EFF3FF] transition-colors"
          >
            <FileText size={14} className="text-[#E74C3C]" /> PDF
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Solid blue primary button.
 * Props: children, onClick, disabled, className
 */
export const BtnPrimary = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-semibold text-white
                transition-colors
                ${
                  disabled
                    ? "bg-[#a0aec0] cursor-not-allowed opacity-70"
                    : "bg-[#0B39B5] hover:bg-[#0a2e94] cursor-pointer"
                } ${className}`}
  >
    {children}
  </button>
);

/**
 * Outlined grey/slate button.
 * Props: children, onClick, className
 */
export const BtnSlate = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-medium text-[#041E66]
                border border-[#dde4ee] bg-white
                hover:bg-[#EFF3FF] transition-colors ${className}`}
  >
    {children}
  </button>
);

/**
 * Solid gold button — used for Cancel/Back actions.
 * Props: children, onClick, className
 */
export const BtnGold = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-semibold text-white
                bg-[#F5A623] hover:bg-[#e09a1a] transition-colors ${className}`}
  >
    {children}
  </button>
);

/**
 * Solid teal button — used for primary positive actions.
 * Props: children, onClick, disabled, className
 */
export const BtnTeal = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-semibold text-white
                transition-colors
                ${
                  disabled
                    ? "bg-[#a0aec0] cursor-not-allowed opacity-70"
                    : "bg-[#01C9A4] hover:bg-[#00a888] cursor-pointer"
                } ${className}`}
  >
    {children}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Role options used in dropdowns and filter panels across the app */
export const ROLE_OPTIONS = ["Admin", "Manager", "Data Entry"];

/** Status options used in dropdowns and filter panels across the app */
export const STATUS_OPTIONS = ["Active", "In-Active"];
