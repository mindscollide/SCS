/**
 * src/pages/manager/QuartersPage.jsx
 * ====================================
 * Manager manages financial quarters.
 *
 * SRS Behaviour
 * ─────────────
 * - Quarter Name: alphanumeric, max 50 chars, required
 * - Start Date: required calendar picker
 * - End Date: required calendar picker, must be >= Start Date
 * - Description: optional, alphanumeric, max 300 chars
 * - Save disabled until all required fields filled
 * - New records get Active status by default
 * - Edit: pre-fills all fields, shows Status checkbox
 * - Update → ConfirmModal → toast "Updated Successfully"
 * - Default sort: Start Date descending
 * - Sortable: Quarter Name, Start Date, End Date, Description
 * - Search: Quarter Name, Start Date, End Date
 * - Search placeholder: Quarter Name (click icon for more options)
 * - Unique keys: Quarter Name | Start Date + End Date
 *
 * TODO: GET/POST/PUT /api/manager/quarters
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { MOCK_QUARTERS } from '../../utils/mockData.js'
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
import Checkbox from '../../components/common/Checkbox/Checkbox'
import DatePicker from '../../components/common/datePicker/DatePicker'
import { formatChipValue } from '../../utils/helpers'

const ALPHANUMERIC = /^[a-zA-Z0-9\s]*$/

const EMPTY_FORM = { name: '', startDate: null, endDate: null, desc: '' }

const EMPTY_FILTERS = { name: '', startDate: null, endDate: null }

const FILTER_FIELDS = [
  { key: 'name', label: 'Quarter Name', type: 'input', maxLength: 50 },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
]

const CHIP_LABELS = { name: 'Quarter Name', startDate: 'Start Date', endDate: 'End Date' }

/** 'yyyy-mm-dd' string → Date object (noon UTC to avoid timezone drift) */
const parseDate = (s) => (s ? new Date(s + 'T12:00:00') : null)

