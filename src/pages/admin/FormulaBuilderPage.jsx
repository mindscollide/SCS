/**
 * pages/admin/FormulaBuilderPage.jsx
 * =====================================
 * Admin creates arithmetic formulas for "Calculated" classifications.
 *
 * How it works
 * ------------
 * 1. Admin selects a Classification marked as "Calculated" from dropdown
 * 2. Clicks classification names and operator buttons to build formula tokens
 * 3. Tokens appear in the Formula Builder Area as coloured chips
 * 4. Click Refresh to clear. Click Save to persist.
 *
 * Formula tokens
 * --------------
 * - Classification names → green chips
 * - Operators (+, -, /, ×, (, )) → amber chips
 *
 * Saved formulas appear as collapsible cards below.
 *
 * TODO: POST /api/admin/formulas on save, GET on load.
 */

import React, { useState } from 'react'
import { Plus, RefreshCw, Save, ChevronDown, ChevronRight, Edit } from 'lucide-react'
import { MOCK_CLASSIFICATIONS } from '../../utils/mockData.js'
import { toast } from 'react-toastify'

const OPERATORS = ['+', '−', '÷', '×', '(', ')']

const SAVED_FORMULAS = [
  { id: 1, name: 'Total Long-Term Finance', formula: 'Long-Term Finance − Less: Islamic Finance (LT)', active: true },
]

const FormulaBuilderPage = () => {
  const [view,            setView]           = useState('list')   // 'list' | 'builder'
  const [formulas,        setFormulas]       = useState(SAVED_FORMULAS)
  const [expanded,        setExpanded]       = useState({})
  const [selectedClass,   setSelectedClass]  = useState('')
  const [tokens,          setTokens]         = useState([])

  /** Classifications that CAN have a formula (calculated = true) */
  const calcClasses = MOCK_CLASSIFICATIONS.filter(c => c.calculated && c.status === 'Active')
  /** All active classifications available as operands */
  const allClasses  = MOCK_CLASSIFICATIONS.filter(c => c.status === 'Active')

  const addToken  = (t) => setTokens(p => [...p, t])
  const clearTokens = () => setTokens([])

  const handleSave = () => {
    if (!selectedClass) { toast.error('Please select a classification'); return }
    if (tokens.length < 3)  { toast.error('Formula must have at least 3 tokens'); return }
    setFormulas(p => [...p, { id: Date.now(), name: selectedClass, formula: tokens.join(' '), active: true }])
    toast.success('Formula saved successfully')
    setView('list')
    setTokens([])
    setSelectedClass('')
  }

  /* ── List view ── */
  if (view === 'list') return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Formula Builder</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Define arithmetic formulas for calculated classifications</p>
        </div>
        <button onClick={() => setView('builder')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a6b3c] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a8a4f] transition-colors">
          <Plus size={15} /> Add Formula
        </button>
      </div>

      {formulas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          No formulas yet. Click "Add Formula" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {formulas.map(f => (
            <div key={f.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
              <button
                onClick={() => setExpanded(p => ({ ...p, [f.id]: !p[f.id] }))}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                {expanded[f.id] ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                <span className="flex-1 text-[14px] font-semibold text-slate-800">{f.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${f.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {f.active ? 'Active' : 'Inactive'}
                </span>
                <button className="ml-2 w-8 h-8 rounded-lg hover:bg-[#edf7f1] hover:text-[#1a6b3c] text-slate-400 flex items-center justify-center transition-all"
                  onClick={e => { e.stopPropagation(); toast.info('Edit mode coming soon') }}>
                  <Edit size={14} />
                </button>
              </button>
              {expanded[f.id] && (
                <div className="px-5 pb-4 pt-0 border-t border-slate-100">
                  <p className="text-[12px] text-slate-500 mb-2 mt-3">Formula expression:</p>
                  <code className="block bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-[13px] text-slate-700 font-mono">
                    {f.formula}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  /* ── Builder view ── */
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Formula Builder</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Build an arithmetic formula for a calculated classification</p>
        </div>
        <button onClick={() => setView('list')}
          className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          ← Back to List
        </button>
      </div>

      {/* Classification selector */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5 mb-4">
        <div className="max-w-sm">
          <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
            Classification <span className="text-red-500">*</span>
          </label>
          <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
            value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">-- Select a Calculated Classification --</option>
            {calcClasses.map(c => <option key={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Builder area */}
      <div className="grid grid-cols-[280px_1fr] gap-4">
        {/* Left: operands and operators */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Operators</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {OPERATORS.map(op => (
              <button key={op} onClick={() => addToken(op)}
                className="w-10 h-10 rounded-lg border border-amber-200 bg-amber-50 text-amber-700
                           text-[16px] font-bold hover:bg-amber-100 transition-colors">
                {op}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Classifications</p>
          <div className="space-y-1.5">
            {allClasses.map(c => (
              <button key={c.id} onClick={() => addToken(c.name)}
                className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 text-[12px] font-medium text-slate-700
                           hover:bg-[#edf7f1] hover:text-[#1a6b3c] hover:border-[#b8dfc9] transition-all">
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: formula canvas */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Formula Area</p>
          <div className="min-h-[130px] border-2 border-dashed border-slate-300 rounded-xl p-4
                          flex flex-wrap gap-2 content-start mb-4">
            {tokens.length === 0 ? (
              <span className="text-slate-400 text-[13px] italic">
                Click classifications and operators on the left to build your formula…
              </span>
            ) : tokens.map((t, i) => {
              const isOp = OPERATORS.includes(t)
              return (
                <span key={i} className={`px-3 py-1 rounded-full text-[12px] font-semibold
                                          ${isOp
                                            ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                            : 'bg-[#edf7f1] border border-[#b8dfc9] text-[#1a6b3c]'
                                          }`}>
                  {t}
                </span>
              )
            })}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={clearTokens} disabled={tokens.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
              <RefreshCw size={14} /> Clear
            </button>
            <button onClick={() => setView('list')}
              className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!selectedClass || tokens.length < 3}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a6b3c] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a8a4f] disabled:opacity-40 transition-colors">
              <Save size={14} /> Save Formula
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormulaBuilderPage
