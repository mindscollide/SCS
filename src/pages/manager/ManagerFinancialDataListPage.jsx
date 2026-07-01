/**
 * src/pages/manager/ManagerFinancialDataListPage.jsx
 * ====================================================
 * View Only role (roleID 4) — read-only paginated list of all financial-data
 * submissions made by Data Entry users.
 *
 * Derived from FinancialDataListPage but intentionally stripped of every write
 * operation:
 *  - No "Add Financial Data" button in the header
 *  - No "Actions" column (Edit icon / Send for Approval button)
 *  - No "View Approval History" column
 *
 * Company name is still clickable → navigates to /view-only/financial-data/view/:id
 * (ManagerViewFinancialDataPage in pure view mode — only Close button visible).
 * location.state.from is set to /view-only/financial-data so Back/Close return here.
 *
 * APIs used:
 *  GetFinancialDataApi           — same paginated listing as DataEntry view
 *  GetAllActiveQuartersApi       — Quarter filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyNamesApi   — Company filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyTickersApi — Ticker filter dropdown   (localStorage-cached)
 *  GetAllActiveSectorsApi        — Sector filter dropdown   (localStorage-cached)
 *
 * MQTT:
 *  data_submission_status_updated → update matching row status in real time
 *  financial_data_saved           → silent page-0 refetch for newly saved records
 *
 * Route:   /view-only/financial-data  (RoleRoute allowedRoleIds=[4])
 * Sidebar: "Financial Data List" — first entry in VIEW_ONLY_MENU.
 * No FinancialDataProvider needed — this page does not call SaveFinancialDataApi
 * or use the edit-record context.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  StatusBadge,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import useInfiniteScroll from '../../hooks/useInfiniteScroll.js'
import { formatChipValue } from '../../utils/helpers'
import {
  GetFinancialDataApi,
  GET_FINANCIAL_DATA_CODES,
} from '../../services/dataentry.service.js'
import {
  GetAllActiveQuartersApi,
  GetAllActiveCompanyNamesApi,
  GetAllActiveCompanyTickersApi,
  GetAllActiveSectorsApi,
} from '../../services/manager.service.js'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'

// ── Config ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(100vh - 220px)'

const Q_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const C_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const T_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyTickers_02'
const S_OK = 'Manager_ManagerServiceManager_GetAllActiveSectors_02'

const GET_SUCCESS = 'DataEntry_DataEntryServiceManager_GetFinancialData_03'
const GET_EMPTY = 'DataEntry_DataEntryServiceManager_GetFinancialData_02'

const STATUS_BY_ID = { 1: 'In Progress', 2: 'Pending For Approval', 3: 'Approved', 4: 'Declined' }
const STATUS_OPTS = Object.values(STATUS_BY_ID)
const STATUS_ID_BY_LABEL = Object.fromEntries(
  Object.entries(STATUS_BY_ID).map(([id, label]) => [label, Number(id)])
)

const EMPTY_FILTERS = { ticker: '', company: '', quarter: '', sector: '', status: '' }

const CHIP_LABELS = {
  ticker: 'Ticker',
  company: 'Company',
  quarter: 'Quarter',
  sector: 'Sector',
  status: 'Status',
  quarterName: 'Quarter Name',
}

// ── Row mapper ────────────────────────────────────────────────────────────────

const mapRow = (r) => ({
  id: r.pK_FinancialDataID,
  companyId: r.fK_CompanyID,
  company: r.companyName || '',
  ticker: r.ticker || '',
  sectorId: r.fK_SectorID,
  sector: r.sectorName || '',
  quarterId: r.fK_QuarterID,
  quarter: r.quarterName || '',
  statusId: r.fK_FinancialDataStatusID,
  status: r.status || '',
  createdBy: r.createdByName || '',
  createdAt: r.creationDateTime || '',
  modifiedAt: r.modifiedDateTime || '',
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ManagerFinancialDataListPage = () => {
  const navigate = useNavigate()

  // ── Dropdown options (loaded once on mount, cached in localStorage) ───────
  const [quarters, setQuarters] = useState([])
  const [companies, setCompanies] = useState([])
  const [tickers, setTickers] = useState([])
  const [sectors, setSectors] = useState([])
  const [loadingOpts, setLoadingOpts] = useState(true)

  // ── Listing state ─────────────────────────────────────────────────────────
  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})
  const [mainSearch, setMainSearch] = useState('')

  // ── Sort (client-side) ────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied }

  // ── Dropdown loader ───────────────────────────────────────────────────────
  const loadDropdowns = useCallback(async () => {
    setLoadingOpts(true)
    const [qRes, cRes, tRes, sRes] = await Promise.all([
      GetAllActiveQuartersApi({}, { skipLoader: true }),
      GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
      GetAllActiveCompanyTickersApi({}, { skipLoader: true }),
      GetAllActiveSectorsApi({}, { skipLoader: true }),
    ])

    if (qRes.success && qRes.data?.responseResult?.responseMessage === Q_OK) {
      setQuarters(
        (qRes.data.responseResult.quarters || []).map((q) => ({
          value: q.pK_QuarterID,
          label: q.quarterName || '',
        }))
      )
    }
    if (cRes.success && cRes.data?.responseResult?.responseMessage === C_OK) {
      setCompanies(
        (cRes.data.responseResult.companies || []).map((c) => ({
          value: c.pK_CompanyID,
          label: c.companyName || '',
        }))
      )
    }
    if (tRes.success && tRes.data?.responseResult?.responseMessage === T_OK) {
      setTickers(
        (tRes.data.responseResult.companies || []).map((t) => ({
          value: t.pK_CompanyID,
          label: t.ticker || '',
        }))
      )
    }
    if (sRes.success && sRes.data?.responseResult?.responseMessage === S_OK) {
      setSectors(
        (sRes.data.responseResult.sectors || []).map((s) => ({
          value: s.pK_SectorID,
          label: s.sectorName || '',
        }))
      )
    }
    setLoadingOpts(false)
  }, [])

  const filterFields = useMemo(
    () => [
      { key: 'ticker', label: 'Ticker', type: 'select', options: tickers.map((o) => o.label) },
      {
        key: 'company',
        label: 'Company Name',
        type: 'select',
        options: companies.map((o) => o.label),
      },
      {
        key: 'quarter',
        label: 'Quarter Name',
        type: 'select',
        options: quarters.map((o) => o.label),
      },
      { key: 'sector', label: 'Sector', type: 'select', options: sectors.map((o) => o.label) },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS },
    ],
    [tickers, companies, quarters, sectors]
  )

  const resolveIds = useCallback(
    (panel) => {
      const out = {}
      if (panel.ticker) {
        const o = tickers.find((x) => x.label === panel.ticker)
        if (o) out.tickerId = o.value
        out.ticker = panel.ticker
      }
      if (panel.company) {
        const o = companies.find((x) => x.label === panel.company)
        if (o) out.companyId = o.value
        out.company = panel.company
      }
      if (panel.quarter) {
        const o = quarters.find((x) => x.label === panel.quarter)
        if (o) out.quarterId = o.value
        out.quarter = panel.quarter
      }
      if (panel.sector) {
        const o = sectors.find((x) => x.label === panel.sector)
        if (o) out.sectorId = o.value
        out.sector = panel.sector
      }
      if (panel.status) {
        out.statusId = STATUS_ID_BY_LABEL[panel.status] || 0
        out.status = panel.status
      }
      return out
    },
    [tickers, companies, quarters, sectors]
  )

  // ── Fetch listing ─────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (appliedFilters = {}, pageNumber = 0, append = false, silent = false) => {
      if (append) setLoadingMore(true)
      else if (!silent) setLoadingInitial(true)

      const res = await GetFinancialDataApi(
        {
          QuarterName: appliedFilters.quarterName || '',
          FK_QuarterID: appliedFilters.quarterId || 0,
          TickerID: appliedFilters.tickerId || 0,
          CompanyNameID: appliedFilters.companyId || 0,
          FK_SectorID: appliedFilters.sectorId || 0,
          FK_FinancialDataStatusID: appliedFilters.statusId || 0,
          PageSize: PAGE_SIZE,
          PageNumber: pageNumber,
        },
        { skipLoader: true }
      )

      if (append) setLoadingMore(false)
      else if (!silent) setLoadingInitial(false)

      if (!res.success) {
        toast.error(res.message || 'Failed to load financial data.', {
          style: { backgroundColor: '#E74C3C', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        })
        if (!append) {
          setRows([])
          setTotalCount(0)
        }
        return
      }

      const rr = res.data?.responseResult
      const code = rr?.responseMessage

      if (code === GET_SUCCESS) {
        const fetched = Array.isArray(rr.financialData) ? rr.financialData.map(mapRow) : []
        setRows((prev) => (append ? [...prev, ...fetched] : fetched))
        setTotalCount(rr.totalCount ?? fetched.length)
        return
      }

      if (code === GET_EMPTY) {
        if (!append) {
          setRows([])
          setTotalCount(0)
        }
        return
      }

      toast.error(GET_FINANCIAL_DATA_CODES[code] || 'Something went wrong.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      if (!append) {
        setRows([])
        setTotalCount(0)
      }
    },
    []
  )

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    loadDropdowns()
    fetchData({}, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── MQTT ──────────────────────────────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.DATA_SUBMISSION_STATUS_UPDATED]: (payload) => {
        const data = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean)
        if (!data.length) return
        setRows((prev) =>
          prev.map((row) => {
            const hit = data.find(
              (d) =>
                Number(d.fK_CompanyID) === Number(row.companyId) &&
                Number(d.fK_QuarterID) === Number(row.quarterId)
            )
            return hit
              ? { ...row, status: hit.status, statusId: hit.fK_DataApprovalRequestStatusID }
              : row
          })
        )
      },
      [MQTT_TYPE.FINANCIAL_DATA_SAVED]: () => {
        const { applied: ap } = stateRef.current
        setPage(0)
        fetchData(ap, 0, false, true)
      },
    }),
    [fetchData]
  )
  useSubscribe(mqttTopic, mqttHandler)

  // ── Search / filter handlers ──────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const newApplied = resolveIds(filters)
    const ms = mainSearch.trim()
    if (ms) newApplied.quarterName = ms
    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
    setMainSearch('')
  }, [filters, mainSearch, resolveIds, fetchData])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setMainSearch('')
    setPage(0)
    fetchData({}, 0, false)
  }, [fetchData])

  const removeChip = useCallback(
    (key) => {
      const next = { ...applied }
      delete next[key]
      if (key === 'ticker') delete next.tickerId
      if (key === 'company') delete next.companyId
      if (key === 'quarter') delete next.quarterId
      if (key === 'sector') delete next.sectorId
      if (key === 'status') delete next.statusId
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col) => {
      setSortDir((d) => (sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  const sorted = useMemo(() => {
    if (!sortCol) return rows
    return [...rows].sort((a, b) => {
      const va = (a[sortCol] ?? '').toString().toLowerCase()
      const vb = (b[sortCol] ?? '').toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [rows, sortCol, sortDir])

  // ── Chip entries ──────────────────────────────────────────────────────────
  const chipEntries = useMemo(
    () =>
      Object.entries(applied).filter(([k]) =>
        ['ticker', 'company', 'quarter', 'sector', 'status', 'quarterName'].includes(k)
      ),
    [applied]
  )

  // ── Columns — no action / history columns ─────────────────────────────────
  const openView = useCallback(
    (row) =>
      navigate(`/view-only/financial-data/view/${row.id}`, {
        state: { from: '/view-only/financial-data' },
      }),
    [navigate]
  )

  const columns = useMemo(
    () => [
      {
        key: 'quarter',
        title: 'Quarter Name',
        sortable: true,
        render: (row) => <span className="font-semibold">{row.quarter}</span>,
      },
      {
        key: 'ticker',
        title: 'Ticker',
        sortable: true,
        align: 'center',
        render: (row) => <span>{row.ticker}</span>,
      },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        align: 'center',
        render: (row) => (
          <span
            className="text-[#0B39B5] font-medium cursor-pointer hover:underline"
            onClick={() => openView(row)}
          >
            {row.company}
          </span>
        ),
      },
      { key: 'sector', title: 'Sector', sortable: true, align: 'center' },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [openView]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* Header band */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                   flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Financial Data List</h1>
        <SearchFilter
          placeholder="Quarter Name. Click the icon to view more options"
          mainSearch={mainSearch}
          setMainSearch={setMainSearch}
          filters={filters}
          setFilters={setFilters}
          fields={filterFields}
          showFilterPanel
          onSearch={handleSearch}
          onReset={handleReset}
          onFilterClose={() => setFilters(EMPTY_FILTERS)}
        />
      </div>

      {/* Active filter chips */}
      {chipEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {chipEntries.map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                         text-[12px] font-medium text-white bg-[#01C9A4]"
            >
              {CHIP_LABELS[k] || k}: {formatChipValue(v)}
              <BtnChipRemove onClick={() => removeChip(k)} />
            </span>
          ))}
          {chipEntries.length > 1 && <BtnClearAll onClick={handleReset} />}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <CommonTable
          columns={columns}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Record Found'}
          headerBg="#E0E6F6"
          headerTextColor="#041E66"
          rowBg="#ffffff"
          rowHoverBg="#EFF3FF"
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
    </div>
  )
}

export default ManagerFinancialDataListPage
