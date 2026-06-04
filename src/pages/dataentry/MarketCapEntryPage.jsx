/**
 * src/pages/dataentry/MarketCapEntryPage.jsx
 * ============================================
 * DataEntry officer enters / edits quarterly Market Capitalization values.
 *
 * APIs used:
 *  Dropdowns (open, no token):
 *    GetAllActiveQuartersApi      — Quarter dropdown (form + upload modal + filter)
 *    GetAllActiveCompanyNamesApi  — Company dropdown (form + filter)
 *    GetAllActiveSectorsApi       — Sector filter dropdown
 *
 *  Table (paginated, lazy-loaded):
 *    GetMarketCapitalizationApi   — filtered by quarter / company / sector
 *
 *  Mutations:
 *    SaveMarketCapitalizationApi         — create (PK=0) or update value (PK>0)
 *    DeleteMarketCapitalizationApi       — hard delete by PK
 *
 *  Excel upload — 2-step flow:
 *    ParseAndUploadMarketCapitalizationApi — Step 1: parse + validate only, NO save
 *      Returns: { newMarketCapitalization, marketCapAlreadyExists, companiesNotFound }
 *    BulkSaveMarketCapitalizationApi       — Step 2: actual upsert of new records only
 *      Receives: { FK_QuarterID, Records: [{ FK_CompanyID, Value }] }
 *
 * Search / Filter UI:
 *  Follows the app-wide SearchFilter pattern (mirrors CompaniesPage companyName/companyID).
 *  Main search bar   → free-text quarterName  (chip key: "quarterName")
 *  Filter panel      → exact quarterId select  (chip key: "quarterId", resolved to quarterIdValue)
 *  When quarterId is active, quarterName is NOT sent to the API (and vice-versa).
 *  Applied chips shown below header; each chip removable individually.
 *
 * Excel upload (SheetJS):
 *  Columns read: SYMBOL → Ticker, Market Capitalization → Value (others ignored).
 *  Records with empty Ticker or Value ≤ 0 are skipped before sending to API.
 *
 * MQTT:
 *  market_cap_saved    → refetch page 0 if saved record's quarter matches current view
 *  market_cap_deleted  → optimistic row remove by pkMarketCapitalizationID (no refetch)
 *  market_cap_uploaded → refetch page 0 if uploaded quarter matches current view
 *  All handlers use stateRef to read the latest `applied` filter without stale closures.
 *
 * Market Cap Input:
 *  — Custom inline <input> (not the reusable Input component) so we have direct
 *    access to selectionStart/selectionEnd for cursor-safe comma formatting.
 *  — Max 15 integer digits + up to 2 decimal places.
 *  — Commas are inserted as the user types but cursor position is preserved so
 *    mid-number edits (insert / delete / select-replace) work correctly.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import { formatChipValue } from '../../utils/helpers'
import {
  ConfirmModal,
  BtnPrimary,
  BtnGold,
  BtnTeal,
  BtnIconEdit,
  BtnIconDelete,
  BtnModalClose,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'
import {
  GetAllActiveQuartersApi,
  GetAllActiveCompanyNamesApi,
  GetAllActiveSectorsApi,
} from '../../services/manager.service.js'
import {
  GetMarketCapitalizationApi,
  GET_MARKET_CAPITALIZATION_CODES,
  SaveMarketCapitalizationApi,
  SAVE_MARKET_CAPITALIZATION_CODES,
  DeleteMarketCapitalizationApi,
  DELETE_MARKET_CAPITALIZATION_CODES,
  ParseAndUploadMarketCapitalizationApi,
  PARSE_AND_UPLOAD_MARKET_CAPITALIZATION_CODES,
  BulkSaveMarketCapitalizationApi,
  BULK_SAVE_MARKET_CAPITALIZATION_CODES,
} from '../../services/dataentry.service.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(90vh - 280px)'

const GET_SUCCESS = 'DataEntry_DataEntryServiceManager_GetMarketCapitalization_03'
const GET_EMPTY = 'DataEntry_DataEntryServiceManager_GetMarketCapitalization_02'
const SAVE_SUCCESS = 'DataEntry_DataEntryServiceManager_SaveMarketCapitalization_05'
const SAVE_DUP = 'DataEntry_DataEntryServiceManager_SaveMarketCapitalization_06'
const DEL_SUCCESS = 'DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_03'
const PARSE_SUCCESS = 'DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_05'
const BULK_SUCCESS = 'DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_04'

// ── Chip labels
// quarterName  → free-text main-search chip  (mirrors companyName in CompaniesPage)
// quarterId    → filter-panel exact-select chip (mirrors companyID in CompaniesPage)
const CHIP_LABELS = {
  quarterName: 'Quarter', // free-text chip
  quarterId: 'Quarter', // exact-select chip (only one is ever active at a time)
  companyId: 'Company',
  sectorId: 'Sector',
}

const EMPTY_FILTERS = {
  quarterId: '', // filter-panel exact select
  quarterName: '', // mirrors main search bar
  companyId: '',
  sectorId: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const showError = (msg) =>
  toast.error(msg, {
    style: { backgroundColor: '#E74C3C', color: '#fff' },
    progressStyle: { backgroundColor: '#ffffff50' },
  })

/** Format a raw number/string into "1,234,567.89" (always 2 dp) */
const formatCap = (value) => {
  const num = parseFloat(String(value).replace(/,/g, ''))
  if (isNaN(num)) return ''
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Strip commas and parse back to a float for the API */
const parseCap = (str) => parseFloat(String(str).replace(/,/g, '')) || 0

/** API record → local shape */
const mapRecord = (r) => ({
  id: r.pK_MarketCapitalizationID,
  companyId: r.fK_CompanyID,
  companyName: r.companyName || '',
  ticker: r.ticker || '',
  sectorId: r.fK_SectorID,
  sectorName: r.sectorName || '',
  quarterId: r.fK_QuarterID,
  quarterName: r.quarterName || '',
  value: r.value,
  cap: formatCap(r.value ?? 0),
})

// ── MarketCapInput ─────────────────────────────────────────────────────────────
/**
 * Self-contained numeric input that:
 *  • Allows only digits and one decimal point
 *  • Limits integer part to 15 digits, decimal part to 2 digits
 *  • Inserts thousand-separator commas on every keystroke
 *  • Preserves the logical cursor position after reformatting
 *    (counts digits before the cursor, not raw character positions,
 *     so inserting/deleting in the middle of a formatted number works correctly)
 *
 * Props:
 *   value    {string}   — controlled formatted value  e.g. "1,234,567.89"
 *   onChange {Function} — called with new formatted string
 *   disabled {boolean}
 */
const MarketCapInput = ({ value, onChange, disabled = false }) => {
  const inputRef = useRef(null)
  const nextCursorRef = useRef(null)

  const handleChange = (e) => {
    const el = e.target
    const raw = el.value
    const cursorPos = el.selectionStart

    const stripped = raw.replace(/,/g, '').replace(/[^0-9.]/g, '')

    const dotIdx = stripped.indexOf('.')
    const clean =
      dotIdx === -1
        ? stripped
        : stripped.slice(0, dotIdx + 1) + stripped.slice(dotIdx + 1).replace(/\./g, '')

    const [intRaw = '', decRaw = ''] = clean.split('.')
    const hasDecimal = clean.includes('.')

    const intPart = intRaw.slice(0, 15)
    const decPart = decRaw.slice(0, 2)

    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    const formatted = hasDecimal ? `${intFormatted}.${decPart}` : intFormatted

    const digitsBeforeCursor = raw.slice(0, cursorPos).replace(/\D/g, '').length

    let newCursor = 0
    let digitsSeen = 0

    while (newCursor < formatted.length && digitsSeen < digitsBeforeCursor) {
      if (/\d/.test(formatted[newCursor])) {
        digitsSeen++
      }
      newCursor++
    }

    if (hasDecimal && raw.slice(0, cursorPos).includes('.')) {
      const oldDecimalIndex = raw.indexOf('.')
      const newDecimalIndex = formatted.indexOf('.')

      if (newDecimalIndex !== -1) {
        const charsAfterDecimal = cursorPos - oldDecimalIndex - 1
        newCursor = Math.min(formatted.length, newDecimalIndex + 1 + charsAfterDecimal)
      }
    }

    nextCursorRef.current = newCursor

    onChange(formatted)

    requestAnimationFrame(() => {
      if (inputRef.current && nextCursorRef.current !== null) {
        inputRef.current.setSelectionRange(nextCursorRef.current, nextCursorRef.current)
        nextCursorRef.current = null
      }
    })
  }

  const handleKeyDown = (e) => {
    const allowed = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab',
      'Enter',
    ]
    if (allowed.includes(e.key)) return
    if (e.ctrlKey || e.metaKey) return
    if (e.key === '.' && !value.includes('.')) return
    if (!/^\d$/.test(e.key)) e.preventDefault()
  }

  const [isFocused, setIsFocused] = useState(false)

  return (
    <div className="w-full">
      <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
        Market Capitalization<span className="text-red-500 ml-0.5">*</span>
      </label>
      <div
        className="flex items-center rounded-lg border transition-all"
        style={{
          backgroundColor: '#ffffff',
          borderColor: isFocused ? '#01C9A4' : '#e2e8f0',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder="Enter Market Capitalization"
          className={`
            flex-1 px-3 py-[10px] text-[13px] bg-transparent outline-none
            placeholder:text-[#a0aec0] disabled:opacity-50 disabled:cursor-not-allowed
          `}
          style={{ color: '#041E66' }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const MarketCapEntryPage = () => {
  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [quarters, setQuarters] = useState([])
  const [companies, setCompanies] = useState([])
  const [sectors, setSectors] = useState([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(true)

  // ── Table data ────────────────────────────────────────────────────────────
  const [records, setRecords] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})
  // Main search bar value — always driven from filters.quarterName
  const mainSearch = filters.quarterName

  // ── Form ──────────────────────────────────────────────────────────────────
  const [formQuarterId, setFormQuarterId] = useState('')
  const [formCompanyId, setFormCompanyId] = useState('')
  const [formCap, setFormCap] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  // ── Delete ────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ── Upload ────────────────────────────────────────────────────────────────
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadQuarterId, setUploadQuarterId] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [parsedRecords, setParsedRecords] = useState([])
  const [parseError, setParseError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const uploadFileInputRef = useRef(null)

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('quarterName')
  const [sortDir, setSortDir] = useState('desc')

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied }

  // ── Dropdown option arrays ────────────────────────────────────────────────

  const quarterOptions = useMemo(
    () => quarters.map((q) => ({ label: q.QuarterName, value: q.PK_QuarterID })),
    [quarters]
  )

  const companyOptions = useMemo(
    () => companies.map((c) => ({ label: c.CompanyName, value: c.PK_CompanyID })),
    [companies]
  )

  const formCompanyOptions = useMemo(() => {
    if (!formQuarterId) return companyOptions

    const takenIds = new Set(
      records
        .filter(
          (r) =>
            r.quarterId === formQuarterId && !(editingId !== null && r.companyId === formCompanyId)
        )
        .map((r) => r.companyId)
    )

    return companyOptions.filter((o) => !takenIds.has(o.value))
  }, [companyOptions, records, formQuarterId, editingId, formCompanyId])

  const sectorOptions = useMemo(
    () => sectors.map((s) => ({ label: s.SectorName, value: s.PK_SectorID })),
    [sectors]
  )

  const filterFields = useMemo(
    () => [
      {
        key: 'quarterId',
        label: 'Quarter',
        type: 'select',
        options: quarterOptions.map((o) => o.label),
      },
      {
        key: 'companyId',
        label: 'Company',
        type: 'select',
        options: companyOptions.map((o) => o.label),
      },
      {
        key: 'sectorId',
        label: 'Sector',
        type: 'select',
        options: sectorOptions.map((o) => o.label),
      },
    ],
    [quarterOptions, companyOptions, sectorOptions]
  )

  // ── resolveIds — label strings → numeric IDs ──────────────────────────────
  const resolveIds = useCallback(
    (filterState) => {
      const resolved = {}

      // Exact-select quarter from filter panel (mirrors companyID in CompaniesPage)
      if (filterState.quarterId) {
        const o = quarterOptions.find((x) => x.label === filterState.quarterId)
        resolved.quarterId = filterState.quarterId
        if (o) resolved.quarterIdValue = o.value
        // When an exact quarter is chosen, do NOT carry free-text quarterName
      }

      // Free-text quarter from main search bar (mirrors companyName in CompaniesPage)
      // Only populate when no exact-select is active
      if (filterState.quarterName && !filterState.quarterId) {
        resolved.quarterName = filterState.quarterName
      }

      if (filterState.companyId) {
        const o = companyOptions.find((x) => x.label === filterState.companyId)
        resolved.companyId = filterState.companyId
        if (o) resolved.companyIdValue = o.value
      }
      if (filterState.sectorId) {
        const o = sectorOptions.find((x) => x.label === filterState.sectorId)
        resolved.sectorId = filterState.sectorId
        if (o) resolved.sectorIdValue = o.value
      }
      return resolved
    },
    [quarterOptions, companyOptions, sectorOptions]
  )

  // ── Fetch records ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const res = await GetMarketCapitalizationApi(
      {
        FK_QuarterID: appliedFilters.quarterIdValue || 0,
        // Free-text quarter name — only sent when no exact ID is resolved
        QuarterName: appliedFilters.quarterName || '',
        FK_CompanyID: appliedFilters.companyIdValue || 0,
        FK_SectorID: appliedFilters.sectorIdValue || 0,
        PageSize: PAGE_SIZE,
        PageNumber: pageNumber,
      },
      { skipLoader: true }
    )

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    if (!res.success) {
      showError(res.message || 'Failed to load records.')
      if (!append) {
        setRecords([])
        setTotalCount(0)
      }
      return
    }

    const rr = res.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.marketCapitalization)
        ? rr.marketCapitalization.map(mapRecord)
        : []
      setRecords((prev) => (append ? [...prev, ...rows] : rows))
      setTotalCount(rr.totalCount ?? 0)
      return
    }
    if (code === GET_EMPTY) {
      if (!append) {
        setRecords([])
        setTotalCount(0)
      }
      return
    }
    showError(GET_MARKET_CAPITALIZATION_CODES[code] || 'Something went wrong.')
    if (!append) {
      setRecords([])
      setTotalCount(0)
    }
  }, [])

  // ── Main search bar handler ───────────────────────────────────────────────
  // Mirrors setMainSearch in CompaniesPage exactly:
  //   • Only updates filter state — never calls fetchData directly.
  //   • If an exact-select chip (quarterId) is active, remove it from applied
  //     so the chip disappears, then re-fetch without it.
  const setMainSearch = useCallback(
    (val) => {
      setFilters((p) => ({
        ...p,
        quarterName: val,
        // Clear the exact-select field when user starts free-typing
        quarterId: val === '' ? '' : p.quarterId,
      }))

      // Only evict the exact-select chip when the user is actively typing
      // (val is non-empty). When val is '' it means handleSearch/handleReset
      // programmatically cleared the field via setFilters(EMPTY_FILTERS) —
      // in that case the chip should stay (it was already committed to `applied`
      // and the correct fetch was already fired by handleSearch/handleReset).
      if (val !== '' && applied.quarterId) {
        const next = { ...applied }
        delete next.quarterId
        delete next.quarterIdValue
        delete next.quarterName
        setApplied(next)
        setPage(0)
        fetchData(next, 0, false)
      }
    },
    [applied, fetchData]
  )

  // ── Load dropdowns ────────────────────────────────────────────────────────

  const fetchDropdowns = useCallback(async () => {
    setLoadingDropdowns(true)
    const [qRes, cRes, sRes] = await Promise.all([
      GetAllActiveQuartersApi({}, { skipLoader: true }),
      GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
      GetAllActiveSectorsApi({}, { skipLoader: true }),
    ])
    if (qRes.success) {
      const list = qRes.data?.responseResult?.quarters || []
      setQuarters(list.map((q) => ({ QuarterName: q.quarterName, PK_QuarterID: q.pK_QuarterID })))
    }
    if (cRes.success) {
      const list = cRes.data?.responseResult?.companies || []
      setCompanies(list.map((c) => ({ CompanyName: c.companyName, PK_CompanyID: c.pK_CompanyID })))
    }
    if (sRes.success) {
      const list = sRes.data?.responseResult?.sectors || []
      setSectors(list.map((s) => ({ SectorName: s.sectorName, PK_SectorID: s.pK_SectorID })))
    }
    setLoadingDropdowns(false)
  }, [])

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchDropdowns()
    fetchData({}, 0, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When quarter changes in the entry form (not in filters), clear company
  useEffect(() => {
    if (editingId === null) {
      setFormCompanyId('')
    }
  }, [formQuarterId]) // eslint-disable-line react-hooks/exhaustive-deps

  // NOTE: The useEffect that mirrored filters.quarterId → filters.quarterName
  // has been intentionally removed. It was the source of the double-fetch bug:
  // changing filters.quarterName triggered setMainSearch → fetchData, and then
  // handleSearch also called fetchData. Now the filter panel's quarterId value
  // stays as-is and is only committed to `applied` when the user clicks Search.

  // ── Infinite scroll ───────────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    setPage(p + 1)
    fetchData(ap, p + 1, true)
  }, [fetchData])

  // ── MQTT ──────────────────────────────────────────────────────────────────

  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.MARKET_CAP_SAVED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d) return
        const { applied: ap } = stateRef.current
        if (!ap.quarterIdValue || d.fkQuarterID === ap.quarterIdValue) {
          setPage(0)
          fetchData(ap, 0, false)
        }
      },
      [MQTT_TYPE.MARKET_CAP_DELETED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d) return
        setRecords((prev) => prev.filter((r) => r.id !== d.pkMarketCapitalizationID))
        setTotalCount((c) => Math.max(0, c - 1))
      },
      [MQTT_TYPE.MARKET_CAP_UPLOADED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d) return
        const { applied: ap } = stateRef.current
        if (!ap.quarterIdValue || d.fkQuarterID === ap.quarterIdValue) {
          setPage(0)
          fetchData(ap, 0, false)
        }
      },
    }),
    [fetchData]
  )

  useSubscribe(mqttTopic, mqttHandler)

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: records.length < totalCount,
    loading: loadingMore || loadingInitial,
    onLoadMore: handleLoadMore,
  })

  // ── Search / filter handlers ──────────────────────────────────────────────

  const handleSearch = useCallback(() => {
    // If exact quarter selected from panel, strip free-text quarterName
    // (same as CompaniesPage: if companyID selected, companyName is not sent)
    const stagingFilters = filters.quarterId ? { ...filters, quarterName: '' } : filters

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
      // Clean up companion keys — mirrors CompaniesPage removeChip
      if (key === 'quarterId') {
        delete next.quarterIdValue
        delete next.quarterName // exact-select also owns the quarterName slot
      }
      if (key === 'quarterName') {
        /* just the key itself — already deleted above */
      }
      if (key === 'companyId') delete next.companyIdValue
      if (key === 'sectorId') delete next.sectorIdValue
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  const activeChips = Object.entries(applied).filter(([k]) => Object.keys(CHIP_LABELS).includes(k))

  // ── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormQuarterId('')
    setFormCompanyId('')
    setFormCap('')
    setEditingId(null)
  }, [])

  const canSave =
    !!formQuarterId && !!formCompanyId && formCap.trim() !== '' && parseCap(formCap) > 0

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!canSave) return
    setSaving(true)

    const res = await SaveMarketCapitalizationApi(
      {
        PK_MarketCapitalizationID: editingId || 0,
        FK_CompanyID: formCompanyId,
        FK_QuarterID: formQuarterId,
        Value: parseCap(formCap),
      },
      { skipLoader: true }
    )

    setSaving(false)

    const code = res.data?.responseResult?.responseMessage
    if (code === SAVE_SUCCESS) {
      toast.success(editingId ? 'Record updated successfully.' : 'Record added successfully.')
      resetForm()
      const { applied: ap } = stateRef.current
      setPage(0)
      fetchData(ap, 0, false)
    } else if (code === SAVE_DUP) {
      showError('This company already has a record for the selected quarter.')
    } else {
      showError(
        SAVE_MARKET_CAPITALIZATION_CODES[code] || res.message || 'Failed to save. Please try again.'
      )
    }
  }, [canSave, editingId, formCompanyId, formQuarterId, formCap, resetForm, fetchData])

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = useCallback((row) => {
    setEditingId(row.id)
    setFormQuarterId(row.quarterId)
    setFormCompanyId(row.companyId)
    setFormCap(row.cap)
  }, [])

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)

    const res = await DeleteMarketCapitalizationApi(
      { PK_MarketCapitalizationID: deleteTarget.id },
      { skipLoader: true }
    )

    setDeleting(false)
    const targetId = deleteTarget.id
    setDeleteTarget(null)

    const code = res.data?.responseResult?.responseMessage
    if (code === DEL_SUCCESS) {
      toast.success('Record deleted successfully.')
      setRecords((prev) => prev.filter((r) => r.id !== targetId))
      setTotalCount((prev) => Math.max(0, prev - 1))
    } else {
      showError(
        DELETE_MARKET_CAPITALIZATION_CODES[code] ||
          res.message ||
          'Failed to delete. Please try again.'
      )
    }
  }, [deleteTarget])

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleUploadClick = () => {
    setUploadedFile(null)
    setParsedRecords([])
    setParseError('')
    setUploadQuarterId('')
    setParseResult(null)
    setUploadModal(true)
  }

  const parseExcelFile = useCallback(async (file) => {
    setParseError('')
    setParsedRecords([])
    setParseResult(null)

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseError('Invalid file format. Please upload an Excel file (.xlsx or .xls).')
      setUploadedFile(null)
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const records = raw
        .map((r) => ({
          Ticker: String(r['SYMBOL'] ?? r['Symbol'] ?? r['symbol'] ?? '').trim(),
          Value:
            parseFloat(
              String(
                r['Market Capitalization'] ??
                  r['MARKET CAPITALIZATION'] ??
                  r['market capitalization'] ??
                  0
              ).replace(/,/g, '')
            ) || 0,
        }))
        .filter((r) => r.Ticker && r.Value > 0)

      if (records.length === 0) {
        setParseError(
          'No valid records found. Make sure the file has SYMBOL and Market Capitalization columns.'
        )
        setUploadedFile(null)
        return
      }

      setUploadedFile(file)
      setParsedRecords(records)
    } catch {
      setParseError('Failed to read the file. Please check it is a valid Excel file.')
      setUploadedFile(null)
    }
  }, [])

  const handleModalFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (file) parseExcelFile(file)
    },
    [parseExcelFile]
  )

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) parseExcelFile(file)
    },
    [parseExcelFile]
  )

  const closeUploadModal = () => {
    if (analyzing || bulkSaving) return
    setUploadModal(false)
    setUploadedFile(null)
    setParsedRecords([])
    setParseError('')
    setUploadQuarterId('')
    setParseResult(null)
  }

  const handleAnalyze = useCallback(async () => {
    if (!uploadQuarterId || parsedRecords.length === 0) return
    setAnalyzing(true)

    const res = await ParseAndUploadMarketCapitalizationApi(
      { FK_QuarterID: uploadQuarterId, Records: parsedRecords },
      { skipLoader: true }
    )

    setAnalyzing(false)

    const rr = res.data?.responseResult
    const code = rr?.responseMessage

    if (code === PARSE_SUCCESS) {
      setParseResult({
        newMarketCapitalization: Array.isArray(rr.newMarketCapitalization)
          ? rr.newMarketCapitalization
          : [],
        marketCapAlreadyExists: Array.isArray(rr.marketCapAlreadyExists)
          ? rr.marketCapAlreadyExists
          : [],
        companiesNotFound: Array.isArray(rr.companiesNotFound) ? rr.companiesNotFound : [],
      })
    } else {
      showError(
        PARSE_AND_UPLOAD_MARKET_CAPITALIZATION_CODES[code] ||
          res.message ||
          'Analysis failed. Please try again.'
      )
    }
  }, [uploadQuarterId, parsedRecords])

  const handleBulkSave = useCallback(async () => {
    if (!parseResult?.newMarketCapitalization?.length) return
    setBulkSaving(true)

    const records = parseResult.newMarketCapitalization.map((r) => ({
      FK_CompanyID: r.fK_CompanyID,
      Value: r.value,
    }))

    const res = await BulkSaveMarketCapitalizationApi(
      { FK_QuarterID: uploadQuarterId, Records: records },
      { skipLoader: true }
    )

    setBulkSaving(false)

    const code = res.data?.responseResult?.responseMessage
    if (code === BULK_SUCCESS) {
      toast.success(`${records.length} records saved successfully.`)
      closeUploadModal()
      const { applied: ap } = stateRef.current
      setPage(0)
      fetchData(ap, 0, false)
    } else {
      showError(
        BULK_SAVE_MARKET_CAPITALIZATION_CODES[code] ||
          res.message ||
          'Save failed. Please try again.'
      )
    }
  }, [parseResult, uploadQuarterId, fetchData])

  // ── Sort ──────────────────────────────────────────────────────────────────

  const handleSort = useCallback((col) => {
    setSortCol((prev) => {
      if (prev !== col) {
        setSortDir('asc')
        return col
      }
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return prev
    })
  }, [])

  const displayedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        const va = (a[sortCol] ?? '').toString().toLowerCase()
        const vb = (b[sortCol] ?? '').toString().toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [records, sortCol, sortDir]
  )

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'quarterName',
      title: 'Quarter Name',
      sortable: true,
      render: (row) => <span className="font-semibold">{row.quarterName}</span>,
    },
    {
      key: 'ticker',
      title: 'Ticker',
      sortable: true,
      align: 'center',
      render: (row) => <span>{row.ticker}</span>,
    },
    {
      key: 'companyName',
      title: 'Company Name',
      sortable: true,
      align: 'center',
      render: (row) => <span>{row.companyName}</span>,
    },
    {
      key: 'sectorName',
      title: 'Sector',
      sortable: true,
      align: 'center',
      render: (row) => <span>{row.sectorName}</span>,
    },
    {
      key: 'cap',
      title: 'Market Capitalization',
      sortable: true,
      align: 'center',
      render: (row) => <span>{row.cap}</span>,
    },
    {
      key: '_edit',
      title: 'Edit',
      sortable: false,
      render: (row) => <BtnIconEdit size={14} onClick={() => handleEdit(row)} />,
    },
    {
      key: '_delete',
      title: 'Delete',
      sortable: false,
      render: (row) => <BtnIconDelete onClick={() => setDeleteTarget(row)} />,
    },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Market Capitalization</h1>
          <SearchFilter
            placeholder="Search by quarter name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
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

      {/* ── Active filter chips + entry form ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2">
        {/* Chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {activeChips.map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k]}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {activeChips.length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Entry form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee]">
          <div className="p-5">
            <div className="flex flex-wrap items-end gap-4">
              {/* Quarter */}
              <div className="min-w-[220px] flex-1">
                <SearchableSelect
                  label="Quarter Name"
                  required
                  placeholder={loadingDropdowns ? 'Loading…' : 'Select Quarter'}
                  options={quarterOptions}
                  value={formQuarterId}
                  onChange={setFormQuarterId}
                  disabled={loadingDropdowns}
                />
              </div>

              {/* Company — filtered to exclude already-used companies for the selected quarter */}
              <div className="min-w-[420px] flex-[2]">
                <SearchableSelect
                  label="Company"
                  required
                  placeholder={!formQuarterId ? 'Select a quarter first' : 'Select Company'}
                  options={formCompanyOptions}
                  value={formCompanyId}
                  onChange={setFormCompanyId}
                  disabled={loadingDropdowns || !formQuarterId}
                />
              </div>

              {/* Market Capitalization — custom input with cursor-safe comma formatting */}
              <div className="min-w-[150px] flex-[1]">
                <MarketCapInput value={formCap} onChange={setFormCap} disabled={saving} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <BtnPrimary
                  disabled={!canSave || saving}
                  loading={saving}
                  onClick={handleSave}
                  className="shrink-0"
                >
                  {editingId !== null ? 'Update' : 'Save'}
                </BtnPrimary>
                {editingId !== null && (
                  <BtnModalClose
                    onClick={resetForm}
                    variant="light"
                    className="w-10 h-10 pt-4 shrink-0"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload button ── */}
      <div className="flex justify-end mb-2">
        <BtnTeal onClick={handleUploadClick} className="flex items-center gap-2">
          <Upload size={15} /> Upload Market Capitalization
        </BtnTeal>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <CommonTable
          columns={columns}
          data={loadingInitial ? [] : displayedRecords}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No records found'}
          headerBg="#E0E6F6"
          headerTextColor="#041E66"
          rowBg="#ffffff"
          rowHoverBg="#EFF3FF"
          scrollable
          scrollRef={scrollRef}
          maxHeight={TABLE_MAX_HEIGHT}
          footerSlot={
            <>
              {loadingInitial && (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
                </div>
              )}

              <div ref={sentinelRef} className="h-px" />

              {loadingMore && (
                <div className="flex justify-center py-3">
                  <div className="w-5 h-5 border-2 border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
                </div>
              )}

              {!loadingInitial &&
                !loadingMore &&
                records.length > 0 &&
                records.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-2">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* ── Delete confirmation ── */}
      <ConfirmModal
        open={!!deleteTarget}
        loading={deleting}
        message={`Are you sure you want to delete the Market Capitalization record for ${deleteTarget?.companyName ?? ''} (${deleteTarget?.quarterName ?? ''})?`}
        onYes={handleDelete}
        onNo={() => setDeleteTarget(null)}
      />

      {/* ── Upload Modal ── */}
      {uploadModal && (
        <div
          className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
          onClick={closeUploadModal}
        >
          <div
            className={`bg-white rounded-2xl shadow-xl w-full transition-all ${parseResult ? 'max-w-5xl' : 'max-w-lg'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-[18px] font-bold text-[#0B39B5]">
                  Upload Market Capitalization
                </h2>
                {parseResult && (
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {uploadedFile?.name} · Quarter selected
                  </p>
                )}
              </div>
              <BtnModalClose onClick={closeUploadModal} variant="light" />
            </div>

            {/* STEP 1: File + Quarter */}
            {!parseResult && (
              <>
                <div className="px-6 py-5 space-y-5">
                  <input
                    ref={uploadFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleModalFileChange}
                  />

                  {/* Drop zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !analyzing && uploadFileInputRef.current?.click()}
                    className={`
                      relative flex flex-col items-center justify-center gap-2
                      border-2 border-dashed rounded-xl px-6 py-8 cursor-pointer
                      transition-all duration-150 select-none
                      ${
                        isDragging
                          ? 'border-[#01C9A4] bg-[#01C9A4]/5'
                          : uploadedFile
                            ? 'border-[#01C9A4] bg-[#01C9A4]/5'
                            : parseError
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 bg-slate-50 hover:border-[#0B39B5] hover:bg-[#EFF3FF]'
                      }
                      ${analyzing ? 'pointer-events-none opacity-60' : ''}
                    `}
                  >
                    {uploadedFile ? (
                      <>
                        <FileSpreadsheet size={36} className="text-[#01C9A4]" />
                        <p className="text-[13px] font-semibold text-[#041E66] text-center">
                          {uploadedFile.name}
                        </p>
                        <p className="text-[12px] text-[#01C9A4] font-medium">
                          {parsedRecords.length} records ready to analyze
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setUploadedFile(null)
                            setParsedRecords([])
                            setParseError('')
                          }}
                          className="absolute top-3 right-3 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload
                          size={32}
                          className={parseError ? 'text-red-400' : 'text-slate-400'}
                        />
                        <p
                          className={`text-[13px] font-medium text-center ${parseError ? 'text-red-500' : 'text-slate-500'}`}
                        >
                          {parseError || 'Drag & drop your Excel file here, or click to browse'}
                        </p>
                        <p className="text-[11px] text-slate-400">Supported: .xlsx, .xls</p>
                        <p className="text-[11px] text-slate-400">
                          Required columns:{' '}
                          <span className="font-semibold text-[#041E66]">SYMBOL</span>
                          {' · '}
                          <span className="font-semibold text-[#041E66]">
                            Market Capitalization
                          </span>
                        </p>
                      </>
                    )}
                  </div>

                  <SearchableSelect
                    label="Quarter"
                    required
                    placeholder="Select Quarter"
                    options={quarterOptions}
                    value={uploadQuarterId}
                    onChange={setUploadQuarterId}
                    disabled={analyzing}
                  />
                </div>

                <div className="flex justify-end gap-3 px-6 pb-6">
                  <BtnGold disabled={analyzing} onClick={closeUploadModal}>
                    Cancel
                  </BtnGold>
                  <BtnPrimary
                    disabled={!uploadQuarterId || parsedRecords.length === 0 || analyzing}
                    loading={analyzing}
                    onClick={handleAnalyze}
                  >
                    Analyze {parsedRecords.length > 0 ? `(${parsedRecords.length})` : ''}
                  </BtnPrimary>
                </div>
              </>
            )}

            {/* STEP 2: Results */}
            {parseResult && (
              <>
                <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                  <ResultTable
                    title="New Records"
                    subtitle="These will be created when you click Create"
                    color="green"
                    rows={parseResult.newMarketCapitalization}
                    showCompany
                  />
                  <ResultTable
                    title="Already Exists"
                    subtitle="These companies already have a record for this quarter"
                    color="amber"
                    rows={parseResult.marketCapAlreadyExists}
                    showCompany
                  />
                  <ResultTable
                    title="Companies Not Found"
                    subtitle="These tickers do not match any company in the system"
                    color="red"
                    rows={parseResult.companiesNotFound}
                    showCompany={false}
                  />
                </div>

                <div className="flex justify-end gap-3 px-6 pb-6 border-t border-slate-100 pt-4">
                  <BtnGold disabled={bulkSaving} onClick={closeUploadModal}>
                    Cancel
                  </BtnGold>
                  <BtnPrimary
                    disabled={!parseResult.newMarketCapitalization.length || bulkSaving}
                    loading={bulkSaving}
                    onClick={handleBulkSave}
                  >
                    Create ({parseResult.newMarketCapitalization.length})
                  </BtnPrimary>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultTable
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP = {
  green: {
    header: 'bg-[#d1fae5] text-[#065f46]',
    badge: 'bg-[#d1fae5] text-[#065f46]',
    border: 'border-[#6ee7b7]',
  },
  amber: {
    header: 'bg-[#fef3c7] text-[#92400e]',
    badge: 'bg-[#fef3c7] text-[#92400e]',
    border: 'border-[#fcd34d]',
  },
  red: {
    header: 'bg-[#fee2e2] text-[#991b1b]',
    badge: 'bg-[#fee2e2] text-[#991b1b]',
    border: 'border-[#fca5a5]',
  },
}

const ResultTable = ({ title, subtitle, color, rows, showCompany }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.green
  return (
    <div className={`rounded-xl border ${c.border} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-2.5 ${c.header}`}>
        <div>
          <span className="text-[13px] font-bold">{title}</span>
          {subtitle && <span className="text-[11px] ml-2 opacity-70">{subtitle}</span>}
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
          {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12px] text-slate-400 italic px-4 py-3">No records</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 font-semibold text-[#041E66]">Ticker</th>
                {showCompany && (
                  <th className="text-left px-4 py-2 font-semibold text-[#041E66]">Company</th>
                )}
                <th className="text-right px-4 py-2 font-semibold text-[#041E66]">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                >
                  <td className="px-4 py-2 font-mono font-bold text-[#041E66]">{r.ticker}</td>
                  {showCompany && (
                    <td className="px-4 py-2 text-[#0B39B5]">{r.companyName || '—'}</td>
                  )}
                  <td className="px-4 py-2 text-right tabular-nums text-[#041E66]">
                    {formatCap(r.value ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MarketCapEntryPage
