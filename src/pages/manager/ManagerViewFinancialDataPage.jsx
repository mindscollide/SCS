/**
 * src/pages/manager/ManagerViewFinancialDataPage.jsx
 * ====================================================
 * Shared view/edit page for a saved financial-data record.
 *
 * Entry points:
 *  Manager (role 2) — from PendingApprovalsPage:
 *    Company name click → mode = 'view'  → /manager/financial-data/view/:id
 *    Edit icon click    → mode = 'edit'  → /manager/financial-data/edit/:id
 *  View Only (role 4) — from ManagerFinancialDataListPage:
 *    Company name click → mode = 'view'  → /view-only/financial-data/view/:id
 *    (location.state.from = '/view-only/financial-data' so Back/Close return there)
 *
 * APIs:
 *  - GetFinancialDataByIDApi  — load record on mount
 *  - SaveFinancialDataApi     — save edits (Manager edit mode only)
 *  - UpdatePendingApprovalApi — approve/decline (Manager view of Pending records only)
 *
 * Button visibility rules:
 *  - Save    : isEdit only
 *  - Approve : canAction only (view mode + Pending For Approval status + approvalRequestId > 0)
 *  - Decline : canAction only
 *  - Close   : always — both Manager and View Only see only this button in plain view mode
 *
 *  canAction uses !!approvalRequestId (boolean coercion) — raw numeric 0 would render
 *  as "0" text in JSX without the double-negation (fixed 2026-07-01).
 *
 * View mode: Quarter & Company shown as readonly text inputs (not dropdowns).
 * Edit mode: Quarter & Company shown as disabled dropdowns.
 *
 * Approve / Decline (2026-06-23):
 *  approvalRequestId is passed via location.state from PendingApprovalsPage.
 *  Opens RequestActionModal with suggested reasons from sessionStorage.
 *  On success → toast + navigate back.
 *
 * Threshold logic: Edit → useRatioThreshold. View approved → quarterlyThresholds.
 * Cell edits trigger recomputeProratedForBase + computeCalculatedColumn.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import { BtnGold, BtnPrimary } from '../../components/common/index.jsx'
import FinancialDataTable from '../../components/common/table/FinancialDataTable.jsx'
import { ConfirmModal } from '../../components/common/index.jsx'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import {
  GetFinancialDataByIDApi,
  GET_FINANCIAL_DATA_BY_ID_CODES,
  SaveFinancialDataApi,
  SAVE_FINANCIAL_DATA_CODES,
} from '../../services/dataentry.service.js'
import {
  UpdatePendingApprovalApi,
  UPDATE_PENDING_APPROVAL_CODES,
} from '../../services/manager.service.js'
import {
  mapEntryDataToTable,
  computeCalculatedColumn,
  recomputeProratedForBase,
  recomputeAllProrated,
  buildValuesPayload,
} from '../../utils/financialFormula.js'

const ENTRY_COL = 0
const STATUS_APPROVED = 2
const STATUS_DECLINED = 3

const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

// ─────────────────────────────────────────────────────────────────────────────

const ManagerViewFinancialDataPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const location = useLocation()

  // Use wherever the caller came from; fall back to pending approvals
  const BACK_PATH = location.state?.from || '/manager/pending-approvals'

  // Derive mode from the current URL path — no need for a separate route prop.
  const isEdit = window.location.pathname.includes('/edit/')
  // ── Record state ──────────────────────────────────────────────────────────
  const [header, setHeader] = useState(null)
  const [columns, setColumns] = useState([])
  const [ratios, setRatios] = useState([])
  const [criteriaId, setCriteriaId] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [saveConfirm, setSaveConfirm] = useState(false)

  // ── Approve / Decline state ──────────────────────────────────────────────
  const approvalRequestId = location.state?.approvalRequestId || 0
  const rowData = location.state?.row || null
  const [actionModal, setActionModal] = useState(null) // { type: 'approve' | 'decline' }
  const [isActioning, setIsActioning] = useState(false)
  const [approveReasons] = useState(() => {
    const raw = sessionStorage.getItem('approve_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })
  const [declineReasons] = useState(() => {
    const raw = sessionStorage.getItem('decline_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })

  // Tracks prorated rows the user has manually typed a value into.
  // recomputeAllProrated skips every ID in this Set so a subsequent unrelated
  // cell edit never resets a value the user just typed (mirrors FinancialDataForm).
  const manualOverridesRef = useRef(new Set())

  // ── Load record by PK (StrictMode-safe single-fire) ───────────────────────
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      setLoading(true)
      setError(null)

      const res = await GetFinancialDataByIDApi(
        { PK_FinancialDataID: Number(id) || 0 },
        { skipLoader: true }
      )
      setLoading(false)

      if (!res.success) {
        setError(res.message || 'Failed to load record.')
        return
      }

      const result = res.data?.responseResult
      const code = result?.responseMessage
      const ok = result?.isExecuted || GET_FINANCIAL_DATA_BY_ID_CODES[code] === null

      if (!ok) {
        setError(GET_FINANCIAL_DATA_BY_ID_CODES[code] || 'Record not found.')
        return
      }

      const h = result.header || {}
      setHeader(h)
      if (h.fK_ComplianceCriteriaID) setCriteriaId(h.fK_ComplianceCriteriaID)

      const isApproved = h.status === 'Approved'
      const { columns: cols, ratios: rws } = mapEntryDataToTable(result, { useRatioThreshold: isEdit || !isApproved })
      setColumns(cols)
      // Edit: recompute calculated rows so live editing works.
      // View: show faithfully (same result — calculated rows are read-only either way).
      setRatios(isEdit ? computeCalculatedColumn(rws, ENTRY_COL) : rws)
    }

    load()
  }, [id, isEdit])

  // ── Cell change (edit mode only) ──────────────────────────────────────────
  // Mirrors FinancialDataForm.handleCellChange exactly:
  //  1. Write value into every occurrence of classId (shared across ratio sections).
  //  2. If the edited row is prorated, add classId to manualOverridesRef so
  //     recomputeAllProrated never resets it on future unrelated edits.
  //  3. Recompute calculated rows live.
  const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
    setRatios((prev) => {
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
      updated = recomputeAllProrated(updated, colIdx, colIdx + 1, manualOverridesRef.current)
      return computeCalculatedColumn(updated, colIdx)
    })
  }, [])

  // ── Save (edit mode) ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaveConfirm(false)

    const payload = {
      FK_QuarterID: header?.fK_QuarterID || 0,
      FK_CompanyID: header?.fK_CompanyID || 0,
      FK_ComplianceCriteriaID: criteriaId || 0,
      Values: buildValuesPayload(ratios, ENTRY_COL),
    }

    const res = await SaveFinancialDataApi(payload)
    if (!res.success) {
      showError(res.message || 'Failed to save financial data.')
      return
    }

    const rr = res.data?.responseResult
    const code = rr?.responseMessage
    if (rr?.isExecuted || SAVE_FINANCIAL_DATA_CODES[code] === null) {
      toast.success('Financial data saved successfully')
      navigate(BACK_PATH)
      return
    }
    showError(SAVE_FINANCIAL_DATA_CODES[code] || 'Something went wrong, please try again.')
  }, [header, criteriaId, ratios, navigate])

  // ── Close handler ─────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (isEdit) setCloseConfirm(true)
    else navigate(BACK_PATH)
  }, [isEdit, navigate])

  // ── Approve / Decline handler ─────────────────────────────────────────────
  const handleAction = useCallback(
    async (notes) => {
      const type = actionModal?.type
      const statusId = type === 'approve' ? STATUS_APPROVED : STATUS_DECLINED

      setIsActioning(true)
      const result = await UpdatePendingApprovalApi(
        {
          DataApprovalRequestIDs: [approvalRequestId],
          FK_DataApprovalRequestStatusID: statusId,
          Comments: notes || '',
        },
        { skipLoader: true }
      )
      setIsActioning(false)

      if (!result.success) {
        toast.error(result.message || `Failed to ${type} record.`)
        return
      }

      if (result.data?.responseResult?.isExecuted) {
        setActionModal(null)
        toast.success(
          type === 'approve' ? 'Request approved successfully.' : 'Request declined successfully.'
        )
        navigate(BACK_PATH)
        return
      }

      const code = result.data?.responseResult?.responseMessage
      toast.error(UPDATE_PENDING_APPROVAL_CODES?.[code] || 'Something went wrong.')
    },
    [actionModal, approvalRequestId, navigate]
  )

  // ── Can approve/decline: view mode + pending status + has approvalRequestId
  // !!approvalRequestId — coerce to boolean; raw 0 would render as "0" text in JSX
  const canAction = !isEdit && !!approvalRequestId && header?.status === 'Pending For Approval'

  // ── Header band ───────────────────────────────────────────────────────────
  const headerBand = (
    <div
      className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                 flex items-center justify-between gap-3"
    >
      <h1 className="text-[26px] font-[400] text-[#0B39B5]">
        {isEdit ? 'Edit Financial Data' : 'View Financial Data'}
      </h1>
      <BtnGold onClick={handleClose} className="flex items-center gap-2 shrink-0">
        <ArrowLeft size={15} /> Back to Listing
      </BtnGold>
    </div>
  )

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="font-sans">
        {headerBand}
        <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="font-sans">
        {headerBand}
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          {error}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {headerBand}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <FinancialDataTable
          // Single-option lists just to show the labels; both dropdowns are locked.
          quarters={[{ label: header?.quarterName || '', value: header?.fK_QuarterID || '' }]}
          companies={[{ label: header?.companyName || '', value: header?.fK_CompanyID || '' }]}
          selectedQuarter={isEdit ? (header?.fK_QuarterID || '') : (header?.quarterName || '')}
          selectedCompany={isEdit ? (header?.fK_CompanyID || '') : (header?.companyName || '')}
          onQuarterChange={() => {}}
          onCompanyChange={() => {}}
          defaultCriteria={header?.complianceCriteriaName || ''}
          readOnlyFields={!isEdit}
          disableQuarter={isEdit}
          disableCompany={isEdit}
          disableSearch
          searched={true}
          columns={columns.length ? columns : undefined}
          ratios={ratios}
          editableCol={isEdit ? ENTRY_COL : -1}
          onCellChange={isEdit ? handleCellChange : undefined}
          actions={
            <div className="flex items-center gap-2">
              <BtnGold onClick={handleClose}>Close</BtnGold>
              {isEdit && <BtnPrimary onClick={() => setSaveConfirm(true)}>Save</BtnPrimary>}
              {canAction && (
                <>
                  <BtnPrimary onClick={() => setActionModal({ type: 'approve' })}>Approve</BtnPrimary>
                  <button
                    onClick={() => setActionModal({ type: 'decline' })}
                    className="px-5 py-[10px] rounded-lg text-[13px] font-semibold transition-colors
                               bg-[#E74C3C] hover:bg-[#d04335] text-white"
                  >
                    Decline
                  </button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* ── Close confirmation (edit mode only) ── */}
      <ConfirmModal
        open={closeConfirm}
        message="All the changes will be lost. Are you sure you want to close?"
        onYes={() => {
          setCloseConfirm(false)
          navigate(BACK_PATH)
        }}
        onNo={() => setCloseConfirm(false)}
      />

      {/* ── Save confirmation ── */}
      <ConfirmModal
        open={saveConfirm}
        message="Are you sure you want to save the information?"
        onYes={handleSave}
        onNo={() => setSaveConfirm(false)}
      />

      {/* ── Approve / Decline modal ── */}
      {actionModal && (
        <RequestActionModal
          row={rowData || {
            company: header?.companyName || '',
            ticker: header?.ticker || '',
            quarter: header?.quarterName || '',
          }}
          type={actionModal.type}
          title={actionModal.type === 'approve' ? 'Approval' : 'Reject'}
          defaultNotes={actionModal.type === 'approve' ? 'Approved' : 'Declined'}
          onClose={() => !isActioning && setActionModal(null)}
          onSubmit={handleAction}
          isLoading={isActioning}
          infoFields={[
            { label: 'Company', key: 'company' },
            { label: 'Ticker', key: 'ticker' },
            { label: 'Quarter', key: 'quarter' },
          ]}
          approveReasons={approveReasons}
          declineReasons={declineReasons}
        />
      )}
    </div>
  )
}

export default ManagerViewFinancialDataPage
