/**
 * src/components/common/modals/Modals.jsx
 * ========================================
 * Shared modal dialogs used across all roles.
 *
 * @description
 * Exports multiple modals consumed throughout the app. Each modal is a
 * self-contained overlay controlled by an `open` prop or conditional render.
 *
 * Exports:
 *  AdminViewGroupsModal      — View user groups for a given user (Admin)
 *  AdminViewDetailEditModal  — Edit user details form modal (Admin)
 *  RequestActionModal        — Approve / Decline action modal with notes textarea and reason chips
 *  SendForApprovalModal      — Confirm + notes modal before sending data for approval
 *  FormulaModal              — View classification formula tokens modal
 *
 * Props (RequestActionModal):
 *  @prop {Object}   row              - Data row to display in info cards
 *  @prop {string}   type             - "approve" | "decline"
 *  @prop {Function} onClose          - Called on No or backdrop click
 *  @prop {Function} onSubmit         - Called with notes string on Yes
 *  @prop {string}   [title]          - Modal heading override
 *  @prop {string}   [defaultNotes]   - Pre-filled textarea value
 *  @prop {Array}    [infoFields]     - [{label, value|key}] info cards to display
 *  @prop {string[]} [approveReasons] - Suggestive chips for approve type
 *  @prop {string[]} [declineReasons] - Suggestive chips for decline type
 *
 * Notes:
 *  - All modals close on backdrop click
 *  - RequestActionModal Yes button is disabled until notes field has content
 */
