/**
 * src/pages/manager/BulkActionPage.jsx
 * ======================================
 * Manager selects multiple pending records and bulk approves / declines.
 *
 * APIs used:
 *  GetAllActiveQuartersApi          — quarter dropdown options (once on mount)
 *  GetAllActiveCompanyNamesApi      — company dropdown options (once on mount)
 *  GetAllActiveCompanyTickersApi    — ticker dropdown options (once on mount)
 *  GetAllActiveSectorsApi           — sector dropdown options (once on mount)
 *  GetAllUsersForReportsApi         — sent-by dropdown options (once on mount)
 *  Dropdown loaders treat the "_01" (no records) code as success with an empty
 *  list — no error toast (no-record responses must never show a snackbar).
 *  getPendingRequestsApi            — paginated listing with infinite scroll
 *  BulkApprovePendingApi            — bulk approve selected records
 *  BulkDeclinePendingApi            — bulk decline selected records
 *
 * Hook ordering note:
 *  fetchData (useCallback) is declared BEFORE mqttHandler so mqttHandler can
 *  safely list fetchData in its dependency array (avoids TDZ crash).
 *
 * MQTT:
 *  `pending_approval_updated` — optimistically removes actioned rows (and their
 *  selection ticks) by dataApprovalRequestID; no refetch.
 *  `financial_data_submitted` — new pending submission. Silently refetches page 0
 *  with the current filters, but ONLY when nothing is selected — a refetch clears
 *  the selection (see fetchData), so an in-progress bulk action is never yanked.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import { BtnPrimary, BtnGold, BtnChipRemove, BtnClearAll } from '../../components/common'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import { formatChipValue, toAPIDateOnly, toDisplayDate } from '../../utils/helpers'
import CommonTable from '../../components/common/table/NormalTable'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'
import {
  getPendingRequestsApi,
  GET_PENDING_APPROVALS_CODES,
  UpdatePendingApprovalApi,
  UPDATE_PENDING_APPROVAL_CODES,
  GetAllActiveQuartersApi,
  GetAllActiveCompanyNamesApi,
  GetAllActiveCompanyTickersApi,
  GetAllActiveSectorsApi,
} from '../../services/manager.service'
import { GetAllUsersForReportsApi } from '../../services/admin.service'
import { useNavigate } from 'react-router-dom'

// ── Response-code constants ───────────────────────────────────────────────────
const GET_QUARTERS_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const GET_COMPANIES_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const GET_TICKERS_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveCompanyTickers_02'
const GET_SECTORS_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveSectors_02'
const GET_USERS_SUCCESS = 'Admin_AdminServiceManager_GetAllUsersForReports_02'
// "_01" = no records found — treated as success with an empty list (silent, no toast)
const GET_QUARTERS_EMPTY = 'Manager_ManagerServiceManager_GetAllActiveQuarters_01'
const GET_COMPANIES_EMPTY = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_01'
const GET_TICKERS_EMPTY = 'Manager_ManagerServiceManager_GetAllActiveCompanyTickers_01'
const GET_SECTORS_EMPTY = 'Manager_ManagerServiceManager_GetAllActiveSectors_01'
const GET_USERS_EMPTY = 'Admin_AdminServiceManager_GetAllUsersForReports_01'

// ── Approval status IDs ───────────────────────────────────────────────────────
const STATUS_APPROVED = 2
const STATUS_DECLINED = 3

// ── Config ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'

// Filter state shape
const EMPTY_FILTERS = {
  company: '',
  ticker: '',
  sector: '',
  quarter: '',
  sentBy: '',
  dateRange: { start: '', end: '' },
}

const CHIP_LABELS = {
  company: 'Company',
  ticker: 'Ticker',
  sector: 'Sector',
  quarter: 'Quarter',
  sentBy: 'Sent By',
  dateRange: 'Date',
  CompanyName: 'Company',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "20260101080000" → "01-01-2026" */
