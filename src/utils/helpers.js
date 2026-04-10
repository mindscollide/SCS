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

// ─── Validators ───────────────────────────────────────────────────────────────

/** Returns true if email format is valid */
export const isValidEmail = (email) => EMAIL_REGEX.test(email)

/** Returns true if password meets policy */
export const isValidPassword = (pwd) => PASSWORD_REGEX.test(pwd)
