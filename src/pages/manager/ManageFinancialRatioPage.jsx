/**
 * pages/manager/ManageFinancialRatioPage.jsx
 * =============================================
 * 2-step wizard for Add / Edit Financial Ratio.
 * Reads editRatio from FinancialRatioContext (null = add mode).
 * Writes back to ratios in context on Save.
 *
 * Step 1 — Add Ratio
 *   Financial Ratio Name (unique check on blur)
 *   Numerator / Denominator (mutually exclusive)
 *   Description (textarea, max 300)
 *   Refresh | Next
 *
 * Step 2 — Add Classifications
 *   Collapsible summary panel (navy)
 *   Classifications dropdown → Add Classifications button (centered)
 *   Table: Classifications Name | Calculated | Prorated | Base Classification | Delete
 *   Back | Save
 *
 * Route: /scs/manager/financial-ratios/manage
 */

import React, { useState } from 'react'
import {
  ArrowLeft, Check, X, ChevronDown, ChevronUp,
  Calculator, PieChart, Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useFinancialRatio } from '../../context/FinancialRatioContext'
import { MOCK_CLASSIFICATIONS } from '../../utils/mockData.js'
import Input  from '../../components/common/Input/Input'
import Select from '../../components/common/select/Select'

// ── Classification lookup ─────────────────────────────────────────────────────
const ACTIVE_CLASSIFS = MOCK_CLASSIFICATIONS.filter(c => c.status === 'Active')
const CLASSIF_NAMES   = ACTIVE_CLASSIFS.map(c => c.name).sort()
const CLASSIF_MAP     = Object.fromEntries(ACTIVE_CLASSIFS.map(c => [c.name, c]))

const EMPTY_FORM = { name: '', numerator: '', denominator: '', desc: '' }