const parseSubmittedAt = (raw) => {
  if (!raw) return ''
  const s = String(raw)
  if (s.length < 8) return s
  return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`
}

/** Map list-API row → UI row */
const mapApproval = (r) => ({
  id: r.dataApprovalRequestID,
  financialDataId: r.fK_FinancialDataID,
  quarter: r.quarterName ?? '',
  ticker: r.ticker ?? '',
  company: r.companyName ?? '',
  sector: r.sectorName ?? '',
  sentBy: r.submittedByName ?? '',
  sentOn: parseSubmittedAt(r.submittedDateTime),
  raw: r,
})

/** Quarter option mapper — stores parsed Dates for sorting */
const parseQuarterDate = (raw) => {
  const d = raw?.replace(/^(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3T00:00:00')
  return d ? new Date(d) : new Date(0)
}

const mapQuarter = (q) => ({
  ...q,
  value: q.pK_QuarterID,
  label: q.quarterName || '',
  startDate: parseQuarterDate(q.startDate),
  endDate: parseQuarterDate(q.endDate),
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const BulkActionPage = () => {
  const navigate = useNavigate()
  // ── Dropdown options (loaded once on mount) ───────────────────────────────
  const [companyOptions, setCompanyOptions] = useState([])
  const [quarterOptions, setQuarterOptions] = useState([])
  const [tickerOptions, setTickerOptions] = useState([])
  const [sectorOptions, setSectorOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // ── Listing ───────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSel] = useState(new Set())
  const [modal, setModal] = useState(null) // { type: 'approve' | 'decline' }

  // ── Search / Filter ───────────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('quarter')
  const [sortDir, setSortDir] = useState('desc')

  // ── Action loading ────────────────────────────────────────────────────────
  const [isActioning, setIsActioning] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied, selected }

  // ── Suggested reasons (from Session Storage) ──────────────────────────────
  const [approveReasons] = useState(() => {
    const raw = sessionStorage.getItem('approve_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })
  const [declineReasons] = useState(() => {
    const raw = sessionStorage.getItem('decline_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH LISTING
  // ─────────────────────────────────────────────────────────────────────────
  // silent=true → background refetch (MQTT) — rows swap in place without
  // flashing the initial-loading spinner.
  const fetchData = useCallback(
    async (appliedFilters = {}, pageNumber = 0, append = false, silent = false) => {
      if (append) setLoadingMore(true)
      else if (!silent) setLoadingInitial(true)

      const params = {
        CompanyName: appliedFilters.CompanyName || '',
        FK_CompanyID: appliedFilters.FK_CompanyID || 0,
        TickerID: appliedFilters.TickerID || 0,
        SectorID: appliedFilters.SectorID || 0,
        FK_QuarterID: appliedFilters.FK_QuarterID || 0,
        SentBy: appliedFilters.SentBy || 0,
        DateFrom: appliedFilters.sentOnFrom || '',
        DateTo: appliedFilters.sentOnTo || '',
        PageSize: PAGE_SIZE,
        PageNumber: pageNumber,
      }

      const result = await getPendingRequestsApi(params, { skipLoader: true })

      if (append) setLoadingMore(false)
      else if (!silent) setLoadingInitial(false)

      if (!result.success) {
        toast.error(result.message || 'Failed to load pending approvals.')
        return
      }

      const rr = result.data?.responseResult
      const code = rr?.responseMessage

      if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_03') {
        const newRows = (rr.requests ?? []).map(mapApproval)
        setRows((prev) => (append ? [...prev, ...newRows] : newRows))
        setTotalCount(rr.totalCount ?? newRows.length)
        setSel(new Set()) // clear selection on new fetch
        return
      }

      if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_02') {
        if (!append) {
          setRows([])
          setTotalCount(0)
        }
        return
      }

      toast.error(GET_PENDING_APPROVALS_CODES[code] || 'Something went wrong.')
    },
    []
  )

  // ── MQTT ───────────────────────────────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.PENDING_APPROVAL_UPDATED]: (payload) => {
        const updated = Array.isArray(payload.data) ? payload.data : []
        if (!updated.length) return
        const removedIDs = new Set(updated.map((r) => r.dataApprovalRequestID))
        setRows((prev) => prev.filter((r) => !removedIDs.has(r.id)))
        setTotalCount((c) => Math.max(0, c - removedIDs.size))
        setSel((prev) => {
          const next = new Set(prev)
          removedIDs.forEach((id) => next.delete(id))
          return next
        })
      },

      // financial_data_submitted — new pending submission. Refetch page 0 with
      // current filters UNLESS the manager has rows ticked: fetchData clears the
      // selection on success, so refetching mid-selection would yank an
      // in-progress bulk action. The list catches up on the next search/action.
      [MQTT_TYPE.FINANCIAL_DATA_SUBMITTED]: () => {
        const { applied: ap, selected: sel } = stateRef.current
        if (sel?.size) return
        setPage(0)
        fetchData(ap, 0, false, true)
      },
    }),
    [fetchData]
  )

  useSubscribe(mqttTopic, mqttHandler)

  // ─────────────────────────────────────────────────────────────────────────
  // DYNAMIC FILTER FIELDS  (built after options load)
  // ─────────────────────────────────────────────────────────────────────────
  const filterFields = useMemo(
    () => [
      {
        key: 'ticker',
        label: 'Ticker',
        type: 'select',
        options: tickerOptions.map((o) => o.label),
      },
      {
        key: 'company',
        label: 'Company Name',
        type: 'select',
        options: companyOptions.map((o) => o.label),
      },
      {
        key: 'sector',
        label: 'Sector Name',
        type: 'select',
        options: sectorOptions.map((o) => o.label),
      },
      {
        key: 'quarter',
        label: 'Quarter Name',
        type: 'select',
        options: [...quarterOptions].sort((a, b) => b.startDate - a.startDate).map((o) => o.label),
      },
      {
        key: 'sentBy',
        label: 'Sent By',
        type: 'select',
        options: userOptions.map((o) => o.label),
      },
      {
        key: 'dateRange',
        label: 'Sent On',
        type: 'daterange',
        placeholder: 'Select date range',
      },
    ],
    [companyOptions, tickerOptions, sectorOptions, quarterOptions, userOptions]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD DROPDOWN OPTIONS  (all in parallel, once on mount)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)

      const [quartersRes, companiesRes, tickersRes, sectorsRes, usersRes] = await Promise.all([
        GetAllActiveQuartersApi({}, { skipLoader: true }),
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
        GetAllActiveCompanyTickersApi({}, { skipLoader: true }),
        GetAllActiveSectorsApi({}, { skipLoader: true }),
        GetAllUsersForReportsApi({}, { skipLoader: true }),
      ])

      if (quartersRes.success) {
        const rr = quartersRes.data?.responseResult
        if (
          rr?.responseMessage === GET_QUARTERS_SUCCESS ||
          rr?.responseMessage === GET_QUARTERS_EMPTY
        )
          setQuarterOptions((rr.quarters ?? []).map(mapQuarter))
        else toast.error('Failed to load quarters.')
      } else toast.error(quartersRes.message || 'Failed to load quarters.')

      if (companiesRes.success) {
        const rr = companiesRes.data?.responseResult
        if (
          rr?.responseMessage === GET_COMPANIES_SUCCESS ||
          rr?.responseMessage === GET_COMPANIES_EMPTY
        )
          setCompanyOptions(
            (rr.companies ?? []).map((c) => ({ value: c.pK_CompanyID, label: c.companyName || '' }))
          )
        else toast.error('Failed to load companies.')
      } else toast.error(companiesRes.message || 'Failed to load companies.')

      if (tickersRes.success) {
        const rr = tickersRes.data?.responseResult
        if (
          rr?.responseMessage === GET_TICKERS_SUCCESS ||
          rr?.responseMessage === GET_TICKERS_EMPTY
        )
          setTickerOptions(
            (rr.companies ?? []).map((t) => ({ value: t.pK_CompanyID, label: t.ticker || '' }))
          )
        else toast.error('Failed to load tickers.')
      } else toast.error(tickersRes.message || 'Failed to load tickers.')

      if (sectorsRes.success) {
        const rr = sectorsRes.data?.responseResult
        if (
          rr?.responseMessage === GET_SECTORS_SUCCESS ||
          rr?.responseMessage === GET_SECTORS_EMPTY
        )
          setSectorOptions(
            (rr.sectors ?? []).map((s) => ({ value: s.pK_SectorID, label: s.sectorName || '' }))
          )
        else toast.error('Failed to load sectors.')
      } else toast.error(sectorsRes.message || 'Failed to load sectors.')

      if (usersRes.success) {
        const rr = usersRes.data?.responseResult
        if (rr?.responseMessage === GET_USERS_SUCCESS || rr?.responseMessage === GET_USERS_EMPTY)
          setUserOptions(
            (rr.users ?? []).map((u) => ({
              value: u.pK_UserID,
              label: `${u.firstName} (${u.emailAddress})`,
            }))
          )
        else toast.error('Failed to load senders.')
      } else toast.error(usersRes.message || 'Failed to load senders.')

      setLoadingOptions(false)
    }
    loadOptions()
  }, [])

  // ── Initial fetch (StrictMode-safe) ──────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ───────────────────────────────────────────────────────
  // const handleLoadMore = useCallback(() => {
  //   const { page: p, applied: ap } = stateRef.current
  //   const next = p + 1
  //   setPage(next)
  //   fetchData(ap, next, true)
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
    hasMore: rows.length < totalCount,
    loading: loadingInitial || loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────
  const resolveIds = useCallback(
    (filterState) => {
      const resolved = {}

      if (filterState.company) {
        const co = companyOptions.find((o) => o.label === filterState.company)
        if (co) resolved.FK_CompanyID = co.value
        resolved.company = filterState.company
      }
      if (filterState.ticker) {
        const to = tickerOptions.find((o) => o.label === filterState.ticker)
        if (to) resolved.TickerID = to.value
        resolved.ticker = filterState.ticker
      }
      if (filterState.sector) {
        const so = sectorOptions.find((o) => o.label === filterState.sector)
        if (so) resolved.SectorID = so.value
        resolved.sector = filterState.sector
      }
      if (filterState.quarter) {
        const qo = quarterOptions.find((o) => o.label === filterState.quarter)
        if (qo) resolved.FK_QuarterID = qo.value
        resolved.quarter = filterState.quarter
      }
      if (filterState.sentBy) {
        const uo = userOptions.find((o) => o.label === filterState.sentBy)
        if (uo) resolved.SentBy = uo.value
        resolved.sentBy = filterState.sentBy
      }

      return resolved
    },
    [companyOptions, tickerOptions, sectorOptions, quarterOptions, userOptions]
  )

  const handleSearch = useCallback(() => {
    const hasFilterSelected = Object.entries(filters).some(([k, v]) => {
      if (k === 'dateRange') return v.start || v.end
      return typeof v === 'string' && v.trim()
    })

    const newApplied = resolveIds(filters)

    if (mainSearch.trim() && !hasFilterSelected) {
      newApplied.CompanyName = mainSearch.trim()
    }

    if (filters.dateRange?.start || filters.dateRange?.end) {
      newApplied.dateRange = filters.dateRange
      if (filters.dateRange.start) newApplied.sentOnFrom = toAPIDateOnly(filters.dateRange.start)
      if (filters.dateRange.end) newApplied.sentOnTo = toAPIDateOnly(filters.dateRange.end)
    }

    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
  }, [filters, mainSearch, resolveIds, fetchData])

  const handleReset = useCallback(() => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchData({}, 0, false)
  }, [fetchData])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      const next = { ...applied }
      delete next[key]
      if (key === 'company') {
        delete next.FK_CompanyID
        delete next.CompanyName
      }
      if (key === 'CompanyName') delete next.CompanyName
      if (key === 'ticker') delete next.TickerID
      if (key === 'sector') delete next.SectorID
      if (key === 'quarter') delete next.FK_QuarterID
      if (key === 'sentBy') delete next.SentBy
      if (key === 'dateRange') {
        delete next.dateRange
        delete next.sentOnFrom
        delete next.sentOnTo
      }
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SORT  (client-side on loaded page)
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
      [...rows].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        if (sortCol === 'quarter') {
          const aQ = quarterOptions.find((q) => q.label === a.quarter)
          const bQ = quarterOptions.find((q) => q.label === b.quarter)
          return ((aQ?.startDate?.getTime() ?? 0) - (bQ?.startDate?.getTime() ?? 0)) * dir
        }
        return (a[sortCol] || '').localeCompare(b[sortCol] || '') * dir
      }),
    [rows, sortCol, sortDir, quarterOptions]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CHECKBOX HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const allChecked = sorted.length > 0 && sorted.every((r) => selected.has(r.id))
  const hasSelection = selected.size > 0

  const toggleAll = useCallback(() => {
    if (allChecked) setSel(new Set())
    else setSel(new Set(sorted.map((r) => r.id)))
  }, [allChecked, sorted])

  const toggleOne = useCallback((id) => {
    setSel((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // BULK APPROVE / DECLINE
  // ─────────────────────────────────────────────────────────────────────────
  const handleAction = useCallback(
    async (notes) => {
      const { type } = modal
      const selectedIds = [...selected]
      const count = selectedIds.length
      const statusId = type === 'approve' ? STATUS_APPROVED : STATUS_DECLINED

      setIsActioning(true)
      const result = await UpdatePendingApprovalApi(
        {
          DataApprovalRequestIDs: selectedIds, // full array of selected IDs
          FK_DataApprovalRequestStatusID: statusId,
          Comments: notes || '',
        },
        { skipLoader: true }
      )
      setIsActioning(false)

      if (!result.success) {
        toast.error(result.message || `Failed to ${type} records.`)
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (result.data?.responseResult?.isExecuted) {
        // Optimistically remove from table; MQTT will confirm
        setRows((prev) => prev.filter((r) => !selected.has(r.id)))
        setTotalCount((c) => Math.max(0, c - count))
        setSel(new Set())
        setModal(null)
        toast.success(
          `${count} record${count !== 1 ? 's' : ''} ${type === 'approve' ? 'approved' : 'declined'} successfully.`
        )
        return
      }

      toast.error(UPDATE_PENDING_APPROVAL_CODES?.[code] || 'Something went wrong.')
    },
    [modal, selected]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Chip display keys
  // ─────────────────────────────────────────────────────────────────────────
  const chipEntries = useMemo(
    () =>
      Object.entries(applied).filter(([k]) =>
        ['company', 'ticker', 'sector', 'quarter', 'sentBy', 'dateRange', 'CompanyName'].includes(k)
      ),
    [applied]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────────────────
  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'checkbox',
        title: (
          <Checkbox
            label={allChecked ? 'Unselect All' : 'Select All'}
            checked={allChecked}
            onChange={toggleAll}
            labelClassName="text-[12px] font-semibold"
          />
        ),
        render: (r) => (
          <Checkbox
            checked={selected.has(r.id)}
            onChange={() => toggleOne(r.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: 'quarter',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#000]">{r.quarter}</span>,
      },
      { key: 'ticker', title: 'Ticker', sortable: true, align: 'center' },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        align: 'center',
        render: (r) => (
          <span
            className="text-[#0B39B5] font-medium cursor-pointer hover:underline"
            onClick={() =>
              navigate(`/manager/financial-data/view/${r.financialDataId}`, {
                state: { from: '/manager/bulk-action' },
              })
            }
          >
            {r.company}
          </span>
        ),
      },
      { key: 'sector', title: 'Sector Name', sortable: true, align: 'center' },
      { key: 'sentBy', title: 'Sent By', sortable: true, align: 'center' },
      {
        key: 'sentOn',
        title: 'Sent On',
        sortable: true,
        align: 'center',
        render: (r) => <span className="whitespace-nowrap">{r.sentOn}</span>,
      },
    ],
    [allChecked, selected, toggleAll, toggleOne]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Bulk Action</h1>
          <SearchFilter
            placeholder="Search by company name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="company"
            filters={filters}
            setFilters={setFilters}
            fields={filterFields}
            showFilterPanel={true}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
          />
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="bg-[#EFF3FF] rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Applied filter chips ── */}
        {chipEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            {chipEntries.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {k === 'dateRange'
                  ? `Date: ${v.start ? toDisplayDate(v.start) : '…'} → ${v.end ? toDisplayDate(v.end) : '…'}`
                  : `${CHIP_LABELS[k] ?? k}: ${formatChipValue(v)}`}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {chipEntries.length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Approve / Decline buttons ── */}
        <div className="flex justify-end gap-3 px-4 pt-4 pb-2">
          <BtnPrimary
            disabled={!hasSelection || isActioning || loadingInitial}
            onClick={() => hasSelection && setModal({ type: 'approve' })}
          >
            Approve
          </BtnPrimary>
          <BtnGold
            disabled={!hasSelection || isActioning || loadingInitial}
            onClick={() => hasSelection && setModal({ type: 'decline' })}
          >
            Decline
          </BtnGold>
        </div>

        {/* ── Table ── */}
        <CommonTable
          columns={TABLE_COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Records Found'}
          headerBg="#E0E6F6"
          rowBg="#ffffff"
          rowHoverBg="#f8fafc"
          onRowClick={(r) => toggleOne(r.id)}
          rowClassName={(r) =>
            `cursor-pointer transition-colors ${selected.has(r.id) ? 'bg-[#e8faf4]' : ''}`
          }
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

      {/* ── Approve / Decline modal ── */}
      {modal && (
        <RequestActionModal
          row={{}}
          type={modal.type}
          title={modal.type === 'approve' ? 'Approval' : 'Reject'}
          defaultNotes={modal.type === 'approve' ? 'Approved' : 'Declined'}
          onClose={() => !isActioning && setModal(null)}
          onSubmit={handleAction}
          isLoading={isActioning}
          infoFields={[
            {
              label: 'Selected Records',
              value: `${selected.size} record${selected.size !== 1 ? 's' : ''}`,
            },
            {
              label: 'Action',
              value: modal.type === 'approve' ? 'Bulk Approve' : 'Bulk Decline',
            },
          ]}
          approveReasons={approveReasons}
          declineReasons={declineReasons}
        />
      )}
    </div>
  )
}

export default BulkActionPage
