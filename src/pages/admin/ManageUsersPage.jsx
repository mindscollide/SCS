/**
 * src/pages/admin/ManageUsersPage.jsx
 * =====================================
 * Admin — view, filter, edit users via ServiceManager.GetViewDetails API.
 *
 * - Server-side filtering & pagination (PageSize=10)
 * - Infinite scroll via useInfiniteScroll hook
 * - Table has fixed height, sticky header, internal scroll — page never scrolls
 * - Filter chips show active filters
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
import { EMAIL_REGEX, formatChipValue } from '../../utils/helpers'
import useLazyLoad from '../../hooks/useLazyLoad'

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

// Topbar 44px + main padding-top 24px + heading bar ~52px + mb-2 8px + card padding-top 20px + buffer 12px
const TABLE_MAX_HEIGHT = 'calc(100vh - 200px)'

const EMPTY_FILTERS = {
  userName: '',
  org:      '',
  email:    '',
  role:     '',
  status:   '',
}

const FILTER_MAP = {
  userName: 'UserName',
  org:      'OrganizationName',
  email:    'EmailAddress',
  role:     'RoleName',
  status:   'Status',
}

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
  const [users,          setUsers]          = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)  // first-load in-table spinner
  const [sortCol,     setSortCol]     = useState('userName')
  const [sortDir,     setSortDir]     = useState('asc')
  const [editUser,    setEditUser]    = useState(null)
  const [groupUser,   setGroupUser]   = useState(null)
  const [mainSearch,  setMainSearch]  = useState('')
  const [filters,     setFilters]     = useState(EMPTY_FILTERS)
  const [applied,     setApplied]     = useState({})

  const [totalCount,  setTotalCount]  = useState(0)
  const [loadedPages, setLoadedPages] = useState(0)  // pages already fetched (0-based count)

  const hasFetched = useRef(false)  // prevents StrictMode double-invoke
  const liveRef    = useRef({})     // always-fresh snapshot for load-more callback
  liveRef.current  = { applied }

  // ── useLazyLoad — owns loadingMore + sentinel ──────────────────────────────
  // offset = pages already loaded; total = total pages → hasMore = loadedPages < totalPages
  const { sentinelRef, scrollRef, loadingMore, setLoadingMore } = useLazyLoad({
    offset:     loadedPages,
    total:      Math.ceil(totalCount / PAGE_SIZE),
    onLoadMore: (nextPage) => {
      const { applied: ap } = liveRef.current
      fetchData(ap, nextPage, true)   // nextPage = 1, 2, 3 …
    },
  })

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)

    const params = { PageSize: PAGE_SIZE, PageNumber: pageNumber }
    Object.entries(appliedFilters).forEach(([k, v]) => { if (v) params[FILTER_MAP[k]] = v })

    // skipLoader: true — global full-screen loader stays hidden;
    // loadingInitial / loadingMore spinners handle feedback instead
    const result = await getViewDetails(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load users.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === 'Admin_AdminServiceManager_GetViewDetails_03') {
      const newUsers = result.data.responseResult.users.map(mapUser)
      setUsers((prev) => append ? [...prev, ...newUsers] : newUsers)
      setTotalCount(result.data.responseResult.totalCount)
      if (append) setLoadedPages((p) => p + 1)
      else        setLoadedPages(1)
      return
    }

    if (code === 'Admin_AdminServiceManager_GetViewDetails_02') {
      if (!append) { setUsers([]); setTotalCount(0); setLoadedPages(0) }
      return
    }

    toast.error(GET_VIEW_DETAILS_CODES[code] || 'Something went wrong.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [setLoadingMore, setTotalCount])

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter search ─────────────────────────────────────────────────────────
  const handleFilterSearch = () => {
    const newApplied = {}
    if (mainSearch.trim()) newApplied.userName = mainSearch.trim()
    Object.entries(filters).forEach(([k, v]) => { if (v.trim()) newApplied[k] = v.trim() })
    setApplied(newApplied)
    setLoadedPages(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
  }

  const handleFilterReset = () => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setLoadedPages(0)
    fetchData({}, 0, false)
  }

  const handleFilterClose = () => setFilters(EMPTY_FILTERS)

  const removeChip = (key) => {
    const newApplied = { ...applied }
    delete newApplied[key]
    setApplied(newApplied)
    setLoadedPages(0)
    fetchData(newApplied, 0, false)
  }

  // ── Sort (client-side within loaded rows) ─────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
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
      setUsers((prev) => prev.map((u) =>
        u.id === editUser.id
          ? { ...u,
              firstName: form.firstName,
              lastName:  form.lastName,
              fullName:  `${form.firstName} ${form.lastName}`.trim(),
              userName:  `${form.firstName} ${form.lastName}`.trim(),
              org:       form.org,
              email:     form.email,
              role:      form.role,
              status:    form.status,
              roleID:    form.roleID,
              statusID:  form.statusID,
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
    { key: 'userName', title: 'User Name',         sortable: true },
    { key: 'org',      title: 'Organization Name', sortable: true },
    { key: 'email',    title: 'Email ID',           sortable: true },
    { key: 'role',     title: 'Role',               sortable: true },
    {
      key: 'status', title: 'Status', sortable: true,
      render: (row) => (
        <span className={`font-semibold ${row.status === 'Active' ? 'text-[#01C9A4]' : 'text-[#E8923A]'}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'groups', title: 'Groups',
      render: (row) => row.isGroupMember ? (
        <button onClick={() => setGroupUser(row)} className="text-[#F5A623] hover:bg-[#fff8ed] rounded p-1.5">
          <Users size={18} />
        </button>
      ) : null,
    },
    {
      key: 'edit', title: 'Edit',
      render: (row) => (
        <button onClick={() => setEditUser(row)} className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5">
          <SquarePen size={18} />
        </button>
      ),
    },
  ]

  // ── Filter fields ─────────────────────────────────────────────────────────
  const fields = [
    { key: 'userName', label: 'User Name',         type: 'input',  regex: /^[a-zA-Z0-9\s]*$/, maxLength: 50 },
    { key: 'org',      label: 'Organization Name', type: 'input',  maxLength: 50 },
    { key: 'email',    label: 'Email ID',           type: 'input',  maxLength: 50,
      validate: (v) => v && !EMAIL_REGEX.test(v) ? 'Enter a valid email address.' : null },
    { key: 'role',     label: 'Role',               type: 'select', options: ['Admin', 'Manager', 'Data Entry'] },
    { key: 'status',   label: 'Status',             type: 'select', options: ['Active', 'In-Active'] },
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

        {/*
         * ── Table ──
         * scrollable   → inner div gets overflow-auto + maxHeight; thead is sticky
         * scrollRef    → ref on the scroll container, passed to useInfiniteScroll
         * footerSlot   → sentinel + spinner rendered INSIDE the scroll container
         *                so the observer fires on table scroll, not page scroll
         */}
        <CommonTable
          columns={COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Record Found'}
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
              {!loadingInitial && !loadingMore && totalCount > PAGE_SIZE && users.length >= totalCount && totalCount > 0 && (
                <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
              )}
            </>
          }
        />
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
