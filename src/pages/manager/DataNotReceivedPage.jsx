/**
 * pages/manager/DataNotReceivedPage.jsx
 * ========================================
 * Data Not Received report — shows companies that have not submitted financial
 * data for the selected quarter.
 *
 * UI layout (matches SRS screenshots):
 *  ▸ EFF3FF header band  — title
 *  ▸ Centered filter row — Quarter Name* (Select) + Generate Report (BtnPrimary) + Export (ExportBtn)
 *  ▸ CommonTable         — Ticker (sort) | Company Name (sort)
 *
 * All interactive elements from common/:
 *  Select      → common/select/Select.jsx
 *  BtnPrimary  → common/index.jsx
 *  ExportBtn   → common/index.jsx
 *  CommonTable → common/table/NormalTable.jsx
 *
 * TODO: replace mock data + handlers with:
 *   GET /api/manager/quarters               → quarter options
 *   GET /api/reports/data-not-received?quarter=X → results
 */

import React, { useState, useMemo, useCallback } from 'react'
import { BtnPrimary, ExportBtn } from '../../components/common/index.jsx'
import Select from '../../components/common/select/Select.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  REPORT_QUARTER_STRINGS as QUARTER_OPTIONS,
  MOCK_DATA_NOT_RECEIVED as MOCK_RESULTS,
} from '../../data/mockData.js'

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (a[col] || '').localeCompare(b[col] || '') * d)
}

// ─────────────────────────────────────────────────────────────────────────────

const DataNotReceivedPage = () => {
  // ── Filters ───────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState('September - 2025')
  const [quarterError, setQuarterError] = useState('')

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results, setResults] = useState([])
  const [sortCol, setSortCol] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  // ── Derived ───────────────────────────────────────────────────────────
  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!quarter) {
      setQuarterError('Quarter is required')
      return
    }
    setQuarterError('')
    setResults(MOCK_RESULTS)
    setReportGenerated(true)
  }, [quarter])

  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  // ── Table columns ─────────────────────────────────────────────────────
  const columns = [
    { key: 'ticker', title: 'Ticker', sortable: true },
    { key: 'company', title: 'Company Name', sortable: true },
  ]

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Data Not Received</h1>
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

      {/* Results table */}
      <CommonTable
        columns={columns}
        data={displayed}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        emptyText="No Record Found"
        headerBg="#E0E6F6"
        rowBg="#ffffff"
      />
    </div>
  )
}

export default DataNotReceivedPage
