/**
 * pages/manager/ComplianceCriteriaPage.jsx
 * ==========================================
 * List view for Compliance Criteria.
 * Add / Edit navigation → /compliance-criteria/manage (ManageComplianceCriteriaPage).
 * Data and edit target managed via ComplianceCriteriaContext.
 *
 * TODO: replace INITIAL_CRITERIA with GET /api/manager/compliance-criteria
 */

import React, { useState, useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useComplianceCriteria } from '../../context/ComplianceCriteriaContext'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import FormulaCard from '../../components/common/card/FormulaBuilderListingCard'

// ── Filter config ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = { name: '', desc: '' }
const FILTER_FIELDS = [
  { key: 'name', label: 'Criteria Name', type: 'input', maxLength: 100 },
  { key: 'desc', label: 'Description',   type: 'input', maxLength: 300 },
]
const CHIP_LABELS = { name: 'Criteria Name', desc: 'Description' }

// ── ComplianceCriteriaPage ────────────────────────────────────────────────────
const ComplianceCriteriaPage = () => {
  const navigate = useNavigate()
  const { criteria, setEditCriteria } = useComplianceCriteria()

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch    = filters.name
  const setMainSearch = useCallback(val => setFilters(p => ({ ...p, name: val })), [])

  // ── Derived filtered list ─────────────────────────────────────────────────
  const displayed = useMemo(
    () =>
      criteria.filter(c =>
        Object.entries(applied).every(
          ([k, v]) => !v || (c[k] || '').toLowerCase().includes(v.toLowerCase()),
        ),
      ),
    [criteria, applied],
  )

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => { if (v.trim()) next[k] = v.trim() })
    setApplied(next)
    setFilters(EMPTY_FILTERS)
  }, [filters])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
  }, [])

  const handleFClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(key => {
    setApplied(prev => {
      const n = { ...prev }
      delete n[key]
      return n
    })
  }, [])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const openAdd = () => {
    setEditCriteria(null)
    navigate('/scs/manager/compliance-criteria/manage')
  }

  const openEdit = (item) => {
    setEditCriteria(item)
    navigate('/scs/manager/compliance-criteria/manage')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">

      {/* ── Page header ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">
            Compliance Criteria
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#01C9A4] hover:bg-[#00b392] text-white
                         rounded-lg text-[13px] font-medium transition-colors shrink-0"
            >
              Add Compliance Criteria
            </button>
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
        {/* Filter chips */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k]}: {v}
                <button onClick={() => removeChip(k)} className="hover:text-white/70">
                  <X size={13} />
                </button>
              </span>
            ))}
            {Object.keys(applied).length > 1 && (
              <button
                onClick={handleReset}
                className="text-[12px] font-semibold text-[#E8923A] hover:underline ml-1"
              >
                Clear All
              </button>
            )}
          </div>
        )}

        {/* Criteria accordion — 2-column grid */}
        {displayed.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            No Compliance Criteria Found
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {displayed.map(item => (
              <FormulaCard
                key={item.id}
                variant="criteria"
                formula={{
                  name:      item.name,
                  subtitle:  item.desc,
                  ratios:    item.ratios,
                  isDefault: item.isDefault,
                }}
                onEdit={() => openEdit(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ComplianceCriteriaPage
