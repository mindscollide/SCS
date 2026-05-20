/**
 * pages/manager/SuspendedCompaniesPage.jsx
 * ==========================================
 * Suspended Companies — Manager Configuration page.
 *
 * APIs used:
 *  GetAllActiveQuartersApi          — quarter dropdown options (once on mount)
 *  GetAllActiveCompanyNamesApi      — company dropdown options (once on mount)
 *  GetAllActiveCompanyTickersApi    — ticker dropdown options (once on mount)
 *  GetSuspendedCompaniesApi         — paginated listing with infinite scroll
 *  SaveSuspendedCompanyApi          — add (IsEdit=0) and edit (IsEdit=recordId)
 *  DeleteSuspendedCompanyApi        — delete by company + from/to quarter IDs
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import {
  ConfirmModal,
  BtnTeal,
  BtnSlate,
  BtnIconEdit,
  BtnIconDelete,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import useInfiniteScroll from '../../hooks/useInfiniteScroll.js'
import {
  GetAllActiveQuartersApi,
  GetAllActiveCompanyNamesApi,
  GetAllActiveCompanyTickersApi,
  GetAllActiveSectorsApi,
  GetSuspendedCompaniesApi,
  GET_SUSPENDED_COMPANIES_CODES,
  SaveSuspendedCompanyApi,
  SAVE_SUSPENDED_COMPANY_CODES,
  DeleteSuspendedCompanyApi,
  DELETE_SUSPENDED_COMPANY_CODES,
} from '../../services/manager.service.js'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'

// ── Response-code constants ───────────────────────────────────────────────────
const GET_QUARTERS_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const GET_COMPANIES_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const GET_TICKERS_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveCompanyTickers_02'
const GET_LIST_SUCCESS = 'Manager_ManagerServiceManager_GetSuspendedCompanies_02'
const GET_LIST_EMPTY = 'Manager_ManagerServiceManager_GetSuspendedCompanies_01'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveSuspendedCompany_04'
const DELETE_SUCCESS = 'Manager_ManagerServiceManager_DeleteSuspendedCompany_05'
const GET_SECTORS_SUCCESS = 'Manager_ManagerServiceManager_GetAllActiveSectors_02'

// ── Config ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'
const EMPTY_FORM = { companyId: null, fromQuarterId: null, toQuarterId: null }

// Filter state shape — keys map 1-to-1 with FILTER_FIELDS keys
const EMPTY_FILTERS = {
  company: '', // → CompanyID (resolved via companyOptions)
  ticker: '', // → TickerID  (resolved via tickerOptions)
  sector: '', // → SectorID  (resolved via sectorOptions)
  quarter: '', // → QuarterID (resolved via quarterOptions, searched in both From & To)
}

const CHIP_LABELS = {
  company: 'Company',
  ticker: 'Ticker',
  sector: 'Sector',
  quarter: 'Quarter',
}

// ── Row mapper ────────────────────────────────────────────────────────────────
const mapRow = (r) => ({
  id: `${r.fK_CompanyID}_${r.fK_FromQuarterID}_${r.fK_ToQuarterID}`,
  companyId: r.fK_CompanyID,
  companyName: r.companyName || '',
  ticker: r.ticker || '',
  sector: r.sectorName || '',
  fromQuarterId: r.fK_FromQuarterID ?? null,
  fromQuarterName: r.fromQuarterName || '',
  toQuarterId: r.fK_ToQuarterID ?? null,
  toQuarterName: r.toQuarterName || '',
})

// Quarter option mapper — stores parsed Dates for chronological sorting / filtering
const parseQuarterDate = (raw) => {
  // "20270701 000000" → "2027-07-01T00:00:00"
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

const SuspendedCompaniesPage = () => {
  // ── Dropdown options (loaded once on mount) ───────────────────────────────
  const [companyOptions, setCompanyOptions] = useState([]) // [{ value, label }]
  const [quarterOptions, setQuarterOptions] = useState([]) // [{ value, label, startDate, endDate }]
  const [tickerOptions, setTickerOptions] = useState([]) // [{ value, label }]
  const [sectorOptions, setSectorOptions] = useState([]) // [{ value, label }]
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

  // ── Search / Filter ───────────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({}) // { company?, ticker?, sector?, quarter?, ...ids }

  // ── Sort / Delete ─────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('companyName')
  const [sortDir, setSortDir] = useState('asc')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formKey, setFormKey] = useState(0)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied }

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH LISTING
  // Accepts an `appliedFilters` object that carries the resolved IDs + labels.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    // Build API params.
    // If any filter key is active, CompanyName from the main search is ignored.
    const hasFilterActive = !!(
      appliedFilters.companyId ||
      appliedFilters.tickerId ||
      appliedFilters.sector ||
      appliedFilters.quarterId
    )

    const params = {
      CompanyName: hasFilterActive ? '' : appliedFilters.companyName || '',
      CompanyID: appliedFilters.companyId || 0,
      TickerID: appliedFilters.tickerId || 0,
      SectorID: appliedFilters.sectorId || 0,
      QuarterID: appliedFilters.quarterId || 0,
      PageSize: PAGE_SIZE,
      PageNumber: pageNumber,
    }

    const result = await GetSuspendedCompaniesApi(params, { skipLoader: true })

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

  // ── MQTT — update suspended companies list ────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH LISTING
  // Accepts an `appliedFilters` object that carries the resolved IDs + labels.
  // ─────────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    // Build API params.
    // If any filter key is active, CompanyName from the main search is ignored.
    const hasFilterActive = !!(
      appliedFilters.companyId ||
      appliedFilters.tickerId ||
      appliedFilters.sector ||
      appliedFilters.quarterId
    )

    const params = {
      CompanyName: hasFilterActive ? '' : appliedFilters.companyName || '',
      CompanyID: appliedFilters.companyId || 0,
      TickerID: appliedFilters.tickerId || 0,
      SectorID: appliedFilters.sectorId || 0,
      QuarterID: appliedFilters.quarterId || 0,
      PageSize: PAGE_SIZE,
      PageNumber: pageNumber,
    }

    const result = await GetSuspendedCompaniesApi(params, { skipLoader: true })

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

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.SUSPENDED_COMPANY_SAVED]: () => {
        // Payload only has IDs — refetch page 0 to get display names
        setPage(0)
        fetchData({}, 0, false)
      },
      [MQTT_TYPE.SUSPENDED_COMPANY_DELETED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d) return
        const key = `${d.fkCompanyID}_${d.fkFromQuarterID}_${d.fkToQuarterID}`
        setRows((prev) => prev.filter((r) => r.id !== key))
        setTotalCount((c) => Math.max(0, c - 1))
      },
    }),
    [fetchData]
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
        label: 'Quarter Name',
        type: 'select',
        // Quarters sorted by startDate desc per spec
        options: [...quarterOptions].sort((a, b) => b.startDate - a.startDate).map((o) => o.label),
      },
    ],
    [companyOptions, tickerOptions, sectorOptions, quarterOptions]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // QUARTER HELPERS
  // ─────────────────────────────────────────────────────────────────────────
  const getQuarterById = useCallback(
    (id) => quarterOptions.find((q) => q.value === id) ?? null,
    [quarterOptions]
  )

  const fromQuarterOptions = useMemo(
    () =>
      [...quarterOptions]
        .filter((q) => !form.ToStartDate || q.endDate < form.ToStartDate)
        .sort((a, b) => b.startDate - a.startDate),
    [quarterOptions, form.ToStartDate] // ← add form.ToStartDate as dependency
  )

  const toQuarterOptions = useMemo(
    () =>
      [...quarterOptions]
        .filter((q) => !form.FromEndDate || q.startDate > form.FromEndDate)
        .sort((a, b) => b.startDate - a.startDate),
    [quarterOptions, form.FromEndDate] // ← add form.FromEndDate as dependency
  )
  console.log({ toQuarterOptions, fromQuarterOptions, form }, 'toQuarterOptions')
  // ─────────────────────────────────────────────────────────────────────────
  // LOAD DROPDOWN OPTIONS  (quarters + companies + tickers in parallel, once)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true)

      const [quartersRes, companiesRes, tickersRes, sectorsRes] = await Promise.all([
        GetAllActiveQuartersApi({}, { skipLoader: true }),
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
        GetAllActiveCompanyTickersApi({}, { skipLoader: true }),
        GetAllActiveSectorsApi({}, { skipLoader: true }),
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

      // ── Quarters ──────────────────────────────────────────────────────────
      if (sectorsRes.success) {
        const rr = sectorsRes.data?.responseResult
        if (rr?.responseMessage === GET_SECTORS_SUCCESS) {
          setSectorOptions(
            (rr.sectors ?? []).map((t) => ({
              value: t.pK_SectorID,
              label: t.sectorName || '',
            }))
          )
        } else {
          toast.error('Failed to load sectors.')
        }
      } else {
        toast.error(sectorsRes.message || 'Failed to load sectors.')
      }
      setLoadingOptions(false)
    }

    loadOptions()
  }, [])

  // ── Initial load (StrictMode-safe single-fire) ────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    const nextPage = p + 1
    setPage(nextPage)
    fetchData(ap, nextPage, true)
  }, [fetchData])

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

  /**
   * Resolve a filter label back to its numeric ID using the loaded options.
   * Returns undefined if not found so we can skip missing mappings cleanly.
   */
  const resolveIds = useCallback(
    (filterState) => {
      const resolved = {}

      if (filterState.company) {
        const co = companyOptions.find((o) => o.label === filterState.company)
        if (co) resolved.companyId = co.value
        resolved.company = filterState.company
      }

      if (filterState.ticker) {
        const to = tickerOptions.find((o) => o.label === filterState.ticker)
        if (to) resolved.tickerId = to.value
        resolved.ticker = filterState.ticker
      }

      if (filterState.sector) {
        const so = sectorOptions.find((o) => o.label === filterState.sector)
        if (so) resolved.sectorId = so.value
        resolved.sector = filterState.sector
      }

      if (filterState.quarter) {
        const qo = quarterOptions.find((o) => o.label === filterState.quarter)
        if (qo) resolved.quarterId = qo.value
        resolved.quarter = filterState.quarter
      }

      return resolved
    },
    [companyOptions, tickerOptions, quarterOptions, sectorOptions]
  )

  const handleSearch = useCallback(() => {
    const hasFilterSelected = Object.values(filters).some((v) => typeof v === 'string' && v.trim())

    const newApplied = resolveIds(filters)

    // Only carry forward the main-search company name when NO filter chip is active
    if (mainSearch.trim() && !hasFilterSelected) {
      newApplied.companyName = mainSearch.trim()
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
      // Remove the corresponding resolved ID
      if (key === 'company') delete next.companyId
      if (key === 'ticker') delete next.tickerId
      if (key === 'sector') delete next.sectorId
      if (key === 'quarter') delete next.quarterId
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SORT  (client-side — quarter columns use actual startDate)
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
          const nameKey = sortCol === 'fromQuarterId' ? 'fromQuarterName' : 'toQuarterName'
          const aQ = quarterOptions.find((q) => q.label === a[nameKey])
          const bQ = quarterOptions.find((q) => q.label === b[nameKey])
          return ((aQ?.startDate?.getTime() ?? 0) - (bQ?.startDate?.getTime() ?? 0)) * dir
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

    // Carry forward any existing date-conflict errors
    if (errors.fromQuarterId) errs.fromQuarterId = errors.fromQuarterId
    if (errors.toQuarterId) errs.toQuarterId = errors.toQuarterId

    return errs
  }, [form, errors])

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE / UPDATE
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
        IsEdit: editingId ? 1 : 0,
        FK_CompanyID: Number(form.companyId),
        FK_FromQuarterID: Number(form.fromQuarterId),
        FK_ToQuarterID: Number(form.toQuarterId) ?? 0,
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
      setFormKey((k) => k + 1) // ← add this
      setPage(0)
      await fetchData(applied, 0, false)
      return
    }

    toast.error(SAVE_SUSPENDED_COMPANY_CODES[code] || 'Something went wrong.')
  }, [form, editingId, validate, fetchData, applied])

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────────────────────────────────────
  const handleEdit = useCallback(
    (row) => {
      const fromQ =
        quarterOptions.find((q) => Number(q.value) === Number(row.fromQuarterId)) ?? null
      const toQ = quarterOptions.find((q) => Number(q.value) === Number(row.toQuarterId)) ?? null

      setForm({
        companyId: row.companyId,
        fromQuarterId: row.fromQuarterId,
        toQuarterId: row.toQuarterId,
        FromEndDate: fromQ?.endDate ?? null, // ← so toQuarterOptions filters correctly
        ToStartDate: toQ?.startDate ?? null, // ← so fromQuarterOptions filters correctly
      })
      setErrors({})
      setEditingId(row.id)
    },
    [quarterOptions]
  ) // ← add quarterOptions as dependency

  const handleCancelEdit = useCallback(() => {
    setForm(EMPTY_FORM)
    setErrors({})
    setEditingId(null)
    setFormKey((k) => k + 1)
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
      await fetchData(applied, 0, false)
      return
    }

    setDeleteTarget(null)
    toast.error(DELETE_SUSPENDED_COMPANY_CODES[code] || 'Something went wrong.')
  }, [deleteTarget, editingId, handleCancelEdit, fetchData, applied])

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
        key: 'ticker',
        title: 'Ticker',
        sortable: true,
        align: 'center',
        render: (row) => <span className="text-[#000]">{row.ticker}</span>,
      },
      {
        key: 'sector',
        title: 'Sector',
        sortable: true,
        align: 'center',
        render: (row) => <span className="text-[#000]">{row.sector}</span>,
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
        render: (row) => <span className="text-[#000]">{row.toQuarterName}</span>,
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
  // Chip display keys — only the label keys, not the resolved ID keys
  // ─────────────────────────────────────────────────────────────────────────
  const chipEntries = useMemo(
    () =>
      Object.entries(applied).filter(([k]) =>
        ['company', 'ticker', 'sector', 'quarter', 'companyName'].includes(k)
      ),
    [applied]
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
                {`${CHIP_LABELS[k] ?? k}: ${v}`}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {chipEntries.length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Inline form ── */}
        <div key={formKey} className="px-4 pt-4 pb-7 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
            {/* Company */}
            <SearchableSelect
              label="Company"
              required
              placeholder={loadingOptions ? 'Loading…' : 'Select Company'}
              options={companyOptions}
              value={form.companyId}
              onChange={(v) => setF('companyId', v)}
              error={!!errors.companyId}
              errorMessage={errors.companyId}
              disabled={loadingOptions || isSaving || editingId}
            />

            {/* From Quarter ─────────────────────────────────────────────────
                Options are pre-filtered: only quarters whose endDate is
                strictly before the selected To Quarter's startDate.
                Sorted descending by startDate per spec.
            ──────────────────────────────────────────────────────────────── */}

            <SearchableSelect
              label="From Quarter Name"
              required
              placeholder={loadingOptions ? 'Loading…' : 'Select Quarter Name'}
              options={fromQuarterOptions}
              value={form.fromQuarterId}
              onChange={(v) => {
                const fromQ = quarterOptions.find((q) => Number(q.value) === Number(v)) ?? null

                setForm((p) => ({ ...p, fromQuarterId: v, FromEndDate: fromQ?.endDate ?? null })) // ← optional chain

                const toQ = getQuarterById(form.toQuarterId)
                if (fromQ && toQ) {
                  if (fromQ.endDate >= toQ.startDate) {
                    setErrors((p) => ({
                      ...p,
                      fromQuarterId: 'From Quarter end date must be before To Quarter start date',
                      toQuarterId: '',
                    }))
                  } else {
                    setErrors((p) => ({ ...p, fromQuarterId: '', toQuarterId: '' }))
                  }
                } else {
                  setErrors((p) => ({ ...p, fromQuarterId: '' })) // clears error when deselected
                }
              }}
              error={!!errors.fromQuarterId}
              errorMessage={errors.fromQuarterId}
              disabled={loadingOptions || isSaving}
            />

            {/* To Quarter ───────────────────────────────────────────────────
                Optional. Options are pre-filtered: only quarters whose
                startDate is strictly after the selected From Quarter's endDate.
                Sorted descending by startDate per spec.
            ──────────────────────────────────────────────────────────────── */}

            <SearchableSelect
              label="To Quarter Name"
              placeholder={loadingOptions ? 'Loading…' : 'Select To Quarter Name'}
              options={toQuarterOptions}
              value={form.toQuarterId}
              onChange={(v) => {
                const toQ = quarterOptions.find((q) => Number(q.value) === Number(v)) ?? null

                setForm((p) => ({ ...p, toQuarterId: v, ToStartDate: toQ?.startDate ?? null })) // ← optional chain

                const fromQ = getQuarterById(form.fromQuarterId)
                if (toQ && fromQ) {
                  if (toQ.startDate <= fromQ.endDate) {
                    setErrors((p) => ({
                      ...p,
                      toQuarterId: 'To Quarter start date must be after From Quarter end date',
                      fromQuarterId: '',
                    }))
                  } else {
                    setErrors((p) => ({ ...p, toQuarterId: '', fromQuarterId: '' }))
                  }
                } else {
                  setErrors((p) => ({ ...p, toQuarterId: '' })) // clears error when deselected
                }
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
                    !!errors.fromQuarterId ||
                    !!errors.toQuarterId
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