import React, { useState, useCallback, useEffect, useRef } from 'react'
import CommonTable from '../table/NormalTable'
import {
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  BtnPrimary,
  BtnGold,
  BtnModalClose,
  BtnReasonChip,
} from '..'
import Input from '../Input/Input'
import Select from '../select/Select'
import { getUserGroups, GET_USER_GROUPS_CODES } from '../../../services/admin.service'
/* ── View Groups Modal ──────────────────────────────── */
export const AdminViewGroupsModal = ({ user, onClose }) => {
  const [groups,  setGroups]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const fetchedRef = useRef(false)

  // Fetch groups on mount (StrictMode-safe)
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      const res = await getUserGroups({ UserID: user.id }, { skipLoader: true })
      setLoading(false)

      if (!res.success) {
        setError(res.message || 'Failed to load groups.')
        return
      }

      const code = res.data?.responseResult?.responseMessage

      if (code === 'Admin_AdminServiceManager_GetUserGroups_04') {
        const raw = res.data.responseResult.groups || []
        setGroups(
          raw.map((g) => ({
            id: g.groupID,
            u1: g.user1Name || '',
            u2: g.user2Name || '',
            u3: g.user3Name || '',
            u4: g.user4Name || '',
          }))
        )
        return
      }

      if (code === 'Admin_AdminServiceManager_GetUserGroups_03') {
        // Not a member of any group — show empty table, not an error
        setGroups([])
        return
      }

      setError(GET_USER_GROUPS_CODES[code] || 'Something went wrong.')
    }

    load()
  }, [user.id])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = [...groups].sort((a, b) => {
    if (!sortCol) return 0
    const va = (a[sortCol] || '').toLowerCase()
    const vb = (b[sortCol] || '').toLowerCase()
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#eef2f7]">
          <div>
            <h2 className="text-[20px] font-bold text-[#0B39B5]">View User Groups</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">{user.userName || user.fullName}</p>
          </div>
          <BtnModalClose onClick={onClose} />
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex items-center justify-center h-40">
            <p className="text-red-500 text-[13px] font-medium">{error}</p>
          </div>
        )}

        {/* ── Table ── */}
        {!loading && !error && (
          <div className="px-6 py-4">
            <CommonTable
              headerBg="#0B39B5"
              headerTextColor="#ffffff"
              rowBg="#F5F8FF"
              rowHoverBg="#EFF3FF"
              columns={[
                { key: 'u1', title: 'Member 1', sortable: true },
                { key: 'u2', title: 'Member 2', sortable: true },
                { key: 'u3', title: 'Member 3', sortable: true },
                { key: 'u4', title: 'Member 4', sortable: true },
              ]}
              data={sorted}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              emptyText="This user is not a member of any group."
            />
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex justify-center px-6 py-5 border-t border-[#eef2f7]">
          <BtnGold style={{ padding: '10px 48px', borderRadius: '12px' }} onClick={onClose}>
            Close
          </BtnGold>
        </div>
      </div>
    </div>
  )
}

/* ── Role / Status ID maps ──────────────────────────── */
const ROLE_ID_MAP = { Admin: 1, Manager: 2, 'Data Entry': 3 }
const STATUS_ID_MAP = { Active: 1, 'In-Active': 2 }

/* ── Edit Modal ─────────────────────────────────────── */
export const AdminViewDetailEditModal = ({ user, onClose, onSave }) => {
  const initial = {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    org: user.org || '',
    email: user.email || '',
    role: user.role || '',
    status: user.status || '',
    roleID: user.roleID,
    statusID: user.statusID,
  }
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm((p) => {
      const next = { ...p, [k]: v }
      // keep IDs in sync when label changes
      if (k === 'role') next.roleID = ROLE_ID_MAP[v] ?? p.roleID
      if (k === 'status') next.statusID = STATUS_ID_MAP[v] ?? p.statusID
      return next
    })
    setErrors((p) => ({ ...p, [k]: '' }))
  }

  const isDirty =
    form.firstName !== initial.firstName ||
    form.lastName !== initial.lastName ||
    form.org !== initial.org ||
    form.email !== initial.email ||
    form.role !== initial.role ||
    form.status !== initial.status

  const validate = () => {
    const e = {}
    if (!form.firstName?.trim()) e.firstName = 'Required'
    if (!form.lastName?.trim()) e.lastName = 'Required'
    if (!form.org?.trim()) e.org = 'Required'
    if (!form.email?.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.role) e.role = 'Required'
    if (!form.status) e.status = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[20px] font-bold text-[#0B39B5]">Edit</h2>
          <BtnModalClose onClick={onClose} />
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'First Name', k: 'firstName', maxLength: 50 },
              { label: 'Last Name', k: 'lastName', maxLength: 50 },
            ].map((f) => (
              <Input
                key={f.k}
                label={f.label}
                required
                type="text"
                maxLength={f.maxLength}
                value={form[f.k]}
                onChange={(v) => set(f.k, v)}
                error={!!errors[f.k]}
                errorMessage={errors[f.k]}
                bgColor="#EFF3FF"
                borderColor="transparent"
                focusBorderColor="#01C9A4"
                showCount={true}
              />
            ))}
          </div>

          {[
            { label: 'Organization Name', k: 'org', type: 'text', maxLength: 100 },
            { label: 'Email ID', k: 'email', type: 'email', maxLength: 50 },
          ].map((f) => (
            <Input
              key={f.k}
              label={f.label}
              required
              type={f.type}
              maxLength={f.maxLength}
              value={form[f.k]}
              onChange={(v) => set(f.k, v)}
              error={!!errors[f.k]}
              errorMessage={errors[f.k]}
              bgColor="#EFF3FF"
              borderColor="transparent"
              focusBorderColor="#01C9A4"
              showCount={true}
            />
          ))}

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Role', k: 'role', options: ROLE_OPTIONS },
              { label: 'Status', k: 'status', options: STATUS_OPTIONS },
            ].map((f) => (
              <Select
                key={f.k}
                label={f.label}
                required
                value={form[f.k]}
                onChange={(v) => set(f.k, v)}
                options={f.options}
                error={!!errors[f.k]}
                errorMessage={errors[f.k]}
                bgColor="#EFF3FF"
                borderColor="transparent"
                focusBorderColor="#01C9A4"
              />
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-center gap-3 px-6 py-4 border-t border-slate-100">
          <BtnPrimary
            disabled={!isDirty}
            style={{ padding: '9px 24px' }}
            onClick={() => validate() && onSave(form)}
          >
            Update
          </BtnPrimary>
          <BtnGold style={{ padding: '9px 24px' }} onClick={onClose}>Cancel</BtnGold>
        </div>
      </div>
    </div>
  )
}

