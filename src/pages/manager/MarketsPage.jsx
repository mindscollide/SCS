/**
 * src/pages/manager/MarketsPage.jsx
 * ===================================
 * Manager manages the list of stock markets (e.g. PSX, TADAWUL).
 *
 * Fields: Country | Market Full Name | Market Short Name | Status (on edit)
 *
 * Add   → form on top, Save button creates new record
 * Edit  → pre-fills form, Update button → ConfirmModal → saves
 *
 * TODO: GET/POST/PUT /api/manager/markets
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import { MOCK_MARKETS } from '../../utils/mockData.js'
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
import Select from '../../components/common/select/Select'
import Checkbox from '../../components/common/Checkbox/Checkbox'
import { formatChipValue } from '../../utils/helpers'

const COUNTRIES = [
  'Pakistan',
  'Saudi Arabia',
  'UAE',
  'Malaysia',
  'Turkey',
  'Egypt',
  'Jordan',
  'Bahrain',
  'Kuwait',
  'Oman',
]

const EMPTY_FILTERS = { country: '', fullName: '', shortName: '' }

const FILTER_FIELDS = [
  { key: 'country', label: 'Country', type: 'input', maxLength: 50 },
  { key: 'fullName', label: 'Market Full Name', type: 'input', maxLength: 50 },
  { key: 'shortName', label: 'Market Short Name', type: 'input', maxLength: 20 },
]

const CHIP_LABELS = { country: 'Country', fullName: 'Full Name', shortName: 'Short Name' }

const MarketsPage = () => {
  const sourceData = useRef(MOCK_MARKETS)
  const [markets, setMarkets] = useState(MOCK_MARKETS)

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ country: '', fullName: '', shortName: '' })
  const [editing, setEditing] = useState(null)
  const [active, setActive] = useState(true)

  // ── Confirm modal state ───────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(null)

  // ── Search / filter state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.fullName
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, fullName: val })), [])

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('fullName')
  const [sortDir, setSortDir] = useState('asc')

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const isValid = form.country && form.fullName && form.shortName

  const fetchData = useCallback((f) => {
    setMarkets(
      sourceData.current.filter((r) =>
        Object.entries(f).every(([k, v]) => !v || r[k]?.toLowerCase().includes(v.toLowerCase()))
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
      [...markets].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [markets, sortCol, sortDir]
  )

  // ── Add / Edit handlers ───────────────────────────────────────────────────
  const handleSave = () => {
    if (!isValid) return
    if (editing) {
      setPending({ ...form, id: editing, status: active ? 'Active' : 'Inactive' })
      setConfirm(true)
    } else {
      const next = [...sourceData.current, { id: Date.now(), ...form, status: 'Active' }]
      sourceData.current = next
      fetchData(applied)
      toast.success('Record Added Successfully')
      setForm({ country: '', fullName: '', shortName: '' })
    }
  }

  const handleEdit = (m) => {
    setEditing(m.id)
    setForm({ country: m.country, fullName: m.fullName, shortName: m.shortName })
    setActive(m.status === 'Active')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm({ country: '', fullName: '', shortName: '' })
  }

  // ── Column definitions ────────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'country',
        title: 'Country Name',
        sortable: true,
        render: (r) => <span className="font-semibold">{r.country}</span>,
      },
      {
        key: 'fullName',
        title: 'Market Full Name',
        sortable: true,
        align: 'center',
      },
      {
        key: 'shortName',
        title: 'Market Short Name',
        sortable: true,
        align: 'center',
      },

      {
        key: 'edit',
        title: 'Edit',
        render: (r) => <BtnIconEdit onClick={() => handleEdit(r)} />,
      },
      {
        key: 'status',
        title: 'Status',
        align: 'center',
        render: (r) => (
          <span
            className={`font-semibold ${r.status === 'Active' ? 'text-[#4dc792]' : 'text-[#ec4357]'}`}
          >
            {r.status.toLowerCase() === 'active' ? 'Active' : 'In-Active'}
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
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Markets</h1>
          <SearchFilter
            placeholder="Search by market name..."
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
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k] || k}: {formatChipValue(v)}
                <BtnChipRemove onClick={() => removeChip(k)} />
              </span>
            ))}
            {Object.keys(applied).length > 1 && <BtnClearAll onClick={handleReset} />}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Select
                label="Country"
                required
                placeholder="-- Select Country --"
                value={form.country}
                onChange={(v) => set('country', v)}
                options={COUNTRIES}
              />
              <Input
                label="Market Full Name"
                required
                placeholder="e.g. Pakistan Stock Exchange"
                value={form.fullName}
                onChange={(v) => set('fullName', v)}
                maxLength={50}
                showCount
              />
              <Input
                label="Market Short Name"
                required
                placeholder="PSX"
                value={form.shortName}
                onChange={(v) => set('shortName', v.toUpperCase())}
                maxLength={20}
                showCount
              />
            </div>

            {/* Active checkbox — edit mode only */}
            {editing && (
              <Checkbox
                label="Active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="mb-4"
              />
            )}

            <div className="flex justify-end gap-2">
              {editing && <BtnSlate onClick={cancelEdit}>Cancel</BtnSlate>}
              <BtnPrimary disabled={!isValid} onClick={handleSave}>
                {editing ? 'Update' : 'Save'}
              </BtnPrimary>
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
          sourceData.current = sourceData.current.map((m) => (m.id === pending.id ? pending : m))
          fetchData(applied)
          toast.success('Updated Successfully')
          setConfirm(false)
          setPending(null)
          setEditing(null)
          setForm({ country: '', fullName: '', shortName: '' })
        }}
        onNo={() => setConfirm(false)}
      />
    </div>
  )
}

export default MarketsPage
