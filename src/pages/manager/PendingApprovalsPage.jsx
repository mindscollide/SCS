/**
 * src/pages/manager/PendingApprovalsPage.jsx
 * ============================================
 * Manager's queue of financial-data submissions awaiting approval/decline.
 *
 * APIs used:
 *  getPendingRequestsApi          — paginated listing (server-side infinite scroll)
 *  UpdatePendingApprovalApi       — approve / decline a single row (same API as Bulk page;
 *                                   sends `[row.id]` as a single-element array)
 *  GetAllActiveQuartersApi        — Quarter filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyNamesApi    — Company filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyTickersApi  — Ticker filter dropdown  (localStorage-cached)
 *  GetAllActiveSectorsApi         — Sector filter dropdown  (localStorage-cached)
 *  GetAllUsersForReportsApi       — Sent By filter dropdown (Active users only, StatusID=1)
 *  Dropdown loaders treat the "_01" (no records) code as success with an empty
 *  list — no error toast (no-record responses must never show a snackbar).
 *
 * Columns (SRS §10.1):
 *  Quarter Name · Ticker · Company Name (→ View page) · Sector Name · Sent By · Sent On · Actions
 *  Default sort: Company Name ascending. Sent On comes from `submittedDateTime` (yyyyMMddHHmmss
 *  parsed → dd-mm-yyyy display) — see `parseSubmittedAt`.
 *
 * Actions per row:
 *  Edit    → /manager/financial-data/edit/:financialDataId
 *  Approve → RequestActionModal (type=approve) → UpdatePendingApprovalApi(statusId=2)
 *  Decline → RequestActionModal (type=decline) → UpdatePendingApprovalApi(statusId=3)
 *  Company name click → /manager/financial-data/view/:financialDataId
 *
 * Suggested reasons:
 *  `approve_reasons` / `decline_reasons` keys live in sessionStorage (seeded on login).
 *  Stored as either string[] or [{ reasonName }] — handled in the lazy useState initialiser.
 *
 * Filter resolution:
 *  SearchFilter holds label strings (e.g. Quarter Name). resolveIds() maps each label to its
 *  matching dropdown option PK so the API receives FK_QuarterID, TickerID, SectorID,
 *  FK_CompanyID, SentBy. Date range converts to API yyyyMMdd via `toAPIDateOnly`.
 *
 * Main search box:
 *  Active for Company Name only — when no other filter is selected, the text typed in the
 *  main search box is sent as `CompanyName` (server-side LIKE). When a Company filter chip
 *  is set, typing in the main box clears that chip first to avoid duplicate filtering.
 *
 * Pagination:
 *  Server-side via useLazyLoad (loadedPages offset, Math.ceil(total/PAGE_SIZE) pages).
 *  PageNumber is page-index (0,1,2…). initialLoading passed so the observer re-fires
 *  after the initial fetch even when all rows fit in the viewport without scrolling.
 *
 * MQTT:
 *  `pending_approval_updated` — when any manager (incl. this one or a co-manager via bulk
 *  action) approves/declines records, the central listener relays the payload here. The
 *  handler optimistically removes the matching `dataApprovalRequestID`s from the list and
 *  decrements `totalCount` — no refetch needed.
 *  `financial_data_submitted` — a DataEntry user submitted new data for approval. The
 *  payload data lacks ticker/sector/sentOn, so instead of building a row client-side the
 *  handler silently refetches page 0 with the current filters (fetchData silent mode — no
 *  loading flash). The bell notification for this event is handled in Topbar.
 *
 * Approve/Decline UX:
 *  Single-row action uses the same UpdatePendingApprovalApi as BulkActionPage. Success is
 *  detected via `responseResult.isExecuted === true`; on success the row is optimistically
 *  removed (MQTT echo will be a no-op since the row is already gone) and a success toast
 *  is shown. The Approve/Decline modal stays open during the API call with `isActioning`
 *  preventing double-submit.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import { formatChipValue, toAPIDateOnly, toDisplayDate } from '../../utils/helpers'
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
import useLazyLoad from '../../hooks/useLazyLoad'
import {
  BtnIconEdit,
  BtnIconApprove,
  BtnIconDecline,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common'
import { GetAllUsersForReportsApi } from '../../services/admin.service'

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

// ── Approval status IDs (same as BulkActionPage) ─────────────────────────────
const STATUS_APPROVED = 2
const STATUS_DECLINED = 3

// ── Config ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
// topbar(44) + main-pad(24) + header-band(54) + chips-inside-card(52) + main-pad-bottom(24) ≈ 198px
const TABLE_MAX_HEIGHT = 'calc(100vh - 220px)'

const EMPTY_FILTERS = {
  ticker: '',
  company: '',
  sector: '',
  quarter: '',
  sentBy: '',
  dateRange: { start: '', end: '' },
}

const CHIP_LABELS = {
  ticker: 'Ticker',
  company: 'Company',
  sector: 'Sector',
  quarter: 'Quarter',
  sentBy: 'Sent By',
  dateRange: 'Date',
  CompanyName: 'Company',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Backend sends UTC timestamps (yyyyMMddHHmmss) — parse as UTC, display in local timezone
const parseSubmittedAt = (raw) => {
  if (!raw) return ''
  const s = String(raw)
  if (s.length < 8) return s
  const y = s.slice(0, 4), mo = s.slice(4, 6), d = s.slice(6, 8)
  const h = s.length >= 10 ? s.slice(8, 10) : '00'
  const mi = s.length >= 12 ? s.slice(10, 12) : '00'
  const sc = s.length >= 14 ? s.slice(12, 14) : '00'
  const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${sc}Z`)
  if (isNaN(dt.getTime())) return s
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  const hh = String(dt.getHours()).padStart(2, '0')
  const min = String(dt.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`
}

const mapApproval = (r) => ({
  id: r.dataApprovalRequestID,
  financialDataId: r.fK_FinancialDataID,
  quarter: r.quarterName ?? '',
  ticker: r.ticker ?? '',
  company: r.companyName ?? '',
  sector: r.sectorName ?? '',
  sentBy: r.submittedByName ?? '',
  sentOn: parseSubmittedAt(r.submittedDateTime),
  // ⚠️ backend sp_GetPendingApprovals must SELECT IsException, ExceptionReason from Company
  isException: !!r.isException,
  exceptionReason: r.exceptionReason ?? '',
  raw: r,
})

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

const PendingApprovalsPage = () => {
  const navigate = useNavigate()

  // ── Dropdown options ──────────────────────────────────────────────────────
  const [companyOptions, setCompanyOptions] = useState([])
  const [quarterOptions, setQuarterOptions] = useState([])
  const [tickerOptions, setTickerOptions] = useState([])
  const [sectorOptions, setSectorOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])

  // ── List / pagination ─────────────────────────────────────────────────────
  const [approvals, setApprovals] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loadedPages, setLoadedPages] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)

  // ── Action modal ──────────────────────────────────────────────────────────
  // modal = { row, type: 'approve' | 'decline' }
  const [modal, setModal] = useState(null)
  const [isActioning, setIsActioning] = useState(false)

  // ── Suggested reasons (from Session Storage) ──────────────────────────────
  const [approveReasons] = useState(() => {
    const raw = sessionStorage.getItem('approve_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })
  const [declineReasons] = useState(() => {
    const raw = sessionStorage.getItem('decline_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })

  // ── Filter + search ───────────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const stateRef = useRef({})
  stateRef.current = { applied, approvals }

  // ── Filter fields ─────────────────────────────────────────────────────────
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
        label: 'Sector',
        type: 'select',
        options: sectorOptions.map((o) => o.label),
      },
      {
        key: 'quarter',
        label: 'Quarter',
        type: 'select',
        options: [...quarterOptions].sort((a, b) => b.startDate - a.startDate).map((o) => o.label),
      },
      { key: 'sentBy', label: 'Sent By', type: 'select', options: userOptions.map((o) => o.label) },
      { key: 'dateRange', label: 'Date', type: 'daterange', placeholder: 'Select Date Range' },
    ],
    [companyOptions, tickerOptions, sectorOptions, quarterOptions, userOptions]
  )

  // ── Load dropdown options ─────────────────────────────────────────────────
  useEffect(() => {
    const loadOptions = async () => {
      const [quartersRes, companiesRes, tickersRes, sectorsRes, usersRes] = await Promise.all([
        GetAllActiveQuartersApi({}, { skipLoader: true }),
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
        GetAllActiveCompanyTickersApi({}, { skipLoader: true }),
        GetAllActiveSectorsApi({}, { skipLoader: true }),
        GetAllUsersForReportsApi({ Name: '', StatusID: 1 }, { skipLoader: true }),
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
    }

    loadOptions()
  }, [])

  // ── Fetch listing ─────────────────────────────────────────────────────────
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
        if (!append) { setApprovals([]); setTotalCount(0); setLoadedPages(1) }
        return
      }

      const rr = result.data?.responseResult
      const code = rr?.responseMessage

      if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_03') {
        const newRows = (rr.requests ?? []).map(mapApproval)
        setApprovals((prev) => (append ? [...prev, ...newRows] : newRows))
        setTotalCount(rr.totalCount ?? newRows.length)
        setLoadedPages(append ? (p) => p + 1 : 1)
        return
      }

      if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_02') {
        if (append) {
          // Server ran out of records mid-scroll — clamp so hasMore becomes false.
          setLoadedPages((p) => p + 1)
          setTotalCount(stateRef.current.approvals.length)
        } else {
          setApprovals([]); setTotalCount(0); setLoadedPages(1)
        }
        return
      }

      toast.error(GET_PENDING_APPROVALS_CODES[code] || 'Something went wrong.')
      if (!append) { setApprovals([]); setTotalCount(0); setLoadedPages(1) }
    },
    []
  )

  // ── MQTT ──────────────────────────────────────────────────────────────────
  // Declared AFTER fetchData so the dep array can list it without a TDZ crash
  // (Law 18 — dependencies must be declared before the hook that lists them).
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.PENDING_APPROVAL_UPDATED]: (payload) => {
        const updated = Array.isArray(payload.data) ? payload.data : []
        if (!updated.length) return
        const removedIDs = new Set(updated.map((r) => r.dataApprovalRequestID))
        setApprovals((prev) => prev.filter((r) => !removedIDs.has(r.id)))
        setTotalCount((c) => Math.max(0, c - removedIDs.size))
      },

      // financial_data_submitted — a DataEntry user sent new data for approval.
      // The payload data lacks ticker/sector/sentOn, so a complete row can't be
      // built client-side → silent refetch of page 0 with the current filters
      // (row lands in correct sort position; totalCount stays exact). The bell
      // notification for this event is handled in Topbar.
      [MQTT_TYPE.FINANCIAL_DATA_SUBMITTED]: () => {
        const { applied: ap } = stateRef.current
        setLoadedPages(0)
        fetchData(ap, 0, false, true)
      },
    }),
    [fetchData]
  )

  useSubscribe(mqttTopic, mqttHandler)

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy load (page-index pagination — MEMORY §6) ─────────────────────────
  const { sentinelRef, scrollRef, loadingMore, setLoadingMore } = useLazyLoad({
    offset:         loadedPages,
    total:          Math.ceil(totalCount / PAGE_SIZE),
    initialLoading: loadingInitial,
    onLoadMore: (nextPage) => {
      const { applied: ap } = stateRef.current
      fetchData(ap, nextPage, true)
    },
  })

  // ── Search + filter ───────────────────────────────────────────────────────
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

  const handleMainSearchChange = useCallback(
    (val) => {
      setMainSearch(val)
      if (applied.company) {
        const next = { ...applied }
        delete next.company
        delete next.FK_CompanyID
        delete next.CompanyName
        setApplied(next)
        setLoadedPages(0)
        fetchData(next, 0, false)
      }
    },
    [applied, fetchData]
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
    setLoadedPages(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
  }, [filters, mainSearch, resolveIds, fetchData])

  const handleReset = useCallback(() => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setLoadedPages(0)
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
      setLoadedPages(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ── Sort ──────────────────────────────────────────────────────────────────
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
      [...approvals].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [approvals, sortCol, sortDir]
  )

  // ── Approve / Decline — single row, same API as BulkActionPage ────────────
  // Sends `[row.id]` (dataApprovalRequestID) as a single-element array.
  const handleAction = useCallback(
    async (notes) => {
      const { row, type } = modal
      const statusId = type === 'approve' ? STATUS_APPROVED : STATUS_DECLINED

      setIsActioning(true)
      const result = await UpdatePendingApprovalApi(
        {
          DataApprovalRequestIDs: [row.id],
          FK_DataApprovalRequestStatusID: statusId,
          Comments: notes || '',
        },
        { skipLoader: true }
      )
      setIsActioning(false)

      if (!result.success) {
        toast.error(result.message || `Failed to ${type} record.`)
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (result.data?.responseResult?.isExecuted) {
        // Optimistically remove the row; MQTT will confirm.
        setApprovals((prev) => prev.filter((r) => r.id !== row.id))
        setTotalCount((c) => Math.max(0, c - 1))
        setModal(null)
        toast.success(
          type === 'approve' ? 'Request approved successfully.' : 'Request declined successfully.'
        )
        return
      }

      toast.error(UPDATE_PENDING_APPROVAL_CODES?.[code] || 'Something went wrong.')
    },
    [modal]
  )

  // ── Chip entries ──────────────────────────────────────────────────────────
  const chipEntries = useMemo(
    () =>
      Object.entries(applied).filter(([k]) =>
        ['company', 'ticker', 'sector', 'quarter', 'sentBy', 'dateRange', 'CompanyName'].includes(k)
      ),
    [applied]
  )

  // ── Table columns ─────────────────────────────────────────────────────────
  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'quarter',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold">{r.quarter}</span>,
      },
      { key: 'ticker', title: 'Ticker', sortable: true },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        render: (r) => (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[#0B39B5] font-medium cursor-pointer hover:underline"
              onClick={() =>
                navigate(`/manager/financial-data/view/${r.financialDataId}`, {
                  state: { from: '/manager/pending-approvals', approvalRequestId: r.id, row: r },
                })
              }
            >
              {r.company}
            </span>
            {r.isException && (
              <span title={r.exceptionReason || 'Shariah-advisor exception'}>
                <CircleAlert size={16} className="text-[#F5A623] shrink-0" />
              </span>
            )}
          </div>
        ),
      },
      { key: 'sector', title: 'Sector Name', sortable: true },
      { key: 'sentBy', title: 'Sent By', sortable: true, align: 'center' },
      {
        key: 'sentOn',
        title: 'Sent On',
        sortable: true,
        align: 'center',
        render: (r) => <span className="whitespace-nowrap">{r.sentOn}</span>,
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'center',
        render: (r) => (
          <div className="flex items-center justify-center gap-1">
            <BtnIconEdit
              onClick={() =>
                navigate(`/manager/financial-data/edit/${r.financialDataId}`, {
                  state: { from: '/manager/pending-approvals' },
                })
              }
              className="w-8 h-8 mr-2"
              size={17}
            />
            <BtnIconApprove
              onClick={() => setModal({ row: r, type: 'approve' })}
              className="w-8"
              size={18}
            />
            <BtnIconDecline
              onClick={() => setModal({ row: r, type: 'decline' })}
              className="w-8"
              size={18}
            />
          </div>
        ),
      },
    ],
    [navigate]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Approvals</h1>
          <SearchFilter
            placeholder="Search by company name"
            mainSearch={mainSearch}
            setMainSearch={handleMainSearchChange}
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
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-2">
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

        {/* ── Table ── */}
        <CommonTable
          columns={TABLE_COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Pending Approvals'}
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
                loadedPages >= Math.ceil(totalCount / PAGE_SIZE) && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* ── Approve / Decline modal ── */}
      {modal && (
        <RequestActionModal
          row={modal.row}
          type={modal.type}
          title={modal.type === 'approve' ? 'Approval' : 'Reject'}
          defaultNotes={modal.type === 'approve' ? 'Approved' : 'Declined'}
          onClose={() => !isActioning && setModal(null)}
          onSubmit={handleAction}
          isLoading={isActioning}
          infoFields={[
            { label: 'Company', key: 'company' },
            { label: 'Ticker', key: 'ticker' },
            { label: 'Quarter', key: 'quarter' },
            { label: 'Sent By', key: 'sentBy' },
          ]}
          approveReasons={approveReasons}
          declineReasons={declineReasons}
        />
      )}
    </div>
  )
}

export default PendingApprovalsPage
