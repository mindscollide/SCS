/**
 * src/utils/helpers.js
 * =====================
 * Shared utility constants and helper functions used across the project.
 */

// ─── Regex ────────────────────────────────────────────────────────────────────

/** Basic email format check — use on blur or before API calls */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Password policy — min 8, max 20, at least 1 uppercase, 1 number, 1 special char, no spaces */
export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[^\s]{8,20}$/

// ─── Date helpers ─────────────────────────────────────────────────────────────

const _pad = (n) => String(n).padStart(2, '0')

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const _toDate = (date) => {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  return isNaN(d.getTime()) ? null : d
}

/**
 * API date-time format: YYYYMMDDHHMMSS  (use when time is relevant)
 * e.g. 2026-04-14T10:17:58  →  "20260414101758"
 */
export const toAPIDate = (date) => {
  const d = _toDate(date)
  if (!d) return null
  return (
    `${d.getFullYear()}` +
    `${_pad(d.getMonth() + 1)}` +
    `${_pad(d.getDate())}` +
    `${_pad(d.getHours())}` +
    `${_pad(d.getMinutes())}` +
    `${_pad(d.getSeconds())}`
  )
}

/**
 * API date-only format: YYYYMMDD  (use when only the date matters)
 * e.g. 2026-04-14  →  "20260414"
 */
export const toAPIDateOnly = (date) => {
  const d = _toDate(date)
  if (!d) return null
  return `${d.getFullYear()}${_pad(d.getMonth() + 1)}${_pad(d.getDate())}`
}

/**
 * Display format: "09 Apr 2026"  (use in tables, chips, pickers — everywhere visible to users)
 */
export const toDisplayDate = (date) => {
  const d = _toDate(date)
  if (!d) return '—'
  return `${_pad(d.getDate())} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Smart chip display value.
 * - Date object          → "09 Apr 2026"
 * - "YYYYMMDD" string    → "09 Apr 2026"
 * - "YYYYMMDDHHMMSS"     → "09 Apr 2026"
 * - Anything else        → returned as-is (plain text, numbers, etc.)
 *
 * Use this for every filter chip value across the app so dates always
 * render in the human-readable format regardless of what format was
 * used when storing the applied filter.
 */
export const formatChipValue = (value) => {
  if (!value && value !== 0) return value
  if (value instanceof Date) return toDisplayDate(value)
  if (typeof value === 'string') {
    // YYYYMMDDHHMMSS  (14 digits)
    if (/^\d{14}$/.test(value)) {
      const d = new Date(
        +value.slice(0,4), +value.slice(4,6)-1, +value.slice(6,8),
        +value.slice(8,10), +value.slice(10,12), +value.slice(12,14)
      )
      return isNaN(d.getTime()) ? value : toDisplayDate(d)
    }
    // YYYYMMDD  (8 digits)
    if (/^\d{8}$/.test(value)) {
      const d = new Date(+value.slice(0,4), +value.slice(4,6)-1, +value.slice(6,8))
      return isNaN(d.getTime()) ? value : toDisplayDate(d)
    }
  }
  return value
}

// ─── Validators ───────────────────────────────────────────────────────────────

/** Returns true if email format is valid */
export const isValidEmail = (email) => EMAIL_REGEX.test(email)

/** Returns true if password meets policy */
export const isValidPassword = (pwd) => PASSWORD_REGEX.test(pwd)
