/**
 * src/pages/admin/AuditTrailPage.jsx
 * ====================================
 * Admin views a log of all user activity in the system.
 *
 * Layout:
 * ────────
 * Row 1 : User Name (dropdown) | Organization Name (dropdown) | Email ID (text)
 * Row 2 : IP Address (text)    | From Date (DatePicker)       | To Date (DatePicker) + buttons
 *
 * Table (shown only after Generate Report is clicked):
 *  User Name | Organization Name | Email Address | IP Address |
 *  Login Time | Actions Count | Logout Time | View Actions
 *
 * View Actions Modal:
 *  - 6 teal info cards (User Name, Org, IP, Login/Logout Date+Time, Session Duration)
 *  - Export button (top right)
 *  - Sortable table: Description | Time | Previous Value | Updated Value
 *  - Close button (dark, centered at bottom)
 *
 * Reusable Components Used
 * ─────────────────────────
 * - Select     → src/components/common/Select.jsx
 *               label, required, value, onChange, options, placeholder,
 *               bgColor, borderColor, focusBorderColor
 * - Input      → src/components/common/Input.jsx
 *               label, type, value, onChange, placeholder, maxLength,
 *               regex, bgColor, borderColor, focusBorderColor
 * - DatePicker → src/components/common/DatePicker.jsx
 *               value, onChange, placeholder, error
 * - CommonTable → src/components/common/table/NormalTable.jsx
 * - ExportBtn   → src/components/common/index.jsx
 *
 * TODO
 * ─────
 * - GET /api/admin/audit-trail?filters → replace AUDIT_DATA
 * - GET /api/admin/audit-trail/:id/actions → replace ACTION_DETAIL
 */

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'react-toastify'
import CommonTable from '../../components/common/table/NormalTable'
import { ExportBtn } from '../../components/common'
import DatePicker from '../../components/common/datePicker/DatePicker'
import Select from '../../components/common/select/Select'
import Input from '../../components/common/Input/Input'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — replace with API calls on integration
// ─────────────────────────────────────────────────────────────────────────────

const USERS = ['Faheem Arif', 'Humaid Afzal', 'Sara Ahmed', 'Bilal Khan']
const ORGS = ['Al-Hilal Investments', 'Hilal Capital', 'Minds Collide']

const AUDIT_DATA = [
  {
    id: 1,
    user: 'Faheem Arif',
    org: 'Al-Hilal Investments',
    email: 'Faheem.arif@hilalinvest.com',
    ip: '198.51.100.2',
    loginDate: '13-10-2025',
    loginTime: '10:35:12 AM',
    actions: 5,
    logoutTime: '12:15:00 PM',
    sessionDuration: '1H, 40M',
  },
  {
    id: 2,
    user: 'Humaid Afzal',
    org: 'Al-Hilal Investments',
    email: 'Humaid.afzal@hilalinvest.com',
    ip: '198.51.100.3',
    loginDate: '13-10-2025',
    loginTime: '09:00:00 AM',
    actions: 12,
    logoutTime: '05:30:00 PM',
    sessionDuration: '8H, 30M',
  },
  {
    id: 3,
    user: 'Sara Ahmed',
    org: 'Hilal Capital',
    email: 'sara.ahmed@hilalcap.com',
    ip: '198.51.100.4',
    loginDate: '12-10-2025',
    loginTime: '11:00:00 AM',
    actions: 3,
    logoutTime: '01:30:00 PM',
    sessionDuration: '2H, 30M',
  },
]

