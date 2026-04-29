/**
 * src/pages/manager/ManageComplianceCriteriaPage.jsx
 * ====================================================
 * 2-step wizard for Add / Edit Compliance Criteria.
 * Reads editCriteria from ComplianceCriteriaContext (null = add mode).
 * Writes back to criteria in context on Save.
 *
 * Step 1 — Add Criteria
 *   Criteria Name (unique check on blur)
 *   Description (textarea, max 500)
 *   Refresh | Next
 *
 * Step 2 — Add Financial Ratios
 *   Collapsible summary panel (navy)
 *   Financial Ratio dropdown + Seq + Unit + Threshold + Type → Add Ratio button
 *   Table: Financial Ratio | Seq | Unit | Threshold | Type | Delete (draggable)
 *   Back | Save
 *
 * Route: /manager/compliance-criteria/manage
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useComplianceCriteria } from '../../context/ComplianceCriteriaContext'
import { MOCK_RATIOS } from '../../utils/mockData.js'
import Input from '../../components/common/Input/Input'
import Select from '../../components/common/select/Select'
import CommonTable from '../../components/common/table/NormalTable'
import { BtnGold, BtnTeal, BtnIconDelete } from '../../components/common'

// ── Ratio options ─────────────────────────────────────────────────────────────
const ACTIVE_RATIOS = MOCK_RATIOS.filter((r) => r.status === 'Active')
const RATIO_OPTS = ACTIVE_RATIOS.map((r) => r.name).sort()
const RATIO_MAP = Object.fromEntries(ACTIVE_RATIOS.map((r) => [r.name, r]))

const UNIT_OPTS = ['%', '#']
const TYPE_OPTS = ['Maximum', 'Minimum']
const SEQ_OPTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const EMPTY_FORM = { name: '', desc: '' }
const EMPTY_RATIO_FORM = { ratioName: '', seq: '1', unit: '%', threshold: '', type: 'Maximum' }

// ── Step pill tab ─────────────────────────────────────────────────────────────
const StepTab = ({ num, sublabel, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center px-10 py-2.5 rounded-full min-w-[180px]
                transition-all select-none
                ${
                  active
                    ? 'bg-[#01C9A4] text-white shadow-sm'
                    : 'bg-white border border-[#dde4ee] text-[#a0aec0] hover:border-[#01C9A4]'
                }`}
  >
    <span className="text-[14px] font-bold leading-tight">Step {num}</span>
    <span className="text-[11px] leading-tight">{sublabel}</span>
  </button>
)

// ── ManageComplianceCriteriaPage ──────────────────────────────────────────────
const ManageComplianceCriteriaPage = () => {
  const navigate = useNavigate()
  const { criteria, setCriteria, editCriteria } = useComplianceCriteria()
  const isEdit = !!editCriteria

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState(() =>
    isEdit ? { name: editCriteria.name, desc: editCriteria.desc || '' } : EMPTY_FORM
  )
  const [errors, setErrors] = useState({})
  const [nameStatus, setNameStatus] = useState(isEdit ? 'ok' : null) // null | 'ok' | 'taken'

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [ratioForm, setRatioForm] = useState(EMPTY_RATIO_FORM)
  const [ratioErr, setRatioErr] = useState('')
  const [addedRatios, setAddedRatios] = useState(() =>
    isEdit ? editCriteria.ratios.map((r) => ({ ...r })) : []
  )

  // ── Name uniqueness check ─────────────────────────────────────────────────
  const checkNameUnique = useCallback(() => {
    const trimmed = form.name.trim()
    if (!trimmed) return
    const taken = criteria.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editCriteria?.id
    )
    setNameStatus(taken ? 'taken' : 'ok')
    setErrors((p) => ({ ...p, name: taken ? 'Criteria Name already in use.' : '' }))
  }, [form.name, criteria, editCriteria])

  const nameRightIcon = useMemo(() => {
    if (nameStatus === 'ok') return <CheckCircle2 size={16} className="text-[#01C9A4]" />
    if (nameStatus === 'taken') return <XCircle size={16} className="text-red-400" />
    return null
  }, [nameStatus])

  const step1Valid = form.name.trim() && form.desc.trim() && nameStatus === 'ok'

  // ── Step 1: go next ───────────────────────────────────────────────────────
  const goToStep2 = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Please provide Criteria Name'
    if (!form.desc.trim()) errs.desc = 'Please provide Description'
    if (nameStatus === 'taken') errs.name = 'Criteria Name already in use.'
    if (nameStatus !== 'ok' && !errs.name) errs.name = 'Please verify the Criteria Name'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setStep(2)
  }

  // ── Step 2: ratio form helper ─────────────────────────────────────────────
  const setRF = (k, v) => {
    setRatioForm((p) => ({ ...p, [k]: v }))
    setRatioErr('')
  }

  // Exclude ratios already added
  const availableRatioOpts = useMemo(
    () => RATIO_OPTS.filter((n) => !addedRatios.some((r) => r.ratioName === n)),
    [addedRatios]
  )

  // ── Step 2: add ratio ─────────────────────────────────────────────────────
  const handleAddRatio = () => {
    if (!ratioForm.ratioName) {
      setRatioErr('Please select a Financial Ratio')
      return
    }
    if (!ratioForm.threshold) {
      setRatioErr('Please enter a Threshold value')
      return
    }
    const val = parseFloat(ratioForm.threshold)
    if (isNaN(val)) {
      setRatioErr('Invalid threshold value')
      return
    }
    if (ratioForm.unit === '%' && (val < 0.1 || val > 100)) {
      setRatioErr('Value must be 0.1–100')
      return
    }
    if (ratioForm.unit === '#' && (val < 0.1 || val > 1000)) {
      setRatioErr('Value must be 0.1–1000')
      return
    }

    setAddedRatios((prev) => [
      ...prev,
      {
        id: Date.now(),
        ratioId: RATIO_MAP[ratioForm.ratioName]?.id || Date.now(),
        ratioName: ratioForm.ratioName,
        seq: parseInt(ratioForm.seq),
        unit: ratioForm.unit,
        threshold: val,
        type: ratioForm.type,
      },
    ])
    toast.success('Ratio added')
    setRatioForm(EMPTY_RATIO_FORM)
    setRatioErr('')
  }

  // ── Step 2: delete ratio ──────────────────────────────────────────────────
  const handleDeleteRatio = useCallback((row) => {
    setAddedRatios((prev) => prev.filter((r) => r.id !== row.id))
    toast.info('Ratio removed')
  }, [])

  // ── Step 2: save ─────────────────────────────────────────────────────────
  const handleSave = () => {
    const isFirstEver = criteria.length === 0
    const saved = {
      id: isEdit ? editCriteria.id : Date.now(),
      name: form.name.trim(),
      desc: form.desc.trim(),
      isDefault: isEdit ? editCriteria.isDefault : isFirstEver,
      status: isEdit ? editCriteria.status : 'Active',
      ratios: addedRatios,
    }
    setCriteria((prev) =>
      isEdit ? prev.map((c) => (c.id === editCriteria.id ? saved : c)) : [...prev, saved]
    )
    toast.success(isEdit ? 'Updated Successfully' : 'Record Added Successfully')
    navigate('/manager/compliance-criteria')
  }

  const goBack = () => navigate('/manager/compliance-criteria')

  // ── Table columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    { key: 'ratioName', title: 'Financial Ratio' },
    { key: 'seq', title: 'Seq', render: (r) => <span className="text-[#041E66]">{r.seq}</span> },
    { key: 'unit', title: 'Unit', render: (r) => <span className="text-[#041E66]">{r.unit}</span> },
    {
      key: 'threshold',
      title: 'Threshold',
      render: (r) => <span className="text-[#041E66]">{r.threshold}</span>,
    },
    {
      key: 'type',
      title: 'Type',
      render: (r) => (
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
          ${r.type === 'Maximum' ? 'bg-red-50 text-red-500' : 'bg-[#e8faf6] text-[#01C9A4]'}`}
        >
          {r.type === 'Maximum' ? '▲ Max' : '▼ Min'}
        </span>
      ),
    },
    {
      key: 'delete',
      title: '',
      render: (r) => (
        <BtnIconDelete onClick={() => handleDeleteRatio(r)} title="Remove" />
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page header band ── */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200
                      flex items-center justify-between"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Compliance Criteria</h1>
        <BtnGold onClick={goBack} className="flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Listing
        </BtnGold>
      </div>

      {/* ── Content card ── */}
      <div className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200">
        {/* Step tabs */}
        <div className="flex justify-center gap-4 mb-10">
          <StepTab num={1} sublabel="Add Criteria" active={step === 1} onClick={() => setStep(1)} />
          <StepTab
            num={2}
            sublabel="Add Financial Ratios"
            active={step === 2}
            onClick={goToStep2}
          />
        </div>

        {/* ─────────────────── STEP 1 ─────────────────── */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Criteria Name */}
            <Input
              label="Criteria Name"
              required
              maxLength={100}
              showCount
              placeholder="e.g. Al-Hilal Standard Criteria"
              value={form.name}
              onChange={(v) => {
                setForm((p) => ({ ...p, name: v }))
                setNameStatus(null)
                if (errors.name) setErrors((p) => ({ ...p, name: '' }))
              }}
              onBlur={checkNameUnique}
              error={!!errors.name}
              errorMessage={errors.name}
              rightIcon={nameRightIcon}
            />

            {/* Description */}
            <Input
              label="Description"
              required
              multiline
              rows={5}
              maxLength={500}
              showCount
              placeholder="Enter a brief description of the criteria..."
              value={form.desc}
              onChange={(v) => {
                setForm((p) => ({ ...p, desc: v }))
                if (errors.desc) setErrors((p) => ({ ...p, desc: '' }))
              }}
              error={!!errors.desc}
              errorMessage={errors.desc}
            />

            {/* Action buttons */}
            <div className="flex justify-center gap-4 pt-2">
              <BtnTeal
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM)
                  setErrors({})
                  setNameStatus(null)
                }}
              >
                Refresh
              </BtnTeal>
              <BtnTeal type="button" disabled={!step1Valid} onClick={goToStep2}>
                Next
              </BtnTeal>
            </div>
          </div>
        )}

        {/* ─────────────────── STEP 2 ─────────────────── */}
        {step === 2 && (
          <div className="max-w-5xl mx-auto space-y-5">
            {/* Summary banner (collapsible, navy) */}
            <div className="bg-[#0B39B5] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setSummaryOpen((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-3 text-white"
              >
                <span className="text-[14px] font-semibold">{form.name}</span>
                {summaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {summaryOpen && (
                <div className="px-5 pb-4 text-white/80 text-[13px] border-t border-white/20 pt-3">
                  {form.desc}
                </div>
              )}
            </div>

            {/* Add ratio form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-3">
                <Select
                  label="Financial Ratio"
                  required
                  placeholder="Select financial ratio"
                  options={availableRatioOpts}
                  value={ratioForm.ratioName}
                  onChange={(v) => setRF('ratioName', v)}
                />
              </div>
              <Select
                label="Sequence"
                options={SEQ_OPTS}
                value={ratioForm.seq}
                onChange={(v) => setRF('seq', v)}
              />
              <Select
                label="Unit"
                options={UNIT_OPTS}
                value={ratioForm.unit}
                onChange={(v) => setRF('unit', v)}
              />
              <Input
                label="Threshold"
                placeholder={ratioForm.unit === '%' ? '0.1 – 100' : '0.1 – 1000'}
                value={ratioForm.threshold}
                onChange={(v) => setRF('threshold', v)}
                regex={/^[0-9.]*$/}
                maxLength={8}
              />
              <div className="md:col-span-2 lg:col-span-3">
                <Select
                  label="Type"
                  options={TYPE_OPTS}
                  value={ratioForm.type}
                  onChange={(v) => setRF('type', v)}
                />
              </div>
            </div>

            {ratioErr && <p className="text-[12px] text-red-500 font-medium">{ratioErr}</p>}

            {/* Add ratio button */}
            <div className="flex justify-center">
              <BtnTeal type="button" onClick={handleAddRatio}>
                Add Financial Ratio
              </BtnTeal>
            </div>

            {/* Added ratios table */}
            {addedRatios.length > 0 && (
              <CommonTable
                draggable
                onReorder={setAddedRatios}
                columns={tableColumns}
                data={addedRatios}
                emptyText="No ratios added yet"
              />
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-4 pt-2">
              <BtnGold type="button" onClick={() => setStep(1)}>Back</BtnGold>
              <BtnTeal type="button" disabled={addedRatios.length === 0} onClick={handleSave}>
                Save
              </BtnTeal>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageComplianceCriteriaPage
