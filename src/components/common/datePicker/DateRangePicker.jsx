/**
 * src/components/common/dateRangePicker/DateRangePicker.jsx
 * ==========================================================
 * Reusable custom calendar date-range picker — no external libraries.
 *
 * Features:
 *  - Single trigger input showing "09 Apr 2026 → 22 Apr 2026"
 *  - First click sets start date, second click sets end date
 *  - Hover preview highlights the range before confirming end date
 *  - Range cells highlighted in teal between start and end
 *  - Start/end caps are fully filled teal; in-between days use tinted bg
 *  - Today highlighted with teal ring
 *  - Greyed-out days from adjacent months (non-selectable)
 *  - "Clear" link to reset selection
 *  - Closes on outside click
 *
 * Props:
 *  value       {{ start: Date|null, end: Date|null }}  — controlled selection
 *  onChange    {Function}   — called with { start, end } on each pick
 *  placeholder {string}     — shown when nothing selected
 *  error       {string}     — optional error text shown below input
 *
 * Usage:
 *  import DateRangePicker from "../../components/common/dateRangePicker/DateRangePicker";
 *
 *  const [range, setRange] = useState({ start: null, end: null });
 *
 *  <DateRangePicker
 *    value={range}
 *    onChange={(r) => setRange(r)}
 *    placeholder="Select date range"
 *  />
 */

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

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

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Format a Date → "09 Apr 2026" */
export const formatDate = (d) =>
  d ? `${String(d.getDate()).padStart(2, '0')} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}` : ''

/** Strip time from a Date for safe comparisons */
const stripTime = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null)

const isSameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const isBetween = (d, start, end) => {
  if (!d || !start || !end) return false
  const t = d.getTime()
  const s = start.getTime()
  const e = end.getTime()
  return s < e ? t > s && t < e : t > e && t < s
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const DateRangePicker = ({
  value = { start: null, end: null },
  onChange,
  placeholder = 'Select date range',
  error,
}) => {
  const today = new Date()

  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(value?.start ? value.start.getMonth() : today.getMonth())
  const [year, setYear] = useState(value?.start ? value.start.getFullYear() : today.getFullYear())

  // While user has picked start but not end yet, track hover for preview
  const [hoverDate, setHoverDate] = useState(null)

  // Internal draft while picking
  const [draft, setDraft] = useState({ start: value?.start ?? null, end: value?.end ?? null })

  const ref = useRef(null)

  // ── Sync draft when value prop changes externally ─────
  useEffect(() => {
    setDraft({ start: value?.start ?? null, end: value?.end ?? null })
  }, [value?.start, value?.end])

  // ── Close on outside click ────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Calendar grid ─────────────────────────────────────
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMon = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: daysInPrev - firstDay + i + 1, cur: false })
  for (let i = 1; i <= daysInMon; i++) cells.push({ day: i, cur: true })
  while (cells.length < 42) cells.push({ day: cells.length - firstDay - daysInMon + 1, cur: false })

  // ── Navigation ───────────────────────────────────────
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

  // ── Selection logic ───────────────────────────────────
  const handleSelect = (cell) => {
    if (!cell.cur) return
    const picked = stripTime(new Date(year, month, cell.day))

    if (!draft.start || (draft.start && draft.end)) {
      // Start fresh selection
      const next = { start: picked, end: null }
      setDraft(next)
      onChange?.(next)
    } else {
      // End selection — ensure start <= end
      const [s, e] = picked < draft.start ? [picked, draft.start] : [draft.start, picked]
      const next = { start: s, end: e }
      setDraft(next)
      onChange?.(next)
      setHoverDate(null)
      setOpen(false)
    }
  }

  const handleClear = (e) => {
    e.stopPropagation()
    const empty = { start: null, end: null }
    setDraft(empty)
    onChange?.(empty)
    setHoverDate(null)
  }

  // ── Cell state helpers ────────────────────────────────
  const cellDate = (cell) => (cell.cur ? stripTime(new Date(year, month, cell.day)) : null)

  const effectiveEnd = draft.start && !draft.end && hoverDate ? hoverDate : draft.end

  const isStart = (cell) => cell.cur && isSameDay(cellDate(cell), draft.start)
  const isEnd = (cell) => cell.cur && isSameDay(cellDate(cell), draft.end)
  const isInRange = (cell) => {
    if (!cell.cur) return false
    const d = cellDate(cell)
    return isBetween(d, draft.start, effectiveEnd)
  }
  const isHoverEnd = (cell) => {
    if (!cell.cur || !draft.start || draft.end) return false
    return isSameDay(cellDate(cell), hoverDate)
  }
  const isTodayCell = (cell) =>
    cell.cur &&
    today.getDate() === cell.day &&
    today.getMonth() === month &&
    today.getFullYear() === year

  // ── Trigger label ─────────────────────────────────────
  const label = draft.start
    ? draft.end
      ? `${formatDate(draft.start)} → ${formatDate(draft.end)}`
      : `${formatDate(draft.start)} → ...`
    : null

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger input ── */}
      <div
        onClick={() => setOpen((p) => !p)}
        className={`
          flex items-center justify-between px-3 py-[7px] rounded-[6px]
          cursor-pointer transition-all select-none bg-white
          ${
            error
              ? 'border border-red-400'
              : 'border border-[#dde4ee] focus-within:border-[#01C9A4]'
          }
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-between">
          <span className={`text-[12px] truncate ${label ? 'text-[#041E66]' : 'text-[#a0aec0]'}`}>
            {label ?? placeholder}
          </span>
          <Calendar
            size={14}
            className={error ? 'text-red-400 shrink-0' : 'text-[#a0aec0] shrink-0'}
          />
        </div>

        {/* Clear button */}
        {(draft.start || draft.end) && (
          <button
            onClick={handleClear}
            className="ml-1 shrink-0 text-[#a0aec0] hover:text-[#E74C3C] transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}

      {/* ── Calendar popup ── */}
      {open && (
        <div
          className="
            absolute top-[calc(100%+4px)] left-0 z-50 bg-white rounded-xl
            border border-[#dde4ee] shadow-[0_4px_20px_rgba(0,0,0,0.12)]
            p-4 w-[280px]
          "
        >
          {/* Hint text */}
          <p className="text-[11px] text-[#a0aec0] text-center mb-2">
            {!draft.start
              ? 'Select start date'
              : !draft.end
                ? 'Select end date'
                : 'Click a date to start new range'}
          </p>

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
            {cells.map((cell, i) => {
              const start = isStart(cell)
              const end = isEnd(cell)
              const inRange = isInRange(cell)
              const hEnd = isHoverEnd(cell)
              const todayC = isTodayCell(cell)
              const cap = start || end || hEnd

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(cell)}
                  onMouseEnter={() => {
                    if (draft.start && !draft.end && cell.cur) {
                      setHoverDate(stripTime(new Date(year, month, cell.day)))
                    }
                  }}
                  onMouseLeave={() => {
                    if (!draft.end) setHoverDate(null)
                  }}
                  className={`
                    relative h-8 w-full text-[13px] transition-colors
                    ${!cell.cur ? 'text-[#d0d7e3] cursor-default' : 'cursor-pointer'}

                    ${
                      /* Range background (full-width strip) */
                      inRange ? 'bg-[rgba(1,201,164,0.12)] rounded-none text-[#041E66]' : ''
                    }

                    ${
                      /* Start cap — rounded left */
                      start ? 'rounded-l-lg bg-[#01C9A4] text-white font-semibold' : ''
                    }

                    ${
                      /* End cap — rounded right */
                      end || hEnd ? 'rounded-r-lg bg-[#01C9A4] text-white font-semibold' : ''
                    }

                    ${
                      /* Single selected day (start with no end yet) — fully round */
                      start && !draft.end && !hoverDate ? 'rounded-lg' : ''
                    }

                    ${
                      /* Today ring (when not a cap) */
                      todayC && !cap
                        ? 'border border-[#01C9A4] text-[#01C9A4] font-semibold rounded-lg'
                        : ''
                    }

                    ${
                      /* Default hover for plain current-month days */
                      cell.cur && !cap && !inRange
                        ? 'hover:bg-[#EFF3FF] text-[#041E66] rounded-lg'
                        : ''
                    }
                  `}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Selected range summary */}
          {(draft.start || draft.end) && (
            <div className="mt-3 pt-3 border-t border-[#eef1f7] flex items-center justify-between">
              <span className="text-[11px] text-[#a0aec0]">
                {draft.start && draft.end
                  ? `${formatDate(draft.start)} → ${formatDate(draft.end)}`
                  : draft.start
                    ? `From ${formatDate(draft.start)}`
                    : ''}
              </span>
              <button
                onClick={handleClear}
                className="text-[11px] text-[#E74C3C] hover:underline transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
