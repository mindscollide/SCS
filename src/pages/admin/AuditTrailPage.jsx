/**
 * src/pages/admin/AuditTrailPage.jsx
 * ====================================
 * Admin views a paginated audit-trail log with optional filters.
 *
 * Filter fields (all optional, per SRS):
 *  User Name         — dropdown from GetViewDetails (resolved to UserID)
 *  Organization Name — dropdown of UNIQUE user organizations, also derived from
 *                      GetViewDetails. Option value = PK_UserID of a user in that
 *                      org: the API's `OrganizationID` field carries a user PK and
 *                      the backend resolves the org name from it (organizations
 *                      have no table/ID of their own — verified 2026-06-12).
 *  Email ID          — text; validated on blur (server-side partial match)
 *  IP Address        — text; validated on blur (server-side partial match)
 *  Date Range        — From / To (Login Date based, yyyyMMdd; same date allowed)
 *
 * On Generate Report → calls GetAuditReport (page 0, PAGE_SIZE=10).
 * ALL filters are applied server-side by sp_GetAuditReport — no client-side row
 * filtering (rewired 2026-06-12; counts/pagination now always match the rows).
 * Infinite scroll loads subsequent pages inside the table.
 *
 * Exports: ExportAuditTrailReport[Excel] take the SAME OrganizationID semantic
 * (changed from OrganizationName 2026-06-11; the backend resolves the org name
 * server-side and uses it for the report's Searching Criteria section).
 *
 * View Actions → calls GetAuditSessionDetails with fK_UserLoginHistoryID.
 * Modal shows sessionInfo cards + sortable actions table from API response.
 *
 * Default sort: Login Date descending (server orders by LoginDateTime DESC;
 * client sort key is `loginDate` so the header indicator matches a real column).
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import CommonTable from '../../components/common/table/NormalTable'
import { ExportBtn, BtnDark, BtnSlate, BtnGold } from '../../components/common'
import DatePicker from '../../components/common/datePicker/DatePicker'
import SearchableSelect from '../../components/common/select/SearchableSelect'
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
  EXPORT_AUDIT_TRAIL_REPORT_EXCEL_CODES,
  exportAuditActionsReport,
  EXPORT_AUDIT_ACTIONS_REPORT_CODES,
  exportAuditTrailReportExcel,
  exportAuditActionsReportExcel,
  EXPORT_AUDIT_ACTIONS_REPORT_EXCEL_CODES,
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

// Build a UTC Date from separate yyyyMMdd date + HHmmss time strings
const buildUTCDate = (dateStr, timeStr) => {
  if (!dateStr || dateStr.length < 8) return null
  const y = dateStr.slice(0, 4), mo = dateStr.slice(4, 6), d = dateStr.slice(6, 8)
  const hh = timeStr?.length >= 2 ? timeStr.slice(0, 2) : '00'
  const mi = timeStr?.length >= 4 ? timeStr.slice(2, 4) : '00'
  const sc = timeStr?.length >= 6 ? timeStr.slice(4, 6) : '00'
  const dt = new Date(`${y}-${mo}-${d}T${hh}:${mi}:${sc}Z`)
  return isNaN(dt.getTime()) ? null : dt
}

// UTC date+time → local dd-mm-yyyy (date may shift across midnight)
const formatDate = (dateStr, timeStr) => {
  const dt = buildUTCDate(dateStr, timeStr)
  if (!dt) return ''
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${dt.getFullYear()}`
}

// UTC date+time → local HH:MM:SS AM/PM
const formatTime = (timeStr, dateStr) => {
  if (!timeStr || timeStr.length < 6) return ''
  const dt = buildUTCDate(dateStr || '20260101', timeStr)
  if (!dt) return ''
  return dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

/**
 * Parse session datetime string from GetAuditSessionDetails.
 * API format: "yyyyMMdd HHmmss"  e.g. "20251013 103512" (UTC)
 * Output:     "DD-MM-YYYY | HH:MM AM/PM" (local timezone)
 */
