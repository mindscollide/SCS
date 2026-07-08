/**
 * src/pages/manager/CompaniesPage.jsx
 * =====================================
 * Manage Companies — Manager Configuration page.
 *
 * APIs used:
 *  GetCompaniesApi                      — paginated listing with filters + infinite scroll
 *  SaveCompanyApi                       — create (PK_CompanyID=0) or update (PK>0)
 *  GetAllActiveSectorsApi               — Sector dropdown (localStorage-cached)
 *  GetAllActiveMarketsApi               — Market dropdown (localStorage-cached)
 *  GetAllActiveReportingMonthsApi       — Annual Reporting dropdown (localStorage-cached)
 *  GetAllActiveReportingFrequencyApi    — Reporting Frequency dropdown (localStorage-cached)
 *  GetAllActiveCompanyNamesApi          — Company Name filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyTickersApi        — Ticker filter dropdown (localStorage-cached)
 *
 * MQTT:
 *  `company_saved` → inline row update using payload IDs + stateRef dropdown
 *  option arrays to resolve display names (sectorName, marketName, reportingName,
 *  frequencyName). Status text derived from fkCompanyStatusID (2=InActive, else Active).
 *  If the PK is not found in the current list, a new row is prepended and totalCount
 *  is incremented. Dropdown caches (company_names + company_tickers) are invalidated
 *  in the central useMqttListener handler so subsequent filter fetches get fresh data.
 *  ⚠️ stateRef must carry the dropdown option arrays (not just page+applied) so the
 *  stable useCallback handler can resolve names without stale closure issues.
 *
 * Grace Period:
 *  Derived server-side from the selected Reporting Frequency — the field is disabled
 *  in the form and its value comes from the API, not user input.
 *
 * Pagination:
 *  Server-side via useInfiniteScroll. PageNumber is page-index (0,1,2…). CommonTable
 *  always rendered — sentinel must stay in DOM (see MEMORY §6).
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { CircleAlert } from 'lucide-react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import {
  ConfirmModal,
  BtnPrimary,
  BtnSlate,
  BtnIconEdit,
  BtnChipRemove,
  BtnClearAll,
  Checkbox,
} from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Input from '../../components/common/Input/Input'
import { formatChipValue } from '../../utils/helpers'
import {
  GetCompaniesApi,
  GET_COMPANIES_CODES,
  SaveCompanyApi,
  SAVE_COMPANY_CODES,
  GetAllActiveSectorsApi,
  GetAllActiveMarketsApi,
  GetAllActiveReportingMonthsApi,
  GetAllActiveReportingFrequencyApi,
  GetAllActiveCompanyNamesApi,
  GetAllActiveCompanyTickersApi,
} from '../../services/manager.service.js'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
// topbar(44) + main-pad(24) + header-band(54) + card-pad(40) + chips(48) + form-edit(180) + card-bot+mb-2(28) + main-pad-bot(24) ≈ 442px
const TABLE_MAX_HEIGHT = 'calc(100vh - 385px)'

const GET_SUCCESS = 'Manager_ManagerServiceManager_GetCompanies_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetCompanies_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveCompany_07'
const SAVE_DUP = 'Manager_ManagerServiceManager_SaveCompany_08'

// Status badge config — API: 1=Active, 2=InActive, 3=Suspended
const STATUS_CONFIG = {
  Active: { color: 'text-[#4dc792]', label: 'Active' },
  InActive: { color: 'text-[#ec4357]', label: 'In-Active' },
  // Suspended: { color: 'text-[#f59e0b]', label: 'Suspended' },
}

// Regex helpers
const TICKER_REGEX = /^[a-zA-Z0-9.\-]*$/
const ALPHA_NUMERIC = /^[a-zA-Z0-9\s.,\-&()/']*$/

const EMPTY_FORM = {
  companyName: '',
  ticker: '',
  sectorId: 0,
  marketId: 0,
  reportingMonthId: 0,
  reportingFrequencyId: 0,
  gracePeriod: '',
  isException: false,
  shariahReason: '',
}

// Hardcoded grace period options (replace with API later)
const GRACE_PERIOD_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1} Month${i + 1 > 1 ? 's' : ''}`,
}))

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '2', label: 'In-Active' },
  // { value: '3', label: 'Suspended' },
]

const EXCEPTION_OPTIONS = [
  { value: '1', label: 'Yes' },
  { value: '0', label: 'No' },
]

// All filter keys — labels only (resolved IDs live alongside in `applied`)
const EMPTY_FILTERS = {
  companyID: 0, // ← NEW: from filter panel dropdown
  companyName: '', // ← stays: main search free-text
  ticker: '',
  sectorId: 0,
  marketId: 0,
  reportingMonthId: 0,
  reportingFrequencyId: 0,
  // gracePeriod: 0,
  isException: 0,
  statusId: 0,
}
const CHIP_LABELS = {
  ticker: 'Ticker',
  companyID: 'Company', // ← NEW chip label for dropdown selection
  companyName: 'Company Name', // ← free-text chip (shown when typed in search bar)
  sectorId: 'Sector',
  marketId: 'Market',
  reportingMonthId: 'Annual Reporting',
  reportingFrequencyId: 'Reporting Frequency',
  // gracePeriod: 'Grace Period',
  isException: 'Exception',
  statusId: 'Status',
}

// ── API response → local shape ────────────────────────────────────────────────
const mapCompany = (c) => ({
  id: c.pK_CompanyID,
  ticker: c.ticker || '',
  name: c.companyName || '',
  sectorId: c.fK_SectorID || 0,
  sectorName: c.sectorName || '',
  marketId: c.fK_MarketID || 0,
  marketName: c.marketName || '',
  reportingMonthId: c.fK_ReportingMonthID || 0,
  reportingName: c.reportingName || '',
  reportingFrequencyId: c.fK_ReportingFrequencyID || 0,
  frequencyName: c.frequencyName || '',
  gracePeriod: c.gracePeriod ?? 0,
  isException: !!c.isException,
  shariahReason: c.exceptionReason || '',
  statusId: c.fK_CompanyStatusID || 1,
  status: c.status || 'Active', // "Active" | "InActive" | "Suspended"
})

// ── Component ─────────────────────────────────────────────────────────────────
const CompaniesPage = () => {
  // ── Data state ───────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [active, setActive] = useState(true)
  const [exception, setException] = useState(false)
  const [exReason, setExReason] = useState('')
  const [exReasonErr, setExReasonErr] = useState('')

  // ── Dropdown options (from API) ───────────────────────────────────────────
  const [sectorOptions, setSectorOptions] = useState([])
  const [marketOptions, setMarketOptions] = useState([])
  const [reportingMonthOptions, setReportingMonthOptions] = useState([])
  const [tickerOptions, setTickerOptions] = useState([])
  const [companyNameOptions, setCompanyNameOptions] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  // frequencyOptions carry gracePeriod so we can auto-fill the grace field
  const [frequencyOptions, setFrequencyOptions] = useState([])

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(null) // null = add, number = PK being edited
  const [statusId, setStatusId] = useState(1) // FK_CompanyStatusID (edit mode)

  // ── Modals ───────────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)

  // ── Search / filter ──────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  // ── Refs ─────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})

  // stateRef carries dropdown options so the stable MQTT handler can resolve
  // FK → display name without being recreated on every option load.
  stateRef.current = {
    page,
    applied,
    sectorOptions,
    marketOptions,
    reportingMonthOptions,
    frequencyOptions,
  }

  // ── MQTT — upsert company row ─────────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.COMPANY_SAVED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d?.pkCompanyID) return

        // Resolve FK → display name from the latest dropdown options via stateRef.
        const {
          sectorOptions: so,
          marketOptions: mo,
          reportingMonthOptions: rmo,
          frequencyOptions: fo,
        } = stateRef.current
        const sectorName = so.find((o) => o.value === d.fkSectorID)?.label || ''
        const marketName = mo.find((o) => o.value === d.fkMarketID)?.label || ''
        const reportingName = rmo.find((o) => o.value === d.fkReportingMonthID)?.label || ''
        const frequencyName = fo.find((o) => o.value === d.fkReportingFrequencyID)?.label || ''
        const status = d.fkCompanyStatusID === 2 ? 'InActive' : 'Active'

        setCompanies((prev) => {
          const idx = prev.findIndex((c) => c.id === d.pkCompanyID)
          if (idx !== -1) {
            const next = [...prev]
            next[idx] = {
              ...prev[idx],
              ticker: d.ticker || prev[idx].ticker,
              name: d.companyName || prev[idx].name,
              sectorId: d.fkSectorID ?? prev[idx].sectorId,
              sectorName: sectorName || prev[idx].sectorName,
              marketId: d.fkMarketID ?? prev[idx].marketId,
              marketName: marketName || prev[idx].marketName,
              reportingMonthId: d.fkReportingMonthID ?? prev[idx].reportingMonthId,
              reportingName: reportingName || prev[idx].reportingName,
              reportingFrequencyId: d.fkReportingFrequencyID ?? prev[idx].reportingFrequencyId,
              frequencyName: frequencyName || prev[idx].frequencyName,
              gracePeriod: d.gracePeriod ?? prev[idx].gracePeriod,
              isException: !!d.isException,
              shariahReason: d.exceptionReason || prev[idx].shariahReason,
              statusId: d.fkCompanyStatusID ?? prev[idx].statusId,
              status,
            }
            return next
          }
          const newRow = {
            id: d.pkCompanyID,
            ticker: d.ticker || '',
            name: d.companyName || '',
            sectorId: d.fkSectorID || 0,
            sectorName: sectorName || '—',
            marketId: d.fkMarketID || 0,
            marketName: marketName || '—',
            reportingMonthId: d.fkReportingMonthID || 0,
            reportingName: reportingName || '—',
            reportingFrequencyId: d.fkReportingFrequencyID || 0,
            frequencyName: frequencyName || '—',
            gracePeriod: d.gracePeriod ?? 0,
            isException: !!d.isException,
            shariahReason: d.exceptionReason || '',
            statusId: d.fkCompanyStatusID || 1,
            status,
          }
          setTotalCount((c) => c + 1)
          return [newRow, ...prev]
        })
      },
    }),
    []
  )

  useSubscribe(mqttTopic, mqttHandler)

  // ── Fetch paginated companies ─────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const result = await GetCompaniesApi(
      {
        CompanyID: appliedFilters.companyIDValue || 0,
        TickerID: appliedFilters.tickerIdResolved || 0,
        CompanyName: appliedFilters.companyIDValue ? '' : appliedFilters.companyName || '',
        FK_SectorID: appliedFilters.sectorIdResolved || 0,
        FK_MarketID: appliedFilters.marketIdResolved || 0,
        FK_ReportingMonthID: appliedFilters.reportingMonthIdResolved || 0,
        FK_ReportingFrequencyID: appliedFilters.reportingFrequencyIdResolved || 0,
        GracePeriod:
          appliedFilters.gracePeriodResolved != null
            ? Number(appliedFilters.gracePeriodResolved)
            : null,
        IsException:
          appliedFilters.isExceptionResolved != null
            ? Number(appliedFilters.isExceptionResolved)
            : null,
        FK_CompanyStatusID: Number(appliedFilters.statusIdResolved) || 0,
        PageSize: PAGE_SIZE,
        PageNumber: pageNumber,
      },
      { skipLoader: true }
    )

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load companies.', {})
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.companies) ? rr.companies.map(mapCompany) : []
      setCompanies((prev) => (append ? [...prev, ...rows] : rows))
      setTotalCount(rr.totalCount ?? 0)
      return
    }

    if (code === GET_EMPTY) {
      if (!append) {
        setCompanies([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_COMPANIES_CODES[code] || 'Something went wrong.', {})
  }, [])

  // ── Main search bar → companyName field (free text)
  const mainSearch = filters.companyName
  const setMainSearch = useCallback(
    (val) => {
      if (ALPHA_NUMERIC.test(val) || val === '') {
        setFilters((p) => ({
          ...p,
          companyName: val,
          companyID: val === '' ? 0 : p.companyID,
        }))
        if (applied.companyID) {
          const next = { ...applied }
          delete next.companyID
          delete next.companyIDValue
          setApplied(next)
          setPage(0)
          fetchData(next, 0, false)
        }
      }
    },
    [applied, fetchData]
  )

  const filterFields = useMemo(
    () => [
      {
        key: 'ticker',
        label: 'Ticker',
        type: 'select',
        options: tickerOptions.map((o) => o.label),
      },
      {
        key: 'companyID',
        label: 'Company Name',
        type: 'select',
        options: companyNameOptions.map((o) => o.label),
      },
      {
        key: 'sectorId',
        label: 'Sector',
        type: 'select',
        options: sectorOptions.map((o) => o.label),
      },
      {
        key: 'marketId',
        label: 'Market',
        type: 'select',
        options: marketOptions.map((o) => o.label),
      },
      {
        key: 'reportingMonthId',
        label: 'Annual Reporting',
        type: 'select',
        options: reportingMonthOptions.map((o) => o.label),
      },
      {
        key: 'reportingFrequencyId',
        label: 'Reporting Frequency',
        type: 'select',
        options: frequencyOptions.map((o) => o.label),
      },
      // {
      //   key: 'gracePeriod',
      //   label: 'Grace Period',
      //   type: 'select',
      //   options: GRACE_PERIOD_OPTIONS.map((o) => o.label),
      // },
      {
        key: 'isException',
        label: 'Exception by Shariah Advisor',
        type: 'select',
        options: EXCEPTION_OPTIONS.map((o) => o.label),
      },
      {
        key: 'statusId',
        label: 'Status',
        type: 'select',
        options: STATUS_OPTIONS.map((o) => o.label),
      },
    ],
    [
      companyNameOptions,
      tickerOptions,
      sectorOptions,
      marketOptions,
      reportingMonthOptions,
      frequencyOptions,
    ]
  )

  const resolveIds = useCallback(
    (filterState) => {
      const resolved = {}

      if (filterState.companyID) {
        const o = companyNameOptions.find((x) => x.label === filterState.companyID)
        resolved.companyID = filterState.companyID
        if (o) resolved.companyIDValue = o.value
      }

      if (filterState.companyName && !filterState.companyID) {
        resolved.companyName = filterState.companyName
      }

      if (filterState.ticker) {
        const o = tickerOptions.find((x) => x.label === filterState.ticker)
        resolved.ticker = filterState.ticker
        if (o) resolved.tickerIdResolved = o.value
      }

      if (filterState.sectorId) {
        const o = sectorOptions.find((x) => x.label === filterState.sectorId)
        resolved.sectorId = filterState.sectorId
        if (o) resolved.sectorIdResolved = o.value
      }
      if (filterState.marketId) {
        const o = marketOptions.find((x) => x.label === filterState.marketId)
        resolved.marketId = filterState.marketId
        if (o) resolved.marketIdResolved = o.value
      }
      if (filterState.reportingMonthId) {
        const o = reportingMonthOptions.find((x) => x.label === filterState.reportingMonthId)
        resolved.reportingMonthId = filterState.reportingMonthId
        if (o) resolved.reportingMonthIdResolved = o.value
      }
      if (filterState.reportingFrequencyId) {
        const o = frequencyOptions.find((x) => x.label === filterState.reportingFrequencyId)
        resolved.reportingFrequencyId = filterState.reportingFrequencyId
        if (o) resolved.reportingFrequencyIdResolved = o.value
      }
      if (filterState.gracePeriod) {
        const o = GRACE_PERIOD_OPTIONS.find((x) => x.label === filterState.gracePeriod)
        resolved.gracePeriod = filterState.gracePeriod
        if (o) resolved.gracePeriodResolved = o.value
      }
      if (filterState.isException) {
        const o = EXCEPTION_OPTIONS.find((x) => x.label === filterState.isException)
        resolved.isException = filterState.isException
        if (o) resolved.isExceptionResolved = o.value
      }
      if (filterState.statusId) {
        const o = STATUS_OPTIONS.find((x) => x.label === filterState.statusId)
        resolved.statusId = filterState.statusId
        if (o) resolved.statusIdResolved = o.value
      }

      return resolved
    },
    [
      companyNameOptions,
      tickerOptions,
      sectorOptions,
      marketOptions,
      reportingMonthOptions,
      frequencyOptions,
    ]
  )

  // ── Field helpers ─────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    if (errors[key]) setErrors((p) => ({ ...p, [key]: '' }))
  }

  // When frequency changes, auto-fill gracePeriod from API data
  const setFreq = (val) => {
    const found = frequencyOptions.find((f) => Number(f.value) === Number(val))
    setForm((p) => ({
      ...p,
      reportingFrequencyId: val,
      gracePeriod: found ? String(found.gracePeriod) : '',
    }))
    if (errors.reportingFrequencyId) setErrors((p) => ({ ...p, reportingFrequencyId: '' }))
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setException(false)
    setExReason('')
    setExReasonErr('')
  }

  // ── Save guard ───────────────────────────────────────────────────────────
  const isValid =
    form.companyName.trim() &&
    form.ticker.trim() &&
    form.sectorId &&
    form.reportingMonthId &&
    form.marketId

  // ── Fetch dropdown lists ──────────────────────────────────────────────────
  const fetchDropdowns = useCallback(async () => {
    setLoadingOptions(true)
    const [sectorsRes, marketsRes, monthsRes, freqsRes, tickersRes, namesRes] = await Promise.all([
      GetAllActiveSectorsApi({}, { skipLoader: true }),
      GetAllActiveMarketsApi({}, { skipLoader: true }),
      GetAllActiveReportingMonthsApi({}, { skipLoader: true }),
      GetAllActiveReportingFrequencyApi({}, { skipLoader: true }),
      GetAllActiveCompanyTickersApi({}, { skipLoader: true }),
      GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
    ])

    if (sectorsRes.success) {
      const sectors = sectorsRes.data?.responseResult?.sectors || []
      setSectorOptions(sectors.map((s) => ({ label: s.sectorName, value: s.pK_SectorID })))
    }
    if (marketsRes.success) {
      const markets = marketsRes.data?.responseResult?.markets || []
      setMarketOptions(markets.map((m) => ({ label: m.marketName, value: m.pK_MarketID })))
    }
    if (monthsRes.success) {
      const months = monthsRes.data?.responseResult?.reportingMonths || []
      setReportingMonthOptions(
        months.map((m) => ({ label: m.monthName, value: m.pK_ReportingMonthID }))
      )
    }
    if (freqsRes.success) {
      const freqs = freqsRes.data?.responseResult?.reportingFrequencies || []
      setFrequencyOptions(
        freqs.map((f) => ({
          label: f.frequencyName,
          value: f.pK_ReportingFrequencyID,
          gracePeriod: f.defaultGracePeriod,
        }))
      )
    }
    if (tickersRes.success) {
      const tickers = tickersRes.data?.responseResult?.companies || []
      setTickerOptions(tickers.map((t) => ({ label: t.ticker || '', value: t.pK_CompanyID })))
    }
    if (namesRes.success) {
      const names = namesRes.data?.responseResult?.companies || []
      setCompanyNameOptions(
        names.map((c) => ({ label: c.companyName || '', value: c.pK_CompanyID }))
      )
    }
    setLoadingOptions(false)
  }, [])

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
    fetchDropdowns()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When user picks a company from the filter panel dropdown,
  // mirror its label into the main search textbox.
  useEffect(() => {
    if (filters.companyID) {
      setFilters((p) => ({ ...p, companyName: filters.companyID }))
    }
  }, [filters.companyID]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ───────────────────────────────────────────────────────
  // const handleLoadMore = useCallback(() => {
  //   const { page: p, applied: ap } = stateRef.current
  //   setPage(p + 1)
  //   fetchData(ap, p + 1, true)
  // }, [fetchData])

  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    const nextPage = p + 1

    // Don't fetch if already fetching this page
    if (loadingMore || loadingInitial) return

    setPage(nextPage)
    fetchData(ap, nextPage, true)
  }, [fetchData, loadingMore, loadingInitial]) // add loading states to deps

  // ── Infinite scroll ───────────────────────────────────────────────────────
  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: companies.length < totalCount,
    loading: loadingInitial || loadingMore, // ← was: loadingMore
    onLoadMore: handleLoadMore,
  })

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const stagingFilters = filters.companyID ? { ...filters, companyName: '' } : filters

    const newApplied = resolveIds(stagingFilters)
    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
  }, [filters, resolveIds, fetchData])

  const handleReset = useCallback(() => {
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
      if (key === 'companyID') delete next.companyIDValue
      const resolvedKey = `${key}Resolved`
      delete next[resolvedKey]
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ── Sort (client-side within loaded rows) ─────────────────────────────────
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
      [...companies].sort((a, b) => {
        const va = String(a[sortCol] ?? '').toLowerCase()
        const vb = String(b[sortCol] ?? '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [companies, sortCol, sortDir]
  )

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.ticker.trim()) errs.ticker = 'Ticker is required'
    if (!form.companyName.trim()) errs.companyName = 'Company Name is required'
    if (!form.sectorId) errs.sectorId = 'Sector is required'
    if (!form.reportingMonthId) errs.reportingMonthId = 'Annual Reporting is required'
    if (!form.marketId) errs.marketId = 'Market is required'
    if (form.isException && !form.shariahReason.trim())
      errs.shariahReason = 'Shariah Exception Reason is required'
    return errs
  }

  const resetForm = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setStatusId(1)
    setException(false)
    setExReason('')
    setExReasonErr('')
  }

  // ── Save button click ─────────────────────────────────────────────────────
  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    if (editing) setConfirm(true)
    else callSaveApi(false)
  }

  // ── Save / Update API call ────────────────────────────────────────────────
  const callSaveApi = useCallback(
    async (isUpdate) => {
      setLoadingSave(true)

      const params = {
        PK_CompanyID: isUpdate ? editing : 0,
        Ticker: form.ticker.trim().toUpperCase(),
        CompanyName: form.companyName.trim(),
        FK_SectorID: Number(form.sectorId) || 0,
        FK_MarketID: Number(form.marketId) || 0,
        FK_ReportingMonthID: Number(form.reportingMonthId) || 0,
        FK_ReportingFrequencyID: Number(form.reportingFrequencyId) || 0,
        GracePeriod: parseInt(form.gracePeriod, 10) || 0,
        FK_CompanyStatusID: isUpdate ? statusId : 1,
        IsException: form.isException ? 1 : 0,
        ExceptionReason: form.isException ? form.shariahReason.trim() : '',
      }

      const result = await SaveCompanyApi(params, { skipLoader: true })
      setLoadingSave(false)

      if (!result.success) {
        toast.error(result.message || 'Failed to save company.', {})
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (code === SAVE_SUCCESS) {
        toast.success(isUpdate ? 'Updated Successfully' : 'Record Added Successfully', {})
        setPage(0)
        await fetchData(applied, 0, false)
        resetForm()
        setPage(0)
        return
      }

      if (code === SAVE_DUP) {
        setErrors({ ticker: SAVE_COMPANY_CODES[code] })
        return
      }

      toast.error(SAVE_COMPANY_CODES[code] || 'Something went wrong, please try again.', {})
    },
    [editing, form, statusId, applied, fetchData]
  )

  // ── Table columns ─────────────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'ticker',
        title: 'Ticker',
        sortable: true,
      },
      {
        key: 'name',
        title: 'Company Name',
        sortable: true,
        render: (r) => (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#000]">{r.name}</span>
            {r.isException && (
              <span title={r.shariahReason || 'Shariah-advisor exception'}>
                <CircleAlert size={16} className="text-[#F5A623] shrink-0" />
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'sectorName',
        title: 'Sector Name',
        sortable: true,
        align: 'center',
        render: (r) => r.sectorName,
      },
      {
        key: 'marketName',
        title: 'Market Name',
        sortable: true,
        align: 'center',
        render: (r) => r.marketName,
      },
      {
        key: 'reportingName',
        title: 'Annual Reporting',
        sortable: true,
        align: 'center',
        render: (r) => r.reportingName,
      },
      {
        key: 'frequencyName',
        title: 'Reporting Frequency',
        sortable: true,
        align: 'center',
        render: (r) => r.frequencyName,
      },
      {
        key: 'actions',
        title: 'Edit',
        render: (r) => (
          <BtnIconEdit
            size={16}
            onClick={() => {
              setEditing(r.id)
              setForm({
                ticker: r.ticker,
                companyName: r.name,
                sectorId: r.sectorId,
                marketId: r.marketId,
                reportingMonthId: r.reportingMonthId,
                reportingFrequencyId: r.reportingFrequencyId,
                gracePeriod: r.gracePeriod > 0 ? String(r.gracePeriod) : '',
                isException: r.isException,
                shariahReason: r.shariahReason,
              })
              setStatusId(r.statusId || 1)
              setActive(r.statusId === 1)
              setException(r.isException || false)
              setExReason(r.shariahReason || '')
              setErrors({})
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        ),
      },
      {
        key: 'status',
        title: 'Status',
        render: (r) => {
          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.Active
          return <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
        },
      },
    ],
    []
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Companies</h1>

          <SearchFilter
            placeholder="Search by company name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="companyName"
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

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2">
        {/* ── Active filter chips ── */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied)
              .filter(([k]) => Object.keys(CHIP_LABELS).includes(k))
              .map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium text-white bg-[#01C9A4]"
                >
                  {CHIP_LABELS[k]}: {formatChipValue(v)}
                  <BtnChipRemove onClick={() => removeChip(k)} />
                </span>
              ))}
            {Object.entries(applied).filter(([k]) => Object.keys(CHIP_LABELS).includes(k)).length >
              1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="p-5 space-y-4">
            {/* Row 1 — Ticker | Company Name | Annual Reporting | Sector */}
            <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-4">
              <div className="md:col-span-2">
                <Input
                  label="Ticker"
                  required
                  maxLength={20}
                  showCount
                  placeholder="e.g. MAYB"
                  regex={TICKER_REGEX}
                  value={form.ticker}
                  onChange={(v) => setField('ticker', v.toUpperCase())}
                  error={!!errors.ticker}
                  errorMessage={errors.ticker}
                />
              </div>
              <div className="md:col-span-4">
                <Input
                  label="Company Name"
                  required
                  maxLength={50}
                  showCount
                  placeholder="e.g. Maybank Berhad"
                  regex={ALPHA_NUMERIC}
                  value={form.companyName}
                  onChange={(v) => setField('companyName', v)}
                  error={!!errors.companyName}
                  errorMessage={errors.companyName}
                />
              </div>
              <div className="md:col-span-2">
                <SearchableSelect
                  label="Sector"
                  required
                  placeholder="Select Sector"
                  value={form.sectorId}
                  onChange={(v) => setField('sectorId', v)}
                  options={sectorOptions}
                  error={!!errors.sectorId}
                  errorMessage={errors.sectorId}
                />
              </div>
              <div className="md:col-span-2">
                <SearchableSelect
                  label="Market"
                  required
                  placeholder="Select Market"
                  value={form.marketId}
                  onChange={(v) => setField('marketId', v)}
                  options={marketOptions}
                  error={!!errors.marketId}
                  errorMessage={errors.marketId}
                />
              </div>
            </div>

            {/* Row 2: Market | Freq | Grace | Checkboxes (edit) or Save button (add) */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
              {/* Market — col-span-3 */}
              <div className="md:col-span-2">
                <SearchableSelect
                  label="Annual Reporting"
                  required
                  placeholder="Select Annual Reporting"
                  value={form.reportingMonthId}
                  onChange={(v) => setField('reportingMonthId', v)}
                  options={reportingMonthOptions}
                  error={!!errors.reportingMonthId}
                  errorMessage={errors.reportingMonthId}
                />
              </div>

              {/* Reporting Frequency */}
              <div className="md:col-span-2">
                <SearchableSelect
                  label="Reporting Frequency"
                  placeholder="Select Frequency"
                  value={form.reportingFrequencyId}
                  onChange={setFreq}
                  options={frequencyOptions}
                />
              </div>

              {/* Grace Period — hidden from UI per requirement; functionality preserved */}

              {editing ? (
                /* ── Edit mode: Status + Exception checkboxes, with Cancel/Update inline ── */
                <div className="pl-10 md:col-span-3 flex items-end justify-between gap-6">
                  <div className="flex gap-6">
                    {/* Status */}
                    <div className="flex flex-col gap-1.5 ml-5">
                      <span className="text-[12px] font-medium text-[#041E66]">Status</span>
                      <div className="h-[42px] flex items-center">
                        <Checkbox
                          label="Active"
                          checked={active}
                          onChange={(e) => {
                            setActive(e.target.checked)
                            setStatusId(e.target.checked ? 1 : 2)
                          }}
                        />
                      </div>
                    </div>

                    {/* Exception by Shariah Advisor */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[12px] font-medium text-[#041E66]">Exception</span>
                      <div className="h-[42px] flex items-center">
                        <Checkbox
                          checked={exception}
                          onChange={(e) => {
                            setException(e.target.checked)
                            setField('isException', e.target.checked)
                            if (!e.target.checked) {
                              setExReason('')
                              setExReasonErr('')
                              setField('shariahReason', '')
                            }
                          }}
                        />
                        <span className="ml-2 text-[13px] text-[#041E66]">by Shariah Advisor</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <BtnSlate onClick={cancelEdit}>Cancel</BtnSlate>
                    <BtnPrimary
                      disabled={!isValid || (exception && exReason === '')}
                      onClick={handleSave}
                    >
                      Update
                    </BtnPrimary>
                  </div>
                </div>
              ) : (
                /* ── Add mode: Save button aligned to the right of the row ── */
                <div className="flex items-end justify-end md:col-span-2">
                  <BtnPrimary disabled={!isValid} onClick={handleSave}>
                    Save
                  </BtnPrimary>
                </div>
              )}
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

              <div ref={sentinelRef} className="h-px" />

              {loadingMore && (
                <div className="flex justify-center py-5">
                  <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}

              {!loadingInitial &&
                !loadingMore &&
                totalCount > PAGE_SIZE &&
                companies.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* ── Confirm modal (update only) ── */}
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

export default CompaniesPage
