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
 *  - Quarters  : GetAllActiveQuartersApi  (Manager service, localStorage-cached, DD_KEYS.QUARTERS)
 *  - Companies : GetAllActiveCompanyNamesApi (Manager service, localStorage-cached, DD_KEYS.COMPANY_NAMES)
 *  - Default Compliance Criteria : read from localStorage (scs_compliance_criteria)
 *
 * API wired:
 *  - GetFinancialDataForEntryApi — called inside FinancialDataForm on Search click
 *
 * TODO: SaveFinancialData, SaveAndSubmitFinancialData
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useFinancialData } from '../../context/FinancialDataContext.jsx'
import FinancialDataForm from '../../components/common/financialData/FinancialDataForm.jsx'
import { GetAllActiveQuartersApi, GetAllActiveCompanyNamesApi } from '../../services/manager.service.js'
import { getDefaultCriteriaName } from '../../utils/defaultCriteria.js'

const BACK_PATH = '/data-entry/financial-data'

// ─────────────────────────────────────────────────────────────────────────────

const AddFinancialDataPage = () => {
  const navigate = useNavigate()
  const { editRecord, addRecord, updateRecord, sendForApproval } = useFinancialData()

  const isEdit = editRecord !== null

  // ── Dropdown options ──────────────────────────────────────────────────────
  const [quarters, setQuarters]   = useState([]) // { label: quarterName, value: pK_QuarterID }[]
  const [companies, setCompanies] = useState([]) // { label: companyName, value: pK_CompanyID }[]

  // StrictMode guard — fetch only once on mount
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const loadDropdowns = async () => {
      // Both APIs check localStorage (dd_* keys) first — no network call if cached.
      // Invalidated by MQTT: quarter_saved → DD_KEYS.QUARTERS, company_saved → DD_KEYS.COMPANY_NAMES.
      const [qRes, cRes] = await Promise.all([
        GetAllActiveQuartersApi({}, { skipLoader: true }),
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
      ])

      if (qRes.success) {
        setQuarters(
          (qRes.data?.responseResult?.quarters || []).map((q) => ({
            label: q.quarterName || '',
            value: q.pK_QuarterID,
          }))
        )
      }

      if (cRes.success) {
        setCompanies(
          (cRes.data?.responseResult?.companies || []).map((c) => ({
            label: c.companyName || '',
            value: c.pK_CompanyID,
          }))
        )
      }
    }

    loadDropdowns()
  }, [])

  // ── Save Draft (mock — API TODO) ──────────────────────────────────────────
  const handleSaveDraft = useCallback(
    ({ quarter, company, ratios }) => {
      if (isEdit) {
        updateRecord(editRecord.id, { quarter, company, ratios })
        toast.success('Draft saved successfully')
      } else {
        addRecord({ quarter, company, ratios })
        toast.success('Financial data saved as draft')
      }
      navigate(BACK_PATH)
    },
    [isEdit, editRecord, addRecord, updateRecord, navigate]
  )

  // ── Send for Approval (mock — API TODO) ──────────────────────────────────
  const handleSend = useCallback(
    ({ quarter, company, ratios }) => {
      if (isEdit) {
        updateRecord(editRecord.id, { quarter, company, ratios })
        sendForApproval(editRecord.id, 'Please verify')
      } else {
        const newId = Date.now()
        addRecord({ id: newId, quarter, company, ratios })
        setTimeout(() => sendForApproval(newId, 'Please verify'), 0)
      }
      toast.success('Sent for approval successfully')
      navigate(BACK_PATH)
    },
    [isEdit, editRecord, addRecord, updateRecord, sendForApproval, navigate]
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <FinancialDataForm
        title={isEdit ? 'Edit Financial Data' : 'Add Financial Data'}
        showBackBtn
        onBack={() => navigate(BACK_PATH)}
        mode={isEdit ? 'edit' : 'add'}
        record={editRecord}
        quarters={quarters}
        companies={companies}
        defaultCriteria={getDefaultCriteriaName()}
        onSaveDraft={handleSaveDraft}
        onSendForApproval={handleSend}
      />
      <div className="mt-auto pt-2 text-slate font-semibold text-xs flex">
        © Copyright {new Date().getFullYear()}. All Rights Reserved.
      </div>
    </>
  )
}

export default AddFinancialDataPage
