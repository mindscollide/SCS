/**
 * src/components/common/card/FormulaBuilderListingCard.jsx
 * ==========================================================
 * Reusable collapsible card supporting three display variants:
 *   "formula"         — Formula Builder listing
 *   "classifications" — Financial Ratios listing
 *   "criteria"        — Compliance Criteria listing  ← updated
 *
 * Props
 * ──────
 *  formula   {Object}    — data object (shape differs per variant — see below)
 *  onEdit    {Function}  — called when edit icon clicked
 *  variant   {string}    — "formula" (default) | "classifications" | "criteria"
 *
 * variant="formula"
 * ─────────────────
 *  formula.name       {string}    — heading
 *  formula.subtitle   {string}    — optional grey sub-text
 *  formula.tokens     {string[]}  — token strings
 *  formula.active     {boolean}   — shown as Active/Inactive badge
 *
 * variant="classifications"
 * ──────────────────────────
 *  formula.name            {string}  — heading
 *  formula.subtitle        {string}  — description
 *  formula.classifications {Array}   — [{ id, name, isCalculated, isProrated }]
 *
 * variant="criteria"
 * ───────────────────
 *  formula.name             {string}   — heading
 *  formula.subtitle         {string}   — description
 *  formula.isDefault        {boolean}  — drives the Default toggle in header
 *  formula.createdDate      {string}   — ISO-ish date string
 *  formula.lastModifiedDate {string}   — ISO-ish date string
 *  formula.onToggleDefault  {Function} — called with (id) when toggle clicked
 *  formula.onViewRatios     {Function} — called when View Financial Ratios clicked
 */

import React, { useState, memo } from 'react'
import { SquarePen, ChevronDown, ChevronUp, Calculator, ClipboardList } from 'lucide-react'
import { FormulaModal } from '../Modals/Modals'
import chartIcon from '../../../../public/chart-icon.png'

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const OP_SET = new Set(['+', '-', '/', 'x', '(', ')', '='])