// ── Step pill tab ─────────────────────────────────────────────────────────────
const StepTab = ({ num, sublabel, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center px-10 py-2.5 rounded-full min-w-[180px]
                transition-all select-none
                ${active
                  ? 'bg-[#01C9A4] text-white shadow-sm'
                  : 'bg-white border border-[#dde4ee] text-[#a0aec0] hover:border-[#01C9A4]'}`}
  >
    <span className="text-[14px] font-bold leading-tight">Step {num}</span>
    <span className="text-[11px] leading-tight">{sublabel}</span>
  </button>
)

// ── ManageFinancialRatioPage ──────────────────────────────────────────────────
const ManageFinancialRatioPage = () => {
  const navigate                        = useNavigate()
  const { ratios, setRatios, editRatio } = useFinancialRatio()
  const isEdit                           = !!editRatio

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState(() =>
    isEdit
      ? { name: editRatio.name, numerator: editRatio.numerator,
          denominator: editRatio.denominator, desc: editRatio.desc || '' }
      : EMPTY_FORM
  )
  const [errors,     setErrors]     = useState({})
  const [nameStatus, setNameStatus] = useState(isEdit ? 'ok' : null) // null | 'ok' | 'taken'

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [summaryOpen,   setSummaryOpen]   = useState(false)
  const [classifSel,    setClassifSel]    = useState('')
  const [classifErr,    setClassifErr]    = useState('')
  const [addedClassifs, setAddedClassifs] = useState(() =>
    isEdit ? editRatio.classifications.map(c => ({ ...c })) : []
  )

  // ── Mutual exclusion for dropdowns ────────────────────────────────────────
  const numeratorOpts   = CLASSIF_NAMES.filter(n => n !== form.denominator)
  const denominatorOpts = CLASSIF_NAMES.filter(n => n !== form.numerator)

  // ── Step 1: unique name check on blur ─────────────────────────────────────
  const checkNameUnique = () => {
    const trimmed = form.name.trim()
    if (!trimmed) return
    const taken = ratios.some(
      r => r.name.toLowerCase() === trimmed.toLowerCase() && r.id !== editRatio?.id
    )
    setNameStatus(taken ? 'taken' : 'ok')
    setErrors(p => ({ ...p, name: taken ? 'Ratio Name already in use.' : '' }))
  }

  const step1Valid =
    form.name.trim() && form.numerator && form.denominator && nameStatus !== 'taken'

  // ── Step 1: go next ───────────────────────────────────────────────────────
  const goToStep2 = () => {
    const errs = {}
    if (!form.name.trim())     errs.name       = 'Please provide Financial Ratio Name'
    if (!form.numerator)       errs.numerator   = 'Please select Numerator'
    if (!form.denominator)     errs.denominator = 'Please select Denominator'
    if (nameStatus === 'taken') errs.name       = 'Ratio Name already in use.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setStep(2)
  }

  // ── Step 2: add classification ────────────────────────────────────────────
  const handleAddClassif = () => {
    if (!classifSel) return
    if (addedClassifs.some(c => c.name === classifSel)) {
      setClassifErr('Classification already added'); return
    }
    const meta = CLASSIF_MAP[classifSel] || {}
    setAddedClassifs(prev => [...prev, {
      id: Date.now(), name: classifSel,
      calculated: meta.calculated || false,
      prorated:   meta.prorated   || false,
      base:       meta.base       || '',
    }])
    toast.success('Classification added')
    setClassifSel(''); setClassifErr('')
  }

  // ── Step 2: save ─────────────────────────────────────────────────────────
  const handleSave = () => {
    const saved = {
      id:              isEdit ? editRatio.id   : Date.now(),
      seq:             isEdit ? editRatio.seq  : ratios.length + 1,
      name:            form.name.trim(),
      numerator:       form.numerator,
      denominator:     form.denominator,
      desc:            form.desc.trim(),
      classifications: addedClassifs,
      status:          isEdit ? editRatio.status : 'Active',
    }
    setRatios(prev =>
      isEdit ? prev.map(r => r.id === editRatio.id ? saved : r) : [...prev, saved]
    )
    toast.success(isEdit ? 'Updated Successfully' : 'Record Added Successfully')
    navigate('/scs/manager/financial-ratios')
  }

  const goBack = () => navigate('/scs/manager/financial-ratios')

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">

      {/* ── Page header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200
                      flex items-center justify-between">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Financial Ratios</h1>
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F5A623] hover:bg-[#e09a1a]
                     text-white text-[13px] font-semibold rounded-xl transition-colors"
        >
          <ArrowLeft size={14} /> Back to Listing
        </button>
      </div>

      {/* ── White content card ── */}
      <div className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200">

        {/* Step tabs */}
        <div className="flex justify-center gap-4 mb-10">
          <StepTab num={1} sublabel="Add Ratio"           active={step === 1} onClick={() => setStep(1)} />
          <StepTab num={2} sublabel="Add Classifications" active={step === 2} onClick={goToStep2} />
        </div>

        {/* ─────────────────── STEP 1 ─────────────────── */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Financial Ratio Name */}
            <Input
              label="Financial Ratio Name"
              required
              maxLength={100}
              showCount
              placeholder="e.g. Debt to Total Assets"
              value={form.name}
              onChange={v => {
                setForm(p => ({ ...p, name: v }))
                setNameStatus(null)
                if (errors.name) setErrors(p => ({ ...p, name: '' }))
              }}
              onBlur={checkNameUnique}
              error={!!errors.name}
              errorMessage={errors.name}
              rightIcon={
                nameStatus === 'ok'
                  ? <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#01C9A4]">
                      <Check size={12} className="text-white" />
                    </span>
                  : nameStatus === 'taken'
                  ? <X size={16} className="text-red-400" />
                  : null
              }
            />

            {/* Numerator / Denominator */}
            {/*
              items-start: both Select triggers always start at the same vertical
              position (below their labels) regardless of which one shows an error.
              The "/" divider uses mt-[32px] to visually centre it on the triggers
              (label ~18px + mb-1.5 ~6px + half trigger ~10px ≈ 34px offset).
            */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <Select
                label="Select Numerator"
                required
                placeholder="Select Numerator"
                options={numeratorOpts}
                value={form.numerator}
                onChange={v => {
                  setForm(p => ({ ...p, numerator: v }))
                  setErrors(p => ({ ...p, numerator: '' }))
                }}
                error={!!errors.numerator}
                errorMessage={errors.numerator}
              />
              <span className="text-[22px] text-[#a0aec0] mt-[32px] font-light select-none">/</span>
              <Select
                label="Select Denominator"
                required
                placeholder="Select Denominator"
                options={denominatorOpts}
                value={form.denominator}
                onChange={v => {
                  setForm(p => ({ ...p, denominator: v }))
                  setErrors(p => ({ ...p, denominator: '' }))
                }}
                error={!!errors.denominator}
                errorMessage={errors.denominator}
              />
            </div>

            {/* Description */}
            <Input
              label="Description"
              multiline
              rows={5}
              maxLength={300}
              showCount
              placeholder="Enter ratio description"
              value={form.desc}
              onChange={v => setForm(p => ({ ...p, desc: v }))}
            />

            {/* Buttons */}
            <div className="flex justify-center gap-4 pt-6">
              <button
                onClick={() => { setForm(EMPTY_FORM); setErrors({}); setNameStatus(null) }}
                className="px-9 py-2.5 bg-[#01C9A4] hover:bg-[#00b392] text-white
                           rounded-xl text-[14px] font-semibold transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={goToStep2}
                disabled={!step1Valid}
                className={`px-9 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-colors
                            ${step1Valid
                              ? 'bg-[#01C9A4] hover:bg-[#00b392]'
                              : 'bg-[#CBD5E1] cursor-not-allowed'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ─────────────────── STEP 2 ─────────────────── */}
        {step === 2 && (
          <div className="max-w-8xl mx-auto">

            {/* Collapsible summary — navy banner */}
            <div className="bg-[#0B39B5] rounded-xl overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => setSummaryOpen(p => !p)}
                className="w-full flex items-center justify-between px-5 py-4
                           hover:bg-white/5 transition-colors"
              >
                <span className="text-[15px] font-semibold text-white leading-snug">
                  {form.name}
                </span>
                {summaryOpen
                  ? <ChevronUp   size={18} className="text-white shrink-0" />
                  : <ChevronDown size={18} className="text-white shrink-0" />}
              </button>

              {summaryOpen && (
                <div className="px-5 pb-5 border-t border-white/20 pt-4
                                grid grid-cols-1 md:grid-cols-3 gap-3">
                  {form.desc && (
                    <div className="md:col-span-3">
                      <p className="text-[11px] text-white/60 mb-0.5">Description</p>
                      <p className="text-[13px] text-white">{form.desc}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-white/60 mb-0.5">Numerator</p>
                    <p className="text-[13px] font-medium text-white">{form.numerator}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/60 mb-0.5">Denominator</p>
                    <p className="text-[13px] font-medium text-white">{form.denominator}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Classification dropdown */}
            <div className="mb-4">
              <Select
                label="Classifications"
                required
                placeholder="Select Classifications"
                options={CLASSIF_NAMES.filter(n => !addedClassifs.some(c => c.name === n))}
                value={classifSel}
                onChange={v => { setClassifSel(v); setClassifErr('') }}
                error={!!classifErr}
                errorMessage={classifErr}
              />
            </div>

            {/* Add button — centered */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleAddClassif}
                disabled={!classifSel}
                className={`px-9 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-colors
                            ${classifSel
                              ? 'bg-[#01C9A4] hover:bg-[#00b392]'
                              : 'bg-[#CBD5E1] cursor-not-allowed'}`}
              >
                Add Classifications
              </button>
            </div>

            {/* Classifications table */}
            <div className="rounded-xl overflow-hidden border border-[#dde4ee]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: '#E0E6F6' }}>
                    {['Classifications Name', 'Calculated', 'Prorated', 'Base Classification', 'Delete'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[12px] font-semibold text-[#041E66]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {addedClassifs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[13px] text-[#a0aec0]">
                        No Record Found
                      </td>
                    </tr>
                  ) : addedClassifs.map(c => (
                    <tr key={c.id} className="border-t border-[#eef2f7] hover:bg-[#f8f9ff] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#041E66]">{c.name}</td>
                      <td className="px-4 py-3">
                        {c.calculated
                          ? <Calculator size={16} className="text-[#F5A623]" />
                          : <span className="text-[#a0aec0]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.prorated
                          ? <span className="inline-flex items-center gap-1.5 text-[#01C9A4]">
                              <PieChart size={16} />
                              {c.base && <span className="text-[12px] text-[#041E66]">{c.base}</span>}
                            </span>
                          : <span className="text-[#a0aec0]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#041E66]">{c.base || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAddedClassifs(prev => prev.filter(x => x.id !== c.id))}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-4 mt-10">
              <button
                onClick={() => setStep(1)}
                className="px-9 py-2.5 bg-[#F5A623] hover:bg-[#e09a1a] text-white
                           rounded-xl text-[14px] font-semibold transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={addedClassifs.length === 0}
                className={`px-9 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-colors
                            ${addedClassifs.length > 0
                              ? 'bg-[#01C9A4] hover:bg-[#00b392]'
                              : 'bg-[#CBD5E1] cursor-not-allowed'}`}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageFinancialRatioPage
