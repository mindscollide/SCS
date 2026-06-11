/**
 * src/pages/manager/ComplianceCriteriaPage.jsx
 * ==============================================
 * Compliance Criteria list page — Manager role.
 *
 * APIs used:
 *  GetComplianceCriteriaApi         — paginated list (no ratio mappings in response)
 *  GetComplianceCriteriaByIDApi     — full detail + ratio mappings (view modal + edit)
 *  SetDefaultComplianceCriteriaApi  — mark a criteria as the system default
 *
 * Default criteria — localStorage:
 *  The current system default is stored in localStorage (key: scs_compliance_criteria)
 *  via defaultCriteria.js. This key is seeded at login, kept in sync by syncDefault()
 *  after every list fetch and by handleConfirmYes after a SetDefault success.
 *  It is shared across all browser tabs so DataEntry pages always reflect the current
 *  default without an extra API call.
 *  getDefaultCriteriaName() reads it to show the "Default: <name>" badge in the header.
 *
 * Flows:
 *  View ratios  → GetComplianceCriteriaByIDApi → FinancialRatioModal
 *  Edit         → GetComplianceCriteriaByIDApi → populate context → navigate to manage
 *  Set default  → ConfirmModal → SetDefaultComplianceCriteriaApi → optimistic store update → refetch
 *  Add          → setEditCriteria(null) → navigate to manage
 *
 * MQTT:
 *  compliance_criteria_saved → refetch list + sync default value (localStorage)
 *  Uses liveRef pattern to keep `applied` filters fresh inside the stable handler.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useComplianceCriteria } from '../../context/ComplianceCriteriaContext'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import FormulaCard from '../../components/common/card/FormulaBuilderListingCard'
import { formatChipValue } from '../../utils/helpers'
import { BtnTeal, BtnChipRemove, BtnClearAll, ConfirmModal } from '../../components/common'
import {
  GetComplianceCriteriaApi,
  SetDefaultComplianceCriteriaApi,
  SET_DEFAULT_COMPLIANCE_CRITERIA_CODES,
  GetComplianceCriteriaByIDApi,
} from '../../services/manager.service'
import {
  getDefaultCriteria,
  setDefaultCriteria,
  getDefaultCriteriaName,
} from '../../utils/defaultCriteria'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import useInfiniteScroll from '../../hooks/useInfiniteScroll.js'
import arrowUp from '../../../public/arrowup-icon.png'
import arrowDown from '../../../public/arrowdown-icon.png'

const EMPTY_FILTERS = { name: '', desc: '' }

const FILTER_FIELDS = [
  { key: 'name', label: 'Criteria Name', type: 'input', maxLength: 100 },
  { key: 'desc', label: 'Description', type: 'input', maxLength: 300 },
]

const CHIP_LABELS = { name: 'Criteria Name', desc: 'Description' }

const mapItem = (raw) => ({
  id: raw.pK_ComplianceCriteriaID,
  name: raw.criteriaName,
  subtitle: raw.description || '',
  isDefault: raw.isDefault ?? false,
  status: raw.status,
  createdDate: raw.createdDate,
  lastModifiedDate: raw.lastModifiedDate,
})

const syncDefault = (criteria) => {
  const defaults = criteria
    .filter((c) => c.isDefault)
    .map(({ id, name }) => ({ pK_ComplianceCriteriaID: id, criteriaName: name }))
  setDefaultCriteria(defaults)
}

// ── Financial Ratio Modal (unchanged) ────────────────────────────────────────
const FinancialRatioModal = ({ open, loading, criteriaName, ratios, onClose }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-[22px] font-semibold text-[#0B39B5]">Financial Ratio</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#a0aec0] hover:text-[#041E66] transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <div className="px-6 pb-6">
          {loading ? (
            <div className="py-12 text-center text-[#a0aec0] text-[13px]">Loading…</div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: '#0B39B5' }}>
                    {['Financial Ratio Name', 'Sequence', 'Threshold value'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[12px] font-semibold text-white"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ratios.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-[13px] text-[#a0aec0]">
                        No Financial Ratios Found
                      </td>
                    </tr>
                  ) : (
                    ratios.map((r, i) => (
                      <tr
                        key={r.fK_FinancialRatiosID ?? i}
                        className="border-[#fff] border-y-4 bg-[#f8f9ff]"
                      >
                        <td className="px-5 py-3 font-medium text-[#000]">
                          {r.financialRatioName ?? r.ratioName ?? ''}
                        </td>
                        <td className="px-5 py-3 text-[#000] flex justify-center">
                          {r.sequence ?? r.seq ?? ''}
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex justify-center items-center gap-1.5 text-[#000]">
                            {r.thresholdValue ?? r.threshold}
                            {r.thresholdUnit ?? r.unit}
                            <img
                              src={
                                (r.isMaxValidationApplied ?? (r.type === 'Maximum' ? 1 : 0)) === 1
                                  ? arrowUp
                                  : arrowDown
                              }
                              alt="direction"
                              className="w-4 h-4 object-contain shrink-0"
                              draggable={false}
                            />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ComplianceCriteriaPage ────────────────────────────────────────────────────
const ComplianceCriteriaPage = () => {
  const navigate = useNavigate()
  const { setEditCriteria } = useComplianceCriteria()

  const [criteria, setCriteria] = useState([])
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [apiError, setApiError] = useState(null)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, name: val })), [])

  const [ratioModal, setRatioModal] = useState({
    open: false,
    loading: false,
    criteriaName: '',
    ratios: [],
  })
  const [confirmModal, setConfirmModal] = useState({ open: false, pendingId: null })
  const [defaultName, setDefaultName] = useState(() => getDefaultCriteriaName())

  // ── Refs ──────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const stateRef = useRef({})
  const liveRef = useRef({})
  stateRef.current = { page, applied }
  liveRef.current = { applied }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCriteria = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)
    else {
      setLoadingInitial(true)
      setApiError(null)
    }

    try {
      const storedDefault = getDefaultCriteria()
      const res = await GetComplianceCriteriaApi({
        CriteriaName: appliedFilters.name || '',
        Description: appliedFilters.desc || '',
        FinancialRatioName: '',
        DefaultComplianceCriteriaID: storedDefault[0]?.pK_ComplianceCriteriaID || 0,
        PageSize: 10,
        PageNumber: pageNumber,
      })
      const result = res?.data?.responseResult ?? res?.responseResult

      if (!result?.isExecuted) {
        if (!append) setApiError('Failed to load compliance criteria.')
        return
      }

      const mapped = (result.complianceCriteria || []).map(mapItem)
      setCriteria((prev) => (append ? [...prev, ...mapped] : mapped))
      setTotalCount(result.totalCount ?? mapped.length)
      syncDefault(mapped)
      setDefaultName(getDefaultCriteriaName())
    } catch {
      if (!append) setApiError('An unexpected error occurred.')
    } finally {
      if (append) setLoadingMore(false)
      else setLoadingInitial(false)
    }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchCriteria({}, 0, false)
  }, [fetchCriteria])

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    setPage(p + 1)
    fetchCriteria(ap, p + 1, true)
  }, [fetchCriteria])

  useInfiniteScroll({
    sentinelRef,
    hasMore: criteria.length < totalCount,
    loading: loadingInitial || loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ── MQTT ──────────────────────────────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.COMPLIANCE_CRITERIA_SAVED]: () => {
        setPage(0)
        fetchCriteria(liveRef.current.applied, 0, false)
      },
      [MQTT_TYPE.COMPLIANCE_CRITERIA_DEFAULT_UPDATED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        const c = d?.criteria
        if (!c) return
        const newId = c.pK_ComplianceCriteriaID ?? c.pkComplianceCriteriaID
        const newName = c.criteriaName ?? ''
        setDefaultCriteria([{ pK_ComplianceCriteriaID: newId, criteriaName: newName }])
        setCriteria((prev) => {
          const updated = prev.map((item) => ({
            ...item,
            isDefault: Number(item.id) === Number(newId),
          }))
          const defaultItem = updated.find((item) => item.isDefault)
          const rest = updated.filter((item) => !item.isDefault)
          return defaultItem ? [defaultItem, ...rest] : updated
        })
        setDefaultName(newName)
      },
    }),
    [fetchCriteria]
  )
  useSubscribe(mqttTopic, mqttHandler)

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setPage(0)
    setFilters(EMPTY_FILTERS)
    fetchCriteria(next, 0, false)
  }, [filters, fetchCriteria])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchCriteria({}, 0, false)
  }, [fetchCriteria])

  const handleFClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const next = { ...prev }
        delete next[key]
        setPage(0)
        fetchCriteria(next, 0, false)
        return next
      })
    },
    [fetchCriteria]
  )

  // ── View / Edit / Default (unchanged logic) ───────────────────────────────
  const openViewRatios = useCallback(async (item) => {
    setRatioModal({ open: true, loading: true, criteriaName: item.name, ratios: [] })
    try {
      const res = await GetComplianceCriteriaByIDApi(
        { PK_ComplianceCriteriaID: item.id },
        { skipLoader: true }
      )
      const result = res?.data?.responseResult
      if (result?.isExecuted) {
        setRatioModal({
          open: true,
          loading: false,
          criteriaName: item.name,
          ratios: result.ratioMappings ?? [],
        })
      } else {
        setRatioModal({ open: false, loading: false, criteriaName: '', ratios: [] })
        toast.error('Failed to load financial ratios.')
      }
    } catch {
      setRatioModal({ open: false, loading: false, criteriaName: '', ratios: [] })
      toast.error('Network error. Please try again.')
    }
  }, [])

  const openEdit = useCallback(
    async (item) => {
      try {
        const res = await GetComplianceCriteriaByIDApi(
          { PK_ComplianceCriteriaID: item.id },
          { skipLoader: true }
        )
        const result = res?.data?.responseResult
        if (result?.isExecuted) {
          const c = result.criteria
          const ratios = (result.ratioMappings ?? []).map((r) => ({
            id: r.fK_FinancialRatiosID,
            ratioId: r.fK_FinancialRatiosID,
            ratioName: r.financialRatioName ?? '',
            seq: r.sequence ?? 1,
            unit: r.thresholdUnit ?? '%',
            threshold: r.thresholdValue ?? 0,
            type: r.isMaxValidationApplied === 1 ? 'Maximum' : 'Minimum',
          }))
          setEditCriteria({
            id: c.pK_ComplianceCriteriaID,
            name: c.criteriaName,
            desc: c.description || '',
            isDefault: c.isDefault ?? false,
            status: c.status,
            ratios,
          })
          navigate('/manager/compliance-criteria/manage')
        } else {
          toast.error('Failed to load criteria details.')
        }
      } catch {
        toast.error('Network error. Please try again.')
      }
    },
    [navigate, setEditCriteria]
  )

  const handleToggleDefault = useCallback(
    (id) => {
      const current = criteria.find((c) => c.id === id)
      if (current?.isDefault) return
      setConfirmModal({ open: true, pendingId: id })
    },
    [criteria]
  )

  const handleConfirmNo = useCallback(() => {
    setConfirmModal({ open: false, pendingId: null })
  }, [])

  const handleConfirmYes = useCallback(async () => {
    const { pendingId } = confirmModal
    setConfirmModal({ open: false, pendingId: null })
    if (!pendingId) return
    try {
      const res = await SetDefaultComplianceCriteriaApi({ PK_ComplianceCriteriaID: pendingId })
      const result = res?.data?.responseResult ?? res?.responseResult
      const code = result?.responseMessage
      const ok = result?.isExecuted || SET_DEFAULT_COMPLIANCE_CRITERIA_CODES[code] === null
      if (!ok) {
        toast.error(
          SET_DEFAULT_COMPLIANCE_CRITERIA_CODES[code] || 'Failed to set default. Please try again.'
        )
        return
      }
      const picked = criteria.find((c) => c.id === pendingId)
      if (picked)
        setDefaultCriteria([{ pK_ComplianceCriteriaID: picked.id, criteriaName: picked.name }])
      toast.success('Default Compliance Criteria updated.')
      setPage(0)
      fetchCriteria(applied, 0, false)
    } catch {
      toast.error('Network error. Please try again.')
    }
  }, [confirmModal, fetchCriteria, applied, criteria])

  const openAdd = useCallback(() => {
    setEditCriteria(null)
    navigate('/manager/compliance-criteria/manage')
  }, [navigate, setEditCriteria])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Compliance Criteria</h1>
          <div className="flex items-center gap-2">
            <BtnTeal onClick={openAdd} className="shrink-0">
              Add Compliance Criteria
            </BtnTeal>
            <SearchFilter
              placeholder="Search by name"
              mainSearch={mainSearch}
              setMainSearch={setMainSearch}
              filters={filters}
              setFilters={setFilters}
              fields={FILTER_FIELDS}
              onSearch={handleSearch}
              onReset={handleReset}
              onFilterClose={handleFClose}
            />
          </div>
        </div>
      </div>

      <div>
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k]}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* Initial loading spinner */}
        {loadingInitial && (
          <div className="flex justify-center py-14">
            <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
          </div>
        )}

        {!loadingInitial && apiError && (
          <div className="bg-white rounded-xl border border-red-200 py-14 text-center text-red-400">
            {apiError}
          </div>
        )}

        {!loadingInitial && !apiError && criteria.length === 0 && (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            No Compliance Criteria Found
          </div>
        )}

        {!loadingInitial && !apiError && criteria.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {criteria.map((item) => (
              <FormulaCard
                key={item.id}
                variant="criteria"
                formula={{
                  id: item.id,
                  name: item.name,
                  subtitle: item.subtitle,
                  isDefault: item.isDefault,
                  createdDate: item.createdDate,
                  lastModifiedDate: item.lastModifiedDate,
                  onToggleDefault: handleToggleDefault,
                  onViewRatios: () => openViewRatios(item),
                }}
                onEdit={() => openEdit(item)}
              />
            ))}
          </div>
        )}

        {/* Sentinel + load-more spinner */}
        <div ref={sentinelRef} className="h-px" />
        {loadingMore && (
          <div className="flex justify-center py-5">
            <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
          </div>
        )}
        {!loadingInitial && !loadingMore && totalCount > 10 && criteria.length >= totalCount && (
          <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
        )}
      </div>

      <FinancialRatioModal
        open={ratioModal.open}
        loading={ratioModal.loading}
        criteriaName={ratioModal.criteriaName}
        ratios={ratioModal.ratios}
        onClose={() => setRatioModal({ open: false, loading: false, criteriaName: '', ratios: [] })}
      />

      <ConfirmModal
        open={confirmModal.open}
        message="Are you sure you want to change the Default Compliance Criteria?"
        onYes={handleConfirmYes}
        onNo={handleConfirmNo}
      />
    </div>
  )
}

export default ComplianceCriteriaPage
