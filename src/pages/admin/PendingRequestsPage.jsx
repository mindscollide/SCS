/**
 * src/pages/admin/PendingRequestsPage.jsx
 * =========================================
 * Admin reviews and acts on signup requests.
 * Real API: AdminServiceManager.GetAllSignupRequest / ApprovePendingRequest / DeclinePendingRequest
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import {
  getAllSignupRequests,  GET_ALL_SIGNUP_REQUEST_CODES,
  approvePendingRequest, APPROVE_PENDING_REQUEST_CODES,
  declinePendingRequest, DECLINE_PENDING_REQUEST_CODES,
} from '../../services/admin.service'
import { EMAIL_REGEX, toAPIDateOnly, toDisplayDate, formatChipValue } from '../../utils/helpers'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

const EMPTY_FILTERS = {
  name:        '',
  org:         '',
  email:       '',
  role:        '',
  mobile:      '',
  sentOnFrom:  '',
  sentOnTo:    '',
}

const FILTER_MAP = {
  name:       'UserName',
  org:        'OrganizationName',
  role:       'RoleName',
  email:      'EmailAddress',
  mobile:     'MobileNo',
  sentOnFrom: 'SentOnFrom',
  sentOnTo:   'SentOnTo',
}

const CHIP_LABELS = {
  name:       'Name',
  org:        'Organization',
  email:      'Email',
  role:       'Role',
  mobile:     'Mobile #',
  sentOnFrom: 'From',
  sentOnTo:   'To',
}

const APPROVE_REASONS = ['Details are verified', 'All documents reviewed', 'Background check passed']
const DECLINE_REASONS = ['Details not verified', 'Incomplete information', 'Duplicate account']

// ─── Map API row → UI row ─────────────────────────────────────────────────────
const mapRequest = (r) => ({
  id:     r.requestID,
  name:   r.userName || `${r.firstName} ${r.lastName}`.trim(),
  firstName: r.firstName || '',
  lastName:  r.lastName  || '',
  org:    r.organizationName,
  email:  r.emailAddress,
  mobile: r.mobileNo,
  role:   r.roleName,
  sentOn: toDisplayDate(r.sentOn),
  raw:    r,
})

// ─── Page ─────────────────────────────────────────────────────────────────────
const PendingRequestsPage = () => {
  const [requests,   setRequests]   = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page,       setPage]       = useState(0)
  const [sortCol,    setSortCol]    = useState('name')
  const [sortDir,    setSortDir]    = useState('asc')
  const [modal,      setModal]      = useState(null) // { request, type }
  const [mainSearch, setMainSearch] = useState('')
  const [filters,    setFilters]    = useState(EMPTY_FILTERS)
  const [applied,    setApplied]    = useState({})

  const hasFetched = useRef(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0) => {
    const params = { PageSize: PAGE_SIZE, PageNumber: pageNumber }
    Object.entries(appliedFilters).forEach(([k, v]) => {
      if (v) params[FILTER_MAP[k]] = v
    })

    const result = await getAllSignupRequests(params)

    if (!result.success) {
      toast.error(result.message || 'Failed to load requests.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const rr   = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Admin_AdminServiceManager_GetAllSignupRequest_03') {
      setRequests(rr.registrationRequests.map(mapRequest))
      setTotalCount(rr.totalCount)
      return
    }

    if (code === 'Admin_AdminServiceManager_GetAllSignupRequest_02') {
      setRequests([])
      setTotalCount(0)
      return
    }

    toast.error(GET_ALL_SIGNUP_REQUEST_CODES[code] || 'Something went wrong.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
  }, [fetchData])

  // ── Filter search ─────────────────────────────────────────────────────────
  const handleSearch = () => {
    const emailVal = filters.email.trim()
    if (emailVal && !EMAIL_REGEX.test(emailVal)) {
      // validation handled inline by SearchFilter via validate prop
      return
    }
    const newApplied = {}
    if (mainSearch.trim()) newApplied.name = mainSearch.trim()
    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return
      if (v instanceof Date) newApplied[k] = toAPIDateOnly(v)   // "YYYYMMDD"
      else if (typeof v === 'string' && v.trim()) newApplied[k] = v.trim()
    })
    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0)
    setFilters(EMPTY_FILTERS)
  }

  const handleReset = () => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchData({}, 0)
  }

  const handleFilterClose = () => setFilters(EMPTY_FILTERS)

  const removeChip = (key) => {
    const next = { ...applied }
    delete next[key]
    setApplied(next)
    setPage(0)
    fetchData(next, 0)
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const handlePageChange = (newPage) => {
    setPage(newPage)
    fetchData(applied, newPage)
  }

  // ── Sort (client-side within current page) ────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = useMemo(() =>
    [...requests].sort((a, b) => {
      const va = (a[sortCol] || '').toLowerCase()
      const vb = (b[sortCol] || '').toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }), [requests, sortCol, sortDir])

  // ── Approve / Decline submit ──────────────────────────────────────────────
  const handleSubmit = async (notes) => {
    const { request, type } = modal
    const apiFn   = type === 'approve' ? approvePendingRequest : declinePendingRequest
    const CODES   = type === 'approve' ? APPROVE_PENDING_REQUEST_CODES : DECLINE_PENDING_REQUEST_CODES
    const SUCCESS = type === 'approve'
      ? 'Admin_AdminServiceManager_ApprovePendingRequest_03'
      : 'Admin_AdminServiceManager_DeclinePendingRequest_03'

    const result = await apiFn(request.id, notes)
    const code   = result.data?.responseResult?.responseMessage

    if (code === SUCCESS) {
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
      setTotalCount((c) => c - 1)
      toast.success(
        type === 'approve' ? 'Request approved successfully.' : 'Request declined successfully.',
        { style: { backgroundColor: '#01C9A4', color: '#fff' }, progressStyle: { backgroundColor: '#ffffff50' } }
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
    { key: 'name',       label: 'Name',         type: 'input',  maxLength: 50 },
    { key: 'org',        label: 'Organization',  type: 'input',  maxLength: 50 },
    { key: 'email',      label: 'Email',         type: 'input',  maxLength: 50,
      validate: (v) => v && !EMAIL_REGEX.test(v) ? 'Enter a valid email address.' : null },
    { key: 'role',       label: 'Role',          type: 'select', options: ['Admin', 'Manager', 'Data Entry'] },
    { key: 'mobile',     label: 'Mobile #',      type: 'input',  maxLength: 20 },
    { key: 'sentOnFrom', label: 'Sent On (From)', type: 'date' },
    { key: 'sentOnTo',   label: 'Sent On (To)',   type: 'date' },
  ]

  // ── Table columns ─────────────────────────────────────────────────────────
  const TABLE_COLS = useMemo(() => [
    {
      key: 'name', title: 'Name', sortable: true,
      render: (row) => <span className="font-semibold text-[#041E66]">{row.name}</span>,
    },
    { key: 'org',    title: 'Organization', sortable: true },
    { key: 'email',  title: 'Email',        sortable: true },
    { key: 'mobile', title: 'Mobile #',     sortable: true },
    {
      key: 'role', title: 'Role', sortable: true,
      render: (row) => (
        <span className="bg-blue-100 text-[#0B39B5] px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
          {row.role}
        </span>
      ),
    },
    { key: 'sentOn', title: 'Sent On', sortable: true },
    {
      key: 'actions', title: 'Actions',
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
  ], [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Requests</h1>
          <SearchFilter
            placeholder="Search by name..."
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
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k] || k}: {formatChipValue(v)}
                <button onClick={() => removeChip(k)} className="hover:text-white/70 transition-colors">
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
          emptyText="No Pending Requests"
        />

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-[13px] text-[#64748b]">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[#dde4ee]
                           text-[#041E66] hover:bg-[#EFF3FF] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i)}
                  className={`w-8 h-8 rounded-lg text-[13px] font-medium transition-colors
                    ${i === page
                      ? 'bg-[#0B39B5] text-white'
                      : 'border border-[#dde4ee] text-[#041E66] hover:bg-[#EFF3FF]'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[#dde4ee]
                           text-[#041E66] hover:bg-[#EFF3FF] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
            { label: 'First Name',   value: modal.request.firstName || modal.request.name.split(' ')[0] },
            { label: 'Last Name',    value: modal.request.lastName  || modal.request.name.split(' ')[1] || '—' },
            { label: 'Email',        key: 'email'  },
            { label: 'Organization', key: 'org'    },
            { label: 'Role',         key: 'role'   },
            { label: 'Mobile #',     key: 'mobile' },
          ]}
        />
      )}
    </div>
  )
}

export default PendingRequestsPage
