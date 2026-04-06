/**
 * src/components/common/card/FormulaBuilderListingCard.jsx
 * ==========================================================
 * Reusable collapsible card supporting two display variants.
 *
 * Props
 * ──────
 *  formula   {Object}    — data object (shape differs per variant — see below)
 *  onEdit    {Function}  — called with formula when edit icon clicked
 *  variant   {string}    — "formula" (default) | "classifications"
 *
 * variant="formula"  (Formula Builder listing)
 * ─────────────────────────────────────────────
 *  formula.name       {string}   — heading
 *  formula.subtitle   {string}   — optional grey sub-text
 *  formula.tokens     {string[]} — token strings, operators vs classification pills
 *  formula.active     {boolean}  — shown as Active/Inactive badge
 *
 * variant="classifications"  (Financial Ratios listing)
 * ──────────────────────────────────────────────────────
 *  formula.name            {string}   — heading
 *  formula.subtitle        {string}   — optional grey sub-text (description)
 *  formula.classifications {Array}    — array of classification objects:
 *    { id, name, calculated, prorated, base }
 *
 * Usage:
 *  import FormulaCard from "../../components/common/card/FormulaBuilderListingCard";
 *
 *  // Formula builder
 *  <FormulaCard formula={f} onEdit={handleEdit} />
 *
 *  // Financial Ratios
 *  <FormulaCard
 *    variant="classifications"
 *    formula={{ name: ratio.name, subtitle: ratio.desc, classifications: ratio.classifications }}
 *    onEdit={() => openEdit(ratio)}
 *  />
 */

import React, { useState } from 'react'
import { SquarePen, ChevronDown, ChevronUp, Calculator, PieChart } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// OPERATORS SET — used to distinguish operator tokens from classification tokens
// ─────────────────────────────────────────────────────────────────────────────
const OP_SET = new Set(['+', '−', '/', '×', '(', ')'])

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CHIP — inline chip for each formula token
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
// EXPANDED BODY — formula variant
// ─────────────────────────────────────────────────────────────────────────────
const FormulaBody = ({ formula }) => (
  <div className="px-5 pb-5 border-t border-[#eef2f7]">
    {/* "Formula" label bar */}
    <div className="bg-[#E0E6F6] rounded-lg px-4 py-2 mb-3 mt-3">
      <span className="text-[16px] font-semibold text-[#041E66] font-opensans">Formula</span>
    </div>

    {/* Token chips */}
    <div className="flex flex-wrap gap-2">
      {(formula.tokens || []).map((t, i) => (
        <Token key={i} value={t} />
      ))}
    </div>

    {/* Active / Inactive badge */}
    <div className="mt-3">
      <span
        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full
                    ${
                      formula.active ? 'bg-[#e8faf6] text-[#01C9A4]' : 'bg-slate-100 text-slate-500'
                    }`}
      >
        {formula.active ? 'Active' : 'Inactive'}
      </span>
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// EXPANDED BODY — classifications variant (Financial Ratios)
// ─────────────────────────────────────────────────────────────────────────────
const ClassificationsBody = ({ classifications = [] }) => {
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
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#041E66]">{c.name}</span>
                  {c.calculated && (
                    <span className="flex items-center gap-1.5 text-[#F5A623] shrink-0">
                      <Calculator size={16} />
                    </span>
                  )}
                  {c.prorated && (
                    <span className="flex items-center gap-1.5 text-[#01C9A4] shrink-0">
                      <PieChart size={16} />
                      {c.base && <span className="text-[12px] text-[#041E66]">{c.base}</span>}
                    </span>
                  )}
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
// EXPANDED BODY — criteria variant (Compliance Criteria ratios)
// ─────────────────────────────────────────────────────────────────────────────
const CriteriaBody = ({ ratios = [], isDefault = false }) => (
  <div className="border-t border-[#eef2f7]">
    {/* Default badge */}
    {isDefault && (
      <div className="px-4 pt-3">
        <span
          className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full
                         bg-[#e8faf6] text-[#01C9A4]"
        >
          Default
        </span>
      </div>
    )}

    {ratios.length === 0 ? (
      <div className="py-6 text-center text-[12px] text-[#a0aec0]">No ratios added</div>
    ) : (
      <div className="max-h-[260px] overflow-y-auto">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0">
            <tr style={{ backgroundColor: '#E0E6F6' }}>
              <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
                Financial Ratio
              </th>
              <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66] whitespace-nowrap">
                Seq
              </th>
              <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
                Unit
              </th>
              <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
                Threshold
              </th>
              <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {ratios.map((r) => (
              <tr key={r.id} className="border-t border-[#eef2f7]">
                <td className="px-4 py-2.5 text-[#041E66]">{r.ratioName}</td>
                <td className="px-4 py-2.5 text-center text-[#041E66]">{r.seq}</td>
                <td className="px-4 py-2.5 text-center text-[#041E66]">{r.unit}</td>
                <td className="px-4 py-2.5 text-center text-[#041E66]">{r.threshold}</td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                    ${
                      r.type === 'Maximum'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-[#e8faf6] text-[#01C9A4]'
                    }`}
                  >
                    {r.type === 'Maximum' ? '▲ Max' : '▼ Min'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA CARD
// ─────────────────────────────────────────────────────────────────────────────
const FormulaCard = ({ formula, onEdit, variant = 'formula' }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[#EFF3FF] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#0B39B5] leading-snug font-opensans">
            {formula.name}
          </p>
          {formula.subtitle && (
            <p className="text-[12px] text-[#a0aec0] mt-0.5 font-opensans">{formula.subtitle}</p>
          )}
        </div>

        {/* Edit icon */}
        <button
          onClick={() => onEdit?.(formula)}
          title="Edit"
          className="flex items-center justify-center rounded-md p-1
                     text-[#0B39B5] hover:bg-[#EFF3FF] transition-all shrink-0"
        >
          <SquarePen size={15} />
        </button>

        {/* Expand / collapse */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center justify-center rounded-md p-1
                     text-[#0B39B5] hover:bg-[#EFF3FF] transition-all shrink-0"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* ── Expanded content ── */}
      {expanded &&
        (variant === 'classifications' ? (
          <ClassificationsBody classifications={formula.classifications} />
        ) : variant === 'criteria' ? (
          <CriteriaBody ratios={formula.ratios} isDefault={formula.isDefault} />
        ) : (
          <FormulaBody formula={formula} />
        ))}
    </div>
  )
}

export default FormulaCard
