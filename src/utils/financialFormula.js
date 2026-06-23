/**
 * src/utils/financialFormula.js
 * ==============================
 * Client-side formula evaluation for the Financial Data entry grid.
 *
 * Context
 * ───────
 * GetFinancialDataForEntry returns, per classification:
 *   - isCalculated: 1  → has `expression` (FormulaExpressionWithIDs), e.g. ["63 + 45 x 32"]
 *                        where 63/45/32 are CLASSIFICATION IDs (not literals) and
 *                        the operators are space-separated.
 *   - isCalculated: 0  → has `isDependentClassification` (IDs of the calculated
 *                        classifications whose formula references THIS one).
 *
 * The entry column (index 0 = the selected/current quarter, e.g. Dec 2027) is the
 * only editable column. A calculated classification's value in that column is the
 * result of evaluating its expression using the CURRENT column-0 values of the
 * classifications it references. When a base value changes, every calculated cell
 * is recomputed so dependents (and their dependents, transitively) stay correct.
 *
 * Operators (FormulaExpressionWithIDs): `+`  `-`  `x` (multiply)  `/` (divide)  `(`  `)`
 * Precedence: x,/ bind tighter than +,-. Left-associative. Parentheses respected.
 *
 * Two distinct value-derivation rules:
 *  - computeCalculatedColumn (isCalculated rows) — LIVE: recomputed on every edit,
 *    read-only cells, driven by `expression`.
 *  - applyProratedColumn (isProrated rows) — ONE-SHOT: seeded once on render from the
 *    previous-quarter proportion, then stays editable (manual values are kept).
 *
 * Also exports `mapEntryDataToTable` — the response → grid mapper shared by the
 * Add/Edit form (GetFinancialDataForEntry / GetFinancialDataByID) and the View page.
 *
 * Pure functions only — no eval(), no React, fully testable.
 */

/** Operator precedence — multiply/divide bind tighter than add/subtract. */
const PRECEDENCE = { '+': 1, '-': 1, x: 2, '/': 2 }

/** Normalise operator variants to canonical tokens (x = multiply, / = divide). */
const normalizeOp = (t) => {
  if (t === '*' || t === '×' || t === 'X') return 'x'
  if (t === '÷') return '/'
  return t
}

/**
 * Parse a display value ("1,234.50", "-", "", "500") → number.
 * Blank / non-numeric → 0 (so empty inputs don't break a formula).
 */
