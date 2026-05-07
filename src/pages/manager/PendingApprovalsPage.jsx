/**
 * src/pages/manager/PendingApprovalsPage.jsx
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import FinancialDataTable, {
  MOCK_QUARTERS,
  MOCK_COMPANIES,
  MOCK_RATIOS,
} from '../../components/common/table/FinancialDataTable'
import { formatChipValue, toAPIDateOnly, toDisplayDate } from '../../utils/helpers'
import {
  getPendingRequestsApi,
  GET_PENDING_APPROVALS_CODES,
  getPendingApprovalDetailsApi,
  GET_PENDING_APPROVAL_DETAILS_CODES,
} from '../../services/manager.service'
// ── Admin service — shared suggested-reasons API ──────────────────────────

import useInfiniteScroll from '../../hooks/useInfiniteScroll'
import {
  ConfirmModal,
  BtnPrimary,
  BtnGold,
  BtnIconEdit,
  BtnIconApprove,
  BtnIconDecline,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(100vh - 200px)'

const EMPTY_FILTERS = {
  company: '',
  ticker: '',
  sector: '',
  quarter: '',
  sentBy: '',
  dateRange: { start: '', end: '' },
}

const CHIP_LABELS = {
  company: 'Company',
  ticker: 'Ticker',
  sector: 'Sector',
  quarter: 'Quarter',
  sentBy: 'Sent By',
  dateRange: 'Date',
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
  { key: 'dateRange', label: 'Date', type: 'daterange', placeholder: 'Select date range' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "YYYYMMDD" → "DD-MM-YYYY" */
