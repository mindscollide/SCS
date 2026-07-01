/**
 * pages/manager/DataNotReceivedPage.jsx
 * ========================================
 * Data Not Received report — shows companies that have not submitted financial
 * data for the selected quarter.
 *
 * UI layout (matches SRS screenshots):
 *  ▸ EFF3FF header band  — title
 *  ▸ Centered filter row — Quarter Name* (SearchableSelect) + Generate Report (BtnPrimary) + Export (ExportBtn)
 *  ▸ CommonTable         — Ticker (sort) | Company Name (sort)
 *
 * All interactive elements from common/:
 *  SearchableSelect → common/select/SearchableSelect.jsx
 *  BtnPrimary  → common/index.jsx
 *  ExportBtn   → common/index.jsx
 *  CommonTable → common/table/NormalTable.jsx
 *
 * Quarters are loaded from GetAllActiveQuartersApi (same pattern as MarketCapPage).
 *
 * TODO: replace mock results + handler with:
 *   GET /api/reports/data-not-received?quarterId=X → results
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { BtnPrimary, ExportBtn } from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import { GetAllActiveQuartersApi } from '../../services/manager.service.js'
import { MOCK_DATA_NOT_RECEIVED as MOCK_RESULTS } from '../../data/mockData.js'

// ── Response-code helper ─────────────────────────────────────────────────────
const QUARTERS_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (a[col] || '').localeCompare(b[col] || '') * d)
}

// ─────────────────────────────────────────────────────────────────────────────

const DataNotReceivedPage = () => {
  // ── Dropdown options ──────────────────────────────────────────────────────
  const [quarterOpts, setQuarterOpts] = useState([])

  // ── Filters ───────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState('')
  const [quarterError, setQuarterError] = useState('')

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results, setResults] = useState([])
  const [sortCol, setSortCol] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  const fetchedRef = useRef(false)

  // ── Load quarters on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      const qRes = await GetAllActiveQuartersApi({}, { skipLoader: true })

      if (qRes.success && qRes.data?.responseResult?.responseMessage === QUARTERS_OK) {
        setQuarterOpts(
          (qRes.data.responseResult.quarters || []).map((q) => ({
            label: q.quarterName || '',
            value: q.pK_QuarterID,
          }))
        )
      }
    }

    load()
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────
  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    if (!quarter) {
      setQuarterError('Quarter is required')
      return
    }
    setQuarterError('')
    // TODO: replace with GET /api/reports/data-not-received?quarterId=quarter
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
    { key: 'company', title: 'Company Name', sortable: true, align: 'center' },
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
            <SearchableSelect
              label="Quarter Name"
              required
              placeholder="Select Quarter"
              options={quarterOpts}
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
              <BtnPrimary disabled={quarter === ''} onClick={handleGenerate}>
                Generate Report
              </BtnPrimary>
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
