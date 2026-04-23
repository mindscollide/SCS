/**
 * src/pages/admin/AuditTrailPage.jsx
 * ====================================
 * Admin views a paginated audit-trail log with optional filters.
 *
 * Filter fields (all optional, per SRS):
 *  User Name         — dropdown from GetViewDetails
 *  Organization Name — dropdown from GetAllCompanies
 *  Email ID          — text; validated on blur
 *  IP Address        — text; validated on blur
 *  Date Range        — From / To (Login Date based)
 *
 * On Generate Report → calls GetAuditReport (page 0, PAGE_SIZE=10).
 * Infinite scroll loads subsequent pages inside the table.
 * Client-side filters (org / email / IP) applied to each page returned.
 *
 * View Actions → calls GetAuditSessionDetails with fK_UserLoginHistoryID.
 * Modal shows sessionInfo cards + sortable actions table from API response.
 *
 * Default sort: Login Date descending.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import CommonTable from '../../components/common/table/NormalTable'
import { ExportBtn } from '../../components/common'
import DatePicker from '../../components/common/datePicker/DatePicker'
import Select from '../../components/common/select/Select'
import Input from '../../components/common/Input/Input'
import { EMAIL_REGEX } from '../../utils/helpers'
import useLazyLoad from '../../hooks/useLazyLoad'
import {
  getViewDetails,
  getAuditReport,
  GET_AUDIT_REPORT_CODES,
  getAuditSessionDetails,
  GET_AUDIT_SESSION_DETAILS_CODES,
  exportAuditTrailReport,
  EXPORT_AUDIT_TRAIL_REPORT_CODES,
  exportAuditActionsReport,
  EXPORT_AUDIT_ACTIONS_REPORT_CODES,
  getAllCompanies,
} from '../../services/admin.service'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(100vh - 430px)'
const EMPTY_FILTERS = { user: '', org: '', email: '', ip: '', from: null, to: null }
const EMPTY_ERRORS = { email: '', ip: '' }

const INPUT_STYLE = {
  bgColor: '#ffffff',
  borderColor: '#e2e8f0',
  focusBorderColor: '#01C9A4',
}

/** Validate xxx.xxx.xxx.xxx IP format */
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** JS Date → "yyyyMMdd" string required by the API */
const toApiDate = (d) => {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** ISO string → "DD-MM-YYYY" */
const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
  } catch {
    return '—'
  }
}

/** ISO string → "HH:MM AM/PM" */
const formatTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '—'
  }
}

/**
 * Parse session datetime string from GetAuditSessionDetails.
 * API format: "yyyyMMdd HHmmss"  e.g. "20251013 103512"
 * Output:     "DD-MM-YYYY | HH:MM AM/PM"
 */
const parseSessionDateTime = (str) => {
  if (!str) return '—'
  // Strip all spaces then re-read positionally
  const s = str.replace(/\s/g, '')
  if (s.length < 8) return str
  const year = s.slice(0, 4)
  const month = s.slice(4, 6)
  const day = s.slice(6, 8)
  if (s.length < 14) return `${day}-${month}-${year}`
  const hh = parseInt(s.slice(8, 10), 10)
  const mm = s.slice(10, 12)
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh
  return `${day}-${month}-${year} | ${String(h12).padStart(2, '0')}:${mm} ${ampm}`
}

/**
 * Format action time → "HH:MM:SS"
 * Handles both a bare 6-digit string ("103512") and a full datetime ("20251013 103512").
 */
const formatActionTime = (val) => {
  if (!val) return '—'
  const s = String(val).replace(/\s/g, '')
  // Full datetime yyyyMMddHHmmss → grab the time portion
  const raw = s.length >= 14 ? s.slice(8, 14) : s
  if (raw.length < 6) return val
  return `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)}`
}

const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

