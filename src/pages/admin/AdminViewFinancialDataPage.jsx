/**
 * src/pages/admin/AdminViewFinancialDataPage.jsx
 * ================================================
 * Read-only view of an Approved financial-data record opened from the
 * Re-open Financial Data list (CR 7, 2026-10-08).
 *
 * Entry point: Admin clicks a company name in ReopenFinancialDataPage
 *   → /admin/reopen-financial-data/view/:id
 *
 * APIs:
 *  - GetFinancialDataByIDApi (DataEntry service) — the backend now accepts the
 *    Admin role; the same endpoint the Data Entry / Manager view pages use.
 *
 * Design rules (spec §8a):
 *  - View only — no Back To Listing button, no Send For Approval, no Edit / Save.
 *  - Close → back to /admin/reopen-financial-data (preserves list state in history).
 *  - Approved records: useRatioThreshold:false → quarterlyThresholds on every column.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { BtnGold } from '../../components/common/index.jsx'
import FinancialDataTable from '../../components/common/table/FinancialDataTable.jsx'
import {
  GetFinancialDataByIDApi,
  GET_FINANCIAL_DATA_BY_ID_CODES,
} from '../../services/dataentry.service.js'
import { mapEntryDataToTable } from '../../utils/financialFormula.js'

const BACK_PATH = '/admin/reopen-financial-data'

// ─────────────────────────────────────────────────────────────────────────────

const AdminViewFinancialDataPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [header,  setHeader]  = useState(null)
  const [columns, setColumns] = useState([])
  const [ratios,  setRatios]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Load record by PK (StrictMode-safe single-fire) ──────────────────────
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
        toast.error(GET_FINANCIAL_DATA_BY_ID_CODES[code] || 'Record not found.', {
          style: { backgroundColor: '#E74C3C', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        })
        setError(GET_FINANCIAL_DATA_BY_ID_CODES[code] || 'Record not found.')
        return
      }

      const hdr = result.header || {}
      setHeader(hdr)
      const isApproved = hdr.status === 'Approved'
      const { columns: cols, ratios: rws } = mapEntryDataToTable(result, {
        useRatioThreshold: !isApproved,
      })
      setColumns(cols)
      setRatios(rws) // faithful — no recompute, no proration
    }
    load()
  }, [id])

  // ── Header band — no Back To Listing button (spec §8a) ───────────────────
  const headerBand = (
    <div
      className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                 flex items-center justify-between gap-3"
    >
      <h1 className="text-[26px] font-[400] text-[#0B39B5]">View Financial Data</h1>
    </div>
  )

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

  return (
    <div className="font-sans">
      {headerBand}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <FinancialDataTable
          quarters={[header?.quarterName || '']}
          companies={[header?.companyName || '']}
          selectedQuarter={header?.quarterName || ''}
          selectedCompany={header?.companyName || ''}
          onQuarterChange={() => {}}
          onCompanyChange={() => {}}
          defaultCriteria={header?.complianceCriteriaName || ''}
          criteriaLabel="Compliance Criteria"
          criteriaRequired={false}
          fieldsRequired={false}
          readOnlyFields
          disableSearch
          searched={true}
          columns={columns.length ? columns : undefined}
          ratios={ratios}
          editableCol={-1}
          actions={
            // Only Close — Admin has no Submit / Edit / Save rights on this record.
            <BtnGold onClick={() => navigate(BACK_PATH)}>Close</BtnGold>
          }
        />
      </div>
    </div>
  )
}

export default AdminViewFinancialDataPage