/** Date object → 'yyyy-mm-dd' string for storage */
const toYMD = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : ''

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/** 'yyyy-mm-dd' string → '09 Apr 2026' for table display */
const fmt = (d) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day} ${MONTH_ABBR[parseInt(m, 10) - 1]} ${y}`
}

const QuartersPage = () => {
  const sourceData = useRef(MOCK_QUARTERS)
  const [quarters, setQuarters] = useState(MOCK_QUARTERS)

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(null)
  const [active, setActive] = useState(true)

  // ── Confirm modal ─────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)

  // ── Search / filter state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.name
  const setMainSearch = useCallback((val) => {
    setFilters((p) => ({ ...p, name: val }))
  }, [])

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('startDate')
  const [sortDir, setSortDir] = useState('desc')

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const isValid = form.name.trim() && form.startDate && form.endDate

  // ── Data helpers ──────────────────────────────────────────────────────────
  const fetchData = useCallback((f) => {
    setQuarters(
      sourceData.current.filter((r) =>
        Object.entries(f).every(([k, v]) => {
          if (!v) return true
          // Date filter: convert to 'yyyy-mm-dd' and compare against stored string
          if (v instanceof Date) return (r[k] || '').includes(toYMD(v))
          return (r[k] || '').toLowerCase().includes(v.toLowerCase())
        })
      )
    )
  }, [])

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v instanceof Date) next[k] = v
      else if (typeof v === 'string' && v.trim()) next[k] = v.trim()
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
      [...quarters].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [quarters, sortCol, sortDir]
  )

  // ── Validate ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Quarter Name is required'
    if (!form.startDate) errs.startDate = 'Start Date is required'
    if (!form.endDate) errs.endDate = 'End Date is required'
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      errs.endDate = 'End Date must be greater than or equal to Start Date'
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
      // Unique check — Quarter Name
      const nameExists = sourceData.current.some(
        (q) => q.name.toLowerCase() === form.name.trim().toLowerCase()
      )
      if (nameExists) {
        setErrors({ name: 'Quarter Name already exists' })
        return
      }

      // Unique check — Start + End Date combo (compare as 'yyyy-mm-dd' strings)
      const startYMD = toYMD(form.startDate)
      const endYMD = toYMD(form.endDate)
      const dateExists = sourceData.current.some(
        (q) => q.startDate === startYMD && q.endDate === endYMD
      )
      if (dateExists) {
        setErrors({ endDate: 'A quarter with this date range already exists' })
        return
      }

      const next = [
        ...sourceData.current,
        {
          id: Date.now(),
          name: form.name.trim(),
          startDate: startYMD,
          endDate: endYMD,
          desc: form.desc.trim(),
          status: 'Active',
        },
      ]
      sourceData.current = next
      fetchData(applied)
      toast.success('Record Added Successfully')
      setForm(EMPTY_FORM)
    }
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  // ── Column definitions ────────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'name',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold text-[#041E66]">{r.name}</span>,
      },
      {
        key: 'desc',
        title: 'Description',
        sortable: true,
        render: (r) => <span className="text-[#4A5568]">{r.desc || '—'}</span>,
      },
      {
        key: 'startDate',
        title: 'Start Date',
        sortable: true,
        render: (r) => <span className="text-[#2f20b0]">{fmt(r.startDate)}</span>,
      },
      {
        key: 'endDate',
        title: 'End Date',
        sortable: true,
        render: (r) => <span className="text-[#2f20b0]">{fmt(r.endDate)}</span>,
      },
      {
        key: 'edit',
        title: 'Edit',
        render: (r) => (
          <BtnIconEdit onClick={() => {
              setEditing(r.id)
              setForm({
                name: r.name,
                startDate: parseDate(r.startDate),
                endDate: parseDate(r.endDate),
                desc: r.desc || '',
              })
              setActive(r.status === 'Active')
              setErrors({})
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }} />
        ),
      },
      {
        key: 'status',
        title: 'Status',
        render: (r) => (
          <span
            className={`font-semibold ${r.status === 'Active' ? 'text-[#01C9A4]' : 'text-[#E8923A]'}`}
          >
            {r.status}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Quarters</h1>
          <SearchFilter
            placeholder="Search by quarter name..."
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
                {CHIP_LABELS[k]}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && (
              <BtnClearAll onClick={handleReset} />
            )}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="px-5 py-3 border-b border-[#eef2f7]">
            <h3 className="text-[14px] font-semibold text-[#041E66]">
              {editing ? 'Edit Quarter' : 'Add Quarter'}
            </h3>
          </div>

          <div className="p-5">
            {/* Row 1: Name | Start Date | End Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Quarter Name"
                required
                placeholder="e.g. December 2025"
                value={form.name}
                onChange={(v) => set('name', v)}
                maxLength={50}
                showCount
                error={!!errors.name}
                errorMessage={errors.name}
              />
              <div>
                <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={form.startDate}
                  onChange={(d) => set('startDate', d)}
                  placeholder="dd mmm yyyy"
                  error={errors.startDate}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                  End Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={form.endDate}
                  onChange={(d) => set('endDate', d)}
                  placeholder="dd mmm yyyy"
                  error={errors.endDate}
                />
              </div>
            </div>

            {/* Row 2: Description */}
            <div className="mb-4">
              <Input
                label="Description"
                placeholder="e.g. Q1 FY2025-26"
                value={form.desc}
                onChange={(v) => set('desc', v)}
                maxLength={300}
                showCount
              />
            </div>

            {/* Active checkbox — edit mode only + buttons */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                {editing && (
                  <Checkbox
                    label="Active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                )}
              </div>
              <div className="flex gap-2">
                {editing && <BtnSlate onClick={cancelEdit}>Cancel</BtnSlate>}
                <BtnPrimary disabled={!isValid} onClick={handleSave}>
                  {editing ? 'Update' : 'Save'}
                </BtnPrimary>
              </div>
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

      <ConfirmModal
        open={!!confirm}
        message="Are you sure you want to update this record?"
        onYes={() => {
          sourceData.current = sourceData.current.map((q) =>
            q.id === editing
              ? {
                  ...q,
                  name: form.name.trim(),
                  startDate: toYMD(form.startDate),
                  endDate: toYMD(form.endDate),
                  desc: form.desc.trim(),
                  status: active ? 'Active' : 'Inactive',
                }
              : q
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
    </div>
  )
}

export default QuartersPage
