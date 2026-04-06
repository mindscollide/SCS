/**
 * pages/manager/SuspendedCompaniesPage.jsx
 * ==========================================
 * Suspended Companies — Manager Configuration page.
 *
 * UI style matches FinancialRatiosPage / ComplianceCriteriaPage:
 *  ▸ bg-[#EFF3FF] header band  — title left, SearchFilter right
 *  ▸ bg-[#EFF3FF] content card — form section (border-b) + CommonTable
 *
 * ALL interactive elements come from src/components/common/:
 *  Select       → common/select/Select.jsx
 *  BtnTeal      → common/index.jsx
 *  BtnSlate     → common/index.jsx
 *  ConfirmModal → common/index.jsx
 *  SearchFilter → common/searchFilter/SearchFilter.jsx
 *  CommonTable  → common/table/NormalTable.jsx
 *
 * Behaviour (SRS §10.3):
 *  ▸ Inline form (top of card):
 *      Company *       — Select dropdown (required)
 *      From Quarter *  — Select dropdown (required)
 *      To Quarter      — Select dropdown (optional; must be ≥ From Quarter)
 *      Save / Update   — BtnTeal; label switches when in edit mode
 *      Cancel          — BtnSlate; appears in edit mode only
 *  ▸ Table: Company Name (sort) | From Quarter (sort) | To Quarter (sort)
 *           | Edit (SquarePen) | Delete (Trash2)
 *  ▸ Edit    — pencil fills inline form, button becomes "Update"
 *  ▸ Delete  — Trash2 → ConfirmModal → confirmed remove
 *  ▸ Validation:
 *       Company required
 *       From Quarter required
 *       To Quarter (if set) must be ≥ From Quarter chronologically
 *       Error message: "Must be greater than from Quarter"
 *  ▸ Live search — SearchFilter (showFilterPanel=false) filters by company name
 *
 * TODO: replace INITIAL_SUSPENDED / COMPANY_OPTIONS / QUARTER_OPTIONS
 *       with API calls:  GET /api/manager/suspended-companies
 *                        GET /api/manager/companies
 *                        GET /api/manager/quarters
 *       on Save   → POST   /api/manager/suspended-companies
 *       on Update → PUT    /api/manager/suspended-companies/:id
 *       on Delete → DELETE /api/manager/suspended-companies/:id
 */

import React, { useState, useMemo, useCallback } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { ConfirmModal, BtnTeal, BtnSlate } from '../../components/common/index.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter.jsx'
import Select from '../../components/common/select/Select.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'

import {
  INVESTMENT_COMPANY_NAMES as COMPANY_OPTIONS,
  SUSPENDED_QUARTER_STRINGS as QUARTER_OPTIONS,
  INITIAL_SUSPENDED_COMPANIES as INITIAL_SUSPENDED,
} from '../../data/mockData.js'

// ── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = { company: '', fromQuarter: '', toQuarter: '' }

// ── Quarter comparison ────────────────────────────────────────────────────────
// QUARTER_OPTIONS is newest→oldest (smaller index = newer/later quarter).
// Returns true when 'candidate' is the same quarter or LATER than 'reference'.
const isQuarterGTE = (candidate, reference) => {
  if (!candidate || !reference) return true
  const ci = QUARTER_OPTIONS.indexOf(candidate)
  const ri = QUARTER_OPTIONS.indexOf(reference)
  if (ci === -1 || ri === -1) return true
  return ci <= ri // smaller index = newer
}

// ─────────────────────────────────────────────────────────────────────────────

