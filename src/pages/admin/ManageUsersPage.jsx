/**
 * src/pages/admin/ManageUsersPage.jsx
 * =====================================
 * Admin — view, filter, edit users via ServiceManager.GetViewDetails API.
 *
 * - Server-side filtering & pagination (PageSize=10)
 * - Filter chips show active filters
 * - Pagination bar at the bottom
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Users, SquarePen, X } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  AdminViewDetailEditModal,
  AdminViewGroupsModal,
} from '../../components/common/Modals/Modals'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import {
  getViewDetails, GET_VIEW_DETAILS_CODES,
  editUserDetails, EDIT_USER_DETAILS_CODES,
} from '../../services/admin.service'
import loaderStore from '../../utils/loaderStore'
import { EMAIL_REGEX, formatChipValue } from '../../utils/helpers'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

const EMPTY_FILTERS = {
  userName: '',
  org: '',
  email: '',
  role: '',
  status: '',
}

// filter key → API param name
const FILTER_MAP = {
  userName: 'UserName',
  org: 'OrganizationName',
  email: 'EmailAddress',
  role: 'RoleName',
  status: 'Status',
}

// map API user object → table row
const mapUser = (u) => ({
  id:            u.userID,
  userName:      u.userName,
  fullName:      u.userName,
  firstName:     u.firstName  || u.userName?.split(' ')[0] || '',
  lastName:      u.lastName   || u.userName?.split(' ').slice(1).join(' ') || '',
  org:           u.organizationName,
  email:         u.emailAddress,
  role:          u.roleName,
  status:        u.status,
  roleID:        u.roleID,
  statusID:      u.statusID,
  isGroupMember: u.isGroupMember || false,
  raw:           u,
})

// ─── Page ─────────────────────────────────────────────────────────────────────
const ManageUsersPage = () => {
  const [users, setUsers] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0) // 0-based
  const [sortCol, setSortCol] = useState('userName')
  const [sortDir, setSortDir] = useState('asc')
  const [editUser, setEditUser] = useState(null)
  const [groupUser, setGroupUser] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const filterRef = useRef(null)
  const hasFetched = useRef(false) // prevents StrictMode double-invoke
  const isFirstFetch = useRef(true) // releases login's manual loader hold once

  // ── Close filter panel on outside click ──────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Fetch data from API ───────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0) => {
    const params = { PageSize: PAGE_SIZE, PageNumber: pageNumber }
    Object.entries(appliedFilters).forEach(([k, v]) => {
      if (v) params[FILTER_MAP[k]] = v
    })

    const result = await getViewDetails(params)

    // Release the manual loader hold that LoginPage set — runs only once
    if (isFirstFetch.current) {
      isFirstFetch.current = false
      loaderStore.hide()
    }

    if (!result.success) {
      toast.error(result.message || 'Failed to load users.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === 'Admin_AdminServiceManager_GetViewDetails_03') {
      setUsers(result.data.responseResult.users.map(mapUser))
      setTotalCount(result.data.responseResult.totalCount)
      return
    }

    if (code === 'Admin_AdminServiceManager_GetViewDetails_02') {
      setUsers([])
      setTotalCount(0)
      return
    }

    // _01 or _04
    const msg = GET_VIEW_DETAILS_CODES[code] || 'Something went wrong.'
    toast.error(msg, {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  // ── Load on mount — hasFetched prevents StrictMode double-invoke ──────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
  }, [fetchData])

  // ── Filter search ─────────────────────────────────────────────────────────
  const handleFilterSearch = () => {
    const newApplied = {}
    if (mainSearch.trim()) newApplied.userName = mainSearch.trim()
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) newApplied[k] = v.trim()
    })
    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0)
    setFilters(EMPTY_FILTERS)
  }

  const handleFilterReset = () => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchData({}, 0)
  }

  const handleFilterClose = () => setFilters(EMPTY_FILTERS)

  const removeChip = (key) => {
    const newApplied = { ...applied }
    delete newApplied[key]
    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0)
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
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = [...users].sort((a, b) => {
    const va = (a[sortCol] || '').toLowerCase()
    const vb = (b[sortCol] || '').toLowerCase()
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  // ── Save after edit ───────────────────────────────────────────────────────
  const handleSave = async (form) => {
    const result = await editUserDetails({
      UserID:           editUser.id,
      FirstName:        form.firstName.trim(),
      LastName:         form.lastName.trim(),
      OrganizationName: form.org,
      EmailAddress:     form.email,
      RoleID:           form.roleID,
      StatusID:         form.statusID,
    })

    const code = result.data?.responseResult?.responseMessage

    if (code === 'Admin_AdminServiceManager_EditUserDetails_03') {
      // Update the row in-place — no full refetch needed
      setUsers((prev) => prev.map((u) =>
        u.id === editUser.id
          ? { ...u,
              firstName: form.firstName,
              lastName:  form.lastName,
              fullName:  `${form.firstName} ${form.lastName}`.trim(),
              userName:  `${form.firstName} ${form.lastName}`.trim(),
              org:       form.org,
              email:    form.email,
              role:     form.role,
              status:   form.status,
              roleID:   form.roleID,
              statusID: form.statusID,
            }
          : u
      ))
      toast.success('Updated successfully.', {
        style:         { backgroundColor: '#01C9A4', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      setEditUser(null)
      return
    }

    toast.error(EDIT_USER_DETAILS_CODES[code] || 'Update failed. Please try again.', {
      style:         { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }

  // ── Table columns ─────────────────────────────────────────────────────────
  const COLS = [
    { key: 'userName', title: 'User Name', sortable: true },
    { key: 'org', title: 'Organization Name', sortable: true },
    { key: 'email', title: 'Email ID', sortable: true },
    { key: 'role', title: 'Role', sortable: true },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (row) => (
        <span
          className={`font-semibold ${row.status === 'Active' ? 'text-[#01C9A4]' : 'text-[#E8923A]'}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'groups',
      title: 'Groups',
      render: (row) => row.isGroupMember ? (
        <button
          onClick={() => setGroupUser(row)}
          className="text-[#F5A623] hover:bg-[#fff8ed] rounded p-1.5"
        >
          <Users size={18} />
        </button>
      ) : null,
    },
    {
      key: 'edit',
      title: 'Edit',
      render: (row) => (
        <button
          onClick={() => setEditUser(row)}
          className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5"
        >
          <SquarePen size={18} />
        </button>
      ),
    },
  ]

  // ── Filter fields ─────────────────────────────────────────────────────────
  const fields = [
    {
      key: 'userName',
      label: 'User Name',
      type: 'input',
      regex: /^[a-zA-Z0-9\s]*$/,
      maxLength: 50,
    },
    { key: 'org', label: 'Organization Name', type: 'input', maxLength: 50 },
    { key: 'email', label: 'Email ID', type: 'input', maxLength: 50,
      validate: (v) => v && !EMAIL_REGEX.test(v) ? 'Enter a valid email address.' : null },
    { key: 'role', label: 'Role', type: 'select', options: ['Admin', 'Manager', 'Data Entry'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'In-Active'] },
  ]

  const chipLabel = (key) => fields.find((f) => f.key === key)?.label || key

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">View Details</h1>
          <SearchFilter
            placeholder="Search users..."
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="userName"
            filters={filters}
            setFilters={setFilters}
            fields={fields}
            showFilterPanel={true}
            onSearch={handleFilterSearch}
            onReset={handleFilterReset}
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
                {chipLabel(k)}: {formatChipValue(v)}
                <button onClick={() => removeChip(k)} className="hover:text-white/70">
                  <X size={13} />
                </button>
              </span>
            ))}
            {Object.keys(applied).length > 1 && (
              <button
                onClick={handleFilterReset}
                className="text-[12px] font-semibold text-[#E8923A] hover:underline ml-1"
              >
                Clear All
              </button>
            )}
          </div>
        )}

        {/* ── Table ── */}
        <CommonTable
          columns={COLS}
          data={sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
        />

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-[12px] text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
              {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-lg
                           border border-slate-200 text-[#0B39B5]
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-[#EFF3FF] transition-colors"
              >
                Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i).map((i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i)}
                  className={`w-8 h-8 text-[12px] font-semibold rounded-lg transition-colors
                    ${
                      i === page
                        ? 'bg-[#0B39B5] text-white'
                        : 'border border-slate-200 text-[#0B39B5] hover:bg-[#EFF3FF]'
                    }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-lg
                           border border-slate-200 text-[#0B39B5]
                           disabled:opacity-40 disabled:cursor-not-allowed
                           hover:bg-[#EFF3FF] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {groupUser && <AdminViewGroupsModal user={groupUser} onClose={() => setGroupUser(null)} />}
      {editUser && (
        <AdminViewDetailEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default ManageUsersPage
