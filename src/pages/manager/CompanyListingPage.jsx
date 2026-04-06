/**
 * CompanyListingPage.jsx
 * =======================
 * Company Listing report — filterable list of all listed companies.
 *
 * UI layout:
 *  ▸ #EFF3FF header band — title only
 *  ▸ #EFF3FF filter card — 3-column grid of filters (6 fields):
 *      Annual Reporting (MultiSelect) | Market (MultiSelect) | Sector (MultiSelect)
 *      Reporting Frequency (Select)   | Status (Select)      | Exception (Checkbox)
 *  ▸ Generate Report (BtnPrimary, centered) below filter grid
 *  ▸ Action row — Export (ExportBtn, enabled after generate)
 *  ▸ CommonTable — Company Name | Ticker | Sector | Nature of Business | Market | Frequency | Status
 *
 * All interactive elements from common/:
 *  MultiSelect  → common/multiSelect/MultiSelect.jsx
 *  Select       → common/select/Select.jsx
 *  Checkbox     → common/Checkbox/Checkbox.jsx
 *  BtnPrimary   → common/index.jsx
 *  ExportBtn    → common/index.jsx
 *  StatusText   → common/index.jsx
 *  CommonTable  → common/table/NormalTable.jsx
 */

import React, { useState, useMemo, useCallback } from 'react'
import {
  BtnPrimary,
  ExportBtn,
  StatusText,
  MultiSelect,
  Checkbox,
} from '../../components/common/index.jsx'
import Select from '../../components/common/select/Select.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  COMPANIES,
  SECTORS as SECTORS_RAW,
  ANNUAL_REPORTING_OPTIONS,
  MARKET_OPTIONS,
  REPORTING_FREQUENCY_OPTIONS as FREQUENCY_OPTIONS,
  COMPANY_STATUS_OPTIONS as STATUS_OPTIONS,
} from '../../data/mockData.js'

// ── Derived options ───────────────────────────────────────────────────────────
const SECTOR_OPTIONS = SECTORS_RAW.map((s) => ({ label: s.name, value: s.name }))

// Flatten COMPANIES into the shape the table expects
const MOCK_COMPANIES = COMPANIES.map((c) => ({
  id: c.id,
  company: c.name,
  ticker: c.ticker,
  sector: c.sector,
  nature: c.nature,
  market: c.market,
  frequency: c.frequency,
  status: c.status,
  exception: c.exception,
  annualReporting: c.annualReporting,
}))

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * d)
}

// ─────────────────────────────────────────────────────────────────────────────

const CompanyListingPage = () => {
  // ── Filters ───────────────────────────────────────────────────────────
  const [selAnnual, setSelAnnual] = useState([])
  const [selMarkets, setSelMarkets] = useState([])
  const [selSectors, setSelSectors] = useState([])
  const [selFrequency, setSelFrequency] = useState('')
  const [selStatus, setSelStatus] = useState('')
  const [exception, setException] = useState(false)

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results, setResults] = useState([])
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // ── Derived ───────────────────────────────────────────────────────────
  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    let filtered = [...MOCK_COMPANIES]

    if (selAnnual.length) filtered = filtered.filter((r) => selAnnual.includes(r.annualReporting))
    if (selMarkets.length) filtered = filtered.filter((r) => selMarkets.includes(r.market))
    if (selSectors.length) filtered = filtered.filter((r) => selSectors.includes(r.sector))
    if (selFrequency) filtered = filtered.filter((r) => r.frequency === selFrequency)
    if (selStatus) filtered = filtered.filter((r) => r.status === selStatus)
    if (exception) filtered = filtered.filter((r) => r.exception)

    setResults(filtered)
    setReportGenerated(true)
  }, [selAnnual, selMarkets, selSectors, selFrequency, selStatus, exception])

  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  // ── Table columns ─────────────────────────────────────────────────────
  const columns = [
    { key: 'company', title: 'Company Name', sortable: true },
    { key: 'ticker', title: 'Ticker', sortable: true },
    { key: 'sector', title: 'Sector Name', sortable: true },
    { key: 'nature', title: 'Nature of Business', sortable: true },
    { key: 'market', title: 'Market Names', sortable: true },
    { key: 'frequency', title: 'Reporting Frequency', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => <StatusText status={row.status} />,
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Company Listing</h1>
      </div>

      {/* Filter card */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        {/* Row 1 — 3 MultiSelects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <MultiSelect
            label="Annual Reporting"
            options={ANNUAL_REPORTING_OPTIONS}
            selected={selAnnual}
            onChange={setSelAnnual}
          />
          <MultiSelect
            label="Market"
            options={MARKET_OPTIONS}
            selected={selMarkets}
            onChange={setSelMarkets}
          />
          <MultiSelect
            label="Sector"
            options={SECTOR_OPTIONS}
            selected={selSectors}
            onChange={setSelSectors}
          />
        </div>

        {/* Row 2 — 2 Selects + Checkbox */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Select
            label="Reporting Frequency"
            value={selFrequency}
            onChange={setSelFrequency}
            options={FREQUENCY_OPTIONS}
          />
          <Select
            label="Status"
            value={selStatus}
            onChange={setSelStatus}
            options={STATUS_OPTIONS}
          />
          <div className="flex items-end pb-[10px]">
            <Checkbox
              label="Exception by Shariah Advisor"
              checked={exception}
              onChange={(e) => setException(e.target.checked)}
            />
          </div>
        </div>

        {/* Generate Report — centered */}
        <div className="flex justify-center mt-4">
          <BtnPrimary onClick={handleGenerate}>Generate Report</BtnPrimary>
        </div>
      </div>

      {/* Action row — Export */}
      <div className="flex justify-end gap-2 mb-2">
        <ExportBtn disabled={!reportGenerated} onExcel={() => {}} onPdf={() => {}} />
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

export default CompanyListingPage
