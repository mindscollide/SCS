/**
 * pages/manager/ShariaNoticePage.jsx
 * =====================================
 * Sharia Notice report — shows companies that moved between compliant and
 * non-compliant status for the selected quarter, in two separate tables.
 *
 * UI layout (matches SRS screenshots):
 *  ▸ EFF3FF header band  — title
 *  ▸ Centered filter row — Quarters* (Select) + Generate Report (BtnPrimary) + Export (ExportBtn)
 *  ▸ Table 1             — teal header "FROM NON-COMPLIANT TO COMPLIANT"
 *                          Company Name | Ticker | Ratio Name | Threshold value
 *  ▸ Table 2             — navy header "FROM COMPLIANT TO NON-COMPLIANT"
 *                          Company Name | Ticker | Ratio Name | Threshold value
 *
 * All interactive elements from common/:
 *  Select      → common/select/Select.jsx
 *  BtnPrimary  → common/index.jsx
 *  ExportBtn   → common/index.jsx
 *  CommonTable → common/table/NormalTable.jsx
 *
 * TODO: replace mock data + handlers with:
 *   GET /api/manager/quarters              → quarter options
 *   GET /api/reports/sharia-notice?q=X    → { toCompliant[], toNonCompliant[] }
 */

import React, { useState, useCallback } from 'react'
import { BtnPrimary, ExportBtn } from '../../components/common/index.jsx'
import Select from '../../components/common/select/Select.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'

// ── Mock data ────────────────────────────────────────────────────────────────
const QUARTER_OPTIONS = [
  'December - 2025', 'September - 2025', 'June - 2025',
  'March - 2025',    'December - 2024',  'September - 2024',
]

const MOCK_TO_COMPLIANT = [
  { id: 1, company: 'Abbott Laboratories (Pakistan) Limited', ticker: 'ABOT', ratio: 'Interest bearing debts / total asset',   threshold: 'Less than 37%' },
  { id: 2, company: 'Adamjee Insurance Company Limited',      ticker: 'ACL',  ratio: 'Non-compliant income to total income',   threshold: 'Less than 5%'  },
]

const MOCK_TO_NON_COMPLIANT = [
  { id: 1, company: 'Attock Cement Limited',          ticker: 'ACPL',   ratio: 'Illiquid asset to total asset',             threshold: 'Less than 37%' },
  { id: 2, company: 'Air Link Communication Limited', ticker: 'AIRLINK',ratio: 'Non-compliant income to total income',      threshold: 'Less than 33%' },
  { id: 3, company: 'Attock Petroleum Limited',       ticker: 'ACPL',   ratio: 'Non-compliant investment to total investment',threshold: 'Less than 25%' },
  { id: 4, company: 'Clover Pakistan Limited',        ticker: 'CLOV',   ratio: 'Illiquid asset to total asset',             threshold: 'Greater than 25%'},
  { id: 5, company: 'JDW Sugar Mills Limited',        ticker: 'JDWS',   ratio: 'Interest bearing debts / total asset',      threshold: 'Less than 30%' },
]

// ── Table columns ─────────────────────────────────────────────────────────────
const TABLE_COLUMNS = [
  { key: 'company',   title: 'Company Name',    sortable: true },
  { key: 'ticker',    title: 'Ticker',          sortable: true },
  { key: 'ratio',     title: 'Ratio Name',      sortable: true },
  { key: 'threshold', title: 'Threshold value', sortable: true },
]

// ── Coloured section header bar ───────────────────────────────────────────────
const SectionHeader = ({ label, color }) => (
  <div className="rounded-t-xl px-4 py-3" style={{ backgroundColor: color }}>
    <span className="text-[13px] font-bold text-white tracking-wide">{label}</span>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

const ShariaNoticePage = () => {
  // ── Filters ───────────────────────────────────────────────────────────
  const [quarter,      setQuarter]      = useState('December - 2025')
  const [quarterError, setQuarterError] = useState('')

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated,  setReportGenerated]  = useState(false)
  const [toCompliant,      setToCompliant]      = useState([])
  const [toNonCompliant,   setToNonCompliant]   = useState([])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!quarter) { setQuarterError('Quarter is required'); return }
    setQuarterError('')
    setToCompliant(MOCK_TO_COMPLIANT)
    setToNonCompliant(MOCK_TO_NON_COMPLIANT)
    setReportGenerated(true)
  }, [quarter])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">

      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Sharia Notice</h1>
      </div>

      {/* Filter row — centered */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="flex flex-wrap items-end justify-center gap-4">
          <div className="w-[260px]">
            <Select
              label="Quarters"
              required
              placeholder="Select Quarter"
              options={QUARTER_OPTIONS}
              value={quarter}
              onChange={v => { setQuarter(v); setQuarterError(''); setReportGenerated(false) }}
              error={!!quarterError}
              errorMessage={quarterError}
            />
          </div>
          <div className="flex gap-2 mb-[1px]">
            <BtnPrimary onClick={handleGenerate}>Generate Report</BtnPrimary>
            <ExportBtn disabled={!reportGenerated} onExcel={() => {}} onPdf={() => {}} />
          </div>
        </div>
      </div>

      {/* Table 1 — Non-Compliant → Compliant (teal header) */}
      <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
        <SectionHeader label="FROM NON-COMPLIANT TO COMPLIANT" color="#01C9A4" />
        <CommonTable
          columns={TABLE_COLUMNS}
          data={toCompliant}
          emptyText="No Record Found"
          headerBg="#E0E6F6"
          rowBg="#ffffff"
        />
      </div>

      {/* Table 2 — Compliant → Non-Compliant (navy header) */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <SectionHeader label="FROM COMPLIANT TO NON-COMPLIANT" color="#0B39B5" />
        <CommonTable
          columns={TABLE_COLUMNS}
          data={toNonCompliant}
          emptyText="No Record Found"
          headerBg="#E0E6F6"
          rowBg="#ffffff"
        />
      </div>
    </div>
  )
}

export default ShariaNoticePage
