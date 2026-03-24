import React, { useState, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

// ── SearchBar ─────────────────────────────────────────
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
                    focus-within:border-teal focus-within:shadow-[0_0_0_3px_rgba(0,184,148,0.12)]
                    transition-all duration-150"
    >
      <Search size={15} className="text-[#a0aec0] shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border-none outline-none bg-transparent text-[13px]
                   text-navy placeholder:text-[#a0aec0]"
      />
    </div>
    {onFilterClick && (
      <button
        onClick={onFilterClick}
        className="w-9 h-9 flex items-center justify-center rounded-[8px]
                   bg-navy text-white hover:bg-[#132e57] transition-colors shrink-0"
      >
        <SlidersHorizontal size={16} />
      </button>
    )}
  </div>
);

// ── StatusText ────────────────────────────────────────
export const StatusText = ({ status }) => {
  const colors = {
    Active: "text-teal",
    Inactive: "text-danger",
    "In-Active": "text-danger",
    "In Progress": "text-blue",
    "Pending For Approval": "text-gold",
    Approved: "text-teal",
    Declined: "text-danger",
    Compliant: "text-teal",
    "Non-Compliant": "text-danger",
  };
  return (
    <span
      className={`text-[13px] font-semibold ${colors[status] || "text-slate"}`}
    >
      {status}
    </span>
  );
};

// ── StatusBadge (alias for StatusText) ───────────────
export const StatusBadge = StatusText;

// ── SortHeader ────────────────────────────────────────
export const SortHeader = ({ label, className = "" }) => (
  <th
    className={`px-4 py-3 text-left text-[12px] font-semibold text-slate
                  bg-[#EEF2F7] whitespace-nowrap cursor-pointer
                  hover:text-navy transition-colors ${className}`}
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

// ── SortIcon (inline version) ─────────────────────────
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

// ── ConfirmModal ──────────────────────────────────────
export const ConfirmModal = ({ open, message, onYes, onNo }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-5"
      onClick={onNo}
    >
      <div
        className="bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.16)]
                   w-full max-w-sm px-6 pt-7 pb-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[14px] text-navy leading-relaxed mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onNo}
            className="px-7 py-[9px] border border-[#d8e0ea] rounded-[8px] text-[13px]
                       font-medium text-navy hover:bg-[#EEF2F7] transition-colors"
          >
            No
          </button>
          <button
            onClick={onYes}
            className="px-7 py-[9px] bg-blue text-white rounded-[8px] text-[13px]
                       font-semibold hover:bg-[#1650a8] transition-colors"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

// ── PageHeader ────────────────────────────────────────
export const PageHeader = ({ title, actions }) => (
  <div className="flex items-center justify-between mb-5 gap-4">
    <h1 className="text-[40px] font-semibold text-[#0B39B5]">{title}</h1>
    {actions && (
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    )}
  </div>
);

// ── ExportBtn ─────────────────────────────────────────
export const ExportBtn = ({ onExcel, onPdf, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-4 py-[9px] bg-teal text-white
                   rounded-[8px] text-[13px] font-semibold hover:bg-[#00a07e]
                   disabled:opacity-40 transition-colors"
      >
        Export
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+4px)] right-0 w-[130px]
                        bg-white border border-[#d8e0ea] rounded-[8px]
                        shadow-[0_1px_4px_rgba(0,0,0,0.06)] z-50 py-1"
        >
          <button
            onClick={() => {
              onExcel?.();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                       text-navy hover:bg-[#EEF2F7] transition-colors"
          >
            <FileSpreadsheet size={14} className="text-teal" /> Excel
          </button>
          <button
            onClick={() => {
              onPdf?.();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                       text-navy hover:bg-[#EEF2F7] transition-colors"
          >
            <FileText size={14} className="text-danger" /> PDF
          </button>
        </div>
      )}
    </div>
  );
};

// ── BtnPrimary ────────────────────────────────────────
export const BtnPrimary = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-semibold text-white
                transition-colors
                ${
                  disabled
                    ? "bg-slate cursor-not-allowed opacity-70"
                    : "bg-blue hover:bg-[#1650a8] cursor-pointer"
                } ${className}`}
  >
    {children}
  </button>
);

// ── BtnSlate ──────────────────────────────────────────
export const BtnSlate = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-medium text-navy
                border border-[#d8e0ea] bg-white
                hover:bg-[#EEF2F7] transition-colors ${className}`}
  >
    {children}
  </button>
);

// ── BtnGold ───────────────────────────────────────────
export const BtnGold = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-semibold text-white
                bg-gold hover:bg-[#e09a1a] transition-colors ${className}`}
  >
    {children}
  </button>
);

// ── BtnTeal ───────────────────────────────────────────
export const BtnTeal = ({ children, onClick, disabled, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-5 py-[9px] rounded-[8px] text-[13px] font-semibold text-white
                transition-colors
                ${
                  disabled
                    ? "bg-slate cursor-not-allowed opacity-70"
                    : "bg-teal hover:bg-[#00a07e] cursor-pointer"
                } ${className}`}
  >
    {children}
  </button>
);
