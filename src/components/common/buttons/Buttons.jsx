/**
 * src/components/common/buttons/Buttons.jsx
 * ==========================================
 * All reusable button components for the SCS application.
 *
 * Sizing
 * ───────
 * Solid buttons accept a `size` prop (xs | sm | md | lg | xl) that sets padding,
 * border-radius, and font-size via inline style so there are zero Tailwind
 * class-ordering conflicts. For one-off sizes pass a `style` prop override.
 *
 * Size presets
 * ─────────────
 *  xs  — px-3  py-1    rounded-md  text-[12px]  (small table chips)
 *  sm  — px-4  py-[10px] rounded-lg text-[13px]  (filter/clear buttons)
 *  md  — px-5  py-[10px] rounded-lg text-[13px]  (default — most buttons)
 *  lg  — px-8  py-[10px] rounded-lg text-[14px]  (modal secondary)
 *  xl  — px-10 py-[10px] rounded-lg text-[14px]  (modal primary Yes/No)
 *
 * Solid buttons  : BtnPrimary · BtnDark · BtnGold · BtnTeal · BtnGreen · BtnSlate
 * Icon buttons   : BtnIconEdit · BtnIconDelete · BtnIconGroup · BtnIconApprove · BtnIconDecline · BtnModalClose
 * Special buttons: BtnChipRemove · BtnClearAll · BtnReasonChip
 */

import React from 'react'
import { SquarePen, Trash2, Users, CheckCircle, XCircle, X } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// SIZE MAP  (inline style — immune to Tailwind class-ordering issues)
// ─────────────────────────────────────────────────────────────────────────────

const SIZE = {
  xs:  { padding: '4px 12px',   borderRadius: '6px',  fontSize: '12px' },
  sm:  { padding: '10px 16px',  borderRadius: '8px',  fontSize: '13px' },
  md:  { padding: '10px 20px',  borderRadius: '8px',  fontSize: '13px' },
  lg:  { padding: '10px 32px',  borderRadius: '8px',  fontSize: '14px' },
  xl:  { padding: '10px 40px',  borderRadius: '8px',  fontSize: '14px' },
}

// ─────────────────────────────────────────────────────────────────────────────
// SPINNER (used inside loading buttons)
// ─────────────────────────────────────────────────────────────────────────────

const Spinner = () => (
  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
)

// ─────────────────────────────────────────────────────────────────────────────
// SOLID BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Solid blue primary button (#0B39B5).
 *
 * @prop {ReactNode}  children
 * @prop {Function}   onClick
 * @prop {boolean}    disabled
 * @prop {boolean}    loading   — shows spinner + disables the button
 * @prop {'xs'|'sm'|'md'|'lg'|'xl'} size — defaults to 'md'
 * @prop {object}     style     — inline style override (e.g. custom padding)
 * @prop {string}     className — extra Tailwind classes
 * @prop {string}     type      — button type attribute (default 'button')
 */
