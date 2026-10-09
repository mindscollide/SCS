/**
 * src/pages/dataentry/AddFinancialDataPage.jsx
 * ==============================================
 * Add / Edit financial data page — thin wrapper around FinancialDataForm.
 *
 * Reads editRecord from FinancialDataContext:
 *  null   → Add mode (blank form)
 *  object → Edit mode (pre-filled from record)
 *
 * Dropdowns:
 *  - Quarters  : GetAllActiveQuartersApi (Manager service, localStorage-cached, DD_KEYS.QUARTERS)
 *                Loaded once on mount.
 *  - Companies : GetAvailableCompaniesForEntryApi (DataEntry service, per SRS 11.1.2)
 *                Fetched on quarter selection — returns only active companies whose
 *                Financial Data for the selected quarter has NOT been entered yet.
 *                Replaces the old GetAllActiveCompanyNamesApi (which showed all companies).
 *                In edit mode the company dropdown is locked, so this call is skipped.
 *  - Default Compliance Criteria : read from localStorage (scs_compliance_criteria)
 *
 * APIs wired:
 *  - GetAvailableCompaniesForEntryApi — on quarter select → Company dropdown (add mode only)
 *  - GetFinancialDataForEntryApi      — called inside FinancialDataForm on Search click
 *  - SaveFinancialDataApi             — Save (draft) button → buildValuesPayload(ratios)
 *  - SaveAndSubmitFinancialDataApi    — Save & Send For Approval → upsert + status → Pending
 *
 * CR 1 (Sep 2026): After a successful Save / Update, user stays on this page — no navigation.
 * CR 2 (Sep 2026): Auto-save on a configurable interval (minutes from sessionStorage
 *   'auto_save_min', set at login from autoSaveIntervalMinutes; 0 = OFF; absent = 10).
 *   Increments `autoSaveTick` → FinancialDataForm calls onSaveDraft({…, isAutoSave:true}).
 *   Only saves when values changed since last load/save (JSON.stringify snapshot comparison).
 *   Full-screen overlay shown during the API call. Failures silent; timer stops on _05/_06.
 *
 * Save payload (SaveFinancialData / SaveAndSubmitFinancialData):
 *  { FK_QuarterID, FK_CompanyID, FK_ComplianceCriteriaID,
 *    Values: [{ FK_ClassificationID, Value }] }
 *  - quarter / company come from the form as PK IDs (dropdown option values).
 *  - FK_ComplianceCriteriaID = default criteria PK from localStorage.
 *  - Values = the CURRENT current-quarter (column 0) value of EVERY classification,
 *    deduplicated by ID (a classification can appear in multiple ratio sections).
 *    Includes base, prorated, AND calculated rows — whatever is in the input now.
 *  Backend upserts by (CompanyID + QuarterID); blocked on Pending (_05) / Approved (_06).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useFinancialData } from '../../context/FinancialDataContext.jsx'
import FinancialDataForm from '../../components/common/financialData/FinancialDataForm.jsx'
import { GetAllActiveQuartersApi } from '../../services/manager.service.js'
import {
  GetAvailableCompaniesForEntryApi,
  GET_AVAILABLE_COMPANIES_FOR_ENTRY_CODES,
  SaveFinancialDataApi,
  SAVE_FINANCIAL_DATA_CODES,
  SaveAndSubmitFinancialDataApi,
  SAVE_AND_SUBMIT_FINANCIAL_DATA_CODES,
} from '../../services/dataentry.service.js'
import { getDefaultCriteriaName, getDefaultCriteria } from '../../utils/defaultCriteria.js'
import { buildValuesPayload } from '../../utils/financialFormula.js'

const BACK_PATH = '/data-entry/financial-data'

// Entry column = index 0 (current/selected quarter, e.g. Dec 2027).
const ENTRY_COL = 0

// Red error toast — Law 9 (MEMORY.md §10).
const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

// ─────────────────────────────────────────────────────────────────────────────

const AddFinancialDataPage = () => {
  const navigate = useNavigate()
  const { editRecord } = useFinancialData()

  const isEdit = editRecord !== null

  // ── Auto-save state (CR 2) ────────────────────────────────────────────────
  // autoSaveTick: incremented every N min; FinancialDataForm calls onSaveDraft
  // with isAutoSave:true when it detects a new tick and data is loaded.
  const [autoSaveTick, setAutoSaveTick] = useState(0)
  const [autoSaving, setAutoSaving] = useState(false)
  const intervalRef = useRef(null)
  // Snapshot of the last saved/loaded Values payload (JSON). null = baseline not yet captured;
  // first tick in that state sets baseline without saving (avoids spurious save on fresh load).
  const savedSnapshotRef = useRef(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('auto_save_min')
    const minutes = raw !== null ? Number(raw) : 10
    if (minutes <= 0) return // 0 = auto-save OFF
    intervalRef.current = setInterval(() => setAutoSaveTick((t) => t + 1), minutes * 60_000)
    return () => {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ── Dropdown options ──────────────────────────────────────────────────────
  const [quarters, setQuarters] = useState([]) // { label: quarterName, value: pK_QuarterID }[]
  const [companies, setCompanies] = useState([]) // { label: companyName, value: pK_CompanyID }[]

  // StrictMode guard — fetch only once on mount
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const loadQuarters = async () => {
      const qRes = await GetAllActiveQuartersApi({}, { skipLoader: true })
      if (qRes.success) {
        setQuarters(
          (qRes.data?.responseResult?.quarters || []).map((q) => ({
            label: q.quarterName || '',
            value: q.pK_QuarterID,
          }))
        )
      }
    }

    loadQuarters()
  }, [])

  /**
   * Quarter-select handler (add mode only) — calls GetAvailableCompaniesForEntry
   * to populate the Company dropdown with only companies that don't already have
   * financial data for the chosen quarter (SRS 11.1.2). Passed to FinancialDataForm
   * as `onQuarterSelect`; the form calls it whenever the Quarter dropdown changes.
   * In edit mode the company is locked, so this is a no-op.
   *
   * @param {number} quarterId — PK_QuarterID from the selected dropdown option
   */
  const handleQuarterSelect = useCallback(async (quarterId) => {
    if (!quarterId || isEdit) {
      setCompanies([])
      return
    }
    const res = await GetAvailableCompaniesForEntryApi(
      { FK_QuarterID: quarterId },
      { skipLoader: true }
    )
    if (!res.success) {
      setCompanies([])
      return
    }
    const rr = res.data?.responseResult
    const code = rr?.responseMessage
    // _04 = success; _03 = no available companies (empty list, no toast — Law 22)
    const successCode = 'DataEntry_DataEntryServiceManager_GetAvailableCompaniesForEntry_04'
    if (code === successCode) {
      setCompanies(
        (rr.companies || []).map((c) => ({
          label: c.companyName || '',
          value: c.pK_CompanyID,
        }))
      )
    } else {
      setCompanies([])
    }
  }, [isEdit])

  // ── Save Draft → SaveFinancialData ────────────────────────────────────────
  // The backend upserts by (CompanyID + QuarterID), so the same call covers both
  // add and edit — no isEdit branching needed.
  // isAutoSave:true (CR 2) → shows overlay, suppresses toasts, skips when values
  //   unchanged (snapshot comparison), stops timer on _05/_06.
  // isAutoSave:false (default) → manual Save/Update (CR 1); success toast, stays on page.
  const handleSaveDraft = useCallback(
    async ({ quarter, company, criteriaId, ratios, isAutoSave = false }) => {
      if (isAutoSave) {
        const currentSnapshot = JSON.stringify(buildValuesPayload(ratios, ENTRY_COL))
        if (savedSnapshotRef.current === null) {
          // Baseline not yet set — capture without saving (first tick or just-loaded edit)
          savedSnapshotRef.current = currentSnapshot
          return
        }
        if (savedSnapshotRef.current === currentSnapshot) return // unchanged — skip
        setAutoSaving(true)
      }

      const fallback = getDefaultCriteria()[0]?.pK_ComplianceCriteriaID || 0
      const payload = {
        FK_QuarterID: Number(quarter) || 0,
        FK_CompanyID: Number(company) || 0,
        FK_ComplianceCriteriaID: Number(criteriaId) || fallback,
        Values: buildValuesPayload(ratios, ENTRY_COL),
      }

      const res = await SaveFinancialDataApi(payload, isAutoSave ? { skipLoader: true } : undefined)
      if (isAutoSave) setAutoSaving(false)

      if (!res.success) {
        if (!isAutoSave) showError(res.message || 'Failed to save financial data.')
        return
      }

      const rr = res.data?.responseResult
      const code = rr?.responseMessage
      // _07 = success (null in the codes map); isExecuted is the reliable signal.
      if (rr?.isExecuted || SAVE_FINANCIAL_DATA_CODES[code] === null) {
        if (!isAutoSave) toast.success('Financial data saved successfully')
        // Update snapshot so next auto-save only fires when something new changed
        savedSnapshotRef.current = JSON.stringify(buildValuesPayload(ratios, ENTRY_COL))
        // CR 1: stay on page — no navigate
        return
      }
      // _05 = Pending For Approval (DE can't edit); _06 = Approved (nobody can edit)
      if (isAutoSave && (code?.endsWith('_05') || code?.endsWith('_06'))) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        showError('This record can no longer be edited.')
        return
      }
      if (!isAutoSave) showError(SAVE_FINANCIAL_DATA_CODES[code] || 'Something went wrong, please try again.')
    },
    []
  )

  // CR 2: called by FinancialDataForm once the edit-mode record is loaded — set baseline
  // so the first auto-save tick doesn't save unchanged data.
  const handleDataLoaded = useCallback((loadedRatios) => {
    savedSnapshotRef.current = JSON.stringify(buildValuesPayload(loadedRatios, ENTRY_COL))
  }, [])

  // ── Save & Send For Approval → SaveAndSubmitFinancialData ─────────────────
  // Same upsert as Save, but also sets status → Pending and notifies Managers.
  // `notes` comes from the SendForApprovalModal inside the form.
  const handleSend = useCallback(
    async ({ quarter, company, criteriaId, ratios, notes }) => {
      const fallback = getDefaultCriteria()[0]?.pK_ComplianceCriteriaID || 0
      const payload = {
        FK_QuarterID: Number(quarter) || 0,
        FK_CompanyID: Number(company) || 0,
        FK_ComplianceCriteriaID: Number(criteriaId) || fallback,
        Notes: notes || '',
        Values: buildValuesPayload(ratios, ENTRY_COL),
      }

      const res = await SaveAndSubmitFinancialDataApi(payload)
      if (!res.success) {
        showError(res.message || 'Failed to submit for approval.')
        return
      }

      const rr = res.data?.responseResult
      const code = rr?.responseMessage
      // _07 = success (null in the codes map); isExecuted is the reliable signal.
      if (rr?.isExecuted || SAVE_AND_SUBMIT_FINANCIAL_DATA_CODES[code] === null) {
        toast.success('Submitted for approval successfully')
        navigate(BACK_PATH)
        return
      }
      showError(
        SAVE_AND_SUBMIT_FINANCIAL_DATA_CODES[code] || 'Something went wrong, please try again.'
      )
    },
    [navigate]
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* CR 2: auto-save in-progress indicator — blurred backdrop + centered pill */}
      {autoSaving && (
        <>
          <style>{`@keyframes scs-autosave{from{width:0%}to{width:100%}}`}</style>
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-[280px]">
              <div className="w-full h-1 bg-slate-100">
                <div style={{ height: '100%', backgroundColor: '#01C9A4', animation: 'scs-autosave 2s ease-out forwards' }} />
              </div>
              <div className="px-5 py-3">
                <p className="text-sm font-medium" style={{ color: '#041E66' }}>Auto save data in progress…</p>
              </div>
            </div>
          </div>
        </>
      )}
      <FinancialDataForm
        title={isEdit ? 'Edit Financial Data' : 'Add Financial Data'}
        showBackBtn
        onBack={() => navigate(BACK_PATH)}
        mode={isEdit ? 'edit' : 'add'}
        record={editRecord}
        quarters={quarters}
        companies={companies}
        defaultCriteria={getDefaultCriteriaName()}
        onQuarterSelect={handleQuarterSelect}
        onSaveDraft={handleSaveDraft}
        onSendForApproval={handleSend}
        autoSaveTick={autoSaveTick}
        onDataLoaded={handleDataLoaded}
      />
      <div className="mt-auto pt-2 text-slate font-semibold text-xs flex">
        © Copyright {new Date().getFullYear()}. All Rights Reserved.
      </div>
    </>
  )
}

export default AddFinancialDataPage
