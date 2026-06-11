/**
 * src/pages/dataentry/FinancialDataListPage.jsx
 * ===============================================
 * DataEntry officer's view of all their financial-data submissions.
 *
 * APIs used:
 *  GetFinancialDataApi             — paginated listing with filters
 *  GetAllActiveQuartersApi         — Quarter filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyNamesApi     — Company filter dropdown (localStorage-cached)
 *  GetAllActiveCompanyTickersApi   — Ticker filter dropdown   (localStorage-cached)
 *  GetAllActiveSectorsApi          — Sector filter dropdown   (localStorage-cached)
 *
 * Status semantics:
 *  1 = In Progress           → Edit + Send for Approval allowed
 *  2 = Pending For Approval  → locked (awaiting Manager action)
 *  3 = Approved              → locked, read-only
 *  4 = Declined              → Edit only (no send)
 *
 * Filter resolution:
 *  The SearchFilter panel keeps label strings (Quarter Name, Ticker, Company,
 *  Sector). resolveIds() maps each label → the matching dropdown option PK so
 *  the API receives FK_QuarterID, TickerID, CompanyNameID, FK_SectorID. Status
 *  is held as a number constant (1–4) directly.
 *
 *  Why `Number(o.value) === Number(...)` checks: SearchableSelect emits the raw
 *  option value which may be a number; comparisons coerce both sides to be safe.
 *
 * Pagination:
 *  Server-side via useInfiniteScroll. PageNumber is page-index (0,1,2…).
 *  Always render CommonTable — sentinel must stay in DOM (see MEMORY §6).
 *
 * MQTT:
 *  `data_submission_status_updated` (Manager → DataEntry, this submitter only)
 *  → update the matching row's status using `data[n].dataApprovalRequestID`.
 *  Wired via stable handler + stateRef so the latest `applied` filter is read
 *  without stale-closure issues.
 *
 * Search behaviour:
 *  Main search box → API `QuarterName` LIKE filter (verified in
 *  sp_GetFinancialData, 2026-06-11). Coexists with the panel's Quarter dropdown
 *  (FK_QuarterID exact match) — the server applies both. Committed on Search,
 *  shown as a "Quarter Name" chip.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Send, Eye } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  StatusBadge,
  BtnGold,
  BtnIconEdit,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import { SendForApprovalModal } from '../../components/common/modals/Modals.jsx'
import ApprovalHistoryModal from '../../components/common/financialData/ApprovalHistoryModal.jsx'
import useInfiniteScroll from '../../hooks/useInfiniteScroll.js'
import { formatChipValue } from '../../utils/helpers'
import viewHistory from '../../../public/view-history.png'
import {
  GetFinancialDataApi,
  GET_FINANCIAL_DATA_CODES,
  SubmitFinancialDataForApprovalApi,
  SUBMIT_FINANCIAL_DATA_FOR_APPROVAL_CODES,
} from '../../services/dataentry.service.js'
import {
  GetAllActiveQuartersApi,
  GetAllActiveCompanyNamesApi,
  GetAllActiveCompanyTickersApi,
  GetAllActiveSectorsApi,
} from '../../services/manager.service.js'
import { useFinancialData } from '../../context/FinancialDataContext.jsx'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'

// ── Config ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'

// Open-API success codes (used to validate dropdown responses)
const Q_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const C_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const T_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyTickers_02'
const S_OK = 'Manager_ManagerServiceManager_GetAllActiveSectors_02'

const GET_SUCCESS = 'DataEntry_DataEntryServiceManager_GetFinancialData_03'
const GET_EMPTY = 'DataEntry_DataEntryServiceManager_GetFinancialData_02'

// Status: label ↔ FK_FinancialDataStatusID  (0 = all)
const STATUS_BY_ID = { 1: 'In Progress', 2: 'Pending For Approval', 3: 'Approved', 4: 'Declined' }
const STATUS_OPTS = Object.values(STATUS_BY_ID)
const STATUS_ID_BY_LABEL = Object.fromEntries(
  Object.entries(STATUS_BY_ID).map(([id, label]) => [label, Number(id)])
)

// Filter-panel staging shape (all string labels — resolved to IDs on Search)
const EMPTY_FILTERS = { ticker: '', company: '', quarter: '', sector: '', status: '' }

const CHIP_LABELS = {
  ticker: 'Ticker',
  company: 'Company',
  quarter: 'Quarter',
  sector: 'Sector',
  status: 'Status',
  quarterName: 'Quarter Name', // main-search LIKE filter
}

// ── Row mapper ────────────────────────────────────────────────────────────────
// API field casing is camelCase (responseResult JSON).
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

const FinancialDataListPage = () => {
  const navigate = useNavigate()
  const { setEditRecord } = useFinancialData()

  // ── Dropdown options (loaded once on mount, cached in localStorage) ───────
  const [quarters, setQuarters] = useState([]) // [{ value: PK, label: name }]
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

  // ── Search / filter (panel = staging; applied = committed + resolved IDs) ─
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})
  const [mainSearch, setMainSearch] = useState('')

  // ── Sort (client-side) ────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('quarter')
  const [sortDir, setSortDir] = useState('desc')

  // ── Modal state ───────────────────────────────────────────────────────────
  const [sendModal, setSendModal] = useState(null)
  const [histModal, setHistModal] = useState(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  // stateRef — keeps latest `page` + `applied` accessible inside stable callbacks
  // (load-more handler + MQTT handler) without re-creating them on every change.
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

  // ── Filter-panel field definitions (built once dropdowns are loaded) ──────
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
        out.status = panel.status
      }
      return out
    },
    [tickers, companies, quarters, sectors]
  )

  // ── Fetch listing (paginated) ─────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const res = await GetFinancialDataApi(
      {
        QuarterName: appliedFilters.quarterName || '', // LIKE filter from main search box
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
    else setLoadingInitial(false)

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
  }, [])

  // ── Mount: load dropdowns + initial page in parallel (StrictMode-guarded) ──
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    loadDropdowns()
    fetchData({}, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll: load the next page when sentinel hits the viewport ──
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

  // ── MQTT — DataEntry receives status updates for their own submissions ────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      // data_submission_status_updated: payload `data` is an array of approval-request rows.
      // Each row carries the dataApprovalRequestID (NOT pK_FinancialDataID), the new
      // status (Approved / Declined / …) and the matching company/quarter pair.
      // Strategy: update statuses for rows whose company+quarter pair matches.
      // (Backend doesn't include pK_FinancialDataID on this event — see manager.md.)
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
    }),
    []
  )
  useSubscribe(mqttTopic, mqttHandler)

  // ── Search / filter handlers ──────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const newApplied = resolveIds(filters)
    // Main search box → QuarterName LIKE filter (server applies it alongside
    // the panel's FK_QuarterID exact-match filter).
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
      // Remove the matching resolved-id key alongside the label key
      if (key === 'ticker') delete next.tickerId
      if (key === 'company') delete next.companyId
      if (key === 'quarter') delete next.quarterId
      if (key === 'sector') delete next.sectorId
      if (key === 'status') delete next.statusId
      // quarterName has no resolved-id sibling — the chip key itself is the API field.
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ── Sort (client-side over the current rows) ──────────────────────────────
  const handleSort = useCallback(
    (col) => {
      setSortDir((d) => (sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = (a[sortCol] ?? '').toString().toLowerCase()
      const vb = (b[sortCol] ?? '').toString().toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [rows, sortCol, sortDir])

  // ── Row action handlers ───────────────────────────────────────────────────
  const handleEdit = useCallback(
    (row) => {
      // Pass the row to the Add/Edit page via context (existing pattern).
      setEditRecord(row)
      navigate('/data-entry/financial-data/add')
    },
    [setEditRecord, navigate]
  )

  const openView = useCallback(
    (row) => navigate(`/data-entry/financial-data/view/${row.id}`),
    [navigate]
  )

  // Chip-only keys actually shown (skip resolved-id keys so chips stay clean)
  const chipEntries = useMemo(
    () =>
      Object.entries(applied).filter(([k]) =>
        ['ticker', 'company', 'quarter', 'sector', 'status', 'quarterName'].includes(k)
      ),
    [applied]
  )

  // ── Table columns ─────────────────────────────────────────────────────────
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
      {
        key: '_actions',
        title: 'Actions',
        sortable: false,
        align: 'center',
        render: (row) => (
          <div className="flex items-center justify-center gap-1">
            {/* Edit slot — In Progress / Declined only */}
            <div className="w-8 h-8 flex items-center justify-center">
              {(row.status === 'In Progress' || row.status === 'Declined') && (
                <BtnIconEdit icon={<Edit size={14} />} size={14} onClick={() => handleEdit(row)} />
              )}
            </div>

            {/* Send slot — In Progress only */}
            <div className="w-8 h-8 flex items-center justify-center">
              {row.status === 'In Progress' && (
                <button
                  onClick={() => setSendModal(row)}
                  className="w-8 h-8 rounded-lg hover:bg-[#e6faf7] hover:text-[#01C9A4]
                             text-slate-400 flex items-center justify-center transition-all"
                  title="Send for Approval"
                >
                  <Send color="#0B39B5" size={14} />
                </button>
              )}
            </div>

            {/* View slot — always available */}
            <div className="flex items-center justify-center">
              <BtnIconEdit
                icon={<Eye size={14} />}
                size={14}
                title="View"
                onClick={() => openView(row)}
              />
            </div>
          </div>
        ),
      },
      {
        key: '_history',
        title: 'View Approval History',
        sortable: false,
        align: 'center',
        render: (row) =>
          row.status !== 'In Progress' ? (
            <div className="flex justify-center items-center">
              <img
                className="cursor-pointer"
                onClick={() => setHistModal(row)}
                alt="view approval icon"
                src={viewHistory}
                width={30}
              />
            </div>
          ) : null,
      },
    ],
    [handleEdit, openView]
  )

  // ── Send-for-approval (table action icon) → SubmitFinancialDataForApproval ──
  // The row is an already-saved draft, so we submit by PK only — no value edits,
  // no fetch chain. Status flips to Pending; Managers are notified (MQTT).
  const handleProceed = useCallback(
    async (notes) => {
      const row = sendModal
      setSendModal(null)
      if (!row) return

      const res = await SubmitFinancialDataForApprovalApi({
        PK_FinancialDataID: row.id,
        Notes: notes || '',
      })

      const rr = res?.data?.responseResult
      const code = rr?.responseMessage
      // _06 = success (null in the codes map); isExecuted is the reliable signal.
      const ok =
        res.success && (rr?.isExecuted || SUBMIT_FINANCIAL_DATA_FOR_APPROVAL_CODES[code] === null)
      if (ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, status: 'Pending For Approval', statusId: 2 } : r
          )
        )
        toast.success('Submitted for approval successfully')
        return
      }

      toast.error(
        SUBMIT_FINANCIAL_DATA_FOR_APPROVAL_CODES[code] ||
          res.message ||
          'Failed to submit for approval.',
        {
          style: { backgroundColor: '#E74C3C', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        }
      )
    },
    [sendModal]
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
        <div className="flex items-center gap-2">
          <BtnGold
            onClick={() => {
              setEditRecord(null)
              navigate('/data-entry/financial-data/add')
            }}
            className="flex items-center gap-2 shrink-0"
          >
            Add Financial Data
          </BtnGold>
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
                rows.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* Send-for-approval confirmation modal */}
      <SendForApprovalModal
        open={!!sendModal}
        onClose={() => setSendModal(null)}
        onProceed={handleProceed}
      />

      {/* Approval history modal */}
      <ApprovalHistoryModal record={histModal} onClose={() => setHistModal(null)} />
    </div>
  )
}

export default FinancialDataListPage
