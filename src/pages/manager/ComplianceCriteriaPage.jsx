/**
 * pages/manager/ComplianceCriteriaPage.jsx
 * ==========================================
 * Manager configures Compliance Criteria via a 2-step wizard.
 *
 * Views: 'list' → 'step1' → 'step2'
 *
 * List View
 * ─────────
 * - "Add Criteria" button
 * - Default Criteria shown first, then alphabetical
 * - Each criteria as collapsible accordion panel
 * - Collapsed: Name | Default toggle | Edit icon | Expand icon
 * - Expanded: Description | Created Date | Last Modified | View Ratios icon
 * - Default toggle → ConfirmModal
 * - Search: Criteria Name, Description, Financial Ratio Name
 *
 * Step 1 – Criteria Details
 * ─────────────────────────
 * - Criteria Name: required, max 100 chars, unique check on blur
 * - Description: optional, max 500 chars
 * - Next enabled only after BOTH Name AND Description are provided
 * - Refresh clears form
 *
 * Step 2 – Add Financial Ratios
 * ─────────────────────────────
 * - Collapsible summary panel (criteria name)
 * - Financial Ratio dropdown
 * - On ratio select: Sequence (1–10), Unit (% / #), Threshold, Max/Min radio
 * - Add Ratio button (disabled until seq + threshold provided)
 * - Table: Ratio Name | Sequence | Threshold | Edit | Delete
 * - Refresh clears ratio form, Back → Step 1, Save → list
 * - Save disabled until ≥1 ratio added
 *
 * TODO: GET/POST/PUT /api/manager/compliance-criteria
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Plus, SquarePen, Trash2, ChevronDown, ChevronUp, X,
         ArrowLeft, RefreshCw, Eye, Star } from 'lucide-react'
import { toast } from 'react-toastify'
import { MOCK_CRITERIA } from '../../utils/mockData.js'
import { ConfirmModal } from '../../components/common/index.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Input from '../../components/common/Input/Input'
import Select from '../../components/common/select/Select'

// ── Mock ratios available to add to a criteria ────────────────────────────────
const AVAILABLE_RATIOS = [
  'Interest Bearing Debts to Total Assets',
  'Illiquid Assets to Total Assets',
  'Non-Permissible Income to Total Revenue',
  'Net Liquid Assets to Total Assets',
  'Revenue from Permissible Activities',
]

// ── Initial criteria with full ratio details ──────────────────────────────────
const INITIAL_CRITERIA = [
  {
    id: 1,
    name: 'Al-Hilal Standard Criteria',
    desc: 'Standard Sharia compliance criteria used by Hilal Investments.',
    isDefault: true,
    status: 'Active',
    createdOn: '2025-01-15',
    modifiedOn: '2026-02-10',
    ratioItems: [
      { id: 11, ratioName: 'Interest Bearing Debts to Total Assets', seq: 1, unit: '%', threshold: '33', direction: 'Maximum' },
      { id: 12, ratioName: 'Illiquid Assets to Total Assets',        seq: 2, unit: '%', threshold: '67', direction: 'Maximum' },
      { id: 13, ratioName: 'Non-Permissible Income to Total Revenue', seq: 3, unit: '%', threshold: '5',  direction: 'Maximum' },
    ],
  },
  {
    id: 2,
    name: 'AAOIFI Criteria',
    desc: 'Based on AAOIFI standards for Islamic finance.',
    isDefault: false,
    status: 'Active',
    createdOn: '2025-03-20',
    modifiedOn: '2025-11-05',
    ratioItems: [
      { id: 21, ratioName: 'Interest Bearing Debts to Total Assets', seq: 1, unit: '%', threshold: '30', direction: 'Maximum' },
      { id: 22, ratioName: 'Net Liquid Assets to Total Assets',       seq: 2, unit: '%', threshold: '51', direction: 'Minimum' },
    ],
  },
]

// ── View Ratios Modal ─────────────────────────────────────────────────────────
const ViewRatiosModal = ({ criteria, onClose }) => {
  if (!criteria) return null
  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7]">
          <span className="text-[15px] font-semibold text-[#0B39B5]">
            Financial Ratios — {criteria.name}
          </span>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <div className="rounded-xl overflow-hidden border border-[#dde4ee]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#dde4ee]" style={{ backgroundColor: '#E0E6F6' }}>
                  {['Ratio Name', 'Seq', 'Threshold', 'Direction'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.ratioItems.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-[#a0aec0]">No Ratios</td></tr>
                ) : criteria.ratioItems.map(r => (
                  <tr key={r.id} className="border-b border-[#eef2f7] last:border-0">
                    <td className="px-4 py-2.5 font-medium text-[#041E66]">{r.ratioName}</td>
                    <td className="px-4 py-2.5 text-[#041E66]">{r.seq}</td>
                    <td className="px-4 py-2.5 font-mono text-[#0B39B5]">
                      {r.unit === '%' ? `${r.threshold}%` : r.threshold}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                        ${r.direction === 'Maximum'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-teal-50 text-[#01C9A4]'}`}>
                        {r.direction === 'Maximum' ? '▼ Max' : '▲ Min'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-[#eef2f7]">
          <button onClick={onClose}
            className="px-5 py-2 bg-[#F5A623] hover:bg-[#e09a1a] text-white rounded-lg text-[13px] font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Filter config ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = { name: '', desc: '' }
const FILTER_FIELDS = [
  { key: 'name', label: 'Criteria Name',   type: 'input', maxLength: 100 },
  { key: 'desc', label: 'Description',     type: 'input', maxLength: 300 },
]
const CHIP_LABELS = { name: 'Criteria Name', desc: 'Description' }

// ── Empty wizard state ────────────────────────────────────────────────────────
const EMPTY_STEP1     = { name: '', desc: '' }
const EMPTY_RATIO_ROW = { ratioName: '', seq: '', unit: '%', threshold: '', direction: 'Maximum' }

// ── ComplianceCriteriaPage ────────────────────────────────────────────────────
const ComplianceCriteriaPage = () => {
  const sourceData = useRef(INITIAL_CRITERIA)
  const [criteria, setCriteria] = useState(INITIAL_CRITERIA)
  const [view,     setView]     = useState('list')
  const [editId,   setEditId]   = useState(null)
  const [expanded, setExpanded] = useState(new Set())

  // ── Modals ────────────────────────────────────────────────────────────────
  const [viewRatiosCriteria, setViewRatiosCriteria] = useState(null)
  const [defaultConfirm,     setDefaultConfirm]     = useState(null) // criteria to set as default

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch    = filters.name
  const setMainSearch = useCallback(val => setFilters(p => ({ ...p, name: val })), [])

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [step1,      setStep1]     = useState(EMPTY_STEP1)
  const [step1Errs,  setStep1Errs] = useState({})
  const [nameStatus, setNameStatus] = useState(null) // null | 'ok' | 'taken'

  // Step 1: Next enabled only when BOTH name AND description are provided
  const step1Valid = step1.name.trim() && step1.desc.trim() && nameStatus !== 'taken'

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [ratioRow,    setRatioRow]    = useState(EMPTY_RATIO_ROW)
  const [ratioRowErr, setRatioRowErr] = useState({})
  const [addedRatios, setAddedRatios] = useState([])
  const [editRatioId, setEditRatioId] = useState(null)
  const [summaryOpen, setSummaryOpen] = useState(false)

  // ── Derived: sorted list ──────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const f = applied
    return [...sourceData.current]
      .filter(c =>
        Object.entries(f).every(([k, v]) =>
          !v || (c[k] || '').toLowerCase().includes(v.toLowerCase())
        )
      )
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        return a.name.localeCompare(b.name)
      })
  }, [criteria, applied])

  // ── Filter handlers ───────────────────────────────────────────────────────
  const fetchData = useCallback(f => {
    setCriteria(sourceData.current.filter(c =>
      Object.entries(f).every(([k, v]) => !v || (c[k] || '').toLowerCase().includes(v.toLowerCase()))
    ))
  }, [])

  const handleSearch  = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => { if (v.trim()) next[k] = v.trim() })
    setApplied(next); fetchData(next); setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

  const handleReset   = useCallback(() => { setFilters(EMPTY_FILTERS); setApplied({}); fetchData({}) }, [fetchData])
  const handleFClose  = useCallback(() => setFilters(EMPTY_FILTERS), [])
  const removeChip    = useCallback(key => {
    setApplied(prev => { const n = { ...prev }; delete n[key]; fetchData(n); return n })
  }, [fetchData])

  const toggleExpand  = id => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // ── Open add wizard ───────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null)
    setStep1(EMPTY_STEP1); setStep1Errs({}); setNameStatus(null)
    setAddedRatios([]); setRatioRow(EMPTY_RATIO_ROW); setRatioRowErr({})
    setEditRatioId(null); setSummaryOpen(false)
    setView('step1')
  }

  // ── Open edit wizard ──────────────────────────────────────────────────────
  const openEdit = c => {
    setEditId(c.id)
    setStep1({ name: c.name, desc: c.desc || '' }); setStep1Errs({}); setNameStatus('ok')
    setAddedRatios(c.ratioItems.map(r => ({ ...r }))); setRatioRow(EMPTY_RATIO_ROW); setRatioRowErr({})
    setEditRatioId(null); setSummaryOpen(false)
    setView('step1')
  }

  // ── Step 1: name uniqueness check ─────────────────────────────────────────
  const checkNameUnique = () => {
    const trimmed = step1.name.trim()
    if (!trimmed) return
    const taken = sourceData.current.some(
      c => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editId
    )
    setNameStatus(taken ? 'taken' : 'ok')
    setStep1Errs(p => ({ ...p, name: taken ? 'Criteria Name already in use.' : '' }))
  }

  // ── Step 1: Next ──────────────────────────────────────────────────────────
  const goToStep2 = () => {
    const errs = {}
    if (!step1.name.trim()) errs.name = 'Please provide the required information'
    if (!step1.desc.trim()) errs.desc = 'Please provide the required information'
    if (nameStatus === 'taken') errs.name = 'Criteria Name already in use.'
    if (Object.keys(errs).length) { setStep1Errs(errs); return }
    setView('step2')
  }

  // ── Threshold validation based on unit ────────────────────────────────────
  const validateThreshold = (val, unit) => {
    const n = parseFloat(val)
    if (isNaN(n)) return 'Invalid Value'
    if (unit === '%'  && (n < 0.1 || n > 100))    return 'Value allowed 0.1 to 100.00'
    if (unit === '#'  && (n < 0.1 || n > 1000))   return 'Value allowed 0.1 to 1000.00'
    return ''
  }

  // ── Step 2: Add / Update ratio row ────────────────────────────────────────
  const handleAddRatio = () => {
    const errs = {}
    if (!ratioRow.ratioName)    errs.ratioName  = 'Please select a ratio'
    if (!ratioRow.seq)          errs.seq        = 'Required'
    if (!ratioRow.threshold.trim()) errs.threshold = 'Required'
    else {
      const thErr = validateThreshold(ratioRow.threshold, ratioRow.unit)
      if (thErr) errs.threshold = thErr
    }
    if (Object.keys(errs).length) { setRatioRowErr(errs); return }

    if (editRatioId) {
      setAddedRatios(prev => prev.map(r => r.id === editRatioId ? { ...r, ...ratioRow } : r))
      toast.success('Record updated successfully')
      setEditRatioId(null)
    } else {
      if (addedRatios.some(r => r.ratioName === ratioRow.ratioName)) {
        setRatioRowErr({ ratioName: 'Ratio already added' }); return
      }
      setAddedRatios(prev => [...prev, { id: Date.now(), ...ratioRow }])
      toast.success('Financial Ratio added successfully')
    }
    setRatioRow(EMPTY_RATIO_ROW)
    setRatioRowErr({})
  }

  const startEditRatioRow = r => {
    setEditRatioId(r.id)
    setRatioRow({ ratioName: r.ratioName, seq: r.seq, unit: r.unit, threshold: r.threshold, direction: r.direction })
    setRatioRowErr({})
  }

  const removeRatio = id => setAddedRatios(prev => prev.filter(r => r.id !== id))

  const refreshStep2 = () => {
    setRatioRow(EMPTY_RATIO_ROW); setRatioRowErr({}); setEditRatioId(null)
  }

  // ── Step 2: Save ──────────────────────────────────────────────────────────
  const handleSave = () => {
    const isFirst = sourceData.current.length === 0
    if (editId) {
      sourceData.current = sourceData.current.map(c =>
        c.id === editId
          ? { ...c, name: step1.name.trim(), desc: step1.desc.trim(),
              ratioItems: addedRatios, modifiedOn: new Date().toISOString().slice(0, 10) }
          : c
      )
    } else {
      sourceData.current = [
        ...sourceData.current,
        {
          id: Date.now(),
          name: step1.name.trim(),
          desc: step1.desc.trim(),
          isDefault: isFirst,
          status: 'Active',
          createdOn: new Date().toISOString().slice(0, 10),
          modifiedOn: new Date().toISOString().slice(0, 10),
          ratioItems: addedRatios,
        }
      ]
    }
    setCriteria([...sourceData.current])
    fetchData(applied)
    toast.success(editId ? 'Updated Successfully' : 'Record Added Successfully')
    setView('list')
  }

  // ── Set default criteria ──────────────────────────────────────────────────
  const handleSetDefault = () => {
    sourceData.current = sourceData.current.map(c =>
      ({ ...c, isDefault: c.id === defaultConfirm.id })
    )
    setCriteria([...sourceData.current])
    fetchData(applied)
    toast.success(`"${defaultConfirm.name}" is now the Default Compliance Criteria`)
    setDefaultConfirm(null)
  }

  // ── Ratio options (disable already-added in dropdown) ─────────────────────
  const ratioOptions = AVAILABLE_RATIOS.map(r => ({
    label: r,
    value: r,
    disabled: addedRatios.some(a => a.ratioName === r) && r !== ratioRow.ratioName,
  }))
  const ratioSelectOpts = ratioOptions.map(r => r.value)

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — STEP 1
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'step1') {
    return (
      <div className="font-sans">
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] font-[400] text-[#0B39B5]">
              {editId ? 'Edit Compliance Criteria' : 'Add Compliance Criteria'}
            </h1>
            <button onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#dde4ee] rounded-lg
                         text-[13px] font-medium text-[#0B39B5] hover:bg-white transition-colors">
              <ArrowLeft size={14} /> Back to Listing
            </button>
          </div>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2">
          {/* Step tabs */}
          <div className="flex gap-2 mb-5">
            {['Step 1', 'Step 2'].map((s, i) => (
              <button key={s}
                onClick={() => i === 1 && goToStep2()}
                className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors
                            ${i === 0
                              ? 'bg-[#0B39B5] text-white'
                              : 'bg-white border border-[#dde4ee] text-[#a0aec0] hover:border-[#0B39B5] hover:text-[#0B39B5]'}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#dde4ee] p-5 space-y-4">
            {/* Criteria Name */}
            <Input
              label="Compliance Criteria Name"
              required
              maxLength={100}
              showCount
              placeholder="e.g. Al-Hilal Standard Criteria"
              value={step1.name}
              onChange={v => {
                setStep1(p => ({ ...p, name: v }))
                setNameStatus(null)
                if (step1Errs.name) setStep1Errs(p => ({ ...p, name: '' }))
              }}
              onBlur={checkNameUnique}
              error={!!step1Errs.name}
              errorMessage={step1Errs.name}
              rightIcon={
                nameStatus === 'ok'     ? <span className="text-[#01C9A4] text-[16px] font-bold">✓</span>
                : nameStatus === 'taken' ? <X size={14} className="text-red-400" />
                : null
              }
            />

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                Criteria Description
              </label>
              <textarea
                maxLength={500}
                placeholder="Optional description (required to enable Next)"
                rows={3}
                className={`w-full px-3 py-2.5 border rounded-lg text-[13px] text-[#041E66] resize-none
                             focus:outline-none transition-all placeholder:text-[#a0aec0]
                             ${step1Errs.desc ? 'border-red-400' : 'border-[#e2e8f0] focus:border-[#01C9A4]'}`}
                value={step1.desc}
                onChange={e => {
                  setStep1(p => ({ ...p, desc: e.target.value }))
                  if (step1Errs.desc) setStep1Errs(p => ({ ...p, desc: '' }))
                }}
              />
              <div className="flex justify-between mt-1">
                {step1Errs.desc && <p className="text-[11px] text-red-500">{step1Errs.desc}</p>}
                <p className="text-[11px] text-[#a0aec0] ml-auto">{step1.desc.length}/500</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setStep1(EMPTY_STEP1); setStep1Errs({}); setNameStatus(null) }}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-[#dde4ee] rounded-lg
                           text-[13px] font-medium text-[#041E66] hover:bg-[#f8f9ff] transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={goToStep2}
                disabled={!step1Valid}
                className="px-5 py-2.5 bg-[#0B39B5] hover:bg-[#0a2e94] text-white rounded-lg
                           text-[13px] font-medium disabled:opacity-40 transition-colors">
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — STEP 2
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'step2') {
    const thresholdHint = ratioRow.unit === '#' ? 'Value allowed 0.1 to 1000.00' : 'Value allowed 0.1 to 100.00'

    return (
      <div className="font-sans">
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] font-[400] text-[#0B39B5]">
              {editId ? 'Edit Compliance Criteria' : 'Add Compliance Criteria'}
            </h1>
            <button onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#dde4ee] rounded-lg
                         text-[13px] font-medium text-[#0B39B5] hover:bg-white transition-colors">
              <ArrowLeft size={14} /> Back to Listing
            </button>
          </div>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2 space-y-4">
          {/* Step tabs */}
          <div className="flex gap-2">
            {['Step 1', 'Step 2'].map((s, i) => (
              <button key={s}
                onClick={() => i === 0 && setView('step1')}
                className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors
                            ${i === 1
                              ? 'bg-[#0B39B5] text-white'
                              : 'bg-white border border-[#dde4ee] text-[#0B39B5] hover:bg-[#EFF3FF]'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Summary panel */}
          <div className="bg-white rounded-xl border border-[#dde4ee] overflow-hidden">
            <button
              onClick={() => setSummaryOpen(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#f8f9ff] transition-colors">
              <span className="text-[14px] font-semibold text-[#0B39B5]">{step1.name}</span>
              {summaryOpen ? <ChevronUp size={16} className="text-[#a0aec0]" /> : <ChevronDown size={16} className="text-[#a0aec0]" />}
            </button>
            {summaryOpen && step1.desc && (
              <div className="px-5 pb-4 border-t border-[#eef2f7] pt-3">
                <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5">Description</p>
                <p className="text-[13px] text-[#041E66]">{step1.desc}</p>
              </div>
            )}
          </div>

          {/* Add ratio form */}
          <div className="bg-white rounded-xl border border-[#dde4ee] p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Financial Ratio dropdown */}
              <Select
                label="Financial Ratio"
                required
                placeholder="-- Select Ratio --"
                options={ratioSelectOpts}
                value={ratioRow.ratioName}
                onChange={v => { setRatioRow(p => ({ ...p, ratioName: v })); setRatioRowErr(p => ({ ...p, ratioName: '' })) }}
                error={!!ratioRowErr.ratioName}
                errorMessage={ratioRowErr.ratioName}
              />

              {/* Sequence */}
              <div>
                <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                  Sequence <span className="text-red-500">*</span>
                </label>
                <select
                  className={`w-full px-3 py-[10px] border rounded-lg text-[13px] text-[#041E66]
                               focus:outline-none focus:border-[#01C9A4] transition-all appearance-none bg-white
                               ${ratioRowErr.seq ? 'border-red-400' : 'border-[#e2e8f0]'}`}
                  value={ratioRow.seq}
                  onChange={e => { setRatioRow(p => ({ ...p, seq: e.target.value })); setRatioRowErr(p => ({ ...p, seq: '' })) }}>
                  <option value="">-- Seq --</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                {ratioRowErr.seq && <p className="text-[11px] text-red-500 mt-1">{ratioRowErr.seq}</p>}
              </div>

              {/* Unit */}
              <Select
                label="Unit"
                options={['%', '#']}
                value={ratioRow.unit}
                onChange={v => { setRatioRow(p => ({ ...p, unit: v, threshold: '' })); setRatioRowErr(p => ({ ...p, threshold: '' })) }}
              />

              {/* Threshold */}
              <Input
                label="Threshold Value"
                required
                placeholder={thresholdHint}
                value={ratioRow.threshold}
                onChange={v => { setRatioRow(p => ({ ...p, threshold: v })); setRatioRowErr(p => ({ ...p, threshold: '' })) }}
                error={!!ratioRowErr.threshold}
                errorMessage={ratioRowErr.threshold}
              />
            </div>

            {/* Max / Min radio */}
            {ratioRow.ratioName && (
              <div>
                <p className="text-[12px] font-medium text-[#041E66] mb-2">Direction</p>
                <div className="flex gap-4">
                  {['Maximum', 'Minimum'].map(d => (
                    <label key={d} className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-[#041E66]">
                      <input
                        type="radio"
                        name="direction"
                        value={d}
                        checked={ratioRow.direction === d}
                        onChange={() => setRatioRow(p => ({ ...p, direction: d }))}
                        className="accent-[#0B39B5]"
                      />
                      <span className={d === 'Maximum' ? 'text-red-500 font-semibold' : 'text-[#01C9A4] font-semibold'}>
                        {d === 'Maximum' ? '▼' : '▲'} {d}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Add Ratio button */}
            <div className="flex justify-end">
              <button
                onClick={handleAddRatio}
                disabled={!ratioRow.ratioName || !ratioRow.seq || !ratioRow.threshold.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#01C9A4] hover:bg-[#00b392]
                           text-white rounded-lg text-[13px] font-medium disabled:opacity-40 transition-colors">
                <Plus size={14} /> {editRatioId ? 'Update Ratio' : 'Add Ratio'}
              </button>
            </div>

            {/* Ratios table */}
            <div className="rounded-xl overflow-hidden border border-[#dde4ee]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#dde4ee]" style={{ backgroundColor: '#E0E6F6' }}>
                    {['Financial Ratio Name', 'Sequence', 'Threshold', 'Direction', 'Edit', 'Delete'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {addedRatios.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[#a0aec0]">No Ratios Added</td></tr>
                  ) : addedRatios.map(r => (
                    <tr key={r.id} className="border-b border-[#eef2f7] last:border-0">
                      <td className="px-4 py-2.5 font-medium text-[#041E66]">{r.ratioName}</td>
                      <td className="px-4 py-2.5 text-[#041E66]">{r.seq}</td>
                      <td className="px-4 py-2.5 font-mono text-[#0B39B5]">
                        {r.unit === '%' ? `${r.threshold}%` : r.threshold}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                          ${r.direction === 'Maximum' ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-[#01C9A4]'}`}>
                          {r.direction === 'Maximum' ? '▼ Max' : '▲ Min'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => startEditRatioRow(r)}
                          className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5 transition-colors">
                          <SquarePen size={14} />
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => removeRatio(r.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1.5 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Step 2 buttons */}
            <div className="flex justify-end gap-2">
              <button onClick={refreshStep2}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-[#dde4ee] rounded-lg
                           text-[13px] font-medium text-[#041E66] hover:bg-[#f8f9ff] transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
              <button onClick={() => setView('step1')}
                className="px-5 py-2.5 border border-[#dde4ee] rounded-lg text-[13px] font-medium
                           text-[#041E66] hover:bg-[#f8f9ff] transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={addedRatios.length === 0}
                className="px-5 py-2.5 bg-[#0B39B5] hover:bg-[#0a2e94] text-white rounded-lg
                           text-[13px] font-medium disabled:opacity-40 transition-colors">
                {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">

      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Compliance Criteria</h1>
          <div className="flex items-center gap-2">
            <SearchFilter
              placeholder="Search by criteria name..."
              mainSearch={mainSearch}
              setMainSearch={setMainSearch}
              filters={filters}
              setFilters={setFilters}
              fields={FILTER_FIELDS}
              onSearch={handleSearch}
              onReset={handleReset}
              onFilterClose={handleFClose}
            />
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0B39B5] hover:bg-[#0a2e94]
                         text-white rounded-lg text-[13px] font-medium transition-colors shrink-0">
              <Plus size={14} /> Add Criteria
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2">

        {/* Filter chips */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                       text-[12px] font-medium text-white bg-[#01C9A4]">
                {CHIP_LABELS[k]}: {v}
                <button onClick={() => removeChip(k)} className="hover:text-white/70"><X size={13} /></button>
              </span>
            ))}
            {Object.keys(applied).length > 1 && (
              <button onClick={handleReset} className="text-[12px] font-semibold text-[#E8923A] hover:underline ml-1">
                Clear All
              </button>
            )}
          </div>
        )}

        {/* Criteria accordion list */}
        {displayed.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            No Compliance Criteria Found
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(c => (
              <div key={c.id}
                   className={`bg-white rounded-xl border overflow-hidden
                               ${c.isDefault ? 'border-[#01C9A4]' : 'border-[#dde4ee]'}`}>

                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-3 hover:bg-[#f8f9ff] transition-colors">
                  <div className="flex items-center gap-2">
                    {c.isDefault && (
                      <Star size={14} className="text-[#F5A623] shrink-0" fill="#F5A623" />
                    )}
                    <span className="text-[14px] font-semibold text-[#041E66]">{c.name}</span>
                    {c.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF8ED] text-[#F5A623] border border-[#F5A623]/30">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mr-1
                      ${c.status === 'Active' ? 'bg-teal-50 text-[#01C9A4]' : 'bg-orange-50 text-[#E8923A]'}`}>
                      {c.status}
                    </span>
                    {/* Set as default toggle */}
                    {!c.isDefault && (
                      <button
                        title="Set as Default"
                        onClick={() => setDefaultConfirm(c)}
                        className="text-[#a0aec0] hover:text-[#F5A623] hover:bg-[#FFF8ED] rounded p-1.5 transition-colors">
                        <Star size={16} />
                      </button>
                    )}
                    <button title="Edit" onClick={() => openEdit(c)}
                      className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5 transition-colors">
                      <SquarePen size={16} />
                    </button>
                    <button onClick={() => toggleExpand(c.id)}
                      className="text-[#a0aec0] hover:bg-[#EFF3FF] rounded p-1.5 transition-colors">
                      {expanded.has(c.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {expanded.has(c.id) && (
                  <div className="px-5 pb-4 pt-3 border-t border-[#eef2f7] space-y-3">
                    {c.desc && (
                      <p className="text-[13px] text-[#041E66]">{c.desc}</p>
                    )}
                    <div className="flex gap-4 text-[12px] text-[#a0aec0]">
                      <span>Created: <strong className="text-[#041E66]">{c.createdOn}</strong></span>
                      <span>Last Modified: <strong className="text-[#041E66]">{c.modifiedOn}</strong></span>
                      <span>Ratios: <strong className="text-[#041E66]">{c.ratioItems.length}</strong></span>
                    </div>
                    <div>
                      <button
                        onClick={() => setViewRatiosCriteria(c)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF3FF] hover:bg-[#e0e6ff]
                                   text-[#0B39B5] rounded-lg text-[12px] font-medium transition-colors">
                        <Eye size={13} /> View Financial Ratios
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── View Ratios modal ── */}
      <ViewRatiosModal criteria={viewRatiosCriteria} onClose={() => setViewRatiosCriteria(null)} />

      {/* ── Set Default confirm modal ── */}
      <ConfirmModal
        open={!!defaultConfirm}
        message={`Are you sure you want to change the Default Compliance Criteria to "${defaultConfirm?.name}"?`}
        onYes={handleSetDefault}
        onNo={() => setDefaultConfirm(null)}
      />
    </div>
  )
}

export default ComplianceCriteriaPage