const ACTION_DETAIL = [
  {
    id: 1,
    desc: 'Ittefaq Iron Industries - December 2025 - Liabilities subject to finance lease - Value updated',
    time: '09:30 AM',
    prev: '0',
    updated: '1,688.21',
  },
  {
    id: 2,
    desc: 'Ittefaq Iron Industries - December 2025 - Long Term Loans - Value updated',
    time: '10:00 AM',
    prev: '0',
    updated: '2,458.23',
  },
  {
    id: 3,
    desc: 'Mughal Iron & Steel Industries - September 2025 - Data sent for Approval',
    time: '03:10 PM',
    prev: '',
    updated: '',
  },
  {
    id: 4,
    desc: 'Metropolitan Steel Corp - September 2025 - Current Portion of long term - Value updated',
    time: '03:05 PM',
    prev: '580.12',
    updated: '582.13',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — defined outside component to prevent re-creation on render
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  user: '',
  org: '',
  email: '',
  ip: '',
  from: null,
  to: null,
}

/** Column definitions for the View Actions modal table — stable outside component */
const ACTION_COLS = [
  { key: 'desc', title: 'Description', sortable: true },
  { key: 'time', title: 'Time', sortable: true },
  {
    key: 'prev',
    title: 'Previous Value',
    sortable: true,
    render: (r) => <span className="text-[#a0aec0]">{r.prev || '—'}</span>,
  },
  {
    key: 'updated',
    title: 'Updated Value',
    sortable: true,
    render: (r) => <span className="font-medium text-[#041E66]">{r.updated || '—'}</span>,
  },
]

/** Shared input style props — white bg with slate border (used across all filter fields) */
const INPUT_STYLE = {
  bgColor: '#ffffff',
  borderColor: '#e2e8f0',
  focusBorderColor: '#01C9A4',
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW ACTIONS MODAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shows session detail + full action log for a selected audit trail row.
 *
 * Props:
 *  row     {Object}   — audit trail row data
 *  onClose {Function} — called to close the modal
 */
const ViewActionsModal = ({ row, onClose }) => {
  const [sortCol, setSortCol] = useState('time')
  const [sortDir, setSortDir] = useState('asc')

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
      [...ACTION_DETAIL].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [sortCol, sortDir]
  )

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
            {[
              ['User Name', row.user],
              ['Organization Name', row.org],
              ['IP Address', row.ip],
              ['Login Date & Time', `${row.loginDate} | ${row.loginTime}`],
              ['Logout Date & Time', `${row.loginDate} | ${row.logoutTime}`],
              ['Session Duration', row.sessionDuration],
            ].map(([label, val]) => (
              <div key={label} className="bg-[#e8faf6] rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5">{label}</p>
                <p className="text-[13px] font-medium text-[#041E66]">{val}</p>
              </div>
            ))}
          </div>

          {/* ── Export button (top right of table) ── */}
          <div className="flex justify-end mb-3">
            <ExportBtn
              onExcel={() => toast.info('Export Excel')}
              onPdf={() => toast.info('Export PDF')}
            />
          </div>

          {/* ── Actions log table ── */}
          <CommonTable
            columns={ACTION_COLS}
            data={sorted}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            headerBg="#0B39B5"
            headerTextColor="#ffffff"
            rowBg="#ffffff"
            rowHoverBg="#EFF3FF"
          />
        </div>

        {/* ── Close button (dark navy, centered) ── */}
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
  // ── Filter state ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  // ── Table + view state ────────────────────────────────────────────────────
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false) // true after Generate Report clicked
  const [viewRow, setViewRow] = useState(null) // row opened in ViewActionsModal

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('user')
  const [sortDir, setSortDir] = useState('asc')

  /** Update a single filter field */
  const setF = useCallback((k, v) => setFilters((p) => ({ ...p, [k]: v })), [])

  // ── Date validation: To Date must be after From Date ──────────────────────
  const dateError =
    filters.from && filters.to && filters.to <= filters.from
      ? 'Must be greater than From Date'
      : null

  // ─────────────────────────────────────────────────────────────────────────
  // GENERATE REPORT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filters AUDIT_DATA by current filter state and shows the table.
   * TODO: replace with GET /api/admin/audit-trail?user=...&org=...&from=...&to=...
   */
  const handleGenerate = useCallback(() => {
    if (dateError) return
    const result = AUDIT_DATA.filter((r) => {
      if (filters.user && r.user !== filters.user) return false
      if (filters.org && r.org !== filters.org) return false
      if (filters.email && !r.email.toLowerCase().includes(filters.email.toLowerCase()))
        return false
      if (filters.ip && !r.ip.includes(filters.ip)) return false
      return true
    })
    setResults(result)
    setSearched(true)
  }, [filters, dateError])

  /** Clear all filters and hide the table */
  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setResults([])
    setSearched(false)
  }, [])

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
      [...results].sort((a, b) => {
        const va = (a[sortCol] || '').toString().toLowerCase()
        const vb = (b[sortCol] || '').toString().toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [results, sortCol, sortDir]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS — stable via useMemo
  // ─────────────────────────────────────────────────────────────────────────

  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'user',
        title: 'User Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#041E66]">{r.user}</span>,
      },
      { key: 'org', title: 'Organization Name', sortable: true },
      { key: 'email', title: 'Email Address', sortable: true },
      {
        key: 'ip',
        title: 'IP Address',
        sortable: true,
        render: (r) => <span className="font-mono text-[12px]">{r.ip}</span>,
      },
      { key: 'loginTime', title: 'Login Time', sortable: true },
      {
        key: 'actions',
        title: 'Actions Count',
        sortable: true,
        render: (r) => (
          <span
            className="bg-blue-100 text-[#0B39B5] px-2.5 py-0.5
                         rounded-full text-[11px] font-semibold"
          >
            {r.actions}
          </span>
        ),
      },
      { key: 'logoutTime', title: 'Logout Time', sortable: true },
      {
        key: 'view',
        title: 'View Actions',
        render: (r) => (
          <button
            onClick={() => setViewRow(r)}
            className="px-3 py-1 bg-[#F5A623] hover:bg-[#e09a1a] text-white
                     rounded-md text-[12px] font-semibold transition-colors"
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
          {/*
           * Row 1: User Name | Organization Name | Email ID
           * Using reusable Select and Input components.
           * All fields share INPUT_STYLE (white bg, slate border, teal focus).
           */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Select
              label="User Name"
              value={filters.user}
              onChange={(v) => setF('user', v)}
              options={USERS}
              placeholder="All Users"
              {...INPUT_STYLE}
            />
            <Select
              label="Organization Name"
              value={filters.org}
              onChange={(v) => setF('org', v)}
              options={ORGS}
              placeholder="All Organizations"
              {...INPUT_STYLE}
            />
            <Input
              label="Email ID"
              type="email"
              value={filters.email}
              onChange={(v) => setF('email', v)}
              placeholder="email@example.com"
              maxLength={50}
              regex={/^[^\s]*$/}
              {...INPUT_STYLE}
            />
          </div>

          {/*
           * Row 2: IP Address | From Date | To Date | Buttons
           * DatePicker handles its own label — passed via wrapper label element.
           * Error shown only on To Date (matches design image).
           */}
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
            <Input
              label="IP Address"
              value={filters.ip}
              onChange={(v) => setF('ip', v)}
              placeholder="999.999.999.999"
              maxLength={15}
              regex={/^[0-9.]*$/}
              {...INPUT_STYLE}
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
              {/* error prop shown only on To Date field as per design */}
              <DatePicker
                value={filters.to}
                onChange={(d) => setF('to', d)}
                placeholder="dd mmm yyyy"
                error={dateError}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleClear}
                className="px-4 py-[10px] rounded-lg border border-[#dde4ee] text-[13px]
                           font-medium text-[#041E66] hover:bg-[#EFF3FF] transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleGenerate}
                disabled={!!dateError}
                className="px-5 py-[10px] rounded-lg bg-[#0B39B5] text-white text-[13px]
                           font-semibold hover:bg-[#0a2e94] disabled:opacity-40
                           transition-colors whitespace-nowrap"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* ── Export button — only shown when results exist ── */}
        {searched && results.length > 0 && (
          <div className="flex justify-end mb-3">
            <ExportBtn
              onExcel={() => toast.info('Export Excel')}
              onPdf={() => toast.info('Export PDF')}
            />
          </div>
        )}

        {/* ── Results table or placeholder prompt ── */}
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
            emptyText="No records found for the selected criteria."
          />
        )}
      </div>

      {/* ── View Actions Modal ── */}
      {viewRow && <ViewActionsModal row={viewRow} onClose={() => setViewRow(null)} />}
    </div>
  )
}

export default AuditTrailPage
