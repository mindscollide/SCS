/**
 * pages/manager/SuspendedCompaniesPage.jsx
 * ==========================================
 * Suspended Companies — Manager Configuration page.
 *
 * APIs used:
 *  GetAllActiveQuartersApi     — loads quarter dropdown options (once on mount)
 *  GetAllActiveCompanyNamesApi — loads company dropdown options (once on mount)
 *  GetSuspendedCompaniesApi    — paginated listing with infinite scroll
 *  SaveSuspendedCompanyApi     — add (IsEdit=0) and edit (IsEdit=recordId)
 *  DeleteSuspendedCompanyApi   — delete by company + from/to quarter IDs
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import {
  ConfirmModal,
  BtnTeal,
  BtnSlate,
  BtnIconEdit,
  BtnIconDelete,
} from '../../components/common/index.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter.jsx'
import Select from '../../components/common/select/Select.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import useInfiniteScroll from '../../hooks/useInfiniteScroll.js'
import {
  GetAllActiveQuartersApi,
  GetAllActiveCompanyNamesApi,
  GetSuspendedCompaniesApi,
  GET_SUSPENDED_COMPANIES_CODES,
  SaveSuspendedCompanyApi,
  SAVE_SUSPENDED_COMPANY_CODES,
  DeleteSuspendedCompanyApi,
  DELETE_SUSPENDED_COMPANY_CODES,
} from '../../services/manager.service.js'

// ── Response-code constants ───────────────────────────────────────────────────
const GET_QUARTERS_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const GET_COMPANIES_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const GET_LIST_SUCCESS = 'Manager_ManagerServiceManager_GetSuspendedCompanies_02'
const GET_LIST_EMPTY = 'Manager_ManagerServiceManager_GetSuspendedCompanies_03'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveSuspendedCompany_04'
const DELETE_SUCCESS = 'Manager_ManagerServiceManager_DeleteSuspendedCompany_05'

// ── Config ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'
const EMPTY_FORM = { companyId: null, fromQuarterId: null, toQuarterId: null }

// ── Row mapper ────────────────────────────────────────────────────────────────
const mapRow = (r) => ({
  id: `${r.fK_CompanyID}_${r.fK_FromQuarterID}_${r.fK_ToQuarterID}`, // composite — no PK in response
  companyId: r.fK_CompanyID,
  companyName: r.companyName || '',
  fromQuarterId: r.fK_FromQuarterID ?? null,
  fromQuarterName: r.fromQuarterName || '',
  toQuarterId: r.fK_ToQuarterID ?? null,
  toQuarterName: r.toQuarterName || '',
})

// ── Quarter option mapper ─────────────────────────────────────────────────────
// Stores parsed Date objects so we can do reliable chronological comparisons
// without relying on pK_QuarterID order or string parsing.
// Shape: { value: number, label: string, startDate: Date, endDate: Date }
const mapQuarter = (q) => ({
  value: q.pK_QuarterID,
  label: q.quarterName || '',
  startDate: new Date(q.startDate),
  endDate: new Date(q.endDate),
})

// ─────────────────────────────────────────────────────────────────────────────

const SuspendedCompaniesPage = () => {
  // ── Dropdown options (loaded once) ────────────────────────────────────────
  const [companyOptions, setCompanyOptions] = useState([]) // [{ value, label }]
  const [quarterOptions, setQuarterOptions] = useState([]) // [{ value, label, startDate, endDate }]
  const [loadingOptions, setLoadingOptions] = useState(true)

  // ── Listing ───────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  // ── Loading ───────────────────────────────────────────────────────────────
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Form ──────────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editingId, setEditingId] = useState(null) // null = add mode

  // ── Search / Sort / Delete ────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('companyName')
  const [sortDir, setSortDir] = useState('asc')
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, search }

  // ─────────────────────────────────────────────────────────────────────────
  // QUARTER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Look up a full quarter object (including dates) by its ID. */
  const getQuarterById = useCallback(
    (id) => quarterOptions.find((q) => q.value === id) ?? null,
    [quarterOptions]
  )

  /**
   * From Quarter options:
   *   - When To Quarter IS selected → only show quarters whose endDate is
   *     strictly before the To Quarter's startDate.
   *   - When To Quarter is NOT selected → show all quarters.
   *
   * This prevents the user from picking a From Quarter that is on or after
   * the already-chosen To Quarter.
   */
  const fromQuarterOptions = useMemo(() => {
    if (!form.toQuarterId) return quarterOptions
    const toQ = getQuarterById(form.toQuarterId)
    if (!toQ) return quarterOptions
    return quarterOptions.filter((q) => q.endDate < toQ.startDate)
  }, [quarterOptions, form.toQuarterId, getQuarterById])

  /**
   * To Quarter options:
   *   - When From Quarter IS selected → only show quarters whose startDate is
   *     strictly after the From Quarter's endDate.
   *   - When From Quarter is NOT selected → show all quarters.
   *
   * This prevents the user from picking a To Quarter that is on or before
   * the already-chosen From Quarter.
   */
  const toQuarterOptions = useMemo(() => {
    if (!form.fromQuarterId) return quarterOptions
    const fromQ = getQuarterById(form.fromQuarterId)
    if (!fromQ) return quarterOptions
    return quarterOptions.filter((q) => q.startDate > fromQ.endDate)
  }, [quarterOptions, form.fromQuarterId, getQuarterById])

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD DROPDOWN OPTIONS  (quarters + companies in parallel, once on mount)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)

      const [quartersRes, companiesRes] = await Promise.all([
        GetAllActiveQuartersApi({}, { skipLoader: true }),
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
      ])

      // ── Quarters ──────────────────────────────────────────────────────────
      if (quartersRes.success) {
        const rr = quartersRes.data?.responseResult
        if (rr?.responseMessage === GET_QUARTERS_SUCCESS) {
          setQuarterOptions((rr.quarters ?? []).map(mapQuarter))
        } else {
          toast.error('Failed to load quarters.')
        }
      } else {
        toast.error(quartersRes.message || 'Failed to load quarters.')
      }

      // ── Companies ─────────────────────────────────────────────────────────
      if (companiesRes.success) {
        const rr = companiesRes.data?.responseResult
        if (rr?.responseMessage === GET_COMPANIES_SUCCESS) {
          setCompanyOptions(
            (rr.companies ?? []).map((c) => ({ value: c.pK_CompanyID, label: c.companyName || '' }))
          )
        } else {
          toast.error('Failed to load companies.')
        }
      } else {
        toast.error(companiesRes.message || 'Failed to load companies.')
      }

      setLoadingOptions(false)
    }

    loadOptions()
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH LISTING
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (searchQuery = '', pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const result = await GetSuspendedCompaniesApi(
      { CompanyName: searchQuery, PageSize: PAGE_SIZE, PageNumber: pageNumber },
      { skipLoader: true }
    )

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load suspended companies.')
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_LIST_SUCCESS) {
      const fetched = Array.isArray(rr.suspendedCompanies) ? rr.suspendedCompanies.map(mapRow) : []
      setRows((prev) => (append ? [...prev, ...fetched] : fetched))
      setTotalCount(rr.totalCount ?? fetched.length)
      return
    }

    if (code === GET_LIST_EMPTY) {
      if (!append) {
        setRows([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_SUSPENDED_COMPANIES_CODES[code] || 'Something went wrong.')
  }, [])

  // ── Initial load (StrictMode-safe single-fire) ────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData('', 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    const { page: p, search: q } = stateRef.current
    const nextPage = p + 1
    setPage(nextPage)
    fetchData(q, nextPage, true)
  }, [fetchData])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: rows.length < totalCount,
    loading: loadingInitial || loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH
  // ─────────────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    setPage(0)
    fetchData(search, 0, false)
  }, [search, fetchData])

  const handleReset = useCallback(() => {
    setSearch('')
    setPage(0)
    fetchData('', 0, false)
  }, [fetchData])

  // ─────────────────────────────────────────────────────────────────────────
  // SORT  (client-side — sort quarter columns by actual startDate)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col) => {
      setSortDir((d) => (sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1

        if (sortCol === 'fromQuarterId' || sortCol === 'toQuarterId') {
          // Use the stored startDate from quarterOptions for accurate chronological sort
          const nameKey = sortCol === 'fromQuarterId' ? 'fromQuarterName' : 'toQuarterName'
          const aQ = quarterOptions.find((q) => q.label === a[nameKey])
          const bQ = quarterOptions.find((q) => q.label === b[nameKey])
          const aTime = aQ ? aQ.startDate.getTime() : 0
          const bTime = bQ ? bQ.startDate.getTime() : 0
          return (aTime - bTime) * dir
        }

        return (a[sortCol] || '').localeCompare(b[sortCol] || '') * dir
      }),
    [rows, sortCol, sortDir, quarterOptions]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // FORM HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const setF = useCallback((key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }, [])

  const validate = useCallback(() => {
    const errs = {}
    if (!form.companyId) errs.companyId = 'Company is required'
    if (!form.fromQuarterId) errs.fromQuarterId = 'From Quarter is required'
    if (!form.toQuarterId) errs.toQuarterId = 'To Quarter is required'
    // Date-ordering is already enforced by the filtered dropdowns,
    // so no extra check is needed here.
    return errs
  }, [form])

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE (add) / UPDATE (edit) — unified via editingId
  // ─────────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setIsSaving(true)
    const result = await SaveSuspendedCompanyApi(
      {
        IsEdit: editingId ?? 0,
        FK_CompanyID: form.companyId,
        FK_FromQuarterID: form.fromQuarterId,
        FK_ToQuarterID: form.toQuarterId ?? 0,
      },
      { skipLoader: true }
    )
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to save.')
      return
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === SAVE_SUCCESS) {
      toast.success(editingId ? 'Record Updated Successfully' : 'Record Added Successfully')
      setForm(EMPTY_FORM)
      setErrors({})
      setEditingId(null)
      setPage(0)
      await fetchData(search, 0, false)
      return
    }

    toast.error(SAVE_SUSPENDED_COMPANY_CODES[code] || 'Something went wrong.')
  }, [form, editingId, validate, fetchData, search])

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────────────────────────────────────
  const handleEdit = useCallback((row) => {
    setForm({
      companyId: row.companyId,
      fromQuarterId: row.fromQuarterId,
      toQuarterId: row.toQuarterId,
    })
    setErrors({})
    setEditingId(row.id)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setForm(EMPTY_FORM)
    setErrors({})
    setEditingId(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    if (editingId === deleteTarget.id) handleCancelEdit()

    setIsDeleting(true)
    const result = await DeleteSuspendedCompanyApi(
      {
        FK_CompanyID: deleteTarget.companyId,
        FK_FromQuarterID: deleteTarget.fromQuarterId ?? 0,
        FK_ToQuarterID: deleteTarget.toQuarterId ?? 0,
      },
      { skipLoader: true }
    )
    setIsDeleting(false)

    if (!result.success) {
      setDeleteTarget(null)
      toast.error(result.message || 'Failed to delete.')
      return
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === DELETE_SUCCESS) {
      toast.success('Record Deleted Successfully')
      setDeleteTarget(null)
      setPage(0)
      await fetchData(search, 0, false)
      return
    }

    setDeleteTarget(null)
    toast.error(DELETE_SUSPENDED_COMPANY_CODES[code] || 'Something went wrong.')
  }, [deleteTarget, editingId, handleCancelEdit, fetchData, search])

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: 'companyName',
        title: 'Company Name',
        sortable: true,
        render: (row) => (
          <span className="font-semibold text-[#000]">{row.companyName || '—'}</span>
        ),
      },
      {
        key: 'fromQuarterId',
        title: 'From Quarter',
        sortable: true,
        align: 'center',
        render: (row) => <span className="text-[#000]">{row.fromQuarterName || '—'}</span>,
      },
      {
        key: 'toQuarterId',
        title: 'To Quarter',
        sortable: true,
        align: 'center',
        render: (row) => <span className="text-[#000]">{row.toQuarterName || '—'}</span>,
      },
      {
        key: '_edit',
        title: 'Edit',
        render: (row) => (
          <BtnIconEdit
            onClick={() => handleEdit(row)}
            size={16}
            disabled={isSaving || isDeleting}
          />
        ),
      },
      {
        key: '_delete',
        title: 'Delete',
        render: (row) => (
          <BtnIconDelete onClick={() => setDeleteTarget(row)} disabled={isSaving || isDeleting} />
        ),
      },
    ],
    [handleEdit, isSaving, isDeleting]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const isEditing = editingId !== null

  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Suspended Companies</h1>
          <SearchFilter
            placeholder="Search by company"
            mainSearch={search}
            setMainSearch={setSearch}
            showFilterPanel={false}
            filters={{}}
            setFilters={() => {}}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="bg-[#EFF3FF] rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Inline form ── */}
        <div className="px-4 pt-4 pb-7 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
            {/* Company */}
            <Select
              label="Company"
              required
              placeholder={loadingOptions ? 'Loading…' : 'Select Company'}
              options={companyOptions}
              value={form.companyId}
              onChange={(v) => setF('companyId', v)}
              error={!!errors.companyId}
              errorMessage={errors.companyId}
              disabled={loadingOptions || isSaving}
            />

            {/* From Quarter ─────────────────────────────────────────────────
                Options are pre-filtered: only quarters whose endDate is
                strictly before the selected To Quarter's startDate.
                If the user picks a From Quarter that makes the current To
                Quarter invalid, To Quarter is automatically cleared.
            ──────────────────────────────────────────────────────────────── */}
            <Select
              label="From Quarter Name"
              required
              placeholder={loadingOptions ? 'Loading…' : 'Select Quarter Name'}
              options={fromQuarterOptions}
              value={form.fromQuarterId}
              onChange={(v) => {
                const fromQ = quarterOptions.find((q) => q.value === v) ?? null
                const toQ = getQuarterById(form.toQuarterId)
                // Keep To Quarter only if it is still strictly after the new From Quarter
                const toStillValid = fromQ && toQ && toQ.startDate > fromQ.endDate
                setForm((p) => ({
                  ...p,
                  fromQuarterId: v,
                  toQuarterId: toStillValid ? p.toQuarterId : null,
                }))
                setErrors((p) => ({ ...p, fromQuarterId: '', toQuarterId: '' }))
              }}
              error={!!errors.fromQuarterId}
              errorMessage={errors.fromQuarterId}
              disabled={loadingOptions || isSaving}
            />

            {/* To Quarter ───────────────────────────────────────────────────
                Options are pre-filtered: only quarters whose startDate is
                strictly after the selected From Quarter's endDate.
                If the user picks a To Quarter that makes the current From
                Quarter invalid, From Quarter is automatically cleared.
            ──────────────────────────────────────────────────────────────── */}
            <Select
              label="To Quarter Name"
              required
              placeholder={loadingOptions ? 'Loading…' : 'Select To Quarter Name'}
              options={toQuarterOptions}
              value={form.toQuarterId}
              onChange={(v) => {
                const toQ = quarterOptions.find((q) => q.value === v) ?? null
                const fromQ = getQuarterById(form.fromQuarterId)
                // Keep From Quarter only if it is still strictly before the new To Quarter
                const fromStillValid = toQ && fromQ && fromQ.endDate < toQ.startDate
                setForm((p) => ({
                  ...p,
                  toQuarterId: v,
                  fromQuarterId: fromStillValid ? p.fromQuarterId : null,
                }))
                setErrors((p) => ({ ...p, toQuarterId: '', fromQuarterId: '' }))
              }}
              error={!!errors.toQuarterId}
              errorMessage={errors.toQuarterId}
              disabled={loadingOptions || isSaving}
            />

            {/* Buttons — phantom spacer aligns with Select label height */}
            <div>
              <div className="h-[18px] mb-1.5" />
              <div className="flex items-center gap-2">
                {isEditing && (
                  <BtnSlate onClick={handleCancelEdit} disabled={isSaving}>
                    Cancel
                  </BtnSlate>
                )}
                <BtnTeal
                  onClick={handleSave}
                  disabled={
                    loadingOptions ||
                    loadingInitial ||
                    isSaving ||
                    !form.companyId ||
                    !form.fromQuarterId ||
                    !form.toQuarterId
                  }
                >
                  {isSaving ? 'Saving…' : isEditing ? 'Update' : 'Save'}
                </BtnTeal>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
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
          maxHeight={TABLE_MAX_HEIGHT}
          scrollRef={scrollRef}
          footerSlot={
            <>
              {loadingInitial && (
                <div className="flex justify-center py-14">
                  <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}
              <div ref={sentinelRef} className="h-px" />
              {loadingMore && (
                <div className="flex justify-center py-5">
                  <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}
              {!loadingInitial &&
                !loadingMore &&
                totalCount > PAGE_SIZE &&
                rows.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* ── Delete confirm modal ── */}
      <ConfirmModal
        open={!!deleteTarget}
        message="Are you sure you want to do this action?"
        onYes={handleDeleteConfirm}
        onNo={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default SuspendedCompaniesPage
