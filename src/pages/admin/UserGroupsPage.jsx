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
 * API Integration
 * ────────────────
 * - GetAllGroups        → on mount + search + pagination
 * - GetDataEntryUsers   → on mount (populates Select options)
 * - CreateGroup         → Save button (add mode)
 * - UpdateGroup         → Confirm Yes (update mode)
 * - DeleteGroup         → Confirm Yes (delete mode)
 *
 * Search Behaviour
 * ─────────────────
 * - Single "User Name" filter passed as UserName to GetAllGroups API
 * - Applied filters shown as teal chips
 *
 * Confirmation Modal
 * ───────────────────
 * - Update → shows confirm → Yes saves, No cancels + resets form
 * - Delete → shows confirm → Yes deletes, No cancels
 *
 * Reusable Components Used
 * ─────────────────────────
 * - Select      → src/components/common/select/Select.jsx
 * - CommonTable → src/components/common/table/NormalTable.jsx
 * - SearchFilter → src/components/common/searchFilter/SearchFilter.jsx
 * - ConfirmModal → src/components/common/index.jsx
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Trash2, SquarePen, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { ConfirmModal } from '../../components/common/index.jsx'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import Select from '../../components/common/select/Select'
import { formatChipValue } from '../../utils/helpers'
import {
  getAllGroups,    GET_ALL_GROUPS_CODES,
  getDataEntryUsers,
  createGroup,    CREATE_GROUP_CODES,
  updateGroup,    UPDATE_GROUP_CODES,
  deleteGroup,    DELETE_GROUP_CODES,
} from '../../services/admin.service'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — defined outside component to prevent re-creation on render
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE    = 10
const EMPTY_FORM   = { u1: '', u2: '', u3: '', u4: '' }
const EMPTY_FILTER = { userName: '' }

