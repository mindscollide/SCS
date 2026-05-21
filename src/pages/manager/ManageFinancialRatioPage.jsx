/**
 * src/pages/manager/ManageFinancialRatioPage.jsx
 * ================================================
 * 2-step wizard for Add / Edit Financial Ratio.
 * Reads editRatio from FinancialRatioContext (null = add mode).
 *
 * Step 1 — Add Ratio
 *   Financial Ratio Name (CheckFinancialRatioName API on blur for uniqueness)
 *   Numerator / Denominator (GetAllActiveClassificationsApi — open, Manager service)
 *     • Loaded once on mount; mutually exclusive (each dropdown hides the other's selection)
 *   Description (textarea, max 300 chars)
 *   Refresh | Next (Next disabled until name verified unique + both dropdowns filled)
 *
 * Step 2 — Add Classifications
 *   Collapsible summary panel (navy, collapsed by default per SRS)
 *   Classifications dropdown — LazySearchableSelect fed by getClassificationsApi
 *     • API called exactly ONCE on first open; cache stored in classifCacheRef (no re-fetches)
 *     • Subsequent opens / search queries filter the local cache — no network calls
 *     • Already-added classifications hidden via excludeValues prop
 *   Add Classifications button → appends row to the table
 *   Table: [drag] | Classifications Name | Calculated | Prorated | Base Classification | Delete
 *     • Calculated column — amber pill "Yes" (clickable → opens FormulaModal) or "—" for false
 *     • Prorated column  — teal pill "Yes" or "—" for false
 *     • Rows are draggable for reordering
 *   Back | Save (add mode) / Update (edit mode)
 *
 * FormulaModal (from Modals.jsx)
 *   Opened by clicking the Calculated "Yes" pill in the table.
 *   Calls GetFormulaByClassificationIDApi; shows formula tokens or "No formula assigned".
 *
 * APIs used:
 *   Step 1 dropdowns : GetAllActiveClassificationsApi  (Manager, open, loaded on mount)
 *   Step 2 dropdown  : getClassificationsApi            (Manager, cached in ref)
 *   Name check       : CheckFinancialRatioName          (Manager, on blur)
 *   Save/Update      : SaveFinancialRatioApi            (Manager)
 *   Formula view     : GetFormulaByClassificationIDApi  (Manager, on demand)
 *
 * Route: /manager/financial-ratios/manage
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  ArrowLeft,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Calculator,
  PieChart,
  GripVertical,
} from 'lucide-react'
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

const EMPTY_FORM = { name: '', numerator: '', denominator: '', desc: '' }

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

// ── ManageFinancialRatioPage ──────────────────────────────────────────────────
const ManageFinancialRatioPage = () => {
  const navigate = useNavigate()
  const { ratios, setRatios, editRatio } = useFinancialRatio()
  const isEdit = !!editRatio

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: editRatio.name,
          numerator: editRatio.numerator, // stored as display name
          denominator: editRatio.denominator, // stored as display name
          desc: editRatio.desc || '',
        }
      : EMPTY_FORM
  )
  const [errors, setErrors] = useState({})
  // null | 'checking' | 'ok' | 'taken'
  const [nameStatus, setNameStatus] = useState(isEdit ? 'ok' : null)

  // ── Classifications master data (from API) ────────────────────────────────
  // classifMap: { [displayName]: { id, name, calculated, prorated, base } }
  const [classifNames, setClassifNames] = useState([])
  const [classifMap, setClassifMap] = useState({})
  const [classifLoading, setClassifLoading] = useState(true)
  const [classifFetchError, setClassifFetchError] = useState('')

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [summaryOpen, setSummaryOpen] = useState(false) // collapsed by default per SRS
  const [classifSel, setClassifSel] = useState('') // selected classification ID
  const [classifSelMeta, setClassifSelMeta] = useState(null) // full option object from LazySearchableSelect
  const [classifErr, setClassifErr] = useState('')
  const [addedClassifs, setAddedClassifs] = useState(() =>
    isEdit ? editRatio.classifications.map((c) => ({ ...c })) : []
  )

  // ── fetchFn for Step 2 Classifications LazySearchableSelect ─────────────
  // API is called exactly once (on first dropdown open); results are cached in a ref.
  // Every subsequent open — including after re-typing a search — reads from the cache
  // and filters locally, so no extra network requests are made.
  const classifCacheRef = useRef(null)
  const GET_CLASSIF_SUCCESS = 'Manager_ManagerServiceManager_GetClassifications_03'

  const fetchClassificationsFn = useCallback(async (search) => {
    // ── Load from API only once ──────────────────────────────────────────
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
        calculated: !!c.isCalculated,
        prorated: !!c.isProrated,
        base: '',
      }))
    }

    // ── Filter locally from cache ────────────────────────────────────────
    const all = classifCacheRef.current
    const filtered = search
      ? all.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
      : all
    return { items: filtered, totalCount: filtered.length }
  }, [])

  // ── Save loading flag ─────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const dragIndex = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  // ── Original name ref — prevents false "duplicate" hit in edit mode ───────
  const originalName = useRef(isEdit ? editRatio.name : '')

  const [classifDeleteTarget, setClassifDeleteTarget] = useState(null) // { id, name }
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [viewFormulaItem, setViewFormulaItem] = useState(null) // { id, name, calculated, prorated }

  // ── Fetch active classifications once on mount ────────────────────────────
  useEffect(() => {
    const fetchClassifications = async () => {
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
                  // The API currently returns only id + name.
                  // These fields are defaulted safely; the table renders correctly
                  // whether or not the backend adds them later.
                  calculated: c.calculated ?? false,
                  prorated: c.prorated ?? false,
                  base: c.base ?? '',
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
    fetchClassifications()
  }, [])

  // ── Mutual exclusion: each dropdown hides whatever the other has chosen ───
  const numeratorOpts = classifNames.filter((n) => n !== form.denominator)
  const denominatorOpts = classifNames.filter((n) => n !== form.numerator)

  // ── Step 1: name uniqueness check on blur ─────────────────────────────────
  const checkNameUnique = async () => {
    const trimmed = form.name.trim()
    if (!trimmed) return

    // Edit mode: unchanged name always belongs to this record — skip API entirely.
    if (isEdit && trimmed.toLowerCase() === originalName.current.toLowerCase()) {
      setNameStatus('ok')
      setErrors((p) => ({ ...p, name: '' }))
      return
    }

    setNameStatus('checking')
    try {
      const res = await CheckFinancialRatioName({ Name: trimmed }, { skipLoader: true })
      const result = res?.data?.responseResult

      // _03 = success response; check IsDuplicate boolean inside result
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
        const code = result?.responseMessage ?? ''
        const msg = CHECK_FINANCIAL_RATIO_NAME_CODES[code] || 'Unable to verify name.'
        setNameStatus(null)
        setErrors((p) => ({ ...p, name: msg }))
      }
    } catch {
      setNameStatus(null)
      setErrors((p) => ({ ...p, name: 'Unable to verify name. Please try again.' }))
    }
  }

  // Next button active only when all 3 required fields are filled & name confirmed unique.
  // nameStatus 'checking' intentionally disables Next while the API call is in flight.
  const step1Valid =
    !!form.name.trim() && !!form.numerator && !!form.denominator && nameStatus === 'ok'

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────────
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

  // ── Step 2: add a classification to the table ─────────────────────────────
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
        id: classifSel, // pK_ClassificationID → used in ClassificationIDs[]
        name: meta.label || '',
        calculated: meta.calculated || false,
        prorated: meta.prorated || false,
        base: meta.base || '',
      },
    ])
    toast.success('Classification added successfully')
    setClassifSel('')
    setClassifSelMeta(null)
    setClassifErr('')
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (index) => {
    dragIndex.current = index
  }
  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === dropIndex) {
      dragIndex.current = null
      setDragOverIndex(null)
      return
    }
    setAddedClassifs((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(from, 1)
      updated.splice(dropIndex, 0, moved)
      return updated
    })
    dragIndex.current = null
    setDragOverIndex(null)
  }
  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  // ── Step 2: Save (add) / Update (edit) ───────────────────────────────────
  const handleSave = async () => {
    // Resolve FK IDs from classifMap using the currently-selected display names
    const numeratorId = classifMap[form.numerator]?.id ?? 0
    const denominatorId = classifMap[form.denominator]?.id ?? 0

    // Safety guard — shouldn't happen if dropdowns loaded correctly
    if (!numeratorId || !denominatorId) {
      toast.error('Could not resolve classification IDs. Please re-select Numerator / Denominator.')
      return
    }

    setIsSaving(true)

    const payload = {
      PK_FinancialRatiosID: isEdit ? editRatio.id : 0, // 0 = create new
      Name: form.name.trim(),
      Description: form.desc.trim(),
      FK_FinancialRatioStatusID: isEdit ? (editRatio.status === 'Active' ? 1 : 2) : 1,
      FK_NumeratorClassificationID: numeratorId,
      FK_DenominatorClassificationID: denominatorId,
      ClassificationIDs: addedClassifs.map((c) => c.id), // long[]
    }

    try {
      const res = await SaveFinancialRatioApi(payload)
      const responseMessage = res?.data?.responseResult?.responseMessage ?? ''
      const isExecuted = res?.data?.responseResult?.isExecuted ?? false

      // _05 = success
      if (isExecuted || responseMessage.endsWith('_05')) {
        // Sync local context so the listing page reflects changes immediately
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

      // _06 = duplicate name — surface on the Name field and return to Step 1
      if (responseMessage.endsWith('_06')) {
        setNameStatus('taken')
        setErrors((p) => ({ ...p, name: 'Ratio Name already in use.' }))
        setStep(1)
        toast.error('Ratio Name already in use.')
        return
      }

      // All other codes (_01, _02, _03, _04, _07, _08, _09) → generic error toast
      const friendlyMsg =
        SAVE_FINANCIAL_RATIO_CODES[responseMessage] || 'Something went wrong. Please try again.'
      toast.error(friendlyMsg)
    } catch {
      toast.error('Network error. Please check your connection and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const goBack = () => navigate('/manager/financial-ratios')

  // ── Name field status icon ────────────────────────────────────────────────
  // const nameRightIcon = (() => {
  //   if (nameStatus === 'checking')
  //     return (
  //       <span className="w-4 h-4 border-2 border-[#01C9A4] border-t-transparent rounded-full animate-spin" />
  //     )
  //   if (nameStatus === 'ok')
  //     return (
  //       <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#01C9A4]">
  //         <Check size={12} className="text-white" />
  //       </span>
  //     )
  //   if (nameStatus === 'taken') return <X size={16} className="text-red-400" />
  //   return null
  // })()
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
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page header ── */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200
                      flex items-center justify-between"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Financial Ratios</h1>
        <BtnGold onClick={goBack} className="flex items-center gap-2">
          <ArrowLeft size={14} /> Back to Listing
        </BtnGold>
      </div>

      {/* ── Content card ── */}
      <div className="bg-[#EFF3FF] rounded-xl px-4 py-3 mb-3 border border-slate-200">
        {/* Step tabs */}
        <div className="flex justify-center gap-4 mb-10">
          <StepTab num={1} sublabel="Add Ratio" active={step === 1} onClick={() => setStep(1)} />
          <StepTab num={2} sublabel="Add Classifications" active={step === 2} onClick={goToStep2} />
        </div>

        {/* ─────────────────── STEP 1 ─────────────────── */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Financial Ratio Name */}
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

            {/* Numerator / Denominator — mutually exclusive */}
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

            {/* Description */}
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

            {/* Buttons */}
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
              {/* <BtnTeal disabled={!step1Valid} onClick={goToStep2}>
                Next
              </BtnTeal> */}

              <BtnPrimary disabled={!step1Valid} onClick={goToStep2}>
                Next
              </BtnPrimary>
            </div>
          </div>
        )}

        {/* ─────────────────── STEP 2 ─────────────────── */}
        {step === 2 && (
          <div className="max-w-8xl mx-auto">
            {/* Collapsible summary — navy, collapsed by default (per SRS) */}
            <div className="bg-[#0B39B5] rounded-xl overflow-hidden mb-6">
              <button
                type="button"
                onClick={() => setSummaryOpen((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-4
                           hover:bg-white/5 transition-colors"
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
                    <p className="text-[13px] text-white font-bold  mb-0.5">Numerator</p>
                    <p className="text-[13px]   text-white/80">{form.numerator}</p>
                  </div>
                  <div className="md:col-span-1">
                    <p className="text-[13px] text-white font-bold  mb-0.5">Denominator</p>
                    <p className="text-[13px]  text-white/80">{form.denominator}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Classification selector — lazy server-driven dropdown */}
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

            {/* Add button — disabled until a selection is made */}
            <div className="flex justify-center mb-6">
              <BtnPrimary disabled={!classifSel} onClick={handleAddClassif}>
                Add Classification
              </BtnPrimary>
            </div>

            {/* Classifications table — 6 columns inc. drag handle */}
            <div className="rounded-xl overflow-hidden border border-[#dde4ee]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: '#E0E6F6' }}>
                    {/* Drag column — no visible header */}
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
                        className={`border-t transition-colors
                          ${
                            dragOverIndex === index && dragIndex.current !== index
                              ? 'bg-[#e8f0fe] border-t-2 border-t-[#0B39B5]'
                              : 'border-[#eef2f7] hover:bg-[#f8f9ff]'
                          }`}
                      >
                        {/* Drag handle */}
                        <td className="w-8 px-2 py-3 cursor-grab active:cursor-grabbing">
                          <GripVertical size={15} className="text-[#a0aec0]" />
                        </td>

                        <td className="px-4 py-3 font-medium text-[#041E66]">{c.name}</td>

                        <td className="px-4 py-3">
                          {c.calculated ? (
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
                          {c.prorated ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                            bg-teal-50 text-[#01C9A4] text-[11px] font-medium"
                            >
                              <PieChart size={12} /> Yes
                              {c.base && (
                                <span className="text-[12px] text-[#041E66] ml-1">{c.base}</span>
                              )}
                            </span>
                          ) : (
                            ''
                          )}
                        </td>

                        <td className="px-4 py-3 text-[#041E66]">{c.base || ''}</td>

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

            {/* Step 2 buttons */}
            <div className="flex justify-center gap-4 mt-10">
              {/* Back → returns to Step 1 (not listing) */}
              <BtnGold onClick={() => setStep(1)}>Back</BtnGold>

              {/*
                • Disabled until ≥1 classification is added (per SRS: "Save disabled by default")
                • Disabled while API call in flight (prevents double-submit)
                • Label: "Update" in edit mode, "Save" in add mode (per SRS)
                • Shows inline spinner while saving
              */}
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
      {/* ── Classification delete confirm modal ── */}
      <ConfirmModal
        open={!!classifDeleteTarget}
        message="Are you sure you want to do this action?"
        onYes={() => {
          setAddedClassifs((prev) => prev.filter((x) => x.id !== classifDeleteTarget.id))
          setClassifDeleteTarget(null)
        }}
        onNo={() => setClassifDeleteTarget(null)}
      />
      {/* ── Update confirm modal ── */}
      <ConfirmModal
        open={showUpdateConfirm}
        message="Are you sure you want to update this record?"
        onYes={() => {
          setShowUpdateConfirm(false)
          handleSave()
        }}
        onNo={() => setShowUpdateConfirm(false)}
      />

      {/* ── View formula modal (calculated classifications) ── */}
      <FormulaModal item={viewFormulaItem} onClose={() => setViewFormulaItem(null)} />
    </div>
  )
}

export default ManageFinancialRatioPage
