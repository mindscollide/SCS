/**
 * src/pages/manager/ManageComplianceCriteriaPage.jsx
 * ====================================================
 * 2-step wizard for Add / Edit Compliance Criteria — Manager role.
 * Reads editCriteria from ComplianceCriteriaContext (null = add mode).
 *
 * Step 1 — Criteria details
 *   Criteria Name + unique check on blur (API-driven, code-based — see below)
 *   Description (textarea, max 500)
 *   Refresh | Next  (Next disabled until name is available)
 *
 * Step 2 — Financial Ratio mappings
 *   Collapsible summary panel (shows Step 1 values)
 *   Financial Ratio dropdown (GetAllActiveFinancialRatiosApi — cached in localStorage)
 *     + Seq + Unit (% / #) + Threshold + Type (Maximum / Minimum)
 *   Table: sortable, draggable reorder, per-row delete
 *   Back | Save / Update
 *
 * Name uniqueness check (verified 2026-06-04):
 *   Result is in the RESPONSE CODE, not a body flag.
 *   _04 = available (unique)  →  nameStatus = 'ok'
 *   _03 = duplicate (in use)  →  nameStatus = 'taken'
 *   Do not check result.IsDuplicate — that field is not returned by this endpoint.
 *
 * Save payload (verified 2026-06-04 — key field names matter):
 *   `RatioMappings` — REQUIRED array (empty → backend returns _03, nothing saved)
 *   `IsDefault`     — normal boolean: 1=make default (CREATE only), 0=not default. UPDATE ignores it.
 *   `_05`           — success code (not _03 which was the old wrong assumption)
 *   `_08`           — duplicate Sequence values. Stays on Step 2, shows inline error
 *                     above the ratio table so the user can delete the conflicting row
 *                     and re-add it with a unique sequence. Does NOT close the wizard.
 *   Error codes are checked BEFORE isExecuted — the backend may return isExecuted:true
 *   even for certain errors (_08). Checking codes first prevents false-positive navigate.
 *   FK_ComplianceCriteriaStatusID is NOT sent — status handled by the backend.
 *
 * APIs used:
 *  CheckComplianceCriteriaNameApi   — on name blur (code-based result)
 *  GetAllActiveFinancialRatiosApi   — ratio dropdown (localStorage-cached)
 *  SaveComplianceCriteriaApi        — create (PK=0) / update (PK>0)
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
  CHECK_CC_NAME_DUPLICATE,
  CHECK_CC_NAME_AVAILABLE,
  GetAllActiveFinancialRatiosApi,
  SaveComplianceCriteriaApi,
  SAVE_COMPLIANCE_CRITERIA_CODES,
} from '../../services/manager.service.js'
import Input from '../../components/common/Input/Input'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import CommonTable from '../../components/common/table/NormalTable'
import { BtnGold, BtnTeal, BtnIconDelete, BtnPrimary, ConfirmModal } from '../../components/common'
import RatioNameVerifyingLoader from '../../components/common/ratioNameLoader/Rationameverifyingloader.jsx'
import arrowUp from '../../../public/arrowup-icon.png'
import arrowDown from '../../../public/arrowdown-icon.png'

// ── Static dropdown options ───────────────────────────────────────────────────
const UNIT_OPTS = ['%', '#']
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
  const [nameStatus, setNameStatus] = useState(isEdit ? 'ok' : null)
  const originalName = useRef(isEdit ? editCriteria.name : '')

  // ── Financial Ratios API state ─────────────────────────────────────────────
  const [ratioNames, setRatioNames] = useState([])
  const [ratioMap, setRatioMap] = useState({})
  const [ratioLoading, setRatioLoading] = useState(true)
  const [ratioFetchError, setRatioFetchError] = useState('')

  const [sortCol, setSortCol] = useState('ratioName')
  const [sortDir, setSortDir] = useState('asc')

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

  // ── Save state ────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [ratioDeleteTarget, setRatioDeleteTarget] = useState(null)

  // ── Name uniqueness check ─────────────────────────────────────────────────
  const checkNameUnique = async () => {
    const trimmed = form.name.trim()
    if (!trimmed) return
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
      const code = result?.responseMessage

      // Verified spec: result is in the response CODE, not a body flag.
      //   _04 = available (unique)   _03 = duplicate (in use)
      if (code === CHECK_CC_NAME_AVAILABLE) {
        setNameStatus('ok')
        setErrors((p) => ({ ...p, name: '' }))
      } else if (code === CHECK_CC_NAME_DUPLICATE) {
        setNameStatus('taken')
        setErrors((p) => ({ ...p, name: 'Criteria Name already in use.' }))
      } else {
        const msg = CHECK_COMPLIANCE_CRITERIA_NAME_CODES[code] || 'Unable to verify name.'
        setNameStatus(null)
        setErrors((p) => ({ ...p, name: msg }))
      }
    } catch {
      setNameStatus(null)
      setErrors((p) => ({ ...p, name: 'Unable to verify name. Please try again.' }))
    }
  }

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

  const availableRatioOpts = useMemo(
    () => ratioNames.filter((n) => !addedRatios.some((r) => r.ratioName === n)),
    [ratioNames, addedRatios]
  )
  // ── Step 2: threshold change — clamp to allowed max as user types ─────────
  const handleThresholdChange = (v) => {
    // Allow empty, single dot, or partial decimals while typing
    if (v === '' || v === '.') {
      setRatioForm((p) => ({ ...p, threshold: v }))
      setRatioErr('')
      return
    }
    const max = ratioForm.unit === '%' ? 100 : 1000
    const parsed = parseFloat(v)
    if (!isNaN(parsed) && parsed > max) {
      // Clamp to max — don't let the value exceed the limit
      setRatioForm((p) => ({ ...p, threshold: String(max) }))
      return
    }
    setRatioForm((p) => ({ ...p, threshold: v }))
    setRatioErr('')
  }

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
      setRatioErr('Value must be between 0.1 and 100.00')
      return
    }
    if (ratioForm.unit === '#' && (val < 0.1 || val > 1000)) {
      setRatioErr('Value must be between 0.1 and 1000.00')
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
    setRatioDeleteTarget(row)
  }, [])

  // ── Step 2: save (calls API) ──────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true)

    /*
     * Payload mapping
     * ─────────────────────────────────────────────────────────────────────
     * Local state field        → API field
     * ─────────────────────────────────────────────────────────────────────
     * ratioId                  → FK_FinancialRatiosID
     * threshold                → ThresholdValue
     * type === 'Maximum'       → IsMaxValidationApplied = 1, else 0
     * unit                     → ThresholdUnit
     * seq                      → Sequence
     * ─────────────────────────────────────────────────────────────────────
     */
    const payload = {
      PK_ComplianceCriteriaID: isEdit ? editCriteria.id : 0,
      CriteriaName: form.name.trim(),
      Description: form.desc.trim(),
      // IsDefault — normal boolean (0=not default, 1=make default).
      // CREATE: auto-default the very first criteria (no existing ones) → 1, otherwise → 0.
      // UPDATE: value is IGNORED by the backend — existing default is preserved.
      //         Use SetDefaultComplianceCriteria from the listing page to change it.
      IsDefault: !isEdit && criteria.length === 0 ? 1 : 0,
      RatioMappings: addedRatios.map((r) => ({
        FK_FinancialRatiosID: r.ratioId,
        ThresholdValue: r.threshold,
        IsMaxValidationApplied: r.type === 'Maximum' ? 1 : 0,
        ThresholdUnit: r.unit,
        Sequence: r.seq,
      })),
    }

    try {
      const res = await SaveComplianceCriteriaApi(payload)
      const responseMessage = res?.data?.responseResult?.responseMessage ?? ''
      const isExecuted     = res?.data?.responseResult?.isExecuted ?? false

      // ── Check error codes FIRST, before testing isExecuted ──────────────────
      // The backend may return isExecuted:true even for certain error codes (e.g.
      // _08 duplicate sequence). If we tested isExecuted first, those errors would
      // incorrectly hit the success path and navigate away.
      // Rule: any code with a non-null message in SAVE_COMPLIANCE_CRITERIA_CODES
      //       is an error — stay on the page regardless of isExecuted.
      const knownErrorMsg = SAVE_COMPLIANCE_CRITERIA_CODES[responseMessage]
      if (knownErrorMsg !== undefined && knownErrorMsg !== null) {
        // _08 specifically: show inline error on the ratio table so the user can see
        // which sequence to fix and delete/re-add it without the message disappearing.
        if (responseMessage.endsWith('_08')) {
          setRatioErr(knownErrorMsg)
        } else {
          toast.error(knownErrorMsg, {
            style:         { backgroundColor: '#E74C3C', color: '#fff' },
            progressStyle: { backgroundColor: '#ffffff50' },
          })
        }
        return  // stay on Step 2 — wizard does NOT close
      }

      // ── Success ──────────────────────────────────────────────────────────────
      if (isExecuted || knownErrorMsg === null) {
        const saved = {
          id:        isEdit ? editCriteria.id : Date.now(),
          name:      form.name.trim(),
          desc:      form.desc.trim(),
          isDefault: isEdit ? editCriteria.isDefault : criteria.length === 0,
          status:    isEdit ? editCriteria.status : 'Active',
          ratios:    addedRatios,
        }

        setCriteria((prev) => {
          const list = Array.isArray(prev) ? prev : []
          return isEdit ? list.map((c) => (c.id === editCriteria.id ? saved : c)) : [...list, saved]
        })

        toast.success(isEdit ? 'Updated Successfully' : 'Record Added Successfully')
        navigate('/manager/compliance-criteria')
        return
      }

      // ── Unknown / unexpected response ─────────────────────────────────────────
      toast.error('Something went wrong. Please try again.', {
        style:         { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
    } catch {
      toast.error('Network error. Please check your connection and try again.', {
        style:         { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
    } finally {
      setIsSaving(false)
    }
  }

  const goBack = () => navigate('/manager/compliance-criteria')

  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      else {
        setSortCol(col)
        setSortDir('asc')
      }
    },
    [sortCol]
  )

  const sortedRatios = useMemo(
    () =>
      [...addedRatios].sort((a, b) => {
        const va = String(a[sortCol] ?? '').toLowerCase()
        const vb = String(b[sortCol] ?? '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [addedRatios, sortCol, sortDir]
  )
  // ── Table columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    { key: 'ratioName', title: 'Financial Ratio', sortable: true },
    {
      key: 'seq',
      title: 'Seq',
      align: 'center',
      sortable: true,
      render: (r) => <span className="text-[#041E66]">{r.seq}</span>,
    },
    {
      key: 'threshold',
      title: 'Threshold Value',
      align: 'center',
      sortable: true,
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <span className="text-[#041E66]">
            {r.threshold}
            {r.unit}
          </span>

          <img
            src={r.type === 'Maximum' ? arrowUp : arrowDown}
            alt="arrow"
            className="w-5 h-5 object-contain shrink-0"
            draggable={false}
          />
        </div>
      ),
    },
    {
      key: 'delete',
      title: 'Delete',
      align: 'center',
      render: (r) => (
        <div className="flex justify-center">
          <BtnIconDelete onClick={() => handleDeleteRatio(r)} title="Remove" />
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200 flex items-center justify-between">
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
              <BtnPrimary type="button" disabled={!step1Valid} onClick={goToStep2}>
                Next
              </BtnPrimary>
            </div>
          </div>
        )}

        {/* ─────────────────── STEP 2 ─────────────────── */}
        {step === 2 && (
          <div className="max-w-8xl mx-auto space-y-5">
            {/* Summary banner */}
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

              {ratioForm.ratioName !== '' && (
                <>
                  <div>
                    <Input
                      label="Sequence"
                      required
                      maxLength={1}
                      regex={/^[1-9]?$/}
                      placeholder="Enter Sequence"
                      value={ratioForm.seq}
                      onChange={(v) => setRF('seq', v)}
                    />
                    <div className="text-[10px] flex justify-end text-gray-400">1 to 9</div>
                  </div>

                  {/* also clear threshold error when unit switches */}
                  <SearchableSelect
                    allowClear={false}
                    label="Unit"
                    options={UNIT_OPTS}
                    value={ratioForm.unit}
                    onChange={(v) => {
                      setRF('unit', v)
                      // Re-clamp existing threshold against the new unit's max
                      if (ratioForm.threshold !== '') {
                        const max = v === '%' ? 100 : 1000
                        const parsed = parseFloat(ratioForm.threshold)
                        if (!isNaN(parsed) && parsed > max) {
                          setRatioForm((p) => ({ ...p, unit: v, threshold: String(max) }))
                          setRatioErr(`Maximum value is ${max} for ${v}`)
                        } else {
                          setRatioErr('')
                        }
                      }
                    }}
                  />

                  <div>
                    <Input
                      label="Threshold Value"
                      required
                      placeholder="Enter Value"
                      value={ratioForm.threshold}
                      onChange={handleThresholdChange}
                      regex={/^\d*\.?\d{0,2}$/}
                      maxLength={ratioForm.unit === '%' ? 6 : 7}
                    />
                    <div className="text-[10px] flex justify-end text-gray-400">
                      {ratioForm.unit === '%'
                        ? 'Value allowed 0.10 to 100.00'
                        : 'Value allowed 0.10 to 1000.00'}
                    </div>
                  </div>

                  <div className="md:col-span-7 lg:col-span-7">
                    <div className="flex flex-wrap align-middle items-center gap-x-1 gap-y-3">
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
                          className="flex items-center gap-1.5 cursor-pointer py-2.5 rounded-lg pe-3 transition-all"
                        >
                          <input
                            type="radio"
                            name="ratioType"
                            value={opt.value}
                            checked={ratioForm.type === opt.value}
                            onChange={() => setRF('type', opt.value)}
                            className="accent-[#01C9A4] w-3 h-3 cursor-pointer"
                          />
                          <span className="flex items-center gap-1 px-1 text-[13px] text-[#041E66] leading-snug">
                            <span className="font-semibold">{opt.label}</span>
                            <img
                              src={opt.value === 'Maximum' ? arrowUp : arrowDown}
                              alt=""
                              className="w-5 h-5 object-contain shrink-0"
                              draggable={false}
                            />
                            <span>-</span>
                            <span className="text-[#000]">{opt.desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {ratioErr && <p className="text-[12px] text-red-500 font-medium">{ratioErr}</p>}

            <div className="flex justify-center">
              <BtnPrimary
                type="button"
                disabled={
                  ratioForm.ratioName === '' ||
                  ratioForm.seq === '' ||
                  Number(ratioForm.seq) === 0 ||
                  ratioForm.threshold === '' ||
                  Number(ratioForm.threshold) < 0.1
                }
                onClick={handleAddRatio}
              >
                Add Ratio
              </BtnPrimary>
            </div>

            <CommonTable
              draggable
              onReorder={setAddedRatios}
              columns={tableColumns}
              data={sortedRatios}
              emptyText="No Record Found"
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
            />

            <div className="flex justify-center gap-4 pt-2">
              <BtnGold type="button" onClick={() => setStep(1)}>
                Back
              </BtnGold>
              <BtnPrimary
                type="button"
                disabled={addedRatios.length === 0 || isSaving}
                onClick={() => (isEdit ? setShowUpdateConfirm(true) : handleSave())}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEdit ? 'Updating…' : 'Saving…'}
                  </span>
                ) : isEdit ? (
                  'Update'
                ) : (
                  'Save'
                )}
              </BtnPrimary>
            </div>
          </div>
        )}
      </div>

      {/* Delete ratio confirmation */}
      <ConfirmModal
        open={!!ratioDeleteTarget}
        message="Are you sure you want to do this action?"
        onYes={() => {
          setAddedRatios((prev) => prev.filter((r) => r.id !== ratioDeleteTarget.id))
          toast.info('Ratio removed')
          setRatioDeleteTarget(null)
        }}
        onNo={() => setRatioDeleteTarget(null)}
      />

      {/* Update confirmation */}
      <ConfirmModal
        open={showUpdateConfirm}
        message="Are you sure you want to update this record?"
        onYes={() => {
          setShowUpdateConfirm(false)
          handleSave()
        }}
        onNo={() => setShowUpdateConfirm(false)}
      />
    </div>
  )
}

export default ManageComplianceCriteriaPage
