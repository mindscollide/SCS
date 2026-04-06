/**
 * src/pages/manager/PendingApprovalsPage.jsx
 * ============================================
 * Manager reviews financial data submitted by Data Entry users.
 *
 * Views:
 *  "list"  → table of pending approvals
 *  "view"  → read-only FinancialDataTable for selected row
 *  "edit"  → editable FinancialDataTable for selected row
 *
 * Actions per row:
 *  View    → opens FinancialDataTable in read-only mode (editableCol={-1})
 *  Edit    → opens FinancialDataTable in edit mode (editableCol={0})
 *  Approve → RequestActionModal → marks Approved, removes from queue
 *  Decline → RequestActionModal → marks Declined, removes from queue
 *
 * Search Behaviour
 * ─────────────────
 * - Main input searches Company Name
 * - Filter panel: Ticker | Company | Sector | Quarter | Sent By
 * - Applied filters shown as teal chips — Clear All when > 1
 *
 * Reusable Components Used
 * ─────────────────────────
 * - FinancialDataTable → src/components/common/FinancialDataTable.jsx
 * - RequestActionModal → src/components/common/Modals/Modals.jsx
 * - SearchFilter       → src/components/common/searchFilter/SearchFilter.jsx
 * - CommonTable        → src/components/common/table/NormalTable.jsx
 * - ConfirmModal       → src/components/common/index.jsx
 *
 * TODO
 * ─────
 * - GET  /api/manager/pending-approvals        → replace MOCK_PENDING_APPROVALS
 * - GET  /api/manager/financial-data/:id       → replace MOCK_RATIOS in view/edit
 * - POST /api/manager/financial-data/:id       → replace local update in handleUpdate
 * - POST /api/manager/approve/:id              → replace local remove in handleAction
 * - POST /api/manager/decline/:id              → replace local remove in handleAction
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, Eye, SquarePen, X } from 'lucide-react'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import FinancialDataTable, {
  MOCK_QUARTERS,
  MOCK_COMPANIES,
  MOCK_RATIOS,
} from '../../components/common/table/FinancialDataTable'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — replace with API calls
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PENDING_APPROVALS = [
  {
    id: 1,
    quarter: 'Q1-2025',
    ticker: 'ACBL',
    company: 'Allied Bank',
    sector: 'Banking',
    sentBy: 'Bilal Khan',
    sentOn: '01-03-2025',
  },
  {
    id: 2,
    quarter: 'Q1-2025',
    ticker: 'MCB',
    company: 'MCB Bank',
    sector: 'Banking',
    sentBy: 'Fatima Malik',
    sentOn: '02-03-2025',
  },
  {
    id: 3,
    quarter: 'Q1-2025',
    ticker: 'OGDC',
    company: 'Oil & Gas Dev Co',
    sector: 'Energy',
    sentBy: 'Hamza Ali',
    sentOn: '03-03-2025',
  },
  {
    id: 4,
    quarter: 'Q2-2025',
    ticker: 'LUCK',
    company: 'Lucky Cement',
    sector: 'Cement',
    sentBy: 'Bilal Khan',
    sentOn: '04-03-2025',
  },
  {
    id: 5,
    quarter: 'Q2-2025',
    ticker: 'PSO',
    company: 'Pakistan State Oil',
    sector: 'Energy',
    sentBy: 'Zainab Raza',
    sentOn: '05-03-2025',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  company: '',
  ticker: '',
  sector: '',
  quarter: '',
  sentBy: '',
}

const CHIP_LABELS = {
  company: 'Company',
  ticker: 'Ticker',
  sector: 'Sector',
  quarter: 'Quarter',
  sentBy: 'Sent By',
}

const FILTER_FIELDS = [
  { key: 'company', label: 'Company Name', type: 'input', maxLength: 50 },
  { key: 'ticker', label: 'Ticker', type: 'input', maxLength: 10 },
  { key: 'sector', label: 'Sector', type: 'input', maxLength: 50 },
  {
    key: 'quarter',
    label: 'Quarter',
    type: 'select',
    options: ['Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025'],
  },
  { key: 'sentBy', label: 'Sent By', type: 'input', maxLength: 50 },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PendingApprovalsPage = () => {
  // ── View state: "list" | "view" | "edit" ─────────────────────────────────
  const [view, setView] = useState('list')
  const [activeRow, setActiveRow] = useState(null)

  // ── Financial data state for view/edit screens ────────────────────────────
  const [ratios, setRatios] = useState(MOCK_RATIOS)
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')

  // ── List data ─────────────────────────────────────────────────────────────
  const sourceData = useRef(MOCK_PENDING_APPROVALS)
  const [approvals, setApprovals] = useState(MOCK_PENDING_APPROVALS)

  // ── Action modal state ────────────────────────────────────────────────────
  const [modal, setModal] = useState(null) // { row, type: 'approve' | 'decline' }

  // ── Filter + search ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.company
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, company: val })), [])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Open a row in view or edit mode.
   * TODO: fetch actual financial data from GET /api/manager/financial-data/:id
   */
  const openRow = useCallback((row, mode) => {
    setActiveRow(row)
    setSelectedQuarter(row.quarter)
    setSelectedCompany(row.company)
    setRatios(MOCK_RATIOS) // TODO: replace with API fetch by row.id
    setView(mode)
  }, [])

  const backToList = useCallback(() => {
    setView('list')
    setActiveRow(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // CELL EDIT HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Updates a single cell value in the ratios state.
   * Called by FinancialDataTable when a cell changes in edit mode.
   */
  const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
    setRatios((prev) =>
      prev.map((ratio) =>
        ratio.id !== ratioId
          ? ratio
          : {
              ...ratio,
              classifications: ratio.classifications.map((cls) =>
                cls.id !== classId
                  ? cls
                  : {
                      ...cls,
                      values: cls.values.map((v, i) => (i === colIdx ? val : v)),
                    }
              ),
            }
      )
    )
  }, [])

  /**
   * Save edited data.
   * TODO: PUT /api/manager/financial-data/:id with updated ratios
   */
  const handleUpdate = useCallback(() => {
    toast.success('Record updated successfully')
    backToList()
  }, [backToList])

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────

  const fetchData = useCallback((f) => {
    setApprovals(
      sourceData.current.filter((r) =>
        Object.entries(f).every(([k, v]) => !v || r[k]?.toLowerCase().includes(v.toLowerCase()))
      )
    )
  }, [])

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    fetchData(next)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    fetchData({})
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

  // ─────────────────────────────────────────────────────────────────────────
  // SORT
  // ─────────────────────────────────────────────────────────────────────────

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

  const sorted = useMemo(
    () =>
      [...approvals].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [approvals, sortCol, sortDir]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION HANDLER (Approve / Decline)
  // ─────────────────────────────────────────────────────────────────────────

  const handleAction = useCallback(
    (notes) => {
      const { row, type } = modal
      // TODO: POST /api/manager/approve/:id or decline/:id
      sourceData.current = sourceData.current.filter((r) => r.id !== row.id)
      setApprovals(sourceData.current)
      toast.success(`${row.ticker} has been ${type === 'approve' ? 'Approved ✅' : 'Declined ❌'}`)
      setModal(null)
    },
    [modal]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS
  // ─────────────────────────────────────────────────────────────────────────

  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'quarter',
        title: 'Quarter',
        sortable: true,
        render: (r) => (
          <span
            className="bg-blue-100 text-[#0B39B5] px-2.5 py-0.5
                         rounded-full text-[11px] font-semibold"
          >
            {r.quarter}
          </span>
        ),
      },
      {
        key: 'ticker',
        title: 'Ticker',
        sortable: true,
        render: (r) => <span className="font-mono font-bold text-[#041E66]">{r.ticker}</span>,
      },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        render: (r) => <span className="font-medium text-[#0B39B5]">{r.company}</span>,
      },
      { key: 'sector', title: 'Sector', sortable: true },
      { key: 'sentBy', title: 'Sent By', sortable: true },
      { key: 'sentOn', title: 'Sent On', sortable: true },
      {
        key: 'actions',
        title: 'Actions',
        render: (r) => (
          <div className="flex items-center gap-1">
            {/* View — opens read-only FinancialDataTable */}
            <button
              title="View"
              onClick={() => openRow(r, 'view')}
              className="w-8 h-8 rounded-lg hover:bg-[#EFF3FF] hover:text-[#0B39B5]
                       text-slate-400 flex items-center justify-center transition-all"
            >
              <Eye size={15} />
            </button>
            {/* Edit — opens editable FinancialDataTable */}
            <button
              title="Edit"
              onClick={() => openRow(r, 'edit')}
              className="w-8 h-8 rounded-lg hover:bg-[#EFF3FF] hover:text-[#0B39B5]
                       text-slate-400 flex items-center justify-center transition-all"
            >
              <SquarePen size={15} />
            </button>
            {/* Approve */}
            <button
              title="Approve"
              onClick={() => setModal({ row: r, type: 'approve' })}
              className="text-emerald-500 hover:text-emerald-600 transition-colors ml-1"
            >
              <CheckCircle size={18} />
            </button>
            {/* Decline */}
            <button
              title="Decline"
              onClick={() => setModal({ row: r, type: 'decline' })}
              className="text-red-500 hover:text-red-600 transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>
        ),
      },
    ],
    [openRow]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — VIEW / EDIT MODE
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'view' || view === 'edit') {
    const isEdit = view === 'edit'
    return (
      <div className="font-sans">
        {/* ── Page heading ── */}
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">{isEdit ? 'Edit' : 'View'}</h1>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
          <div className="bg-white rounded-xl p-5 border border-[#dde4ee]">
            <FinancialDataTable
              quarters={MOCK_QUARTERS}
              companies={MOCK_COMPANIES}
              selectedQuarter={selectedQuarter}
              onQuarterChange={setSelectedQuarter}
              selectedCompany={selectedCompany}
              onCompanyChange={setSelectedCompany}
              ratios={ratios}
              editableCol={isEdit ? 0 : -1}
              onCellChange={isEdit ? handleCellChange : undefined}
              actions={
                <>
                  {/* Close — gold */}
                  <button
                    onClick={backToList}
                    className="px-8 py-[10px] rounded-lg bg-[#F5A623] hover:bg-[#e09a1a]
                               text-[13px] font-semibold text-white transition-colors"
                  >
                    Close
                  </button>
                  {/* Update (edit mode only) — blue */}
                  {isEdit && (
                    <button
                      onClick={handleUpdate}
                      className="px-8 py-[10px] rounded-lg bg-[#0B39B5] hover:bg-[#0a2e94]
                                 text-[13px] font-semibold text-white transition-colors"
                    >
                      Update
                    </button>
                  )}
                </>
              }
            />
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — LIST MODE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Approvals</h1>
          <SearchFilter
            placeholder="Search by company..."
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

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        {/* ── Active filter chips ── */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k] || k}: {v}
                <button
                  onClick={() => removeChip(k)}
                  className="hover:text-white/70 transition-colors"
                >
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
        <CommonTable
          columns={TABLE_COLS}
          data={sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Pending Approvals"
        />
      </div>

      {/* ── Approve / Decline modal ── */}
      {modal && (
        <RequestActionModal
          row={modal.row}
          type={modal.type}
          title={modal.type === 'approve' ? 'Approval' : 'Reject'}
          defaultNotes={modal.type === 'approve' ? 'Approved' : 'Declined'}
          onClose={() => setModal(null)}
          onSubmit={handleAction}
          infoFields={[
            { label: 'Company', key: 'company' },
            { label: 'Ticker', key: 'ticker' },
            { label: 'Quarter', key: 'quarter' },
            { label: 'Sent By', key: 'sentBy' },
          ]}
          approveReasons={['Data verified', 'Calculations match', 'All documents reviewed']}
          declineReasons={['Data mismatch', 'Incomplete information', 'Requires revision']}
        />
      )}
    </div>
  )
}

export default PendingApprovalsPage