export const parseFinancialValue = (v) => {
  if (v === null || v === undefined) return 0
  const n = parseFloat(String(v).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

/**
 * Format a computed number back to a plain display string.
 * Rounds to 2 dp (financial precision) to kill floating-point noise.
 */
export const formatComputedValue = (n) => {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

/**
 * Evaluate a FormulaExpressionWithIDs string where each numeric token is a
 * classification ID resolved through `getValue(id) → number`.
 * Uses the shunting-yard algorithm → RPN → stack evaluation (precedence + parens).
 *
 * @param {string|string[]} expression  e.g. "63 + 45 x 32" or ["63 + 45 x 32"]
 * @param {(id:number)=>number} getValue resolver: classification ID → numeric value
 * @returns {number} result (0 for empty / malformed input)
 */
export const evaluateExpression = (expression, getValue) => {
  const raw = Array.isArray(expression) ? expression[0] : expression
  if (!raw) return 0
  const tokens = String(raw).trim().split(/\s+/).filter(Boolean)
  if (!tokens.length) return 0

  // ── Shunting-yard: infix tokens → RPN output queue ──
  const output = [] // mix of { id:number } operands and operator strings
  const ops = []
  for (let tok of tokens) {
    tok = normalizeOp(tok)
    if (tok === '(') {
      ops.push(tok)
    } else if (tok === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop())
      ops.pop() // discard the matching '('
    } else if (PRECEDENCE[tok] != null) {
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[tok]
      ) {
        output.push(ops.pop())
      }
      ops.push(tok)
    } else {
      // operand — a bare classification ID
      output.push({ id: Number(tok) })
    }
  }
  while (ops.length) output.push(ops.pop())

  // ── Evaluate the RPN queue ──
  const stack = []
  for (const item of output) {
    if (item && typeof item === 'object') {
      stack.push(getValue(item.id))
    } else {
      const b = stack.pop() ?? 0
      const a = stack.pop() ?? 0
      switch (item) {
        case '+': stack.push(a + b); break
        case '-': stack.push(a - b); break
        case 'x': stack.push(a * b); break
        case '/': stack.push(b === 0 ? 0 : a / b); break // divide-by-zero → 0
        default:  stack.push(0)
      }
    }
  }
  return stack.length ? stack[stack.length - 1] : 0
}

/**
 * Recompute every calculated classification's value in `colIdx` from the current
 * base + calculated values, resolving nested formula dependencies recursively.
 *
 * - Base classifications (isCalculated falsy) → use their current cell value.
 * - Calculated classifications → evaluate their expression; referenced IDs are
 *   resolved the same way (so a formula referencing another calculated row works).
 * - Memoised per call; a cycle guard returns 0 for self-referential loops.
 * - Pure: returns a NEW ratios array; only column `colIdx` is rewritten.
 *
 * @param {Array} ratios  [{ id, classifications: [{ id, isCalculated, expression, values[] }] }]
 * @param {number} colIdx  column to (re)compute — 0 = current/selected quarter
 * @returns {Array} new ratios array with calculated cells filled in for `colIdx`
 */
export const computeCalculatedColumn = (ratios = [], colIdx = 0) => {
  // Flat index across ALL ratio sections: classificationID → classification object.
  // (A formula may reference a classification from a different ratio section.)
  const byId = new Map()
  ratios.forEach((r) =>
    (r.classifications || []).forEach((c) => byId.set(Number(c.id), c))
  )

  const memo = new Map()

  const resolve = (id, stack) => {
    const cls = byId.get(Number(id))
    if (!cls) return 0 // referenced classification missing → treat as 0
    const isCalc = cls.isCalculated && Array.isArray(cls.expression) && cls.expression.length
    if (!isCalc) return parseFinancialValue(cls.values?.[colIdx])

    if (memo.has(Number(id))) return memo.get(Number(id))
    if (stack.has(Number(id))) return 0 // cycle guard
    stack.add(Number(id))
    const val = evaluateExpression(cls.expression, (refId) => resolve(refId, stack))
    stack.delete(Number(id))
    memo.set(Number(id), val)
    return val
  }

  return ratios.map((r) => ({
    ...r,
    classifications: (r.classifications || []).map((c) => {
      const isCalc = c.isCalculated && Array.isArray(c.expression) && c.expression.length
      if (!isCalc) return c
      const result = resolve(c.id, new Set())
      const newValues = [...(c.values || [])]
      // Keep full precision for percentage display — rounding happens after ×100 in Cell
      newValues[colIdx] = c.isDisplayAsPercentage ? String(result) : formatComputedValue(result)
      return { ...c, values: newValues }
    }),
  }))
}

/**
 * Apply the ONE-TIME prorated seed value for the entry column.
 *
 * A prorated classification P (isProrated, with baseClassification B) derives its
 * initial current-quarter value from the proportion it held in the PREVIOUS quarter:
 *
 *   P_prev = P.values[prevColIdx]                 // e.g. September 2027
 *   if P_prev <= 0 → P.values[colIdx] = 0         // previous quarter empty → seed 0
 *   else:
 *     ratio  = P_prev / B_prev                    // proportion of base last quarter (e.g. 20%)
 *     P_curr = ratio * B_curr                     // same proportion of base this quarter
 *
 * Differences from computeCalculatedColumn:
 *  - Render-time ONE-SHOT — call this once after Search, NOT on edits.
 *  - Prorated rows stay EDITABLE; a manual value entered later is never overwritten
 *    (this function is not re-run, so the seed only ever applies on first render).
 *  - Overwrites whatever the API returned for the current column (per spec:
 *    "current quarter value is not shown — we apply the proration instead").
 *
 * Pure: returns a NEW ratios array; only prorated rows' `colIdx` cell is rewritten.
 *
 * @param {Array}  ratios
 * @param {number} colIdx      current/entry column (0)
 * @param {number} prevColIdx  previous quarter column (defaults to colIdx + 1)
 */
export const applyProratedColumn = (ratios = [], colIdx = 0, prevColIdx = colIdx + 1) => {
  const byId = new Map()
  ratios.forEach((r) =>
    (r.classifications || []).forEach((c) => byId.set(Number(c.id), c))
  )

  return ratios.map((r) => ({
    ...r,
    classifications: (r.classifications || []).map((c) => {
      const baseId = c.baseClassification?.classificationID
      const isPro = c.isProrated && baseId
      if (!isPro) return c

      const pPrev = parseFinancialValue(c.values?.[prevColIdx])
      let result = 0
      if (pPrev > 0) {
        const base = byId.get(Number(baseId))
        const bPrev = parseFinancialValue(base?.values?.[prevColIdx])
        const bCurr = parseFinancialValue(base?.values?.[colIdx])
        if (bCurr > 0 && bPrev > 0) {
          result = (pPrev / bPrev) * bCurr
        } else {
          result = pPrev // carry forward when base not yet entered
        }
      }
      const newValues = [...(c.values || [])]
      newValues[colIdx] = formatComputedValue(result)
      return { ...c, values: newValues }
    }),
  }))
}

/**
 * Recompute prorated classifications whose base was just edited.
 *
 * Called on every cell edit (after value sync, before computeCalculatedColumn).
 * For each prorated classification whose baseClassification matches `changedClassId`,
 * recalculates: ratio = P_prev / B_prev, then P_curr = ratio * B_curr_new.
 * If previous quarter has no data (P_prev=0), the prorated cell stays 0.
 *
 * Pure: returns a NEW ratios array; only affected prorated rows are rewritten.
 *
 * @param {Array}  ratios           current ratios state
 * @param {number} changedClassId   the classification ID that was just edited
 * @param {number} colIdx           entry column (0)
 * @param {number} prevColIdx       previous quarter column (defaults to colIdx + 1)
 */
export const recomputeProratedForBase = (ratios = [], changedClassId, colIdx = 0, prevColIdx = colIdx + 1) => {
  const byId = new Map()
  ratios.forEach((r) =>
    (r.classifications || []).forEach((c) => byId.set(Number(c.id), c))
  )

  return ratios.map((r) => ({
    ...r,
    classifications: (r.classifications || []).map((c) => {
      const baseId = c.baseClassification?.classificationID
      if (!c.isProrated || !baseId || Number(baseId) !== Number(changedClassId)) return c

      const pPrev = parseFinancialValue(c.values?.[prevColIdx])
      let result = 0
      if (pPrev > 0) {
        const base = byId.get(Number(baseId))
        const bPrev = parseFinancialValue(base?.values?.[prevColIdx])
        const bCurr = parseFinancialValue(base?.values?.[colIdx])
        if (bCurr > 0 && bPrev > 0) {
          result = (pPrev / bPrev) * bCurr
        } else {
          result = pPrev
        }
      }
      const newValues = [...(c.values || [])]
      newValues[colIdx] = formatComputedValue(result)
      return { ...c, values: newValues }
    }),
  }))
}

/**
 * mapEntryDataToTable — transform a `responseResult` from GetFinancialDataForEntry
 * OR GetFinancialDataByID into the shape FinancialDataTable consumes: { columns, ratios }.
 * (Both responses share `quarters[]` + `financialRatios[]`; ByID also has a `header` which
 * this mapper ignores — the caller reads the header separately.)
 *
 *  columns ← quarters[]        : { id: quarterID, label: quarterName }  (response order, newest first)
 *  ratios  ← financialRatios[] : sorted by `sequence`
 *    id / label / ratioValue (`${thresholdValue}${thresholdUnit}`) / ratioUp (isMaxValidationApplied===1)
 *    classifications ← classificationList[]
 *      values[] ← quarterlyValues[], matched by quarterID to each column (order-independent; '' when absent)
 *      isTotal / isCalculated ← isCalculated===1 ; isProrated/hasPieIcon ← isProrated===1
 *      expression / isDependentClassification / baseClassification — carried through verbatim
 *
 * Numbers kept raw (String(value)); no thousands/decimal formatting.
 */
/**
 * buildValuesPayload — flatten the ratio grid into the API `Values` array for
 * SaveFinancialData / SaveAndSubmitFinancialData.
 *  - one entry per UNIQUE classification ID (a row may appear in multiple ratios),
 *  - Value = the numeric value currently in column `colIdx` (entry column = 0).
 *  - includes base, prorated AND calculated rows — whatever is currently in the cell.
 *
 * @returns {Array<{ FK_ClassificationID:number, Value:number }>}
 */
export const buildValuesPayload = (ratios = [], colIdx = 0) => {
  const seen = new Set()
  const values = []
  ratios.forEach((r) =>
    (r.classifications || []).forEach((c) => {
      const id = Number(c.id)
      if (!id || seen.has(id)) return
      seen.add(id)
      values.push({ FK_ClassificationID: id, Value: parseFinancialValue(c.values?.[colIdx]) })
    })
  )
  return values
}

export const mapEntryDataToTable = (result, { useRatioThreshold = true } = {}) => {
  const quarters = result?.quarters || []
  const financialRatios = result?.financialRatios || []

  const columns = quarters.map((q) => ({ id: q.quarterID, label: q.quarterName || '' }))

  const ratios = [...financialRatios]
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((r) => ({
      id: r.financialRatioID,
      label: r.financialRatioName || '',
      ratioValue: `${r.thresholdValue ?? ''}${r.thresholdUnit && r.thresholdUnit !== '#' ? r.thresholdUnit : ''}`,
      ratioUp: r.isMaxValidationApplied === 1,
      fK_NumeratorClassificationID: r.fK_NumeratorClassificationID ?? 0,
      fK_DenominatorClassificationID: r.fK_DenominatorClassificationID ?? 0,
      fK_ComparisonClassificationID: r.fK_ComparisonClassificationID ?? 0,
      thresholdsByQuarter: (() => {
        const map = new Map(
          (r.quarterlyThresholds || []).map((qt) => [
            qt.quarterID,
            {
              value: `${qt.thresholdValue ?? ''}${qt.thresholdUnit && qt.thresholdUnit !== '#' ? qt.thresholdUnit : ''}`,
              up: qt.isMaxValidationApplied === 1,
            },
          ])
        )
        return columns.map((col, i) => {
          // Add/Edit (useRatioThreshold): col 0 uses ratio-level threshold
          // View of approved data: all columns use quarterlyThresholds
          if (i === 0 && useRatioThreshold) {
            const unit = r.thresholdUnit && r.thresholdUnit !== '#' ? r.thresholdUnit : ''
            const val = `${r.thresholdValue ?? ''}${unit}`
            return val ? { value: val, up: r.isMaxValidationApplied === 1 } : null
          }
          const qt = map.get(col.id)
          if (qt && qt.value) return qt
          return null
        })
      })(),
      classifications: (r.classificationList || []).map((c) => {
        const valueByQuarter = new Map(
          (c.quarterlyValues || []).map((qv) => [qv.quarterID, qv.value])
        )
        const values = columns.map((col) => {
          const v = valueByQuarter.get(col.id)
          return v === undefined || v === null ? '' : String(v)
        })
        return {
          id: c.classificationID,
          label: c.classificationName || '',
          values,
          isTotal: c.isCalculated === 1,
          hasPieIcon: c.isProrated === 1,
          isCalculated: c.isCalculated === 1,
          isProrated: c.isProrated === 1,
          expression: c.expression || [],
          isDependentClassification: c.isDependentClassification || [],
          isDisplayAsPercentage: c.isDisplayAsPercentage === 1,
          baseClassification: c.baseClassification ||
            (c.baseClassificationID
              ? { classificationID: c.baseClassificationID, classificationName: c.baseClassificationName || '' }
              : {}),
        }
      }),
    }))

  return { columns, ratios }
}
