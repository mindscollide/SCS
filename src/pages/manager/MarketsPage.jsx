/**
 * src/pages/manager/MarketsPage.jsx
 * ===================================
 * Manager manages the list of stock markets (e.g. PSX, TADAWUL).
 *
 * Fields: Country | Market Full Name | Market Short Name | Status (on edit)
 *
 * Add   → form on top, Save button creates new record
 * Edit  → pre-fills form, Update button → ConfirmModal → saves
 *
 * TODO: GET/POST/PUT /api/manager/markets
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import {
  getMarketApi,
  GET_MARKET_CODES,
  saveMarketApi,
  SAVE_MARKET_CODES,
} from '../../services/manager.service.js'
import useLazyLoad from '../../hooks/useLazyLoad.js'
import {
  ConfirmModal,
  BtnPrimary,
  BtnSlate,
  BtnIconEdit,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Input from '../../components/common/Input/Input'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import { formatChipValue } from '../../utils/helpers'
import { getCountriesApi } from '../../services/auth.service.js'

// topbar(44) + main-pad(24) + header-band(54) + card-pad(40) + chips(48) + form-edit(196) + card-bot+mb-2(28) + main-pad-bot(24) ≈ 438px
const PAGE_SIZE = 10
const TABLE_MAX_HEIGHT = 'calc(100vh - 360px)'
const ALPHA_NUM_SPECIAL = /^(?! )[A-Za-z0-9\s&/()'-]*$/

const GET_SUCCESS = 'Manager_ManagerServiceManager_GetMarkets_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetMarkets_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveMarket_05'
// Replace the two (buggy) duplicate SAVE_DUP lines with:
const SAVE_DUP_NAME = 'Manager_ManagerServiceManager_SaveMarket_06'
const SAVE_DUP_SHORT = 'Manager_ManagerServiceManager_SaveMarket_07'
const SAVE_DUP_SHORT_AND_NAME = 'Manager_ManagerServiceManager_SaveMarket_08'

const EMPTY_FILTERS = { fullName: '', shortName: '', countryId: 0 }

const CHIP_LABELS = { countryId: 'Country', fullName: 'Full Name', shortName: 'Short Name' }

const MarketsPage = () => {
  const [countries, setCountries] = useState([])
  const [markets, setMarkets] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingSave, setLoadingSave] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loadedPages, setLoadedPages] = useState(0)

  const hasFetched = useRef(false)
  const stateRef = useRef({})

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ country: '', fullName: '', shortName: '' })
  const [editing, setEditing] = useState(null)
  const [active, setActive] = useState(true)

  // ── Confirm modal state ───────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(null)

  // ── Search / filter state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.fullName
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, fullName: val })), [])

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  // Add alongside other form state
  const [formErr, setFormErr] = useState({ fullName: '', shortName: '' })

  const FILTER_FIELDS = useMemo(
    () => [
      { key: 'fullName', label: 'Market Full Name', type: 'input', maxLength: 100 },
      { key: 'shortName', label: 'Market Short Name', type: 'input', maxLength: 20 },
      {
        key: 'countryId',
        label: 'Country',
        type: 'select',
        options: countries,
        optionLabel: 'name',
        optionValue: 'id',
      },
    ],
    [countries]
  )

  // ── API response mapper ───────────────────────────────────────────────────
  const mapMarket = (m) => ({
    id: m.pK_MarketID,
    countryId: m.fK_CountryID,
    country: m.countryName || '',
    fullName: m.marketName || '',
    shortName: m.shortCode || '',
    statusId: m.fK_MarketStatusID,
    status: m.status || 'Active',
  })

  stateRef.current = { applied, markets }

  // ── MQTT — upsert market row ──────────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.MARKET_SAVED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d?.pkMarketID) return
        const row = {
          id: d.pkMarketID,
          countryId: d.fkCountryID,
          country: d.countryName || '',
          fullName: d.marketName || '',
          shortName: d.shortCode || '',
          statusId: d.fkMarketStatusID,
          status: d.status || 'Active',
        }
        setMarkets((prev) => {
          const idx = prev.findIndex((m) => m.id === row.id)
          if (idx !== -1) {
            const next = [...prev]
            next[idx] = { ...prev[idx], ...row }
            return next
          }
          setTotalCount((c) => c + 1)
          return [row, ...prev]
        })
      },
    }),
    []
  )

  useSubscribe(mqttTopic, mqttHandler)

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const isValid = form.country && form.fullName && form.shortName

  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const params = {
      MarketName: appliedFilters.fullName || '',
      ShortCode: appliedFilters.shortName || '',
      FK_CountryID: appliedFilters.countryId || 0, // ← was CountryName
      FK_MarketStatusID: 0,
      PageSize: 10,
      PageNumber: pageNumber,
    }

    const result = await getMarketApi(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load markets.')
      if (!append) {
        setMarkets([])
        setTotalCount(0)
        setLoadedPages(1)
      }
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.markets) ? rr.markets.map(mapMarket) : []
      setMarkets((prev) => (append ? [...prev, ...rows] : rows))
      setTotalCount(rr.totalCount)
      setLoadedPages(append ? (p) => p + 1 : 1)
      return
    }

    if (code === GET_EMPTY) {
      if (append) {
        setLoadedPages((p) => p + 1)
        setTotalCount(stateRef.current.markets.length)
      } else {
        setMarkets([])
        setTotalCount(0)
        setLoadedPages(1)
      }
      return
    }

    toast.error(GET_MARKET_CODES[code] || 'Something went wrong, please try again.')
    if (!append) {
      setMarkets([])
      setTotalCount(0)
      setLoadedPages(1)
    }
  }, [])

  const fetchCountries = useCallback(async () => {
    const result = await getCountriesApi({ skipLoader: true })
    if (!result.success) return
    const list = result.data?.responseResult?.countries
    if (Array.isArray(list)) {
      setCountries(list.map((c) => ({ id: c.pK_CountryID, name: c.countryName })))
    }
  }, [])

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (k === 'countryId') {
        const numVal = Number(v)
        if (numVal) next[k] = numVal
      } else if (typeof v === 'string' && v.trim()) {
        next[k] = v.trim()
      }
    })
    setApplied(next)
    setLoadedPages(0)
    fetchData(next, 0, false)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])
  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setLoadedPages(0)
    fetchData({}, 0, false)
  }, [fetchData])
  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      const next = { ...stateRef.current.applied }
      delete next[key]
      setApplied(next)
      setLoadedPages(0)
      fetchData(next, 0, false)
    },
    [fetchData]
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
      [...markets].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [markets, sortCol, sortDir]
  )

  // ── Add / Edit handlers ───────────────────────────────────────────────────
  const handleSave = () => {
    if (!isValid) return
    if (editing) {
      setConfirm(true)
    } else {
      callSaveApi(false)
    }
  }

  const callSaveApi = useCallback(
    async (isUpdate) => {
      setLoadingSave(true)

      const params = {
        PK_MarketID: isUpdate ? editing : 0,
        FK_CountryID: form.countryId || 0, // Country dropdown se aayega
        MarketName: form.fullName.trim(),
        ShortCode: form.shortName.trim(),
        FK_MarketStatusID: isUpdate ? (active ? 1 : 2) : 1,
      }

      const result = await saveMarketApi(params, { skipLoader: true })
      setLoadingSave(false)

      if (!result.success) {
        toast.error(result.message || 'Failed to save market.')
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (code === SAVE_SUCCESS) {
        toast.success(isUpdate ? 'Updated Successfully' : 'Record Added Successfully')
        await fetchData(applied)
        setEditing(null)
        setForm({ country: '', countryId: 0, fullName: '', shortName: '' })
        setFormErr({ fullName: '', shortName: '' }) // ← add this
        return
      }

      if (code === SAVE_DUP_NAME) {
        setFormErr((p) => ({ ...p, fullName: SAVE_MARKET_CODES[code] }))
        return
      }

      if (code === SAVE_DUP_SHORT) {
        setFormErr((p) => ({ ...p, shortName: SAVE_MARKET_CODES[code] }))
        return
      }

      if (code === SAVE_DUP_SHORT_AND_NAME) {
        setFormErr((p) => ({
          ...p,
          shortName: 'Duplicate — Short Code already exists',
          fullName: 'Duplicate — Market Name already exists',
        }))
        return
      }

      toast.error(SAVE_MARKET_CODES[code] || 'Something went wrong, please try again.')
    },
    [editing, form, active, applied, fetchData]
  )

  const handleEdit = (m) => {
    setEditing(m.id)
    setForm({
      country: m.country,
      countryId: m.countryId,
      fullName: m.fullName,
      shortName: m.shortName,
    })
    setActive(m.statusId === 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm({ country: '', countryId: 0, fullName: '', shortName: '' })
    setFormErr({ fullName: '', shortName: '' })
  }

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({})
    fetchCountries()
  }, [])

  // ── Lazy load (page-index pagination — MEMORY §6) ─────────────────────────
  const { sentinelRef, scrollRef, loadingMore, setLoadingMore } = useLazyLoad({
    offset: loadedPages,
    total: Math.ceil(totalCount / PAGE_SIZE),
    initialLoading: loadingInitial,
    onLoadMore: (nextPage) => {
      const { applied: ap } = stateRef.current
      fetchData(ap, nextPage, true)
    },
  })

  // ── Column definitions ────────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'country',
        title: 'Country Name',
        sortable: true,
        render: (r) => <span className="font-semibold">{r.country}</span>,
      },
      {
        key: 'fullName',
        title: 'Market Full Name',
        sortable: true,
        align: 'center',
      },
      {
        key: 'shortName',
        title: 'Market Short Name',
        sortable: true,
        align: 'center',
      },

      {
        key: 'edit',
        title: 'Edit',
        render: (r) => <BtnIconEdit onClick={() => handleEdit(r)} />,
      },
      {
        key: 'status',
        title: 'Status',
        align: 'center',
        render: (r) => (
          <span
            className={`font-semibold ${r.status === 'Active' ? 'text-[#4dc792]' : 'text-[#ec4357]'}`}
          >
            {r.status.toLowerCase() === 'active' ? 'Active' : 'In-Active'}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Markets</h1>
          <SearchFilter
            placeholder="Search by market name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
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
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k] || k}:{' '}
                {k === 'countryId'
                  ? countries.find((c) => c.id === (typeof v === 'object' ? v?.id : v))?.name || v
                  : formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <SearchableSelect
                label="Country"
                required
                placeholder="-- Select Country --"
                value={form.country}
                onChange={(v) => {
                  const found = countries.find((c) => c.name === v)
                  setForm((p) => ({ ...p, country: v, countryId: found?.id || 0 }))
                }}
                options={countries.map((c) => c.name)}
              />
              <Input
                label="Market Full Name"
                required
                placeholder="e.g. Pakistan Stock Exchange"
                value={form.fullName}
                onChange={(v) => {
                  set('fullName', v)
                  if (formErr.fullName && v.trim()) setFormErr((p) => ({ ...p, fullName: '' }))
                }}
                maxLength={50}
                showCount
                regex={ALPHA_NUM_SPECIAL}
                error={!!formErr.fullName}
                errorMessage={formErr.fullName}
              />
              <Input
                label="Market Short Name"
                required
                placeholder="PSX"
                value={form.shortName}
                onChange={(v) => {
                  set('shortName', v.toUpperCase())
                  if (formErr.shortName && v.trim()) setFormErr((p) => ({ ...p, shortName: '' }))
                }}
                maxLength={20}
                showCount
                regex={ALPHA_NUM_SPECIAL}
                error={!!formErr.shortName}
                errorMessage={formErr.shortName}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              {editing ? (
                <Checkbox
                  label="Active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                {editing && <BtnSlate onClick={cancelEdit}>Cancel</BtnSlate>}
                <BtnPrimary disabled={!isValid} onClick={handleSave}>
                  {editing ? 'Update' : 'Save'}
                </BtnPrimary>
              </div>
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
                loadedPages >= Math.ceil(totalCount / PAGE_SIZE) && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

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

export default MarketsPage
