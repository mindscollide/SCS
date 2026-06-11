/**
 * src/pages/manager/ManageFinancialRatioPage.jsx
 * ================================================
 * Two-step wizard to ADD or EDIT a Financial Ratio (Manager role).
 *
 * Routes:
 *  /manager/manage-financial-ratio (add)
 *  /manager/manage-financial-ratio (edit; FinancialRatioContext.editRatio is set)
 *
 * Step 1 — Ratio details
 *  - Name (unique; live-checked via CheckFinancialRatioName)
 *  - Numerator + Denominator (Active classifications, mutually exclusive)
 *  - Description
 *
 * Step 2 — Classifications mapping
 *  - LazySearchableSelect of all classifications (cached in `classifCacheRef` —
 *    fetched once via getClassificationsApi PageSize=1000, filtered locally).
 *  - Add / reorder (drag) / delete. Calculated rows show a "View Formula"
 *    button → FormulaModal (Manager service GetFormulaByClassificationID).
 *  - Each row tracks: id, name, isCalculated, isProrated, baseClassificationName.
 *  - baseClassificationName MUST stay a STRING — see inline notes on
 *    fetchClassificationsFn + handleAddClassif (booleans break the table cell).
 *
 * APIs used:
 *  CheckFinancialRatioName       — live name-availability check (debounced via blur)
 *  GetAllActiveClassificationsApi — Step 1 Numerator/Denominator options
 *  getClassificationsApi          — Step 2 paginated dropdown (cached locally)
 *  SaveFinancialRatioApi          — final upsert
 *  GetFormulaByClassificationIDApi — formula preview modal (calculated rows)
 *
 * Save payload (SaveFinancialRatioApi):
 *  {
 *    PK_FinancialRatiosID,          // 0 for create, > 0 for edit
 *    Name, Description,
 *    FK_FinancialRatioStatusID,     // edit → preserve existing FK; add → 1 (Active)
 *    FK_NumeratorClassificationID,
 *    FK_DenominatorClassificationID,
 *    ClassificationIDs: number[],
 *  }
 *
 * Success detection (per Law 20 spirit): `isExecuted === true` OR responseMessage
 * ends with `_05` (the documented success code for SaveFinancialRatio).
 *
 * MQTT: `financial_ratio_saved` — central listener invalidates the FINANCIAL_RATIOS
 * dropdown cache; FinancialRatiosPage refetches its listing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Check, X, ChevronDown, ChevronUp, Calculator, GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useFinancialRatio } from '../../context/FinancialRatioContext'
import {
  CheckFinancialRatioName,
  CHECK_FINANCIAL_RATIO_NAME_CODES,
  SaveFinancialRatioApi,
  SAVE_FINANCIAL_RATIO_CODES,
  GetAllActiveClassificationsApi,
  getClassificationsApi,
} from '../../services/manager.service.js'
import Input from '../../components/common/Input/Input'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import LazySearchableSelect from '../../components/common/select/LazySearchableSelect'
import { BtnGold, BtnTeal, BtnIconDelete, BtnPrimary, ConfirmModal } from '../../components/common'
import { FormulaModal } from '../../components/common/Modals/Modals.jsx'
import RatioNameVerifyingLoader from '../../components/common/ratioNameLoader/Rationameverifyingloader.jsx'
import chartIcon from '../../../public/chart-icon.png'

const EMPTY_FORM = { name: '', numerator: '', denominator: '', desc: '' }

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

const ManageFinancialRatioPage = () => {
  const navigate = useNavigate()
  const { ratios, setRatios, editRatio } = useFinancialRatio()
  const isEdit = !!editRatio

  const [step, setStep] = useState(1)

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: editRatio.name,
          numerator: editRatio.numerator,
          denominator: editRatio.denominator,
          desc: editRatio.desc || '',
        }
      : EMPTY_FORM
  )
  const [errors, setErrors] = useState({})
  const [nameStatus, setNameStatus] = useState(isEdit ? 'ok' : null)

  const [classifNames, setClassifNames] = useState([])
  const [classifMap, setClassifMap] = useState({})
  const [classifLoading, setClassifLoading] = useState(true)
  const [classifFetchError, setClassifFetchError] = useState('')

  const [summaryOpen, setSummaryOpen] = useState(false)
  const [classifSel, setClassifSel] = useState('')
  const [classifSelMeta, setClassifSelMeta] = useState(null)
  const [classifErr, setClassifErr] = useState('')

  /**
   * addedClassifs row shape (both add-mode and edit-mode):
   *   { id, name, isCalculated, isProrated, baseClassificationName }
   *
   * Edit mode: GetFinancialRatioByID returns `mappedClassifications` with
   *   classificationID / classificationName / baseClassificationName.
   */
  const [addedClassifs, setAddedClassifs] = useState(() => {
    if (!isEdit) return []
    return (editRatio.classifications ?? []).map((c) => ({
      id: c.classificationID ?? c.id,
      name: c.classificationName ?? c.name,
      isCalculated: !!c.isCalculated,
      isProrated: !!c.isProrated,
      baseClassificationName: c.baseClassificationName ?? '', // ← always a string
    }))
  })

  // Cache for Step-2 LazySearchableSelect — populated once, filtered locally thereafter
  const classifCacheRef = useRef(null)
  const GET_CLASSIF_SUCCESS = 'Manager_ManagerServiceManager_GetClassifications_03'

  /**
   * fetchClassificationsFn
   *
   * FIX 1: option object now stores `baseClassificationName` as a string.
   * Previously it stored `base: !!c.baseClassificationName` which coerced
   * "Current Portion of Lease Liabilites" → true, so nothing ever appeared
   * in the Base Classification column.
   */
  const fetchClassificationsFn = useCallback(async (search) => {
    if (!classifCacheRef.current) {
      const res = await getClassificationsApi(
        { Name: '', Description: '', PageSize: 1000, PageNumber: 0 },
        { skipLoader: true }
      )
      const rr = res?.data?.responseResult
      const raw =
        rr?.responseMessage === GET_CLASSIF_SUCCESS && Array.isArray(rr.classifications)
          ? rr.classifications
          : []

      classifCacheRef.current = raw.map((c) => ({
        label: c.name,
        value: c.pK_ClassificationID,
        isCalculated: !!c.isCalculated,
        isProrated: !!c.isProrated,
        baseClassificationName: c.baseClassificationName || '', // FIX 1 — string, not boolean
      }))
    }

    const all = classifCacheRef.current
    const filtered = search
      ? all.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : all
    return { items: filtered, totalCount: filtered.length }
  }, [])

  const [isSaving, setIsSaving] = useState(false)

  const dragIndex = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const originalName = useRef(isEdit ? editRatio.name : '')

  const [classifDeleteTarget, setClassifDeleteTarget] = useState(null)
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [viewFormulaItem, setViewFormulaItem] = useState(null)

  // Load Step-1 dropdowns once on mount
  useEffect(() => {
    const load = async () => {
      setClassifLoading(true)
      setClassifFetchError('')
      try {
        const res = await GetAllActiveClassificationsApi({}, { skipLoader: true })
        const result = res?.data?.responseResult
        if (result?.isExecuted) {
          const raw = result.classifications ?? []
          const sorted = [...raw].sort((a, b) => a.name.localeCompare(b.name))
          setClassifNames(sorted.map((c) => c.name))
          setClassifMap(
            Object.fromEntries(
              sorted.map((c) => [
                c.name,
                {
                  id: c.pK_ClassificationID,
                  name: c.name,
                  isCalculated: !!c.isCalculated,
                  isProrated: !!c.isProrated,
                  baseClassificationName: c.baseClassificationName ?? '',
                },
              ])
            )
          )
        } else {
          setClassifFetchError('Failed to load classifications. Please refresh.')
        }
      } catch {
        setClassifFetchError('Failed to load classifications. Please refresh.')
      } finally {
        setClassifLoading(false)
      }
    }
    load()
  }, [])

  const numeratorOpts = classifNames.filter((n) => n !== form.denominator)
  const denominatorOpts = classifNames.filter((n) => n !== form.numerator)

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
      const res = await CheckFinancialRatioName({ Name: trimmed }, { skipLoader: true })
      const result = res?.data?.responseResult
      if (result?.isExecuted) {
        const isDuplicate = result.IsDuplicate ?? result.isDuplicate ?? false
        if (isDuplicate) {
          setNameStatus('taken')
          setErrors((p) => ({ ...p, name: 'Ratio Name already in use.' }))
        } else {
          setNameStatus('ok')
          setErrors((p) => ({ ...p, name: '' }))
        }
      } else {
        const msg =
          CHECK_FINANCIAL_RATIO_NAME_CODES[result?.responseMessage ?? ''] ||
          'Unable to verify name.'
        setNameStatus(null)
        setErrors((p) => ({ ...p, name: msg }))
      }
    } catch {
      setNameStatus(null)
      setErrors((p) => ({ ...p, name: 'Unable to verify name. Please try again.' }))
    }
  }

  const step1Valid =
    !!form.name.trim() && !!form.numerator && !!form.denominator && nameStatus === 'ok'

  const goToStep2 = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Please provide Financial Ratio Name'
    if (!form.numerator) errs.numerator = 'Please select Numerator'
    if (!form.denominator) errs.denominator = 'Please select Denominator'
    if (nameStatus === 'taken') errs.name = 'Ratio Name already in use.'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setStep(2)
  }

  /**
   * handleAddClassif
   *
   * FIX 2: row uses `baseClassificationName: meta.baseClassificationName`
   * (the string stored in the cache option) instead of the old `base: meta.base`
   * which was a boolean.
   */
  const handleAddClassif = () => {
    if (!classifSel) return
    if (addedClassifs.some((c) => c.id === classifSel)) {
      setClassifErr('Classification already added')
      return
    }
    const meta = classifSelMeta || {}
    setAddedClassifs((prev) => [
      ...prev,
      {
        id: classifSel,
        name: meta.label || '',
        isCalculated: meta.isCalculated || false,
        isProrated: meta.isProrated || false,
        baseClassificationName: meta.baseClassificationName || '', // FIX 2 — string
      },
    ])
    toast.success('Classification added successfully')
    setClassifSel('')
    setClassifSelMeta(null)
    setClassifErr('')
  }

  const handleDragStart = (i) => {
    dragIndex.current = i
  }
  const handleDragOver = (e, i) => {
    e.preventDefault()
    setDragOverIndex(i)
  }
  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOverIndex(null)
  }
  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === dropIdx) {
      dragIndex.current = null
      setDragOverIndex(null)
      return
    }
    setAddedClassifs((prev) => {
      const arr = [...prev]
      const [moved] = arr.splice(from, 1)
      arr.splice(dropIdx, 0, moved)
      return arr
    })
    dragIndex.current = null
    setDragOverIndex(null)
  }

  const handleSave = async () => {
    const numeratorId = classifMap[form.numerator]?.id ?? 0
    const denominatorId = classifMap[form.denominator]?.id ?? 0
    if (!numeratorId || !denominatorId) {
      toast.error('Could not resolve classification IDs. Please re-select Numerator / Denominator.')
      return
    }
    setIsSaving(true)
    const payload = {
      PK_FinancialRatiosID: isEdit ? editRatio.id : 0,
      Name: form.name.trim(),
      Description: form.desc.trim(),
      // Edit → preserve the existing FK from the listing row (read straight from the
      // server PK, no string-mapping). Add → default to 1 (Active). Mapping via the
      // `status` label was brittle: any new status name would silently default to 2.
      FK_FinancialRatioStatusID: isEdit ? editRatio.fK_FinancialRatioStatusID : 1,
      FK_NumeratorClassificationID: numeratorId,
      FK_DenominatorClassificationID: denominatorId,
      ClassificationIDs: addedClassifs.map((c) => c.id),
    }
    try {
      const res = await SaveFinancialRatioApi(payload)
      const responseMessage = res?.data?.responseResult?.responseMessage ?? ''
      const isExecuted = res?.data?.responseResult?.isExecuted ?? false

      if (isExecuted || responseMessage.endsWith('_05')) {
        const saved = {
          id: isEdit ? editRatio.id : Date.now(),
          seq: isEdit ? editRatio.seq : ratios.length + 1,
          name: form.name.trim(),
          numerator: form.numerator,
          denominator: form.denominator,
          desc: form.desc.trim(),
          classifications: addedClassifs,
          status: isEdit ? editRatio.status : 'Active',
        }
        setRatios((prev) =>
          isEdit ? prev.map((r) => (r.id === editRatio.id ? saved : r)) : [...prev, saved]
        )
        toast.success(isEdit ? 'Updated Successfully' : 'Record Added Successfully')
        navigate('/manager/financial-ratios')
        return
      }
      if (responseMessage.endsWith('_06')) {
        setNameStatus('taken')
        setErrors((p) => ({ ...p, name: 'Ratio Name already in use.' }))
        setStep(1)
        toast.error('Ratio Name already in use.')
        return
      }
      toast.error(
        SAVE_FINANCIAL_RATIO_CODES[responseMessage] || 'Something went wrong. Please try again.'
      )
    } catch {
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const goBack = () => navigate('/manager/financial-ratios')

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

  return (
    <div className="font-sans">
      {/* Page header */}
      <div className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200 flex items-center justify-between">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Financial Ratios</h1>
        <BtnGold onClick={goBack} className="flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Listing
        </BtnGold>
      </div>

      {/* Content card */}
      <div className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200">
        {/* Step tabs */}
        <div className="flex justify-center gap-4 mb-10">
          <StepTab num={1} sublabel="Add Ratio" active={step === 1} onClick={() => setStep(1)} />
          <StepTab num={2} sublabel="Add Classifications" active={step === 2} onClick={goToStep2} />
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="relative">
              <Input
                label="Financial Ratio Name"
                required
                maxLength={100}
                showCount
                placeholder="e.g. Debt to Total Assets"
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

            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <SearchableSelect
                label="Select Numerator"
                required
                placeholder={classifLoading ? 'Loading…' : 'Select Numerator'}
                options={numeratorOpts}
                value={form.numerator}
                disabled={classifLoading}
                onChange={(v) => {
                  setForm((p) => ({ ...p, numerator: v }))
                  setErrors((p) => ({ ...p, numerator: '' }))
                }}
                error={!!errors.numerator || !!classifFetchError}
                errorMessage={errors.numerator || classifFetchError}
              />
              <span className="text-[22px] text-[#a0aec0] mt-[32px] font-light select-none">/</span>
              <SearchableSelect
                label="Select Denominator"
                required
                placeholder={classifLoading ? 'Loading…' : 'Select Denominator'}
                options={denominatorOpts}
                value={form.denominator}
                disabled={classifLoading}
                onChange={(v) => {
                  setForm((p) => ({ ...p, denominator: v }))
                  setErrors((p) => ({ ...p, denominator: '' }))
                }}
                error={!!errors.denominator || !!classifFetchError}
                errorMessage={errors.denominator || classifFetchError}
              />
            </div>

            <Input
              label="Description"
              multiline
              rows={5}
              maxLength={300}
              showCount
              placeholder="Enter ratio description"
              value={form.desc}
              onChange={(v) => setForm((p) => ({ ...p, desc: v }))}
            />

            <div className="flex justify-center gap-4 pt-6">
              <BtnTeal
                onClick={() => {
                  setForm(EMPTY_FORM)
                  setErrors({})
                  setNameStatus(null)
                }}
              >
                Refresh
              </BtnTeal>
              <BtnPrimary disabled={!step1Valid} onClick={goToStep2}>
                Next
              </BtnPrimary>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="max-w-8xl mx-auto">
            {/* Collapsible summary */}
            <div className="bg-[#0B39B5] rounded-xl overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => setSummaryOpen((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
              >
                <span className="text-[15px] font-semibold text-white leading-snug">
                  {form.name}
                </span>
                {summaryOpen ? (
                  <ChevronUp size={18} className="text-white shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-white shrink-0" />
                )}
              </button>
              {summaryOpen && (
                <div className="px-5 pb-5 border-t border-white/20 pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {form.desc && (
                    <div className="md:col-span-1">
                      <p className="text-[13px] text-white font-bold mb-0.5">Description</p>
                      <p className="text-[13px] text-white/80">{form.desc}</p>
                    </div>
                  )}
                  <div className="md:col-span-1">
                    <p className="text-[13px] text-white font-bold mb-0.5">Numerator</p>
                    <p className="text-[13px] text-white/80">{form.numerator}</p>
                  </div>
                  <div className="md:col-span-1">
                    <p className="text-[13px] text-white font-bold mb-0.5">Denominator</p>
                    <p className="text-[13px] text-white/80">{form.denominator}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Classification selector */}
            <div className="mb-4">
              <LazySearchableSelect
                label="Classifications"
                required
                placeholder="Select Classification"
                fetchFn={fetchClassificationsFn}
                value={classifSel}
                selectedLabel={classifSelMeta?.label || ''}
                excludeValues={addedClassifs.map((c) => c.id)}
                onChange={(id, opt) => {
                  setClassifSel(id)
                  setClassifSelMeta(opt)
                  setClassifErr('')
                }}
                error={!!classifErr}
                errorMessage={classifErr}
              />
            </div>

            <div className="flex justify-center mb-6">
              <BtnPrimary disabled={!classifSel} onClick={handleAddClassif}>
                Add Classification
              </BtnPrimary>
            </div>

            {/* Table */}
            <div className="rounded-xl overflow-hidden border border-[#dde4ee]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: '#E0E6F6' }}>
                    <th className="w-8 px-2 py-3" />
                    {[
                      'Classifications Name',
                      'Calculated',
                      'Prorated',
                      'Base Classification',
                      'Delete',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[12px] font-semibold text-[#041E66]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {addedClassifs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[13px] text-[#a0aec0]">
                        No Record Found
                      </td>
                    </tr>
                  ) : (
                    addedClassifs.map((c, index) => (
                      <tr
                        key={c.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`border-t transition-colors ${
                          dragOverIndex === index && dragIndex.current !== index
                            ? 'bg-[#e8f0fe] border-t-2 border-t-[#0B39B5]'
                            : 'border-[#eef2f7] hover:bg-[#f8f9ff]'
                        }`}
                      >
                        <td className="w-8 px-2 py-3 cursor-grab active:cursor-grabbing">
                          <GripVertical size={15} className="text-[#a0aec0]" />
                        </td>

                        <td className="px-4 py-3 font-medium text-[#041E66]">{c.name}</td>

                        <td className="px-4 py-3">
                          {c.isCalculated ? (
                            <button
                              type="button"
                              title="View Formula"
                              onClick={() => setViewFormulaItem(c)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#e3a204] text-[11px] font-semibold"
                            >
                              <Calculator size={20} />
                            </button>
                          ) : (
                            ''
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {c.isProrated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#01C9A4] text-[11px] font-medium">
                              <img
                                src={chartIcon}
                                alt="Pie Icon"
                                className="object-contain h-auto w-7"
                                draggable={false}
                              />
                            </span>
                          ) : (
                            ''
                          )}
                        </td>

                        {/* FIX 3 — read the string field, not c.base */}
                        <td className="px-4 py-3 text-[#041E66]">
                          {c.baseClassificationName || ''}
                        </td>

                        <td className="px-4 py-3">
                          <BtnIconDelete
                            onClick={() => setClassifDeleteTarget({ id: c.id, name: c.name })}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center gap-4 mt-10">
              <BtnGold onClick={() => setStep(1)}>Back</BtnGold>
              <BtnPrimary
                disabled={addedClassifs.length === 0 || isSaving}
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

      <ConfirmModal
        open={!!classifDeleteTarget}
        message="Are you sure you want to do this action?"
        onYes={() => {
          setAddedClassifs((prev) => prev.filter((x) => x.id !== classifDeleteTarget.id))
          setClassifDeleteTarget(null)
        }}
        onNo={() => setClassifDeleteTarget(null)}
      />
      <ConfirmModal
        open={showUpdateConfirm}
        message="Are you sure you want to update this record?"
        onYes={() => {
          setShowUpdateConfirm(false)
          handleSave()
        }}
        onNo={() => setShowUpdateConfirm(false)}
      />
      <FormulaModal item={viewFormulaItem} onClose={() => setViewFormulaItem(null)} />
    </div>
  )
}

export default ManageFinancialRatioPage
