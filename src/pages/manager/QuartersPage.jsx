/**
 * src/pages/manager/QuartersPage.jsx
 * ====================================
 * Manager manages financial quarters.
 *
 * SRS Behaviour
 * ─────────────
 * - Quarter Name: alphanumeric, max 50 chars, required
 * - Start Date: required calendar picker
 * - End Date: required calendar picker, must be >= Start Date
 * - Description: optional, alphanumeric, max 300 chars
 * - Save disabled until all required fields filled
 * - New records get Active status by default
 * - Edit: pre-fills all fields, shows Status checkbox
 * - Update → ConfirmModal → toast "Updated Successfully"
 * - Default sort: Start Date descending
 * - Sortable: Quarter Name, Start Date, End Date, Description
 * - Search: Quarter Name, Start Date, End Date
 * - Search placeholder: Quarter Name (click icon for more options)
 * - Unique keys: Quarter Name | Start Date + End Date
 *
 * API: POST /Manager  (ServiceManager.GetQuarters / ServiceManager.SaveQuarter)
 *
 * Real API response field names (camelCase):
 *   pK_QuarterID  |  quarterName  |  startDate  |  endDate
 *   description   |  fK_QuarterStatusID  |  status ('Active' | 'Closed' | 'Upcoming')
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import {
  ConfirmModal,
  BtnPrimary,
  BtnSlate,
  BtnIconEdit,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Input from '../../components/common/Input/Input'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import DatePicker from '../../components/common/datePicker/DatePicker'
import { formatChipValue } from '../../utils/helpers'
import {
  getQuartersApi,
  GET_QUARTERS_CODES,
  SaveQuartersApi,
  SAVE_QUARTERS_CODES,
} from '../../services/manager.service.js'
import useInfiniteScroll from '../../hooks/useInfiniteScroll.js'

const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'
// ─── Response-code constants ──────────────────────────────────────────────────
const GET_SUCCESS = 'Manager_ManagerServiceManager_GetQuarters_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetQuarters_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveQuarter_05'
const SAVE_DUP = 'Manager_ManagerServiceManager_SaveQuarter_06'

// ─── Status config ────────────────────────────────────────────────────────────
// FK_QuarterStatusID: 1 = Active | 2 = Closed | 3 = Upcoming
const STATUS_STYLES = {
  Active: 'text-[#4dc792]', // green
  Closed: 'text-[#ec4357]', // red
  Upcoming: 'text-[#F59E0B]', // amber
}

// ─── Static config ────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', startDate: null, endDate: null, desc: '' }
const EMPTY_FILTERS = { name: '', startDate: null, endDate: null }

const FILTER_FIELDS = [
  { key: 'name', label: 'Quarter Name', type: 'input', maxLength: 50 },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
]

const CHIP_LABELS = { name: 'Quarter Name', startDate: 'Start Date', endDate: 'End Date' }

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** 'yyyy-mm-dd' → Date (noon UTC, avoids TZ drift) */
const parseDate = (s) => (s ? new Date(s + 'T12:00:00') : null)

/** Date → 'yyyyMMdd'  — API payload format */
const toAPIDate = (d) =>
  d
    ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    : ''

/** 'yyyyMMdd' → 'yyyy-mm-dd'  — local state format */
const fromAPIDate = (s) =>
  s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : ''

