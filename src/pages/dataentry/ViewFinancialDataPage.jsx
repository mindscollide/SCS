/**
 * src/pages/dataentry/ViewFinancialDataPage.jsx
 * ===============================================
 * Read-only view of a saved financial-data record (Company Name link in the list).
 *
 * Data:
 *  - GetFinancialDataByIDApi(:id) on mount → header + ratios + 4-quarter values.
 *  - Mapped via mapEntryDataToTable (shared with the Add/Edit form).
 *  - Shown FAITHFULLY: no formula recompute, no prorated re-seed — every column is
 *    the saved value, all read-only (editableCol = -1).
 *
 * Buttons: Close → back to list | Send For Approval (only when status = In Progress).
 *  Send For Approval → SendForApprovalModal (notes) → SubmitFinancialDataForApproval
 *  (submits the already-saved draft by PK; no value edits; status → Pending).
 */

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import { BtnGold, BtnTeal } from '../../components/common/index.jsx'
import FinancialDataTable from '../../components/common/table/FinancialDataTable.jsx'
import { SendForApprovalModal } from '../../components/common/modals/Modals.jsx'
import {
  GetFinancialDataByIDApi,
  GET_FINANCIAL_DATA_BY_ID_CODES,
  SubmitFinancialDataForApprovalApi,
  SUBMIT_FINANCIAL_DATA_FOR_APPROVAL_CODES,
} from '../../services/dataentry.service.js'
import { mapEntryDataToTable } from '../../utils/financialFormula.js'

const BACK_PATH = '/data-entry/financial-data'

const showError = (msg) =>
  toast.error(msg, {
    style:         { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

const ViewFinancialDataPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [header,  setHeader]  = useState(null)   // { companyName, quarterName, complianceCriteriaName, status, fK_*... }
  const [columns, setColumns] = useState([])     // { id, label }[]
  const [ratios,  setRatios]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [sendModal, setSendModal] = useState(false)

  // ── Load the record by PK (StrictMode-safe single-fire) ───────────────────
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      setLoading(true)
      setError(null)
      const res = await GetFinancialDataByIDApi({ PK_FinancialDataID: Number(id) || 0 }, { skipLoader: true })
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

      const hdr = result.header || {}
      setHeader(hdr)
      const isApproved = hdr.status === 'Approved'
      const { columns: cols, ratios: rws } = mapEntryDataToTable(result, { useRatioThreshold: !isApproved })
      setColumns(cols)
      setRatios(rws) // faithful — no recompute / no proration
    }
    load()
  }, [id])

  const headerBand = (
    <div className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                    flex items-center justify-between gap-3">
      <h1 className="text-[26px] font-[400] text-[#0B39B5]">View Financial Data</h1>
      <BtnGold onClick={() => navigate(BACK_PATH)} className="flex items-center gap-2 shrink-0">
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

  const canSendForApproval = header?.status === 'In Progress'

  // ── Send For Approval → SubmitFinancialDataForApproval (submit existing draft) ──
  // The record is already saved; submit by PK only — no value edits.
  const handleProceed = async (notes) => {
    setSendModal(false)
    const res = await SubmitFinancialDataForApprovalApi({
      PK_FinancialDataID: Number(id) || 0,
      Notes: notes || '',
    })
    const rr = res.data?.responseResult
    const code = rr?.responseMessage
    // _06 = success (null in the codes map); isExecuted is the reliable signal.
    if (res.success && (rr?.isExecuted || SUBMIT_FINANCIAL_DATA_FOR_APPROVAL_CODES[code] === null)) {
      toast.success('Submitted for approval successfully')
      navigate(BACK_PATH)
      return
    }
    showError(SUBMIT_FINANCIAL_DATA_FOR_APPROVAL_CODES[code] || res.message || 'Failed to submit for approval.')
  }

  return (
    <div className="font-sans">
      {headerBand}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <FinancialDataTable
          // Dropdowns are disabled here — single-option lists just to show the labels.
          quarters={[header?.quarterName || '']}
          companies={[header?.companyName || '']}
          selectedQuarter={header?.quarterName || ''}
          selectedCompany={header?.companyName || ''}
          onQuarterChange={() => {}}
          onCompanyChange={() => {}}
          defaultCriteria={header?.complianceCriteriaName || ''}
          disableQuarter
          disableCompany
          disableSearch
          searched={true}
          columns={columns.length ? columns : undefined}
          ratios={ratios}
          editableCol={-1}
          actions={
            <>
              <BtnGold onClick={() => navigate(BACK_PATH)}>Close</BtnGold>
              {canSendForApproval && (
                <BtnTeal onClick={() => setSendModal(true)}>Send For Approval</BtnTeal>
              )}
            </>
          }
        />
      </div>

      {/* ── Send For Approval modal ── */}
      <SendForApprovalModal
        open={sendModal}
        onClose={() => setSendModal(false)}
        onProceed={handleProceed}
      />
    </div>
  )
}

export default ViewFinancialDataPage
