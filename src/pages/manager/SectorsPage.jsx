/**
 * src/pages/manager/SectorsPage.jsx
 * ===================================
 * Manager manages the list of company sectors (e.g. Banking, Cement).
 *
 * SRS Behaviour
 * ─────────────
 * - Sector Name: alphabets only, max 50 chars, required
 * - Save disabled until name entered
 * - New records get Active status by default
 * - Edit: pre-fills name, shows Status checkbox (checked = Active)
 * - Update → ConfirmModal → toast "Updated Successfully"
 * - Default sort: Sector Name alphabetical (asc)
 * - Sortable: Sector Name only
 * - Search: Sector Name only, placeholder "Sector Name"
 * - Unique key: Sector Name
 *
 * TODO: GET/POST/PUT /api/manager/sectors
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import {
  getSectorsApi,
  GET_SECTORS_CODES,
  SAVE_SECTORS_CODES,
  saveSectorsApi,
} from '../../services/manager.service.js'
import useInfiniteScroll from '../../hooks/useInfiniteScroll.js'
import {
  ConfirmModal,
  BtnPrimary,
  BtnSlate,
  BtnIconEdit,
  BtnChipRemove,
} from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Input from '../../components/common/Input/Input'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import { formatChipValue } from '../../utils/helpers'

// Only alphabets and spaces allowed
const ALPHA_NUM_SPECIAL = /^(?! )[A-Za-z0-9\s&/()'-]*$/
const TABLE_MAX_HEIGHT = 'calc(90vh - 200px)'
// ─── Response-code constants ──────────────────────────────────────────────────
const GET_SUCCESS = 'Manager_ManagerServiceManager_GetSectors_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetSectors_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveSector_04'
const SAVE_DUP = 'Manager_ManagerServiceManager_SaveSector_05'

const EMPTY_FILTERS = { name: '' }
const FILTER_FIELDS = [
  { key: 'name', label: 'Sector Name', type: 'input', regex: ALPHA_NUM_SPECIAL, maxLength: 50 },
]

const SectorsPage = () => {
  const [sectors, setSectors] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [editing, setEditing] = useState(null)
  const [active, setActive] = useState(true)

  // ── Confirm modal ─────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)

  // ── Search / filter state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => {
    if (ALPHA_NUM_SPECIAL.test(val) || val === '') setFilters((p) => ({ ...p, name: val }))
  }, [])

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // ── MQTT — upsert sector row ──────────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.SECTOR_SAVED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d?.pkSectorID) return
        const row = {
          id: d.pkSectorID,
          name: d.sectorName || '',
          statusId: d.fkSectorStatusID,
          status: d.status || 'Active',
        }
        setSectors((prev) => {
          const idx = prev.findIndex((s) => s.id === row.id)
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

  const mapSector = (s) => ({
    id: s.pK_SectorID,
    name: s.sectorName || '',
    statusId: s.fK_SectorStatusID,
    status: s.status || 'Active',
  })

  // ── Data helpers ──────────────────────────────────────────────────────────
  stateRef.current = { page, applied }

  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const params = {
      SectorName: appliedFilters.name || '',
      PageSize: 10,
      PageNumber: pageNumber,
    }

    const result = await getSectorsApi(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load sectors.')
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.sectors) ? rr.sectors.map(mapSector) : []
      setSectors((prev) => (append ? [...prev, ...rows] : rows))
      setTotalCount(rr.totalCount)
      return
    }

    if (code === GET_EMPTY) {
      if (!append) {
        setSectors([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_SECTORS_CODES[code] || 'Something went wrong, please try again.')
  }, [])

  // const fetchData = useCallback((f) => {
  //   setSectors(
  //     sourceData.current.filter((r) =>
  //       Object.entries(f).every(([k, v]) => !v || r[k]?.toLowerCase().includes(v.toLowerCase()))
  //     )
  //   )
  // }, [])

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setPage(0) // ← add this
    fetchData(next, 0, false)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0) // ← add this
    fetchData({}, 0, false) // ← was: fetchData({})
  }, [fetchData])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const next = { ...prev }
        delete next[key]
        fetchData(next)
        return next
      })
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
      [...sectors].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [sectors, sortCol, sortDir]
  )

  // ── Name change — alphabets only ──────────────────────────────────────────
  const handleNameChange = (val) => {
    if (!ALPHA_NUM_SPECIAL.test(val)) return
    setName(val)
    if (nameErr && val.trim()) setNameErr('')
  }

  // ── Save / Update ─────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!name.trim()) {
      setNameErr('Sector Name is required')
      return
    }
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
        PK_SectorID: isUpdate ? editing : 0,
        SectorName: name.trim(),
        FK_SectorStatusID: isUpdate ? (active ? 1 : 2) : 1,
      }

      const result = await saveSectorsApi(params, { skipLoader: true })
      setLoadingSave(false)

      if (!result.success) {
        toast.error(result.message || 'Failed to save sector.')
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (code === SAVE_SUCCESS) {
        toast.success(isUpdate ? 'Updated Successfully' : 'Record Added Successfully')
        await fetchData(applied)
        setEditing(null)
        setName('')
        setNameErr('')
        setActive(true)
        setPage(0)
        return
      }

      if (code === SAVE_DUP) {
        // toast.error(SAVE_SECTORS_CODES[code])
        setNameErr(SAVE_SECTORS_CODES[code])
        return
      }

      toast.error(SAVE_SECTORS_CODES[code] || 'Something went wrong, please try again.')
    },
    [editing, name, active, applied, fetchData]
  )

  const cancelEdit = () => {
    setEditing(null)
    setName('')
    setNameErr('')
  }

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: sectors.length < totalCount,
    loading: loadingInitial || loadingMore, // ← was: loadingMore
    onLoadMore: handleLoadMore,
  })

  // ── Column definitions ────────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'name',
        title: 'Sector Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#000]">{r.name}</span>,
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
      {
        key: 'edit',
        title: 'Edit',
        align: 'left',
        render: (r) => (
          <BtnIconEdit
            onClick={() => {
              setEditing(r.id)
              setName(r.name)
              setActive(r.status === 'Active')
              setNameErr('')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
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
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Sectors</h1>
          <SearchFilter
            placeholder="Search by sector name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
            showFilterPanel={false}
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                Sector Name: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="p-5">
            <div className="flex items-start gap-4 flex-wrap">
              {/* Sector Name input */}
              <div className="flex-1 min-w-[220px]">
                <Input
                  label="Sector Name"
                  required
                  placeholder="e.g. Banking"
                  value={name}
                  onChange={(v) => {
                    setName(v)
                    if (nameErr && v.trim()) setNameErr('')
                  }}
                  maxLength={50}
                  showCount
                  error={!!nameErr}
                  errorMessage={nameErr}
                  regex={ALPHA_NUM_SPECIAL}
                />
              </div>

              {/* Status checkbox — edit mode only */}
              {editing && (
                <Checkbox
                  label="Active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="mt-10 shrink-0"
                />
              )}

              {/* Buttons */}
              <div className="flex items-center gap-2 mt-7 shrink-0">
                {editing && <BtnSlate onClick={cancelEdit}>Cancel</BtnSlate>}
                <BtnPrimary disabled={!name.trim()} onClick={handleSave}>
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
                totalCount > 10 &&
                sectors.length >= totalCount && (
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

export default SectorsPage
