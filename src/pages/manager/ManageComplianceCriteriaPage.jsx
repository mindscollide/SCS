/**
 * src/pages/manager/ManageComplianceCriteriaPage.jsx
 * ====================================================
 * 2-step wizard for Add / Edit Compliance Criteria.
 * Reads editCriteria from ComplianceCriteriaContext (null = add mode).
 * Writes back to criteria in context on Save.
 *
 * Step 1 — Add Criteria
 *   Criteria Name (unique check on blur via API)
 *   Description (textarea, max 500)
 *   Refresh | Next
 *
 * Step 2 — Add Financial Ratios
 *   Collapsible summary panel (navy)
 *   Financial Ratio dropdown (live from GetAllActiveFinancialRatiosApi)
 *     + Seq + Unit + Threshold + Type → Add Ratio button
 *   Table: Financial Ratio | Seq | Unit | Threshold | Type | Delete (draggable)
 *   Back | Save
 *
 * Route: /manager/compliance-criteria/manage
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ArrowLeft, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useComplianceCriteria } from '../../context/ComplianceCriteriaContext'
import {
  CheckComplianceCriteriaNameApi,
  CHECK_COMPLIANCE_CRITERIA_NAME_CODES,
  GetAllActiveFinancialRatiosApi,
} from '../../services/manager.service.js'
import Input from '../../components/common/Input/Input'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import CommonTable from '../../components/common/table/NormalTable'
import { BtnGold, BtnTeal, BtnIconDelete } from '../../components/common'
import RatioNameVerifyingLoader from '../../components/common/ratioNameLoader/Rationameverifyingloader.jsx'

// ── Static dropdown options ───────────────────────────────────────────────────
const UNIT_OPTS = ['%', '#']
// const TYPE_OPTS = ['Maximum', 'Minimum']
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

  /**
   * nameStatus mirrors ManageFinancialRatioPage exactly:
   *   null        — not yet checked
   *   'checking'  — API call in-flight  (shows RatioNameVerifyingLoader)
   *   'ok'        — name is available   (shows green ✓)
   *   'taken'     — duplicate detected  (shows red ✗ + error message)
   */
  const [nameStatus, setNameStatus] = useState(isEdit ? 'ok' : null)

  // Keep the original name so edit mode can skip the API call when unchanged
  const originalName = useRef(isEdit ? editCriteria.name : '')

  // ── Financial Ratios API state (mirrors classification loading in ManageFinancialRatioPage) ──
  const [ratioNames, setRatioNames] = useState([]) // string[] for SearchableSelect options
  const [ratioMap, setRatioMap] = useState({}) // name → { id, name } for ID resolution
  const [ratioLoading, setRatioLoading] = useState(true)
  const [ratioFetchError, setRatioFetchError] = useState('')

  // Fetch active financial ratios once on mount
  useEffect(() => {
    const load = async () => {
      setRatioLoading(true)
      setRatioFetchError('')
      try {
        const res = await GetAllActiveFinancialRatiosApi({}, { skipLoader: true })
        const result = res?.data?.responseResult
        if (result?.isExecuted && Array.isArray(result.financialRatios)) {
          const sorted = [...result.financialRatios].sort((a, b) => a.name.localeCompare(b.name))
          setRatioNames(sorted.map((r) => r.name))
          setRatioMap(
            Object.fromEntries(
              sorted.map((r) => [r.name, { id: r.pK_FinancialRatiosID, name: r.name }])
            )
          )
        } else {
          setRatioFetchError('Failed to load financial ratios. Please refresh.')
        }
      } catch {
        setRatioFetchError('Failed to load financial ratios. Please refresh.')
      } finally {
        setRatioLoading(false)
      }
    }
    load()
  }, [])

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [ratioForm, setRatioForm] = useState(EMPTY_RATIO_FORM)
  const [ratioErr, setRatioErr] = useState('')
  const [addedRatios, setAddedRatios] = useState(() =>
    isEdit ? editCriteria.ratios.map((r) => ({ ...r })) : []
  )

  // ── Name uniqueness check (async API) ─────────────────────────────────────
  const checkNameUnique = async () => {
    const trimmed = form.name.trim()
    if (!trimmed) return

    // In edit mode, skip the API call when the name hasn't changed
    if (isEdit && trimmed.toLowerCase() === originalName.current.toLowerCase()) {
      setNameStatus('ok')
      setErrors((p) => ({ ...p, name: '' }))
      return
    }

    setNameStatus('checking')
    try {
      const res = await CheckComplianceCriteriaNameApi(
        { CriteriaName: trimmed },
        { skipLoader: true }
      )
      const result = res?.data?.responseResult
      if (result?.isExecuted) {
        const isDuplicate = result.IsDuplicate ?? result.isDuplicate ?? false
        if (isDuplicate) {
          setNameStatus('taken')
          setErrors((p) => ({ ...p, name: 'Criteria Name already in use.' }))
        } else {
          setNameStatus('ok')
          setErrors((p) => ({ ...p, name: '' }))
        }
      } else {
        const msg =
          CHECK_COMPLIANCE_CRITERIA_NAME_CODES[result?.responseMessage ?? ''] ||
          'Unable to verify name.'
        setNameStatus(null)
        setErrors((p) => ({ ...p, name: msg }))
      }
    } catch {
      setNameStatus(null)
      setErrors((p) => ({ ...p, name: 'Unable to verify name. Please try again.' }))
    }
  }

  // ── Right icon for the name field ─────────────────────────────────────────
  const nameRightIcon = (() => {
    if (nameStatus === 'ok')
      return (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#01C9A4]">
          <Check size={12} className="text-white" />
        </span>
      )
    if (nameStatus === 'taken') return <X size={16} className="text-red-400" />
    return null
  })()

  const step1Valid = !!form.name.trim() && !!form.desc.trim() && nameStatus === 'ok'

  // ── Step 1: go next ───────────────────────────────────────────────────────
  const goToStep2 = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Please provide Criteria Name'
    if (!form.desc.trim()) errs.desc = 'Please provide Description'
    if (nameStatus === 'taken') errs.name = 'Criteria Name already in use.'
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

  // Exclude ratios already added from the dropdown options
  const availableRatioOpts = useMemo(
    () => ratioNames.filter((n) => !addedRatios.some((r) => r.ratioName === n)),
    [ratioNames, addedRatios]
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

    const resolved = ratioMap[ratioForm.ratioName]
    setAddedRatios((prev) => [
      ...prev,
      {
        id: Date.now(),
        ratioId: resolved?.id ?? 0,
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
      render: (r) => <BtnIconDelete onClick={() => handleDeleteRatio(r)} title="Remove" />,
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
            <div className="relative">
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
              {nameStatus === 'checking' && <RatioNameVerifyingLoader />}
            </div>

            {/* Description */}
            <Input
              label="Criteria Description"
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
          <div className="max-w-8xl mx-auto space-y-5">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {/* Financial Ratio — live from API, mirrors Numerator/Denominator in ManageFinancialRatioPage */}
              <div className="lg:col-span-4">
                <SearchableSelect
                  label="Financial Ratio"
                  required
                  placeholder={ratioLoading ? 'Loading…' : 'Select financial ratio'}
                  options={availableRatioOpts}
                  value={ratioForm.ratioName}
                  disabled={ratioLoading}
                  onChange={(v) => setRF('ratioName', v)}
                  error={!!ratioFetchError}
                  errorMessage={ratioFetchError}
                />
              </div>

              {/* <SearchableSelect
                label="Sequence"
                options={SEQ_OPTS}
                value={ratioForm.seq}
                onChange={(v) => setRF('seq', v)}
              /> */}

              <Input
                label="Sequence"
                required
                maxLength={1}
                regex={/^[1-9]?$/}
                placeholder={'1 to 9'}
                value={ratioForm.seq}
                onChange={(v) => setRF('seq', v)}
              />

              <SearchableSelect
                allowClear={false}
                label="Unit"
                options={UNIT_OPTS}
                value={ratioForm.unit}
                onChange={(v) => setRF('unit', v)}
              />
              <Input
                label="Threshold"
                required
                placeholder={ratioForm.unit === '%' ? '0.1 – 100' : '0.1 – 1000'}
                value={ratioForm.threshold}
                onChange={(v) => setRF('threshold', v)}
                regex={/^[0-9.]*$/}
                maxLength={8}
              />
              <div className="md:col-span-2 lg:col-span-7">
                <div className="flex flex-wrap gap-x-1 gap-y-3">
                  {[
                    {
                      value: 'Maximum',
                      label: 'Maximum',
                      desc: 'any value above or equal to this threshold value will be considered as Non-Compliant',
                    },
                    {
                      value: 'Minimum',
                      label: 'Minimum',
                      desc: 'any value less or equal to this threshold value will be considered as Non-Compliant',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-1.5 cursor-pointer py-2.5 rounded-lg pe-4  transition-all`}
                    >
                      <input
                        type="radio"
                        name="ratioType"
                        value={opt.value}
                        checked={ratioForm.type === opt.value}
                        onChange={() => setRF('type', opt.value)}
                        className="accent-[#01C9A4] mt-[3px] w-3 h-3 cursor-pointer"
                      />
                      <span className="text-[13.5px] px-1  text-[#041E66] leading-snug">
                        <span className="font-semibold">{opt.label}</span>
                        {' - '}
                        <span className="text-[#000]">{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
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
              <BtnGold type="button" onClick={() => setStep(1)}>
                Back
              </BtnGold>
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
