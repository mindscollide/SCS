/**
 * pages/manager/ComplianceStandingPage.jsx
 * ==========================================
 * Compliance Standing report — Manager & Data Entry shared page.
 *
 * UI layout (matches SRS screenshots):
 *  ▸ EFF3FF header band — title only
 *  ▸ EFF3FF filter card — Companies (MultiSelect) + Compliance Criteria (MultiSelect) + Search (BtnGold)
 *  ▸ RatiosPanel        — Financial Ratio Name | editable Threshold value
 *  ▸ Action row         — Generate Report (BtnPrimary) + Export (ExportBtn)
 *  ▸ CommonTable        — Company Name | Quarter Name | Status
 *
 * All interactive elements from common/:
 *  MultiSelect  → common/select/MultiSelect.jsx
 *  RatiosPanel  → common/report/RatiosPanel.jsx
 *  CommonTable  → common/table/NormalTable.jsx
 *  BtnGold      → common/index.jsx
 *  BtnPrimary   → common/index.jsx
 *  ExportBtn    → common/index.jsx
 *  StatusText   → common/index.jsx
 *
 * TODO: replace mock data + handlers with API calls:
 *   GET /api/manager/companies
 *   GET /api/manager/compliance-criteria
 *   POST /api/reports/compliance-standing  → results
 */

import React, { useState, useMemo, useCallback } from 'react'
import { BtnGold, BtnPrimary, ExportBtn, StatusText, MultiSelect } from '../../components/common/index.jsx'
import RatiosPanel from '../../components/common/report/RatiosPanel.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'

// ── Mock data ────────────────────────────────────────────────────────────────
const ALL_COMPANIES = [
  'Abbott Laboratories (Pakistan) Limited',
  'Adamjee Insurance Company Limited',
  'Attock Cement (Pakistan) Limited',
  'Cravegas PK Limited',
  'Indus Motor Company Limited',
]

const ALL_CRITERIA = [
  'Hilal Compliance Criteria',
  'Bilal Compliance Criteria',
  'ABC Compliance Criteria',
]

const CRITERIA_RATIOS = {
  'Hilal Compliance Criteria': [
    { name: 'Debt to Assets',                                    threshold: 37 },
    { name: 'Non Compliant Investment to Total Investment',       threshold: 33 },
    { name: 'Non Compliant Income to Total Income',               threshold: 30 },
    { name: 'Liquid Assets to Total Assets',                      threshold: 41 },
    { name: 'Net Liquid Assets per Share',                        threshold: 25 },
  ],
  'Bilal Compliance Criteria': [
    { name: 'Debt to Assets',                                    threshold: 33 },
    { name: 'Non Compliant Income to Total Income',               threshold: 20 },
  ],
  'ABC Compliance Criteria': [
    { name: 'Non Compliant Investment to Total Investment',       threshold: 28 },
    { name: 'Net Liquid Assets per Share',                        threshold: 22 },
  ],
}

const MOCK_RESULTS = [
  { id: 1, company: 'Abbott Laboratories (Pakistan) Limited', quarter: 'June - 2024',      status: 'Compliant'     },
  { id: 2, company: 'Adamjee Insurance Company Limited',      quarter: 'June - 2024',      status: 'Non-Compliant' },
  { id: 3, company: 'Attock Cement (Pakistan) Limited',       quarter: 'June - 2024',      status: 'Compliant'     },
  { id: 4, company: 'Cravegas PK Limited',                    quarter: 'March - 2024',     status: 'Compliant'     },
  { id: 5, company: 'Indus Motor Company Limited',            quarter: 'June - 2024',      status: 'Non-Compliant' },
]

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (a[col] || '').localeCompare(b[col] || '') * d)
}

// ─────────────────────────────────────────────────────────────────────────────

const ComplianceStandingPage = () => {
  // ── Filters ───────────────────────────────────────────────────────────
  const [selCompanies,  setSelCompanies]  = useState([...ALL_COMPANIES])
  const [selCriteria,   setSelCriteria]   = useState(['Hilal Compliance Criteria'])

  // ── Ratios (editable thresholds) ──────────────────────────────────────
  const [ratios, setRatios] = useState(
    CRITERIA_RATIOS['Hilal Compliance Criteria'] || []
  )

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results,         setResults]         = useState([])
  const [sortCol,  setSortCol]  = useState('company')
  const [sortDir,  setSortDir]  = useState('asc')

  // ── Derived ───────────────────────────────────────────────────────────
  const displayed = useMemo(
    () => sortRows(results, sortCol, sortDir),
    [results, sortCol, sortDir]
  )

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    // Load ratios for the first selected criteria
    const first = selCriteria[0]
    setRatios(first ? (CRITERIA_RATIOS[first] || []) : [])
    setReportGenerated(false)
    setResults([])
  }, [selCriteria])

  const handleThresholdChange = useCallback((i, val) => {
    setRatios(prev => prev.map((r, idx) => idx === i ? { ...r, threshold: val } : r))
  }, [])

  const handleGenerate = useCallback(() => {
    // Filter mock results by selected companies
    const filtered = MOCK_RESULTS.filter(r => selCompanies.includes(r.company))
    setResults(filtered)
    setReportGenerated(true)
  }, [selCompanies])

  const handleSort = useCallback((col) => {
    setSortDir(p => sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortCol(col)
  }, [sortCol])

  // ── Table columns ─────────────────────────────────────────────────────
  const columns = [
    { key: 'company', title: 'Company Name', sortable: true },
    { key: 'quarter', title: 'Quarter Name', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: row => <StatusText status={row.status} />,
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">

      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Compliance Standing</h1>
      </div>

      {/* Filter card */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <MultiSelect
            label="Companies"
            required
            placeholder="Select Companies"
            options={ALL_COMPANIES}
            value={selCompanies}
            onChange={setSelCompanies}
            hint="Multiple selections allowed"
          />
          <MultiSelect
            label="Compliance Criteria"
            required
            placeholder="Select Criteria"
            options={ALL_CRITERIA}
            value={selCriteria}
            onChange={setSelCriteria}
            hint="Multiple selections allowed"
          />
          <BtnGold onClick={handleSearch} className="py-[10px] px-8">
            Search
          </BtnGold>
        </div>
      </div>

      {/* Ratios panel — editable thresholds */}
      <RatiosPanel ratios={ratios} onThresholdChange={handleThresholdChange} />

      {/* Action row */}
      <div className="flex justify-end gap-2 mb-2">
        <BtnPrimary onClick={handleGenerate} disabled={selCompanies.length === 0 || selCriteria.length === 0}>
          Generate Report
        </BtnPrimary>
        <ExportBtn
          disabled={!reportGenerated}
          onExcel={() => {}}
          onPdf={() => {}}
        />
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

export default ComplianceStandingPage
