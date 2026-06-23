/**
 * src/pages/manager/ClassificationsPage.jsx
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Calculator } from 'lucide-react'
import { toast } from 'react-toastify'
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
} from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Input from '../../components/common/Input/Input'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import Toggle from '../../components/common/Toggle/Toggle'
import { FormulaModal } from '../../components/common/Modals/Modals.jsx'
import { formatChipValue } from '../../utils/helpers'
import {
  getClassificationsApi,
  GET_CLASSIFICATIONS_CODES,
  SaveClassificationsApi,
  SAVE_CLASSIFICATIONS_CODES,
} from '../../services/manager.service.js'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'
import chartIcon from '../../../public/chart-icon.png'

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
// topbar(44) + main-pad(24) + header-band(54) + card-pad(40) + chips(48) + form-2rows-toggles(240) + card-bot+mb-2(28) + main-pad-bot(24) ≈ 482px
const TABLE_MAX_HEIGHT = 'calc(100vh - 500px)'

const GET_SUCCESS = 'Manager_ManagerServiceManager_GetClassifications_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetClassifications_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveClassification_03'
const SAVE_DUP = 'Manager_ManagerServiceManager_SaveClassification_04'

const ALPHANUMERIC = /^(?! )[a-zA-Z0-9\s.,\-()'%]*$/
const ALPHA_NUM_SPECIAL = /^(?! )[A-Za-z0-9\s&/()%'-]*$/

const EMPTY_FORM = {
  name: '',
  desc: '',
  calculated: false,
  displayAsPercentage: false, // visible only when calculated is ON
  prorated: false,
  base: '', // display name shown in dropdown
  baseId: 0, // PK sent in save payload
}

const EMPTY_FILTERS = { name: '', desc: '' }

const FILTER_FIELDS = [
  {
    key: 'name',
    label: 'Classification Name',
    type: 'input',
    regex: ALPHA_NUM_SPECIAL,
    maxLength: 100,
  },
  { key: 'desc', label: 'Description', type: 'input', maxLength: 300 },
]

const CHIP_LABELS = { name: 'Name', desc: 'Description' }

// ── API response → local shape ────────────────────────────────────────────────
const mapClassification = (c) => ({
  id: c.pK_ClassificationID,
  name: c.name || '',
  desc: c.description || '',
  calculated: !!c.isCalculated,
  displayAsPercentage: !!c.isDisplayAsPercentage,
  prorated: !!c.isProrated,
  baseId: c.fK_BaseClassificationID || 0,
  statusId: c.fK_ClassificationStatusID,
  status: c.status || 'Active',
})

// ── Component ─────────────────────────────────────────────────────────────────
const ClassificationsPage = () => {
  // ── Data state ──────────────────────────────────────────────────────────
  const [classifications, setClassifications] = useState([]) // paginated — drives table only
  const [allClassifications, setAllClassifications] = useState([]) // full list — drives dropdown only
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(null)
  const [active, setActive] = useState(true)

  // ── Modals ───────────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)
  const [viewItem, setViewItem] = useState(null)

  // ── Search / filter ──────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // ── Refs ─────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})

  stateRef.current = { page, applied }

  // ── MQTT — upsert classification row ──────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.CLASSIFICATION_SAVED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        if (!d?.pkClassificationID) return
        const row = {
          id: d.pkClassificationID,
          name: d.name || '',
          desc: d.description || '',
          calculated: !!d.isCalculated,
          prorated: !!d.isProrated,
          baseId: d.fkBaseClassificationID || 0,
          statusId: d.fkClassificationStatusID,
          status: d.status || 'Active',
        }
        setClassifications((prev) => {
          const idx = prev.findIndex((c) => c.id === row.id)
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

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => {
    if (ALPHA_NUM_SPECIAL.test(val) || val === '') setFilters((p) => ({ ...p, name: val }))
  }, [])

  // ── Base dropdown options — built from the FULL unfiltered list ──────────
  // Active + non-calculated only; exclude the row being edited (can't be its own base)
  const baseOptions = useMemo(
    () =>
      allClassifications
        .filter((c) => c.status === 'Active' && c.id !== editing)
        .map((c) => c.name)
        .sort(),
    [allClassifications, editing]
  )

  // Resolve display name → PK (used when user picks from dropdown)
  const nameToId = useCallback(
    (name) => allClassifications.find((c) => c.name === name)?.id || 0,
    [allClassifications]
  )

  // Resolve PK → display name (used when populating edit form & table Base column)
  const idToName = useCallback(
    (id) => (id ? allClassifications.find((c) => c.id === id)?.name || '' : ''),
    [allClassifications]
  )

  // ── Save button guard ────────────────────────────────────────────────────
  const canSave = form.name.trim() && (!form.prorated || form.baseId)

  // ── Toggle helpers ───────────────────────────────────────────────────────
  const setCalculated = (val) => {
    setForm((p) => ({
      ...p,
      calculated: val,
      displayAsPercentage: val ? p.displayAsPercentage : false,
      prorated: val ? false : p.prorated,
      base: val ? '' : p.base,
      baseId: val ? 0 : p.baseId,
    }))
    if (errors.name) setErrors((p) => ({ ...p, name: '' }))
  }

  const setProrated = (val) => {
    setForm((p) => ({
      ...p,
      prorated: val,
      calculated: val ? false : p.calculated,
      base: val ? p.base : '',
      baseId: val ? p.baseId : 0,
    }))
    if (errors.base) setErrors((p) => ({ ...p, base: '' }))
  }

  // User picks from dropdown → resolve name to PK immediately
  const setBase = (name) => {
    setForm((p) => ({ ...p, base: name, baseId: nameToId(name) }))
    if (errors.base) setErrors((p) => ({ ...p, base: '' }))
  }

  // ── Fetch paginated (table) ──────────────────────────────────────────────
  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoadingInitial(true)

    const params = {
      Name: appliedFilters.name || '',
      Description: appliedFilters.desc || '',
      PageSize: PAGE_SIZE,
      PageNumber: pageNumber,
    }

    const result = await getClassificationsApi(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    else setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load classifications.')
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.classifications)
        ? rr.classifications.map(mapClassification)
        : []
      setClassifications((prev) => (append ? [...prev, ...rows] : rows))
      setTotalCount(rr.totalCount)
      return
    }

    if (code === GET_EMPTY) {
      if (!append) {
        setClassifications([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_CLASSIFICATIONS_CODES[code] || 'Something went wrong.')
  }, [])

  // ── Fetch ALL for dropdown ───────────────────────────────────────────────
  const fetchAllForDropdown = useCallback(async () => {
    const result = await getClassificationsApi(
      { Name: '', Description: '', PageSize: 9999, PageNumber: 0 },
      { skipLoader: true }
    )
    if (!result.success) return

    const rr = result.data?.responseResult
    if (rr?.responseMessage === GET_SUCCESS) {
      const rows = Array.isArray(rr.classifications)
        ? rr.classifications.map(mapClassification)
        : []
      setAllClassifications(rows)
    }
  }, [])

  // ── Mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
    fetchAllForDropdown()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Infinite scroll ──────────────────────────────────────────────────────
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
    hasMore: classifications.length < totalCount,
    loading: loadingMore || loadingInitial,
    onLoadMore: handleLoadMore,
  })

  // ── Search handlers ──────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setPage(0)
    fetchData(next, 0, false)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

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
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ── Sort (client-side within loaded rows) ────────────────────────────────
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

  // ── Sort (client-side within loaded rows) ────────────────────────────────
  const sorted = useMemo(() => {
    if (!classifications.length) return []

    return [...classifications].sort((a, b) => {
      let va, vb

      if (sortCol === 'baseId') {
        // Sort by resolved display name, not the raw FK integer
        va = idToName(a.baseId).toLowerCase()
        vb = idToName(b.baseId).toLowerCase()
      } else if (typeof a[sortCol] === 'boolean') {
        // true (1) vs false (0)
        va = a[sortCol] ? 1 : 0
        vb = b[sortCol] ? 1 : 0
        return sortDir === 'asc' ? va - vb : vb - va
      } else {
        va = (a[sortCol] ?? '').toString().toLowerCase()
        vb = (b[sortCol] ?? '').toString().toLowerCase()
      }

      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [classifications, sortCol, sortDir, idToName])

  // ── Validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Classification Name is required'
    if (form.prorated && !form.baseId)
      errs.base = 'Base Classification is required when Prorated is ON'
    return errs
  }

  const resetForm = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setActive(true)
  }

  // ── Save button click ────────────────────────────────────────────────────
  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    if (editing) {
      setConfirm(true)
    } else {
      callSaveApi(false)
    }
  }

  // ── Save / Update API call ───────────────────────────────────────────────
  const callSaveApi = useCallback(
    async (isUpdate) => {
      setLoadingSave(true)

      const params = {
        ClassificationID: isUpdate ? editing : 0,
        Name: form.name.trim(),
        Description: form.desc.trim(),
        IsCalculated: form.calculated ? 1 : 0,
        IsDisplayAsPercentage: form.calculated && form.displayAsPercentage ? 1 : 0,
        IsProrated: form.prorated ? 1 : 0,
        BaseClassificationID: form.prorated ? form.baseId : 0,
        ClassificationStatusID: isUpdate ? (active ? 1 : 2) : 1,
      }

      const result = await SaveClassificationsApi(params, { skipLoader: true })
      setLoadingSave(false)

      if (!result.success) {
        toast.error(result.message || 'Failed to save classification.')
        return
      }

      const code = result.data?.responseResult?.responseMessage

      if (code === SAVE_SUCCESS) {
        toast.success(isUpdate ? 'Updated Successfully' : 'Record Added Successfully')
        setPage(0)
        // Refresh both the table and the dropdown after save
        await Promise.all([fetchData(applied, 0, false), fetchAllForDropdown()])
        resetForm()
        return
      }

      if (code === SAVE_DUP) {
        setErrors({ name: SAVE_CLASSIFICATIONS_CODES[code] })
        return
      }

      toast.error(SAVE_CLASSIFICATIONS_CODES[code] || 'Something went wrong, please try again.')
    },
    [editing, form, active, applied, fetchData, fetchAllForDropdown]
  )

  // ── Table columns ────────────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'name',
        title: 'Classification Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#000]">{r.name}</span>,
      },
      {
        key: 'desc',
        title: 'Description',
        sortable: true,
      },
      {
        key: 'calculated',
        title: 'Calculated',
        align: 'center',
        sortable: true,
        render: (r) =>
          r.calculated ? (
            <button
              title="View Formula"
              onClick={() => setViewItem(r)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#e3a204] text-[11px] font-semibold"
            >
              <Calculator size={20} />
            </button>
          ) : (
            ''
          ),
      },
      {
        key: 'displayAsPercentage',
        title: 'Display as Percentage',
        align: 'center',
        sortable: true,
        render: (r) => (r.displayAsPercentage ? 'Yes' : ''),
      },
      {
        key: 'prorated',
        title: 'Prorated',
        align: 'center',
        sortable: true,
        render: (r) =>
          r.prorated ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#01c9a4] text-[11px]">
              <img
                src={chartIcon}
                alt="Pie Icon"
                className={`object-contain h-auto w-7`}
                draggable={false}
              />
            </span>
          ) : (
            ''
          ),
      },
      {
        key: 'baseId',
        title: 'Base Classification',
        align: 'center',
        sortable: true,
        // idToName resolves the FK integer from allClassifications (full list)
        // so the table always shows the correct name regardless of scroll position
        render: (r) => idToName(r.baseId),
      },

      {
        key: 'actions',
        title: 'Edit',
        render: (r) => (
          <div className="flex items-center gap-1">
            {/* <button
              title="View Formula"
              onClick={() => setViewItem(r)}
              className="w-8 h-8 rounded-lg text-[#01C9A4] hover:bg-teal-50 flex items-center justify-center transition-colors"
            >
              <Eye size={16} />
            </button> */}
            <BtnIconEdit
              size={16}
              onClick={() => {
                setEditing(r.id)
                setForm({
                  name: r.name,
                  desc: r.desc || '',
                  calculated: r.calculated,
                  displayAsPercentage: r.displayAsPercentage || false,
                  prorated: r.prorated,
                  // idToName resolves the stored FK to a display name for the dropdown
                  base: idToName(r.baseId) === '—' ? '' : idToName(r.baseId),
                  baseId: r.baseId || 0,
                })
                setActive(r.statusId === 1)
                setErrors({})
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        render: (r) => (
          <span
            className={`font-semibold ${
              r.status === 'Active' ? 'text-[#4dc792]' : 'text-[#ec4357]'
            }`}
          >
            {r.status === 'Active' ? 'Active' : 'In-Active'}
          </span>
        ),
      },
    ],
    [idToName]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Classifications</h1>
          <SearchFilter
            placeholder="Search by classification name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="name"
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            showFilterPanel={true}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
            inputWidth="w-[230px]"
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
                {CHIP_LABELS[k]}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="p-5 space-y-4">
            {/* Row 1: Name | Description | Calculated + Display as Percentage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Classification Name"
                required
                maxLength={100}
                showCount
                placeholder="e.g. Total Assets"
                regex={ALPHA_NUM_SPECIAL}
                value={form.name}
                onChange={(v) => {
                  setForm((p) => ({ ...p, name: v }))
                  if (errors.name) setErrors((p) => ({ ...p, name: '' }))
                }}
                error={!!errors.name}
                errorMessage={errors.name}
              />
              <Input
                label="Description"
                maxLength={300}
                showCount
                placeholder="Optional description"
                regex={ALPHANUMERIC}
                value={form.desc}
                onChange={(v) => setForm((p) => ({ ...p, desc: v }))}
              />
              <div className="flex items-start gap-6">
                <div>
                  <p className="text-[12px] font-medium text-[#041E66] mb-2">
                    Calculated Classification
                  </p>
                  <Toggle
                    className="mt-2"
                    checked={form.calculated}
                    onChange={setCalculated}
                    label={form.calculated ? 'ON' : 'OFF'}
                  />
                </div>
                {form.calculated && (
                  <div>
                    <p className="text-[12px] font-medium text-[#041E66] mb-2">
                      Display as Percentage
                    </p>
                    <Toggle
                      className="mt-2"
                      checked={form.displayAsPercentage}
                      onChange={(val) => setForm((p) => ({ ...p, displayAsPercentage: val }))}
                      label={form.displayAsPercentage ? 'ON' : 'OFF'}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Prorated | Base Classification | Status (edit only) */}
            <div className="flex flex-wrap items-start gap-6">
              <div>
                <p className="text-[12px] font-medium text-[#041E66] mb-5">
                  Prorated Classification
                </p>
                <Toggle
                  checked={form.prorated}
                  onChange={setProrated}
                  disabled={form.calculated}
                  label={form.prorated ? 'ON' : 'OFF'}
                />
              </div>

              <div className="flex-1 min-w-[220px] max-w-[688px]">
                <SearchableSelect
                  label="Base Classification"
                  required={form.prorated}
                  placeholder="-- Select Base --"
                  options={baseOptions}
                  value={form.base}
                  onChange={setBase}
                  disabled={!form.prorated}
                  error={!!errors.base}
                  errorMessage={errors.base}
                />
              </div>

              {editing && (
                <div className="mt-[35px]">
                  <Checkbox
                    label="Active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-2 pt-1">
              {editing && <BtnSlate onClick={resetForm}>Cancel</BtnSlate>}
              <BtnPrimary disabled={!canSave || loadingSave} onClick={handleSave}>
                {loadingSave ? 'Saving…' : editing ? 'Update' : 'Save'}
              </BtnPrimary>
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
                classifications.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {/* ── Confirm modal ── */}
      <ConfirmModal
        open={!!confirm}
        message="Are you sure you want to update this record?"
        onYes={() => {
          setConfirm(false)
          callSaveApi(true)
        }}
        onNo={() => setConfirm(false)}
      />

      {/* ── View formula modal ── */}
      <FormulaModal
        item={viewItem}
        onClose={() => setViewItem(null)}
        classificationMap={Object.fromEntries(allClassifications.map((c) => [c.id, c.name]))}
      />
    </div>
  )
}

export default ClassificationsPage
