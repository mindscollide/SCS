/**
 * src/components/common/financialData/FinancialDataForm.jsx
 * ===========================================================
 * Reusable financial data entry / view / edit form.
 * Used by:
 *  - pages/dataentry/AddFinancialDataPage.jsx  (add & edit modes)
 *  - pages/manager/PendingApprovalsPage.jsx     (view & edit modes)
 *
 * Props
 * ─────
 *  title            string       — header title text
 *  onBack           function     — called when "Back to Listing" / Close clicked
 *  mode             'add'|'edit'|'view'
 *  record           object|null  — existing record; null = blank add form
 *  quarters         {label,value}[] — Quarter dropdown options (PK ID as value)
 *  companies        {label,value}[] — Company dropdown options (PK ID as value).
 *                                     In add mode, this is populated dynamically by the
 *                                     parent via onQuarterSelect → GetAvailableCompaniesForEntry.
 *  defaultCriteria  string       — read-only default compliance criteria name
 *  onQuarterSelect  function(quarterId) — called when the Quarter dropdown changes.
 *                                     The parent uses this to fetch available companies
 *                                     for the chosen quarter (add mode only). Optional.
 *
 *  // Data-entry role callbacks
 *  onSaveDraft        function(data) — show "Save" button
 *  onSendForApproval  function(data) — show "Save & Send For Approval" button
 *
 *  // Manager role callback
 *  onUpdate           function(data) — show "Update" button
 *
 * data shape passed to callbacks: { quarter, company, ratios }
 *
 * Search flow (data-entry add)
 * ────────────────────────────
 * Quarter + Company selected → Search → GetFinancialDataForEntry (criteria from localStorage
 * default). On success the response is transformed by mapEntryDataToTable() into
 * { columns, ratios } and rendered in the grid.
 *
 * Entry-column value derivation (column 0 = current/selected quarter)
 * ───────────────────────────────────────────────────────────────────
 * After Search, two passes seed the entry column (in this order):
 *  1. applyProratedColumn() — ONE-SHOT for isProrated rows. Seeds the current value
 *     from the previous-quarter proportion: if P_prev > 0 → (P_prev / B_prev) × B_curr,
 *     else 0. Prorated rows stay EDITABLE and are NOT re-seeded after the first render.
 *  2. computeCalculatedColumn() — LIVE for isCalculated rows. Evaluates each row's
 *     expression (e.g. ["63 + 45 x 32"], IDs resolved to current values) and writes
 *     the result. Calculated rows are READ-ONLY (derived, not typed).
 *
 * On any base-cell edit (handleCellChange):
 *  - The value is written to EVERY occurrence of that classification ID (a row may
 *    appear in multiple ratios — they share one value).
 *  - recomputeProratedForBase() re-seeds any prorated classification whose base was
 *    edited, using the previous-quarter ratio (P_prev / B_prev) × B_curr_new.
 *  - computeCalculatedColumn() re-runs so calculated rows update live.
 *
 * Edit mode dropdown fix:
 *  effectiveCompanies / effectiveQuarters inject the record's company/quarter into
 *  the options list if missing (GetAvailableCompaniesForEntry excludes companies with
 *  existing data, but on edit we need to show the current company name).
 *
 * See src/utils/financialFormula.js for the evaluator, recompute, and proration logic.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import { BtnPrimary, BtnTeal, BtnGold } from '../index.jsx'
import FinancialDataTable, { MOCK_RATIOS } from '../table/FinancialDataTable.jsx'
import { ConfirmModal } from '../index.jsx'
import { SendForApprovalModal } from '../modals/Modals.jsx'
import {
  GetFinancialDataForEntryApi,
  GET_FINANCIAL_DATA_FOR_ENTRY_CODES,
  GetFinancialDataByIDApi,
  GET_FINANCIAL_DATA_BY_ID_CODES,
} from '../../../services/dataentry.service.js'
import { getDefaultCriteria } from '../../../utils/defaultCriteria.js'
import {
  computeCalculatedColumn,
  applyProratedColumn,
  recomputeProratedForBase,
  recomputeAllProrated,
  mapEntryDataToTable,
} from '../../../utils/financialFormula.js'

// Entry column = index 0 (the selected/current quarter, e.g. "Dec 2027"), newest first.
const ENTRY_COL = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

const cloneRatios = (src) =>
  src.map((r) => ({
    ...r,
    classifications: r.classifications.map((c) => ({ ...c, values: [...c.values] })),
  }))

const freshRatios = () =>
  MOCK_RATIOS.map((r) => ({
    ...r,
    classifications: r.classifications.map((c) => ({ ...c, values: ['', ...c.values.slice(1)] })),
  }))

// ─────────────────────────────────────────────────────────────────────────────

const FinancialDataForm = ({
  title = 'Financial Data',
  onBack,
  mode = 'add', // 'add' | 'edit' | 'view'
  record = null,
  quarters = [],   // { label, value }[] — value = PK_QuarterID
  companies = [],  // { label, value }[] — value = PK_CompanyID
  defaultCriteria = '',
  onSaveDraft,
  onSendForApproval,
  onUpdate,
  onQuarterSelect,
}) => {
  const isView = mode === 'view'
  const isEdit = mode === 'edit'
  const isDataEntry = !!(onSaveDraft || onSendForApproval)

  // Edit mode: ensure the record's company/quarter appear in the options
  const effectiveCompanies = useMemo(() => {
    if (!isEdit || !record) return companies
    const id = record.companyId ?? record.company
    if (!id || companies.some((c) => (c.value ?? c) === id)) return companies
    return [{ label: record.company || record.companyName || '', value: id }, ...companies]
  }, [isEdit, record, companies])

  const effectiveQuarters = useMemo(() => {
    if (!isEdit || !record) return quarters
    const id = record.quarterId ?? record.quarter
    if (!id || quarters.some((q) => (q.value ?? q) === id)) return quarters
    return [{ label: record.quarter || record.quarterName || '', value: id }, ...quarters]
  }, [isEdit, record, quarters])

  // ── Form state ────────────────────────────────────────────────────────────
  // quarter / company hold the selected option VALUE (PK ID, number).
  // For edit, the listing row carries the PK ids (quarterId / companyId); the
  // GetFinancialDataByID load below confirms them from the response header.
  const [quarter, setQuarter] = useState(record?.quarterId ?? record?.quarter ?? '')
  const [company, setCompany] = useState(record?.companyId ?? record?.company ?? '')
  const [errors, setErrors] = useState({ quarter: '', company: '' })
  const [ratios, setRatios] = useState(() =>
    record?.ratios ? cloneRatios(record.ratios) : freshRatios()
  )

  // Period columns for the grid: { id, label }[] from the API after Search.
  const [columns, setColumns] = useState(() => record?.columns ?? [])

  // ── Compliance criteria PK used for this record ───────────────────────────
  // Add  → the localStorage default (set on Search).
  // Edit → the record's own criteria (set from the GetFinancialDataByID header).
  // Sent back to the parent in getData() so Save uses the correct criteria.
  const [criteriaId, setCriteriaId] = useState(
    () => record?.criteriaId ?? getDefaultCriteria()[0]?.pK_ComplianceCriteriaID ?? 0
  )

  // Display name shown in the read-only Criteria field.
  // Add mode: mirrors the defaultCriteria prop (from localStorage default).
  // Edit mode: overwritten by the API response header (complianceCriteriaName) on load.
  const [criteriaDisplayName, setCriteriaDisplayName] = useState(defaultCriteria)

  // ── After Search / load: lock dropdowns & show table data ─────────────────
  // Only true once we actually have ratio rows (edit fetches them on mount below).
  const [searched, setSearched] = useState(!!record?.ratios)

  // ── Raw entry response (responseResult) — kept for save/debug ─────────────
  const [entryData, setEntryData] = useState(null)

  // ── Search API loading state ──────────────────────────────────────────────
  const [searchLoading, setSearchLoading] = useState(false)

  // Prorated rows the user has manually typed a value into. recomputeAllProrated skips
  // every ID in this Set so an unrelated cell edit never resets a manual override.
  // Cleared on each new Search so a fresh load starts clean.
  const manualOverridesRef = useRef(new Set())

  // ── Edit mode: load the saved record by PK on mount ───────────────────────
  // GetFinancialDataByID returns the same { quarters, financialRatios } shape as
  // GetFinancialDataForEntry plus a header. We map it the same way, then:
  //  - recompute calculated rows (read-only, for live editing) via computeCalculatedColumn
  //  - do NOT re-seed prorated rows (preserve the user's saved values).
  const editLoadedRef = useRef(false)
  useEffect(() => {
    if (!isEdit || !record?.id || editLoadedRef.current) return
    editLoadedRef.current = true

    const loadById = async () => {
      const res = await GetFinancialDataByIDApi({ PK_FinancialDataID: record.id })
      const result = res?.data?.responseResult
      const code = result?.responseMessage
      const ok = result?.isExecuted || GET_FINANCIAL_DATA_BY_ID_CODES[code] === null
      if (!ok) {
        toast.error(GET_FINANCIAL_DATA_BY_ID_CODES[code] || 'Failed to load the record.', {
          style: { backgroundColor: '#E74C3C', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        })
        return
      }
      const header = result.header || {}
      if (header.fK_QuarterID) setQuarter(header.fK_QuarterID)
      if (header.fK_CompanyID) setCompany(header.fK_CompanyID)
      if (header.fK_ComplianceCriteriaID) setCriteriaId(header.fK_ComplianceCriteriaID)
      if (header.complianceCriteriaName) setCriteriaDisplayName(header.complianceCriteriaName)

      const { columns: cols, ratios: rws } = mapEntryDataToTable(result)
      setColumns(cols)
      setRatios(computeCalculatedColumn(rws, ENTRY_COL)) // calculated recompute; prorated kept as saved
      setEntryData(result)
      setSearched(true)
    }
    loadById()
  }, [isEdit, record])

  // ── Modal state ───────────────────────────────────────────────────────────
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [saveConfirm, setSaveConfirm] = useState(false)
  const [sendModal, setSendModal] = useState(false)

  // ── Derived: which controls are enabled ──────────────────────────────────
  const canSearch = !!quarter && !!company && !searched && !searchLoading
  const canAction = searched // Close/Save/Send only enabled after Search

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (isView) return true
    const e = {
      quarter: quarter ? '' : 'Quarter is required',
      company: company ? '' : 'Company is required',
    }
    setErrors(e)
    return !e.quarter && !e.company
  }, [isView, quarter, company])

  // ── Cell change ───────────────────────────────────────────────────────────
  // 1. Write the user's value into EVERY occurrence of this classification ID.
  //    A classification can appear in more than one ratio section (e.g. id 45
  //    "Commission and Discounts" is under two ratios). It is one entity with one
  //    value per quarter, so all copies must stay in sync — otherwise a formula
  //    that references it could read a stale copy and not react to the edit.
  //    We therefore match by classId across all ratios (ratioId is ignored).
  // 2. Recompute every calculated row for that column so dependents (and their
  //    dependents, transitively) update live. Full-column recompute is a superset
  //    of the isDependentClassification cascade and is always correct for nested
  //    formulas. Only the entry column is editable, so this only recomputes ENTRY_COL.
  const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
    setRatios((prev) => {
      // If the user is directly typing into a prorated row, add it to the manual-override
      // set. recomputeAllProrated will skip every ID in this set, so subsequent edits
      // to unrelated cells won't reset the value the user just typed.
      const isEditedProrated = prev.some((r) =>
        r.classifications.some((c) => Number(c.id) === Number(classId) && c.isProrated)
      )
      if (isEditedProrated) {
        manualOverridesRef.current = new Set([...manualOverridesRef.current, Number(classId)])
      }

      let updated = prev.map((r) => ({
        ...r,
        classifications: r.classifications.map((cls) => {
          if (Number(cls.id) !== Number(classId)) return cls
          const newValues = [...cls.values]
          newValues[colIdx] = val
          return { ...cls, values: newValues }
        }),
      }))
      updated = recomputeProratedForBase(updated, classId, colIdx)
      updated = computeCalculatedColumn(updated, colIdx)
      // Re-prorate after calculated columns update — catches prorated rows whose base is a
      // calculated classification (e.g. Total Investments). Passes the full override Set so
      // ALL manually-typed prorated rows are preserved, not just the currently-edited one.
      updated = recomputeAllProrated(updated, colIdx, colIdx + 1, manualOverridesRef.current)
      return computeCalculatedColumn(updated, colIdx)
    })
  }, [])

  const getData = () => ({ quarter, company, criteriaId, ratios })

  // ── Search handler — calls GetFinancialDataForEntry API ──────────────────
  const handleSearch = useCallback(async () => {
    if (!validate()) return

    const criteriaList = getDefaultCriteria()
    const defCriteriaId = criteriaList[0]?.pK_ComplianceCriteriaID || 0
    if (!defCriteriaId) {
      toast.error('No default compliance criteria set. Please contact your manager.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }
    setCriteriaId(defCriteriaId) // carried into getData() for Save

    setSearchLoading(true)
    try {
      const res = await GetFinancialDataForEntryApi(
        { FK_QuarterID: quarter, FK_CompanyID: company, FK_ComplianceCriteriaID: defCriteriaId },
        { skipLoader: true }
      )
      const result = res?.data?.responseResult
      const code = result?.responseMessage ?? ''

      // Fresh load — clear any manual overrides from a previous search session
      manualOverridesRef.current = new Set()

      if (result?.isExecuted) {
        // _06 — success: build the grid, then seed values for the entry column.
        // Order matters:
        //   1. applyProratedColumn — one-time prorated seed (uses prev-quarter ratio).
        //   2. computeCalculatedColumn — formula rows (may reference the prorated rows).
        const { columns: cols, ratios: rws } = mapEntryDataToTable(result)
        setColumns(cols)
        const prorated = applyProratedColumn(rws, ENTRY_COL)
        setRatios(computeCalculatedColumn(prorated, ENTRY_COL))
        setEntryData(result)
        setSearched(true)
      } else if (
        code === 'DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_05'
      ) {
        // _05 — no ratios mapped to this criteria: show columns (if any) with an empty body.
        const { columns: cols, ratios: rws } = mapEntryDataToTable(result)
        setColumns(cols)
        setRatios(rws) // [] — no ratio sections, nothing to compute
        setEntryData(null)
        setSearched(true)
      } else {
        const errMsg =
          GET_FINANCIAL_DATA_FOR_ENTRY_CODES[code] || 'Failed to load financial data. Please try again.'
        toast.error(errMsg, {
          style: { backgroundColor: '#E74C3C', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        })
      }
    } catch {
      toast.error('Network error. Please try again.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
    } finally {
      setSearchLoading(false)
    }
  }, [validate, quarter, company])

  // ── Close / Back: show confirmation ──────────────────────────────────────
  const handleBackClick = () => {
    if (searched && isDataEntry) setCloseConfirm(true)
    else onBack?.()
  }

  // ── Save (draft) flow ─────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(() => {
    if (!validate()) return
    setSaveConfirm(true)
  }, [validate])

  const confirmSave = useCallback(() => {
    setSaveConfirm(false)
    onSaveDraft?.(getData())
  }, [quarter, company, ratios, onSaveDraft])

  // ── Send for Approval flow ────────────────────────────────────────────────
  const handleSendClick = useCallback(() => {
    if (!validate()) return
    setSendModal(true)
  }, [validate])

  const confirmSend = useCallback(
    (notes) => {
      setSendModal(false)
      onSendForApproval?.({ ...getData(), notes })
    },
    [quarter, company, ratios, onSendForApproval]
  )

  // ── Update (manager) ─────────────────────────────────────────────────────
  const handleUpdate = useCallback(() => {
    if (!validate()) return
    onUpdate?.(getData())
  }, [validate, quarter, company, ratios, onUpdate])

  // ── Action buttons ────────────────────────────────────────────────────────
  const renderActions = () => {
    if (isDataEntry) {
      return (
        <>
          <BtnGold onClick={handleBackClick} disabled={!canAction}>
            Close
          </BtnGold>
          {onSaveDraft && (
            <BtnPrimary onClick={handleSaveDraft} disabled={!canAction}>
              {isEdit ? 'Update' : 'Save'}
            </BtnPrimary>
          )}
          {onSendForApproval && (
            <BtnTeal onClick={handleSendClick} disabled={!canAction}>
              {isEdit ? 'Update' : 'Save'} &amp; Send For Approval
            </BtnTeal>
          )}
        </>
      )
    }
    if (onUpdate) {
      return (
        <>
          <BtnGold onClick={onBack}>Close</BtnGold>
          <BtnPrimary onClick={handleUpdate}>Update</BtnPrimary>
        </>
      )
    }
    return <BtnGold onClick={onBack}>Close</BtnGold>
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band: title left, Back to Listing right ── */}
      <div
        className="bg-[#eff3ff] rounded-xl px-3 py-2 mb-2 border border-slate-200
                      flex items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">{title}</h1>
        <BtnGold onClick={handleBackClick} className="flex items-center gap-2 shrink-0">
          <ArrowLeft size={15} />
          Back to Listing
        </BtnGold>
      </div>

      {/* ── Form card ── */}
      <div className="bg-[#eff3ff] rounded-xl border border-slate-200 p-5">
        <FinancialDataTable
          quarters={effectiveQuarters}
          companies={effectiveCompanies}
          selectedQuarter={quarter}
          onQuarterChange={(v) => {
            setQuarter(v)
            setErrors((p) => ({ ...p, quarter: '' }))
            setCompany('')
            setSearched(false)
            // Notify parent so it can fetch available companies for this quarter
            onQuarterSelect?.(v)
          }}
          selectedCompany={company}
          onCompanyChange={(v) => {
            setCompany(v)
            setErrors((p) => ({ ...p, company: '' }))
            setSearched(false)
          }}
          quarterError={errors.quarter}
          companyError={errors.company}
          defaultCriteria={criteriaDisplayName}
          criteriaLabel={isEdit ? 'Compliance Criteria' : 'Default Compliance Criteria'}
          criteriaRequired={!isEdit}
          onSearch={handleSearch}
          disableQuarter={searched || isEdit}
          disableCompany={!quarter || searched || isEdit}
          disableSearch={!canSearch || isEdit}
          searched={searched}
          columns={columns.length ? columns : undefined}
          ratios={ratios}
          editableCol={isView ? -1 : 0}
          onCellChange={isView ? undefined : handleCellChange}
          actions={renderActions()}
        />
      </div>

      {/* ── Close confirmation modal ── */}
      <ConfirmModal
        open={closeConfirm}
        message="All the changes will be lost. Are you sure you want to close?"
        onYes={() => {
          setCloseConfirm(false)
          onBack?.()
        }}
        onNo={() => setCloseConfirm(false)}
      />

      {/* ── Save confirmation modal ── */}
      <ConfirmModal
        open={saveConfirm}
        message="Are you sure you want to save the information?"
        onYes={confirmSave}
        onNo={() => setSaveConfirm(false)}
      />

      {/* ── Send for Approval modal ── */}
      <SendForApprovalModal
        open={sendModal}
        onClose={() => setSendModal(false)}
        onProceed={confirmSend}
      />
    </div>
  )
}

export default FinancialDataForm
