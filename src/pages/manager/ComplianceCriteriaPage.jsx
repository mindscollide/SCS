/**
 * src/pages/manager/ComplianceCriteriaPage.jsx
 */

import React, { useState, useEffect, useCallback } from 'react'
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
  GetComplianceCriteriaByIDApi, // ← NEW
} from '../../services/manager.service'
import arrowUp from '../../../public/arrowup-icon.png'
import arrowDown from '../../../public/arrowdown-icon.png'

// ── Filter config ─────────────────────────────────────────────────────────────
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

const syncSession = (criteria) => {
  const defaults = criteria
    .filter((c) => c.isDefault)
    .map(({ id, name }) => ({ pK_ComplianceCriteriaID: id, criteriaName: name }))
  try {
    sessionStorage.setItem('compliance_criteria', JSON.stringify(defaults))
  } catch (_) {}
}

// ── Financial Ratio Modal ─────────────────────────────────────────────────────
const FinancialRatioModal = ({ open, loading, criteriaName, ratios, onClose }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
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

        {/* Body */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="py-12 text-center text-[#a0aec0] text-[13px]">Loading…</div>
          ) : (
            <div className=" overflow-hidden">
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
                        className=" border-[#fff] border-y-4 bg-[#f8f9ff]"
                      >
                        {/* Financial Ratio Name */}
                        <td className="px-5 py-3 font-medium text-[#000]">
                          {r.financialRatioName ?? r.ratioName ?? ''}
                        </td>

                        {/* Sequence */}
                        <td className="px-5 py-3 text-[#000]  flex justify-center">
                          {r.sequence ?? r.seq ?? ''}
                        </td>

                        {/* Threshold value with arrow icon */}
                        <td className="px-5 py-3">
                          <span className="flex  justify-center items-center gap-1.5 text-[#000]">
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
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, name: val })), [])

  // ── View Financial Ratios modal state ─────────────────────────────────────
  const [ratioModal, setRatioModal] = useState({
    open: false,
    loading: false,
    criteriaName: '',
    ratios: [],
  })

  // ── Confirm modal state ───────────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({ open: false, pendingId: null })

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchCriteria = useCallback(async (appliedFilters = {}) => {
    setLoading(true)
    setApiError(null)
    try {
      const res = await GetComplianceCriteriaApi({
        CriteriaName: appliedFilters.name || '',
        Description: appliedFilters.desc || '',
        FinancialRatioName: '',
        PageSize: 100,
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
    } catch {
      setApiError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [])

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
    fetchCriteria(next)
  }, [filters, fetchCriteria])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    fetchCriteria({})
  }, [fetchCriteria])

  const handleFClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const next = { ...prev }
        delete next[key]
        fetchCriteria(next)
        return next
      })
    },
    [fetchCriteria]
  )

  // ── View Financial Ratios — fetch by ID, open modal ───────────────────────
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

  // ── Edit — fetch by ID, populate context, navigate ───────────────────────
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

          /*
           * Map ratioMappings → the local row shape ManageComplianceCriteriaPage uses:
           *   { id, ratioId, ratioName, seq, unit, threshold, type }
           */
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

  // ── Default toggle ────────────────────────────────────────────────────────
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
      if (!result?.isExecuted) return
      fetchCriteria(applied)
    } catch {
      console.error('[ComplianceCriteriaPage] set-default error')
    }
  }, [confirmModal, fetchCriteria, applied])

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

        {loading && (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            Loading…
          </div>
        )}

        {!loading && apiError && (
          <div className="bg-white rounded-xl border border-red-200 py-14 text-center text-red-400">
            {apiError}
          </div>
        )}

        {!loading && !apiError && criteria.length === 0 && (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            No Compliance Criteria Found
          </div>
        )}

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
                  onToggleDefault: handleToggleDefault,
                  onViewRatios: () => openViewRatios(item), // ← triggers modal
                }}
                onEdit={() => openEdit(item)} // ← fetches by ID then navigates
              />
            ))}
          </div>
        )}
      </div>

      {/* Financial Ratio modal */}
      <FinancialRatioModal
        open={ratioModal.open}
        loading={ratioModal.loading}
        criteriaName={ratioModal.criteriaName}
        ratios={ratioModal.ratios}
        onClose={() => setRatioModal({ open: false, loading: false, criteriaName: '', ratios: [] })}
      />

      {/* Set-default confirmation */}
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
