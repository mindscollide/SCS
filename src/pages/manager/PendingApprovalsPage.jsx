/**
 * src/pages/manager/PendingApprovalsPage.jsx
 *
 * Changes from previous version:
 *  - All filter-panel fields are now searchable dropdowns (Company, Ticker,
 *    Sector, Quarter, Sent By) — same pattern as SuspendedCompaniesPage.
 *  - Option states (companyOptions, tickerOptions, sectorOptions,
 *    quarterOptions, userOptions) are declared and populated on mount.
 *  - resolveIds() converts selected display-labels → numeric IDs before
 *    passing them to fetchData.
 *  - fetchData params now match the new API shape:
 *      FK_CompanyID, CompanyName, TickerID, SectorID, FK_QuarterID, SentBy,
 *      DateFrom, DateTo, PageSize, PageNumber
 *  - Broken usersRes handler fixed (was checking GET_SECTORS_SUCCESS instead
 *    of GET_USERS_SUCCESS).
 *  - removeChip cleans up all resolved ID keys that belong to a chip label.
 *  - chipEntries only shows label keys, never raw ID keys.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import { AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import FinancialDataTable, {
  MOCK_QUARTERS,
  MOCK_COMPANIES,
  MOCK_RATIOS,
} from '../../components/common/table/FinancialDataTable'
import { formatChipValue, toAPIDateOnly, toDisplayDate } from '../../utils/helpers'
import {
  getPendingRequestsApi,
  GET_PENDING_APPROVALS_CODES,
  getPendingApprovalDetailsApi,
  GET_PENDING_APPROVAL_DETAILS_CODES,
  GetAllActiveQuartersApi,
  GetAllActiveCompanyNamesApi,
  GetAllActiveCompanyTickersApi,
  GetAllActiveSectorsApi,
} from '../../services/manager.service'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'
import {
  ConfirmModal,
  BtnPrimary,
  BtnGold,
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

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(100vh - 200px)'

// Filter state shape — keys map 1-to-1 with FILTER_FIELDS keys
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
  CompanyName: 'Company', // main-search fallback label
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  quarter: r.quarterName ?? '',
  ticker: r.ticker ?? '',
  company: r.companyName ?? '',
  sector: r.sectorName ?? '',
  sentBy: r.submittedByName ?? '',
  sentOn: parseSubmittedAt(r.submittedDateTime),
  raw: r,
})

/** Quarter option mapper — stores parsed Dates for chronological sorting */
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
// Detail info card
// ─────────────────────────────────────────────────────────────────────────────

