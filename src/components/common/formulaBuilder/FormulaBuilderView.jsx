/**
 * FormulaBuilderView.jsx
 * =======================
 * Add / Edit formula builder — operators + classifications + canvas.
 *
 * Props:
 *  formulas        {Array}      — all saved formulas (used to filter dropdown)
 *  classifications {Array}      — [{ id, name, calculated, status }]
 *  onBack          {Function}   — called when user goes back to list
 *  onSave          {Function}   — called with { classificationId, name, tokens, active }
 *  editFormula     {Object|null}— formula to edit, or null for add mode
 *  saving          {boolean}    — true while parent's create/update API call is in-flight
 *
 * UX flow (SRS §9.2):
 *  Step 1 — Select a calculated classification from the dropdown (enables the left panel)
 *  Step 2 — Drag a classification from the left panel into the formula canvas
 *  Step 3 — Buttons (Cancel / Refresh / Save) become enabled once tokens exist
 *  Step 4 — Click an arithmetic operator → appended after last token
 *  Step 5 — Drag another classification → appended after last operator
 *  Step 6 — Repeat until formula is complete, then Save
 *
 * Operators (SRS):  +  -  /  x  ()  =
 *
 * Validation Rules (SRS):
 *  1. Formula must end with a classification or ')'
 *  2. At least 2 classifications and 1 arithmetic operator between them
 *  3. No two arithmetic operators in a row
 *  4. No two classifications in a row
 *  5. If '(' used, a matching ')' must also appear
 *  6. ')' can only be added when an unmatched '(' already exists
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { RefreshCw, Save, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import { ConfirmModal } from '../index.jsx'
import Select from '../select/Select.jsx'
import Checkbox from '../Checkbox/Checkbox.jsx'
import { getClassificationsForFormula } from '../../../services/admin.service.js'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Arithmetic operators shown in the left panel — as specified in SRS §9.2 */
const OPERATORS = ['+', '-', '/', 'x', '(', ')', '=']

/** Set for O(1) operator lookup */
const OP_SET = new Set(OPERATORS)

// ─────────────────────────────────────────────────────────────────────────────
// FORMULA VALIDATION — SRS rules 1–6
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates a token array against all 6 SRS rules.
 * @param   {string[]} tokens
 * @returns {string|null} error message, or null if valid
 */
const validateFormula = (tokens) => {
  if (!tokens.length) return 'Formula cannot be empty.'

  const classifications = tokens.filter((t) => !OP_SET.has(t))
  // Arithmetic operators (excludes grouping parens)
  const arithmeticOps = tokens.filter((t) => OP_SET.has(t) && t !== '(' && t !== ')')

  // Rule 2 — at least 2 classifications + 1 arithmetic operator
  if (classifications.length < 2 || arithmeticOps.length < 1)
    return 'This is an invalid formula. Please correct it'

  // Rule 1 — formula must end with a classification or ')'
  const last = tokens[tokens.length - 1]
  if (OP_SET.has(last) && last !== ')')
    return 'This is an invalid formula. Please correct it'

  // Rules 3 & 4 — no two operators in a row, no two classifications in a row
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur  = tokens[i]
    const next = tokens[i + 1]
    const curIsArith  = OP_SET.has(cur)  && cur  !== '(' && cur  !== ')'
    const nextIsArith = OP_SET.has(next) && next !== '(' && next !== ')'
    if (curIsArith && nextIsArith)
      return 'This is an invalid formula. Please correct it'     // Rule 3
    if (!OP_SET.has(cur) && !OP_SET.has(next))
      return 'This is an invalid formula. Please correct it'     // Rule 4
  }

  // Rules 5 & 6 — balanced parentheses
  const openCount  = tokens.filter((t) => t === '(').length
  const closeCount = tokens.filter((t) => t === ')').length
  if (openCount !== closeCount)
    return 'This is an invalid formula. Please correct it'

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CHIP — coloured chip with hover-to-remove ×
// ─────────────────────────────────────────────────────────────────────────────

