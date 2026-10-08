/**
 * src/pages/admin/ReopenFinancialDataPage.jsx
 * ============================================
 * CR 7 (2026-10-06): Admin can list all Approved financial data records and
 * re-open them (transition status 3 → 2 Pending For Approval).
 *
 * APIs used:
 *  getApprovedFinancialData (Admin) — paginated list of Approved records with
 *                                     filters: CompanyName, ApprovedFrom/To
 *  reopenFinancialData (Admin)      — creates a new DataApprovalRequests row
 *                                     (Reason → Notes) + flips status back to 2
 *
 * Flow:
 *  1. Admin sees all Approved records (status = 3) across all companies.
 *  2. Re-open → modal asking for Reason (required, ≤ 500 chars).
 *  3. On confirm: record moves to Pending For Approval; row removed from list.
 *  4. Record appears in Manager + Data Entry Pending Approvals.
 *     Server fires financial_data_submitted MQTT — those pages already handle it.
 *
 * MQTT: no subscription needed here — this page only initiates re-opens.
 *   Managers receive `financial_data_submitted` (bell + Pending Approvals refetch).
 *   The Data Entry owner and group receive `financial_data_saved` (Pending list refetch).
 *   Both events are handled by those pages already — nothing to wire here.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { toast } from 'react-toastify'
import { RotateCcw } from 'lucide-react'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import {
  BtnPrimary,
  BtnSlate,
  BtnModalClose,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common'
import {
  getApprovedFinancialData,
  GET_APPROVED_FINANCIAL_DATA_CODES,
  reopenFinancialData,
  REOPEN_FINANCIAL_DATA_CODES,
} from '../../services/admin.service'
import { toAPIDateOnly, toDisplayDate } from '../../utils/helpers'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'

// ─── Helpers ──────────────────────────────────────────────────────────────────
// approvedDate arrives as yyyyMMddHHmmss (UTC) — same convention as submittedDateTime
const parseDateTime = (raw) => {
  if (!raw) return ''
  const s = String(raw)
  if (s.length < 8) return s
  const y = s.slice(0, 4), mo = s.slice(4, 6), d = s.slice(6, 8)
  const h = s.length >= 10 ? s.slice(8, 10) : '00'
  const mi = s.length >= 12 ? s.slice(10, 12) : '00'
  const sc = s.length >= 14 ? s.slice(12, 14) : '00'
  const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${sc}Z`)
  if (isNaN(dt.getTime())) return s
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  const hh = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(100vh - 240px)'

const EMPTY_FILTERS = {
  dateRange: { start: '', end: '' },
}

// ─── Row mapper ───────────────────────────────────────────────────────────────
const mapRow = (r) => ({
  id: r.pK_FinancialDataID,
  company: r.companyName ?? '',
  ticker: r.ticker ?? '',
  quarter: r.quarterName ?? '',
  criteria: r.complianceCriteriaName ?? '',
  approvedDate: parseDateTime(r.approvedDate),
  approvedBy: r.approvedByName ?? '',
})

// ─── Inline Re-open Modal ─────────────────────────────────────────────────────
const ReopenModal = ({ row, onClose, onSubmit, isActioning }) => {
  const [reason, setReason] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-[#041E66]">Re-open Financial Data</h2>
          <BtnModalClose onClick={onClose} />
        </div>

        {/* Record info */}
        <div className="px-6 py-4 space-y-1.5 text-sm text-slate-700">
          <div className="flex gap-2">
            <span className="font-medium text-[#041E66] min-w-[90px]">Company:</span>
            <span>{row.company}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-[#041E66] min-w-[90px]">Quarter:</span>
            <span>{row.quarter}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-[#041E66] min-w-[90px]">Criteria:</span>
            <span>{row.criteria}</span>
          </div>
        </div>

        {/* Reason textarea */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-[#041E66] mb-1.5">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-[#0B39B5]/30
                       focus:border-[#0B39B5] resize-none"
            rows={3}
            maxLength={500}
            placeholder="Enter reason for re-opening..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{reason.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 pb-5">
          <BtnSlate onClick={onClose} disabled={isActioning}>
            Cancel
          </BtnSlate>
          <BtnPrimary
            onClick={() => onSubmit(reason.trim())}
            disabled={!reason.trim() || isActioning}
            loading={isActioning}
          >
            Re-open
          </BtnPrimary>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const ReopenFinancialDataPage = () => {
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')
  const [modal, setModal] = useState(null)
  const [isActioning, setIsActioning] = useState(false)
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)

    const params = { PageSize: PAGE_SIZE, PageNumber: pageNumber }
    if (appliedFilters.company) params.CompanyName = appliedFilters.company
    if (appliedFilters.approvedFrom) params.ApprovedFrom = appliedFilters.approvedFrom
    if (appliedFilters.approvedTo) params.ApprovedTo = appliedFilters.approvedTo

    const result = await getApprovedFinancialData(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load records.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Admin_AdminServiceManager_GetApprovedFinancialData_03') {
      const newRows = (rr.approvedFinancialData || []).map(mapRow)
      setRows((prev) => (append ? [...prev, ...newRows] : newRows))
      setTotalCount(rr.totalCount ?? newRows.length)
      return
    }

    if (code === 'Admin_AdminServiceManager_GetApprovedFinancialData_02') {
      if (!append) {
        setRows([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_APPROVED_FINANCIAL_DATA_CODES[code] || 'Something went wrong.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    if (loadingMore || loadingInitial) return
    const nextPage = p + 1
    setPage(nextPage)
    fetchData(ap, nextPage, true)
  }, [fetchData, loadingMore, loadingInitial])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: rows.length < totalCount,
    loading: loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ── Filter search ─────────────────────────────────────────────────────────
  const handleSearch = () => {
    const newApplied = {}
    if (mainSearch.trim()) newApplied.company = mainSearch.trim()
    const dr = filters.dateRange
    if (dr?.start || dr?.end) {
      newApplied.dateRange = dr
      if (dr.start) newApplied.approvedFrom = toAPIDateOnly(dr.start)
      if (dr.end) newApplied.approvedTo = toAPIDateOnly(dr.end)
    }
    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
  }

  const handleReset = () => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchData({}, 0, false)
  }

  const removeChip = (key) => {
    const next = { ...applied }
    if (key === 'dateRange') {
      delete next.dateRange
      delete next.approvedFrom
      delete next.approvedTo
    } else {
      delete next[key]
    }
    setApplied(next)
    setPage(0)
    fetchData(next, 0, false)
  }

  // ── Sort (client-side within loaded rows) ────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [rows, sortCol, sortDir]
  )

  // ── Re-open submit ────────────────────────────────────────────────────────
  const handleReopen = async (reason) => {
    setIsActioning(true)
    const result = await reopenFinancialData({ FK_FinancialDataID: modal.id, Reason: reason })
    setIsActioning(false)

    const code = result.data?.responseResult?.responseMessage

    if (code === 'Admin_AdminServiceManager_ReopenFinancialData_04') {
      toast.success('Financial data re-opened successfully.')
      setModal(null)
      // Refetch from page 0 so the server list (now one row shorter) stays in sync
      // with the scroll position — local row removal causes a skip on the next page load.
      setPage(0)
      fetchData(stateRef.current.applied, 0, false)
      return
    }

    // _03: record is stale (another Admin already re-opened it) — refresh the list
    if (code === 'Admin_AdminServiceManager_ReopenFinancialData_03') {
      toast.error(REOPEN_FINANCIAL_DATA_CODES[code] || 'Record not found or is not in Approved status.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      setModal(null)
      setPage(0)
      fetchData(stateRef.current.applied, 0, false)
      return
    }

    toast.error(REOPEN_FINANCIAL_DATA_CODES[code] || 'Re-open failed. Please try again.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }

  // ── Filter fields ─────────────────────────────────────────────────────────
  const FILTER_FIELDS = [
    {
      key: 'dateRange',
      label: 'Approved On',
      type: 'daterange',
      placeholder: 'Select date range',
    },
  ]

  // ── Table columns ─────────────────────────────────────────────────────────
  const TABLE_COLS = useMemo(
    () => [
      { key: 'company', title: 'Company Name', sortable: true },
      { key: 'ticker', title: 'Ticker', sortable: true, center: true },
      { key: 'quarter', title: 'Quarter', sortable: true, center: true },
      { key: 'criteria', title: 'Compliance Criteria', sortable: true },
      {
        key: 'approvedDate',
        title: 'Approved On',
        sortable: true,
        center: true,
        render: (row) => <span className="whitespace-nowrap">{row.approvedDate}</span>,
      },
      { key: 'approvedBy', title: 'Approved By', sortable: true },
      {
        key: 'actions',
        title: 'Actions',
        center: true,
        render: (row) => (
          <button
            type="button"
            title="Re-open this record"
            onClick={() => setModal(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]
                       font-semibold text-[#0B39B5] hover:bg-[#EFF3FF] transition-colors"
          >
            <RotateCcw size={13} />
            Re-open
          </button>
        ),
      },
    ],
    []
  )

  // ── Active chip keys to display (exclude internal date API keys) ─────────
  const visibleChipEntries = Object.entries(applied).filter(
    ([k]) => k !== 'approvedFrom' && k !== 'approvedTo'
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Heading + search */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Re-open Financial Data</h1>
          <SearchFilter
            placeholder="Search by company or ticker"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="company"
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            showFilterPanel={true}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={() => setFilters(EMPTY_FILTERS)}
          />
        </div>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        {/* Active filter chips */}
        {visibleChipEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {visibleChipEntries.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {k === 'dateRange'
                  ? `Approved On: ${v.start ? toDisplayDate(v.start) : '...'} → ${v.end ? toDisplayDate(v.end) : '...'}`
                  : `Company: ${v}`}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {visibleChipEntries.length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* Table */}
        <CommonTable
          columns={TABLE_COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Approved Records Found'}
          scrollable
          maxHeight={TABLE_MAX_HEIGHT}
          scrollRef={scrollRef}
          footerSlot={
            <>
              {loadingInitial && (
                <div className="flex justify-center py-14">
                  <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}
              <div ref={sentinelRef} className="h-px" />
              {loadingMore && (
                <div className="flex justify-center py-5">
                  <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}
              {!loadingInitial &&
                !loadingMore &&
                totalCount > PAGE_SIZE &&
                rows.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* Re-open modal */}
      {modal && (
        <ReopenModal
          row={modal}
          onClose={() => { if (!isActioning) setModal(null) }}
          onSubmit={handleReopen}
          isActioning={isActioning}
        />
      )}
    </div>
  )
}

export default ReopenFinancialDataPage
