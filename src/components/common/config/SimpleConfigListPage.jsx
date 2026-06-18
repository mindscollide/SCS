/**
 * src/components/common/config/SimpleConfigListPage.jsx
 * =======================================================
 * Reusable configuration page for simple single-field name lists.
 *
 * Used by:
 *  - SukukListPage          → Approved List of Sukuk
 *  - IslamicBanksPage       → Islamic Bank
 *  - IslamicBankWindowsPage → Islamic Bank Windows
 *  - CharitableOrgsPage     → Charitable Organizations
 *
 * Features:
 *  ▸ EFF3FF header band       — title (left) + SearchFilter (right)
 *  ▸ Inline add form          — single Name* Input + BtnTeal Save
 *  ▸ Live search              — SearchFilter (showFilterPanel=false)
 *  ▸ Sortable table           — Name column asc/desc via CommonTable
 *  ▸ Delete per row           — red Trash2 → ConfirmModal → API delete
 *  ▸ Duplicate check          — server-side (errorMsg returned from onSave)
 *  ▸ Enter key                — submits the form
 *  ▸ Infinite scroll          — useInfiniteScroll hook (sentinel pattern)
 *  ▸ Loading states           — initial spinner, load-more spinner, save/delete
 *
 * ALL interactive elements come from src/components/common/:
 *  Input        → common/Input/Input.jsx
 *  BtnTeal      → common/index.jsx
 *  ConfirmModal → common/index.jsx
 *  SearchFilter → common/searchFilter/SearchFilter.jsx
 *  CommonTable  → common/table/NormalTable.jsx
 *
 * Props:
 *  title            {string}    — page heading text
 *  fieldLabel       {string}    — input label (default "Name")
 *  fieldPlaceholder {string}    — input placeholder text
 *  maxLength        {number}    — max chars for input (default 100)
 *  tableColTitle    {string}    — table "Name" column header (default "Name")
 *  confirmMessage   {string}    — delete confirmation body text
 *  pageSize         {number}    — records per page for infinite scroll (default 10)
 *  tableMaxHeight   {string}    — CSS max-height for scrollable table (default 'calc(90vh - 200px)')
 *  inputRegex       {RegExp}    — optional regex passed to Input for character filtering
 *
 *  // API hooks — each returns a Promise
 *  //
 *  // onFetch  signature (paginated):
 *  //   ({ pageNumber: number, pageSize: number, search: string })
 *  //     → Promise<{ data: [{id, name}], totalCount: number, errorMsg: string }>
 *  //
 *  // Legacy flat signature still supported:
 *  //   () → Promise<{ data: [{id,name}], errorMsg: string }>
 *  //
 *  onFetch  {function}
 *  onSave   {({ id, name }) => Promise<{ success: bool, errorMsg: string }>}
 *  onDelete {({ id })      => Promise<{ success: bool, errorMsg: string }>}
 *
 *  // Legacy / static mode (no API) — kept for backwards compatibility
 *  initialData {Array}  — seed rows [{id:number, name:string}]
 *
 * Usage (paginated):
 *  <SimpleConfigListPage
 *    title="Islamic Bank"
 *    fieldLabel="Bank Name"
 *    fieldPlaceholder="Enter bank name"
 *    onFetch={({ pageNumber, pageSize, search }) => fetchBanks({ pageNumber, pageSize, search })}
 *    onSave={saveBank}
 *    onDelete={deleteBank}
 *  />
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { ConfirmModal, BtnTeal, BtnIconDelete, BtnChipRemove } from '../index.jsx'
import SearchFilter from '../searchFilter/SearchFilter.jsx'
import Input from '../Input/Input.jsx'
import CommonTable from '../table/NormalTable.jsx'
import useInfiniteScroll from '../../../hooks/useInfiniteScroll.js'
import { formatChipValue } from '../../../utils/helpers.js'
// ── Constants ─────────────────────────────────────────────────────────────────
const EMPTY_FILTERS = {}
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'

// ─────────────────────────────────────────────────────────────────────────────

const SimpleConfigListPage = ({
  title,
  fieldLabel = 'Name',
  fieldPlaceholder = 'Enter name',
  maxLength = 100,
  tableColTitle = 'Name',
  initialData = [],
  confirmMessage = 'Are you sure you want to do this action?',
  pageSize = DEFAULT_PAGE_SIZE,
  tableMaxHeight = DEFAULT_TABLE_MAX_HEIGHT,
  inputRegex,
  refreshKey,
  // API props
  onFetch,
  onSave,
  onDelete,
}) => {
  // ── Data state ──────────────────────────────────────────────────────────
  const [data, setData] = useState(initialData)
  const [totalCount, setTotalCount] = useState(initialData.length)
  const [page, setPage] = useState(0)

  // ── Loading / error states ──────────────────────────────────────────────
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [fetchError, setFetchError] = useState('')

  // ── Form ────────────────────────────────────────────────────────────────
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  // ── Search state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('') // ← add
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  // ── Sort ────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // ── Delete modal ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Refs ────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  // Keeps latest state available inside handleLoadMore without stale closures
  const stateRef = useRef({})
  stateRef.current = { page, search }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE FETCH  (supports both paginated and legacy flat onFetch signatures)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (searchQuery = '', pageNumber = 0, append = false) => {
      if (!onFetch) return // static / legacy mode — nothing to fetch

      setFetchError('')
      if (append) setLoadingMore(true)
      else setLoadingInitial(true)

      const result = await onFetch({ pageNumber, pageSize, search: searchQuery })

      if (append) setLoadingMore(false)
      else setLoadingInitial(false)

      if (result.errorMsg) {
        setFetchError(result.errorMsg)
        return
      }

      const rows = result.data ?? []
      const count = result.totalCount ?? rows.length // graceful fallback for legacy hooks

      setData((prev) => (append ? [...prev, ...rows] : rows))
      setTotalCount(count)
    },
    [onFetch, pageSize]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // INITIAL LOAD  (StrictMode-safe single-fire)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!onFetch) return
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData('', 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // EXTERNAL REFRESH  (MQTT-triggered — parent increments refreshKey)
  // ─────────────────────────────────────────────────────────────────────────
  const isFirstRefreshKey = useRef(true)
  useEffect(() => {
    if (refreshKey === undefined) return
    if (isFirstRefreshKey.current) {
      isFirstRefreshKey.current = false
      return
    }
    setPage(0)
    setSearch('')
    setAppliedSearch('')
    fetchData('', 0, false)
  }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // INFINITE SCROLL
  // ─────────────────────────────────────────────────────────────────────────
  // const handleLoadMore = useCallback(() => {
  //   const { page: p, search: q } = stateRef.current
  //   const nextPage = p + 1
  //   setPage(nextPage)
  //   fetchData(q, nextPage, true)
  // }, [fetchData])

  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    const nextPage = p + 1

    // Don't fetch if already fetching this page
    if (loadingMore || loadingInitial) return

    setPage(nextPage)
    fetchData(ap, nextPage, true)
  }, [fetchData, loadingMore, loadingInitial]) // add loading states to deps

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: data.length < totalCount,
    loading: loadingInitial || loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    // SearchFilter calls this when user hits the search button
    setPage(0)
    setAppliedSearch(search)
    fetchData(search, 0, false)
  }, [search, fetchData])

  const handleReset = useCallback(() => {
    setSearch('')
    setAppliedSearch('')
    setPage(0)
    fetchData('', 0, false)
  }, [fetchData])

  // ─────────────────────────────────────────────────────────────────────────
  // SORT  (client-side on the loaded window, matching IslamicBanksPage)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortCol(col)
        setSortDir('asc')
      }
    },
    [sortCol]
  )

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => {
        const va = (a[sortCol] ?? '').toLowerCase()
        const vb = (b[sortCol] ?? '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [data, sortCol, sortDir]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE  (Add new record)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const trimmed = nameInput.trim()

    if (!trimmed) {
      setNameError(`${fieldLabel} is required`)
      return
    }

    // ── Static / no-API mode ─────────────────────────────────────────────
    if (!onSave) {
      if (data.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
        setNameError(`${fieldLabel} already exists`)
        return
      }
      setData((prev) => [...prev, { id: Date.now(), name: trimmed }])
      setTotalCount((c) => c + 1)
      setNameInput('')
      setNameError('')
      toast.success('Record Added Successfully')
      return
    }

    // ── API mode ─────────────────────────────────────────────────────────
    setIsSaving(true)
    const result = await onSave({ id: 0, name: trimmed })
    setIsSaving(false)

    if (!result.success) {
      setNameError(result.errorMsg || 'Failed to save.')
      return
    }

    toast.success('Record Added Successfully')
    setNameInput('')
    setNameError('')
    setPage(0)
    await fetchData(search, 0, false)
  }, [nameInput, data, fieldLabel, onSave, fetchData, search])

  /** Enter key submits the form */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') handleSave()
    },
    [handleSave]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    // ── Static / no-API mode ─────────────────────────────────────────────
    if (!onDelete) {
      setData((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      setTotalCount((c) => c - 1)
      setDeleteTarget(null)
      toast.success('Record Deleted Successfully')
      return
    }

    // ── API mode ─────────────────────────────────────────────────────────
    setIsDeleting(true)
    const result = await onDelete({ id: deleteTarget.id })
    setIsDeleting(false)

    if (!result.success) {
      setDeleteTarget(null)
      toast.error(result.errorMsg || 'Failed to delete.')
      return
    }

    toast.success('Record Deleted Successfully')
    setDeleteTarget(null)
    setPage(0)
    await fetchData(search, 0, false)
  }, [deleteTarget, onDelete, fetchData, search])

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: 'name',
        title: tableColTitle,
        sortable: true,
        render: (row) => <span className="font-semibold text-[#000]">{row.name}</span>,
      },
      {
        key: '_delete',
        title: 'Delete',
        render: (row) => (
          <BtnIconDelete
            type="button"
            onClick={() => setDeleteTarget(row)}
            title="Delete record"
            disabled={isSaving || isDeleting}
          />
        ),
      },
    ],
    [tableColTitle, isSaving, isDeleting]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // FOOTER SLOT  (spinners + sentinel + end-of-list message)
  // ─────────────────────────────────────────────────────────────────────────
  const footerSlot = (
    <>
      {/* Initial load spinner */}
      {loadingInitial && (
        <div className="flex justify-center py-14">
          <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
        </div>
      )}

      {/* Intersection sentinel — always rendered so the observer can attach */}
      <div ref={sentinelRef} className="h-px" />

      {/* Load-more spinner */}
      {loadingMore && (
        <div className="flex justify-center py-5">
          <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
        </div>
      )}

      {/* End-of-list message (only shown when there's more than one page worth) */}
      {!loadingInitial && !loadingMore && totalCount > pageSize && data.length >= totalCount && (
        <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
      )}
    </>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">{title}</h1>
          <SearchFilter
            placeholder="Search by name"
            mainSearch={search}
            setMainSearch={setSearch}
            showFilterPanel={false}
            filters={filters}
            setFilters={setFilters}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="bg-[#EFF3FF] rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Active search chip ── */}
        {appliedSearch && (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                       text-[12px] font-medium text-white bg-[#01C9A4]"
            >
              {fieldLabel}: {formatChipValue(appliedSearch)}
              <BtnChipRemove onClick={handleReset} />
            </span>
          </div>
        )}

        {/* ── Add form ── */}
        <div className="px-4 pt-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="flex-1" onKeyDown={handleKeyDown}>
              <Input
                label={fieldLabel}
                required
                value={nameInput}
                onChange={(v) => {
                  setNameInput(v)
                  if (nameError && v.trim()) setNameError('')
                }}
                placeholder={fieldPlaceholder}
                maxLength={maxLength}
                showCount
                error={!!nameError}
                errorMessage={nameError}
                disabled={isSaving}
                regex={inputRegex}
              />
            </div>

            <div className="shrink-0">
              {/* Phantom spacer aligns button with Input label */}
              <div className="h-[18px] mb-1.5" />
              <BtnTeal
                onClick={handleSave}
                className="px-6 py-[10px]"
                disabled={isSaving || loadingInitial || nameInput === ''}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </BtnTeal>
            </div>
          </div>
        </div>

        {/* ── Fetch error banner ── */}
        {fetchError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-600">
            {fetchError}
          </div>
        )}

        {/* ── Table (scrollable + infinite scroll) ── */}
        <CommonTable
          columns={columns}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Record Found'}
          headerBg="#E0E6F6"
          rowBg="#ffffff"
          rowHoverBg="#f8fafc"
          scrollable
          maxHeight={tableMaxHeight}
          scrollRef={scrollRef}
          footerSlot={footerSlot}
        />
      </div>

      {/* ── ConfirmModal ── */}
      <ConfirmModal
        open={!!deleteTarget}
        message={confirmMessage}
        onYes={handleDeleteConfirm}
        onNo={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default SimpleConfigListPage