export const BtnPrimary = ({
  children,
  onClick,
  disabled,
  loading,
  size = 'md',
  style,
  className = '',
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    style={{ ...SIZE[size], ...style }}
    className={`font-semibold text-white flex items-center justify-center gap-2
                transition-colors
                ${
                  disabled || loading
                    ? 'bg-[#a0aec0] cursor-not-allowed opacity-70'
                    : 'bg-[#0B39B5] hover:bg-[#0a2e94] cursor-pointer'
                } ${className}`}
  >
    {loading && <Spinner />}
    {children}
  </button>
)

/**
 * Solid dark-purple button (#2f20b0).
 * Used in AuditTrailPage (Generate Report, Close) and auth pages.
 *
 * @prop {boolean} loading — shows spinner
 */
export const BtnDark = ({
  children,
  onClick,
  disabled,
  loading,
  size = 'md',
  style,
  className = '',
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    style={{ ...SIZE[size], ...style }}
    className={`font-semibold text-white flex items-center justify-center gap-2
                transition-colors
                ${
                  disabled || loading
                    ? 'bg-[#a0aec0] cursor-not-allowed opacity-70'
                    : 'bg-[#2f20b0] hover:bg-[#251a94] cursor-pointer'
                } ${className}`}
  >
    {loading && <Spinner />}
    {children}
  </button>
)

/**
 * Solid gold button (#F5A623).
 * Used for Cancel / No / Back actions and small action buttons in tables.
 */
export const BtnGold = ({
  children,
  onClick,
  disabled,
  size = 'md',
  style,
  className = '',
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    style={{ ...SIZE[size], ...style }}
    className={`font-semibold text-white flex items-center justify-center gap-2
                transition-colors
                ${
                  disabled
                    ? 'bg-[#a0aec0] cursor-not-allowed opacity-70'
                    : 'bg-[#F5A623] hover:bg-[#e09a1a] cursor-pointer'
                } ${className}`}
  >
    {children}
  </button>
)

/**
 * Solid teal button (#01C9A4).
 * Used for primary positive actions (Save, Apply, Export).
 */
export const BtnTeal = ({
  children,
  onClick,
  disabled,
  loading,
  size = 'md',
  style,
  className = '',
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    style={{ ...SIZE[size], ...style }}
    className={`font-semibold text-white flex items-center justify-center gap-2
                transition-colors
                ${
                  disabled || loading
                    ? 'bg-[#a0aec0] cursor-not-allowed opacity-70'
                    : 'bg-[#01C9A4] hover:bg-[#00a888] cursor-pointer'
                } ${className}`}
  >
    {loading && <Spinner />}
    {children}
  </button>
)

/**
 * Solid green button (#00B894).
 * Used in auth pages for secondary actions (Back to Login, etc.).
 */
export const BtnGreen = ({
  children,
  onClick,
  disabled,
  loading,
  size = 'md',
  style,
  className = '',
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    style={{ ...SIZE[size], ...style }}
    className={`font-semibold text-white flex items-center justify-center gap-2
                transition-colors
                ${
                  disabled || loading
                    ? 'bg-[#a0aec0] cursor-not-allowed opacity-70'
                    : 'bg-[#00B894] hover:bg-[#00a57e] cursor-pointer'
                } ${className}`}
  >
    {loading && <Spinner />}
    {children}
  </button>
)

/**
 * Outlined grey/slate button — secondary actions (Cancel, Clear).
 * Uses `font-medium` (not bold) to visually de-emphasise.
 *
 * @prop {string} textColor — override text color (default #041E66)
 */
export const BtnSlate = ({
  children,
  onClick,
  disabled,
  textColor,
  size = 'md',
  style,
  className = '',
  type = 'button',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    style={{ ...SIZE[size], color: textColor || undefined, ...style }}
    className={`font-medium text-[#041E66] border border-[#dde4ee] bg-white
                flex items-center justify-center gap-2
                hover:bg-[#EFF3FF] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
)

// ─────────────────────────────────────────────────────────────────────────────
// ICON BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ghost icon button — navy blue hover. Used for Edit row actions.
 * Renders SquarePen by default; pass `icon` to swap the icon.
 *
 * @prop {Function}  onClick
 * @prop {boolean}   disabled
 * @prop {number}    size     — icon size in px (default 18)
 * @prop {ReactNode} icon     — override icon element
 * @prop {string}    title    — tooltip text
 * @prop {string}    className
 */
export const BtnIconEdit = ({
  onClick,
  disabled,
  size = 18,
  icon,
  title = 'Edit',
  className = '',
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`w-8 h-8 rounded-lg hover:bg-[#EFF3FF] hover:text-[#0B39B5]
                text-slate-400 flex items-center justify-center transition-all
                disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {icon ?? <SquarePen size={size} />}
  </button>
)

/**
 * Ghost icon button — red hover. Used for Delete row actions.
 * Shows a red spinner when `loading` is true instead of the Trash2 icon.
 *
 * @prop {boolean} loading — shows spinner inside the button
 */
export const BtnIconDelete = ({
  onClick,
  disabled,
  loading,
  size = 15,
  title = 'Delete',
  className = '',
}) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    title={title}
    className={`w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600
                text-slate-400 flex items-center justify-center transition-all
                disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {loading ? (
      <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
    ) : (
      <Trash2 size={size} />
    )}
  </button>
)

/**
 * Ghost icon button — gold/amber hover. Used for Group membership actions.
 * Renders the Users icon.
 */
export const BtnIconGroup = ({
  onClick,
  disabled,
  size = 18,
  title = 'View Groups',
  className = '',
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`text-[#F5A623] hover:bg-[#fff8ed] rounded p-1.5
                flex items-center justify-center transition-all
                disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    <Users size={size} />
  </button>
)

/**
 * Emerald approve icon button. Renders CheckCircle icon.
 *
 * @prop {number} size — icon size (default 20)
 */
export const BtnIconApprove = ({
  onClick,
  size = 20,
  title = 'Approve',
  className = '',
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`text-emerald-500 hover:text-emerald-600 transition-colors ${className}`}
  >
    <CheckCircle size={size} />
  </button>
)

/**
 * Red decline icon button. Renders XCircle icon.
 *
 * @prop {number} size — icon size (default 20)
 */
export const BtnIconDecline = ({
  onClick,
  size = 20,
  title = 'Decline',
  className = '',
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`text-red-500 hover:text-red-600 transition-colors ${className}`}
  >
    <XCircle size={size} />
  </button>
)

/**
 * Modal header close (X) button.
 *
 * @prop {'default'|'light'} variant
 *   - 'default' — text-slate-400 → hover:text-[#0B39B5] (no background box)
 *   - 'light'   — slate-400 in a small square that hovers bg-slate-100
 */
export const BtnModalClose = ({ onClick, variant = 'default', className = '' }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center transition-colors
                ${
                  variant === 'light'
                    ? 'w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400'
                    : 'text-slate-400 hover:text-[#0B39B5]'
                } ${className}`}
  >
    <X size={variant === 'light' ? 18 : 20} />
  </button>
)

// ─────────────────────────────────────────────────────────────────────────────
// SPECIAL BUTTONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chip X remove button — sits inside a teal filter chip.
 * Always uses white text; hover dims to 70% opacity.
 */
export const BtnChipRemove = ({ onClick }) => (
  <button onClick={onClick} className="hover:text-white/70 transition-colors flex-shrink-0">
    <X size={13} />
  </button>
)

/**
 * "Clear All" link-style button — orange text, underlines on hover.
 * Used at the end of a filter-chip row.
 *
 * @prop {string} label    — button text (default 'Clear All')
 * @prop {string} className
 */
export const BtnClearAll = ({ onClick, label = 'Clear All', className = '' }) => (
  <button
    onClick={onClick}
    className={`text-[12px] font-semibold text-[#E8923A] hover:underline ml-1 ${className}`}
  >
    {label}
  </button>
)

/**
 * Outlined pill chip — used for suggestive reason chips in action modals.
 * Clicking appends the reason text to the notes textarea.
 */
export const BtnReasonChip = ({ onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 bg-white border border-[#dde4ee] rounded-full
                text-[12px] text-[#041E66] hover:bg-[#EFF3FF]
                hover:border-[#0B39B5] transition-all ${className}`}
  >
    {children}
  </button>
)