/**
 * RequestActionModal
 * ===================
 * Reusable Approve / Decline modal for signup/action requests.
 * Displays a heading, info cards from the passed row, notes textarea,
 * suggestive reason chips, and Yes/No buttons.
 *
 * Props:
 *  row            {Object}    — data object to display in info cards
 *  type           {string}    — "approve" | "decline"
 *  onClose        {Function}  — called on No or backdrop click
 *  onSubmit       {Function}  — called with notes string on Yes
 *
 *  title          {string}    — modal heading
 *                               default: row.name + " has requested to sign up on SCS"
 *
 *  defaultNotes   {string}    — pre-filled textarea value
 *                               default: "Request Accepted" | "Request Declined"
 *
 *  infoFields     {Array}     — defines info cards shown below heading
 *                               [{ label: "First Name", value: "John" }]
 *                               OR [{ label: "First Name", key: "firstName" }]
 *                               — use `value` for computed/static values
 *                               — use `key` to read directly from `row`
 *
 *  approveReasons {string[]}  — suggestive chips for approve type
 *  declineReasons {string[]}  — suggestive chips for decline type
 *
 * Usage — Admin Pending Requests (signup):
 *  <RequestActionModal
 *    row={modal.request}
 *    type={modal.type}
 *    onClose={() => setModal(null)}
 *    onSubmit={handleSubmit}
 *    infoFields={[
 *      { label: "First Name",    value: request.name.split(" ")[0] },
 *      { label: "Last Name",     value: request.name.split(" ")[1] || "—" },
 *      { label: "Email",         key: "email" },
 *      { label: "Organization",  key: "org" },
 *      { label: "Role",          key: "role" },
 *      { label: "Mobile #",      key: "mobile" },
 *    ]}
 *  />
 *
 * Usage — Manager Pending Approvals (financial data):
 *  <RequestActionModal
 *    row={modal.row}
 *    type={modal.type}
 *    title={modal.type === "approve" ? "Approval" : "Reject"}
 *    defaultNotes={modal.type === "approve" ? "Approved" : "Declined"}
 *    onClose={() => setModal(null)}
 *    onSubmit={handleAction}
 *    infoFields={[
 *      { label: "Company",  key: "company" },
 *      { label: "Ticker",   key: "ticker"  },
 *      { label: "Quarter",  key: "quarter" },
 *      { label: "Sent By",  key: "sentBy"  },
 *    ]}
 *    approveReasons={["Data verified", "Calculations match"]}
 *    declineReasons={["Data mismatch", "Requires revision"]}
 *  />
 */

/** Default suggestive reasons — can be overridden via props */
const DEFAULT_REQUEST_APPROVE_REASONS = [
  'Details are verified',
  'All documents reviewed',
  'Background check passed',
]
const DEFAULT_REQUEST_DECLINE_REASONS = [
  'Details not verified',
  'Incomplete information',
  'Duplicate account',
]

