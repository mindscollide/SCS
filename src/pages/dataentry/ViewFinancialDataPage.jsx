/**
 * src/pages/dataentry/ViewFinancialDataPage.jsx
 * ===============================================
 * Read-only view of an already-entered financial data record.
 * Accessed by clicking Company Name in the Financial Data List.
 *
 * SRS:
 *  - All fields read-only (no Search button)
 *  - Table shows all 4 quarters read-only, immediately on load
 *  - Buttons: Close → back to list | Send For Approval (only if In Progress)
 */

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BtnGold, BtnTeal, BtnPrimary } from '../../components/common/index.jsx'
import FinancialDataTable, {
  MOCK_QUARTERS,
} from '../../components/common/table/FinancialDataTable.jsx'
import { SendForApprovalModal } from '../../components/common/modals/Modals.jsx'
import { useFinancialData } from '../../context/FinancialDataContext.jsx'
import { toast } from 'react-toastify'

const BACK_PATH = '/data-entry/financial-data'

const ViewFinancialDataPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { records, sendForApproval } = useFinancialData()

  const record = records.find((r) => String(r.id) === String(id))

  const [sendModal, setSendModal] = useState(false)

  if (!record) {
    return (
      <div className="font-sans">
        <div
          className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                        flex items-center justify-between"
        >
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">View Financial Data</h1>
          <BtnGold onClick={() => navigate(BACK_PATH)} className="flex items-center gap-2">
            <ArrowLeft size={15} /> Back to Listing
          </BtnGold>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          Record not found.
        </div>
      </div>
    )
  }

  const canSendForApproval = record.status === 'In Progress'

  const handleProceed = (notes) => {
    sendForApproval(record.id, notes)
    toast.success('Sent for approval successfully')
    setSendModal(false)
    navigate(BACK_PATH)
  }

  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                      flex items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">View Financial Data</h1>
        <button
          onClick={() => navigate(BACK_PATH)}
          className="flex items-center gap-2 px-4 py-[9px] bg-[#F5A623] hover:bg-[#e09a1a]
                     text-white rounded-lg text-[13px] font-semibold transition-colors shrink-0"
        >
          <ArrowLeft size={15} /> Back to Listing
        </button>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <FinancialDataTable
          quarters={MOCK_QUARTERS}
          companies={[record.company]}
          selectedQuarter={record.quarter}
          onQuarterChange={() => {}}
          selectedCompany={record.company}
          onCompanyChange={() => {}}
          defaultCriteria="Hilal Compliance Criteria"
          disableQuarter
          disableCompany
          disableSearch
          searched={true}
          ratios={record.ratios}
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
