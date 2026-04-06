/**
 * src/pages/dataentry/AddFinancialDataPage.jsx
 * ==============================================
 * Add / Edit financial data page — thin wrapper around FinancialDataForm.
 *
 * Reads editRecord from FinancialDataContext:
 *  null   → Add mode (blank form)
 *  object → Edit mode (pre-filled from record)
 *
 * TODO: POST /api/data-entry/financial-data, PUT /api/data-entry/financial-data/:id
 */

import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_QUARTERS, MOCK_COMPANIES } from '../../components/common/table/FinancialDataTable.jsx'
import FinancialDataForm from '../../components/common/financialData/FinancialDataForm.jsx'
import { useFinancialData } from '../../context/FinancialDataContext.jsx'
import { toast } from 'react-toastify'

const BACK_PATH = '/scs/data-entry/financial-data'

// ── Derive a ticker from company name ─────────────────────────────────────────
const toTicker = (company) => company.split(' ')[0].slice(0, 6).toUpperCase()

// ─────────────────────────────────────────────────────────────────────────────

const AddFinancialDataPage = () => {
  const navigate = useNavigate()
  const { editRecord, addRecord, updateRecord, sendForApproval } = useFinancialData()

  const isEdit = editRecord !== null

  // ── Save Draft ────────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(
    ({ quarter, company, ratios }) => {
      if (isEdit) {
        updateRecord(editRecord.id, { quarter, company, ratios })
        toast.success('Draft saved successfully')
      } else {
        addRecord({
          quarter,
          company,
          ticker: toTicker(company),
          sector: 'General',
          ratios,
        })
        toast.success('Financial data saved as draft')
      }
      navigate(BACK_PATH)
    },
    [isEdit, editRecord, addRecord, updateRecord, navigate]
  )

  // ── Send for Approval ─────────────────────────────────────────────────────
  const handleSend = useCallback(
    ({ quarter, company, ratios }) => {
      if (isEdit) {
        updateRecord(editRecord.id, { quarter, company, ratios })
        sendForApproval(editRecord.id, 'Please verify')
      } else {
        const newId = Date.now()
        addRecord({
          id: newId,
          quarter,
          company,
          ticker: toTicker(company),
          sector: 'General',
          ratios,
        })
        setTimeout(() => sendForApproval(newId, 'Please verify'), 0)
      }
      toast.success('Sent for approval successfully')
      navigate(BACK_PATH)
    },
    [isEdit, editRecord, addRecord, updateRecord, sendForApproval, navigate]
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <FinancialDataForm
      title={isEdit ? 'Edit Financial Data' : 'Add Financial Data'}
      showBackBtn
      onBack={() => navigate(BACK_PATH)}
      mode={isEdit ? 'edit' : 'add'}
      record={editRecord}
      quarters={MOCK_QUARTERS}
      companies={MOCK_COMPANIES}
      onSaveDraft={handleSaveDraft}
      onSendForApproval={handleSend}
    />
  )
}

export default AddFinancialDataPage
