/**
 * src/pages/dataentry/MarketCapEntryPage.jsx
 * ============================================
 * Data Entry officer enters / edits quarterly Market Capitalization values.
 *
 * SRS:
 *  - Quarter Name (required, last active quarter by default)
 *  - Company Name (required, disabled until Quarter selected)
 *  - Market Capitalization (required, positive number 999,999,999.99 format)
 *  - Save disabled until all fields filled
 *  - Upload Market Capitalization button → Excel upload with Quarter selection
 *  - Table: Quarter Name, Ticker, Company Name, Sector, Market Cap, Edit, Delete
 *  - Default sort: Quarter Name desc + Ticker + Company Name alpha
 *  - Sortable: all columns except Edit/Delete
 *  - Search: Quarter Name placeholder, filter icon for more options
 *  - Company dropdown excludes already-added companies for selected quarter
 *  - Edit loads record into form (Save → Update)
 *  - Delete with confirmation
 *
 * TODO: connect to real API
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Upload } from 'lucide-react'
import Select from '../../components/common/select/Select.jsx'
import Input from '../../components/common/Input/Input.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import {
  ConfirmModal,
  BtnPrimary,
  BtnGold,
  BtnTeal,
  BtnIconEdit,
  BtnIconDelete,
  BtnModalClose,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import { REPORT_QUARTER_STRINGS, COMPANIES } from '../../data/mockData.js'
import { toast } from 'react-toastify'
import { formatChipValue } from '../../utils/helpers'

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_COMPANIES = COMPANIES.filter((c) => c.status === 'Active')
const ALL_COMPANY_OPTIONS = ACTIVE_COMPANIES.map((c) => ({
  label: `${c.ticker} – ${c.name}`,
  value: String(c.id),
}))

const DEFAULT_QUARTER = REPORT_QUARTER_STRINGS[1] // last active = September 2025

const EMPTY_FILTERS = { ticker: '', company: '', sector: '' }
const FILTER_FIELDS = [
  { key: 'ticker', label: 'Ticker', type: 'input', maxLength: 20 },
  { key: 'company', label: 'Company Name', type: 'input', maxLength: 100 },
  { key: 'sector', label: 'Sector', type: 'input', maxLength: 50 },
]
const CHIP_LABELS = { ticker: 'Ticker', company: 'Company', sector: 'Sector' }

// ── Helpers ───────────────────────────────────────────────────────────────────

let _nextId = 1000
const nextId = () => ++_nextId

const findCompany = (id) => ACTIVE_COMPANIES.find((c) => String(c.id) === String(id))

const formatCap = (raw) => {
  const digits = raw.replace(/[^\d.]/g, '')
  const num = parseFloat(digits)
  if (isNaN(num)) return raw
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────────────────────

const MarketCapEntryPage = () => {
  // ── Form state ────────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState(DEFAULT_QUARTER)
  const [companyId, setCompanyId] = useState('')
  const [cap, setCap] = useState('')
  const [editingId, setEditingId] = useState(null) // null = add mode

  // ── Records (table) ───────────────────────────────────────────────────────
  const [records, setRecords] = useState([])

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('quarter')
  const [sortDir, setSortDir] = useState('desc')
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

  // ── Search ────────────────────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v?.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setFilters(EMPTY_FILTERS)
  }, [filters])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setMainSearch('')
  }, [])

  const removeChip = useCallback((key) => {
    setApplied((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Upload modal ──────────────────────────────────────────────────────────
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadQuarter, setUploadQuarter] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const fileInputRef = useRef(null)

  // ── Derived: company options excluding already-added for selected quarter ─
  const usedCompanyIds = useMemo(
    () =>
      new Set(
        records
          .filter((r) => r.quarter === quarter && r.id !== editingId)
          .map((r) => String(r.companyId))
      ),
    [records, quarter, editingId]
  )

  const companyOptions = useMemo(
    () => ALL_COMPANY_OPTIONS.filter((o) => !usedCompanyIds.has(o.value)),
    [usedCompanyIds]
  )

  // ── Form validation ───────────────────────────────────────────────────────
  const canSave = !!quarter && !!companyId && !!cap.trim()

  // ── Filtered + sorted displayed records ───────────────────────────────────
  const displayed = useMemo(() => {
    const f = { ...applied }
    if (mainSearch.trim()) f.quarter = mainSearch.trim()

    const filtered = records.filter((r) => {
      if (f.quarter && !r.quarter?.toLowerCase().includes(f.quarter.toLowerCase())) return false
      if (f.ticker && !r.ticker?.toLowerCase().includes(f.ticker.toLowerCase())) return false
      if (f.company && !r.company?.toLowerCase().includes(f.company.toLowerCase())) return false
      if (f.sector && !r.sector?.toLowerCase().includes(f.sector.toLowerCase())) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      const va = (a[sortCol] ?? '').toString().toLowerCase()
      const vb = (b[sortCol] ?? '').toString().toLowerCase()
      const cmp = va.localeCompare(vb)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [records, applied, mainSearch, sortCol, sortDir])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setCompanyId('')
    setCap('')
    setEditingId(null)
  }, [])

  const handleQuarterChange = useCallback((v) => {
    setQuarter(v)
    setCompanyId('')
    setCap('')
    setEditingId(null)
  }, [])

  const handleSave = useCallback(() => {
    if (!canSave) return
    const co = findCompany(companyId)
    if (!co) return

    const formatted = formatCap(cap)

    if (editingId !== null) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                quarter,
                companyId,
                ticker: co.ticker,
                company: co.name,
                sector: co.sector,
                cap: formatted,
              }
            : r
        )
      )
      toast.success('Record Updated Successfully')
    } else {
      setRecords((prev) => [
        ...prev,
        {
          id: nextId(),
          quarter,
          companyId,
          ticker: co.ticker,
          company: co.name,
          sector: co.sector,
          cap: formatted,
        },
      ])
      toast.success('Record Added Successfully')
    }
    resetForm()
  }, [canSave, editingId, quarter, companyId, cap, resetForm])

  const handleEdit = useCallback((row) => {
    setQuarter(row.quarter)
    setCompanyId(String(row.companyId))
    setCap(row.cap)
    setEditingId(row.id)
  }, [])

  const handleDelete = useCallback(() => {
    setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    toast.success('Record Deleted Successfully')
    setDeleteTarget(null)
  }, [deleteTarget])

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleUploadClick = () => {
    setUploadedFile(null)
    setUploadQuarter('')
    fileInputRef.current?.click()
  }

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Incompatible File Format')
      return
    }
    setUploadedFile(file)
    setUploadModal(true)
  }

  const handleUploadProceed = useCallback(() => {
    if (!uploadQuarter) return
    const alreadyUploaded = records.some(
      (r) => r.quarter === uploadQuarter && r.source === 'upload'
    )
    if (alreadyUploaded) {
      toast.error('File Already Uploaded')
      setUploadModal(false)
      return
    }
    // Mock: add 3 sample rows from "Excel"
    const newRows = ACTIVE_COMPANIES.slice(0, 3).map((co) => ({
      id: nextId(),
      quarter: uploadQuarter,
      companyId: co.id,
      ticker: co.ticker,
      company: co.name,
      sector: co.sector,
      cap: '10,000.00',
      source: 'upload',
    }))
    setRecords((prev) => [...prev, ...newRows])
    toast.success('File Uploaded Successfully')
    setUploadModal(false)
    setUploadedFile(null)
    setUploadQuarter('')
  }, [uploadQuarter, records])

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'quarter',
      title: 'Quarter Name',
      sortable: true,
      render: (row) => (
        <span className="bg-[#E0E6F6] text-[#0B39B5] px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
          {row.quarter}
        </span>
      ),
    },
    {
      key: 'ticker',
      title: 'Ticker',
      sortable: true,
      render: (row) => <span className="font-mono font-bold text-[#041E66]">{row.ticker}</span>,
    },
    {
      key: 'company',
      title: 'Company Name',
      sortable: true,
      render: (row) => <span className="text-[#0B39B5] font-medium">{row.company}</span>,
    },
    {
      key: 'sector',
      title: 'Sector',
      sortable: true,
    },
    {
      key: 'cap',
      title: 'Market Capitalization',
      sortable: true,
      render: (row) => <span className="text-right block text-[#041E66]">{row.cap}</span>,
    },
    {
      key: '_edit',
      title: 'Edit',
      sortable: false,
      render: (row) => <BtnIconEdit size={14} onClick={() => handleEdit(row)} />,
    },
    {
      key: '_delete',
      title: 'Delete',
      sortable: false,
      render: (row) => <BtnIconDelete onClick={() => setDeleteTarget(row)} />,
    },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* ── Header band: title + search ── */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                      flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Market Capitalization</h1>
        <SearchFilter
          placeholder="Search by Quarter Name"
          mainSearch={mainSearch}
          setMainSearch={setMainSearch}
          filters={filters}
          setFilters={setFilters}
          fields={FILTER_FIELDS}
          onSearch={handleSearch}
          onReset={handleReset}
          onFilterClose={() => setFilters(EMPTY_FILTERS)}
        />
      </div>

      {/* ── Entry form row ── */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-4 mb-2">
        <div className="flex flex-wrap items-end gap-4">
          {/* Quarter Name */}
          <div className="min-w-[200px] flex-1">
            <Select
              label="Quarter Name"
              required
              placeholder="Select Quarter Name"
              options={REPORT_QUARTER_STRINGS}
              value={quarter}
              onChange={handleQuarterChange}
            />
          </div>

          {/* Company */}
          <div className="min-w-[260px] flex-[2]">
            <Select
              label="Company"
              required
              placeholder="Select Company"
              options={companyOptions}
              value={companyId}
              onChange={setCompanyId}
              disabled={!quarter}
            />
          </div>

          {/* Market Capitalization + Save */}
          <div className="min-w-[240px] flex-[1.5]">
            <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
              Market Capitalization <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={cap}
                onChange={setCap}
                placeholder="Enter Market Capitalization"
                bgColor="#ffffff"
                borderColor="#e2e8f0"
                focusBorderColor="#01C9A4"
              />
              <BtnPrimary disabled={!canSave} onClick={handleSave} className="shrink-0">
                {editingId !== null ? 'Update' : 'Save'}
              </BtnPrimary>
              {editingId !== null && (
                <BtnModalClose onClick={resetForm} variant="light" className="w-10 h-10 shrink-0" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload button ── */}
      <div className="flex justify-end mb-2">
        <BtnTeal onClick={handleUploadClick} className="flex items-center gap-2">
          <Upload size={15} /> Upload Market Capitalization
        </BtnTeal>
      </div>

      {/* ── Active filter chips ── */}
      {Object.keys(applied).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {Object.entries(applied).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                         text-[12px] font-medium text-white bg-[#01C9A4]"
            >
              {CHIP_LABELS[k] || k}: {formatChipValue(v)}
              <BtnChipRemove onClick={() => removeChip(k)} />
            </span>
          ))}
          {Object.keys(applied).length > 1 && (
            <BtnClearAll onClick={handleReset} />
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <CommonTable
          columns={columns}
          data={displayed}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Record Found"
          headerBg="#E0E6F6"
          headerTextColor="#041E66"
          rowBg="#ffffff"
          rowHoverBg="#EFF3FF"
        />
      </div>

      {/* ── Delete confirmation ── */}
      <ConfirmModal
        open={!!deleteTarget}
        message={`Are you sure you want to delete the Market Capitalization record for ${deleteTarget?.company ?? ''} (${deleteTarget?.quarter ?? ''})?`}
        onYes={handleDelete}
        onNo={() => setDeleteTarget(null)}
      />

      {/* ── Upload Quarter Modal ── */}
      {uploadModal && (
        <div
          className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
          onClick={() => setUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="text-[18px] font-bold text-[#0B39B5]">Upload Market Capitalization</h2>
              <BtnModalClose onClick={() => setUploadModal(false)} variant="light" />
            </div>

            <div className="px-6 pb-4">
              <p className="text-[13px] text-slate-500 mb-4">
                File: <strong className="text-[#041E66]">{uploadedFile?.name}</strong>
              </p>
              <Select
                label="Quarter Name"
                required
                placeholder="Select Quarter Name"
                options={REPORT_QUARTER_STRINGS}
                value={uploadQuarter}
                onChange={setUploadQuarter}
              />
            </div>

            <div className="flex justify-center gap-3 px-6 pb-6">
              <BtnGold onClick={() => setUploadModal(false)}>Cancel</BtnGold>
              <BtnPrimary disabled={!uploadQuarter} onClick={handleUploadProceed}>Proceed</BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarketCapEntryPage
