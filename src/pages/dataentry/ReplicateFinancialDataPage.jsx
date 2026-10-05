/**
 * src/pages/dataentry/ReplicateFinancialDataPage.jsx
 * ====================================================
 * CR 4 (Sep 2026) — Replicate Financial Data Between Quarters.
 * Allows a Data Entry user to copy financial data from one quarter
 * to another for a company and immediately submit it for approval.
 *
 * Cascade flow:
 *  1. Company dropdown (always enabled) — all active companies.
 *  2. From Quarter dropdown (enabled after company selected) — quarters where
 *     the company has In Progress or Approved data visible to the user.
 *     Loaded via GetQuartersWithDataForCompanyApi on company change.
 *  3. To Quarter dropdown (enabled after company selected) — Active quarters
 *     where the company has NO data yet (any status, any user).
 *     Loaded via GetQuartersWithoutDataForCompanyApi on company change
 *     (does NOT depend on From Quarter per API spec).
 *  4. Proceed button (enabled when all 3 filled) → ConfirmModal →
 *     ReplicateFinancialDataApi → navigate to Financial Data list on success.
 *     On _07–_10 (stale state): reload both quarter dropdowns, clear selections.
 *
 * APIs:
 *  - GetAllActiveCompanyNamesApi         — Company dropdown (localStorage-cached)
 *  - GetQuartersWithDataForCompanyApi    — From Quarter options
 *  - GetQuartersWithoutDataForCompanyApi — To Quarter options
 *  - ReplicateFinancialDataApi           — on confirm
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import { BtnGold, BtnPrimary, ConfirmModal } from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import {
  GetQuartersWithDataForCompanyApi,
  GET_QUARTERS_WITH_DATA_FOR_COMPANY_CODES,
  GetQuartersWithoutDataForCompanyApi,
  GET_QUARTERS_WITHOUT_DATA_FOR_COMPANY_CODES,
  ReplicateFinancialDataApi,
  REPLICATE_FINANCIAL_DATA_CODES,
} from '../../services/dataentry.service.js'
import { GetAllActiveCompanyNamesApi } from '../../services/manager.service.js'

const BACK_PATH = '/data-entry/financial-data'
const C_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'

// Codes that mean "reload dropdowns + re-select" rather than a hard error
const STALE_CODES = new Set([
  'DataEntry_DataEntryServiceManager_ReplicateFinancialData_07',
  'DataEntry_DataEntryServiceManager_ReplicateFinancialData_08',
  'DataEntry_DataEntryServiceManager_ReplicateFinancialData_09',
  'DataEntry_DataEntryServiceManager_ReplicateFinancialData_10',
])

const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

// ─────────────────────────────────────────────────────────────────────────────

const ReplicateFinancialDataPage = () => {
  const navigate = useNavigate()

  // ── Dropdown options ──────────────────────────────────────────────────────
  const [companies, setCompanies]       = useState([])
  const [fromQuarters, setFromQuarters] = useState([])
  const [toQuarters, setToQuarters]     = useState([])

  // ── Selected values ───────────────────────────────────────────────────────
  const [companyId, setCompanyId]         = useState('')
  const [fromQuarterId, setFromQuarterId] = useState('')
  const [toQuarterId, setToQuarterId]     = useState('')

  // ── Loading states ────────────────────────────────────────────────────────
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [loadingFrom, setLoadingFrom]           = useState(false)
  const [loadingTo, setLoadingTo]               = useState(false)
  const [replicating, setReplicating]           = useState(false)

  // ── Confirm modal ─────────────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false)

  // StrictMode guard — fetch companies only once on mount
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    ;(async () => {
      setLoadingCompanies(true)
      const res = await GetAllActiveCompanyNamesApi({}, { skipLoader: true })
      setLoadingCompanies(false)
      if (res.success && res.data?.responseResult?.responseMessage === C_OK) {
        setCompanies(
          (res.data.responseResult.companies || []).map((c) => ({
            value: c.pK_CompanyID,
            label: c.companyName || '',
          }))
        )
      }
    })()
  }, [])

  // ── Load both quarter dropdowns for a given company ID ────────────────────
  // Per API spec, GetQuartersWithoutDataForCompany does NOT depend on From Quarter,
  // so both calls fire together whenever the company changes.
  const loadQuartersForCompany = useCallback(async (id) => {
    setLoadingFrom(true)
    setLoadingTo(true)

    const [fromRes, toRes] = await Promise.all([
      GetQuartersWithDataForCompanyApi({ FK_CompanyID: id }, { skipLoader: true }),
      GetQuartersWithoutDataForCompanyApi({ FK_CompanyID: id }, { skipLoader: true }),
    ])

    setLoadingFrom(false)
    setLoadingTo(false)

    // From Quarter — _03 (no quarters) and _04 (success) are both null codes → show list or empty
    if (fromRes.success) {
      const rr = fromRes.data?.responseResult
      const code = rr?.responseMessage
      if (GET_QUARTERS_WITH_DATA_FOR_COMPANY_CODES[code] === null) {
        setFromQuarters(
          (rr.quarters || []).map((q) => ({ value: q.pK_QuarterID, label: q.quarterName || '' }))
        )
      }
    }

    // To Quarter — same: _03 and _04 are null
    if (toRes.success) {
      const rr = toRes.data?.responseResult
      const code = rr?.responseMessage
      if (GET_QUARTERS_WITHOUT_DATA_FOR_COMPANY_CODES[code] === null) {
        setToQuarters(
          (rr.quarters || []).map((q) => ({ value: q.pK_QuarterID, label: q.quarterName || '' }))
        )
      }
    }
  }, [])

  // ── Company change ────────────────────────────────────────────────────────
  const handleCompanyChange = useCallback((id) => {
    setCompanyId(id)
    setFromQuarterId('')
    setToQuarterId('')
    setFromQuarters([])
    setToQuarters([])
    if (!id) return
    loadQuartersForCompany(id)
  }, [loadQuartersForCompany])

  // ── Proceed → confirm ─────────────────────────────────────────────────────
  const handleProceed = () => {
    if (!companyId || !fromQuarterId || !toQuarterId) return
    setConfirmOpen(true)
  }

  // ── Confirm → ReplicateFinancialData ──────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    setConfirmOpen(false)
    setReplicating(true)

    const res = await ReplicateFinancialDataApi({
      FK_CompanyID:     Number(companyId),
      FK_FromQuarterID: Number(fromQuarterId),
      FK_ToQuarterID:   Number(toQuarterId),
    })

    setReplicating(false)

    if (!res.success) {
      showError(res.message || 'Failed to replicate financial data.')
      return
    }

    const rr = res.data?.responseResult
    const code = rr?.responseMessage

    if (REPLICATE_FINANCIAL_DATA_CODES[code] === null) {
      toast.success('Financial data replicated and submitted for approval successfully.')
      navigate(BACK_PATH)
      return
    }

    const msg = REPLICATE_FINANCIAL_DATA_CODES[code] || 'Something went wrong, please try again.'
    showError(msg)

    // _07–_10: source or target state changed between dropdown load and submit —
    // reload both quarter dropdowns so the user can make a fresh selection.
    if (STALE_CODES.has(code)) {
      setFromQuarterId('')
      setToQuarterId('')
      setFromQuarters([])
      setToQuarters([])
      loadQuartersForCompany(companyId)
    }
  }, [companyId, fromQuarterId, toQuarterId, navigate, loadQuartersForCompany])

  // ── Derived display names for confirm message ─────────────────────────────
  const companyLabel     = companies.find((c) => c.value === companyId)?.label || ''
  const fromQuarterLabel = fromQuarters.find((q) => q.value === fromQuarterId)?.label || ''
  const toQuarterLabel   = toQuarters.find((q) => q.value === toQuarterId)?.label || ''

  const canProceed = !!companyId && !!fromQuarterId && !!toQuarterId && !replicating

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div
        className="bg-[#eff3ff] rounded-xl px-3 py-2 mb-2 border border-slate-200
                   flex items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Replicate Financial Data between quarters</h1>
        <BtnGold
          onClick={() => navigate(BACK_PATH)}
          className="flex items-center gap-2 shrink-0"
        >
          <ArrowLeft size={15} />
          Back to Listing
        </BtnGold>
      </div>

      {/* ── Form card ── */}
      <div className="bg-[#eff3ff] rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-end gap-4">

          {/* Company */}
          <div className="min-w-[260px] flex-[2]">
            <SearchableSelect
              label="Company"
              required
              placeholder={loadingCompanies ? 'Loading…' : 'Select Company'}
              options={companies}
              value={companyId}
              onChange={handleCompanyChange}
              disabled={loadingCompanies}
            />
          </div>

          {/* From Quarter */}
          <div className="min-w-[200px] flex-1">
            <SearchableSelect
              label="From Quarter"
              required
              placeholder={
                !companyId        ? 'Select a company first'
                : loadingFrom     ? 'Loading…'
                : fromQuarters.length === 0 ? 'No data available'
                : 'Select Quarter'
              }
              options={fromQuarters}
              value={fromQuarterId}
              onChange={setFromQuarterId}
              disabled={!companyId || loadingFrom || fromQuarters.length === 0}
            />
          </div>

          {/* To Quarter */}
          <div className="min-w-[200px] flex-1">
            <SearchableSelect
              label="To Quarter"
              required
              placeholder={
                !companyId        ? 'Select a company first'
                : !fromQuarterId  ? 'Select a From Quarter first'
                : loadingTo       ? 'Loading…'
                : toQuarters.length === 0 ? 'No available quarters'
                : 'Select Quarter'
              }
              options={toQuarters}
              value={toQuarterId}
              onChange={setToQuarterId}
              disabled={!companyId || !fromQuarterId || loadingTo || toQuarters.length === 0}
            />
          </div>

          {/* Proceed button */}
          <div className="shrink-0 pb-[2px]">
            <BtnPrimary onClick={handleProceed} disabled={!canProceed}>
              {replicating ? 'Processing…' : 'Proceed'}
            </BtnPrimary>
          </div>

        </div>
      </div>

      {/* ── Confirm modal ── */}
      <ConfirmModal
        open={confirmOpen}
        message={
          companyLabel && fromQuarterLabel && toQuarterLabel
            ? `Replicate financial data for ${companyLabel} from ${fromQuarterLabel} to ${toQuarterLabel}? The new record will be submitted for Manager approval immediately.`
            : 'Are you sure you want to replicate this financial data?'
        }
        onYes={handleConfirm}
        onNo={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default ReplicateFinancialDataPage
