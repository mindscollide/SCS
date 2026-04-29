/**
 * src/pages/manager/FinancialRatiosPage.jsx
 * ===========================================
 * List view for Financial Ratios.
 * Add / Edit navigation → /financial-ratios/manage (ManageFinancialRatioPage).
 * Data and edit target managed via FinancialRatioContext.
 *
 * TODO: replace INITIAL_RATIOS with GET /api/manager/financial-ratios
 */

import React, { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinancialRatio } from '../../context/FinancialRatioContext'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import FormulaCard from '../../components/common/card/FormulaBuilderListingCard'
import { formatChipValue } from '../../utils/helpers'
import { BtnTeal, BtnChipRemove, BtnClearAll } from '../../components/common'

// ── Filter config ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = { name: '', desc: '' }
const FILTER_FIELDS = [
  { key: 'name', label: 'Ratio Name', type: 'input', maxLength: 100 },
  { key: 'desc', label: 'Description', type: 'input', maxLength: 300 },
]
const CHIP_LABELS = { name: 'Ratio Name', desc: 'Description' }

// ── FinancialRatiosPage ───────────────────────────────────────────────────────
const FinancialRatiosPage = () => {
  const navigate = useNavigate()
  const { ratios, setEditRatio } = useFinancialRatio()

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, name: val })), [])

  // ── Derived filtered list (always from full context ratios) ───────────────
  const displayed = useMemo(
    () =>
      ratios.filter((r) =>
        Object.entries(applied).every(
          ([k, v]) => !v || (r[k] || '').toLowerCase().includes(v.toLowerCase())
        )
      ),
    [ratios, applied]
  )

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setFilters(EMPTY_FILTERS)
  }, [filters])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
  }, [])
  const handleFClose = useCallback(() => setFilters(EMPTY_FILTERS), [])
  const removeChip = useCallback((key) => {
    setApplied((prev) => {
      const n = { ...prev }
      delete n[key]
      return n
    })
  }, [])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const openAdd = () => {
    setEditRatio(null)
    navigate('/manager/financial-ratios/manage')
  }
  const openEdit = (ratio) => {
    setEditRatio(ratio)
    navigate('/manager/financial-ratios/manage')
  }

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
                {CHIP_LABELS[k]}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && (
              <BtnClearAll onClick={handleReset} />
            )}
          </div>
        )}

        {/* Ratio accordion — 2-column grid via FormulaCard */}
        {displayed.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#dde4ee] py-14 text-center text-[#a0aec0]">
            No Financial Ratios Found
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {displayed.map((ratio) => (
              <FormulaCard
                key={ratio.id}
                variant="classifications"
                formula={{
                  name: ratio.name,
                  subtitle: ratio.desc,
                  classifications: ratio.classifications,
                }}
                onEdit={() => openEdit(ratio)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FinancialRatiosPage