/** Decode a Base64 string and trigger a browser PDF download */
const downloadBase64PDF = (base64, fileName) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob  = new Blob([bytes], { type: 'application/pdf' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = fileName || 'AuditTrailReport.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL COLS — used inside ViewActionsModal (matches GetAuditSessionDetails)
// ─────────────────────────────────────────────────────────────────────────────

const DETAIL_COLS = [
  {
    key: 'description',
    title: 'Description',
    sortable: true,
    render: (r) => (
      <span className="text-[12px] text-[#334155] max-w-[260px] block" title={r.description}>
        {r.description || '—'}
      </span>
    ),
  },
  {
    key: 'time',
    title: 'Action Time',
    sortable: true,
    render: (r) => (
      <span className="text-[12px] font-mono text-[#2f20b0]">{formatActionTime(r.time)}</span>
    ),
  },
  {
    key: 'previousValue',
    title: 'Previous Value',
    sortable: true,
    render: (r) => <span className="text-[#a0aec0]">{r.previousValue ?? '—'}</span>,
  },
  {
    key: 'updatedValue',
    title: 'Updated Value',
    sortable: true,
    render: (r) => <span className="font-medium text-[#2f20b0]">{r.updatedValue ?? '—'}</span>,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// VIEW ACTIONS MODAL — fetches GetAuditSessionDetails on open
// ─────────────────────────────────────────────────────────────────────────────

const ViewActionsModal = ({ loginHistoryId, onClose }) => {
  const [loading,      setLoading]      = useState(true)
  const [sessionData,  setSessionData]  = useState(null)
  const [error,        setError]        = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [sortCol,      setSortCol]      = useState('time')
  const [sortDir,      setSortDir]      = useState('asc')
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      const res = await getAuditSessionDetails(
        { FK_UserLoginHistoryID: loginHistoryId },
        { skipLoader: true }
      )
      setLoading(false)

      if (res.success) {
        const code = res.data?.responseResult?.responseMessage
        if (code === 'Admin_AdminServiceManager_GetAuditSessionDetails_04') {
          setSessionData(res.data.responseResult)
        } else {
          setError(GET_AUDIT_SESSION_DETAILS_CODES[code] || 'Failed to load session details.')
        }
      } else {
        setError(res.message || 'Failed to load session details.')
      }
    }
    load()
  }, [loginHistoryId])

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

  const sessionInfo = sessionData?.sessionInfo || {}

  // Export this session's actions as a PDF (ExportAuditActionsReport)
  const handleExportPdf = async () => {
    if (exportingPdf) return
    setExportingPdf(true)
    const res = await exportAuditActionsReport(
      { FK_UserLoginHistoryID: loginHistoryId },
      { skipLoader: true }
    )
    setExportingPdf(false)

    if (!res.success) { showError(res.message || 'Export failed.'); return }

    const code = res.data?.responseResult?.responseMessage
    if (code === 'Admin_AdminServiceManager_ExportAuditActionsReport_04') {
      const { fileContent, fileName } = res.data.responseResult
      downloadBase64PDF(fileContent, fileName)
      return
    }
    showError(EXPORT_AUDIT_ACTIONS_REPORT_CODES[code] || 'Export failed.')
  }

  const actions = useMemo(() => {
    const raw = Array.isArray(sessionData?.actions) ? sessionData.actions : []
    return [...raw].sort((a, b) => {
      const va = (a[sortCol] ?? '').toString().toLowerCase()
      const vb = (b[sortCol] ?? '').toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [sessionData?.actions, sortCol, sortDir])

  const INFO_CARDS = [
    ['User Name', sessionInfo.userName || '—'],
    ['Organization Name', sessionInfo.organizationName || '—'],
    ['IP Address', sessionInfo.ipAddress || sessionInfo.iPAddress || '—'],
    ['Login Date & Time', parseSessionDateTime(sessionInfo.loginDateTime)],
    ['Logout Date & Time', parseSessionDateTime(sessionInfo.logoutDateTime)],
    ['Session Duration', sessionInfo.sessionDuration || '—'],
  ]
  console.log('sessionData', sessionData)
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl
                   max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-red-500 text-[13px] font-medium">{error}</p>
            <button
              onClick={onClose}
              className="px-10 py-[10px] rounded-xl bg-[#2f20b0] hover:bg-[#251a94]
                         text-white text-[14px] font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && (
          <>
            {/* ── Static section — info cards + export (never scrolls) ── */}
            <div className="px-6 pt-6 pb-3 flex-shrink-0">
              {/* 6 session info cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {INFO_CARDS.map(([label, val]) => (
                  <div key={label} className="bg-[#e8faf6] rounded-xl px-4 py-3">
                    <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5 truncate">
                      {label}
                    </p>
                    <p className="text-[13px] font-medium text-[#2f20b0] break-words">{val}</p>
                  </div>
                ))}
              </div>

              {/* Export button */}
              <div className="flex justify-end mb-1">
                <ExportBtn
                  onExcel={() => toast.info('Export Excel')}
                  onPdf={handleExportPdf}
                  disabled={exportingPdf}
                />
              </div>
            </div>

            {/* ── Table — only the rows scroll ── */}
            <div className="px-6 pb-4">
              <CommonTable
                columns={DETAIL_COLS}
                data={actions}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={handleSort}
                scrollable
                maxHeight="calc(90vh - 320px)"
                headerBg="#2f20b0"
                headerTextColor="#ffffff"
                rowBg="#ffffff"
                rowHoverBg="#EFF3FF"
                emptyText="No action details recorded for this session."
              />
            </div>

            {/* ── Close button — always pinned at the bottom ── */}
            <div className="flex-shrink-0 flex justify-center py-5 border-t border-[#eef2f7]">
              <button
                onClick={onClose}
                className="px-14 py-[11px] rounded-xl bg-[#2f20b0] hover:bg-[#251a94]
                           text-white text-[14px] font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const AuditTrailPage = () => {
  // ── Users → User Name dropdown (GetViewDetails) ────────────────────────────
  const [allUsers, setAllUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const usersFetchedRef = useRef(false)

  useEffect(() => {
    if (usersFetchedRef.current) return
    usersFetchedRef.current = true
    const load = async () => {
      const res = await getViewDetails({ PageSize: 1000, PageNumber: 0 }, { skipLoader: true })
      if (res.success) {
        const list = res.data?.responseResult?.users || []
        setAllUsers(
          list.map((u) => ({
            id: u.userID,
            name: u.userName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          }))
        )
      }
      setLoadingUsers(false)
    }
    load()
  }, [])

  const userOptions = useMemo(
    () => [...new Set(allUsers.map((u) => u.name))].sort((a, b) => a.localeCompare(b)),
    [allUsers]
  )

  // ── Companies → Organization Name dropdown (GetAllCompanies) ───────────────
  const [orgOptions, setOrgOptions] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const companiesFetchedRef = useRef(false)

  useEffect(() => {
    if (companiesFetchedRef.current) return
    companiesFetchedRef.current = true
    const load = async () => {
      const res = await getAllCompanies(
        { PageSize: 1000, PageNumber: 0, FK_CompanyStatusID: 0 },
        { skipLoader: true }
      )
      if (res.success) {
        const code = res.data?.responseResult?.responseMessage
        if (code === 'Admin_AdminServiceManager_GetAllCompanies_03') {
          const list = res.data?.responseResult?.companies || []
          setOrgOptions(
            list
              .map((c) => c.companyName)
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b))
          )
        }
      }
      setLoadingCompanies(false)
    }
    load()
  }, [])

  // ── Filters & validation ───────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterErrors, setFilterErrors] = useState(EMPTY_ERRORS)

  const setF = useCallback((k, v) => {
    setFilters((p) => ({ ...p, [k]: v }))
    if (k === 'email' || k === 'ip') setFilterErrors((p) => ({ ...p, [k]: '' }))
  }, [])

  const handleEmailBlur = useCallback(() => {
    if (filters.email && !EMAIL_REGEX.test(filters.email))
      setFilterErrors((p) => ({ ...p, email: 'Please enter a valid email address.' }))
  }, [filters.email])

  const handleIpBlur = useCallback(() => {
    if (filters.ip && !IP_REGEX.test(filters.ip))
      setFilterErrors((p) => ({ ...p, ip: 'Please enter a valid IP address (e.g. 192.168.1.1).' }))
  }, [filters.ip])

  const dateError =
    filters.from && filters.to && filters.to <= filters.from
      ? 'Must be greater than From Date'
      : null

  const hasFilterError = !!filterErrors.email || !!filterErrors.ip || !!dateError

  // ── Table state ────────────────────────────────────────────────────────────
  const [results,      setResults]      = useState([])
  const [searched,     setSearched]     = useState(false)
  const [generating,   setGenerating]   = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [totalCount,   setTotalCount]   = useState(0)
  const [loadedPages, setLoadedPages] = useState(0) // pages already fetched (0-based count)

  // ── Live ref — always-fresh snapshot for the load-more callback ──────────
  const liveRef = useRef({})
  liveRef.current = { filters, allUsers }

  // ── useLazyLoad — owns loadingMore + sentinel ─────────────────────────────
  // offset = pages already loaded; total = total pages → hasMore = loadedPages < totalPages
  const { sentinelRef, scrollRef, loadingMore, setLoadingMore } = useLazyLoad({
    offset: loadedPages,
    total: Math.ceil(totalCount / PAGE_SIZE),
    onLoadMore: (nextPage) => {
      const { filters: f, allUsers: u } = liveRef.current
      fetchPage(nextPage, f, u, true) // nextPage = 1, 2, 3 …
    },
  })

  // ── Sort: Login Date descending by default ─────────────────────────────────
  const [sortCol, setSortCol] = useState('loginDateTime')
  const [sortDir, setSortDir] = useState('desc')

  // ── View Actions modal ─────────────────────────────────────────────────────
  const [viewHistoryId, setViewHistoryId] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Core fetch helper — used by both Generate (offset 0) and Load More (offset n)
  // offset = total raw records already fetched → sent as PageNumber
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (offset, currentFilters, users, append = false) => {
      if (append) setLoadingMore(true) // setLoadingMore from useLazyLoad

      const selectedUser = users.find((u) => u.name === currentFilters.user)

      const res = await getAuditReport(
        {
          DateFrom: toApiDate(currentFilters.from),
          DateTo: toApiDate(currentFilters.to),
          UserID: selectedUser?.id ?? 0,
          FK_AudiTrialActionID: 0,
          FK_AuditEventsID: 0,
          PageSize: PAGE_SIZE,
          PageNumber: offset, // 0, 10, 20, … (raw records already fetched)
        },
        { skipLoader: true }
      )

      if (append) setLoadingMore(false)

      if (!res.success) {
        showError(res.message || 'Failed to load audit report.')
        return false
      }

      const code = res.data?.responseResult?.responseMessage

      if (
        code === 'Admin_AdminServiceManager_GetAuditReport_03' ||
        code === 'Admin_AdminServiceManager_GetAuditReport_02'
      ) {
        const rawList = res.data?.responseResult?.auditLogs || []
        const total = res.data?.responseResult?.totalCount ?? 0

        // Client-side filters for fields not supported server-side
        let filtered = rawList
        if (currentFilters.org)
          filtered = filtered.filter(
            (r) => (r.organizationName || '').toLowerCase() === currentFilters.org.toLowerCase()
          )
        if (currentFilters.email)
          filtered = filtered.filter((r) =>
            (r.emailAddress || '').toLowerCase().includes(currentFilters.email.toLowerCase())
          )
        if (currentFilters.ip)
          filtered = filtered.filter((r) => (r.ipAddress || '') === currentFilters.ip)

        if (append) {
          setResults((prev) => [...prev, ...filtered])
          setLoadedPages((p) => p + 1)
        } else {
          setResults(filtered)
          setTotalCount(total)
          setLoadedPages(1)
          setSearched(true)
        }
        return true
      }

      showError(GET_AUDIT_REPORT_CODES[code] || res.message || 'Failed to load audit report.')
      return false
    },
    [setLoadingMore, setTotalCount]
  )

  // ── Generate Report (page 0) ───────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (hasFilterError || generating) return

    if (filters.email && !EMAIL_REGEX.test(filters.email)) {
      setFilterErrors((p) => ({ ...p, email: 'Please enter a valid email address.' }))
      return
    }
    if (filters.ip && !IP_REGEX.test(filters.ip)) {
      setFilterErrors((p) => ({ ...p, ip: 'Please enter a valid IP address (e.g. 192.168.1.1).' }))
      return
    }

    setGenerating(true)
    await fetchPage(0, filters, allUsers, false)
    setGenerating(false)
  }, [filters, allUsers, hasFilterError, generating, fetchPage])

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setFilterErrors(EMPTY_ERRORS)
    setResults([])
    setSearched(false)
    setLoadedPages(0)
    setTotalCount(0)
  }, [])

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (exportingPdf) return
    setExportingPdf(true)

    const selectedUser = allUsers.find((u) => u.name === filters.user)
    const res = await exportAuditTrailReport(
      {
        DateFrom:         toApiDate(filters.from),
        DateTo:           toApiDate(filters.to),
        UserID:           selectedUser?.id ?? 0,
        UserName:         filters.user         || '',
        OrganizationName: filters.org          || '',
        EmailAddress:     filters.email        || '',
        IPAddress:        filters.ip           || '',
      },
      { skipLoader: true }
    )
    setExportingPdf(false)

    if (!res.success) { showError(res.message || 'Export failed.'); return }

    const code = res.data?.responseResult?.responseMessage
    if (code === 'Admin_AdminServiceManager_ExportAuditTrailReport_04') {
      const { fileContent, fileName } = res.data.responseResult
      downloadBase64PDF(fileContent, fileName)
      return
    }
    showError(EXPORT_AUDIT_TRAIL_REPORT_CODES[code] || 'Export failed.')
  }, [filters, allUsers, exportingPdf])

  // ── Sort (client-side within loaded rows) ──────────────────────────────────
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

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      const va = (a[sortCol] || '').toString().toLowerCase()
      const vb = (b[sortCol] || '').toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [results, sortCol, sortDir])

  // ── Table column definitions ───────────────────────────────────────────────
  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'userName',
        title: 'User Name',
        sortable: true,
        render: (r) => (
          <span
            className="font-semibold text-[#2f20b0] block max-w-[180px] truncate"
            title={r.userName}
          >
            {r.userName || '—'}
          </span>
        ),
      },
      {
        key: 'organizationName',
        title: 'Organization Name',
        sortable: true,
        render: (r) => (
          <span className="block max-w-[180px] truncate" title={r.organizationName}>
            {r.organizationName || '—'}
          </span>
        ),
      },
      {
        key: 'emailAddress',
        title: 'Email Address',
        sortable: true,
        render: (r) => (
          <span className="block max-w-[180px] truncate text-[12px]" title={r.emailAddress}>
            {r.emailAddress || '—'}
          </span>
        ),
      },
      {
        key: 'ipAddress',
        title: 'IP Address',
        sortable: true,
        render: (r) => <span className="font-mono text-[12px]">{r.ipAddress || '—'}</span>,
      },
      {
        key: 'loginDateTime',
        title: 'Login Date',
        sortable: true,
        render: (r) => (
          <span className="text-[12px]">{formatDate(r.loginDateTime || r.createdDateTime)}</span>
        ),
      },
      {
        key: 'loginTime',
        title: 'Login Time',
        sortable: false,
        render: (r) => (
          <span className="text-[12px]">{formatTime(r.loginDateTime || r.createdDateTime)}</span>
        ),
      },
      {
        key: 'actionsCount',
        title: 'Actions Count',
        sortable: true,
        render: (r) => {
          const count = r.actionsCount ?? (Array.isArray(r.details) ? r.details.length : 0)
          return (
            <span
              className="bg-[#EFF3FF] text-[#2f20b0] px-2.5 py-0.5
                         rounded-full text-[11px] font-semibold whitespace-nowrap"
            >
              {String(count).padStart(2, '0')} Action{count !== 1 ? 's' : ''} taken
            </span>
          )
        },
      },
      {
        key: 'logoutTime',
        title: 'Logout Time',
        sortable: false,
        render: (r) => (
          <span className="text-[12px]">
            {r.logoutDateTime ? formatTime(r.logoutDateTime) : '—'}
          </span>
        ),
      },
      {
        key: 'view',
        title: 'View Actions',
        render: (r) => (
          <button
            onClick={() => setViewHistoryId(r.fK_UserLoginHistoryID)}
            className="px-3 py-1 bg-[#F5A623] hover:bg-[#e09a1a] text-white
                       rounded-md text-[12px] font-semibold transition-colors whitespace-nowrap"
          >
            View Actions
          </button>
        ),
      },
    ],
    []
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* Page heading */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#2f20b0]">Audit Trail</h1>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        {/* ── Filter form ── */}
        <div className="bg-white rounded-xl p-5 mb-4 border border-[#dde4ee]">
          {/* Row 1: User Name | Organization Name | Email ID */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Select
              label="User Name"
              value={filters.user}
              onChange={(v) => setF('user', v)}
              options={userOptions}
              placeholder={loadingUsers ? 'Loading…' : 'All Users'}
              disabled={loadingUsers}
              {...INPUT_STYLE}
            />
            <Select
              label="Organization Name"
              value={filters.org}
              onChange={(v) => setF('org', v)}
              options={orgOptions}
              placeholder={loadingCompanies ? 'Loading…' : 'All Organizations'}
              disabled={loadingCompanies}
              {...INPUT_STYLE}
            />
            <Input
              label="Email ID"
              type="email"
              value={filters.email}
              onChange={(v) => setF('email', v)}
              onBlur={handleEmailBlur}
              placeholder="email@example.com"
              maxLength={100}
              regex={/^[^\s]*$/}
              error={!!filterErrors.email}
              errorMessage={filterErrors.email}
              {...INPUT_STYLE}
              borderColor={filterErrors.email ? '#ef4444' : '#e2e8f0'}
            />
          </div>

          {/* Row 2: IP Address | From Date | To Date | Buttons */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
            <Input
              label="IP Address"
              value={filters.ip}
              onChange={(v) => setF('ip', v)}
              onBlur={handleIpBlur}
              placeholder="192.168.1.1"
              maxLength={15}
              regex={/^[0-9.]*$/}
              error={!!filterErrors.ip}
              errorMessage={filterErrors.ip}
              {...INPUT_STYLE}
              borderColor={filterErrors.ip ? '#ef4444' : '#e2e8f0'}
            />
            <div>
              <label className="block text-[12px] font-medium text-[#2f20b0] mb-1.5">
                From Date
              </label>
              <DatePicker
                value={filters.from}
                onChange={(d) => setF('from', d)}
                placeholder="dd mmm yyyy"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#2f20b0] mb-1.5">To Date</label>
              <DatePicker
                value={filters.to}
                onChange={(d) => setF('to', d)}
                placeholder="dd mmm yyyy"
                error={dateError}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                disabled={generating}
                className="px-4 py-[10px] rounded-lg border border-[#dde4ee] text-[13px]
                           font-medium text-[#2f20b0] hover:bg-[#EFF3FF] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={handleGenerate}
                disabled={hasFilterError || generating}
                className="px-5 py-[10px] rounded-lg bg-[#2f20b0] hover:bg-[#251a94] text-white
                           text-[13px] font-semibold disabled:opacity-40
                           transition-colors whitespace-nowrap flex items-center gap-2"
              >
                {generating && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Export button — only when results exist */}
        {searched && results.length > 0 && (
          <div className="flex justify-end mb-3">
            <ExportBtn
              onExcel={() => toast.info('Export Excel')}
              onPdf={handleExportPdf}
              disabled={exportingPdf}
            />
          </div>
        )}

        {/* Results table — always rendered so sentinelRef is in the DOM from mount,
            allowing useInfiniteScroll's IntersectionObserver to be set up correctly. */}
        <CommonTable
          columns={TABLE_COLS}
          data={sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={
            !searched
              ? 'Set the filters above and click Generate Report to view results.'
              : 'No audit records found for the selected criteria.'
          }
          scrollable
          maxHeight={TABLE_MAX_HEIGHT}
          scrollRef={scrollRef}
          footerSlot={
            <>
              {/* Sentinel — IntersectionObserver watches this.
                  Must always be in the DOM so the observer is set up on mount. */}
              <div ref={sentinelRef} className="h-px" />

              {/* Loading more spinner */}
              {loadingMore && (
                <div className="flex justify-center py-5">
                  <div className="w-6 h-6 border-[3px] border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
                </div>
              )}

              {/* All records loaded indicator */}
              {!loadingMore &&
                searched &&
                loadedPages >= Math.ceil(totalCount / PAGE_SIZE) &&
                totalCount > PAGE_SIZE && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* View Actions Modal */}
      {viewHistoryId !== null && (
        <ViewActionsModal loginHistoryId={viewHistoryId} onClose={() => setViewHistoryId(null)} />
      )}
    </div>
  )
}

export default AuditTrailPage