/** "2026-05-08 08:13:30"  →  "08-May-2026" */
const fmtDate = (str) => {
  if (!str) return '—'
  const d = new Date(str.replace(' ', 'T'))
  if (isNaN(d)) return str
  return d
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/ /g, '-')
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CHIP
// ─────────────────────────────────────────────────────────────────────────────
const Token = ({ value }) => {
  const isOp = OP_SET.has(value)
  return (
    <span
      className={`select-none font-medium
        ${
          isOp
            ? 'text-[#041E66] text-[16px] font-bold'
            : 'px-3 py-1 rounded-full border bg-[#FFF8E7] border-[#dde4ee] text-[#000000] text-[12px]'
        }`}
    >
      {value}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT TOGGLE — reusable pill-style toggle
// ─────────────────────────────────────────────────────────────────────────────
const DefaultToggle = ({ checked, onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onClick?.()
    }}
    className={`relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer
                rounded-full border-2 border-transparent transition-colors duration-200
                focus:outline-none
                ${checked ? 'bg-[#01C9A4]' : 'bg-gray-300'}`}
    role="switch"
    aria-checked={checked}
  >
    <span
      className={`pointer-events-none inline-block h-[18px] w-[18px] rounded-full
                  bg-white shadow-md transform transition-transform duration-200
                  ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`}
    />
  </button>
)

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED BODY — formula variant
// ─────────────────────────────────────────────────────────────────────────────
const FormulaBody = ({ formula }) => (
  <div className="px-5 pb-5 border-t border-[#eef2f7]">
    <div className="bg-[#E0E6F6] rounded-lg px-4 py-2 mb-3 mt-3">
      <span className="text-[16px] font-semibold text-[#041E66] font-opensans">Formula</span>
    </div>
    <div className="flex flex-wrap gap-2">
      {(formula.tokens || []).map((t, i) => (
        <Token key={i} value={t} />
      ))}
    </div>
    <div className="mt-3">
      <span
        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full
                    ${formula.active ? 'bg-[#e8faf6] text-[#01C9A4]' : 'bg-slate-100 text-slate-500'}`}
      >
        {formula.active ? 'Active' : 'Inactive'}
      </span>
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED BODY — classifications variant (Financial Ratios)
// ─────────────────────────────────────────────────────────────────────────────
const ClassificationsBody = ({ classifications = [], onCalcClick }) => {
  if (classifications.length === 0) {
    return (
      <div className="border-t border-[#eef2f7] py-6 text-center text-[12px] text-[#a0aec0]">
        No classifications added
      </div>
    )
  }

  return (
    <div className="border-t border-[#eef2f7] max-h-[260px] overflow-y-auto">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0">
          <tr style={{ backgroundColor: '#E0E6F6' }}>
            <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
              Classifications Name
            </th>
          </tr>
        </thead>
        <tbody>
          {classifications.map((c) => (
            <tr key={c.id} className="border-t border-[#eef2f7]">
              <td className="px-4 py-2.5">
                <div className="grid grid-cols-10 items-center gap-2">
                  <div className="col-span-5 min-w-0">
                    <span className="text-[#041E66] break-words">{c.name}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-2">
                    {c.isCalculated && (
                      <button
                        title="View Formula"
                        onClick={() => onCalcClick?.(c)}
                        className="inline-flex items-center justify-center px-2 py-0.5
                                   rounded-full bg-blue-50 text-[#e3a204]
                                   hover:bg-blue-100 transition-colors"
                      >
                        <Calculator size={16} />
                      </button>
                    )}
                    {c.isProrated && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#01c9a4] text-[11px]">
                        <img
                          src={chartIcon}
                          alt="Pin Icon"
                          className="object-contain h-auto w-6"
                          draggable={false}
                        />
                      </span>
                    )}
                  </div>
                  <div className="col-span-4 flex justify-center text-[#7c8db5]">-</div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED BODY — criteria variant (Compliance Criteria)
//
// Shows a single-row table:
//   Created Date | Last Modified Date | View Financial Ratios
//
// The dates come directly from the criteria object (not from a nested ratios[]).
// ─────────────────────────────────────────────────────────────────────────────
const CriteriaBody = ({ createdDate, lastModifiedDate, onViewRatios }) => (
  <div className="border-t border-[#eef2f7]">
    <div className="max-h-[260px] overflow-y-auto">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0">
          <tr style={{ backgroundColor: '#E0E6F6' }}>
            <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
              Created Date
            </th>
            <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66] whitespace-nowrap">
              Last Modified Date
            </th>
            <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
              View Financial Ratios
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-[#eef2f7]">
            {/* Created Date */}
            <td className="px-4 py-2.5 text-[#041E66]">{fmtDate(createdDate)}</td>

            {/* Last Modified Date */}
            <td className="px-4 py-2.5 text-center text-[#041E66]">{fmtDate(lastModifiedDate)}</td>

            {/* View Financial Ratios icon button */}
            <td className="px-4 py-2.5 text-center">
              <button
                title="View Financial Ratios"
                onClick={(e) => {
                  e.stopPropagation()
                  onViewRatios?.()
                }}
                className="inline-flex items-center justify-center p-1.5 rounded-md
                           text-[#0B39B5] hover:bg-[#E0E6F6] transition-colors"
              >
                <ClipboardList size={18} />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA CARD
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Controlled mode  — pass `expanded` + `onToggle(id)` (accordion, one open at a time)
 * Uncontrolled mode — omit both; each card manages its own state
 */
const FormulaCard = ({
  formula,
  onEdit,
  variant = 'formula',
  expanded: expandedProp,
  onToggle,
}) => {
  const [localExpanded, setLocalExpanded] = useState(false)
  const [viewItem, setViewItem] = useState(null)

  const isControlled = typeof onToggle === 'function'
  const expanded = isControlled ? expandedProp : localExpanded
  const handleToggle = isControlled ? () => onToggle(formula.id) : () => setLocalExpanded((p) => !p)

  return (
    <>
      <div className="bg-[#EFF3FF] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* ── Card header ── */}
        <div className="flex items-center gap-2 px-5 py-4">
          {/* Name + subtitle */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#0B39B5] leading-snug font-opensans">
              {formula.name}
            </p>
            {formula.subtitle && (
              <p className="text-[12px] text-[#a0aec0] mt-0.5 font-opensans">{formula.subtitle}</p>
            )}
          </div>

          {/* ── Default toggle — only for "criteria" variant ── */}
          {variant === 'criteria' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[12px] text-[#a0aec0] font-opensans">Default</span>
              <DefaultToggle
                checked={!!formula.isDefault}
                onClick={() => formula.onToggleDefault?.(formula.id)}
              />
            </div>
          )}

          {/* Edit */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(formula)
            }}
            title="Edit"
            className="flex items-center justify-center rounded-md p-1
                       text-[#0B39B5] hover:bg-[#E0E6F6] transition-all shrink-0"
          >
            <SquarePen size={15} />
          </button>

          {/* Expand / collapse */}
          <button
            onClick={handleToggle}
            className="flex items-center justify-center rounded-md p-1
                       text-[#0B39B5] hover:bg-[#E0E6F6] transition-all shrink-0"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* ── Expanded content ── */}
        {expanded &&
          (variant === 'classifications' ? (
            <ClassificationsBody
              classifications={formula.classifications}
              onCalcClick={setViewItem}
            />
          ) : variant === 'criteria' ? (
            // Pass the criteria's own dates — NOT a ratios[]
            <CriteriaBody
              createdDate={formula.createdDate}
              lastModifiedDate={formula.lastModifiedDate}
              onViewRatios={formula.onViewRatios}
            />
          ) : (
            <FormulaBody formula={formula} />
          ))}
      </div>

      {/* Formula modal — outside card div to avoid overflow clipping */}
      <FormulaModal item={viewItem} onClose={() => setViewItem(null)} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA CARD FOR FINANCIAL RATIOS (unchanged — kept separate per original)
// ─────────────────────────────────────────────────────────────────────────────
const FormulaCardForFinancialRatios = ({
  formula,
  onEdit,
  variant = 'formula',
  expanded: expandedProp,
  onToggle,
}) => {
  const [localExpanded, setLocalExpanded] = useState(false)
  const [viewItem, setViewItem] = useState(null)

  const isControlled = typeof onToggle === 'function'
  const expanded = isControlled ? expandedProp : localExpanded
  const handleToggle = isControlled ? () => onToggle(formula.id) : () => setLocalExpanded((p) => !p)

  return (
    <>
      <div className="bg-[#EFF3FF] rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-32">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#0B39B5] leading-snug font-opensans">
              {formula.name}
            </p>
            {formula.subtitle && (
              <p className="text-[12px] text-[#a0aec0] mt-0.5 font-opensans">{formula.subtitle}</p>
            )}
          </div>
          <button
            onClick={() => onEdit?.(formula)}
            title="Edit"
            className="flex items-center justify-center rounded-md p-1
                       text-[#0B39B5] hover:bg-[#EFF3FF] transition-all shrink-0"
          >
            <SquarePen size={15} />
          </button>
          <button
            onClick={handleToggle}
            className="flex items-center justify-center rounded-md p-1
                       text-[#0B39B5] hover:bg-[#EFF3FF] transition-all shrink-0"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {expanded &&
          (variant === 'classifications' ? (
            <ClassificationsBody
              classifications={formula.classifications}
              onCalcClick={setViewItem}
            />
          ) : variant === 'criteria' ? (
            <CriteriaBody
              createdDate={formula.createdDate}
              lastModifiedDate={formula.lastModifiedDate}
              onViewRatios={formula.onViewRatios}
            />
          ) : (
            <FormulaBody formula={formula} />
          ))}
      </div>
      <FormulaModal item={viewItem} onClose={() => setViewItem(null)} />
    </>
  )
}

export default memo(FormulaCard)
export const MemoizedFormulaCardForFinancialRatios = memo(FormulaCardForFinancialRatios)