const Token = ({ value, onRemove }) => {
  const isOp = OP_SET.has(value)
  return (
    <span
      className={`group relative inline-flex items-center gap-1 px-3 py-1
                  rounded-full text-[12px] font-medium border select-none
                  ${isOp
                    ? 'bg-[#fef9ee] border-[#f5d88e] text-[#b45309]'
                    : 'bg-white border-[#dde4ee] text-[#041E66]'
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
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR MODAL — shown when formula validation fails on Save
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
)

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FormulaBuilderView = ({
  classifications = [],
  onBack,
  onSave,
  editFormula,
  saving = false,
}) => {
  const isEdit = !!editFormula

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedClass,   setSelectedClass]   = useState(editFormula?.name || '')
  const [tokens,          setTokens]          = useState(editFormula?.tokens || [])
  const [isActive,        setIsActive]        = useState(editFormula?.active ?? true)
  const [confirmCancel,   setConfirmCancel]   = useState(false)
  const [errorMsg,        setErrorMsg]        = useState(null)
  const [isDragOver,      setIsDragOver]      = useState(false)

  // ── Dropdown classifications (GetClassificationsForFormula) ──────────────
  // Returns only calculated, unassigned classifications — exactly right for Step 1.
  const [dropdownClasses,  setDropdownClasses]  = useState([])
  const [loadingDropdown,  setLoadingDropdown]  = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      setLoadingDropdown(true)
      const res = await getClassificationsForFormula({ skipLoader: true })
      if (res.success) {
        const list = res.data?.responseResult?.classifications || []
        setDropdownClasses(list.map((c) => ({ id: c.classificationID, name: c.name })))
      }
      setLoadingDropdown(false)
    }
    load()
  }, [])

  const hasTokens    = tokens.length > 0
  const panelEnabled = !!selectedClass   // left panel locked until Step 1 is done

  // ── Dropdown options ─────────────────────────────────────────────────────
  // API already filters to calculated + unassigned, so use directly.
  // In edit mode, inject the current classification if the API didn't return it
  // (it already has a formula so it's excluded from the "free" list).
  const dropdownOptions = useMemo(() => {
    const base = dropdownClasses.map((c) => ({ label: c.name, value: c.name }))
    if (isEdit && editFormula && !dropdownClasses.find((c) => c.name === editFormula.name)) {
      base.push({ label: editFormula.name, value: editFormula.name })
    }
    return base.sort((a, b) => a.label.localeCompare(b.label))
  }, [dropdownClasses, isEdit, editFormula])

  /**
   * Left-panel operand buttons — ALL active classifications (SRS: "all the active
   * classifications in alphabetical order as buttons"), both calculated and non-calculated.
   */
  const allActive = useMemo(
    () =>
      classifications
        .filter((c) => c.status === 'Active')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [classifications]
  )

  /** Names already placed in the formula canvas (disabled in the left panel) */
  const usedInFormula = useMemo(
    () => new Set(tokens.filter((t) => !OP_SET.has(t))),
    [tokens]
  )

  // ── Token handlers ──────────────────────────────────────────────────────────

  /**
   * Adds a token with live SRS rule enforcement (silent rejection on violation):
   *  Rule 3 — no two arithmetic operators in a row
   *  Rule 4 — no two classifications in a row
   *  Rule 6 — ')' requires a prior unmatched '('
   */
  const addToken = useCallback((t) => {
    setTokens((prev) => {
      const last        = prev[prev.length - 1]
      const curIsArith  = OP_SET.has(t)    && t    !== '(' && t    !== ')'
      const lastIsArith = last && OP_SET.has(last) && last !== '(' && last !== ')'

      if (prev.length > 0) {
        if (curIsArith && lastIsArith)          return prev  // Rule 3
        if (!OP_SET.has(t) && !OP_SET.has(last)) return prev  // Rule 4
        if (t === ')') {                                        // Rule 6
          const open  = prev.filter((x) => x === '(').length
          const close = prev.filter((x) => x === ')').length
          if (open <= close) return prev
        }
      }
      return [...prev, t]
    })
  }, [])

  const removeToken    = useCallback((i) => setTokens((p) => p.filter((_, idx) => idx !== i)), [])
  const handleRefresh  = useCallback(() => setTokens([]), [])

  const handleCancel = useCallback(() => {
    if (hasTokens) setConfirmCancel(true)
    else           onBack()
  }, [hasTokens, onBack])

  // ── Drag-and-drop handlers (classifications only) ───────────────────────────

  const handleDragStart = useCallback((e, name) => {
    e.dataTransfer.setData('text/plain', name)
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragOver(false), [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const name = e.dataTransfer.getData('text/plain')
    if (name) addToken(name)
  }, [addToken])

  // ── Save / Update ────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    if (!selectedClass) {
      toast.error('Please select a classification first.')
      return
    }
    const error = validateFormula(tokens)
    if (error) {
      setErrorMsg(error)
      return
    }
    // In edit mode fall back to editFormula.classificationId if not in dropdownClasses
    const cls = dropdownClasses.find((c) => c.name === selectedClass)
    const classificationId = cls?.id ?? editFormula?.classificationId
    onSave({ classificationId, name: selectedClass, tokens, active: isActive })
  }, [selectedClass, tokens, isActive, dropdownClasses, editFormula, onSave])

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">

      {/* ── Step 1: Classification dropdown + Active toggle (edit mode) ── */}
      <div className="bg-white rounded-xl p-5 mb-4 border border-[#dde4ee]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <Select
              label="Classification"
              required
              value={selectedClass}
              onChange={(v) => setSelectedClass(v)}
              options={dropdownOptions}
              placeholder={loadingDropdown ? 'Loading…' : '-- Select Calculated Classification --'}
              disabled={loadingDropdown}
              bgColor="#EFF3FF"
              borderColor="transparent"
              focusBorderColor="#01C9A4"
            />
          </div>

          {isEdit && (
            <Checkbox
              label="Active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mt-5"
            />
          )}
        </div>
      </div>

      {/* ── Section label ── */}
      <p className="text-[13px] font-semibold text-[#041E66] mb-3">Create Formula</p>

      <div className="grid grid-cols-2 gap-4">

        {/* ── Left panel: operators (click) + classifications (drag or click) ── */}
        <div className="bg-white rounded-xl p-4 border border-[#dde4ee] max-h-[520px] overflow-y-auto">

          {/* Operators — always clickable */}
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

          {/* Classifications — drag-and-drop into canvas; also clickable */}
          <p className="text-[11px] font-semibold text-[#041E66]/50 uppercase tracking-wider mb-2">
            Classifications
            {!panelEnabled && (
              <span className="ml-2 text-[10px] text-amber-500 normal-case font-normal">
                (select a classification above first)
              </span>
            )}
          </p>

          <div className="space-y-1.5 pr-1">
            {allActive.length === 0 ? (
              <p className="text-[12px] text-[#a0aec0] italic py-2">No active classifications</p>
            ) : (
              allActive.map((c) => {
                const used     = usedInFormula.has(c.name)
                const disabled = used || !panelEnabled

                return (
                  <div
                    key={c.id}
                    draggable={!disabled}
                    onDragStart={(e) => !disabled && handleDragStart(e, c.name)}
                    onClick={() => !disabled && addToken(c.name)}
                    title={
                      !panelEnabled ? 'Select a classification from the dropdown first'
                      : used        ? 'Already used in the formula'
                      : 'Drag into the formula area, or click to add'
                    }
                    className={[
                      'w-full text-left px-3 py-2 rounded-lg border text-[12px] font-medium',
                      'transition-all select-none',
                      disabled
                        ? 'bg-[#f5f7fa] border-[#eef2f7] text-[#a0aec0] cursor-not-allowed'
                        : 'border-[#dde4ee] text-[#041E66] cursor-grab',
                      !disabled && 'hover:bg-[#EFF3FF] hover:border-[#0B39B5]',
                    ].filter(Boolean).join(' ')}
                  >
                    <span className="flex items-center justify-between">
                      {c.name}
                      <span className="flex items-center gap-1">
                        {c.calculated && (
                          <span className="text-[10px] text-amber-500 font-semibold">calc</span>
                        )}
                        {used && (
                          <span className="text-[10px] text-[#a0aec0]">(used)</span>
                        )}
                        {!disabled && (
                          <span className="text-[10px] text-[#a0aec0]">⠿</span>
                        )}
                      </span>
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right panel: formula canvas ── */}
        <div className="bg-white rounded-xl p-5 border border-[#dde4ee] flex flex-col">
          <p className="text-[11px] font-semibold text-[#041E66]/50 uppercase tracking-wider mb-3">
            Formula Area
          </p>

          {/* Drop zone — accepts dragged classifications */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              'flex-1 min-h-[200px] rounded-xl p-4 flex flex-wrap gap-2 content-start mb-4',
              'border-2 border-dashed transition-colors duration-150',
              isDragOver
                ? 'border-[#01C9A4] bg-[#f0fdf9]'
                : 'border-[#dde4ee] bg-white',
            ].join(' ')}
          >
            {tokens.length === 0 ? (
              <span className="text-[#a0aec0] text-[13px] italic self-center w-full text-center">
                {panelEnabled
                  ? 'Drag a classification here, or click one from the left panel…'
                  : 'Select a classification from the dropdown to start building…'}
              </span>
            ) : (
              tokens.map((t, i) => (
                <Token key={i} value={t} onRemove={() => removeToken(i)} />
              ))
            )}
          </div>

          {/* Action buttons — Cancel / Refresh / Save all disabled until tokens exist */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={!hasTokens}
              className="flex items-center gap-1.5 px-4 py-[9px] border border-[#dde4ee]
                         rounded-[8px] text-[13px] font-medium text-[#041E66]
                         hover:bg-[#EFF3FF] disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleRefresh}
              disabled={!hasTokens}
              className="flex items-center gap-1.5 px-4 py-[9px] border border-[#dde4ee]
                         rounded-[8px] text-[13px] font-medium text-[#041E66]
                         hover:bg-[#EFF3FF] disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>

            <button
              onClick={handleSave}
              disabled={!hasTokens || saving}
              className="flex items-center gap-1.5 px-4 py-[9px] bg-[#0B39B5]
                         text-white rounded-[8px] text-[13px] font-semibold
                         hover:bg-[#0a2e94] disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {isEdit ? 'Update' : 'Save Formula'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Cancel confirmation modal ── */}
      <ConfirmModal
        open={confirmCancel}
        message="All the changes you made will be lost. Are you sure you want to discard all your changes?"
        onYes={() => { setConfirmCancel(false); onBack() }}
        onNo={() => setConfirmCancel(false)}
      />

      {/* ── Validation error modal ── */}
      {errorMsg && <ErrorModal message={errorMsg} onClose={() => setErrorMsg(null)} />}
    </div>
  )
}

export default FormulaBuilderView
