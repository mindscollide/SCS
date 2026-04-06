/**
 * src/pages/admin/FormulaBuilderPage.jsx
 * ========================================
 * Formula Builder page — manages state and switches between list and builder views.
 *
 * Views:
 *  "list"    → FormulaListView  (browse + search saved formulas)
 *  "builder" → FormulaBuilderView (add / edit a formula)
 *
 * State managed here:
 *  formulas  — master list of saved formulas
 *  editItem  — formula being edited (null = add mode)
 *  view      — current active view
 *
 * TODO
 * ─────
 * - GET  /api/admin/formulas        → replace INITIAL_FORMULAS
 * - GET  /api/admin/classifications  → replace MOCK_CLASSIFICATIONS
 * - POST /api/admin/formulas         → replace local add in handleSave
 * - PUT  /api/admin/formulas/:id     → replace local update in handleSave
 */

import React, { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import FormulaListView from '../../components/common/formulaBuilder/FormulaListView'
import FormulaBuilderView from '../../components/common/formulaBuilder/FormulaBuilderView'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — replace with API calls
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CLASSIFICATIONS = [
  {
    id: 1,
    name: 'Cash & Cash Equivalents',
    calculated: false,
    status: 'Active',
  },
  { id: 2, name: 'Long Term Finance', calculated: false, status: 'Active' },
  {
    id: 3,
    name: 'Less: Islamic Finance (LT)',
    calculated: false,
    status: 'Active',
  },
  {
    id: 4,
    name: 'Total Long-Term Finance',
    calculated: true,
    status: 'Active',
  },
  { id: 5, name: 'Short Term Finance', calculated: false, status: 'Active' },
  {
    id: 6,
    name: 'Less: Islamic Finance (ST)',
    calculated: false,
    status: 'Active',
  },
  {
    id: 7,
    name: 'Total Short-Term Finance',
    calculated: true,
    status: 'Active',
  },
  { id: 8, name: 'Total Assets', calculated: true, status: 'Active' },
  { id: 9, name: 'Total Revenue', calculated: false, status: 'Active' },
  {
    id: 10,
    name: 'Non-Compliant Revenue',
    calculated: false,
    status: 'Active',
  },
]

const INITIAL_FORMULAS = [
  {
    id: 1,
    classificationId: 4,
    name: 'Total Interest Bearing Long term Finance',
    subtitle: 'This is the default Compliance Criteria of Hilal',
    tokens: ['Long Term Finance', '−', 'Less: Islamic Finance (LT)'],
    active: true,
  },
  {
    id: 2,
    classificationId: 7,
    name: 'Total Interest Bearing Short term Finance',
    subtitle: '',
    tokens: ['Short Term Finance', '−', 'Less: Islamic Finance (ST)'],
    active: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const FormulaBuilderPage = () => {
  const [view, setView] = useState('list') // "list" | "builder"
  const [formulas, setFormulas] = useState(INITIAL_FORMULAS)
  const [editItem, setEditItem] = useState(null) // null = add, object = edit

  // ── Navigation handlers ──────────────────────────────

  const handleAdd = useCallback(() => {
    setEditItem(null)
    setView('builder')
  }, [])
  const handleEdit = useCallback((f) => {
    setEditItem(f)
    setView('builder')
  }, [])
  const handleBack = useCallback(() => {
    setEditItem(null)
    setView('list')
  }, [])

  // ── Save handler — called by FormulaBuilderView ──────

  const handleSave = useCallback(
    ({ classificationId, name, tokens, active }) => {
      if (editItem) {
        // TODO: PUT /api/admin/formulas/:id
        setFormulas((prev) =>
          prev.map((f) => (f.id === editItem.id ? { ...f, name, tokens, active } : f))
        )
        toast.success('Record Updated Successfully')
      } else {
        // TODO: POST /api/admin/formulas
        setFormulas((prev) => [
          ...prev,
          {
            id: Date.now(),
            classificationId,
            name,
            subtitle: '',
            tokens,
            active: true,
          },
        ])
        toast.success('Record Added Successfully')
      }
      setEditItem(null)
      setView('list')
    },
    [editItem]
  )

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────

  if (view === 'builder') {
    return (
      <div className="font-sans">
        {/* ── Builder page header ── */}
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] font-[400] text-[#0B39B5]">Formula Builder</h1>
            <button
              onClick={handleBack}
              className="px-4 py-[9px] rounded-[8px] border  bg-[#01C9A4]
                         text-[13px] font-medium text-[#fff] hover:bg-[#00a888] transition-colors"
            >
              ← Back to Listing
            </button>
          </div>
        </div>

        {/* ── Builder component ── */}
        <FormulaBuilderView
          formulas={formulas}
          classifications={MOCK_CLASSIFICATIONS}
          onBack={handleBack}
          onSave={handleSave}
          editFormula={editItem}
        />
      </div>
    )
  }

  return <FormulaListView formulas={formulas} onAdd={handleAdd} onEdit={handleEdit} />
}

export default FormulaBuilderPage
