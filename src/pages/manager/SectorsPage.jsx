/**
 * pages/manager/SectorsPage.jsx
 * ================================
 * Manager manages the list of company sectors (e.g. Banking, Cement).
 *
 * SRS Behaviour
 * ─────────────
 * - Sector Name: alphabets only, max 50 chars, required
 * - Save disabled until name entered
 * - New records get Active status by default
 * - Edit: pre-fills name, shows Status checkbox (checked = Active)
 * - Update → ConfirmModal → toast "Updated Successfully"
 * - Default sort: Sector Name alphabetical (asc)
 * - Sortable: Sector Name only
 * - Search: Sector Name only, placeholder "Sector Name"
 * - Unique key: Sector Name
 *
 * TODO: GET/POST/PUT /api/manager/sectors
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { SquarePen, X } from 'lucide-react'
import { toast } from 'react-toastify'
import { MOCK_SECTORS } from '../../utils/mockData.js'
import { ConfirmModal } from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'

// Only alphabets and spaces allowed
const ALPHA_ONLY = /^[a-zA-Z\s]*$/

const EMPTY_FILTERS  = { name: '' }
const FILTER_FIELDS  = [
  { key: 'name', label: 'Sector Name', type: 'input', regex: ALPHA_ONLY, maxLength: 50 },
]

const SectorsPage = () => {
  const sourceData = useRef(MOCK_SECTORS)
  const [sectors, setSectors] = useState(MOCK_SECTORS)

  // ── Form state ────────────────────────────────────────────────────────────
  const [name,    setName]    = useState('')
  const [nameErr, setNameErr] = useState('')
  const [editing, setEditing] = useState(null)
  const [active,  setActive]  = useState(true)

  // ── Confirm modal ─────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)

  // ── Search / filter state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch    = filters.name
  const setMainSearch = useCallback((val) => {
    if (ALPHA_ONLY.test(val) || val === '') setFilters(p => ({ ...p, name: val }))
  }, [])

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // ── Data helpers ──────────────────────────────────────────────────────────
  const fetchData = useCallback((f) => {
    setSectors(
      sourceData.current.filter(r =>
        Object.entries(f).every(([k, v]) => !v || r[k]?.toLowerCase().includes(v.toLowerCase()))
      )
    )
  }, [])

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => { if (v.trim()) next[k] = v.trim() })
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

  const removeChip = useCallback((key) => {
    setApplied(prev => {
      const next = { ...prev }
      delete next[key]
      fetchData(next)
      return next
    })
  }, [fetchData])

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = useCallback((col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }, [sortCol])

  const sorted = useMemo(() =>
    [...sectors].sort((a, b) => {
      const va = (a[sortCol] || '').toLowerCase()
      const vb = (b[sortCol] || '').toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    }),
    [sectors, sortCol, sortDir]
  )

  // ── Name change — alphabets only ──────────────────────────────────────────
  const handleNameChange = (val) => {
    if (!ALPHA_ONLY.test(val)) return
    setName(val)
    if (nameErr && val.trim()) setNameErr('')
  }

  // ── Save / Update ─────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!name.trim()) { setNameErr('Sector Name is required'); return }
    if (editing) {
      setConfirm(true)
    } else {
      // Unique check
      const exists = sourceData.current.some(
        s => s.name.toLowerCase() === name.trim().toLowerCase()
      )
      if (exists) { setNameErr('Sector Name already exists'); return }
      const next = [...sourceData.current, { id: Date.now(), name: name.trim(), status: 'Active' }]
      sourceData.current = next
      fetchData(applied)
      toast.success('Record Added Successfully')
      setName('')
    }
  }

  const cancelEdit = () => {
    setEditing(null)
    setName('')
    setNameErr('')
  }

  // ── Column definitions ────────────────────────────────────────────────────
  const COLS = useMemo(() => [
    {
      key: 'name', title: 'Sector Name', sortable: true,
      render: r => <span className="font-semibold text-[#041E66]">{r.name}</span>,
    },
    {
      key: 'status', title: 'Status',
      render: r => (
        <span className={`font-semibold ${r.status === 'Active' ? 'text-[#01C9A4]' : 'text-[#E8923A]'}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: 'edit', title: 'Edit',
      render: r => (
        <button
          onClick={() => {
            setEditing(r.id)
            setName(r.name)
            setActive(r.status === 'Active')
            setNameErr('')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5 transition-colors"
        >
          <SquarePen size={18} />
        </button>
      ),
    },
  ], [])

  return (
    <div className="font-sans">

      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Sectors</h1>
          <SearchFilter
            placeholder="Search by sector name..."
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
              <span key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]">
                Sector Name: {v}
                <button onClick={() => removeChip(k)} className="hover:text-white/70 transition-colors">
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ── Add / Edit Form ── */}
        <div className="bg-white rounded-xl border border-[#dde4ee] mb-4">
          <div className="px-5 py-3 border-b border-[#eef2f7]">
            <h3 className="text-[14px] font-semibold text-[#041E66]">
              {editing ? 'Edit Sector' : 'Add Sector'}
            </h3>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-4 flex-wrap">

              {/* Sector Name input */}
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                  Sector Name <span className="text-red-500">*</span>
                </label>
                <input
                  maxLength={50}
                  placeholder="e.g. Banking"
                  className={`w-full px-3 py-2.5 border rounded-lg text-[13px] text-[#041E66]
                              focus:outline-none transition-all
                              ${nameErr
                                ? 'border-red-400 focus:border-red-400'
                                : 'border-[#dde4ee] focus:border-[#01C9A4]'}`}
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                />
                <div className="flex justify-between mt-1">
                  {nameErr
                    ? <p className="text-[11px] text-red-500">{nameErr}</p>
                    : <span />
                  }
                  <p className="text-[11px] text-[#a0aec0]">{name.length}/50</p>
                </div>
              </div>

              {/* Status checkbox — edit mode only */}
              {editing && (
                <label className="flex items-center gap-2 mt-7 cursor-pointer text-[13px] text-[#041E66] shrink-0">
                  <input
                    type="checkbox"
                    className="accent-[#01C9A4] w-4 h-4"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                  />
                  Active
                </label>
              )}

              {/* Buttons */}
              <div className="flex items-center gap-2 mt-7 shrink-0">
                {editing && (
                  <button
                    onClick={cancelEdit}
                    className="px-5 py-2.5 border border-[#dde4ee] rounded-lg text-[13px]
                               font-medium text-[#041E66] hover:bg-[#f8f9ff] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="px-5 py-2.5 bg-[#0B39B5] hover:bg-[#0a2e94] text-white
                             rounded-lg text-[13px] font-medium disabled:opacity-40 transition-colors"
                >
                  {editing ? 'Update' : 'Save'}
                </button>
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
          sourceData.current = sourceData.current.map(s =>
            s.id === editing
              ? { ...s, name: name.trim(), status: active ? 'Active' : 'Inactive' }
              : s
          )
          fetchData(applied)
          toast.success('Updated Successfully')
          setConfirm(false)
          setEditing(null)
          setName('')
          setNameErr('')
        }}
        onNo={() => setConfirm(false)}
      />
    </div>
  )
}

export default SectorsPage
