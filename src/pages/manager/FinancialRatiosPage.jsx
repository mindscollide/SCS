/**
 * src/pages/manager/FinancialRatiosPage.jsx
 * ===========================================
 * List view for Financial Ratios — Manager role.
 *
 * APIs used:
 *  GetFinancialRatiosApi    — full paginated list (PageSize:0 loads all)
 *  GetFinancialRatioByIDApi — full detail fetch before navigating to edit
 *
 * Navigation:
 *  Add  → setEditRatio(null)   → /manager/financial-ratios/manage
 *  Edit → setEditRatio(local)  → /manager/financial-ratios/manage
 *  Edit target is held in FinancialRatioContext so ManageFinancialRatioPage
 *  can read it without prop-drilling.
 *
 * Filtering:
 *  Client-side filter on the already-fetched list using `applied` (name, desc).
 *  Re-fetches from the API only on Search / Reset / chip removal.
 *
 * MQTT:
 *  financial_ratio_saved → refetch the list with current filters so any
 *  add or edit made by any Manager session is reflected immediately without
 *  requiring a manual page refresh.
 *  Uses the liveRef pattern to keep `applied` fresh inside the stable handler.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinancialRatio } from '../../context/FinancialRatioContext'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import { MemoizedFormulaCardForFinancialRatios } from '../../components/common/card/FormulaBuilderListingCard'
import { formatChipValue } from '../../utils/helpers'
import { BtnTeal, BtnChipRemove, BtnClearAll } from '../../components/common'
import {
  GetFinancialRatiosApi,
  GET_ALL_FINANCIAL_RATIOS_CODES,
  GetFinancialRatioByIDApi,
  GET_FINANCIAL_RATIO_BY_ID_CODES,
} from '../../services/manager.service.js'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'

// ── Filter config ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = { name: '', desc: '' }
const FILTER_FIELDS = [
  { key: 'name', label: 'Ratio Name', type: 'input', maxLength: 100 },
  { key: 'desc', label: 'Description', type: 'input', maxLength: 300 },
]
const CHIP_LABELS = { name: 'Ratio Name', desc: 'Description' }

// ── Business-logic response codes (live inside responseResult.responseMessage) ─
const CODE_LIST_SUCCESS = 'Manager_ManagerServiceManager_GetFinancialRatios_03'
const CODE_LIST_EMPTY = 'Manager_ManagerServiceManager_GetFinancialRatios_02'
const CODE_BYID_SUCCESS = 'Manager_ManagerServiceManager_GetFinancialRatioByID_04'

// ── Shape mapper: single listing row → local ──────────────────────────────────
// Handles both GetAll rows and the GetByID single object
// (only difference is the numerator/denominator name key)
// ── Shape mapper: single listing row → local ──────────────────────────────────
const toLocalRatio = (r) => ({
  id: r.pK_FinancialRatiosID,
  name: r.name ?? '',
  desc: r.description ?? '',
  status: r.status ?? '',
  fK_FinancialRatioStatusID: r.fK_FinancialRatioStatusID ?? 0,
  fK_NumeratorClassificationID: r.fK_NumeratorClassificationID ?? 0,
  fK_DenominatorClassificationID: r.fK_DenominatorClassificationID ?? 0,
  numerator: r.numeratorClassificationName ?? r.numeratorName ?? '',
  denominator: r.denominatorClassificationName ?? r.denominatorName ?? '',
  classifications: (r.mappedClassifications ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((c) => ({
      id: c.classificationID,
      name: c.classificationName ?? '',
      isCalculated: c.isCalculated === 1 || c.isCalculated === true, // ← ADD
      isProrated: c.isProrated === 1 || c.isProrated === true, // ← ADD
      baseClassificationName: c.baseClassificationName ?? '', // ← ADD
    })),
})

// ── FinancialRatiosPage ───────────────────────────────────────────────────────
const FinancialRatiosPage = () => {
  const navigate = useNavigate()
  const { ratios, setRatios, setEditRatio } = useFinancialRatio()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false) // while GetByID is in flight
  const [error, setError] = useState(null)

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, name: val })), [])

  // Client-side filter on what the server already returned
  const displayed = useMemo(
    () =>
      ratios.filter((r) =>
        Object.entries(applied).every(
          ([k, v]) => !v || (r[k] || '').toLowerCase().includes(v.toLowerCase())
        )
      ),
    [ratios, applied]
  )

  // ── Fetch listing ─────────────────────────────────────────────────────────
  /**
   * responseResult lives at res.data.responseResult
   * The business-logic code is at responseResult.responseMessage (NOT the outer responseCode).
   * financialRatios array is at responseResult.financialRatios
   */
  const fetchRatios = useCallback(
    async (filterParams = {}) => {
      setLoading(true)
      setError(null)
      try {
        const res = await GetFinancialRatiosApi({
          Name: filterParams.name || '',
          Description: filterParams.desc || '',
          FK_FinancialRatioStatusID: 0,
          PageSize: 0,
          PageNumber: 0,
        })

        const result = res?.data?.responseResult
        const code = result?.responseMessage

        console.log(result, 'GetFinancialRatiosApiGetFinancialRatiosApi')
        if (code === CODE_LIST_SUCCESS) {
          setRatios((result.financialRatios ?? []).map(toLocalRatio))
        } else if (code === CODE_LIST_EMPTY) {
          setRatios([]) // "no records" is not an error
        } else {
          setError(GET_ALL_FINANCIAL_RATIOS_CODES[code] ?? 'Failed to load financial ratios.')
        }
      } catch (err) {
        console.error('GetFinancialRatiosApi:', err)
        setError('An unexpected error occurred while loading financial ratios.')
      } finally {
        setLoading(false)
      }
    },
    [setRatios]
  )

  // ── MQTT ──────────────────────────────────────────────────────────────────
  // liveRef keeps the latest `applied` accessible in stable callbacks without
  // stale-closure issues (see §10 Live Ref Pattern in MEMORY.md).
  const liveRef = useRef({})
  liveRef.current = { applied }

  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  // fetchRatios is declared above — must come first (TDZ law)
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.FINANCIAL_RATIO_SAVED]: () => {
        // Re-fetch with whatever filters are currently active so the list
        // reflects the add / edit without requiring a manual page refresh.
        fetchRatios(liveRef.current.applied)
      },
    }),
    [fetchRatios]
  )

  useSubscribe(mqttTopic, mqttHandler)

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRatios()
  }, [fetchRatios])

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setFilters(EMPTY_FILTERS)
    fetchRatios(next)
  }, [filters, fetchRatios])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    fetchRatios()
  }, [fetchRatios])

  const handleFClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const next = { ...prev }
        delete next[key]
        fetchRatios(next)
        return next
      })
    },
    [fetchRatios]
  )

  // ── Navigation helpers ────────────────────────────────────────────────────
  const openAdd = () => {
    setEditRatio(null)
    navigate('/manager/financial-ratios/manage')
  }

  /**
   * Edit flow:
   *  1. Call GetFinancialRatioByIDApi with the ratio's PK.
   *  2. Read responseResult.financialRatio for the full object.
   *  3. responseResult.responseMessage carries the business-logic code.
   *  4. Map to local shape, store in context, navigate.
   */
  const openEdit = useCallback(
    async (ratio) => {
      setEditLoading(true)
      setError(null)
      try {
        const res = await GetFinancialRatioByIDApi({ PK_FinancialRatiosID: ratio.id })

        const result = res?.data?.responseResult
        const code = result?.responseMessage

        console.log(result, 'GetFinancialRatioByIDApiGetFinancialRatioByIDApi')

        if (code === CODE_BYID_SUCCESS) {
          setEditRatio(toLocalRatio(result.financialRatio))
          navigate('/manager/financial-ratios/manage')
        } else {
          setError(GET_FINANCIAL_RATIO_BY_ID_CODES[code] ?? 'Failed to load ratio details.')
        }
      } catch (err) {
        console.error('GetFinancialRatioByIDApi:', err)
        setError('An unexpected error occurred while loading ratio details.')
      } finally {
        setEditLoading(false)
      }
    },
    [setEditRatio, navigate]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page header ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Financial Ratios</h1>
          <div className="flex items-center gap-2">
            <BtnTeal onClick={openAdd} className="shrink-0">
              Add Financial Ratio
            </BtnTeal>
            <SearchFilter
              placeholder="Financial Ratio Name."
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

      {/* ── Body ── */}
      <div>
        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
            {error}
          </div>
        )}

        {/* Filter chips */}
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

        {/* List */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            Loading…
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            No Financial Ratios Found
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {displayed.map((ratio) => (
              <MemoizedFormulaCardForFinancialRatios
                key={ratio.id}
                variant="classifications"
                formula={{
                  name: ratio.name,
                  subtitle: ratio.desc,
                  classifications: ratio.classifications,
                }}
                onEdit={editLoading ? undefined : () => openEdit(ratio)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FinancialRatiosPage
