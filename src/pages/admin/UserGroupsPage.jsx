/**
 * src/pages/admin/UserGroupsPage.jsx
 * ====================================
 * Admin manages Data Entry user groups.
 *
 * Business Rules (SRS)
 * ─────────────────────
 * - Min 2 users per group (u1, u2 required)
 * - Max 4 users per group (u3, u4 optional)
 * - Same user cannot appear more than once in a group
 * - Groups can be edited or deleted with confirmation dialog
 *
 * Search Behaviour
 * ─────────────────
 * - Main input searches User 1 (unified state with filter panel)
 * - Filter panel has inputs for all 4 user fields
 * - Applied filters shown as teal chips — Clear All when > 1
 * - Closing filter without action resets filter inputs only
 *
 * Confirmation Modal
 * ───────────────────
 * - Update → shows confirm → Yes saves, No cancels + resets form
 * - Delete → shows confirm → Yes deletes, No cancels
 *
 * Reusable Components Used
 * ─────────────────────────
 * - Select     → src/components/common/select/Select.jsx
 *               Props: label, required, value, onChange, options,
 *                      error, errorMessage, bgColor, borderColor
 * - CommonTable → src/components/common/table/NormalTable.jsx
 * - SearchFilter → src/components/common/searchFilter/SearchFilter.jsx
 * - ConfirmModal → src/components/common/index.jsx
 *
 * Performance
 * ────────────
 * - TABLE_COLS, FILTER_FIELDS, CHIP_LABELS defined outside component
 *   to prevent recreation on every render
 * - All handlers wrapped in useCallback
 * - sorted list memoized via useMemo
 * - sourceGroups in useRef to avoid stale closures in filter/search
 *
 * TODO
 * ─────
 * - GET  /api/admin/data-entry-users  → replace MOCK_USERS_DE
 * - GET  /api/admin/groups            → replace INITIAL_GROUPS
 * - POST /api/admin/groups            → replace local add in handleSave
 * - PUT  /api/admin/groups/:id        → replace local update in handleConfirmYes
 * - DELETE /api/admin/groups/:id      → replace local delete in handleConfirmYes
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Trash2, SquarePen, X } from 'lucide-react'
import { ConfirmModal } from '../../components/common/index.jsx'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import Select from '../../components/common/select/Select'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — replace with API calls on integration
// ─────────────────────────────────────────────────────────────────────────────

/** Data Entry users available for group assignment */
const MOCK_USERS_DE = ['Bilal Khan', 'Fatima Malik', 'Hamza Ali', 'Zainab Raza', 'Umar Shaikh']

