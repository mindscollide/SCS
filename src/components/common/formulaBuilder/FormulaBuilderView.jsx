/**
 * FormulaBuilderView.jsx
 * =======================
 * Add / Edit formula builder — operators + classifications + canvas.
 *
 * Props:
 *  formulas        {Array}    — all saved formulas (filters dropdown options)
 *  classifications {Array}    — [{ id, name, calculated, status }]
 *  onBack          {Function} — called when user goes back to list
 *  onSave          {Function} — called with { classificationId, name, tokens, active }
 *  editFormula     {Object|null} — formula to edit, or null for add mode
 *
 * Usage:
 *  import FormulaBuilderView from "../../components/common/formulaBuilder/FormulaBuilderView";
 *
 *  <FormulaBuilderView
 *    formulas={formulas}
 *    classifications={MOCK_CLASSIFICATIONS}
 *    onBack={handleBack}
 *    onSave={handleSave}
 *    editFormula={null}   // null = add mode, object = edit mode
 *  />
 *
 * Validation Rules (SRS):
 *  1. Formula must end with a classification or ')'
 *  2. At least 2 classifications and 1 operator between them
 *  3. No two arithmetic operators in a row
 *  4. No two classifications in a row
 *  5. If '(' selected, ')' must also appear
 *  6. If ')' selected, '(' must already be in the formula
 */

