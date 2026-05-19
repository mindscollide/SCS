/**
 * src/pages/manager/CompaniesPage.jsx
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
import Select from '../../components/common/select/Select.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'

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
const ALPHA_NUMERIC = /^[a-zA-Z0-9\s.,\-()']*$/

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
  { value: '2', label: 'InActive' },
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
  gracePeriod: 0,
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
  gracePeriod: 'Grace Period',
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
  shariahReason: c.shariahExceptionReason || '',
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

  stateRef.current = { page, applied }
  // ── Fetch paginated companies ─────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const result = await GetCompaniesApi(
      {
        CompanyID: appliedFilters.companyIDValue || 0, // ← from companyID dropdown
        Ticker: appliedFilters.ticker || '', // ← label string
        CompanyName: appliedFilters.companyIDValue
          ? '' // ← cleared when ID selected
          : appliedFilters.companyName || '', // ← free text from main search
        FK_SectorID: appliedFilters.sectorIdResolved || 0,
        FK_MarketID: appliedFilters.marketIdResolved || 0,
        FK_ReportingMonthID: appliedFilters.reportingMonthIdResolved || '',
        FK_ReportingFrequencyID: appliedFilters.reportingFrequencyIdResolved || '',
        GracePeriod: appliedFilters.gracePeriodResolved || 0,
        IsException: appliedFilters.isExceptionResolved ?? 0,
        FK_CompanyStatusID: appliedFilters.statusIdResolved || 0,
        PageSize: PAGE_SIZE,
        PageNumber: pageNumber,
      },
      { skipLoader: true }
    )

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load companies.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
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

    toast.error(GET_COMPANIES_CODES[code] || 'Something went wrong.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])
  // ── Main search bar → companyName field (free text)
  const mainSearch = filters.companyName
  const setMainSearch = useCallback(
    (val) => {
      if (ALPHA_NUMERIC.test(val) || val === '') {
        setFilters((p) => ({
          ...p,
          companyName: val,
          companyID: val === '' ? 0 : p.companyID, // clear ID only when textbox fully cleared
        }))
        // also remove the applied chip if already searched
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
    () =>
      [
        {
          key: 'companyID', // ← CHANGED from 'companyName'
          label: 'Company Name',
          type: 'select',
          options: companyNameOptions.map((o) => o.label), // labels shown in dropdown
        },
        {
          key: 'isException',
          label: 'Exception by Shariah Advisor',
          type: 'select',
          options: EXCEPTION_OPTIONS.map((o) => o.label),
        },
        {
          key: 'gracePeriod',
          label: 'Grace Period',
          type: 'select',
          options: GRACE_PERIOD_OPTIONS.map((o) => o.label),
        },
        {
          key: 'marketId',
          label: 'Market',
          type: 'select',
          options: marketOptions.map((o) => o.label),
        },
        {
          key: 'reportingFrequencyId',
          label: 'Reporting Frequency',
          type: 'select',
          options: frequencyOptions.map((o) => o.label),
        },
        {
          key: 'reportingMonthId',
          label: 'Annual Reporting',
          type: 'select',
          options: reportingMonthOptions.map((o) => o.label),
        },
        {
          key: 'sectorId',
          label: 'Sector',
          type: 'select',
          options: sectorOptions.map((o) => o.label),
        },
        {
          key: 'statusId',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS.map((o) => o.label),
        },
        {
          key: 'ticker',
          label: 'Ticker',
          type: 'select',
          options: tickerOptions.map((o) => o.label), // label = ticker string
        },
      ].sort((a, b) => a.label.localeCompare(b.label)),
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

      // ── companyID from filter panel (label → numeric ID for API)
      if (filterState.companyID) {
        const o = companyNameOptions.find((x) => x.label === filterState.companyID)
        resolved.companyID = filterState.companyID // display label for chip
        if (o) resolved.companyIDValue = o.value // numeric PK for API
      }

      // ── companyName from main search (plain text, only when no companyID)
      if (filterState.companyName && !filterState.companyID) {
        resolved.companyName = filterState.companyName
      }

      // ── ticker → send label string (no ID lookup needed)
      if (filterState.ticker) {
        resolved.ticker = filterState.ticker
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
    console.log(val, 'setFreqsetFreq')
    const found = frequencyOptions.find((f) => Number(f.value) === Number(val))

    console.log(found, 'foundfound')
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
      // filters.companyID holds the label string (e.g. "Maybank Berhad")
      setFilters((p) => ({ ...p, companyName: filters.companyID }))
    }
  }, [filters.companyID]) // eslint-disable-line react-hooks/exhaustive-deps
  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    setPage(p + 1)
    fetchData(ap, p + 1, true)
  }, [fetchData])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: companies.length < totalCount,
    loading: loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    // companyID from filter panel takes priority over main-search companyName
    const stagingFilters = filters.companyID
      ? { ...filters, companyName: '' } // drop free-text when ID is selected
      : filters

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
      // remove paired resolved keys
      if (key === 'companyID') {
        delete next.companyIDValue // ← numeric ID used in API
      }
      if (key === 'companyName') {
        // no paired key, just the string
      }
      if (key === 'ticker') delete next.tickerId
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
        toast.error(result.message || 'Failed to save company.', {
          style: { backgroundColor: '#E74C3C', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        })
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (code === SAVE_SUCCESS) {
        toast.success(isUpdate ? 'Updated Successfully' : 'Record Added Successfully', {
          style: { backgroundColor: '#01C9A4', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        })
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

      toast.error(SAVE_COMPANY_CODES[code] || 'Something went wrong, please try again.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
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
        render: (r) => <span className="font-semibold text-[#000]">{r.name}</span>,
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

          {/* Chips — show only display-label keys, not resolved ID keys */}

          <SearchFilter
            placeholder="Search by company name" // ← already correct
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="companyName" // ← CHANGED from "ticker"
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
              .filter(([k]) => Object.keys(CHIP_LABELS).includes(k)) // ← THIS LINE must exist
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
            {/* Row 1 — Company Name | Ticker | Annual Reporting | Sector */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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

            {/* Row 2: Market | Freq | Grace | Checkboxes (edit) or Save button (add) */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
              {/* Market — col-span-3 */}
              <div className="md:col-span-3">
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

              {/* Reporting Frequency */}
              <SearchableSelect
                label="Reporting Frequency"
                placeholder="Select Frequency"
                value={form.reportingFrequencyId}
                onChange={setFreq}
                options={frequencyOptions}
              />

              {/* Grace Period */}
              <div className="flex max-w-[100px]">
                <Input
                  label="Grace Period"
                  value={form.gracePeriod}
                  onChange={() => {}}
                  disabled
                  bgColor="#f8f9ff"
                />
                <div className="h-[42px] ml-[-5px] mt-[23px] flex items-center px-4 bg-[#e0e6f6] border border-l-0 border-[#e2e8f0] rounded-r-lg text-[13px] text-[#747885]">
                  Month(s)
                </div>
              </div>

              {editing ? (
                /* ── Edit mode: Status + Exception checkboxes with labels ── */
                <div className="pl-10 md:col-span-2 flex gap-6">
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
              ) : (
                /* ── Add mode: Save button aligned to the right of the row ── */
                <div className="flex items-end justify-end md:col-span-2">
                  <BtnPrimary disabled={!isValid} onClick={handleSave}>
                    Save
                  </BtnPrimary>
                </div>
              )}
            </div>

            {/* Edit-only: Exception reason textarea + Cancel / Update buttons */}
            {editing && (
              <div className="pt-2">
                {exception && (
                  <div className="mb-3">
                    <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                      Exception Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={1}
                      maxLength={500}
                      placeholder="Enter reason for Shariah Advisor exception..."
                      className={`w-full px-3 py-2.5 border rounded-lg text-[13px] text-[#041E66]
                                  focus:outline-none transition-all resize-none
                                  ${
                                    exReasonErr
                                      ? 'border-red-400 focus:border-red-400'
                                      : 'border-[#dde4ee] focus:border-[#01C9A4]'
                                  }`}
                      value={exReason}
                      onChange={(e) => {
                        setExReason(e.target.value)
                        setField('shariahReason', e.target.value)
                        if (exReasonErr) setExReasonErr('')
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      {exReasonErr ? (
                        <p className="text-[11px] text-red-500">{exReasonErr}</p>
                      ) : (
                        <span />
                      )}
                      <p className="text-[11px] text-[#a0aec0]">{exReason.length}/500</p>
                    </div>
                  </div>
                )}

                {/* Cancel + Update buttons — only shown in edit mode */}
                <div className="flex justify-end gap-2 mt-2">
                  <BtnSlate onClick={cancelEdit}>Cancel</BtnSlate>
                  <BtnPrimary
                    disabled={!isValid || (exception && exReason === '')}
                    onClick={handleSave}
                  >
                    Update
                  </BtnPrimary>
                </div>
              </div>
            )}
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