export const RequestActionModal = ({
  row,
  type,
  onClose,
  onSubmit,
  title,
  defaultNotes,
  infoFields = [],
  approveReasons = DEFAULT_REQUEST_APPROVE_REASONS,
  declineReasons = DEFAULT_REQUEST_DECLINE_REASONS,
}) => {
  const isApprove = type === 'approve'

  const [notes, setNotes] = useState(
    defaultNotes ?? (isApprove ? 'Request Accepted' : 'Request Declined')
  )

  const appendReason = useCallback((r) => {
    setNotes((p) => (p ? `${p}\n${r}` : r))
  }, [])

  const hasNotes = notes.trim().length > 0
  const reasons = isApprove ? approveReasons : declineReasons

  /**
   * Resolve a field value — supports both `key` (read from row)
   * and `value` (static/computed, passed directly).
   */
  const resolveValue = (field) =>
    field.value !== undefined ? field.value : (row?.[field.key] ?? '—')

  /** Default title uses row.name if available */
  const heading =
    title ??
    (row?.name ? `${row.name} has requested to sign up on SCS` : isApprove ? 'Approval' : 'Reject')

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-[18px] font-bold text-[#0B39B5]">{heading}</h2>
        </div>

        <div className="px-6 pb-5">
          {/* ── Info cards (rendered from infoFields prop) ── */}
          {infoFields.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {infoFields.map((field, i) => (
                <div key={i} className="bg-[#e8faf6] rounded-xl px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5">{field.label}</p>
                  <p className="text-[13px] text-[#041E66]">{resolveValue(field)}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Notes label + textarea ── */}
          <label className="block text-[14px] font-bold text-[#0B39B5] mb-2">
            Write Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            className="w-full border border-[#dde4ee] rounded-xl px-4 py-3
                       text-[13px] text-[#041E66] resize-none min-h-[90px]
                       focus:border-[#01C9A4] outline-none transition-all"
          />
          <p className="text-[11px] text-[#a0aec0] mt-1 text-right">{notes.length} / 500</p>

          {/* ── Suggestive reason chips ── */}
          <div className="flex flex-wrap gap-2 mt-2 mb-6">
            {reasons.map((r, i) => (
              <BtnReasonChip key={i} onClick={() => appendReason(r)}>{r}</BtnReasonChip>
            ))}
          </div>

          {/* ── Yes / No buttons — disabled until notes provided ── */}
          <div className="flex justify-center gap-3">
            <BtnPrimary
              size="xl"
              disabled={!hasNotes}
              onClick={() => hasNotes && onSubmit(notes)}
            >
              Yes
            </BtnPrimary>
            <BtnGold size="xl" disabled={!hasNotes} onClick={onClose}>No</BtnGold>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Send For Approval Modal ────────────────────────────────────────────────
 *
 * Props:
 *  open        {boolean}   — controls visibility
 *  onClose     {Function}  — called on Cancel or backdrop click
 *  onProceed   {Function}  — called with notes string on Proceed
 *  defaultNotes {string}   — pre-filled notes (default: "Please Verify")
 */
export const SendForApprovalModal = ({
  open,
  onClose,
  onProceed,
  defaultNotes = 'Please Verify',
}) => {
  const [notes, setNotes] = useState(defaultNotes)
  if (!open) return null

  const handleProceed = () => {
    onProceed(notes)
    setNotes(defaultNotes)
  }

  const handleClose = () => {
    setNotes(defaultNotes)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-[20px] font-bold text-[#0B39B5]">Send for approval</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-[14px] text-[#041E66] mb-5">
            Are you sure you want to <strong>send this data for approval.</strong>
          </p>

          <label className="block text-[14px] font-bold text-[#0B39B5] mb-2">
            Write Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full border border-[#dde4ee] rounded-xl px-4 py-3
                       text-[13px] text-[#041E66] resize-none
                       focus:border-[#01C9A4] outline-none transition-all"
          />
          <p className="text-[11px] text-[#a0aec0] mt-1 text-right">{notes.length} / 500</p>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-3 px-6 pb-6">
          <BtnGold    size="lg" onClick={handleClose}>Cancel</BtnGold>
          <BtnPrimary size="lg" onClick={handleProceed}>Proceed</BtnPrimary>
        </div>
      </div>
    </div>
  )
}

// ── Formula component map for calculated classifications ──────────────────────
const FORMULA_COMPONENTS = {
  'Total Long-Term Finance': [
    { label: 'Long-Term Finance', op: '-' },
    { label: 'Islamic Finance (LT)', op: null },
  ],
  'Total Assets': [
    { label: 'Fixed Assets', op: '+' },
    { label: 'Current Assets', op: null },
  ],
  'Total Interest Bearing Long term Finance': [
    { label: 'Long-Term Finance', op: '-' },
    { label: 'Islamic Finance (LT)', op: null },
  ],
  'Total Short Term Finance': [
    { label: 'Short Term Finance', op: '-' },
    { label: 'Less: Islamic Finance (ST)', op: null },
  ],
  'Non-compliant Investments': [
    { label: 'Total Investments', op: '-' },
    { label: 'Compliant Investments', op: null },
  ],
  'Non-compliant Income': [
    { label: 'Total Income', op: '-' },
    { label: 'Compliant Income', op: null },
  ],
}

// ── Inline View Formula Modal ─────────────────────────────────────────────────
export const FormulaModal = ({ item, onClose }) => {
  if (!item) return null

  const typeLabel = item.calculated
    ? 'Calculated Classification'
    : item.prorated
      ? 'Prorated Classification'
      : 'Classification'

  // For calculated: show component pills
  // For prorated: show base ÷ period pills
  // For regular: show single "Raw Input" pill
  const tokens = item.calculated
    ? FORMULA_COMPONENTS[item.name] || [{ label: item.name, op: null }]
    : item.prorated
      ? [
          { label: item.base, op: '÷' },
          { label: 'Applicable Period', op: null },
        ]
      : [{ label: 'Raw Financial Input', op: null }]

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[20px] font-bold text-[#0B39B5]">{typeLabel}</h2>
          <BtnModalClose onClick={onClose} variant="light" />
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {/* Classification name */}
          <p className="text-[16px] font-semibold text-[#041E66] mb-5">{item.name}</p>

          {/* Formula pill row */}
          <div className="flex flex-wrap items-center gap-2">
            {tokens.map((token, i) => (
              <React.Fragment key={i}>
                <span
                  className="px-4 py-2 rounded-lg border border-[#0B39B5] bg-white
                                 text-[13px] font-medium text-[#041E66] whitespace-nowrap"
                >
                  {token.label}
                </span>
                {token.op && (
                  <span className="text-[15px] font-bold text-[#041E66] px-1">{token.op}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center px-6 py-5">
          <BtnGold style={{ padding: '10px 64px', borderRadius: '12px' }} onClick={onClose}>
            Close
          </BtnGold>
        </div>
      </div>
    </div>
  )
}
