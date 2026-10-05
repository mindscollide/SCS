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
 * CR 2 (Sep 2026): Auto-save every 10 minutes via a fixed setInterval. Increments `autoSaveTick`
 *   which FinancialDataForm watches; when the form has loaded data it calls onSaveDraft with
 *   isAutoSave:true. A full-screen overlay ("Auto save data in progress….") shows during the
 *   API call and hides on resolution. Auto-save failures are silent (no toast).
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
  // autoSaveTick: incremented every 10 min; passed to FinancialDataForm which
  // calls onSaveDraft({…, isAutoSave:true}) when it detects a new tick.
  const [autoSaveTick, setAutoSaveTick] = useState(0)
  const [autoSaving, setAutoSaving] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setAutoSaveTick((t) => t + 1), 600_000)
    return () => clearInterval(id)
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
  // isAutoSave:true → triggered by the 10-min interval (CR 2); shows full-screen
  // overlay, suppresses toasts, and never navigates.
  // isAutoSave:false (default) → manual Save/Update (CR 1); shows success toast,
  // keeps user on page (no navigate).
  const handleSaveDraft = useCallback(
    async ({ quarter, company, criteriaId, ratios, isAutoSave = false }) => {
      if (isAutoSave) setAutoSaving(true)

      const fallback = getDefaultCriteria()[0]?.pK_ComplianceCriteriaID || 0
      const payload = {
        FK_QuarterID: Number(quarter) || 0,
        FK_CompanyID: Number(company) || 0,
        FK_ComplianceCriteriaID: Number(criteriaId) || fallback,
        Values: buildValuesPayload(ratios, ENTRY_COL),
      }

      const res = await SaveFinancialDataApi(payload)
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
        // CR 1: stay on page — no navigate
        return
      }
      if (!isAutoSave) showError(SAVE_FINANCIAL_DATA_CODES[code] || 'Something went wrong, please try again.')
    },
    []
  )

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
      {/* CR 2: full-screen overlay during auto-save */}
      {autoSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <p className="text-white text-xl font-semibold">Auto save data in progress….</p>
        </div>
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
      />
      <div className="mt-auto pt-2 text-slate font-semibold text-xs flex">
        © Copyright {new Date().getFullYear()}. All Rights Reserved.
      </div>
    </>
  )
}

export default AddFinancialDataPage
