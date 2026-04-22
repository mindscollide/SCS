/**
 * src/pages/admin/AuditTrailPage.jsx
 * ====================================
 * Admin views a paginated audit-trail log with optional filters.
 *
 * Filter fields (all optional, per SRS):
 *  User Name         — dropdown, alphabetical, from GetViewDetails
 *  Organization Name — dropdown, alphabetical (unique orgs from GetViewDetails)
 *  Email ID          — text; validated on blur
 *  IP Address        — text; validated on blur
 *  Date Range        — From / To (Login Date based)
 *
 * On Generate Report → calls GetAuditReport with UserID + date range.
 * Additional filters (org / email / IP) are applied client-side on the
 * returned results when the corresponding fields exist in the API response.
 *
 * Default sort: Login Date descending.
 *
 * Table columns (SRS):
 *  User Name | Organization Name | Email Address | IP Address |
 *  Login Date | Login Time | Actions Count | Logout Time | View Actions
 *
 * View Actions Modal (SRS):
 *  Header cards : User Name, Organization Name, IP Address,
 *                 Login Date & Time, Logout Date & Time, Session Duration
 *  Export button
 *  Detail table : Description | Action Time | Previous Value | Updated Value
 *  Close button
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import CommonTable from '../../components/common/table/NormalTable'
import { ExportBtn } from '../../components/common'
import DatePicker from '../../components/common/datePicker/DatePicker'
import Select from '../../components/common/select/Select'
import Input from '../../components/common/Input/Input'
import { EMAIL_REGEX } from '../../utils/helpers'
import {
  getViewDetails,
  getAuditReport,
  GET_AUDIT_REPORT_CODES,
} from '../../services/admin.service'

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** JS Date → "yyyyMMdd" string required by the API */
const toApiDate = (d) => {
  if (!d) return ''
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/** ISO string → "DD-MM-YYYY" */
const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
  } catch { return '—' }
}

/** ISO string → "HH:MM AM/PM" */
const formatTime = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch { return '—' }
}

/** ISO string → "DD-MM-YYYY | HH:MM AM/PM" */
const formatDateTime = (iso) => {
  if (!iso) return '—'
  return `${formatDate(iso)} | ${formatTime(iso)}`
}

/** Validate xxx.xxx.xxx.xxx IP format */
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/

