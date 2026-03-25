/**
 * FormulaCard.jsx
 * ================
 * Reusable collapsible card for displaying a saved formula.
 *
 * Props:
 *  formula  {Object}   — formula data object
 *    .name     {string}  — formula name (shown as heading)
 *    .subtitle {string}  — optional subtitle below the name
 *    .tokens   {Array}   — array of token strings (classifications + operators)
 *    .active   {boolean} — whether formula is active or inactive
 *  onEdit   {Function} — called with formula when edit icon clicked
 *
 * Usage:
 *  import FormulaCard from "../../components/common/FormulaCard";
 *
 *  <FormulaCard
 *    formula={formula}
 *    onEdit={(f) => handleEdit(f)}
 *  />
 */

import React, { useState } from "react";
import { SquarePen, ChevronDown, ChevronUp } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// OPERATORS SET — used to distinguish operator tokens from classification tokens
// ─────────────────────────────────────────────────────────────────────────────
const OP_SET = new Set(["+", "−", "/", "×", "(", ")"]);

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CHIP — inline chip for each token in the formula
// ─────────────────────────────────────────────────────────────────────────────
const Token = ({ value }) => {
  const isOp = OP_SET.has(value);

  return (
    <span
      className={`select-none font-medium
        ${
          isOp
            ? "text-[#041E66] text-[16px] font-bold"
            : "px-3 py-1 rounded-full border bg-[#FFF8E7] border-[#dde4ee] text-[#000000] text-[12px]"
        }`}
    >
      {value}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA CARD
// ─────────────────────────────────────────────────────────────────────────────
const FormulaCard = ({ formula, onEdit }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#EFF3FF] rounded-xl border border-[#dde4ee] overflow-hidden">
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex-1 min-w-0">
          {/* Formula name */}
          <p className="text-[16px] font-semibold text-[#0B39B5] leading-tight font-opensans">
            {formula.name}
          </p>
          {/* Optional subtitle */}
          {formula.subtitle && (
            <p className="text-[10px] font-semibold text-[#717990] mt-0.5 truncate font-opensans">
              {formula.subtitle}
            </p>
          )}
        </div>

        {/* Edit icon */}
        <button
          onClick={() => onEdit?.(formula)}
          title="Edit"
          className="w-[16px] h-[17px] flex items-center justify-center rounded-md
                     text-[#929292] hover:text-[#0B39B5] hover:bg-[#EFF3FF]
                     transition-all shrink-0"
        >
          <SquarePen size={14} />
        </button>

        {/* Expand / collapse */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-[16px] h-[17px] flex items-center justify-center rounded-md
                     text-[#929292] hover:text-[#0B39B5] hover:bg-[#EFF3FF]
                     transition-all shrink-0"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-[#eef2f7]">
          {/* "Formula" label bar */}
          <div className="bg-[#E0E6F6] rounded-lg px-4 py-2 mb-3 mt-3">
            <span className="text-[16px] font-semibold text-[#041E66] font-opensans">
              Formula
            </span>
          </div>

          {/* Token chips */}
          <div className="flex flex-wrap gap-2">
            {formula.tokens.map((t, i) => (
              <Token key={i} value={t} />
            ))}
          </div>

          {/* Active / Inactive badge */}
          <div className="mt-3">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full
                          ${
                            formula.active
                              ? "bg-[#e8faf6] text-[#01C9A4]"
                              : "bg-slate-100 text-slate-500"
                          }`}
            >
              {formula.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaCard;
