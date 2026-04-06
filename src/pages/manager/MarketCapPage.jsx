/**
 * src/pages/manager/MarketCapPage.jsx
 * =====================================
 * Market Capitalisation report — shows numeric market-cap values per quarter.
 *
 * UI layout:
 *  ▸ #EFF3FF header band — title only
 *  ▸ #EFF3FF filter card — Companies (MultiSelect) + Quarters (MultiSelect) + Generate Report (BtnPrimary)
 *  ▸ Action row          — Export (ExportBtn, enabled after generate)
 *  ▸ CommonTable         — Company Name | Ticker | [Quarter col…] (numeric values)
 *
 * All interactive elements from common/:
 *  MultiSelect  → common/multiSelect/MultiSelect.jsx
 *  BtnPrimary   → common/index.jsx
 *  ExportBtn    → common/index.jsx
 *  CommonTable  → common/table/NormalTable.jsx
 */

import React, { useState, useMemo, useCallback } from 'react'
import { BtnPrimary, ExportBtn, MultiSelect } from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  REPORT_QUARTER_OPTIONS as QUARTER_OPTIONS,
  COMPANIES,
  MOCK_MARKET_CAP,
} from '../../data/mockData.js'

// ── Derived options ───────────────────────────────────────────────────────────
const COMPANY_OPTIONS = COMPANIES.filter((c) => MOCK_MARKET_CAP[c.name]) // only companies that have cap data
  .map((c) => ({ label: c.name, value: c.name, ticker: c.ticker }))

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[col]
    const bv = b[col]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * d
    return String(av ?? '').localeCompare(String(bv ?? '')) * d
  })
}

// ─────────────────────────────────────────────────────────────────────────────

const MarketCapPage = () => {
  // ── Filters ───────────────────────────────────────────────────────────
  const [selCompanies, setSelCompanies] = useState(COMPANY_OPTIONS.map((c) => c.value))
  const [selQuarters, setSelQuarters] = useState(['June - 2024', 'March - 2024'])

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results, setResults] = useState([])
  const [activeQuarters, setActiveQuarters] = useState([])
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // ── Derived ───────────────────────────────────────────────────────────
  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    const quarters = QUARTER_OPTIONS.map((q) => q.value).filter((q) => selQuarters.includes(q))

    const rows = selCompanies.map((company, idx) => {
      const co = COMPANY_OPTIONS.find((c) => c.value === company)
      const row = { id: idx + 1, company, ticker: co?.ticker ?? '' }
      quarters.forEach((q) => {
        row[q] = MOCK_MARKET_CAP[company]?.[q] ?? '-'
      })
      return row
    })

    setActiveQuarters(quarters)
    setResults(rows)
    setReportGenerated(true)
  }, [selCompanies, selQuarters])

  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  // ── Table columns (dynamic) ───────────────────────────────────────────
  const columns = useMemo(
    () => [
      { key: 'company', title: 'Company Name', sortable: true },
      { key: 'ticker', title: 'Ticker', sortable: true },
      ...activeQuarters.map((q) => ({
        key: q,
        title: q,
        sortable: true,
        render: (row) => (
          <span className="font-medium text-[#041E66]">{row[q] === '-' ? '-' : `${row[q]}B`}</span>
        ),
      })),
    ],
    [activeQuarters]
  )

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Market Capitalization</h1>
      </div>

      {/* Filter card — Generate Report is inline with filters */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <MultiSelect
            label="Companies"
            required
            options={COMPANY_OPTIONS}
            selected={selCompanies}
            onChange={setSelCompanies}
          />
          <MultiSelect
            label="Quarters"
            required
            options={QUARTER_OPTIONS}
            selected={selQuarters}
            onChange={setSelQuarters}
          />
          <BtnPrimary
            onClick={handleGenerate}
            disabled={selCompanies.length === 0 || selQuarters.length === 0}
          >
            Generate Report
          </BtnPrimary>
        </div>
      </div>

      {/* Action row — Export (enabled after generate) */}
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

export default MarketCapPage
