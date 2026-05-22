/**
 * src/pages/manager/ComplianceCriteriaPage.jsx
 * ==============================================
 * List view for Compliance Criteria.
 *
 * Data source  : GET_COMPLIANCE_CRITERIA  (GetComplianceCriteriaApi)
 * Add / Edit   : navigates → /manager/compliance-criteria/manage
 *                edit target stored in ComplianceCriteriaContext
 *
 * Session key  : "compliance_criteria"
 *   Shape: [{ pK_ComplianceCriteriaID, criteriaName }]
 *   Updated here whenever isDefault changes (optimistic UI).
 *
 * TODO: wire onToggleDefault to a real "set default" API endpoint when available.
 * TODO: wire onViewRatios to the Financial Ratios detail / modal flow.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComplianceCriteria } from '../../context/ComplianceCriteriaContext'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import FormulaCard from '../../components/common/card/FormulaBuilderListingCard'
import { formatChipValue } from '../../utils/helpers'
import { BtnTeal, BtnChipRemove, BtnClearAll } from '../../components/common'
import { GetComplianceCriteriaApi } from '../../services/manager.service'

// ── Filter config ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = { name: '', desc: '' }

const FILTER_FIELDS = [
  { key: 'name', label: 'Criteria Name', type: 'input', maxLength: 100 },
  { key: 'desc', label: 'Description', type: 'input', maxLength: 300 },
]

const CHIP_LABELS = { name: 'Criteria Name', desc: 'Description' }

// ── Map raw API item → card-ready shape ───────────────────────────────────────
const mapItem = (raw) => ({
  id: raw.pK_ComplianceCriteriaID,
  name: raw.criteriaName,
  subtitle: raw.description || '',
  isDefault: raw.isDefault ?? false,
  status: raw.status, // "Active" | "Inactive"
  createdDate: raw.createdDate,
  lastModifiedDate: raw.lastModifiedDate,
})

// ── Sync the "compliance_criteria" session-storage key ────────────────────────
const syncSession = (criteria) => {
  const defaults = criteria
    .filter((c) => c.isDefault)
    .map(({ id, name }) => ({ pK_ComplianceCriteriaID: id, criteriaName: name }))
  try {
    sessionStorage.setItem('compliance_criteria', JSON.stringify(defaults))
  } catch (_) {
    // session storage unavailable — ignore
  }
}

// ── ComplianceCriteriaPage ────────────────────────────────────────────────────
const ComplianceCriteriaPage = () => {
  const navigate = useNavigate()
  const { setEditCriteria } = useComplianceCriteria()

  // ── Local data state ──────────────────────────────────────────────────────
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  // ── Search / filter (two-phase: typing → applied) ─────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, name: val })), [])

  // ── Fetch from API ────────────────────────────────────────────────────────
  const fetchCriteria = useCallback(async (appliedFilters = {}) => {
    setLoading(true)
    setApiError(null)
    try {
      const res = await GetComplianceCriteriaApi({
        CriteriaName: appliedFilters.name || '',
        Description: appliedFilters.desc || '',
        FinancialRatioName: '',
        PageSize: 100, // load all for client-side 2-col grid
        PageNumber: 0,
      })

      const result = res?.data?.responseResult ?? res?.responseResult

      if (!result?.isExecuted) {
        setApiError('Failed to load compliance criteria.')
        return
      }

      const mapped = (result.complianceCriteria || []).map(mapItem)
      setCriteria(mapped)
      syncSession(mapped)
    } catch (err) {
      console.error('[ComplianceCriteriaPage] fetch error:', err)
      setApiError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchCriteria()
  }, [fetchCriteria])

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setFilters(EMPTY_FILTERS)
    fetchCriteria(next) // re-fetch with server-side filter params
  }, [filters, fetchCriteria])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    fetchCriteria({}) // re-fetch without filters
  }, [fetchCriteria])

  const handleFClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const next = { ...prev }
        delete next[key]
        fetchCriteria(next) // re-fetch after chip removal
        return next
      })
    },
    [fetchCriteria]
  )

  // ── Default toggle (optimistic UI) ───────────────────────────────────────
  /**
   * Flips isDefault for the clicked item; enforces single-default rule
   * (only one criteria can be default at a time).
   *
   * TODO: call the "set default" API endpoint here, then refetch on failure.
   */
  const handleToggleDefault = useCallback((id) => {
    setCriteria((prev) => {
      const updated = prev.map(
        (c) => (c.id === id ? { ...c, isDefault: !c.isDefault } : { ...c, isDefault: false }) // clear other defaults
      )
      syncSession(updated)
      return updated
    })
  }, [])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const openAdd = useCallback(() => {
    setEditCriteria(null)
    navigate('/manager/compliance-criteria/manage')
  }, [navigate, setEditCriteria])

  // const openEdit = useCallback(
  //   (item) => {
  //     // Re-hydrate to the raw-ish shape the manage page expects
  //     setEditCriteria({
  //       id: item.id,
  //       name: item.name,
  //       desc: item.subtitle,
  //       isDefault: item.isDefault,
  //       status: item.status,
  //     })
  //     navigate('/manager/compliance-criteria/manage')
  //   },
  //   [navigate, setEditCriteria]
  // )

  const openViewRatios = useCallback((item) => {
    // TODO: navigate to detail page or open modal for this criteria's financial ratios
    // navigate(`/manager/compliance-criteria/${item.id}/ratios`)
    console.log('[ComplianceCriteriaPage] View Financial Ratios for', item.id)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page header ── */}
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

      {/* ── Body ── */}
      <div>
        {/* Active filter chips */}
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

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            Loading…
          </div>
        )}

        {/* Error */}
        {!loading && apiError && (
          <div className="bg-white rounded-xl border border-red-200 py-14 text-center text-red-400">
            {apiError}
          </div>
        )}

        {/* Empty */}
        {!loading && !apiError && criteria.length === 0 && (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            No Compliance Criteria Found
          </div>
        )}

        {/* 2-column grid of cards */}
        {!loading && !apiError && criteria.length > 0 && (
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
                  // callbacks passed through formula so the card stays prop-clean
                  onToggleDefault: handleToggleDefault,
                  onViewRatios: () => openViewRatios(item),
                }}
                // onEdit={() => openEdit(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ComplianceCriteriaPage
