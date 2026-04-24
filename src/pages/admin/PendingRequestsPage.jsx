/**
 * src/pages/admin/PendingRequestsPage.jsx
 * =========================================
 * Admin reviews and acts on signup requests.
 * Real API: AdminServiceManager.GetAllSignupRequest / ApprovePendingRequest / DeclinePendingRequest
 *
 * - Infinite scroll: IntersectionObserver appends next page when sentinel enters viewport
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import {
  getAllSignupRequests,
  GET_ALL_SIGNUP_REQUEST_CODES,
  approvePendingRequest,
  APPROVE_PENDING_REQUEST_CODES,
  declinePendingRequest,
  DECLINE_PENDING_REQUEST_CODES,
} from '../../services/admin.service'
import { EMAIL_REGEX, toAPIDateOnly, toDisplayDate, formatChipValue } from '../../utils/helpers'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

// Topbar 44px + main padding-top 24px + heading bar ~52px + mb-2 8px + card padding-top 20px + buffer 12px
const TABLE_MAX_HEIGHT = 'calc(100vh - 200px)'

const EMPTY_FILTERS = {
  name: '',
  org: '',
  email: '',
  role: '',
  mobile: '',
  dateRange: { start: '', end: '' },
}

const FILTER_MAP = {
  name: 'UserName',
  org: 'OrganizationName',
  role: 'RoleName',
  email: 'EmailAddress',
  mobile: 'MobileNo',
  sentOnFrom: 'SentOnFrom',
  sentOnTo: 'SentOnTo',
}

const CHIP_LABELS = {
  name: 'Name',
  org: 'Organization',
  email: 'Email',
  role: 'Role',
  mobile: 'Mobile #',
  sentOnFrom: 'From',
  sentOnTo: 'To',
}

const APPROVE_REASONS = [
  'Details are verified',
  'All documents reviewed',
  'Background check passed',
]
const DECLINE_REASONS = ['Details not verified', 'Incomplete information', 'Duplicate account']

// ─── Map API row → UI row ─────────────────────────────────────────────────────
const mapRequest = (r) => ({
  id: r.requestID,
  name: r.userName || `${r.firstName} ${r.lastName}`.trim(),
  firstName: r.firstName || '',
  lastName: r.lastName || '',
  org: r.organizationName,
  email: r.emailAddress,
  mobile: r.mobileNo,
  role: r.roleName,
  sentOn: toDisplayDate(r.sentOn),
  raw: r,
})

// ─── Page ─────────────────────────────────────────────────────────────────────
const PendingRequestsPage = () => {
  const [requests, setRequests] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [modal, setModal] = useState(null) // { request, type }
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})

  // Keep stateRef in sync — readable inside handleLoadMore without stale closure
  stateRef.current = { page, applied }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  /**
   * @param {object}  appliedFilters
   * @param {number}  pageNumber
   * @param {boolean} append — true = infinite scroll (add rows); false = replace (search/reset)
   */
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)

    const params = { PageSize: PAGE_SIZE, PageNumber: pageNumber }
    Object.entries(appliedFilters).forEach(([k, v]) => {
      if (v) params[FILTER_MAP[k]] = v
    })

    const result = await getAllSignupRequests(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load requests.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Admin_AdminServiceManager_GetAllSignupRequest_03') {
      const newRows = rr.registrationRequests.map(mapRequest)
      setRequests((prev) => (append ? [...prev, ...newRows] : newRows))
      setTotalCount(rr.totalCount)
      return
    }

    if (code === 'Admin_AdminServiceManager_GetAllSignupRequest_02') {
      if (!append) {
        setRequests([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_ALL_SIGNUP_REQUEST_CODES[code] || 'Something went wrong.', {
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
    setPage(p + 1)
    fetchData(ap, p + 1, true)
  }, [fetchData])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: requests.length < totalCount,
    loading: loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ── Filter search ─────────────────────────────────────────────────────────
  const handleSearch = () => {
    const emailVal = filters.email.trim()
    if (emailVal && !EMAIL_REGEX.test(emailVal)) return

    const newApplied = {}

    if (mainSearch.trim()) {
      newApplied.name = mainSearch.trim()
    }

    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return

      if (k === 'dateRange') {
        if (v.start || v.end) {
          // ✅ keep original range for UI
          newApplied.dateRange = v

          // ✅ also map for API
          if (v.start) newApplied.sentOnFrom = toAPIDateOnly(v.start)
          if (v.end) newApplied.sentOnTo = toAPIDateOnly(v.end)
        }
        return
      }

      if (typeof v === 'string' && v.trim()) {
        newApplied[k] = v.trim()
      }
    })

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

  const handleFilterClose = () => setFilters(EMPTY_FILTERS)

  const removeChip = (key) => {
    const next = { ...applied }

    if (key === 'dateRange') {
      delete next.dateRange
      delete next.sentOnFrom
      delete next.sentOnTo
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
      [...requests].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [requests, sortCol, sortDir]
  )

  // ── Approve / Decline submit ──────────────────────────────────────────────
  const handleSubmit = async (notes) => {
    const { request, type } = modal
    const apiFn = type === 'approve' ? approvePendingRequest : declinePendingRequest
    const CODES = type === 'approve' ? APPROVE_PENDING_REQUEST_CODES : DECLINE_PENDING_REQUEST_CODES
    const SUCCESS =
      type === 'approve'
        ? 'Admin_AdminServiceManager_ApprovePendingRequest_03'
        : 'Admin_AdminServiceManager_DeclinePendingRequest_03'

    const result = await apiFn(request.id, notes)
    const code = result.data?.responseResult?.responseMessage

    if (code === SUCCESS) {
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
      setTotalCount((c) => c - 1)
      toast.success(
        type === 'approve' ? 'Request approved successfully.' : 'Request declined successfully.',
        {
          style: { backgroundColor: '#01C9A4', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        }
      )
      setModal(null)
      return
    }

    toast.error(CODES[code] || 'Action failed. Please try again.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }

  // ── Filter fields ─────────────────────────────────────────────────────────
  const FILTER_FIELDS = [
    { key: 'name', label: 'Name', type: 'input', maxLength: 50 },
    { key: 'org', label: 'Organization', type: 'input', maxLength: 50 },
    {
      key: 'email',
      label: 'Email',
      type: 'input',
      maxLength: 50,
      validate: (v) => (v && !EMAIL_REGEX.test(v) ? 'Enter a valid email address.' : null),
    },
    { key: 'role', label: 'Role', type: 'select', options: ['Admin', 'Manager', 'Data Entry'] },
    { key: 'mobile', label: 'Mobile #', type: 'input', maxLength: 20 },
    // { key: 'sentOnFrom', label: 'Sent On (From)', type: 'date' },
    // { key: 'sentOnTo', label: 'Sent On (To)', type: 'date' },
    {
      key: 'dateRange',
      label: 'Date',
      type: 'daterange',
      placeholder: 'Select date range',
    },
  ]

  // ── Table columns ─────────────────────────────────────────────────────────
  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'name',
        title: 'Name',
        sortable: true,
      },
      { key: 'org', title: 'Organization', sortable: true },
      { key: 'email', title: 'Email', sortable: true },
      { key: 'mobile', title: 'Mobile #', sortable: true },
      {
        key: 'role',
        title: 'Role',
        sortable: true,
        center: true,
        render: (row) => <span className="whitespace-nowrap">{row.role}</span>,
      },
      {
        key: 'sentOn',
        title: 'Sent On',
        sortable: true,
        center: true,
        render: (row) => <span className="whitespace-nowrap">{row.sentOn}</span>,
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal({ request: row, type: 'approve' })}
              className="text-emerald-500 hover:text-emerald-600 transition-colors"
              title="Approve"
            >
              <CheckCircle size={20} />
            </button>
            <button
              onClick={() => setModal({ request: row, type: 'decline' })}
              className="text-red-500 hover:text-red-600 transition-colors"
              title="Decline"
            >
              <XCircle size={20} />
            </button>
          </div>
        ),
      },
    ],
    []
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Requests</h1>
          <SearchFilter
            placeholder="Search by name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="name"
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
        {/* ── Active filter chips ── */}
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
                    ? `Date: ${
                        v.start ? toDisplayDate(v.start) : '...'
                      } → ${v.end ? toDisplayDate(v.end) : '...'}`
                    : `${CHIP_LABELS[k] || k}: ${formatChipValue(v)}`}
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

        {/* ── Table — scrollable body, sticky header ── */}
        <CommonTable
          columns={TABLE_COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Pending Requests'}
          scrollable
          maxHeight={TABLE_MAX_HEIGHT}
          scrollRef={scrollRef}
          footerSlot={
            <>
              {/* Initial load — centred spinner inside the table area */}
              {loadingInitial && (
                <div className="flex justify-center py-14">
                  <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}

              {/* 1px sentinel — IntersectionObserver watches this */}
              <div ref={sentinelRef} className="h-px" />

              {/* Loading more spinner */}
              {loadingMore && (
                <div className="flex justify-center py-5">
                  <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}

              {/* All records loaded indicator */}
              {!loadingInitial &&
                !loadingMore &&
                totalCount > PAGE_SIZE &&
                requests.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* ── Approve / Decline modal ── */}
      {modal && (
        <RequestActionModal
          row={modal.request}
          type={modal.type}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          approveReasons={APPROVE_REASONS}
          declineReasons={DECLINE_REASONS}
          infoFields={[
            {
              label: 'First Name',
              value: modal.request.firstName || modal.request.name.split(' ')[0],
            },
            {
              label: 'Last Name',
              value: modal.request.lastName || modal.request.name.split(' ')[1] || '—',
            },
            { label: 'Email', key: 'email' },
            { label: 'Organization', key: 'org' },
            { label: 'Role', key: 'role' },
            { label: 'Mobile #', key: 'mobile' },
          ]}
        />
      )}
    </div>
  )
}

export default PendingRequestsPage
