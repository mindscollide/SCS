/**
 * src/pages/dataentry/PendingForApprovalPage.jsx
 * ================================================
 * Shows only records with status "Pending For Approval".
 *
 * SRS:
 *  - Columns: Quarter Name, Ticker, Company Name, Sector, Sent On
 *  - Default sort: Quarter Name (latest first) + Ticker + Company Name alpha
 *  - Sortable: all 5 columns
 *  - Search: Quarter Name (placeholder), filter icon for more options
 *  - Company Name → navigates to View Financial Data page
 *
 * TODO: GET /api/data-entry/pending-approval
 */

import React, { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useFinancialData } from '../../context/FinancialDataContext.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import { formatChipValue } from '../../utils/helpers'

// ── Filter config ─────────────────────────────────────────────────────────────

const EMPTY_FILTERS = { ticker: '', sector: '', sentFrom: '', sentTo: '' }

const FILTER_FIELDS = [
  { key: 'ticker', label: 'Ticker', type: 'input', maxLength: 20 },
  { key: 'sector', label: 'Sector', type: 'input', maxLength: 50 },
  { key: 'sentFrom', label: 'Sent On (From)', type: 'date' },
  { key: 'sentTo', label: 'Sent On (To)', type: 'date' },
]

const CHIP_LABELS = {
  ticker: 'Ticker',
  sector: 'Sector',
  sentFrom: 'From',
  sentTo: 'To',
}

// ── Helper: extract "Sent On" date from history ───────────────────────────────
const getSentOn = (record) => {
  const entry = [...(record.history || [])]
    .reverse()
    .find((h) => h.status === 'Pending For Approval')
  return entry?.on ?? '—'
}

// ─────────────────────────────────────────────────────────────────────────────

const PendingForApprovalPage = () => {
  const navigate = useNavigate()
  const { records } = useFinancialData()

  // ── Only Pending For Approval records ─────────────────────────────────────
  const pending = useMemo(
    () =>
      records
        .filter((r) => r.status === 'Pending For Approval')
        .map((r) => ({ ...r, sentOn: getSentOn(r) })),
    [records]
  )

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('quarter')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      else {
        setSortCol(col)
        setSortDir('asc')
      }
    },
    [sortCol]
  )

  // ── Search / filter state ─────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v?.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setFilters(EMPTY_FILTERS)
  }, [filters])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setMainSearch('')
  }, [])

  const removeChip = useCallback((key) => {
    setApplied((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // ── Filtered + sorted data ────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const f = { ...applied }
    if (mainSearch.trim()) f.quarter = mainSearch.trim()

    const filtered = pending.filter((r) => {
      if (f.quarter && !r.quarter?.toLowerCase().includes(f.quarter.toLowerCase())) return false
      if (f.ticker && !r.ticker?.toLowerCase().includes(f.ticker.toLowerCase())) return false
      if (f.sector && !r.sector?.toLowerCase().includes(f.sector.toLowerCase())) return false
      if (f.sentFrom && r.sentOn !== '—') {
        if (new Date(r.sentOn) < new Date(f.sentFrom)) return false
      }
      if (f.sentTo && r.sentOn !== '—') {
        if (new Date(r.sentOn) > new Date(f.sentTo)) return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      const key = sortCol === 'sentOn' ? 'sentOn' : sortCol
      const va = (a[key] ?? '').toString().toLowerCase()
      const vb = (b[key] ?? '').toString().toLowerCase()
      const cmp = va.localeCompare(vb)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [pending, applied, mainSearch, sortCol, sortDir])

  // ── Column definitions ────────────────────────────────────────────────────
  const columns = [
    {
      key: 'quarter',
      title: 'Quarter Name',
      sortable: true,
      render: (row) => (
        <span className="bg-[#E0E6F6] text-[#0B39B5] px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
          {row.quarter}
        </span>
      ),
    },
    {
      key: 'ticker',
      title: 'Ticker',
      sortable: true,
      render: (row) => <span className="font-mono font-bold text-[#041E66]">{row.ticker}</span>,
    },
    {
      key: 'company',
      title: 'Company Name',
      sortable: true,
      render: (row) => (
        <span
          className="text-[#0B39B5] font-medium cursor-pointer hover:underline"
          onClick={() => navigate(`/data-entry/financial-data/view/${row.id}`)}
        >
          {row.company}
        </span>
      ),
    },
    {
      key: 'sector',
      title: 'Sector',
      sortable: true,
    },
    {
      key: 'sentOn',
      title: 'Sent On',
      sortable: true,
      render: (row) => <span className="text-slate-600 text-[13px]">{row.sentOn}</span>,
    },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                      flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Approvals</h1>
        <SearchFilter
          placeholder="Search by Quarter Name"
          mainSearch={mainSearch}
          setMainSearch={setMainSearch}
          filters={filters}
          setFilters={setFilters}
          fields={FILTER_FIELDS}
          onSearch={handleSearch}
          onReset={handleReset}
          onFilterClose={() => setFilters(EMPTY_FILTERS)}
        />
      </div>

      {/* ── Active filter chips ── */}
      {Object.keys(applied).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {Object.entries(applied).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                         text-[12px] font-medium text-white bg-[#01C9A4]"
            >
              {CHIP_LABELS[k] || k}: {formatChipValue(v)}
              <button onClick={() => removeChip(k)} className="hover:text-white/70">
                <X size={13} />
              </button>
            </span>
          ))}
          {Object.keys(applied).length > 1 && (
            <button
              onClick={handleReset}
              className="text-[12px] font-semibold text-[#E8923A] hover:underline ml-1"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <CommonTable
          columns={columns}
          data={displayed}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Record Found"
          headerBg="#E0E6F6"
          headerTextColor="#041E66"
          rowBg="#ffffff"
          rowHoverBg="#EFF3FF"
        />
      </div>
    </div>
  )
}

export default PendingForApprovalPage