const DetailInfoCard = ({ detail }) => {
  if (!detail) return null

  const fields = [
    { label: 'Company', value: detail.companyName },
    { label: 'Ticker', value: detail.ticker },
    { label: 'Quarter', value: detail.quarterName },
    { label: 'Status', value: detail.status },
    { label: 'Submitted By', value: detail.submittedByName },
    { label: 'Submitted At', value: parseSubmittedAt(detail.submittedDateTime) },
    { label: 'Start Date', value: parseSubmittedAt(detail.startDate) },
    { label: 'End Date', value: parseSubmittedAt(detail.endDate) },
  ]

  return (
    <div className="mb-4 p-4 bg-[#f8faff] border border-[#dde4ee] rounded-xl">
      {detail.description && (
        <p className="text-[12px] text-[#6b7c9e] mb-3 italic">"{detail.description}"</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[11px] font-medium text-[#6b7c9e] uppercase tracking-wide">
              {label}
            </p>
            <p className="text-[13px] font-semibold text-[#041E66] mt-0.5">{value || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PendingApprovalsPage = () => {
  // ── Dropdown options (loaded once on mount) ───────────────────────────────
  const [companyOptions, setCompanyOptions] = useState([]) // [{ value, label }]
  const [quarterOptions, setQuarterOptions] = useState([]) // [{ value, label, startDate, endDate }]
  const [tickerOptions, setTickerOptions] = useState([]) // [{ value, label }]
  const [sectorOptions, setSectorOptions] = useState([]) // [{ value, label }]
  const [userOptions, setUserOptions] = useState([]) // [{ value, label }]
  const [loadingOptions, setLoadingOptions] = useState(true)

  // ── View state ───────────────────────────────────────────────────────────
  const [view, setView] = useState('list')
  const [activeRow, setActiveRow] = useState(null)

  // ── Detail page state ────────────────────────────────────────────────────
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  // ── Financial data state ─────────────────────────────────────────────────
  const [ratios, setRatios] = useState(MOCK_RATIOS)
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')

  // ── List / pagination state ──────────────────────────────────────────────
  const [approvals, setApprovals] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Action modal ─────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)

  // ── Suggested reasons (from Session Storage) ─────────────────────────────
  const [approveReasons] = useState(() => {
    const raw = sessionStorage.getItem('approve_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })
  const [declineReasons] = useState(() => {
    const raw = sessionStorage.getItem('decline_reasons')
    return raw ? JSON.parse(raw).map((item) => item.reasonName || item) : []
  })

  // ── Filter + search ──────────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // ── Refs ─────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied }

  // ── MQTT ──────────────────────────────────────────────────────────────────
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
    }),
    []
  )

  useSubscribe(mqttTopic, mqttHandler)

  // ─────────────────────────────────────────────────────────────────────────
  // DYNAMIC FILTER FIELDS  (built after options load so selects are populated)
  // ─────────────────────────────────────────────────────────────────────────
  const filterFields = useMemo(
    () => [
      {
        key: 'company',
        label: 'Company Name',
        type: 'select',
        options: companyOptions.map((o) => o.label),
      },
      {
        key: 'ticker',
        label: 'Ticker',
        type: 'select',
        options: tickerOptions.map((o) => o.label),
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
        // Quarters sorted descending by startDate per spec
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
        label: 'Date',
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
        GetAllUsersForReportsApi(
          {
            Name: '',
            StatusID: 1,
          },
          { skipLoader: true }
        ),
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
            (rr.companies ?? []).map((c) => ({
              value: c.pK_CompanyID,
              label: c.companyName || '',
            }))
          )
        } else {
          toast.error('Failed to load companies.')
        }
      } else {
        toast.error(companiesRes.message || 'Failed to load companies.')
      }

      // ── Tickers ───────────────────────────────────────────────────────────
      if (tickersRes.success) {
        const rr = tickersRes.data?.responseResult
        if (rr?.responseMessage === GET_TICKERS_SUCCESS) {
          setTickerOptions(
            (rr.companies ?? []).map((t) => ({
              value: t.pK_CompanyID,
              label: t.ticker || '',
            }))
          )
        } else {
          toast.error('Failed to load tickers.')
        }
      } else {
        toast.error(tickersRes.message || 'Failed to load tickers.')
      }

      // ── Sectors ───────────────────────────────────────────────────────────
      if (sectorsRes.success) {
        const rr = sectorsRes.data?.responseResult
        if (rr?.responseMessage === GET_SECTORS_SUCCESS) {
          setSectorOptions(
            (rr.sectors ?? []).map((s) => ({
              value: s.pK_SectorID,
              label: s.sectorName || '',
            }))
          )
        } else {
          toast.error('Failed to load sectors.')
        }
      } else {
        toast.error(sectorsRes.message || 'Failed to load sectors.')
      }

      // ── Users (Sent By) ───────────────────────────────────────────────────
      // NOTE: verify the exact field names (pK_UserID / userName) against your
      // actual GetAllUsersForReports response shape and adjust if needed.
      if (usersRes.success) {
        const rr = usersRes.data?.responseResult
        if (rr?.responseMessage === GET_USERS_SUCCESS) {
          setUserOptions(
            (rr.users ?? []).map((u) => ({
              value: u.pK_UserID,
              label: u.firstName,
            }))
          )
        } else {
          toast.error('Failed to load senders.')
        }
      } else {
        toast.error(usersRes.message || 'Failed to load senders.')
      }

      setLoadingOptions(false)
    }

    loadOptions()
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH — LIST
  // Accepts `appliedFilters` with resolved numeric IDs + optional CompanyName.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

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
    else setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load pending approvals.')
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_03') {
      const newRows = (rr.requests ?? []).map(mapApproval)
      setApprovals((prev) => (append ? [...prev, ...newRows] : newRows))
      setTotalCount(rr.totalCount ?? newRows.length)
      return
    }

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_02') {
      if (!append) {
        setApprovals([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_PENDING_APPROVALS_CODES[code] || 'Something went wrong.')
  }, [])

  // ── Mount — single-fire (StrictMode-safe) ────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH — DETAIL
  // ─────────────────────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async (approvalId) => {
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)

    const result = await getPendingApprovalDetailsApi(approvalId, { skipLoader: true })
    setDetailLoading(false)

    if (!result.success) {
      const msg = result.message || 'Failed to load approval details.'
      setDetailError(msg)
      toast.error(msg)
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovalDetails_04') {
      const req = rr.request
      setDetail(req)
      setSelectedQuarter(req.quarterName ?? '')
      setSelectedCompany(req.companyName ?? '')
      setRatios(MOCK_RATIOS)
      return
    }

    const errMsg =
      GET_PENDING_APPROVAL_DETAILS_CODES[code] || 'Something went wrong, please try again.'
    setDetailError(errMsg)
    toast.error(errMsg)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────
  const openRow = useCallback(
    (row, mode) => {
      setActiveRow(row)
      setView(mode)
      fetchDetail(row.id)
    },
    [fetchDetail]
  )

  const backToList = useCallback(() => {
    setView('list')
    setActiveRow(null)
    setDetail(null)
    setDetailError(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // CELL EDIT
  // ─────────────────────────────────────────────────────────────────────────
  const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
    setRatios((prev) =>
      prev.map((ratio) =>
        ratio.id !== ratioId
          ? ratio
          : {
              ...ratio,
              classifications: ratio.classifications.map((cls) =>
                cls.id !== classId
                  ? cls
                  : { ...cls, values: cls.values.map((v, i) => (i === colIdx ? val : v)) }
              ),
            }
      )
    )
  }, [])

  const handleUpdate = useCallback(() => setConfirm('update'), [])

  const handleConfirmProceed = useCallback(() => {
    if (confirm === 'close') {
      setConfirm(null)
      backToList()
    }
    if (confirm === 'update') {
      setConfirm(null)
      toast.success('Record Updated Successfully.')
      backToList()
    }
  }, [confirm, backToList])

  const handleConfirmCancel = useCallback(() => setConfirm(null), [])

  // ─────────────────────────────────────────────────────────────────────────
  // INFINITE SCROLL
  // ─────────────────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    setPage(p + 1)
    fetchData(ap, p + 1, true)
  }, [fetchData])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: approvals.length < totalCount,
    loading: loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resolve a filter label back to its numeric ID using the loaded options.
   */
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

    // Only carry main-search company name when NO dropdown filter is active
    if (mainSearch.trim() && !hasFilterSelected) {
      newApplied.CompanyName = mainSearch.trim()
    }

    // Date range
    if (filters.dateRange?.start || filters.dateRange?.end) {
      newApplied.dateRange = filters.dateRange
      if (filters.dateRange.start) newApplied.sentOnFrom = toAPIDateOnly(filters.dateRange.start)
      if (filters.dateRange.end) newApplied.sentOnTo = toAPIDateOnly(filters.dateRange.end)
    }

    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS) // close filter panel with cleared fields
  }, [filters, mainSearch, resolveIds, fetchData])

  const handleReset = useCallback(() => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchData({}, 0, false)
  }, [fetchData])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  /** Remove a single chip and re-fetch without it */
  const removeChip = useCallback(
    (key) => {
      const next = { ...applied }
      // Remove the display label
      delete next[key]
      // Remove the corresponding resolved ID key
      if (key === 'company') {
        delete next.FK_CompanyID
        delete next.CompanyName
      }
      if (key === 'CompanyName') {
        delete next.CompanyName
      }
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
  // SORT  (client-side)
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
      [...approvals].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [approvals, sortCol, sortDir]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // APPROVE / DECLINE
  // ─────────────────────────────────────────────────────────────────────────
  const handleAction = useCallback(async () => {
    const { row, type } = modal
    setApprovals((prev) => prev.filter((r) => r.id !== row.id))
    setTotalCount((c) => c - 1)
    toast.success(
      type === 'approve' ? 'Request approved successfully.' : 'Request declined successfully.'
    )
    setModal(null)
  }, [modal])

  // ─────────────────────────────────────────────────────────────────────────
  // Chip display keys — only label keys, never resolved ID keys
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
        key: 'quarter',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold">{r.quarter}</span>,
      },
      { key: 'ticker', title: 'Ticker', sortable: true, align: 'center' },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        align: 'center',
        render: (r) => (
          <span className="cursor-pointer" onClick={() => openRow(r, 'view')}>
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
      {
        key: 'actions',
        title: 'Actions',
        align: 'center',
        render: (r) => (
          <div className="flex items-center justify-center gap-1">
            <BtnIconEdit onClick={() => openRow(r, 'edit')} className="w-8 h-8 mr-2" size={17} />
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
    [openRow]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — VIEW / EDIT MODE
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'view' || view === 'edit') {
    const isEdit = view === 'edit'

    return (
      <div className="font-sans">
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">{isEdit ? 'Edit' : 'View'}</h1>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
          <div className="bg-white rounded-xl p-5 border border-[#dde4ee]">
            {detailLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                <p className="text-[13px] text-[#6b7c9e]">Loading approval details…</p>
              </div>
            )}

            {!detailLoading && detailError && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-[14px] font-medium text-red-500">{detailError}</p>
                <BtnPrimary onClick={() => fetchDetail(activeRow?.id)} className="mt-2">
                  Retry
                </BtnPrimary>
              </div>
            )}

            {!detailLoading && !detailError && detail && (
              <FinancialDataTable
                quarters={MOCK_QUARTERS}
                companies={MOCK_COMPANIES}
                selectedQuarter={selectedQuarter}
                onQuarterChange={setSelectedQuarter}
                selectedCompany={selectedCompany}
                onCompanyChange={setSelectedCompany}
                ratios={ratios}
                searched
                editableCol={isEdit ? 0 : -1}
                onCellChange={isEdit ? handleCellChange : undefined}
                disableQuarter={!isEdit}
                disableCompany={!isEdit}
                actions={
                  <>
                    <BtnGold size="lg" onClick={isEdit ? () => setConfirm('close') : backToList}>
                      Close
                    </BtnGold>
                    {isEdit && (
                      <BtnPrimary size="lg" onClick={handleUpdate}>
                        Update
                      </BtnPrimary>
                    )}
                  </>
                }
              />
            )}
          </div>
        </div>

        <ConfirmModal
          open={!!confirm}
          message={
            confirm === 'close'
              ? 'All the changes will be lost. Are you sure you want to close?'
              : 'Are you sure you want to update the information?'
          }
          onYes={handleConfirmProceed}
          onNo={handleConfirmCancel}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — LIST MODE
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
            setMainSearch={setMainSearch}
            mainSearchKey="company"
            filters={filters}
            setFilters={setFilters}
            fields={filterFields} // ← dynamic, dropdown-backed
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
                approvals.length >= totalCount && (
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
          onClose={() => setModal(null)}
          onSubmit={handleAction}
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
