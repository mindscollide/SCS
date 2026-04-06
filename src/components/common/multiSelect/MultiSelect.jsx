/**
 * MultiSelect.jsx
 * ================
 * Reusable multi-selection dropdown with checkboxes — matches the SCS design system.
 *
 * Props:
 *  label       {string}   — label shown above the dropdown
 *  required    {boolean}  — shows red asterisk next to label
 *  options     {Array}    — [{ label, value }] items to display
 *  selected    {Array}    — array of currently selected values (controlled)
 *  onChange    {Function} — called with new selected array on change
 *  disabled    {boolean}  — disables the dropdown (default: false)
 *  placeholder {string}   — placeholder text when nothing selected (default: "-- Select --")
 *  helperText  {string}   — small text below dropdown (default: "Multiple selection allowed")
 *
 * Usage:
 *  import MultiSelect from "../../components/common/multiSelect/MultiSelect";
 *
 *  const [selected, setSelected] = useState([]);
 *
 *  <MultiSelect
 *    label="Companies"
 *    required
 *    options={[{ label: "Abbot Laboratories", value: 1 }, { label: "MCB Bank", value: 2 }]}
 *    selected={selected}
 *    onChange={setSelected}
 *  />
 *
 *  // Disabled until a sector is chosen
 *  <MultiSelect
 *    label="Companies"
 *    required
 *    options={sectorCompanies}
 *    selected={selectedCompanies}
 *    onChange={setSelectedCompanies}
 *    disabled={!sectorSelected}
 *  />
 */

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const MultiSelect = ({
  label = "",
  required = false,
  options = [],
  selected = [],
  onChange,
  disabled = false,
  placeholder = "-- Select --",
  helperText = "",          // default empty — pass explicitly when needed
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const allSelected = options.length > 0 && selected.length === options.length;
  const hasSelection = selected.length > 0;
  const displayText = allSelected
    ? `All ${options.length} Item(s)`
    : `${selected.length} Item(s)`;

  const toggleAll = () =>
    onChange(allSelected ? [] : options.map((o) => o.value));

  const toggleOne = (value) =>
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );

  return (
    <div ref={ref} className="w-full">
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
          disabled={disabled}
          onClick={() => !disabled && setOpen((p) => !p)}
          className={`w-full flex items-center justify-between px-3 py-[10px] rounded-lg border
                     text-[13px] text-left transition-all
                     ${
                       disabled
                         ? "opacity-50 cursor-not-allowed bg-[#f8f9ff] border-[#e2e8f0]"
                         : open
                         ? "bg-white border-[#01C9A4] shadow-[0_0_0_3px_rgba(1,201,164,0.12)] cursor-pointer"
                         : "bg-white border-[#e2e8f0] hover:border-[#01C9A4] cursor-pointer"
                     }`}
        >
          <span
            className={hasSelection ? "text-[#041E66] font-medium" : "text-[#a0aec0]"}
          >
            {hasSelection ? displayText : placeholder}
          </span>
          <ChevronDown
            size={14}
            className={`text-[#a0aec0] transition-transform shrink-0 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown list */}
        {open && (
          <div
            className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#dde4ee]
                       rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-[100]
                       max-h-[200px] overflow-y-auto"
          >
            {/* Select All row */}
            <label
              className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer
                         hover:bg-[#f8f9ff] border-b border-[#eef2f7] transition-colors"
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-3.5 h-3.5 rounded accent-[#01C9A4]"
              />
              <span className="text-[13px] font-semibold text-[#041E66]">
                Select All
              </span>
            </label>

            {/* Individual options */}
            {options.map((o) => (
              <label
                key={o.value}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer
                           hover:bg-[#f8f9ff] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggleOne(o.value)}
                  className="w-3.5 h-3.5 rounded accent-[#01C9A4]"
                />
                <span className="text-[13px] text-[#041E66]">{o.label}</span>
              </label>
            ))}
          </div>
        )}

      </div>

      {/* Helper text — in-flow, shown only when explicitly passed */}
      {helperText && (
        <p className="text-[11px] text-[#a0aec0] mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default MultiSelect;
