/**
 * src/pages/admin/FormulaBuilderPage.jsx
 * ========================================
 * Formula Builder page — manages state and switches between list and builder views.
 *
 * Views:
 *  "list"    → FormulaListView  (browse + search saved formulas)
 *  "builder" → FormulaBuilderView (add / edit a formula)
 *
 * Data flow:
 *  Mount         → GetAllFormulas + GetAllActiveClassifications (parallel, skipLoader)
 *  Add click     → builder view with empty form + allClassifications
 *  Edit click    → builder view pre-filled; tokens rebuilt from stored IDs (rename-proof)
 *  Save (Create) → CreateFormula → reload formulas → back to list
 *  Save (Update) → UpdateFormula → reload formulas → back to list
 *
 * Dual formula expressions (backend change 2026-06-03):
 *  Every formula is stored TWO ways and both are sent on create/update:
 *   - FormulaExpression        — classification NAMES  ("Total Debt + Net Income")
 *   - FormulaExpressionWithIDs — classification IDs    ("47 + 12")
 *  The canvas always works in names; IDs are derived on save via classByName and
 *  resolved back to current names on edit via classById. The ID form is rename-proof:
 *  if a classification is renamed, an edited formula still shows the correct
 *  current name because it is rebuilt from the stored IDs, not the stored names.
 *  Older rows (saved before this column existed) have an empty ID expression and
 *  transparently fall back to the stored name tokens.
 *
 * Data mappers:
 *  mapFormula(f)         — API formula object → component shape
 *  mapClassification(c)  — API classification object → component shape
 *
 * Component shape (formula):
 *  { id, classificationId, name, subtitle, tokens[], tokensWithIds[], active }
 *   - tokens[]:        name + operator tokens (canvas display / fallback)
 *   - tokensWithIds[]: raw ID + operator tokens (used to rebuild edit tokens)
 *
 * Component shape (classification):
 *  { id, name, calculated, status }
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import { toast } from 'react-toastify'
import { BtnTeal } from '../../components/common'
import FormulaListView from '../../components/common/formulaBuilder/FormulaListView'
import FormulaBuilderView from '../../components/common/formulaBuilder/FormulaBuilderView'
import {
  getAllFormulas,
  getAllActiveClassifications,
  createFormula,
  updateFormula,
  CREATE_FORMULA_CODES,
  UPDATE_FORMULA_CODES,
} from '../../services/admin.service'

// ─── Toast helper ─────────────────────────────────────────────────────────────
const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

// ─── Data mappers ─────────────────────────────────────────────────────────────

/** Operators used as token separators — single-character, space-delimited in the stored string */
const FORMULA_OPS = new Set(['+', '-', '/', 'x', '(', ')', '='])

/**
 * Parses a stored formulaExpression string back into a tokens array.
 *
 * The expression is saved as `tokens.join(' ')`, so operators are always
 * standalone space-separated single characters. Classification names are
 * multi-word and get merged back by collecting consecutive non-operator parts.
 *
 * e.g. "Current Liabilities + Total Debt x ( Net Income / Revenue )"
 *  →  ["Current Liabilities", "+", "Total Debt", "x", "(", "Net Income", "/", "Revenue", ")"]
 */
const parseFormulaExpression = (expression) => {
  if (!expression) return []
  const tokens = []
  let nameParts = []
  for (const part of expression.split(' ')) {
    if (FORMULA_OPS.has(part)) {
      if (nameParts.length) {
        tokens.push(nameParts.join(' '))
        nameParts = []
      }
      tokens.push(part)
    } else {
      nameParts.push(part)
    }
  }
  if (nameParts.length) tokens.push(nameParts.join(' '))
  return tokens
}

/**
 * Parses a stored formulaExpressionWithIDs string into raw ID/operator tokens.
 *
 * Unlike names, classification IDs are single space-separated tokens with no
 * multi-word merging needed — e.g. "12 + 47 x ( 5 / 8 )" → ["12","+","47","x","(","5","/","8",")"].
 * Operators stay as-is; everything else is a numeric classification ID string.
 *
 * Returns [] when the field is null/empty (older formula rows saved before the
 * FormulaExpressionWithIDs column existed — the page then falls back to names).
 */
