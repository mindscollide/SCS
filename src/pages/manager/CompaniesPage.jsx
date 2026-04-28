/**
 * src/pages/manager/CompaniesPage.jsx
 * =====================================
 * Manager manages the list of companies.
 *
 * TODO: GET/POST/PUT /api/manager/companies
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Star } from 'lucide-react'
import { toast } from 'react-toastify'
import { MOCK_COMPANIES } from '../../utils/mockData.js'
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

// ── Static option lists ───────────────────────────────────────────────────────
const SECTORS = ['Banking', 'Cement', 'Fertilizer', 'Oil & Gas', 'Textile'].sort()
const MARKETS = ['ADX', 'BURSA', 'PSX', 'TADAWUL'].sort()
const ANN_REP = ['March', 'June', 'September', 'December']
const FREQ_OPTS = ['Yearly', 'Half-Yearly', 'Quarterly']
const GRACE_MAP = { Yearly: '6', 'Half-Yearly': '4', Quarterly: '2' }

// ── Empty state helpers ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  ticker: '',
  sector: '',
  annualRep: '',
  market: '',
  freq: '',
  grace: '',
}

const EMPTY_FILTERS = {
  search: '',
  sector: '',
  market: '',
  annualRep: '',
  freq: '',
  exception: '',
  status: '',
}

const FILTER_FIELDS = [
  { key: 'sector', label: 'Sector Name', type: 'select', options: SECTORS },
  { key: 'market', label: 'Market Name', type: 'select', options: MARKETS },
  { key: 'annualRep', label: 'Annual Reporting', type: 'select', options: ANN_REP },
  { key: 'freq', label: 'Reporting Frequency', type: 'select', options: FREQ_OPTS },
  {
    key: 'exception',
    label: 'Exception by Shariah Advisor',
    type: 'select',
    options: ['Yes', 'No'],
  },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
]

const CHIP_LABELS = {
  search: 'Company / Ticker',
  sector: 'Sector',
  market: 'Market',
  annualRep: 'Annual Reporting',
  freq: 'Frequency',
  exception: 'Exception',
  status: 'Status',
}

// ── CompaniesPage ─────────────────────────────────────────────────────────────
const CompaniesPage = () => {
  const sourceData = useRef(MOCK_COMPANIES)
  const [companies, setCompanies] = useState(MOCK_COMPANIES)

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(null)
  const [active, setActive] = useState(true)
  const [exception, setException] = useState(false)
  const [exReason, setExReason] = useState('')
  const [exReasonErr, setExReasonErr] = useState('')

  // ── Confirm modal ───────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState(false)

  // ── Search / filter state ───────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  const mainSearch = filters.search
  const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, search: val })), [])

  // ── Sort state ──────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }))
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }))
  }

  const setFreq = (val) => {
    setForm((p) => ({ ...p, freq: val, grace: GRACE_MAP[val] || '' }))
    if (errors.freq) setErrors((p) => ({ ...p, freq: '' }))
  }

  const isValid =
    form.name.trim() && form.ticker.trim() && form.sector && form.annualRep && form.market

  // ── Data helpers ────────────────────────────────────────────────────────────
  const matchesFilters = (c, f) => {
    if (f.search) {
      const q = f.search.toLowerCase()
      if (!c.ticker?.toLowerCase().includes(q) && !c.name?.toLowerCase().includes(q)) return false
    }
    if (f.sector && c.sector !== f.sector) return false
    if (f.market && c.market !== f.market) return false
    if (f.annualRep && c.annualRep !== f.annualRep) return false
    if (f.freq && c.freq !== f.freq) return false
    if (f.exception === 'Yes' && !c.exception) return false
    if (f.exception === 'No' && c.exception) return false
    if (f.status && c.status !== f.status) return false
    return true
  }

  const fetchData = useCallback((f) => {
    setCompanies(sourceData.current.filter((c) => matchesFilters(c, f)))
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

  // ── Sort ────────────────────────────────────────────────────────────────────
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
      [...companies].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        if (va === vb)
          return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [companies, sortCol, sortDir]
  )

  // ── Validate ────────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Company Name is required'
    if (!form.ticker.trim()) errs.ticker = 'Ticker is required'
    if (!form.sector) errs.sector = 'Sector is required'
    if (!form.annualRep) errs.annualRep = 'Annual Reporting is required'
    if (!form.market) errs.market = 'Market is required'
    return errs
  }

  // ── Save / Update ────────────────────────────────────────────────────────────
  const handleSave = () => {
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    if (editing) {
      if (exception && !exReason.trim()) {
        setExReasonErr('Reason is required when Exception is checked')
        return
      }
      setConfirm(true)
    } else {
      const nameTaken = sourceData.current.some(
        (c) => c.name.toLowerCase() === form.name.trim().toLowerCase()
      )
      if (nameTaken) {
        setErrors({ name: 'Company Name already exists' })
        return
      }

      const tickerTaken = sourceData.current.some(
        (c) => c.ticker.toLowerCase() === form.ticker.trim().toLowerCase()
      )
      if (tickerTaken) {
        setErrors({ ticker: 'Ticker already exists' })
        return
      }

      const next = [
        ...sourceData.current,
        {
          id: Date.now(),
          name: form.name.trim(),
          ticker: form.ticker.trim().toUpperCase(),
          sector: form.sector,
          annualRep: form.annualRep,
          market: form.market,
          freq: form.freq,
          grace: form.grace,
          status: 'Active',
          exception: false,
          exReason: '',
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
    setException(false)
    setExReason('')
    setExReasonErr('')
  }

  // ── Column definitions ────────────────────────────────────────────────────────
  const COLS = useMemo(
    () => [
      {
        key: 'name',
        title: 'Company Name',
        sortable: true,
        render: (r) => (
          <span className="font-semibold text-[#000] flex items-center gap-1.5">
            {r.exception && <Star size={13} className="text-[#F5A623] shrink-0" fill="#F5A623" />}
            {r.name}
          </span>
        ),
      },
      {
        key: 'ticker',
        title: 'Ticker',
        sortable: true,
        align: 'center',
      },
      {
        key: 'annualRep',
        title: 'Annual Reporting',
        sortable: true,
        align: 'center',
      },
      {
        key: 'market',
        title: 'Market Name',
        sortable: true,
        align: 'center',
      },
      {
        key: 'freq',
        title: 'Reporting Frequency',
        sortable: true,
        align: 'center',
      },
      {
        key: 'sector',
        title: 'Sector Name',
        sortable: true,
        align: 'center',
      },
      {
        key: 'edit',
        title: 'Edit',
        render: (r) => (
          <BtnIconEdit onClick={() => {
              setEditing(r.id)
              setForm({
                name: r.name,
                ticker: r.ticker,
                sector: r.sector,
                annualRep: r.annualRep,
                market: r.market,
                freq: r.freq || '',
                grace: r.grace || '',
              })
              setActive(r.status === 'Active')
              setException(r.exception || false)
              setExReason(r.exReason || '')
              setErrors({})
              setExReasonErr('')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }} />
        ),
      },
      {
        key: 'status',
        title: 'Status',
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
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Manage Companies</h1>
          <SearchFilter
            placeholder="Search by company name or ticker..."
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
                {CHIP_LABELS[k] || k}: {formatChipValue(v)}
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
          <div className="p-5">
            {/* Row 1: Company Name | Ticker | Annual Reporting */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Input
                label="Company Name"
                required
                placeholder="e.g. Mughal Iron & Steel Industries"
                value={form.name}
                onChange={(v) => set('name', v)}
                maxLength={50}
                showCount
                error={!!errors.name}
                errorMessage={errors.name}
              />
              <Input
                label="Ticker"
                required
                placeholder="e.g. MUGHAL"
                value={form.ticker}
                onChange={(v) => set('ticker', v.toUpperCase())}
                maxLength={20}
                showCount
                error={!!errors.ticker}
                errorMessage={errors.ticker}
              />
              <Select
                label="Annual Reporting"
                required
                placeholder="Select Annual Reporting"
                value={form.annualRep}
                onChange={(v) => set('annualRep', v)}
                options={ANN_REP}
                error={!!errors.annualRep}
                errorMessage={errors.annualRep}
              />
            </div>

            {/* Row 2: Market | Sector | Reporting Frequency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Select
                label="Market"
                required
                placeholder="Select Market"
                value={form.market}
                onChange={(v) => set('market', v)}
                options={MARKETS}
                error={!!errors.market}
                errorMessage={errors.market}
              />
              <Select
                label="Sector"
                required
                placeholder="Select Sector"
                value={form.sector}
                onChange={(v) => set('sector', v)}
                options={SECTORS}
                error={!!errors.sector}
                errorMessage={errors.sector}
              />
              <Select
                label="Reporting Frequency"
                placeholder="Select Frequency"
                value={form.freq}
                onChange={setFreq}
                options={FREQ_OPTS}
              />
            </div>

            {/* Grace Period — shows when Frequency is selected */}
            {form.freq && (
              <div className="mb-4 max-w-[200px]">
                <Input
                  label="Grace Period (months)"
                  value={form.grace}
                  onChange={() => {}}
                  disabled
                  bgColor="#f8f9ff"
                />
              </div>
            )}

            {/* Edit-only: Status + Exception by Shariah Advisor */}
            {editing && (
              <div className="border-t border-[#eef2f7] pt-4 mt-2">
                <div className="flex flex-wrap items-start gap-6 mb-3">
                  <Checkbox
                    label="Active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={exception}
                      onChange={(e) => {
                        setException(e.target.checked)
                        if (!e.target.checked) {
                          setExReason('')
                          setExReasonErr('')
                        }
                      }}
                      accentColor="#F5A623"
                    />
                    <Star size={13} className="text-[#F5A623]" fill="#F5A623" />
                    <span className="text-[13px] text-[#041E66]">Exception by Shariah Advisor</span>
                  </label>
                </div>

                {/* Reason textarea — only when exception checked */}
                {exception && (
                  <div className="mb-3">
                    <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      maxLength={300}
                      placeholder="Enter reason for Shariah Advisor exception..."
                      className={`w-full px-3 py-2.5 border rounded-lg text-[13px] text-[#041E66]
                                  focus:outline-none transition-all resize-none
                                  ${
                                    exReasonErr
                                      ? 'border-red-400 focus:border-red-400'
                                      : 'border-[#dde4ee] focus:border-[#01C9A4]'
                                  }`}
                      value={exReason}
                      onChange={(e) => {
                        setExReason(e.target.value)
                        if (exReasonErr) setExReasonErr('')
                      }}
                    />
                    <div className="flex justify-between mt-1">
                      {exReasonErr ? (
                        <p className="text-[11px] text-red-500">{exReasonErr}</p>
                      ) : (
                        <span />
                      )}
                      <p className="text-[11px] text-[#a0aec0]">{exReason.length}/300</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-2">
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
        message="Are you sure you want to do this action?"
        onYes={() => {
          sourceData.current = sourceData.current.map((c) =>
            c.id === editing
              ? {
                  ...c,
                  name: form.name.trim(),
                  ticker: form.ticker.trim().toUpperCase(),
                  sector: form.sector,
                  annualRep: form.annualRep,
                  market: form.market,
                  freq: form.freq,
                  grace: form.grace,
                  status: active ? 'Active' : 'Inactive',
                  exception,
                  exReason: exception ? exReason.trim() : '',
                }
              : c
          )
          fetchData(applied)
          toast.success('Record Updated Successfully')
          setConfirm(false)
          setEditing(null)
          setForm(EMPTY_FORM)
          setErrors({})
          setException(false)
          setExReason('')
          setExReasonErr('')
        }}
        onNo={() => setConfirm(false)}
      />
    </div>
  )
}

export default CompaniesPage