const showError = (msg) =>
  toast.error(msg, {
    style:         { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FILTERS = { user: '', org: '', email: '', ip: '', from: null, to: null }
const EMPTY_ERRORS  = { email: '', ip: '' }

const INPUT_STYLE = {
  bgColor:          '#ffffff',
  borderColor:      '#e2e8f0',
  focusBorderColor: '#01C9A4',
}

/** Detail table columns inside View Actions modal */
const DETAIL_COLS = [
  {
    key:      'description',
    title:    'Description',
    sortable: true,
    render:   (r) => (
      <span className="text-[12px] text-[#334155] max-w-[260px] block" title={r.description}>
        {r.description || r.fieldName || '—'}
      </span>
    ),
  },
  {
    key:      'actionTime',
    title:    'Action Time',
    sortable: true,
    render:   (r) => (
      <span className="text-[12px] font-mono text-[#041E66]">
        {r.actionTime || formatTime(r.createdDateTime) || '—'}
      </span>
    ),
  },
  {
    key:      'previousValue',
    title:    'Previous Value',
    sortable: true,
    render:   (r) => (
      <span className="text-[#a0aec0]">{r.previousValue ?? r.oldValue ?? '—'}</span>
    ),
  },
  {
    key:      'updatedValue',
    title:    'Updated Value',
    sortable: true,
    render:   (r) => (
      <span className="font-medium text-[#041E66]">{r.updatedValue ?? r.newValue ?? '—'}</span>
    ),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// VIEW ACTIONS MODAL
// ─────────────────────────────────────────────────────────────────────────────

const ViewActionsModal = ({ row, onClose }) => {
  const [sortCol, setSortCol] = useState('actionTime')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      else { setSortCol(col); setSortDir('asc') }
    },
    [sortCol]
  )

  // Normalise details — handle both array shapes the API might return
  const details = useMemo(() => {
    const raw = Array.isArray(row.details) ? row.details : []
    return [...raw].sort((a, b) => {
      const va = (a[sortCol] ?? a.fieldName ?? '').toString().toLowerCase()
      const vb = (b[sortCol] ?? b.fieldName ?? '').toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [row.details, sortCol, sortDir])

  const INFO_CARDS = [
    ['User Name',           row.userName             || '—'],
    ['Organization Name',   row.organizationName     || '—'],
    ['IP Address',          row.ipAddress            || '—'],
    ['Login Date & Time',   formatDateTime(row.loginDateTime  || row.createdDateTime)],
    ['Logout Date & Time',  row.logoutDateTime ? formatDateTime(row.logoutDateTime) : '—'],
    ['Session Duration',    row.sessionDuration      || '—'],
  ]

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">

          {/* ── 6 session info cards ── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {INFO_CARDS.map(([label, val]) => (
              <div key={label} className="bg-[#e8faf6] rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5 truncate">{label}</p>
                <p className="text-[13px] font-medium text-[#041E66] break-words">{val}</p>
              </div>
            ))}
          </div>

          {/* ── Export button ── */}
          <div className="flex justify-end mb-3">
            <ExportBtn
              onExcel={() => toast.info('Export Excel')}
              onPdf={() => toast.info('Export PDF')}
            />
          </div>

          {/* ── Details table ── */}
          <CommonTable
            columns={DETAIL_COLS}
            data={details}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            headerBg="#0B39B5"
            headerTextColor="#ffffff"
            rowBg="#ffffff"
            rowHoverBg="#EFF3FF"
            emptyText="No action details recorded for this entry."
          />
        </div>

        {/* ── Close button ── */}
        <div className="flex justify-center py-5 border-t border-[#eef2f7]">
          <button
            onClick={onClose}
            className="px-14 py-[11px] rounded-xl bg-[#041E66] hover:bg-[#0B39B5]
                       text-white text-[14px] font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const AuditTrailPage = () => {

  // ── Users + Orgs from GetViewDetails ─────────────────────────────────────
  const [allUsers,     setAllUsers]     = useState([])   // [{ id, name, org, email }]
  const [loadingUsers, setLoadingUsers] = useState(true)
  const usersFetchedRef = useRef(false)

  useEffect(() => {
    if (usersFetchedRef.current) return
    usersFetchedRef.current = true

    const load = async () => {
      setLoadingUsers(true)
      const res = await getViewDetails(
        { PageSize: 1000, PageNumber: 0 },
        { skipLoader: true }
      )
      if (res.success) {
        const list = res.data?.responseResult?.users || []
        setAllUsers(
          list.map((u) => ({
            id:    u.userID,
            name:  u.userName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
            org:   u.organizationName || '',
            email: u.emailAddress     || '',
          }))
        )
      }
      setLoadingUsers(false)
    }
    load()
  }, [])

  /** Sorted unique user names for the User Name dropdown */
  const userOptions = useMemo(
    () => [...new Set(allUsers.map((u) => u.name))].sort((a, b) => a.localeCompare(b)),
    [allUsers]
  )

  /** Sorted unique org names for the Organization Name dropdown */
  const orgOptions = useMemo(
    () => [...new Set(allUsers.map((u) => u.org).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [allUsers]
  )

  // ── Filter + error state ──────────────────────────────────────────────────
  const [filters,      setFilters]      = useState(EMPTY_FILTERS)
  const [filterErrors, setFilterErrors] = useState(EMPTY_ERRORS)

  const setF = useCallback((k, v) => {
    setFilters((p) => ({ ...p, [k]: v }))
    // Clear the field's inline error whenever the user edits it
    if (k === 'email' || k === 'ip') {
      setFilterErrors((p) => ({ ...p, [k]: '' }))
    }
  }, [])

  // Email validation on blur
  const handleEmailBlur = useCallback(() => {
    if (filters.email && !EMAIL_REGEX.test(filters.email)) {
      setFilterErrors((p) => ({ ...p, email: 'Please enter a valid email address.' }))
    }
  }, [filters.email])

  // IP address validation on blur
  const handleIpBlur = useCallback(() => {
    if (filters.ip && !IP_REGEX.test(filters.ip)) {
      setFilterErrors((p) => ({ ...p, ip: 'Please enter a valid IP address (e.g. 192.168.1.1).' }))
    }
  }, [filters.ip])

  // Date range validation
  const dateError =
    filters.from && filters.to && filters.to <= filters.from
      ? 'Must be greater than From Date'
      : null

  const hasFilterError =
    !!filterErrors.email || !!filterErrors.ip || !!dateError

  // ── Table state ───────────────────────────────────────────────────────────
  const [results,    setResults]    = useState([])
  const [searched,   setSearched]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [viewRow,    setViewRow]    = useState(null)

  // ── Sort: Login Date descending by default ────────────────────────────────
  const [sortCol, setSortCol] = useState('loginDateTime')
  const [sortDir, setSortDir] = useState('desc')

  // ── Generate Report ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (hasFilterError || generating) return

    // Block if inline errors exist (typed but not blurred yet)
    if (filters.email && !EMAIL_REGEX.test(filters.email)) {
      setFilterErrors((p) => ({ ...p, email: 'Please enter a valid email address.' }))
      return
    }
    if (filters.ip && !IP_REGEX.test(filters.ip)) {
      setFilterErrors((p) => ({ ...p, ip: 'Please enter a valid IP address (e.g. 192.168.1.1).' }))
      return
    }

    setGenerating(true)

    const selectedUser = allUsers.find((u) => u.name === filters.user)

    const res = await getAuditReport(
      {
        DateFrom:             toApiDate(filters.from),
        DateTo:               toApiDate(filters.to),
        UserID:               selectedUser?.id ?? 0,
        FK_AudiTrialActionID: 0,
        FK_AuditEventsID:     0,
        PageSize:             1000,
        PageNumber:           0,
      },
      { skipLoader: true }
    )

    setGenerating(false)

    if (!res.success) {
      showError(res.message || 'Failed to load audit report.')
      return
    }

    const code = res.data?.responseResult?.responseMessage

    if (
      code === 'Admin_AdminServiceManager_GetAuditReport_03' ||
      code === 'Admin_AdminServiceManager_GetAuditReport_02'
    ) {
      let list = res.data?.responseResult?.auditLogs || []

      // ── Client-side filters for fields not supported server-side ──
      if (filters.org) {
        list = list.filter((r) =>
          (r.organizationName || '').toLowerCase() === filters.org.toLowerCase()
        )
      }
      if (filters.email) {
        list = list.filter((r) =>
          (r.emailAddress || '').toLowerCase().includes(filters.email.toLowerCase())
        )
      }
      if (filters.ip) {
        list = list.filter((r) =>
          (r.ipAddress || '') === filters.ip
        )
      }

      setResults(list)
      setSearched(true)
    } else {
      showError(
        GET_AUDIT_REPORT_CODES[code] ||
        res.message ||
        'Failed to load audit report.'
      )
    }
  }, [filters, allUsers, hasFilterError, generating])

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setFilterErrors(EMPTY_ERRORS)
    setResults([])
    setSearched(false)
  }, [])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      else { setSortCol(col); setSortDir('asc') }
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
        key:      'userName',
        title:    'User Name',
        sortable: true,
        render:   (r) => (
          <span
            className="font-semibold text-[#041E66] block max-w-[180px] truncate"
            title={r.userName}
          >
            {r.userName || '—'}
          </span>
        ),
      },
      {
        key:      'organizationName',
        title:    'Organization Name',
        sortable: true,
        render:   (r) => (
          <span
            className="block max-w-[180px] truncate"
            title={r.organizationName}
          >
            {r.organizationName || '—'}
          </span>
        ),
      },
      {
        key:      'emailAddress',
        title:    'Email Address',
        sortable: true,
        render:   (r) => (
          <span
            className="block max-w-[180px] truncate text-[12px]"
            title={r.emailAddress}
          >
            {r.emailAddress || '—'}
          </span>
        ),
      },
      {
        key:      'ipAddress',
        title:    'IP Address',
        sortable: true,
        render:   (r) => (
          <span className="font-mono text-[12px]">{r.ipAddress || '—'}</span>
        ),
      },
      {
        key:      'loginDateTime',
        title:    'Login Date',
        sortable: true,
        render:   (r) => (
          <span className="text-[12px]">
            {formatDate(r.loginDateTime || r.createdDateTime)}
          </span>
        ),
      },
      {
        key:      'loginTime',
        title:    'Login Time',
        sortable: false,
        render:   (r) => (
          <span className="text-[12px]">
            {formatTime(r.loginDateTime || r.createdDateTime)}
          </span>
        ),
      },
      {
        key:      'actionsCount',
        title:    'Actions Count',
        sortable: true,
        render:   (r) => {
          const count = r.actionsCount ?? (Array.isArray(r.details) ? r.details.length : 0)
          return (
            <span
              className="bg-blue-100 text-[#0B39B5] px-2.5 py-0.5
                         rounded-full text-[11px] font-semibold whitespace-nowrap"
            >
              {String(count).padStart(2, '0')} Action{count !== 1 ? 's' : ''} taken
            </span>
          )
        },
      },
      {
        key:      'logoutTime',
        title:    'Logout Time',
        sortable: false,
        render:   (r) => (
          <span className="text-[12px]">
            {r.logoutDateTime ? formatTime(r.logoutDateTime) : '—'}
          </span>
        ),
      },
      {
        key:    'view',
        title:  'View Actions',
        render: (r) => (
          <button
            onClick={() => setViewRow(r)}
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
      {/* ── Page heading ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Audit Trail</h1>
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
              <label className="block text-[12px] font-semibold text-[#041E66] mb-1.5">
                From Date
              </label>
              <DatePicker
                value={filters.from}
                onChange={(d) => setF('from', d)}
                placeholder="dd mmm yyyy"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#041E66] mb-1.5">
                To Date
              </label>
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
                           font-medium text-[#041E66] hover:bg-[#EFF3FF] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={handleGenerate}
                disabled={hasFilterError || generating}
                className="px-5 py-[10px] rounded-lg bg-[#0B39B5] text-white text-[13px]
                           font-semibold hover:bg-[#0a2e94] disabled:opacity-40
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

        {/* ── Export button — only when results exist ── */}
        {searched && results.length > 0 && (
          <div className="flex justify-end mb-3">
            <ExportBtn
              onExcel={() => toast.info('Export Excel')}
              onPdf={() => toast.info('Export PDF')}
            />
          </div>
        )}

        {/* ── Results table or pre-search placeholder ── */}
        {!searched ? (
          <div className="bg-white rounded-xl py-14 text-center text-[#a0aec0] text-[13px]">
            Set the filters above and click <strong>Generate Report</strong> to view results.
          </div>
        ) : (
          <CommonTable
            columns={TABLE_COLS}
            data={sorted}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            emptyText="No audit records found for the selected criteria."
          />
        )}
      </div>

      {/* ── View Actions Modal ── */}
      {viewRow && <ViewActionsModal row={viewRow} onClose={() => setViewRow(null)} />}
    </div>
  )
}

export default AuditTrailPage