const parseSubmittedAt = (raw) => {
  if (!raw) return '—'
  const s = String(raw)
  if (s.length !== 8) return s
  return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`
}

/** Map list-API row → UI row */
const mapApproval = (r) => ({
  id: r.dataApprovalRequestID,
  quarter: r.quarterName ?? '',
  ticker: r.ticker ?? '',
  company: r.companyName ?? '',
  sector: r.sector ?? '—',
  sentBy: r.submittedByName ?? '',
  sentOn: parseSubmittedAt(r.submittedAt),
  raw: r,
})

// ─────────────────────────────────────────────────────────────────────────────
// Detail info card
// ─────────────────────────────────────────────────────────────────────────────

const DetailInfoCard = ({ detail }) => {
  if (!detail) return null

  const fields = [
    { label: 'Company', value: detail.companyName },
    { label: 'Ticker', value: detail.ticker },
    { label: 'Quarter', value: detail.quarterName },
    { label: 'Status', value: detail.status },
    { label: 'Submitted By', value: detail.submittedByName },
    { label: 'Submitted At', value: parseSubmittedAt(detail.submittedAt) },
    { label: 'Start Date', value: parseSubmittedAt(detail.startDate) },
    { label: 'End Date', value: parseSubmittedAt(detail.endDate) },
  ]

  return (
    <div className="mb-4 p-4 bg-[#f8faff] border border-[#dde4ee] rounded-xl">
      {detail.description && (
        <p className="text-[12px] text-[#6b7c9e] mb-3 italic">"{detail.description}"</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[11px] font-medium text-[#6b7c9e] uppercase tracking-wide">
              {label}
            </p>
            <p className="text-[13px] font-semibold text-[#041E66] mt-0.5">{value || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PendingApprovalsPage = () => {
  // ── View state ───────────────────────────────────────────────────────────
  const [view, setView] = useState('list')
  const [activeRow, setActiveRow] = useState(null)

  // ── Detail page state ────────────────────────────────────────────────────
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  // ── Financial data state ─────────────────────────────────────────────────
  const [ratios, setRatios] = useState(MOCK_RATIOS)
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')

  // ── List / pagination state ──────────────────────────────────────────────
  const [approvals, setApprovals] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Action modal ─────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null)

  // ── Confirmation modal: null | 'close' | 'update' ────────────────────────
  const [confirm, setConfirm] = useState(null)

  // ── Suggested reasons (from Session Storage) ──────────────────────────────────────────
  // Note the [value, setValue] syntax
  const [approveReasons, setApproveReasons] = useState(() => {
    const raw = sessionStorage.getItem('approve_reasons')
    // Use .flat() and .filter() to fix the "array in array" and null issues we found earlier
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })

  const [declineReasons, setDeclineReasons] = useState(() => {
    const raw = sessionStorage.getItem('decline_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })

  // ── Filter + search ──────────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // ── Refs ─────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied }

  // FETCH — LIST
  // ─────────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)

    const params = {
      PageSize: PAGE_SIZE,
      PageNumber: pageNumber,
      FK_CompanyID: appliedFilters.FK_CompanyID || 0,
      FK_QuarterID: appliedFilters.FK_QuarterID || 0,
      FK_StatusID: appliedFilters.FK_StatusID || 0,
      DateFrom: appliedFilters.sentOnFrom || '',
      DateTo: appliedFilters.sentOnTo || '',
    }

    const result = await getPendingRequestsApi(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load pending approvals.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_03') {
      const newRows = (rr.requests ?? []).map(mapApproval)
      setApprovals((prev) => (append ? [...prev, ...newRows] : newRows))
      setTotalCount(rr.totalCount ?? newRows.length)
      return
    }

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_02') {
      if (!append) {
        setApprovals([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_PENDING_APPROVALS_CODES[code] || 'Something went wrong.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  // ── Mount — fire both fetches in parallel ─────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH — DETAIL
  // ─────────────────────────────────────────────────────────────────────────

  const fetchDetail = useCallback(async (approvalId) => {
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)

    const result = await getPendingApprovalDetailsApi(approvalId, { skipLoader: true })

    setDetailLoading(false)

    if (!result.success) {
      const msg = result.message || 'Failed to load approval details.'
      setDetailError(msg)
      toast.error(msg, {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovalDetails_04') {
      const req = rr.request
      setDetail(req)
      setSelectedQuarter(req.quarterName ?? '')
      setSelectedCompany(req.companyName ?? '')
      setRatios(MOCK_RATIOS)
      return
    }

    const errMsg =
      GET_PENDING_APPROVAL_DETAILS_CODES[code] || 'Something went wrong, please try again.'
    setDetailError(errMsg)
    toast.error(errMsg, {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const openRow = useCallback(
    (row, mode) => {
      setActiveRow(row)
      setView(mode)
      fetchDetail(row.id)
    },
    [fetchDetail]
  )

  const backToList = useCallback(() => {
    setView('list')
    setActiveRow(null)
    setDetail(null)
    setDetailError(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // CELL EDIT
  // ─────────────────────────────────────────────────────────────────────────

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
                  : { ...cls, values: cls.values.map((v, i) => (i === colIdx ? val : v)) }
              ),
            }
      )
    )
  }, [])

  const handleUpdate = useCallback(() => {
    setConfirm('update')
  }, [])

  const handleConfirmProceed = useCallback(() => {
    if (confirm === 'close') {
      setConfirm(null)
      backToList()
    }
    if (confirm === 'update') {
      setConfirm(null)
      // TODO: PUT /api/manager/financial-data/:id with updated ratios
      toast.success('Record Updated Successfully.', {
        style: { backgroundColor: '#01C9A4', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      backToList()
    }
  }, [confirm, backToList])

  const handleConfirmCancel = useCallback(() => {
    setConfirm(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // INFINITE SCROLL
  // ─────────────────────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    setPage(p + 1)
    fetchData(ap, p + 1, true)
  }, [fetchData])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: approvals.length < totalCount,
    loading: loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────

  const handleSearch = () => {
    const newApplied = {}
    if (mainSearch.trim()) newApplied.company = mainSearch.trim()

    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return
      if (k === 'dateRange') {
        if (v.start || v.end) {
          newApplied.dateRange = v
          if (v.start) newApplied.sentOnFrom = toAPIDateOnly(v.start)
          if (v.end) newApplied.sentOnTo = toAPIDateOnly(v.end)
        }
        return
      }
      if (typeof v === 'string' && v.trim()) newApplied[k] = v.trim()
    })

    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
  }

  const handleReset = useCallback(() => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchData({}, 0, false)
  }, [fetchData])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      const next = { ...applied }
      if (key === 'dateRange') {
        delete next.dateRange
        delete next.sentOnFrom
        delete next.sentOnTo
      } else delete next[key]
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
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
  // APPROVE / DECLINE
  // ─────────────────────────────────────────────────────────────────────────

  const handleAction = useCallback(
    async (notes) => {
      const { row, type } = modal
      // TODO: POST /api/manager/approve/:id  or  /api/manager/decline/:id
      setApprovals((prev) => prev.filter((r) => r.id !== row.id))
      setTotalCount((c) => c - 1)
      toast.success(
        type === 'approve' ? 'Request approved successfully.' : 'Request declined successfully.',
        {
          style: { backgroundColor: '#01C9A4', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        }
      )
      setModal(null)
    },
    [modal]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────────────────

  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'quarter',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold">{r.quarter}</span>,
      },
      { key: 'ticker', title: 'Ticker', sortable: true, align: 'center' },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        align: 'center',
        render: (r) => (
          <span className="cursor-pointer" onClick={() => openRow(r, 'view')}>
            {r.company}
          </span>
        ),
      },
      { key: 'sector', title: 'Sector Name', sortable: true, align: 'center' },
      { key: 'sentBy', title: 'Sent By', sortable: true, align: 'center' },
      {
        key: 'sentOn',
        title: 'Sent On',
        sortable: true,
        align: 'center',
        render: (r) => <span className="whitespace-nowrap">{r.sentOn}</span>,
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'center',
        render: (r) => (
          <div className="flex items-center justify-center gap-1">
            <BtnIconEdit onClick={() => openRow(r, 'edit')} className={'w-8 h-8 mr-2'} size={17} />
            <BtnIconApprove
              onClick={() => setModal({ row: r, type: 'approve' })}
              className="w-8"
              size={18}
            />
            <BtnIconDecline
              onClick={() => setModal({ row: r, type: 'decline' })}
              className="w-8"
              size={18}
            />
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
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">{isEdit ? 'Edit' : 'View'}</h1>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
          <div className="bg-white rounded-xl p-5 border border-[#dde4ee]">
            {detailLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                <p className="text-[13px] text-[#6b7c9e]">Loading approval details…</p>
              </div>
            )}

            {!detailLoading && detailError && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-[14px] font-medium text-red-500">{detailError}</p>
                <BtnPrimary onClick={() => fetchDetail(activeRow?.id)} className="mt-2">
                  Retry
                </BtnPrimary>
              </div>
            )}

            {!detailLoading && !detailError && detail && (
              <>
                <FinancialDataTable
                  quarters={MOCK_QUARTERS}
                  companies={MOCK_COMPANIES}
                  selectedQuarter={selectedQuarter}
                  onQuarterChange={setSelectedQuarter}
                  selectedCompany={selectedCompany}
                  onCompanyChange={setSelectedCompany}
                  ratios={ratios}
                  searched
                  editableCol={isEdit ? 0 : -1}
                  onCellChange={isEdit ? handleCellChange : undefined}
                  disableQuarter={!isEdit}
                  disableCompany={!isEdit}
                  actions={
                    <>
                      <BtnGold size="lg" onClick={isEdit ? () => setConfirm('close') : backToList}>
                        Close
                      </BtnGold>
                      {isEdit && (
                        <BtnPrimary size="lg" onClick={handleUpdate}>
                          Update
                        </BtnPrimary>
                      )}
                    </>
                  }
                />
              </>
            )}
          </div>
        </div>

        <ConfirmModal
          open={!!confirm}
          message={
            confirm === 'close'
              ? 'All the changes will be lost. Are you sure you want to close?'
              : 'Are you sure you want to update the information?'
          }
          onYes={handleConfirmProceed}
          onNo={handleConfirmCancel}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — LIST MODE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Approvals</h1>
          <SearchFilter
            placeholder="Company Name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="company"
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            showFilterPanel={true}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
          />
        </div>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied)
              .filter(([k]) => k !== 'sentOnFrom' && k !== 'sentOnTo')
              .map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                             text-[12px] font-medium text-white bg-[#01C9A4]"
                >
                  {k === 'dateRange'
                    ? `Date: ${v.start ? toDisplayDate(v.start) : '…'} → ${v.end ? toDisplayDate(v.end) : '…'}`
                    : `${CHIP_LABELS[k] || k}: ${formatChipValue(v)}`}
                  <BtnChipRemove onClick={() => removeChip(k)} />
                </span>
              ))}
            {Object.keys(applied).length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        <CommonTable
          columns={TABLE_COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Pending Approvals'}
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
                approvals.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

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
          approveReasons={approveReasons}
          declineReasons={declineReasons}
        />
      )}
    </div>
  )
}

export default PendingApprovalsPage