/** 'yyyy-mm-dd' → '09 Apr 2026'  — table display */
const fmt = (d) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day} ${MONTH_ABBR[parseInt(m, 10) - 1]} ${y}`
}

// ─── API response mapper ──────────────────────────────────────────────────────
/**
 * Maps one API quarter record to the local shape.
 *
 * API field (camelCase)  → Local field
 * ──────────────────────────────────────────
 * pK_QuarterID           → id
 * quarterName            → name
 * startDate  (yyyyMMdd)  → startDate (yyyy-mm-dd)
 * endDate    (yyyyMMdd)  → endDate   (yyyy-mm-dd)
 * description            → desc
 * fK_QuarterStatusID     → statusId  (1=Active, 2=Closed, 3=Upcoming)
 * status                 → status    ('Active' | 'Closed' | 'Upcoming')
 */
const mapQuarter = (q) => ({
  id: q.pK_QuarterID,
  name: q.quarterName || '',
  startDate: fromAPIDate(q.startDate),
  endDate: fromAPIDate(q.endDate),
  desc: q.description || '',
  statusId: q.fK_QuarterStatusID,
  status: q.status || 'Active',
})

// ─── Component ────────────────────────────────────────────────────────────────
const QuartersPage = () => {
  const [quarters, setQuarters] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  // ── Form ─────────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(null) // pK_QuarterID of the row being edited
  // Checkbox maps Active(1) ↔ checked, Closed(2) ↔ unchecked
  // Upcoming(3) rows are treated as unchecked when entering edit mode
  const [active, setActive] = useState(true)

  // ── Confirm modal ─────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── hasFetched guard (same pattern as PendingRequestsPage) ───────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, name: val })), [])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('startDate')
  const [sortDir, setSortDir] = useState('desc')

  // Keep stateRef in sync — readable inside handleLoadMore without stale closure
  stateRef.current = { page, applied }

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const isValid = form.name.trim() && form.startDate && form.endDate

  const resetForm = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setActive(true)
  }

  // ─── GET Quarters ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const params = {
      QuarterName: appliedFilters.name || '',
      StartDate:
        appliedFilters.startDate instanceof Date ? toAPIDate(appliedFilters.startDate) : '',
      EndDate: appliedFilters.endDate instanceof Date ? toAPIDate(appliedFilters.endDate) : '',
      FK_QuarterStatusID: 0, // 0 = all statuses
      PageSize: 10,
      PageNumber: pageNumber,
    }

    const result = await getQuartersApi(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    // ── 1. Network / service-level failure ───────────────────────────────
    if (!result.success) {
      toast.error(result.message || 'Failed to load quarters.')
      return
    }

    // ── 2. Drill into responseResult ─────────────────────────────────────
    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.quarters) ? rr.quarters.map(mapQuarter) : []
      // setQuarters(rows)
      setQuarters((prev) => (append ? [...prev, ...rows] : rows))
      setTotalCount(rr.totalCount)
      return
    }

    if (code === GET_EMPTY) {
      if (!append) {
        setQuarters([])
        setTotalCount(0)
      }

      return
    }

    toast.error(GET_QUARTERS_CODES[code] || 'Something went wrong, please try again.')
  }, [])

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    setPage(p + 1)
    fetchData(ap, p + 1, true)
  }, [fetchData])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: quarters.length < totalCount,
    loading: loadingInitial || loadingMore, // ← was: loadingMore
    onLoadMore: handleLoadMore,
  })
  // ─── Search handlers ──────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v instanceof Date) next[k] = v
      else if (typeof v === 'string' && v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setPage(0) // ← add this
    fetchData(next, 0, false) // ← was: fetchData(next)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0) // ← add this
    fetchData({}, 0, false) // ← was: fetchData({})
  }, [fetchData])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

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

  // ─── Sort ─────────────────────────────────────────────────────────────────
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
      [...quarters].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [quarters, sortCol, sortDir]
  )

  // ─── Validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Quarter Name is required'
    if (!form.startDate) errs.startDate = 'Start Date is required'
    if (!form.endDate) errs.endDate = 'End Date is required'
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      errs.endDate = 'End Date must be greater than or equal to Start Date'
    return errs
  }

  // ─── Save button click ────────────────────────────────────────────────────
  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    if (editing) {
      setConfirm(true)
    } else {
      callSaveApi(false)
    }
  }

  // ─── SAVE / UPDATE API call ───────────────────────────────────────────────
  const callSaveApi = useCallback(
    async (isUpdate) => {
      setLoadingSave(true)

      const params = {
        PK_QuarterID: isUpdate ? editing : 0,
        QuarterName: form.name.trim(),
        StartDate: toAPIDate(form.startDate), // yyyyMMdd
        EndDate: toAPIDate(form.endDate), // yyyyMMdd
        Description: form.desc.trim(),
        // Create → always Active (1)
        // Update → checked = Active (1), unchecked = Closed (2)
        FK_QuarterStatusID: isUpdate ? (active ? 1 : 2) : 1,
      }

      const result = await SaveQuartersApi(params, { skipLoader: true })

      setLoadingSave(false)

      if (!result.success) {
        toast.error(result.message || 'Failed to save quarter.')
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (code === SAVE_SUCCESS) {
        toast.success(isUpdate ? 'Updated Successfully' : 'Record Added Successfully')
        await fetchData(applied)
        resetForm()
        setPage(0)
        return
      }

      if (code === SAVE_DUP) {
        toast.error(SAVE_QUARTERS_CODES[code])
        setErrors({ name: SAVE_QUARTERS_CODES[code] })
        return
      }

      toast.error(SAVE_QUARTERS_CODES[code] || 'Something went wrong, please try again.')
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editing, form, active, applied, fetchData]
  )

  // ─── Column definitions ───────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'name',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#000]">{r.name}</span>,
      },
      {
        key: 'desc',
        title: 'Description',
        align: 'center',
        sortable: true,
        render: (r) => <span>{r.desc || ''}</span>,
      },
      {
        key: 'startDate',
        title: 'Start Date',
        align: 'center',
        sortable: true,
        render: (r) => <span>{fmt(r.startDate)}</span>,
      },
      {
        key: 'endDate',
        title: 'End Date',
        align: 'center',
        sortable: true,
        render: (r) => <span>{fmt(r.endDate)}</span>,
      },
      {
        key: 'edit',
        title: 'Edit',
        render: (r) => (
          <BtnIconEdit
            onClick={() => {
              setEditing(r.id)
              setForm({
                name: r.name,
                startDate: parseDate(r.startDate),
                endDate: parseDate(r.endDate),
                desc: r.desc || '',
              })
              // Checkbox = checked only when currently Active
              // Closed (2) and Upcoming (3) both come in as unchecked
              setActive(r.statusId === 1)
              setErrors({})
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        ),
      },
      {
        key: 'status',
        title: 'Status',
        align: 'center',
        render: (r) => (
          <span className={`font-semibold ${STATUS_STYLES[r.status] ?? 'text-slate-500'}`}>
            {r.status === 'Closed' ? 'In-Active' : r.status}
          </span>
        ),
      },
    ],
    []
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Quarters</h1>
          <SearchFilter
            placeholder="Search by quarter name"
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

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2">
        {/* ── Active filter chips ── */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k]}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="p-5">
            {/* Row 1: Name | Start Date | End Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Quarter Name"
                required
                placeholder="e.g. Q1 2026"
                value={form.name}
                onChange={(v) => setField('name', v)}
                maxLength={50}
                showCount
                error={!!errors.name}
                errorMessage={errors.name}
                tabIndex={1}
              />
              <div>
                <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={form.startDate}
                  onChange={(d) => setField('startDate', d)}
                  placeholder="dd mmm yyyy"
                  error={errors.startDate}
                  tabIndex={2}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                  End Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={form.endDate}
                  onChange={(d) => setField('endDate', d)}
                  placeholder="dd mmm yyyy"
                  error={errors.endDate}
                  tabIndex={3}
                />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="mb-4">
              <Input
                label="Description"
                placeholder="e.g. First quarter of fiscal year 2026"
                value={form.desc}
                onChange={(v) => setField('desc', v)}
                maxLength={300}
                showCount
                tabIndex={4}
              />
            </div>

            {/* Active checkbox (edit only) + action buttons */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                {editing && (
                  <Checkbox
                    label="Active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                )}
              </div>
              <div className="flex gap-2">
                {editing && <BtnSlate onClick={resetForm}>Cancel</BtnSlate>}
                <BtnPrimary disabled={!isValid || loadingSave} onClick={handleSave}>
                  {loadingSave ? 'Saving…' : editing ? 'Update' : 'Save'}
                </BtnPrimary>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <CommonTable
          columns={COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Records Found'}
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

              {/* 1px sentinel — IntersectionObserver watches this */}
              <div ref={sentinelRef} className="h-px" />

              {loadingMore && (
                <div className="flex justify-center py-5">
                  <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}

              {!loadingInitial &&
                !loadingMore &&
                totalCount > 10 &&
                quarters.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* ── Confirm modal (edit path only) ── */}
      <ConfirmModal
        open={!!confirm}
        message="Are you sure you want to update this record?"
        onYes={() => {
          setConfirm(false)
          callSaveApi(true)
        }}
        onNo={() => setConfirm(false)}
      />
    </div>
  )
}

export default QuartersPage
