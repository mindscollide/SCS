/**
 * src/pages/manager/ManagerViewFinancialDataPage.jsx
 * ====================================================
 * Manager's view AND edit page for a saved financial-data record.
 *
 * Reached from PendingApprovalsPage:
 *  - Company name click → mode = 'view'  → /manager/financial-data/view/:id
 *  - Edit icon click    → mode = 'edit'  → /manager/financial-data/edit/:id
 *
 * APIs:
 *  - GetFinancialDataByIDApi  — load record on mount (same as ViewFinancialDataPage)
 *  - SaveFinancialDataApi     — save edits (same upsert as AddFinancialDataPage)
 *
 * Differences from DataEntry view/edit:
 *  - No "Send For Approval" button (manager role).
 *  - Back navigates to /manager/pending-approvals.
 *  - Edit mode uses GetFinancialDataByIDApi + SaveFinancialDataApi (no add flow).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import { BtnGold, BtnPrimary } from '../../components/common/index.jsx'
import FinancialDataTable from '../../components/common/table/FinancialDataTable.jsx'
import { ConfirmModal } from '../../components/common/index.jsx'
import {
  GetFinancialDataByIDApi,
  GET_FINANCIAL_DATA_BY_ID_CODES,
  SaveFinancialDataApi,
  SAVE_FINANCIAL_DATA_CODES,
} from '../../services/dataentry.service.js'
import {
  mapEntryDataToTable,
  computeCalculatedColumn,
  buildValuesPayload,
} from '../../utils/financialFormula.js'

// const BACK_PATH = '/manager/pending-approvals'
const ENTRY_COL = 0

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

      const { columns: cols, ratios: rws } = mapEntryDataToTable(result)
      setColumns(cols)
      // Edit: recompute calculated rows so live editing works.
      // View: show faithfully (same result — calculated rows are read-only either way).
      setRatios(isEdit ? computeCalculatedColumn(rws, ENTRY_COL) : rws)
    }

    load()
  }, [id, isEdit])

  // ── Cell change (edit mode only) ──────────────────────────────────────────
  // Mirror of AddFinancialDataPage / FinancialDataForm handleCellChange:
  // sync all occurrences of the same classId, then recompute calculated rows.
  const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
    setRatios((prev) => {
      const updated = prev.map((r) => ({
        ...r,
        classifications: r.classifications.map((cls) => {
          if (Number(cls.id) !== Number(classId)) return cls
          const newValues = [...cls.values]
          newValues[colIdx] = val
          return { ...cls, values: newValues }
        }),
      }))
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
          selectedQuarter={header?.fK_QuarterID || ''}
          selectedCompany={header?.fK_CompanyID || ''}
          onQuarterChange={() => {}}
          onCompanyChange={() => {}}
          defaultCriteria={header?.complianceCriteriaName || ''}
          disableQuarter
          disableCompany
          disableSearch
          searched={true}
          columns={columns.length ? columns : undefined}
          ratios={ratios}
          editableCol={isEdit ? ENTRY_COL : -1}
          onCellChange={isEdit ? handleCellChange : undefined}
          actions={
            <>
              <BtnGold onClick={handleClose}>Close</BtnGold>
              {isEdit && <BtnPrimary onClick={() => setSaveConfirm(true)}>Save</BtnPrimary>}
            </>
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
    </div>
  )
}

export default ManagerViewFinancialDataPage
