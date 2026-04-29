/**
 * FormulaListView.jsx
 * ====================
 * Displays saved formulas as a searchable 2-column card grid.
 *
 * Props:
 *  formulas {Array}    — array of formula objects to display
 *  onAdd    {Function} — called when "Add Formula" button clicked
 *  onEdit   {Function} — called with formula object when edit icon clicked
 *
 * Usage:
 *  import FormulaListView from "../../components/common/formulaBuilder/FormulaListView";
 *
 *  <FormulaListView
 *    formulas={formulas}
 *    onAdd={handleAdd}
 *    onEdit={handleEdit}
 *  />
 */

import React, { useState, useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import SearchFilter from '../searchFilter/SearchFilter'
import FormulaCard from '../card/FormulaBuilderListingCard'
import { BtnTeal, BtnChipRemove } from '../index.jsx'

// ── Constants ─────────────────────────────────────────
const EMPTY_FILTERS = { name: '' }

// ─────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────

const FormulaListView = ({ formulas = [], onAdd, onEdit }) => {
  // ── Search + Filter state ────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Accordion — only one card expanded at a time ─────
  const [expandedId, setExpandedId] = useState(null)
  const handleToggle = useCallback(
    (id) => setExpandedId((prev) => (prev === id ? null : id)),
    []
  )

  const mainSearch = filters.name
  const setMainSearch = useCallback((v) => setFilters((p) => ({ ...p, name: v })), [])

  // ── Handlers ────────────────────────────────────────

  const handleSearch = useCallback(() => {
    const next = {}
    if (filters.name.trim()) next.name = filters.name.trim()
    setApplied(next)
    setFilters(EMPTY_FILTERS)
  }, [filters])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
  }, [])

  // ── Filtered + sorted formulas ───────────────────────
  const filtered = useMemo(
    () =>
      [...formulas]
        .filter((f) => !applied.name || f.name.toLowerCase().includes(applied.name.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [formulas, applied]
  )

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* ── Page heading + controls ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Formula Builder</h1>
          <div className="flex items-center gap-2">
            {/* Add Formula button */}
            <BtnTeal onClick={onAdd} className="flex items-center gap-1.5 shrink-0">
              <Plus size={14} /> Add Formula
            </BtnTeal>

            {/* Search filter */}
            <SearchFilter
              placeholder="Search by name..."
              mainSearch={mainSearch}
              setMainSearch={setMainSearch}
              filters={filters}
              setFilters={setFilters}
              fields={[
                {
                  key: 'name',
                  label: 'Formula Name',
                  type: 'input',
                  maxLength: 100,
                },
              ]}
              onSearch={handleSearch}
              onReset={handleReset}
              onFilterClose={handleReset}
            />
          </div>
        </div>
      </div>

      <div className="  mb-5">
        {/* ── Active search chip ── */}
        {applied.name && (
          <div className="flex items-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                             text-[12px] font-medium text-white bg-[#01C9A4]"
            >
              Name: {applied.name}
              <BtnChipRemove onClick={handleReset} />
            </span>
          </div>
        )}

        {/* ── Formula cards ── */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-[#a0aec0] text-[13px]">
            No formulas found. Click "Add Formula" to create one.
          </div>
        ) : (
          /* Two independent flex columns so expanding one card never stretches its row-neighbour */
          <div className="flex gap-4 items-start">
            {/* Left column — even indices */}
            <div className="flex flex-col gap-4 flex-1">
              {filtered.filter((_, i) => i % 2 === 0).map((f) => (
                <FormulaCard
                  key={f.id}
                  formula={f}
                  onEdit={onEdit}
                  expanded={expandedId === f.id}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            {/* Right column — odd indices */}
            <div className="flex flex-col gap-4 flex-1">
              {filtered.filter((_, i) => i % 2 === 1).map((f) => (
                <FormulaCard
                  key={f.id}
                  formula={f}
                  onEdit={onEdit}
                  expanded={expandedId === f.id}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FormulaListView
