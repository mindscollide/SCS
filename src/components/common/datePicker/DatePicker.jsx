/**
 * src/components/common/datePicker/DatePicker.jsx
 * =================================================
 * Reusable custom calendar date picker — no external libraries.
 *
 * Features:
 *  - Month/year navigation with prev/next arrows
 *  - Today's date highlighted with teal border ring
 *  - Selected date filled teal
 *  - Greyed-out days from prev/next month (non-selectable)
 *  - Date displayed in "09 Apr 2026" format
 *  - Optional red error state on the input
 *  - Closes on outside click
 *
 * Props:
 *  value       {Date|null}  — controlled selected date (null = empty)
 *  onChange    {Function}   — called with Date object on selection
 *  placeholder {string}     — shown when no date selected (default: "dd mmm yyyy")
 *  error       {string}     — optional error message shown below input
 *
 * Usage:
 *  import DatePicker from "../../components/common/DatePicker";
 *
 *  const [date, setDate] = useState(null);
 *
 *  <DatePicker
 *    value={date}
 *    onChange={(d) => setDate(d)}
 *    placeholder="Select date"
 *    error={dateError}
 *  />
 */

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/** Format a Date object → "09 Apr 2026" string */
export const formatDate = (d) =>
  d
    ? `${String(d.getDate()).padStart(2, '0')} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`
    : ''

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const DatePicker = ({ value, onChange, placeholder = 'dd mmm yyyy', error }) => {
  // ── Internal state ────────────────────────────────────
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(value ? value.getMonth() : new Date().getMonth())
  const [year, setYear] = useState(value ? value.getFullYear() : new Date().getFullYear())

  const ref = useRef(null)

  // ── Close on outside click ────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Sync internal month/year when value prop changes externally
  useEffect(() => {
    if (value) {
      setMonth(value.getMonth())
      setYear(value.getFullYear())
    }
  }, [value])

  // ── Calendar grid calculation ────────────────────────
  const today = new Date()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMon = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  /** Build 42-cell grid: prev-month tail + current month + next-month head */
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: daysInPrev - firstDay + i + 1, cur: false })
  for (let i = 1; i <= daysInMon; i++) cells.push({ day: i, cur: true })
  while (cells.length < 42) cells.push({ day: cells.length - firstDay - daysInMon + 1, cur: false })

  // ── Month navigation ──────────────────────────────────
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  // ── Day selection ─────────────────────────────────────
  const select = (cell) => {
    if (!cell.cur) return
    onChange(new Date(year, month, cell.day))
    setOpen(false)
  }

  // ── Cell state helpers ────────────────────────────────
  const isSelected = (cell) =>
    value &&
    cell.cur &&
    value.getDate() === cell.day &&
    value.getMonth() === month &&
    value.getFullYear() === year

  const isToday = (cell) =>
    cell.cur &&
    today.getDate() === cell.day &&
    today.getMonth() === month &&
    today.getFullYear() === year

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger input ── */}
      <div
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center justify-between px-3 py-[10px] rounded-lg
            cursor-pointer transition-all select-none
            ${
              error
                ? 'border border-red-400 bg-white'
                : 'bg-white border border-slate-200 focus:border-[#01C9A4]'
            }`}
      >
        <span className={`text-[13px] ${value ? 'text-[#041E66]' : 'text-[#a0aec0]'}`}>
          {value ? formatDate(value) : placeholder}
        </span>
        <Calendar size={15} className={error ? 'text-red-400' : 'text-[#a0aec0]'} />
      </div>

      {/* Error message */}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}

      {/* ── Calendar popup ── */}
      {open && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 z-50 bg-white rounded-xl
                     border border-[#dde4ee] shadow-[0_4px_20px_rgba(0,0,0,0.12)]
                     p-4 w-[280px]"
        >
          {/* Month / Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         hover:bg-[#EFF3FF] text-[#041E66] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[14px] font-semibold text-[#0B39B5]">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         hover:bg-[#EFF3FF] text-[#041E66] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-[#a0aec0] py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => (
              <button
                key={i}
                onClick={() => select(cell)}
                className={`h-8 w-full rounded-lg text-[13px] transition-colors
                  ${!cell.cur ? 'text-[#d0d7e3] cursor-default' : 'cursor-pointer'}
                  ${isSelected(cell) ? 'bg-[#01C9A4] text-white font-semibold' : ''}
                  ${
                    isToday(cell) && !isSelected(cell)
                      ? 'border border-[#01C9A4] text-[#01C9A4] font-semibold'
                      : ''
                  }
                  ${
                    cell.cur && !isSelected(cell) && !isToday(cell)
                      ? 'hover:bg-[#EFF3FF] text-[#041E66]'
                      : ''
                  }
                `}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
