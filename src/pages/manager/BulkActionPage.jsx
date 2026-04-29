/**
 * src/pages/manager/BulkActionPage.jsx
 * ======================================
 * Manager selects multiple pending records and bulk approves / declines.
 *
 * SRS Behaviour
 * ─────────────
 * - Approve + Decline buttons always visible; disabled until ≥1 row selected
 * - Checkbox per row; header checkbox = Select All / Unselect All
 * - Clicking a row also toggles its checkbox
 * - Approve → RequestActionModal (heading "Approval", default "Approved")
 * - Decline → RequestActionModal (heading "Reject",    default "Declined")
 * - On Yes : records removed from table, toast notification sent
 * - On No  : modal closes, records remain
 * - Search placeholder "Company Name"; searches Ticker + Company Name
 * - Filter panel: Ticker, Sector Name, Quarter Name, Sent By, Sent On date range
 * - Default sort: Quarter Name desc by date, then Ticker + Company Name asc
 *
 * TODO: GET  /api/manager/pending-approvals
 *       POST /api/manager/bulk-approve
 *       POST /api/manager/bulk-decline
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import { BtnPrimary, BtnGold, BtnChipRemove, BtnClearAll } from '../../components/common'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import { formatChipValue } from '../../utils/helpers'
import CommonTable from '../../components/common/table/NormalTable'

// ── Mock data ─────────────────────────────────────────────────────────────────
// Quarter sort weight: higher = more recent
const QUARTER_ORDER = {
  'December - 2025': 1,
  'September - 2025': 2,
  'June - 2025': 3,
  'March - 2025': 4,
  'December - 2024': 5,
  'September - 2024': 6,
}

const MOCK_DATA = [
  {
    id: 1,
    quarter: 'December - 2025',
    ticker: 'BGL',
    company: 'Balochistan Glass Ltd',
    sector: 'GLASS & CERAMICS',
    sentBy: 'Humaid Afzal',
    sentOn: '2025-12-21',
  },
  {
    id: 2,
    quarter: 'September - 2025',
    ticker: 'MUGHAL',
    company: 'Mughal Iron & Steel Industries',
    sector: 'Iron & Steel',
    sentBy: 'Huzeifa Jahangir',
    sentOn: '2025-09-05',
  },
  {
    id: 3,
    quarter: 'June - 2025',
    ticker: 'PIOC',
    company: 'Paracha Iron Limited',
    sector: 'Steel Industry',
    sentBy: 'Muhammad Aamir',
    sentOn: '2025-06-25',
  },
  {
    id: 4,
    quarter: 'March - 2025',
    ticker: 'POC',
    company: 'Pioneer Cement Limited',
    sector: 'Cement',
    sentBy: 'Jawad Faisal',
    sentOn: '2025-03-10',
  },
  {
    id: 5,
    quarter: 'December - 2024',
    ticker: 'BGL',
    company: 'Balochistan Glass Ltd',
    sector: 'GLASS & CERAMICS',
    sentBy: 'Muhammad Hassan',
    sentOn: '2024-12-25',
  },
  {
    id: 6,
    quarter: 'September - 2024',
    ticker: 'LUCK',
    company: 'Lucky Cement',
    sector: 'Cement',
    sentBy: 'Bilal Khan',
    sentOn: '2024-09-14',
  },
]

// ── Filter config ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = {
  company: '',
  ticker: '',
  sector: '',
  quarter: '',
  sentBy: '',
  sentFrom: null,
  sentTo: null,
}

const FILTER_FIELDS = [
  { key: 'ticker', label: 'Ticker', type: 'input', maxLength: 20 },
  { key: 'sector', label: 'Sector Name', type: 'input', maxLength: 50 },
  { key: 'quarter', label: 'Quarter Name', type: 'input', maxLength: 50 },
  { key: 'sentBy', label: 'Sent By', type: 'input', maxLength: 50 },
  { key: 'sentFrom', label: 'Sent On (From)', type: 'date' },
  { key: 'sentTo', label: 'Sent On (To)', type: 'date' },
]

const CHIP_LABELS = {
  company: 'Company',
  ticker: 'Ticker',
  sector: 'Sector',
  quarter: 'Quarter',
  sentBy: 'Sent By',
  sentFrom: 'From',
  sentTo: 'To',
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
const SORT_COLS = ['quarter', 'ticker', 'company', 'sector', 'sentBy', 'sentOn']

const defaultSort = (a, b) => {
  const qa = QUARTER_ORDER[a.quarter] ?? 99
  const qb = QUARTER_ORDER[b.quarter] ?? 99
  if (qa !== qb) return qa - qb // quarter desc
  const tc = a.ticker.localeCompare(b.ticker)
  if (tc !== 0) return tc // ticker asc
  return a.company.localeCompare(b.company) // company asc
}

// ── Page component ────────────────────────────────────────────────────────────
const BulkActionPage = () => {
  const sourceData = useRef(MOCK_DATA)
  const [rows, setRows] = useState(MOCK_DATA)
  const [selected, setSel] = useState(new Set())
  const [modal, setModal] = useState(null) // { type: 'approve' | 'decline' }

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // Main search input maps to "company" key (also searches ticker)
  const mainSearch = filters.company
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, company: val })), [])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  // ── Derived: filtered + sorted rows ──────────────────────────────────────
  const displayRows = useMemo(() => {
    const sorted = sortCol
      ? [...rows].sort((a, b) => {
          const va = (a[sortCol] || '').toLowerCase()
          const vb = (b[sortCol] || '').toLowerCase()
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
        })
      : [...rows].sort(defaultSort)
    return sorted
  }, [rows, sortCol, sortDir])

  // ── Checkbox state ────────────────────────────────────────────────────────
  const allChecked = displayRows.length > 0 && displayRows.every((r) => selected.has(r.id))
  const hasSelection = selected.size > 0

  const toggleAll = () => {
    if (allChecked) setSel(new Set())
    else setSel(new Set(displayRows.map((r) => r.id)))
  }

  const toggleOne = (id) =>
    setSel((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── Filter data helper ────────────────────────────────────────────────────
  const fetchData = useCallback((f) => {
    setRows(
      sourceData.current.filter((r) => {
        // Text fields
        const textMatch = Object.entries(f).every(([k, v]) => {
          if (!v || k === 'sentFrom' || k === 'sentTo') return true
          // "company" key also searches ticker
          if (k === 'company') {
            return (
              r.company?.toLowerCase().includes(v.toLowerCase()) ||
              r.ticker?.toLowerCase().includes(v.toLowerCase())
            )
          }
          return r[k]?.toLowerCase().includes(v.toLowerCase())
        })
        // Date range on sentOn
        const from = f.sentFrom ? new Date(f.sentFrom) : null
        const to = f.sentTo ? new Date(f.sentTo) : null
        const sent = r.sentOn ? new Date(r.sentOn) : null
        const dateMatch = (!from || (sent && sent >= from)) && (!to || (sent && sent <= to))
        return textMatch && dateMatch
      })
    )
    setSel(new Set()) // clear selection on filter change
  }, [])

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v?.trim?.() ?? v) next[k] = v
    })
    setApplied(next)
    fetchData(next)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    fetchData({})
    setSortCol('')
  }, [fetchData])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const next = { ...prev }
        delete next[key]
        fetchData(next)
        return next
      })
    },
    [fetchData]
  )

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // ── Approve / Decline submit ──────────────────────────────────────────────
  const handleAction = useCallback(
    (notes) => {
      const type = modal.type
      const count = selected.size
      // TODO: POST /api/manager/bulk-approve or bulk-decline with selected IDs + notes
      sourceData.current = sourceData.current.filter((r) => !selected.has(r.id))
      fetchData(applied)
      toast.success(
        `${count} record${count !== 1 ? 's' : ''} ${type === 'approve' ? 'Approved ✅' : 'Declined ❌'} — notifications sent to requestees`
      )
      setSel(new Set())
      setModal(null)
    },
    [modal, selected, applied, fetchData]
  )
  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'checkbox',
        // ReactNode title — renders the Select All / Unselect All checkbox in the header
        title: (
          <Checkbox
            label={allChecked ? 'Unselect All' : 'Select All'}
            checked={allChecked}
            onChange={toggleAll}
            labelClassName="text-[12px] font-semibold"
          />
        ),
        render: (r) => (
          <Checkbox
            checked={selected.has(r.id)}
            onChange={() => toggleOne(r.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: 'quarter',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#000]">{r.quarter}</span>,
      },
      { key: 'ticker', title: 'Ticker', sortable: true, align: 'center' },
      { key: 'company', title: 'Company Name', sortable: true, align: 'center' },
      { key: 'sector', title: 'Sector Name', sortable: true, align: 'center' },
      { key: 'sentBy', title: 'Sent By', sortable: true, align: 'center' },
      {
        key: 'sentOn',
        title: 'Sent On',
        sortable: true,
        align: 'center',
        render: (r) => <span className="whitespace-nowrap">{r.sentOn}</span>,
      },
    ],
    [allChecked, selected, toggleAll, toggleOne]
  )
  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Bulk Action</h1>
          <SearchFilter
            placeholder="Search by company name..."
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
          />
        </div>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2">
        {/* ── Active filter chips ── */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k] || k}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && (
              <BtnClearAll onClick={handleReset} />
            )}
          </div>
        )}

        {/* ── Approve / Decline buttons (always visible, disabled until selection) ── */}
        <div className="flex justify-end gap-3 mb-3">
          <BtnPrimary
            disabled={!hasSelection}
            onClick={() => hasSelection && setModal({ type: 'approve' })}
          >
            Approve
          </BtnPrimary>
          <BtnGold
            disabled={!hasSelection}
            onClick={() => hasSelection && setModal({ type: 'decline' })}
          >
            Decline
          </BtnGold>
        </div>

        {/* ── Table ── */}
        {/* ── Table ── */}
        <CommonTable
          columns={TABLE_COLS}
          data={displayRows}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Records Found"
          onRowClick={(r) => toggleOne(r.id)}
          rowClassName={(r) =>
            `cursor-pointer transition-colors ${
              selected.has(r.id) ? 'bg-[#e8faf4]' : 'bg-white hover:bg-[#f8fafc]'
            }`
          }
        />
      </div>

      {/* ── Approve / Decline modal ── */}
      {modal && (
        <RequestActionModal
          row={{}}
          type={modal.type}
          title={modal.type === 'approve' ? 'Approval' : 'Reject'}
          defaultNotes={modal.type === 'approve' ? 'Approved' : 'Declined'}
          onClose={() => setModal(null)}
          onSubmit={handleAction}
          infoFields={[
            {
              label: 'Selected Records',
              value: `${selected.size} record${selected.size !== 1 ? 's' : ''}`,
            },
            { label: 'Action', value: modal.type === 'approve' ? 'Bulk Approve' : 'Bulk Decline' },
          ]}
          approveReasons={[
            'Data verified',
            'Calculations match',
            'All documents reviewed',
            'Figures are accurate',
          ]}
          declineReasons={[
            'Data mismatch',
            'Incomplete information',
            'Requires revision',
            'Supporting documents missing',
          ]}
        />
      )}
    </div>
  )
}

export default BulkActionPage