/** SearchFilter panel — single "User Name" field (API only supports UserName param) */
const FILTER_FIELDS = [
  { key: 'userName', label: 'User Name', type: 'input', maxLength: 100 },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

/** Map API group object → internal display/edit row */
const mapGroup = (g) => ({
  id:   g.groupID,
  // display names (shown in table)
  u1:   g.user1Name || '',
  u2:   g.user2Name || '',
  u3:   g.user3Name || '',
  u4:   g.user4Name || '',
  // IDs (used when loading into edit form)
  u1ID: g.user1ID        || 0,
  u2ID: g.user2ID        || 0,
  u3ID: g.user3ID        || 0,
  u4ID: g.user4ID        || 0,
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const UserGroupsPage = () => {

  // ── Server data ───────────────────────────────────────────────────────────
  const [groups,     setGroups]     = useState([])
  const [users,      setUsers]      = useState([])   // [{ value: '5', label: 'Name' }]
  const [totalCount, setTotalCount] = useState(0)
  const [page,       setPage]       = useState(0)

  // ── Loading / mutation states ─────────────────────────────────────────────
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [loadingUsers,  setLoadingUsers]  = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [deletingId,    setDeletingId]    = useState(null)

  // ── Add / Edit form ───────────────────────────────────────────────────────
  // Form stores user IDs as strings (Select.onChange returns strings).
  // Empty string = "not selected".
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [editing,  setEditing]  = useState(null)   // null = add mode, groupID = edit mode
  const [dupError, setDupError] = useState(false)

  // ── Confirmation modal ────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(null)   // { type: 'update' | 'delete', id? }

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTER)
  const [applied, setApplied] = useState({})

  // Keep current search term in a ref so pagination callbacks stay stable
  const searchRef = useRef('')

  // Guard against React StrictMode double-invocation — mount APIs fire once only
  const hasFetched = useRef(false)

  // ── Sort (client-side on already-fetched page) ────────────────────────────
  const [sortCol, setSortCol] = useState('u1')
  const [sortDir, setSortDir] = useState('asc')

  // ── Error toast helper ────────────────────────────────────────────────────
  const showError = useCallback((msg) => {
    toast.error(msg, {
      style:         { backgroundColor: '#E74C3C', color: '#ffffff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // API — FETCH
  // ─────────────────────────────────────────────────────────────────────────

  const fetchGroups = useCallback(async (userName = '', pageNum = 0) => {
    setLoadingGroups(true)
    const result = await getAllGroups({ UserName: userName, PageSize: PAGE_SIZE, PageNumber: pageNum })
    setLoadingGroups(false)

    if (!result.success) {
      showError(result.message || 'Failed to load groups.')
      return
    }

    const rr   = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Admin_AdminServiceManager_GetAllGroups_02') {
      // No records found
      setGroups([])
      setTotalCount(0)
      return
    }

    if (code === 'Admin_AdminServiceManager_GetAllGroups_03') {
      setGroups((rr.groups || rr.userGroups || []).map(mapGroup))
      setTotalCount(rr.totalCount ?? 0)
      return
    }

    showError(GET_ALL_GROUPS_CODES[code] || 'Failed to load groups.')
  }, [showError])

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    const result = await getDataEntryUsers()
    setLoadingUsers(false)

    if (!result.success) {
      showError(result.message || 'Failed to load Data Entry users.')
      return
    }

    const rr   = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Admin_AdminServiceManager_GetDataEntryUsers_03') {
      const list = rr.dataEntryUsers || rr.users || []
      setUsers(list.map((u) => ({ value: String(u.userID), label: u.fullName })))
      return
    }

    if (code === 'Admin_AdminServiceManager_GetDataEntryUsers_02') {
      setUsers([])
      return
    }

    showError('Failed to load Data Entry users.')
  }, [showError])

  // On mount — load groups and DE users in parallel.
  // Empty deps = runs once on mount only.
  // hasFetched ref is a second safety net against React StrictMode's double-invoke.
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchGroups('', 0)
    fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // FORM HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const setField = useCallback((k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    setDupError(false)
  }, [])

  const isValid = !!(form.u1 && form.u2)

  const hasDuplicates = useCallback(() => {
    const vals = [form.u1, form.u2, form.u3, form.u4].filter(Boolean)
    return new Set(vals).size !== vals.length
  }, [form])

  /**
   * Returns true if the exact same set of users (order-independent) already
   * exists in the loaded groups list. Skips the group currently being edited
   * so an Update that keeps the same users doesn't false-positive.
   */
  const isDuplicateGroup = useCallback(() => {
    const newIds = [form.u1, form.u2, form.u3, form.u4]
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b)
      .join(',')

    return groups.some((g) => {
      if (editing && g.id === editing) return false   // skip self when editing
      const existingIds = [g.u1ID, g.u2ID, g.u3ID, g.u4ID]
        .filter(Boolean)                               // 0 is falsy — omitted slots excluded
        .sort((a, b) => a - b)
        .join(',')
      return existingIds === newIds
    })
  }, [form, groups, editing])

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setDupError(false)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────

  const mainSearch    = filters.userName
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, userName: val })), [])

  const handleSearch = useCallback(() => {
    const name = filters.userName.trim()
    searchRef.current = name
    const next = name ? { userName: name } : {}
    setApplied(next)
    setPage(0)
    fetchGroups(name, 0)
    setFilters(EMPTY_FILTER)
  }, [filters, fetchGroups])

  const handleReset = useCallback(() => {
    searchRef.current = ''
    setFilters(EMPTY_FILTER)
    setApplied({})
    setPage(0)
    fetchGroups('', 0)
  }, [fetchGroups])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTER), [])

  const removeChip = useCallback((key) => {
    setApplied((prev) => {
      const next = { ...prev }
      delete next[key]
      // Only 'userName' chip supported — reset search
      searchRef.current = ''
      setPage(0)
      fetchGroups('', 0)
      return next
    })
  }, [fetchGroups])

  // ─────────────────────────────────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handlePrevPage = useCallback(() => {
    if (page <= 0) return
    const next = page - 1
    setPage(next)
    fetchGroups(searchRef.current, next)
  }, [page, fetchGroups])

  const handleNextPage = useCallback(() => {
    if (page >= totalPages - 1) return
    const next = page + 1
    setPage(next)
    fetchGroups(searchRef.current, next)
  }, [page, totalPages, fetchGroups])

  // ─────────────────────────────────────────────────────────────────────────
  // SORT (client-side on the current page)
  // ─────────────────────────────────────────────────────────────────────────

  const handleSort = useCallback((col) => {
    setSortDir((prev) => (sortCol === col ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'))
    setSortCol(col)
  }, [sortCol])

  const sorted = useMemo(() =>
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

  /** Save — add mode calls API directly; edit mode opens confirm modal */
  const handleSave = useCallback(async () => {
    if (!isValid) return

    // Check 1: same user selected more than once in this group
    if (hasDuplicates()) { setDupError(true); return }
    setDupError(false)

    // Check 2: identical combination of users already exists in the loaded list
    if (isDuplicateGroup()) {
      showError('A group with the same users already exists.')
      return
    }

    if (editing) {
      // Edit mode → ask for confirmation before updating
      setConfirm({ type: 'update' })
    } else {
      // Add mode → CreateGroup
      setSaving(true)
      const result = await createGroup({
        User1ID: Number(form.u1),
        User2ID: Number(form.u2),
        User3ID: form.u3 ? Number(form.u3) : 0,
        User4ID: form.u4 ? Number(form.u4) : 0,
      })
      setSaving(false)

      if (!result.success) {
        showError(result.message || 'Failed to create group.')
        return
      }

      const code = result.data?.responseResult?.responseMessage
      if (code === 'Admin_AdminServiceManager_CreateGroup_05') {
        toast.success('User Group added successfully')
        resetForm()
        fetchGroups(searchRef.current, page)
      } else {
        showError(CREATE_GROUP_CODES[code] || 'Failed to create group.')
      }
    }
  }, [isValid, hasDuplicates, isDuplicateGroup, editing, form, showError, resetForm, fetchGroups, page])

  /** Load a group row into the form for editing */
  const startEdit = useCallback((g) => {
    setEditing(g.id)
    setDupError(false)
    setForm({
      u1: g.u1ID ? String(g.u1ID) : '',
      u2: g.u2ID ? String(g.u2ID) : '',
      u3: g.u3ID ? String(g.u3ID) : '',
      u4: g.u4ID ? String(g.u4ID) : '',
    })
  }, [])

  const cancelEdit = useCallback(() => resetForm(), [resetForm])

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIRMATION MODAL HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleDelete = useCallback((id) => setConfirm({ type: 'delete', id }), [])

  /** Yes — execute the confirmed action */
  const handleConfirmYes = useCallback(async () => {
    if (confirm.type === 'update') {
      setSaving(true)
      const result = await updateGroup({
        GroupID: editing,
        User1ID: Number(form.u1),
        User2ID: Number(form.u2),
        User3ID: form.u3 ? Number(form.u3) : 0,
        User4ID: form.u4 ? Number(form.u4) : 0,
      })
      setSaving(false)
      setConfirm(null)

      if (!result.success) {
        showError(result.message || 'Failed to update group.')
        return
      }

      const code = result.data?.responseResult?.responseMessage
      if (code === 'Admin_AdminServiceManager_UpdateGroup_05') {
        toast.success('User Group has been Updated Successfully')
        resetForm()
        fetchGroups(searchRef.current, page)
      } else {
        showError(UPDATE_GROUP_CODES[code] || 'Failed to update group.')
        resetForm()
      }

    } else if (confirm.type === 'delete') {
      const id = confirm.id
      setConfirm(null)
      setDeletingId(id)
      const result = await deleteGroup({ GroupID: id })
      setDeletingId(null)

      if (!result.success) {
        showError(result.message || 'Failed to delete group.')
        return
      }

      const code = result.data?.responseResult?.responseMessage
      if (code === 'Admin_AdminServiceManager_DeleteGroup_03') {
        toast.success('User Group has been removed')
        // If last item on this page and not on first page, step back
        const newPage = (groups.length === 1 && page > 0) ? page - 1 : page
        setPage(newPage)
        fetchGroups(searchRef.current, newPage)
      } else {
        showError(DELETE_GROUP_CODES[code] || 'Failed to delete group.')
      }
    }
  }, [confirm, editing, form, showError, resetForm, fetchGroups, page, groups.length])

  /** No — close dialog; if update confirmation, also reset the form */
  const handleConfirmNo = useCallback(() => {
    if (confirm?.type === 'update') resetForm()
    setConfirm(null)
  }, [confirm, resetForm])

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMN DEFINITIONS
  // ─────────────────────────────────────────────────────────────────────────

  const TABLE_COLS = useMemo(() => [
    { key: 'u1', title: 'User 1', sortable: true },
    { key: 'u2', title: 'User 2', sortable: true },
    {
      key: 'u3', title: 'User 3', sortable: true,
      render: (row) => row.u3 || <span className="text-slate-300">—</span>,
    },
    {
      key: 'u4', title: 'User 4', sortable: true,
      render: (row) => row.u4 || <span className="text-slate-300">—</span>,
    },
    {
      key: 'actions', title: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {/* Edit */}
          <button
            onClick={() => startEdit(row)}
            disabled={deletingId === row.id || saving}
            title="Edit"
            className="w-8 h-8 rounded-lg hover:bg-[#EFF3FF] hover:text-[#0B39B5]
                       text-slate-400 flex items-center justify-center transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SquarePen size={15} />
          </button>
          {/* Delete */}
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deletingId === row.id || saving}
            title="Delete"
            className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600
                       text-slate-400 flex items-center justify-center transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deletingId === row.id
              ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
              : <Trash2 size={15} />
            }
          </button>
        </div>
      ),
    },
  ], [startEdit, handleDelete, deletingId, saving])

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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {['u1', 'u2', 'u3', 'u4'].map((k, i) => (
              <Select
                key={k}
                label={`User ${i + 1}`}
                required={i < 2}
                value={form[k]}
                onChange={(v) => setField(k, v)}
                options={users}
                placeholder={loadingUsers ? 'Loading...' : '-- Select --'}
                disabled={loadingUsers}
                error={dupError && !!form[k]}
                focusBorderColor="#01C9A4"
              />
            ))}
          </div>

          {/* Duplicate-user error (once, below all dropdowns) */}
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
                disabled={saving}
                className="px-5 py-[9px] rounded-lg border border-[#dde4ee]
                           text-[13px] font-medium text-[#041E66] hover:bg-[#EFF3FF]
                           disabled:opacity-40"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="px-5 py-[9px] rounded-lg bg-[#0B39B5] text-white text-[13px]
                         font-semibold hover:bg-[#0a2e94] disabled:opacity-40 transition-colors
                         flex items-center gap-2"
            >
              {saving && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
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
                {k === 'userName' ? 'User Name' : k}: {formatChipValue(v)}
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

        {/* ── Groups table ── */}
        {loadingGroups ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-4 border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
          </div>
        ) : (
          <CommonTable
            columns={TABLE_COLS}
            data={sorted}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}

        {/* ── Pagination (shown only when more than one page) ── */}
        {!loadingGroups && totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-[12px] text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevPage}
                disabled={page === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500
                           hover:bg-[#dde4ee] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[12px] text-slate-600 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500
                           hover:bg-[#dde4ee] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
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