const parseIdExpression = (expression) => (expression ? expression.split(' ').filter(Boolean) : [])

/**
 * API formula → component formula shape.
 *
 * formulaExpression is a space-joined token string saved as `tokens.join(' ')`.
 * We parse it back with parseFormulaExpression so multi-word classification
 * names (e.g. "Current Liabilities") become a single token, not separate words.
 */
const mapFormula = (f) => ({
  id: f.formulaID,
  classificationId: f.classificationID,
  name: f.classificationName,
  subtitle: '',
  tokens: parseFormulaExpression(f.formulaExpression), // name tokens (display / fallback)
  tokensWithIds: parseIdExpression(f.formulaExpressionWithIDs), // raw ID tokens (rename-proof edit)
  active: f.status === 'Active',
})

/**
 * API classification → component classification shape.
 * GetAllActiveClassifications only returns active ones — status is always 'Active'.
 */
const mapClassification = (c) => ({
  id: c.pK_ClassificationID,
  name: c.name,
  calculated: c.isCalculated,
  status: 'Active',
})

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FormulaBuilderPage = () => {
  const [view, setView] = useState('list') // 'list' | 'builder'
  const [formulas, setFormulas] = useState([])
  const [allClassifications, setAllClassifications] = useState([])
  const [editItem, setEditItem] = useState(null) // null = add, object = edit
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [saving, setSaving] = useState(false)

  // ── Guard: prevents StrictMode's double-invocation from firing two requests ──
  const fetchedRef = useRef(false)

  // ── Classification lookup maps (rebuilt when the active list changes) ──────
  // classById:   id   → current name  (used to rebuild edit tokens from stored IDs)
  // classByName: name → id            (used to build FormulaExpressionWithIDs on save)
  const classById = useMemo(
    () => new Map(allClassifications.map((c) => [String(c.id), c.name])),
    [allClassifications]
  )
  const classByName = useMemo(
    () => new Map(allClassifications.map((c) => [c.name, c.id])),
    [allClassifications]
  )

  // ── Fetch formulas + classifications ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingInitial(true)

    const [formulasRes, classRes] = await Promise.all([
      getAllFormulas(
        { ClassificationName: '', PageSize: 1000, PageNumber: 0 },
        { skipLoader: true }
      ),
      getAllActiveClassifications({ skipLoader: true }),
    ])

    // ── Formulas ──
    if (formulasRes.success) {
      const list = formulasRes.data?.responseResult?.formulas || []
      setFormulas(list.map(mapFormula))
    } else {
      showError(formulasRes.message || 'Failed to load formulas.')
      setFormulas([])
    }

    // ── Active classifications (for builder operand palette + dropdown) ──
    if (classRes.success) {
      const list = classRes.data?.responseResult?.classifications || []
      setAllClassifications(list.map(mapClassification))
    } else {
      showError(classRes.message || 'Failed to load classifications.')
      setAllClassifications([])
    }

    setLoadingInitial(false)
  }, [])

  // ── Mount effect ─────────────────────────────────────────────────────────
  // fetchedRef persists across StrictMode's simulated unmount/remount cycle,
  // so the second invocation sees true and returns without making any API call.
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    loadData()
  }, [loadData])

  // ── MQTT — real-time formula list updates ─────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      // Prepend new formula row (only visible in list view)
      [MQTT_TYPE.FORMULA_CREATED]: (payload) => {
        const f = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!f) return
        setFormulas((prev) => [mapFormula(f), ...prev])
      },

      // Update matching formula row in-place
      [MQTT_TYPE.FORMULA_UPDATED]: (payload) => {
        const f = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!f) return
        setFormulas((prev) => prev.map((row) => (row.id === f.formulaID ? mapFormula(f) : row)))
      },
    }),
    []
  )

  useSubscribe(mqttTopic, mqttHandler)

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleAdd = useCallback(() => {
    setEditItem(null)
    setView('builder')
  }, [])

  const handleEdit = useCallback(
    (formula) => {
      // Rebuild canvas tokens from the stored ID expression, resolving each ID to
      // its CURRENT classification name — so a formula still displays correctly even
      // if a classification was renamed after it was saved.
      // Falls back to the stored name tokens when:
      //  - the formula has no ID expression (old row), or
      //  - any ID fails to resolve (e.g. classification later deactivated).
      let tokens = formula.tokens
      if (formula.tokensWithIds?.length) {
        const resolved = formula.tokensWithIds.map((t) =>
          FORMULA_OPS.has(t) ? t : classById.get(String(t))
        )
        if (resolved.every(Boolean)) tokens = resolved
      }
      setEditItem({ ...formula, tokens })
      setView('builder')
    },
    [classById]
  )

  const handleBack = useCallback(() => {
    setEditItem(null)
    setView('list')
  }, [])

  // ── Save handler (called by FormulaBuilderView) ───────────────────────────
  // Receives { classificationId, name, tokens, active } from the view.
  // Converts tokens[] → FormulaExpression string before sending to the API.

  const handleSave = useCallback(
    async ({ classificationId, tokens, active }) => {
      // Name-based expression (display / human-readable) — joined token names.
      const expression = tokens.join(' ')
      // ID-based expression (rename-proof) — map each classification token to its
      // ID, keeping operators as-is. Falls back to the name if an ID is missing.
      const expressionWithIds = tokens
        .map((t) => (FORMULA_OPS.has(t) ? t : (classByName.get(t) ?? t)))
        .join(' ')
      setSaving(true)

      if (editItem) {
        // ── Update existing formula ─────────────────────────────────────────
        const result = await updateFormula({
          FormulaID: editItem.id,
          FK_ClassificationID: classificationId,
          FormulaExpression: expression,
          FormulaExpressionWithIDs: expressionWithIds,
          IsActive: active,
        })

        setSaving(false)

        const code = result.data?.responseResult?.responseMessage
        if (code === 'Admin_AdminServiceManager_UpdateFormula_05') {
          toast.success('Formula updated successfully')
          setEditItem(null)
          setView('list')
          loadData() // refresh list with updated data
        } else {
          showError(
            UPDATE_FORMULA_CODES[code] ||
              result.message ||
              'Failed to update formula, please try again.'
          )
        }
      } else {
        // ── Create new formula ──────────────────────────────────────────────
        const result = await createFormula({
          FK_ClassificationID: classificationId,
          FormulaExpression: expression,
          FormulaExpressionWithIDs: expressionWithIds,
        })

        setSaving(false)

        const code = result.data?.responseResult?.responseMessage
        if (code === 'Admin_AdminServiceManager_CreateFormula_05') {
          toast.success('Formula created successfully')
          setEditItem(null)
          setView('list')
          loadData() // refresh list + classifications (one less formula-free class)
        } else {
          showError(
            CREATE_FORMULA_CODES[code] ||
              result.message ||
              'Failed to create formula, please try again.'
          )
        }
      }
    },
    [editItem, loadData, classByName]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — builder view
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'builder') {
    return (
      <div className="font-sans">
        {/* Header */}
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] font-[400] text-[#0B39B5]">Formula Builder</h1>
            <BtnTeal disabled={saving} onClick={handleBack}>
              ← Back to Listing
            </BtnTeal>
          </div>
        </div>

        <FormulaBuilderView
          classifications={allClassifications}
          onBack={handleBack}
          onSave={handleSave}
          editFormula={editItem}
          saving={saving}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — list view
  // ─────────────────────────────────────────────────────────────────────────

  if (loadingInitial) {
    return (
      <div className="font-sans">
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Formula Builder</h1>
        </div>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-9 h-9 border-4 border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return <FormulaListView formulas={formulas} onAdd={handleAdd} onEdit={handleEdit} />
}

export default FormulaBuilderPage