const SuspendedCompaniesPage = () => {
  // ── Data ──────────────────────────────────────────────────────────────
  const [data, setData] = useState(INITIAL_SUSPENDED)

  // ── Inline form ───────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editingId, setEditingId] = useState(null) // null = add, id = edit

  // ── SearchFilter state ─────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({})

  // ── Sort ───────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // ── Delete modal ───────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED — filtered + sorted list
  // ─────────────────────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q ? data.filter((r) => r.company.toLowerCase().includes(q)) : [...data]

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'fromQuarter' || sortCol === 'toQuarter') {
        // Chronological: smaller index in QUARTER_OPTIONS = newer
        const ai = QUARTER_OPTIONS.indexOf(a[sortCol])
        const bi = QUARTER_OPTIONS.indexOf(b[sortCol])
        const av = ai === -1 ? 999 : ai
        const bv = bi === -1 ? 999 : bi
        return (av - bv) * dir
      }
      return (a[sortCol] || '').localeCompare(b[sortCol] || '') * dir
    })
    return list
  }, [data, search, sortCol, sortDir])

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /** Update a single form field and clear its error */
  const setF = useCallback((key, val) => {
    setForm((p) => ({ ...p, [key]: val }))
    setErrors((p) => ({ ...p, [key]: '' }))
  }, [])

  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  /** Validate form — returns errors object (empty = valid) */
  const validate = useCallback(() => {
    const errs = {}
    if (!form.company) errs.company = 'Company is required'
    if (!form.fromQuarter) errs.fromQuarter = 'From Quarter is required'
    if (form.toQuarter && !isQuarterGTE(form.toQuarter, form.fromQuarter)) {
      errs.toQuarter = 'Must be greater than from Quarter'
    }
    return errs
  }, [form])

  /** Add mode — Save */
  const handleSave = useCallback(() => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setData((prev) => [
      ...prev,
      {
        id: Date.now(),
        company: form.company,
        fromQuarter: form.fromQuarter,
        toQuarter: form.toQuarter,
      },
    ])
    setForm(EMPTY_FORM)
    setErrors({})
    toast.success('Record Added Successfully')
  }, [form, validate])

  /** Edit mode — Update */
  const handleUpdate = useCallback(() => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setData((prev) =>
      prev.map((r) =>
        r.id === editingId
          ? {
              ...r,
              company: form.company,
              fromQuarter: form.fromQuarter,
              toQuarter: form.toQuarter,
            }
          : r
      )
    )
    setForm(EMPTY_FORM)
    setErrors({})
    setEditingId(null)
    toast.success('Record Updated Successfully')
  }, [form, editingId, validate])

  /** Click edit icon — populate form */
  const handleEdit = useCallback((row) => {
    setForm({ company: row.company, fromQuarter: row.fromQuarter, toQuarter: row.toQuarter })
    setErrors({})
    setEditingId(row.id)
  }, [])

  /** Cancel edit — back to add mode */
  const handleCancelEdit = useCallback(() => {
    setForm(EMPTY_FORM)
    setErrors({})
    setEditingId(null)
  }, [])

  /** Confirm delete */
  const handleDeleteConfirm = useCallback(() => {
    if (editingId === deleteTarget.id) handleCancelEdit()
    setData((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    setDeleteTarget(null)
    toast.success('Record Deleted Successfully')
  }, [deleteTarget, editingId, handleCancelEdit])

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
      },
      {
        key: 'fromQuarter',
        title: 'From Quarter',
        sortable: true,
        render: (row) => <span className="text-[#041E66]">{row.fromQuarter || '—'}</span>,
      },
      {
        key: 'toQuarter',
        title: 'To Quarter',
        sortable: true,
        render: (row) => <span className="text-[#041E66]">{row.toQuarter || '—'}</span>,
      },
      {
        key: '_edit',
        title: 'Edit',
        render: (row) => (
          <button
            type="button"
            onClick={() => handleEdit(row)}
            className="text-[#0B39B5] hover:text-[#041E66] transition-colors"
            title="Edit"
          >
            <SquarePen size={16} />
          </button>
        ),
      },
      {
        key: '_delete',
        title: 'Delete',
        render: (row) => (
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        ),
      },
    ],
    [handleEdit]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const isEditing = editingId !== null

  return (
    <div className="font-sans">
      {/* ── Header band — matches FinancialRatiosPage / ComplianceCriteriaPage ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Suspended Companies</h1>
          {/* SearchFilter (showFilterPanel=false) → search input only, no filter panel */}
          <SearchFilter
            placeholder="Search by company..."
            mainSearch={search}
            setMainSearch={setSearch}
            showFilterPanel={false}
            filters={filters}
            setFilters={setFilters}
            onSearch={() => {}}
            onReset={() => setSearch('')}
          />
        </div>
      </div>

      {/* ── Main card — form + table ── */}
      <div className="bg-[#EFF3FF] rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Inline form ── */}
        <div className="px-4 pt-4 pb-7 border-b border-slate-200">
          {/*
            4-column grid — items-start so triggers always align at the same vertical
            position regardless of which fields have validation error messages showing.
            pb-7 gives room for the absolutely-positioned error messages below triggers.
          */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
            {/* Company — Select from common/select/Select.jsx */}
            <Select
              label="Company"
              required
              placeholder="Select Company"
              options={COMPANY_OPTIONS}
              value={form.company}
              onChange={(v) => setF('company', v)}
              error={!!errors.company}
              errorMessage={errors.company}
            />

            {/* From Quarter — Select from common/select/Select.jsx */}
            <Select
              label="From Quarter Name"
              required
              placeholder="Select Quarter Name"
              options={QUARTER_OPTIONS}
              value={form.fromQuarter}
              onChange={(v) => {
                setF('fromQuarter', v)
                // Re-validate To Quarter when From Quarter changes
                if (form.toQuarter && !isQuarterGTE(form.toQuarter, v)) {
                  setErrors((p) => ({ ...p, toQuarter: 'Must be greater than from Quarter' }))
                } else {
                  setErrors((p) => ({ ...p, toQuarter: '' }))
                }
              }}
              error={!!errors.fromQuarter}
              errorMessage={errors.fromQuarter}
            />

            {/* To Quarter — Select from common/select/Select.jsx */}
            <Select
              label="To Quarter Name"
              placeholder="Select To Quarter Name"
              options={QUARTER_OPTIONS}
              value={form.toQuarter}
              onChange={(v) => {
                setF('toQuarter', v)
                if (v && form.fromQuarter && !isQuarterGTE(v, form.fromQuarter)) {
                  setErrors((p) => ({ ...p, toQuarter: 'Must be greater than from Quarter' }))
                }
              }}
              error={!!errors.toQuarter}
              errorMessage={errors.toQuarter}
            />

            {/* Action buttons — phantom label spacer aligns buttons with Select triggers */}
            <div>
              {/* Matches Select label height (text-[12px] + mb-1.5) so triggers line up */}
              <div className="h-[18px] mb-1.5" />
              <div className="flex items-center gap-2">
                {isEditing && <BtnSlate onClick={handleCancelEdit}>Cancel</BtnSlate>}
                <BtnTeal onClick={isEditing ? handleUpdate : handleSave}>
                  {isEditing ? 'Update' : 'Save'}
                </BtnTeal>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table — CommonTable from common/table/NormalTable.jsx ── */}
        <CommonTable
          columns={columns}
          data={displayed}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Record Found"
          headerBg="#E0E6F6"
          rowBg="#ffffff"
          rowHoverBg="#f8fafc"
        />
      </div>

      {/* ── ConfirmModal from common/index.jsx ── */}
      <ConfirmModal
        open={!!deleteTarget}
        message="Are you sure you want to do this action?"
        onYes={handleDeleteConfirm}
        onNo={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default SuspendedCompaniesPage
