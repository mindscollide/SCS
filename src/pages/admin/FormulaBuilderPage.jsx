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
 *  Edit click    → builder view pre-filled from list data + allClassifications
 *  Save (Create) → CreateFormula → reload formulas → back to list
 *  Save (Update) → UpdateFormula → reload formulas → back to list
 *
 * Data mappers:
 *  mapFormula(f)         — API formula object → component shape
 *  mapClassification(c)  — API classification object → component shape
 *
 * Component shape (formula):
 *  { id, classificationId, name, subtitle, tokens[], active }
 *
 * Component shape (classification):
 *  { id, name, calculated, status }
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { BtnTeal } from '../../components/common'
import FormulaListView    from '../../components/common/formulaBuilder/FormulaListView'
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
    style:         { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

// ─── Data mappers ─────────────────────────────────────────────────────────────

/**
 * API formula → component formula shape.
 *
 * formulaExpression is a space-joined token string (e.g. "Basic + HRA + Allowance").
 * We split it back to a tokens array for the builder canvas.
 */
const mapFormula = (f) => ({
  id:               f.formulaID,
  classificationId: f.classificationID,
  name:             f.classificationName,
  subtitle:         '',
  tokens:           f.formulaExpression ? f.formulaExpression.split(' ') : [],
  active:           f.status === 'Active',
})

/**
 * API classification → component classification shape.
 * GetAllActiveClassifications only returns active ones — status is always 'Active'.
 */
const mapClassification = (c) => ({
  id:         c.classificationID,
  name:       c.name,
  calculated: c.isCalculated,
  status:     'Active',
})

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FormulaBuilderPage = () => {
  const [view,               setView]               = useState('list')  // 'list' | 'builder'
  const [formulas,           setFormulas]           = useState([])
  const [allClassifications, setAllClassifications] = useState([])
  const [editItem,           setEditItem]           = useState(null)    // null = add, object = edit
  const [loadingInitial,     setLoadingInitial]     = useState(true)
  const [saving,             setSaving]             = useState(false)

  // ── Guard: prevents StrictMode's double-invocation from firing two requests ──
  const fetchedRef = useRef(false)

  // ── Fetch formulas + classifications ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoadingInitial(true)

    const [formulasRes, classRes] = await Promise.all([
      getAllFormulas(
        { ClassificationName: '', PageSize: 1000, PageNumber: 0 },
        { skipLoader: true }
      ),
      getAllActiveClassifications({}, { skipLoader: true }),
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

  // ── Navigation handlers ───────────────────────────────────────────────────

  const handleAdd = useCallback(() => {
    setEditItem(null)
    setView('builder')
  }, [])

  const handleEdit = useCallback((formula) => {
    setEditItem(formula)
    setView('builder')
  }, [])

  const handleBack = useCallback(() => {
    setEditItem(null)
    setView('list')
  }, [])

  // ── Save handler (called by FormulaBuilderView) ───────────────────────────
  // Receives { classificationId, name, tokens, active } from the view.
  // Converts tokens[] → FormulaExpression string before sending to the API.

  const handleSave = useCallback(
    async ({ classificationId, tokens, active }) => {
      const expression = tokens.join(' ')
      setSaving(true)

      if (editItem) {
        // ── Update existing formula ─────────────────────────────────────────
        const result = await updateFormula({
          FormulaID:           editItem.id,
          FK_ClassificationID: classificationId,
          FormulaExpression:   expression,
          IsActive:            active,
        })

        setSaving(false)

        const code = result.data?.responseResult?.responseMessage
        if (code === 'Admin_AdminServiceManager_UpdateFormula_05') {
          toast.success('Formula updated successfully')
          setEditItem(null)
          setView('list')
          loadData()   // refresh list with updated data
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
          FormulaExpression:   expression,
        })

        setSaving(false)

        const code = result.data?.responseResult?.responseMessage
        if (code === 'Admin_AdminServiceManager_CreateFormula_05') {
          toast.success('Formula created successfully')
          setEditItem(null)
          setView('list')
          loadData()   // refresh list + classifications (one less formula-free class)
        } else {
          showError(
            CREATE_FORMULA_CODES[code] ||
            result.message ||
            'Failed to create formula, please try again.'
          )
        }
      }
    },
    [editItem, loadData]
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

  return (
    <FormulaListView
      formulas={formulas}
      onAdd={handleAdd}
      onEdit={handleEdit}
    />
  )
}

export default FormulaBuilderPage
