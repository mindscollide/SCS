/**
 * src/pages/manager/ClassificationsPage.jsx
 * ===========================================
 * Manager manages financial data classifications.
 *
 * SRS Behaviour
 * ─────────────
 * - Classification Name: alphabets only, max 100 chars, required
 * - Description: alphanumeric, optional, max 300 chars
 * - Calculated toggle: if ON → Prorated OFF+disabled, Base cleared+disabled
 * - Prorated toggle: mutually exclusive with Calculated.
 *   If ON → Base Classification dropdown required to save
 * - Save disabled until name entered AND (if prorated) base selected
 * - Unique key: Classification Name
 * - Table: Classification Name | Description | Calculated | Prorated | Base | Edit | Status
 * - Default sort: Classification Name alphabetical
 * - View icon: opens formula modal for any record
 * - Edit: shows Status checkbox; same toggle rules apply
 *
 * TODO: GET/POST/PUT /api/manager/classifications
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { SquarePen, X, Eye, Calculator, Percent } from 'lucide-react'
import { toast } from 'react-toastify'
import { MOCK_CLASSIFICATIONS } from '../../utils/mockData.js'
import { ConfirmModal } from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import Input from '../../components/common/Input/Input'
import Select from '../../components/common/select/Select'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import Toggle from '../../components/common/Toggle/Toggle'
import { FormulaModal } from '../../components/common/Modals/Modals.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────
const ALPHA_ONLY = /^[a-zA-Z\s]*$/
const ALPHANUMERIC = /^[a-zA-Z0-9\s.,\-()]*$/

const EMPTY_FORM = { name: '', desc: '', calculated: false, prorated: false, base: '' }
const EMPTY_FILTERS = { name: '', desc: '' }
const FILTER_FIELDS = [
  { key: 'name', label: 'Classification Name', type: 'input', regex: ALPHA_ONLY, maxLength: 100 },
  { key: 'desc', label: 'Description', type: 'input', maxLength: 300 },
]
const CHIP_LABELS = { name: 'Name', desc: 'Description' }

// ── ClassificationsPage ───────────────────────────────────────────────────────
const ClassificationsPage = () => {
  const sourceData = useRef(MOCK_CLASSIFICATIONS)
  const [items, setItems] = useState(MOCK_CLASSIFICATIONS)

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(null)
  const [active, setActive] = useState(true)

  // ── Modals ────────────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)
  const [viewItem, setViewItem] = useState(null)

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => {
    if (ALPHA_ONLY.test(val) || val === '') setFilters((p) => ({ ...p, name: val }))
  }, [])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // ── Base classification options ───────────────────────────────────────────
  // Only active, non-calculated classifications (exclude current editing item)
  const baseOptions = useMemo(
    () =>
      sourceData.current
        .filter((i) => i.status === 'Active' && !i.calculated && i.id !== editing)
        .map((i) => i.name)
        .sort(),
    [editing]
  )

  // ── Save enabled? ─────────────────────────────────────────────────────────
  const canSave = form.name.trim() && (!form.prorated || form.base)

  // ── Form field helpers ────────────────────────────────────────────────────
  const setCalculated = (val) => {
    setForm((p) => ({
      ...p,
      calculated: val,
      prorated: val ? false : p.prorated,
      base: val ? '' : p.base,
    }))
    if (errors.name) setErrors((p) => ({ ...p, name: '' }))
  }

  const setProrated = (val) => {
    setForm((p) => ({
      ...p,
      prorated: val,
      calculated: val ? false : p.calculated,
      base: val ? p.base : '',
    }))
    if (errors.base) setErrors((p) => ({ ...p, base: '' }))
  }

  const setBase = (val) => {
    setForm((p) => ({ ...p, base: val }))
    if (errors.base) setErrors((p) => ({ ...p, base: '' }))
  }

  // ── Data helpers ──────────────────────────────────────────────────────────
  const fetchData = useCallback((f) => {
    setItems(
      sourceData.current.filter((r) =>
        Object.entries(f).every(
          ([k, v]) => !v || (r[k] || '').toLowerCase().includes(v.toLowerCase())
        )
      )
    )
  }, [])

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    fetchData(next)
    setFilters(EMPTY_FILTERS)
  }, [filters, fetchData])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    fetchData({})
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
      [...items].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [items, sortCol, sortDir]
  )

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Classification Name is required'
    if (form.prorated && !form.base)
      errs.base = 'Base Classification is required when Prorated is ON'
    return errs
  }

  // ── Save / Update ─────────────────────────────────────────────────────────
  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    if (editing) {
      setConfirm(true)
    } else {
      const exists = sourceData.current.some(
        (i) => i.name.toLowerCase() === form.name.trim().toLowerCase()
      )
      if (exists) {
        setErrors({ name: 'Classification Name already exists' })
        return
      }

      const next = [
        ...sourceData.current,
        {
          id: Date.now(),
          name: form.name.trim(),
          desc: form.desc.trim(),
          calculated: form.calculated,
          prorated: form.prorated,
          base: form.base,
          status: 'Active',
        },
      ]
      sourceData.current = next
      fetchData(applied)
      toast.success('Record Added Successfully')
      setForm(EMPTY_FORM)
      setErrors({})
    }
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  // ── Table column definitions ──────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'name',
        title: 'Classification Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#041E66]">{r.name}</span>,
      },
      {
        key: 'desc',
        title: 'Description',
        sortable: true,
        render: (r) => <span className="text-[#a0aec0] text-[12px]">{r.desc || '—'}</span>,
      },
      {
        key: 'calculated',
        title: 'Calculated',
        render: (r) =>
          r.calculated ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0B39B5] text-[11px] font-semibold">
              <Calculator size={11} /> Yes
            </span>
          ) : (
            <span className="text-[#a0aec0] text-[12px]">No</span>
          ),
      },
      {
        key: 'prorated',
        title: 'Prorated',
        render: (r) =>
          r.prorated ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#01C9A4] text-[11px] font-semibold">
              <Percent size={11} /> Yes
            </span>
          ) : (
            <span className="text-[#a0aec0] text-[12px]">No</span>
          ),
      },
      {
        key: 'base',
        title: 'Base Classification',
        render: (r) => <span className="text-[12px] text-[#041E66]">{r.base || '—'}</span>,
      },
      {
        key: 'status',
        title: 'Status',
        render: (r) => (
          <span
            className={`font-semibold text-[13px] ${r.status === 'Active' ? 'text-[#01C9A4]' : 'text-[#E8923A]'}`}
          >
            {r.status}
          </span>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (r) => (
          <div className="flex items-center gap-1">
            <button
              title="View Formula"
              onClick={() => setViewItem(r)}
              className="text-[#01C9A4] hover:bg-teal-50 rounded p-1.5 transition-colors"
            >
              <Eye size={16} />
            </button>
            <button
              title="Edit"
              onClick={() => {
                setEditing(r.id)
                setForm({
                  name: r.name,
                  desc: r.desc || '',
                  calculated: r.calculated,
                  prorated: r.prorated,
                  base: r.base || '',
                })
                setActive(r.status === 'Active')
                setErrors({})
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5 transition-colors"
            >
              <SquarePen size={16} />
            </button>
          </div>
        ),
      },
    ],
    []
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Classifications</h1>
          <SearchFilter
            placeholder="Search by classification name..."
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
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

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="px-5 py-3 border-b border-[#eef2f7]">
            <h3 className="text-[14px] font-semibold text-[#041E66]">
              {editing ? 'Edit Classification' : 'Add Classification'}
            </h3>
          </div>

          <div className="p-5 space-y-4">
            {/* Row 1: Name + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Classification Name"
                required
                maxLength={100}
                showCount
                placeholder="e.g. Total Assets"
                regex={ALPHA_ONLY}
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
            </div>

            {/* Row 2: Toggles + Base */}
            {/*
              items-start: all columns start at the same top.
              Toggle labels (~18px + mb-2) and Select label (~18px + mb-1.5) are
              nearly equal so triggers/switches align naturally.
              The Checkbox (edit-only) uses mt-[26px] to sit at trigger level
              instead of drifting to the top of the row.
            */}
            <div className="flex flex-wrap items-start gap-6">
              <div>
                <p className="text-[12px] font-medium text-[#041E66] mb-2">
                  Calculated Classification
                </p>
                <Toggle
                  checked={form.calculated}
                  onChange={setCalculated}
                  label={form.calculated ? 'ON' : 'OFF'}
                />
              </div>

              <div>
                <p className="text-[12px] font-medium text-[#041E66] mb-2">
                  Prorated Classification
                </p>
                <Toggle
                  checked={form.prorated}
                  onChange={setProrated}
                  disabled={form.calculated}
                  label={form.prorated ? 'ON' : 'OFF'}
                />
              </div>

              <div className="flex-1 min-w-[220px]">
                <Select
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

              {/* Status checkbox — edit only; mt-[26px] aligns with trigger level */}
              {editing && (
                <div className="mt-[26px]">
                  <Checkbox
                    label="Active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-1">
              {editing && (
                <button
                  onClick={cancelEdit}
                  className="px-5 py-2.5 border border-[#dde4ee] rounded-lg text-[13px] font-medium
                             text-[#041E66] hover:bg-[#f8f9ff] transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-5 py-2.5 bg-[#0B39B5] hover:bg-[#0a2e94] text-white rounded-lg
                           text-[13px] font-medium disabled:opacity-40 transition-colors"
              >
                {editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <CommonTable
          columns={COLS}
          data={sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Records Found"
        />
      </div>

      {/* ── Confirm modal ── */}
      <ConfirmModal
        open={confirm}
        message="Are you sure you want to update this record?"
        onYes={() => {
          sourceData.current = sourceData.current.map((i) =>
            i.id === editing
              ? {
                  ...i,
                  name: form.name.trim(),
                  desc: form.desc.trim(),
                  calculated: form.calculated,
                  prorated: form.prorated,
                  base: form.base,
                  status: active ? 'Active' : 'Inactive',
                }
              : i
          )
          fetchData(applied)
          toast.success('Updated Successfully')
          setConfirm(false)
          setEditing(null)
          setForm(EMPTY_FORM)
          setErrors({})
        }}
        onNo={() => setConfirm(false)}
      />

      {/* ── View formula modal ── */}
      <FormulaModal item={viewItem} onClose={() => setViewItem(null)} />
    </div>
  )
}

export default ClassificationsPage