const parseSessionDateTime = (str) => {
  if (!str) return '—'
  const s = str.replace(/\s/g, '')
  if (s.length < 8) return str
  const dt = buildUTCDate(s.slice(0, 8), s.length >= 14 ? s.slice(8, 14) : null)
  if (!dt) return str
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const year = dt.getFullYear()
  if (s.length < 14) return `${day}-${month}-${year}`
  const hh = dt.getHours()
  const mm = String(dt.getMinutes()).padStart(2, '0')
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh
  return `${day}-${month}-${year} | ${String(h12).padStart(2, '0')}:${mm} ${ampm}`
}

/**
 * Format action time → local "HH:MM:SS AM/PM"
 * Handles both a bare 6-digit string ("103512") and a full datetime ("20251013 103512").
 * All values are UTC — converted to user's local timezone.
 */
const formatActionTime = (val) => {
  if (!val) return '—'
  const s = String(val).replace(/\s/g, '')
  const dateStr = s.length >= 14 ? s.slice(0, 8) : null
  const timeStr = s.length >= 14 ? s.slice(8, 14) : s
  if (timeStr.length < 6) return val
  const dt = buildUTCDate(dateStr || '20260101', timeStr)
  if (!dt) return val
  return dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

/** Decode a Base64 string and trigger a browser PDF download */
const downloadBase64PDF = (base64, fileName) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'AuditTrailReport.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Decode a Base64 string and trigger a browser Excel download */
const downloadBase64Excel = (base64, fileName) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'AuditTrailReport.xlsx'

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
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState(null)
  const [error, setError] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [sortCol, setSortCol] = useState('time')
  const [sortDir, setSortDir] = useState('asc')
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

    if (!res.success) {
      showError(res.message || 'Export failed.')
      return
    }

    const code = res.data?.responseResult?.responseMessage
    if (code === 'Admin_AdminServiceManager_ExportAuditActionsReport_04') {
      const { fileContent, fileName } = res.data.responseResult
      downloadBase64PDF(fileContent, fileName)
      return
    }
    showError(EXPORT_AUDIT_ACTIONS_REPORT_CODES[code] || 'Export failed.')
  }

  // Export this session's actions as a PDF (ExportAuditActionsReport)
  const handleExportExcel = async () => {
    if (exportingExcel) return
    setExportingExcel(true)
    const res = await exportAuditActionsReportExcel(
      { FK_UserLoginHistoryID: loginHistoryId },
      { skipLoader: true }
    )
    setExportingExcel(false)

    if (!res.success) {
      showError(res.message || 'Export failed.')
      return
    }

    const code = res.data?.responseResult?.responseMessage
    if (code === 'Admin_AdminServiceManager_ExportAuditActionsReportExcel_04') {
      const { fileContent, fileName } = res.data.responseResult
      downloadBase64Excel(fileContent, fileName)
      return
    }
    showError(EXPORT_AUDIT_ACTIONS_REPORT_EXCEL_CODES[code] || 'Export failed.')
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
            <BtnDark size="xl" style={{ borderRadius: '12px' }} onClick={onClose}>
              Close
            </BtnDark>
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
                  onExcel={handleExportExcel}
                  onPdf={handleExportPdf}
                  disabled={exportingPdf || exportingExcel}
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
              <BtnDark style={{ padding: '11px 56px', borderRadius: '12px' }} onClick={onClose}>
                Close
              </BtnDark>
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
            organizationName: u.organizationName || u.companyName || '', //
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

  // ── Organization dropdown — unique orgs derived from the users list ────────
  // The API's OrganizationID carries the PK_UserID of the picked option; the
  // backend resolves that user's OrganizationName and filters sessions by it
  // (organizations have no table/ID of their own). One option per unique org
  // name, valued with the first user seen in that org.
  const orgOptions = useMemo(() => {
    const seen = new Map()
    allUsers.forEach((u) => {
      const org = (u.organizationName || '').trim()
      if (org && !seen.has(org.toLowerCase()))
        seen.set(org.toLowerCase(), { label: org, value: u.id })
    })
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [allUsers])

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
    filters.from && filters.to && filters.to < filters.from
      ? 'Must be greater than or equal to From Date'
      : null

  const hasFilterError = !!filterErrors.email || !!filterErrors.ip || !!dateError

  // ── Table state ────────────────────────────────────────────────────────────
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const [totalCount, setTotalCount] = useState(0)
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

  // ── Sort: Login Date descending by default (matches the server's
  //    LoginDateTime DESC order; key must be a real column so the header
  //    indicator renders) ──────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('loginDate')
  const [sortDir, setSortDir] = useState('desc')

  // ── View Actions modal ─────────────────────────────────────────────────────
  const [viewHistoryId, setViewHistoryId] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // Core fetch helper — used by both Generate (page 0) and Load More (page n).
  // pageNumber is a 0-based page INDEX — the backend multiplies by PageSize.
  // ALL filters are server-side (sp_GetAuditReport) — rows append as-is, so
  // totalCount and the infinite-scroll math always match what is displayed.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (pageNumber, currentFilters, users, append = false) => {
      if (append) setLoadingMore(true) // setLoadingMore from useLazyLoad

      const selectedUser = users.find((u) => u.name === currentFilters.user)

      const res = await getAuditReport(
        {
          UserID: selectedUser?.id ?? 0,
          // OrganizationID = PK_UserID of the picked Organization option — the
          // backend resolves the org name from it (see page header note).
          OrganizationID: currentFilters.org || 0,
          EmailAddress: currentFilters.email || '',
          IPAddress: currentFilters.ip || '',
          DateFrom: toApiDate(currentFilters.from),
          DateTo: toApiDate(currentFilters.to),
          PageSize: PAGE_SIZE,
          PageNumber: pageNumber,
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
        const rows = res.data?.responseResult?.auditLogs || []
        const total = res.data?.responseResult?.totalCount ?? 0

        if (append) {
          setResults((prev) => [...prev, ...rows])
          setLoadedPages((p) => p + 1)
        } else {
          setResults(rows)
          setTotalCount(total)
          setLoadedPages(1)
          setSearched(true)
        }
        return true
      }

      showError(GET_AUDIT_REPORT_CODES[code] || res.message || 'Failed to load audit report.')
      return false
    },
    [setLoadingMore]
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
        DateFrom: toApiDate(filters.from),
        DateTo: toApiDate(filters.to),
        UserID: selectedUser?.id ?? 0,
        UserName: filters.user || '',
        // Same OrganizationID semantic as the listing (PK_UserID of the picked option)
        OrganizationID: filters.org || 0,
        EmailAddress: filters.email || '',
        IPAddress: filters.ip || '',
      },
      { skipLoader: true }
    )
    setExportingPdf(false)

    if (!res.success) {
      showError(res.message || 'Export failed.')
      return
    }

    const code = res.data?.responseResult?.responseMessage
    if (code === 'Admin_AdminServiceManager_ExportAuditTrailReport_04') {
      const { fileContent, fileName } = res.data.responseResult
      downloadBase64PDF(fileContent, fileName)
      return
    }
    showError(EXPORT_AUDIT_TRAIL_REPORT_CODES[code] || 'Export failed.')
  }, [filters, allUsers, exportingPdf])

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportExcel = useCallback(async () => {
    if (exportingExcel) return
    setExportingExcel(true)

    const selectedUser = allUsers.find((u) => u.name === filters.user)
    const res = await exportAuditTrailReportExcel(
      {
        DateFrom: toApiDate(filters.from),
        DateTo: toApiDate(filters.to),
        UserID: selectedUser?.id ?? 0,
        UserName: filters.user || '',
        // Same OrganizationID semantic as the listing (PK_UserID of the picked option)
        OrganizationID: filters.org || 0,
        EmailAddress: filters.email || '',
        IPAddress: filters.ip || '',
      },
      { skipLoader: true }
    )
    setExportingExcel(false)

    if (!res.success) {
      showError(res.message || 'Export failed.')
      return
    }

    const code = res.data?.responseResult?.responseMessage
    if (code === 'Admin_AdminServiceManager_ExportAuditTrailReportExcel_04') {
      const { fileContent, fileName } = res.data.responseResult
      downloadBase64Excel(fileContent, fileName)
      return
    }
    showError(EXPORT_AUDIT_TRAIL_REPORT_EXCEL_CODES[code] || 'Export failed.')
  }, [filters, allUsers, exportingExcel])

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
            {r.userName || ''}
          </span>
        ),
      },
      {
        key: 'organizationName',
        title: 'Organization Name',
        sortable: true,
        render: (r) => (
          <span className="block max-w-[180px] truncate" title={r.organizationName}>
            {r.organizationName || ''}
          </span>
        ),
      },
      {
        key: 'emailAddress',
        title: 'Email Address',
        sortable: true,
        render: (r) => (
          <span className="block max-w-[180px] truncate text-[12px]" title={r.emailAddress}>
            {r.emailAddress || ''}
          </span>
        ),
      },
      {
        key: 'ipAddress',
        title: 'IP Address',
        sortable: true,
        render: (r) => <span className="font-mono text-[12px]">{r.ipAddress || ''}</span>,
      },
      {
        key: 'loginDate',
        title: 'Login Date',
        sortable: true,
        render: (r) => (
          <span className="text-[12px]">{r.loginDate ? formatDate(r.loginDate, r.loginTime) : ''}</span>
        ),
      },
      {
        key: 'loginTime',
        title: 'Login Time',
        sortable: false,
        render: (r) => (
          <span className="text-[12px] inline-block min-w-[80px]">
            {r.loginTime ? formatTime(r.loginTime, r.loginDate) : ''}
          </span>
        ),
      },
      {
        key: 'actionsCount',
        title: 'Actions Count',
        sortable: true,
        render: (r) => {
          // SP returns a numeric count (string, possibly zero-padded). If the
          // value ever arrives pre-formatted as text, show it untouched rather
          // than appending a second "Actions taken" suffix.
          const n = Number(r.actionsCount)
          const label = Number.isFinite(n)
            ? `${String(n).padStart(2, '0')} Action${n === 1 ? '' : 's'} taken`
            : String(r.actionsCount ?? '—')
          return (
            <span
              className="bg-[#EFF3FF] text-[#2f20b0] px-2.5 py-0.5
                         rounded-full text-[11px] font-semibold whitespace-nowrap"
            >
              {label}
            </span>
          )
        },
      },
      {
        key: 'logoutTime',
        title: 'Logout Time',
        sortable: false,
        render: (r) => (
          <span className="text-[12px]">{r.logoutTime ? formatTime(r.logoutTime, r.loginDate) : ''}</span>
        ),
      },
      {
        key: 'view',
        title: 'View Actions',
        render: (r) => (
          <BtnGold
            size="xs"
            onClick={() => setViewHistoryId(r.fK_UserLoginHistoryID)}
            className="whitespace-nowrap"
          >
            View Actions
          </BtnGold>
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
            <SearchableSelect
              label="User Name"
              value={filters.user}
              onChange={(v) => setF('user', v)}
              options={userOptions}
              placeholder={loadingUsers ? 'Loading…' : 'All Users'}
              disabled={loadingUsers}
              {...INPUT_STYLE}
            />
            <SearchableSelect
              label="Organization Name"
              value={filters.org}
              onChange={(v) => setF('org', v)}
              options={orgOptions} // {label: orgName, value: PK_UserID} — see header note
              placeholder={loadingUsers ? 'Loading…' : 'All Organizations'}
              disabled={loadingUsers}
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
              <BtnSlate size="sm" textColor="#2f20b0" disabled={generating} onClick={handleClear}>
                Clear
              </BtnSlate>
              <BtnDark
                size="md"
                loading={generating}
                disabled={hasFilterError || generating}
                onClick={handleGenerate}
                className="whitespace-nowrap"
              >
                Generate Report
              </BtnDark>
            </div>
          </div>
        </div>

        {/* Export button — only when results exist */}
        {searched && results.length > 0 && (
          <div className="flex justify-end mb-3">
            <ExportBtn
              onExcel={handleExportExcel}
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