const INITIAL_GROUPS = [
  { id: 1, u1: 'Bilal Khan', u2: 'Fatima Malik', u3: '', u4: '' },
  { id: 2, u1: 'Hamza Ali', u2: 'Zainab Raza', u3: 'Bilal Khan', u4: '' },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — defined outside component to prevent re-creation on render
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = { u1: '', u2: '', u3: '', u4: '' }
const EMPTY_FILTERS = { u1: '', u2: '', u3: '', u4: '' }

/** Human-readable labels for filter chips and Select labels */
const USER_LABELS = { u1: 'User 1', u2: 'User 2', u3: 'User 3', u4: 'User 4' }

/** SearchFilter panel field definitions */
const FILTER_FIELDS = [
  { key: 'u1', label: 'User 1', type: 'input', maxLength: 50 },
  { key: 'u2', label: 'User 2', type: 'input', maxLength: 50 },
  { key: 'u3', label: 'User 3', type: 'input', maxLength: 50 },
  { key: 'u4', label: 'User 4', type: 'input', maxLength: 50 },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const UserGroupsPage = () => {
  // ── Source of truth (survives filter/search resets) ──────────────────────
  const sourceGroups = useRef(INITIAL_GROUPS)

  // ── Table data (filtered + sorted view of sourceGroups) ──────────────────
  const [groups, setGroups] = useState(INITIAL_GROUPS)

  // ── Add / Edit form ───────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null) // null = add mode, id = edit mode
  const [dupError, setDupError] = useState(false) // true when duplicate user selected

  // ── Confirmation modal: { type: 'update' | 'delete', id? } ───────────────
  const [confirm, setConfirm] = useState(null)

  // ── Unified filter state: mainSearch = filters.u1 ────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.u1
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, u1: val })), [])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('u1')
  const [sortDir, setSortDir] = useState('asc')

  // ─────────────────────────────────────────────────────────────────────────
  // FORM HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Update a single form field and clear the duplicate error */
  const setField = useCallback((k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    setDupError(false)
  }, [])

  /** Form is valid only when required fields u1 and u2 are filled */
  const isValid = form.u1 && form.u2

  /** Returns true if any user appears more than once in the group */
  const hasDuplicates = useCallback(() => {
    const vals = [form.u1, form.u2, form.u3, form.u4].filter(Boolean)
    return new Set(vals).size !== vals.length
  }, [form])

  /** Reset form, editing state, and duplicate error */
  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setDupError(false)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter sourceGroups by given criteria object.
   * TODO: replace with GET /api/admin/groups?u1=...&u2=...
   */
  const fetchData = useCallback((f) => {
    setGroups(
      sourceGroups.current.filter((g) =>
        Object.entries(f).every(([k, v]) => !v || g[k]?.toLowerCase().includes(v.toLowerCase()))
      )
    )
  }, [])

  /**
   * Called on Search button (main input and filter panel).
   * Builds applied chips from current filter state, then fetches.
   */
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    fetchData(next)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

  /** Reset button — clears everything and reloads all data */
  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    fetchData({})
  }, [fetchData])

  /**
   * Called when filter panel closes without Search/Reset.
   * Clears filter inputs but keeps applied chips unchanged.
   */
  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  /** Remove a single chip and re-fetch with updated applied filters */
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
      setSortCol((prev) => {
        if (prev !== col) setSortDir('asc')
        return col
      })
      setSortDir((prev) => (sortCol === col ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'))
    },
    [sortCol]
  )

  /** Client-side sort — API already handles filtering */
  const sorted = useMemo(
    () =>
      [...groups].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [groups, sortCol, sortDir]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // FORM HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Save (add mode) or open confirm modal (edit mode) */
  const handleSave = useCallback(() => {
    if (!isValid) return
    if (hasDuplicates()) {
      setDupError(true)
      return
    }
    setDupError(false)

    if (editing) {
      setConfirm({ type: 'update' })
    } else {
      // TODO: POST /api/admin/groups
      const newGroup = { id: Date.now(), ...form }
      sourceGroups.current = [...sourceGroups.current, newGroup]
      setGroups(sourceGroups.current)
      toast.success('User Group added successfully')
      setForm(EMPTY_FORM)
    }
  }, [isValid, hasDuplicates, editing, form])

  /** Load a group row into the form for editing */
  const startEdit = useCallback((g) => {
    setEditing(g.id)
    setDupError(false)
    setForm({ u1: g.u1, u2: g.u2, u3: g.u3 || '', u4: g.u4 || '' })
  }, [])

  const cancelEdit = useCallback(() => resetForm(), [resetForm])

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIRMATION MODAL HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleDelete = useCallback((id) => setConfirm({ type: 'delete', id }), [])

  /** Yes — execute the confirmed action (update or delete) */
  const handleConfirmYes = useCallback(() => {
    if (confirm.type === 'update') {
      // TODO: PUT /api/admin/groups/:id
      const updated = sourceGroups.current.map((g) =>
        g.id === editing ? { id: editing, ...form } : g
      )
      sourceGroups.current = updated
      setGroups(updated)
      toast.success('User Group has been Updated Successfully')
      resetForm()
    } else if (confirm.type === 'delete') {
      // TODO: DELETE /api/admin/groups/:id
      sourceGroups.current = sourceGroups.current.filter((g) => g.id !== confirm.id)
      setGroups(sourceGroups.current)
      toast.success('User Group has been removed')
    }
    setConfirm(null)
  }, [confirm, editing, form, resetForm])

  /** No — close dialog; reset form if it was an update confirmation */
  const handleConfirmNo = useCallback(() => {
    if (confirm?.type === 'update') resetForm()
    setConfirm(null)
  }, [confirm, resetForm])

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS — stable reference via useMemo
  // ─────────────────────────────────────────────────────────────────────────

  const TABLE_COLS = useMemo(
    () => [
      { key: 'u1', title: 'User 1', sortable: true },
      { key: 'u2', title: 'User 2', sortable: true },
      {
        key: 'u3',
        title: 'User 3',
        sortable: true,
        render: (row) => row.u3 || <span className="text-slate-300">—</span>,
      },
      {
        key: 'u4',
        title: 'User 4',
        sortable: true,
        render: (row) => row.u4 || <span className="text-slate-300">—</span>,
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-1">
            {/* Edit */}
            <button
              onClick={() => startEdit(row)}
              title="Edit"
              className="w-8 h-8 rounded-lg hover:bg-[#EFF3FF] hover:text-[#0B39B5]
                       text-slate-400 flex items-center justify-center transition-all"
            >
              <SquarePen size={15} />
            </button>
            {/* Delete */}
            <button
              onClick={() => handleDelete(row.id)}
              title="Delete"
              className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600
                       text-slate-400 flex items-center justify-center transition-all"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    [startEdit, handleDelete]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">User Groups</h1>
          <SearchFilter
            placeholder="Search by user name..."
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
        {/* ── Add / Edit Form ── */}
        <div className="p-5 mb-4">
          <h3 className="text-[14px] font-semibold text-[#0B39B5] mb-4">
            {editing ? 'Edit Group' : 'Add New Group'}
          </h3>

          {/*
           * User select dropdowns (u1–u4)
           * Using reusable Select component from src/components/common/Select.jsx
           * - label + required handled inside Select via props
           * - error state shows red border on fields that have a value (duplicate check)
           * - errorMessage shown only on u1 (first field) to avoid repetition
           */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {['u1', 'u2', 'u3', 'u4'].map((k, i) => (
              <Select
                key={k}
                label={USER_LABELS[k]}
                required={i < 2}
                value={form[k]}
                onChange={(v) => setField(k, v)}
                options={MOCK_USERS_DE}
                placeholder="-- Select --"
                error={dupError && !!form[k]}
                focusBorderColor="#01C9A4"
              />
            ))}
          </div>

          {/* Duplicate error message (shown once below all dropdowns) */}
          {dupError && (
            <p className="text-[12px] text-red-500 mb-3 font-medium">
              Same users should not be selected
            </p>
          )}

          {/* Form action buttons */}
          <div className="flex justify-center gap-2">
            {editing && (
              <button
                onClick={cancelEdit}
                className="px-5 py-[9px] rounded-lg border border-[#dde4ee]
                           text-[13px] font-medium text-[#041E66] hover:bg-[#EFF3FF]"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-5 py-[9px] rounded-lg bg-[#0B39B5] text-white text-[13px]
                         font-semibold hover:bg-[#0a2e94] disabled:opacity-40 transition-colors"
            >
              {editing ? 'Update Group' : 'Save Group'}
            </button>
          </div>
        </div>

        {/* ── Active filter chips ── */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {USER_LABELS[k] || k}: {v}
                <button
                  onClick={() => removeChip(k)}
                  className="hover:text-white/70 transition-colors"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {/* Clear All — only shown when more than 1 chip is active */}
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

        {/* ── Groups table ── */}
        <CommonTable
          columns={TABLE_COLS}
          data={sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* ── Confirmation modal (shared for update + delete) ── */}
      <ConfirmModal
        open={!!confirm}
        message="Are you sure you want to do this action?"
        onYes={handleConfirmYes}
        onNo={handleConfirmNo}
      />
    </div>
  )
}

export default UserGroupsPage