import React, { useState, useMemo, useCallback } from "react";
import { RefreshCw, Save, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { ConfirmModal } from "../index.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** All arithmetic operators shown in the left panel */
const OPERATORS = ["+", "−", "/", "×", "(", ")"];

/** Set for O(1) operator lookup */
const OP_SET = new Set(OPERATORS);

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA VALIDATION — SRS rules 1–6
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates token array against all SRS rules.
 * @param   {string[]} tokens
 * @returns {string|null} error message, or null if valid
 */
const validateFormula = (tokens) => {
  if (!tokens.length) return "Formula cannot be empty.";

  const classifications = tokens.filter((t) => !OP_SET.has(t));
  const operators       = tokens.filter((t) => OP_SET.has(t) && t !== "(" && t !== ")");

  // Rule 2
  if (classifications.length < 2 || operators.length < 1)
    return "This is an invalid formula. Please correct it";

  // Rule 1
  const last = tokens[tokens.length - 1];
  if (OP_SET.has(last) && last !== ")")
    return "This is an invalid formula. Please correct it";

  // Rules 3 & 4
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur  = tokens[i];
    const next = tokens[i + 1];
    const curIsOp  = OP_SET.has(cur)  && cur  !== "(" && cur  !== ")";
    const nextIsOp = OP_SET.has(next) && next !== "(" && next !== ")";
    if (curIsOp && nextIsOp)                         return "This is an invalid formula. Please correct it";
    if (!OP_SET.has(cur) && !OP_SET.has(next))       return "This is an invalid formula. Please correct it";
  }

  // Rules 5 & 6
  const openCount  = tokens.filter((t) => t === "(").length;
  const closeCount = tokens.filter((t) => t === ")").length;
  if (openCount !== closeCount)
    return "This is an invalid formula. Please correct it";

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CHIP — inline coloured chip with optional remove button
// ─────────────────────────────────────────────────────────────────────────────

const Token = ({ value, onRemove }) => {
  const isOp = OP_SET.has(value);
  return (
    <span
      className={`group relative inline-flex items-center gap-1 px-3 py-1
                  rounded-full text-[12px] font-medium border select-none
                  ${isOp
                    ? "bg-[#fef9ee] border-[#f5d88e] text-[#b45309]"
                    : "bg-white border-[#dde4ee] text-[#041E66]"
                  }`}
    >
      {value}
      {onRemove && (
        <button
          onClick={onRemove}
          title="Remove"
          className="w-3.5 h-3.5 rounded-full bg-red-400 text-white hidden
                     group-hover:flex items-center justify-center text-[9px]
                     hover:bg-red-500 transition-colors ml-0.5"
        >
          ×
        </button>
      )}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ERROR MODAL — shown when formula validation fails
// ─────────────────────────────────────────────────────────────────────────────

const ErrorModal = ({ message, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
               flex items-center justify-center p-5"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-xl w-full max-w-sm px-7 pt-7 pb-6 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-center mb-3">
        <AlertCircle size={40} className="text-red-400" />
      </div>
      <p className="text-[14px] text-[#041E66] leading-relaxed mb-6">{message}</p>
      <button
        onClick={onClose}
        className="px-10 py-[10px] rounded-xl bg-[#0B39B5] hover:bg-[#0a2e94]
                   text-white text-[14px] font-semibold transition-colors"
      >
        OK
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FormulaBuilderView = ({
  formulas = [],
  classifications = [],
  onBack,
  onSave,
  editFormula,
}) => {
  const isEdit = !!editFormula;

  // ── State ────────────────────────────────────────────
  const [selectedClass, setSelectedClass] = useState(editFormula?.name    || "");
  const [tokens,        setTokens]        = useState(editFormula?.tokens  || []);
  const [isActive,      setIsActive]      = useState(editFormula?.active  ?? true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [errorMsg,      setErrorMsg]      = useState(null);

  const hasTokens = tokens.length > 0;

  // ── Derived data ─────────────────────────────────────

  /** IDs already used by other formulas — to filter dropdown */
  const usedClassIds = useMemo(() =>
    formulas
      .filter((f) => !isEdit || f.id !== editFormula?.id)
      .map((f) => f.classificationId),
    [formulas, isEdit, editFormula]
  );

  /** Calculated classifications not yet assigned (available in dropdown) */
  const availableCalc = useMemo(() =>
    classifications
      .filter((c) => c.calculated && c.status === "Active" && !usedClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [classifications, usedClassIds]
  );

  /** All active non-calculated classifications for the left panel */
  const allActive = useMemo(() =>
    classifications
      .filter((c) => !c.calculated && c.status === "Active")
      .sort((a, b) => a.name.localeCompare(b.name)),
    [classifications]
  );

  /** Names already placed in the formula — disabled in left panel */
  const usedInFormula = useMemo(
    () => new Set(tokens.filter((t) => !OP_SET.has(t))),
    [tokens]
  );

  // ── Token handlers ───────────────────────────────────

  /**
   * Add token with live SRS rule enforcement:
   *  Rule 3 — no two arithmetic operators in a row
   *  Rule 4 — no two classifications in a row
   *  Rule 6 — ')' requires prior unmatched '('
   */
  const addToken = useCallback((t) => {
    setTokens((prev) => {
      const last     = prev[prev.length - 1];
      const curIsOp  = OP_SET.has(t)    && t    !== "(" && t    !== ")";
      const lastIsOp = last && OP_SET.has(last) && last !== "(" && last !== ")";

      if (prev.length > 0) {
        if (curIsOp && lastIsOp)                    return prev; // Rule 3
        if (!OP_SET.has(t) && !OP_SET.has(last))    return prev; // Rule 4
        if (t === ")") {                                          // Rule 6
          const open  = prev.filter((x) => x === "(").length;
          const close = prev.filter((x) => x === ")").length;
          if (open <= close) return prev;
        }
      }
      return [...prev, t];
    });
  }, []);

  /** Remove token at index */
  const removeToken = useCallback(
    (i) => setTokens((p) => p.filter((_, idx) => idx !== i)),
    []
  );

  /** Refresh — clears canvas and re-enables all classifications */
  const handleRefresh = useCallback(() => setTokens([]), []);

  /** Cancel — show confirm if tokens exist, otherwise go back immediately */
  const handleCancel = useCallback(() => {
    if (hasTokens) setConfirmCancel(true);
    else onBack();
  }, [hasTokens, onBack]);

  /** Save / Update — validate then call onSave */
  const handleSave = useCallback(() => {
    if (!selectedClass) { toast.error("Please select a classification"); return; }
    const error = validateFormula(tokens);
    if (error) { setErrorMsg(error); return; }

    const classification = classifications.find((c) => c.name === selectedClass);
    onSave({ classificationId: classification?.id, name: selectedClass, tokens, active: isActive });
  }, [selectedClass, tokens, isActive, classifications, onSave]);

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────

  return (
    <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">

      {/* ── Classification dropdown + Active (edit mode) ── */}
      <div className="bg-white rounded-xl p-5 mb-4 border border-[#dde4ee]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[12px] font-semibold text-[#0B39B5] mb-1.5">
              Classification <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-[10px] bg-[#EFF3FF] border-0 rounded-lg
                         text-[13px] text-[#041E66] outline-none
                         focus:border focus:border-[#01C9A4] transition-all"
            >
              <option value="">-- Select Calculated Classification --</option>
              {availableCalc.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              {/* In edit mode include current even if already assigned */}
              {isEdit && editFormula && !availableCalc.find((c) => c.name === editFormula.name) && (
                <option value={editFormula.name}>{editFormula.name}</option>
              )}
            </select>
          </div>

          {/* Active checkbox — edit mode only */}
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#041E66] mt-5">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-[#01C9A4]"
              />
              Active
            </label>
          )}
        </div>
      </div>

      {/* ── Section label ── */}
      <p className="text-[13px] font-semibold text-[#041E66] mb-3">Create Formula</p>

      <div className="grid grid-cols-2 gap-4">

        {/* ── Left: operators + classifications ── */}
        <div className="bg-white rounded-xl p-4 border border-[#dde4ee] max-h-[500px] overflow-y-auto">
          <p className="text-[11px] font-semibold text-[#041E66]/50 uppercase tracking-wider mb-2">
            Operators
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {OPERATORS.map((op) => (
              <button
                key={op}
                onClick={() => addToken(op)}
                className="w-10 h-10 rounded-lg bg-[#fef9ee] border border-[#f5d88e]
                           text-[#b45309] text-[15px] font-bold
                           hover:bg-[#fef0c0] transition-colors"
              >
                {op}
              </button>
            ))}
          </div>

          <p className="text-[11px] font-semibold text-[#041E66]/50 uppercase tracking-wider mb-2">
            Classifications
          </p>
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {allActive.map((c) => {
              const used = usedInFormula.has(c.name);
              return (
                <button
                  key={c.id}
                  onClick={() => !used && addToken(c.name)}
                  disabled={used}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-[12px]
                              font-medium transition-all
                              ${used
                                ? "bg-[#f5f7fa] border-[#eef2f7] text-[#a0aec0] cursor-not-allowed"
                                : "border-[#dde4ee] text-[#041E66] hover:bg-[#EFF3FF] hover:border-[#0B39B5]"
                              }`}
                >
                  {c.name}
                  {used && <span className="ml-1 text-[10px] text-[#a0aec0]">(used)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: formula canvas ── */}
        <div className="bg-white rounded-xl p-5 border border-[#dde4ee] flex flex-col">
          <p className="text-[11px] font-semibold text-[#041E66]/50 uppercase tracking-wider mb-3">
            Formula Area
          </p>

          {/* Token canvas — hover token to remove */}
          <div className="flex-1 min-h-[140px] border-2 border-dashed border-[#dde4ee]
                          rounded-xl p-4 flex flex-wrap gap-2 content-start mb-4">
            {tokens.length === 0 ? (
              <span className="text-[#a0aec0] text-[13px] italic">
                Select a classification from the left panel, then add operators
                and more classifications to build your formula…
              </span>
            ) : (
              tokens.map((t, i) => (
                <Token key={i} value={t} onRemove={() => removeToken(i)} />
              ))
            )}
          </div>

          {/* Action buttons — disabled until tokens exist */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={!hasTokens}
              className="flex items-center gap-1.5 px-4 py-[9px] border border-[#dde4ee]
                         rounded-[8px] text-[13px] font-medium text-[#041E66]
                         hover:bg-[#EFF3FF] disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRefresh}
              disabled={!hasTokens}
              className="flex items-center gap-1.5 px-4 py-[9px] border border-[#dde4ee]
                         rounded-[8px] text-[13px] font-medium text-[#041E66]
                         hover:bg-[#EFF3FF] disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={handleSave}
              disabled={!hasTokens}
              className="flex items-center gap-1.5 px-4 py-[9px] bg-[#0B39B5]
                         text-white rounded-[8px] text-[13px] font-semibold
                         hover:bg-[#0a2e94] disabled:opacity-40 transition-colors"
            >
              <Save size={13} /> {isEdit ? "Update" : "Save Formula"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Cancel confirmation modal ── */}
      <ConfirmModal
        open={confirmCancel}
        message="All the changes you made will be lost. Are you sure you want to discard all your changes?"
        onYes={() => { setConfirmCancel(false); onBack(); }}
        onNo={() => setConfirmCancel(false)}
      />

      {/* ── Validation error modal ── */}
      {errorMsg && (
        <ErrorModal message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}
    </div>
  );
};

export default FormulaBuilderView;
