/**
 * src/pages/dataentry/PendingForApprovalPage.jsx
 * ================================================
 * DataEntry "Pending Approvals" listing — server-driven view of this officer's
 * financial-data submissions, defaulting to status "Pending For Approval".
 *
 * APIs used:
 *  GetFinancialDataApi             — paginated listing (FK_FinancialDataStatusID = 2 by default)
 *  GetAllActiveQuartersApi         — Quarter filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyNamesApi     — Company filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyTickersApi   — Ticker filter dropdown  (localStorage-cached)
 *  GetAllActiveSectorsApi          — Sector filter dropdown  (localStorage-cached)
 *
 * SRS:
 *  - Columns: Quarter Name, Ticker, Company Name, Sector, Sent On (all sortable)
 *  - Company Name → navigates to View Financial Data page
 *
 * Status filter:
 *  The panel's Status select DEFAULTS to "Pending For Approval" (statusId 2) and
 *  the initial fetch is made with it applied (shown as a chip). The user may pick
 *  another status, or remove the chip to list all statuses. Reset always returns
 *  to the page default (Pending For Approval).
 *
 * Sent On:
 *  The listing API carries no dedicated submission timestamp, so the column shows
 *  modifiedDateTime — set when the record was submitted for approval — with
 *  creationDateTime as fallback. Raw format yyyyMMddHHmmss → displayed dd-mm-yyyy.
 *  Sorting uses the raw value so order is chronological, not alphabetical.
 *
 * Filter resolution:
 *  The SearchFilter panel keeps label strings; resolveIds() maps each label to
 *  the matching dropdown option PK so the API receives FK_QuarterID, TickerID,
 *  CompanyNameID, FK_SectorID. Status label maps to FK_FinancialDataStatusID.
 *
 * Pagination:
 *  Server-side via useLazyLoad — PageNumber is page-index (0,1,2…). The table is
 *  always rendered so the infinite-scroll sentinel stays in the DOM (MEMORY §6).
 *
 * MQTT:
 *  `data_submission_status_updated` (Manager → this submitter only) — a Manager
 *  approved/declined one of this user's submissions, so the row no longer belongs
 *  in the current status-filtered list → silent refetch of page 0 with the
 *  applied filters (keeps rows + totalCount consistent without flashing the
 *  loading state). Wired via stable handler + stateRef (no stale closures).
 *
 * Search behaviour:
 *  Main search box is inactive — the listing endpoint has no free-text filter
 *  (same as FinancialDataListPage); the filter panel is the only narrowing tool.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import { BtnChipRemove, BtnClearAll } from '../../components/common'
import useLazyLoad from '../../hooks/useLazyLoad.js'
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

const PAGE_SIZE        = 10
const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'

// Open-API success codes (used to validate dropdown responses)
const Q_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const C_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const T_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyTickers_02'
const S_OK = 'Manager_ManagerServiceManager_GetAllActiveSectors_02'

const GET_SUCCESS = 'DataEntry_DataEntryServiceManager_GetFinancialData_03'
const GET_EMPTY   = 'DataEntry_DataEntryServiceManager_GetFinancialData_02'

// Error-toast style (MEMORY §10)
const RED_TOAST = {
  style:         { backgroundColor: '#E74C3C', color: '#fff' },
  progressStyle: { backgroundColor: '#ffffff50' },
}

// Status: label ↔ FK_FinancialDataStatusID  (0 = all)
const STATUS_BY_ID = { 1: 'In Progress', 2: 'Pending For Approval', 3: 'Approved', 4: 'Declined' }
const STATUS_OPTS  = Object.values(STATUS_BY_ID)
const STATUS_ID_BY_LABEL = Object.fromEntries(
  Object.entries(STATUS_BY_ID).map(([id, label]) => [label, Number(id)])
)

// Page default — the Status select starts on "Pending For Approval"
const DEFAULT_STATUS_LABEL = STATUS_BY_ID[2]

// Filter-panel staging shape (label strings — resolved to IDs on Search)
const DEFAULT_FILTERS = { ticker: '', company: '', quarter: '', sector: '', status: DEFAULT_STATUS_LABEL }

// Initial committed filters — page opens showing pending records only
const DEFAULT_APPLIED = { status: DEFAULT_STATUS_LABEL, statusId: 2 }

const CHIP_LABELS = {
  ticker:  'Ticker',
  company: 'Company',
  quarter: 'Quarter',
  sector:  'Sector',
  status:  'Status',
}

// Keys shown as chips (resolved-id keys are skipped)
const CHIP_KEYS = ['ticker', 'company', 'quarter', 'sector', 'status']

// ── Helpers ───────────────────────────────────────────────────────────────────

/** "20260101080000" → "01-01-2026" (same convention as manager PendingApprovalsPage) */
const fmtApiDate = (raw) => {
  if (!raw) return ''
  const s = String(raw)
  if (s.length < 8) return s
  return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`
}

// ── Row mapper ────────────────────────────────────────────────────────────────
// API field casing is camelCase (responseResult JSON).
// sentOnRaw keeps the yyyyMMddHHmmss string for chronological sorting.
const mapRow = (r) => {
  const sentRaw = r.modifiedDateTime || r.creationDateTime || ''
  return {
    id:        r.pK_FinancialDataID,
    companyId: r.fK_CompanyID,
    company:   r.companyName || '',
    ticker:    r.ticker      || '',
    sectorId:  r.fK_SectorID,
    sector:    r.sectorName  || '',
    quarterId: r.fK_QuarterID,
    quarter:   r.quarterName || '',
    statusId:  r.fK_FinancialDataStatusID,
    status:    r.status      || '',
    sentOnRaw: sentRaw,
    sentOn:    fmtApiDate(sentRaw),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PendingForApprovalPage = () => {
  const navigate = useNavigate()

  // ── Dropdown options (loaded once on mount, cached in localStorage) ───────
  const [quarters,  setQuarters]  = useState([])  // [{ value: PK, label: name }]
  const [companies, setCompanies] = useState([])
  const [tickers,   setTickers]   = useState([])
  const [sectors,   setSectors]   = useState([])

  // ── Listing state ─────────────────────────────────────────────────────────
  const [rows,           setRows]           = useState([])
  const [totalCount,     setTotalCount]     = useState(0)
  const [loadedPages,    setLoadedPages]    = useState(0)  // pages fetched so far
  const [loadingInitial, setLoadingInitial] = useState(true)

  // ── Search / filter (panel = staging; applied = committed + resolved IDs) ─
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS)
  const [applied,    setApplied]    = useState(DEFAULT_APPLIED)
  const [mainSearch, setMainSearch] = useState('')

  // ── Sort (client-side over loaded rows) ───────────────────────────────────
  const [sortCol, setSortCol] = useState('quarter')
  const [sortDir, setSortDir] = useState('desc')

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  // stateRef — latest `applied` + `rows` for stable callbacks (load-more + MQTT)
  const stateRef = useRef({})
  stateRef.current = { applied, rows }

  // ── Lazy load (page-index pagination — MEMORY §6) ─────────────────────────
  // onLoadMore is an inline arrow so fetchData (declared below) is resolved at
  // call time, not at hook-definition time — no TDZ issue (Law 18).
  const { sentinelRef, scrollRef, loadingMore, setLoadingMore } = useLazyLoad({
    offset: loadedPages,
    total:  Math.ceil(totalCount / PAGE_SIZE),
    onLoadMore: (nextPage) => {
      const { applied: ap } = stateRef.current
      fetchData(ap, nextPage, true) // nextPage = 1, 2, 3 …
    },
  })

  // ── Fetch listing (paginated) ─────────────────────────────────────────────
  // silent=true → background refetch (MQTT) — rows swap in place without
  // flashing the initial-loading spinner.
  const fetchData = useCallback(
    async (appliedFilters = {}, pageNumber = 0, append = false, silent = false) => {
      if (append)      setLoadingMore(true)
      else if (!silent) setLoadingInitial(true)

      const res = await GetFinancialDataApi(
        {
          QuarterName:              '', // listing endpoint has no LIKE filter — use the dropdown
          FK_QuarterID:             appliedFilters.quarterId || 0,
          TickerID:                 appliedFilters.tickerId  || 0,
          CompanyNameID:            appliedFilters.companyId || 0,
          FK_SectorID:              appliedFilters.sectorId  || 0,
          FK_FinancialDataStatusID: appliedFilters.statusId  || 0,
          PageSize:                 PAGE_SIZE,
          PageNumber:               pageNumber,
        },
        { skipLoader: true }
      )

      if (append)      setLoadingMore(false)
      else if (!silent) setLoadingInitial(false)

      if (!res.success) {
        toast.error(res.message || 'Failed to load pending approvals.', RED_TOAST)
        if (!append) { setRows([]); setTotalCount(0); setLoadedPages(1) }
        return
      }

      const rr   = res.data?.responseResult
      const code = rr?.responseMessage

      if (code === GET_SUCCESS) {
        const fetched = Array.isArray(rr.financialData) ? rr.financialData.map(mapRow) : []
        setRows((prev) => (append ? [...prev, ...fetched] : fetched))
        setTotalCount(rr.totalCount ?? fetched.length)
        setLoadedPages(append ? (p) => p + 1 : 1)
        return
      }

      if (code === GET_EMPTY) {
        if (append) {
          // Data shrank between pages (e.g. a Manager actioned rows mid-scroll):
          // clamp the total to what is loaded so the observer stops asking.
          setLoadedPages((p) => p + 1)
          setTotalCount(stateRef.current.rows.length)
        } else {
          setRows([]); setTotalCount(0); setLoadedPages(1)
        }
        return
      }

      toast.error(GET_FINANCIAL_DATA_CODES[code] || 'Something went wrong.', RED_TOAST)
      if (!append) { setRows([]); setTotalCount(0); setLoadedPages(1) }
    },
    [setLoadingMore]
  )

  // ── Dropdown loader ───────────────────────────────────────────────────────
  const loadDropdowns = useCallback(async () => {
    const [qRes, cRes, tRes, sRes] = await Promise.all([
      GetAllActiveQuartersApi({},       { skipLoader: true }),
      GetAllActiveCompanyNamesApi({},   { skipLoader: true }),
      GetAllActiveCompanyTickersApi({}, { skipLoader: true }),
      GetAllActiveSectorsApi({},        { skipLoader: true }),
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
  }, [])

  // ── Mount: dropdowns + initial pending page in parallel (StrictMode guard) ─
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    loadDropdowns()
    fetchData(DEFAULT_APPLIED, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── MQTT — Manager actioned one of this user's submissions ────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      // Payload rows carry dataApprovalRequestID + company/quarter + new status
      // (no pK_FinancialDataID), so rather than patching rows we silently
      // refetch page 0 with the current filters — the actioned record drops
      // out of the pending view and totalCount stays accurate.
      [MQTT_TYPE.DATA_SUBMISSION_STATUS_UPDATED]: () => {
        const { applied: ap } = stateRef.current
        setLoadedPages(0)
        fetchData(ap, 0, false, true)
      },
    }),
    [fetchData]
  )
  useSubscribe(mqttTopic, mqttHandler)

  // ── Filter-panel field definitions (rebuilt when dropdowns load) ──────────
  const filterFields = useMemo(
    () => [
      { key: 'ticker',  label: 'Ticker',       type: 'select', options: tickers.map((o) => o.label) },
      { key: 'company', label: 'Company Name', type: 'select', options: companies.map((o) => o.label) },
      { key: 'quarter', label: 'Quarter Name', type: 'select', options: quarters.map((o) => o.label) },
      { key: 'sector',  label: 'Sector',       type: 'select', options: sectors.map((o) => o.label) },
      { key: 'status',  label: 'Status',       type: 'select', options: STATUS_OPTS },
    ],
    [tickers, companies, quarters, sectors]
  )

  // ── Resolve filter labels → numeric IDs for the API payload ───────────────
  // Keeps both the label (for chips) and the resolved id (for the API).
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
        out.status   = panel.status
      }
      return out
    },
    [tickers, companies, quarters, sectors]
  )

  // ── Search / filter handlers ──────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const newApplied = resolveIds(filters)
    setApplied(newApplied)
    setLoadedPages(0)
    fetchData(newApplied, 0, false)
    setFilters(DEFAULT_FILTERS)
    setMainSearch('')
  }, [filters, resolveIds, fetchData])

  // Reset returns to the page default — pending records only
  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setApplied(DEFAULT_APPLIED)
    setMainSearch('')
    setLoadedPages(0)
    fetchData(DEFAULT_APPLIED, 0, false)
  }, [fetchData])

  // Removing a chip drops that filter (status chip removal → all statuses)
  const removeChip = useCallback(
    (key) => {
      const next = { ...applied }
      delete next[key]
      if (key === 'ticker')  delete next.tickerId
      if (key === 'company') delete next.companyId
      if (key === 'quarter') delete next.quarterId
      if (key === 'sector')  delete next.sectorId
      if (key === 'status')  delete next.statusId
      setApplied(next)
      setLoadedPages(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ── Sort (client-side over the loaded rows) ───────────────────────────────
  const handleSort = useCallback(
    (col) => {
      setSortDir((d) => (sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  const sorted = useMemo(() => {
    // Sent On sorts on the raw yyyyMMddHHmmss value → chronological order
    const getVal = (row) => ((sortCol === 'sentOn' ? row.sentOnRaw : row[sortCol]) ?? '')
    return [...rows].sort((a, b) => {
      const va = getVal(a).toString().toLowerCase()
      const vb = getVal(b).toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [rows, sortCol, sortDir])

  // Chip-only keys actually shown (skip resolved-id keys so chips stay clean)
  const chipEntries = useMemo(
    () => Object.entries(applied).filter(([k]) => CHIP_KEYS.includes(k)),
    [applied]
  )

  // ── Table columns (SRS: Quarter, Ticker, Company, Sector, Sent On) ────────
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
      },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        render: (row) => (
          <span
            className="text-[#0B39B5] font-medium cursor-pointer hover:underline"
            onClick={() => navigate(`/data-entry/financial-data/view/${row.id}`)}
          >
            {row.company}
          </span>
        ),
      },
      { key: 'sector', title: 'Sector', sortable: true, align: 'center' },
      {
        key: 'sentOn',
        title: 'Sent On',
        sortable: true,
        align: 'center',
        render: (row) => (
          <span className="text-slate-600 text-[13px]">{row.sentOn || '—'}</span>
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
      {/* Header band */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                   flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Approvals</h1>
        <SearchFilter
          placeholder="Use filter to narrow results"
          mainSearch={mainSearch}
          setMainSearch={setMainSearch}
          filters={filters}
          setFilters={setFilters}
          fields={filterFields}
          showFilterPanel
          onSearch={handleSearch}
          onReset={handleReset}
          onFilterClose={() => setFilters(DEFAULT_FILTERS)}
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

      {/* Table — always rendered so the infinite-scroll sentinel stays in the DOM */}
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
                loadedPages >= Math.ceil(totalCount / PAGE_SIZE) && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>
    </div>
  )
}

export default PendingForApprovalPage
