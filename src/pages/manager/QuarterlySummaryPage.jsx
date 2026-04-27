/**
 * pages/manager/QuarterlySummaryPage.jsx
 * =========================================
 * Quarterly Summary report — shows compliant / non-compliant / suspended /
 * total company counts grouped by quarter.
 *
 * UI layout (matches SRS screenshots):
 *  ▸ EFF3FF header band  — title
 *  ▸ Centered filter row — Quarter Name* (Select) + Generate Report (BtnPrimary) + Export (ExportBtn)
 *  ▸ Per-quarter sections — green teal header bar + 4-column summary table
 *
 * All interactive elements from common/:
 *  Select      → common/select/Select.jsx
 *  BtnPrimary  → common/index.jsx
 *  ExportBtn   → common/index.jsx
 *  CommonTable → common/table/NormalTable.jsx
 *
 * TODO: replace mock data + handlers with:
 *   GET /api/manager/quarters                → quarter options
 *   GET /api/reports/quarterly-summary?q=X  → section data
 */

import React, { useState, useCallback, useMemo } from 'react'
import { BtnPrimary, ExportBtn } from '../../components/common/index.jsx'
import Select from '../../components/common/select/Select.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  REPORT_QUARTER_STRINGS as QUARTER_OPTIONS,
  MOCK_QUARTERLY_SUMMARY as MOCK_SUMMARY,
} from '../../data/mockData.js'

// ── Summary section columns ───────────────────────────────────────────────────
const SUMMARY_COLUMNS = [
  {
    key: 'compliant',
    title: "Shariah Compliant Co's",
    sortable: true,
    render: (r) => <span className="text-[#041E66] font-semibold">{r.compliant}</span>,
  },
  {
    key: 'nonCompliant',
    title: "Shariah Non-Compliant Co's",
    sortable: true,
    render: (r) => <span className="text-[#041E66] font-semibold">{r.nonCompliant}</span>,
  },
  {
    key: 'suspended',
    title: "Suspended Co's",
    sortable: true,
    render: (r) => <span className="text-[#041E66] font-semibold">{r.suspended}</span>,
  },
  {
    key: 'total',
    title: "Total Co's",
    sortable: true,
    render: (r) => <span className="text-[#041E66] font-semibold">{r.total}</span>,
  },
]

// ── Section header — coloured bar above each quarter table ────────────────────
const SectionHeader = ({ label, bgColor }) => (
  <div className={`${bgColor} text-white px-3 py-2 font-semibold text-center`}>
    <span className="text-[13px] font-bold text-white tracking-wide">{label}</span>
  </div>
)
// Table getHeaderColor ─────────────────────────────────────────────────────────────────────────────
const getHeaderColor = (idx) => (idx % 2 === 0 ? 'bg-[#5ec97c]' : 'bg-[#50a5cc]')

const QuarterlySummaryPage = () => {
  // ── Sort state ─────────────────────────────────────────
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // ── Filters ───────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState('September - 2025')
  const [quarterError, setQuarterError] = useState('')

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [sections, setSections] = useState([])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!quarter) {
      setQuarterError('Quarter is required')
      return
    }
    setQuarterError('')
    setSections(
      MOCK_SUMMARY[quarter] || [
        {
          quarter: quarter.toUpperCase().replace(' - ', ' '),
          compliant: 0,
          nonCompliant: 0,
          suspended: 0,
          total: 0,
        },
      ]
    )
    setReportGenerated(true)
  }, [quarter])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Quarterly Summary</h1>
      </div>

      {/* Filter row — centered */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="flex flex-wrap items-start justify-center gap-4">
          <div className="w-[260px]">
            <Select
              label="Quarter Name"
              required
              placeholder="Select Quarter"
              options={QUARTER_OPTIONS}
              value={quarter}
              onChange={(v) => {
                setQuarter(v)
                setQuarterError('')
                setReportGenerated(false)
              }}
              error={!!quarterError}
              errorMessage={quarterError}
            />
          </div>
          {/* Phantom spacer matches Select label height so buttons align with trigger */}
          <div>
            <div className="h-[18px] mb-1.5" />
            <div className="flex gap-2">
              <BtnPrimary onClick={handleGenerate}>Generate Report</BtnPrimary>
              <ExportBtn disabled={!reportGenerated} onExcel={() => {}} onPdf={() => {}} />
            </div>
          </div>
        </div>
      </div>

      {/* Quarter sections */}
      {sections.map((sec, idx) => (
        <div key={idx} className="mb-3 overflow-hidden border border-slate-200">
          <SectionHeader bgColor={getHeaderColor(idx)} label={sec.quarter} />
          <CommonTable
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            columns={SUMMARY_COLUMNS}
            data={sec.compliant === 0 && sec.total === 0 ? [] : [{ id: idx, ...sec }]}
            emptyText="No Record Found"
            headerBg="#E0E6F6"
            rowBg="#ffffff"
          />
        </div>
      ))}

      {!reportGenerated && sections.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center text-[#a0aec0] text-[13px]">
          Select a quarter and click Generate Report
        </div>
      )}
    </div>
  )
}

export default QuarterlySummaryPage
