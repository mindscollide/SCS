/**
 * src/pages/manager/BasketManagementPage.jsx
 * ============================================
 * Basket Management — two tabs:
 *   • Customized Basket  — multi-select Companies + Compliance Criteria
 *   • Sector-wise Basket — Sector (single) → enables Companies + Criteria
 *
 * UI pattern matches ComplianceStandingPage:
 *   ▸ #EFF3FF header band (title)
 *   ▸ #EFF3FF filter card (dropdowns + Search)
 *   ▸ ScrollTabs → RatioThresholdTable → action row → CommonTable
 */

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BtnGold,
  BtnPrimary,
  ExportBtn,
  StatusText,
  MultiSelect,
  ScrollTabs,
  SortIconTable,
} from '../../components/common/index.jsx'
import Select from '../../components/common/select/Select'
import Input from '../../components/common/Input/Input'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  CRITERIA_LIST,
  COMPANIES as COMPANIES_LIST,
  SECTORS as SECTORS_LIST,
} from '../../data/mockData.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CRITERIA_MAP = Object.fromEntries(CRITERIA_LIST.map((c) => [c.id, c]))
const DEFAULT_CRITERIA_ID = CRITERIA_LIST.find((c) => c.isDefault)?.id ?? 1
const ALL_COMPANY_IDS = COMPANIES_LIST.map((c) => c.id)

const buildDefaultThresholds = () => {
  const t = {}
  CRITERIA_LIST.forEach((c) => {
    t[c.id] = {}
    c.ratios.forEach((r) => {
      t[c.id][r.id] = String(r.threshold)
    })
  })
  return t
}

const mockCompliance = (companyId, criteriaId) =>
  (companyId * 7 + criteriaId * 3) % 10 < 5 ? 'Compliant' : 'Non-Compliant'

// ── RatioThresholdTable ───────────────────────────────────────────────────────
// Page-specific: shows ratios for the active criteria with editable thresholds.

const RatioThresholdTable = ({ criteriaId, thresholds, onThresholdChange }) => {
  const criteria = CRITERIA_MAP[criteriaId]
  if (!criteria) return null
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ backgroundColor: '#E0E6F6' }}>
            <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
              Financial Ratio Name
            </th>
            <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#041E66]">
              Threshold value
            </th>
          </tr>
        </thead>
        <tbody>
          {criteria.ratios.map((r) => (
            <tr key={r.id} className="border-t border-[#eef2f7]">
              <td className="px-4 py-2 text-[#041E66]">{r.name}</td>
              <td className="px-4 py-2 text-right">
                <div className="inline-flex items-center gap-1 justify-end">
                  <Input
                    value={thresholds[criteriaId]?.[r.id] ?? String(r.threshold)}
                    onChange={(v) => onThresholdChange(criteriaId, r.id, v)}
                    regex={/^[0-9.]*$/}
                    className="w-24"
                  />
                  <span className="text-[13px] text-[#041E66]">{r.unit}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EmptyRatioTable = () => (
  <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ backgroundColor: '#E0E6F6' }}>
          <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
            Financial Ratio Name
          </th>
          <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#041E66]">
            Threshold value
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={2} className="py-8 text-center text-[13px] text-[#a0aec0]">
            No Record Found
          </td>
        </tr>
      </tbody>
    </table>
  </div>
)

// ── Build CommonTable columns dynamically ─────────────────────────────────────

const buildColumns = (searchedCriteria) => [
  { key: 'name', title: 'Company Name', sortable: true },
  { key: 'sector', title: 'Sector Name', sortable: true },
  { key: 'quarter', title: 'Quarter Name', sortable: true },
  ...searchedCriteria.map((id) => ({
    key: `c_${id}`,
    title: CRITERIA_MAP[id]?.name ?? '',
    sortable: true,
    render: (row) => <StatusText status={row[`c_${id}`]} />,
  })),
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const BasketManagementPage = () => {
  const [activeTab, setActiveTab] = useState('customized')

  const companyOptions = COMPANIES_LIST.map((c) => ({
    label: c.name,
    value: c.id,
  }))
  const criteriaOptions = CRITERIA_LIST.map((c) => ({
    label: c.name,
    value: c.id,
  }))
  const sectorOptions = SECTORS_LIST.map((s) => ({
    label: s.name,
    value: String(s.id),
  }))

  // ── Customized Basket state ─────────────────────────────────────────────────
  const [cbCompanies, setCbCompanies] = useState(ALL_COMPANY_IDS)
  const [cbCriteria, setCbCriteria] = useState([DEFAULT_CRITERIA_ID])
  const [cbSearched, setCbSearched] = useState([DEFAULT_CRITERIA_ID])
  const [cbActiveTab, setCbActiveTab] = useState(DEFAULT_CRITERIA_ID)
  const [cbThresholds, setCbThresholds] = useState(buildDefaultThresholds)
  const [cbReport, setCbReport] = useState(null)
  const [cbSortCol, setCbSortCol] = useState('name')
  const [cbSortDir, setCbSortDir] = useState('asc')

  const handleCbSearch = () => {
    if (cbCompanies.length === 0) {
      toast.error('Please select at least one Company')
      return
    }
    if (cbCriteria.length === 0) {
      toast.error('Please select at least one Compliance Criteria')
      return
    }
    setCbSearched([...cbCriteria])
    setCbActiveTab(cbCriteria[0])
    setCbThresholds(buildDefaultThresholds())
    setCbReport(null)
  }

  const handleCbGenerate = () => {
    const rows = COMPANIES_LIST.filter((c) => cbCompanies.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const row = {
          id: c.id,
          name: c.name,
          sector: c.sector,
          quarter: c.quarter,
        }
        cbSearched.forEach((cId) => {
          row[`c_${cId}`] = mockCompliance(c.id, cId)
        })
        return row
      })
    setCbReport(rows)
    toast.success('Report Generated Successfully')
  }

  const cbSorted = useMemo(() => {
    if (!cbReport) return []
    return [...cbReport].sort((a, b) => {
      const va = String(a[cbSortCol] ?? '').toLowerCase()
      const vb = String(b[cbSortCol] ?? '').toLowerCase()
      return cbSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [cbReport, cbSortCol, cbSortDir])

  const cbHandleSort = (col) => {
    if (cbSortCol === col) setCbSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setCbSortCol(col)
      setCbSortDir('asc')
    }
  }

  const handleCbThresholdChange = useCallback((cId, rId, val) => {
    setCbThresholds((p) => ({ ...p, [cId]: { ...p[cId], [rId]: val } }))
  }, [])

  // ── Sector-wise Basket state ────────────────────────────────────────────────
  const [swSector, setSwSector] = useState('')
  const [swCompanies, setSwCompanies] = useState([])
  const [swCriteria, setSwCriteria] = useState([DEFAULT_CRITERIA_ID])
  const [swSearched, setSwSearched] = useState([])
  const [swActiveTab, setSwActiveTab] = useState(null)
  const [swThresholds, setSwThresholds] = useState(buildDefaultThresholds)
  const [swReport, setSwReport] = useState(null)
  const [swSortCol, setSwSortCol] = useState('name')
  const [swSortDir, setSwSortDir] = useState('asc')

  const swSectorEnabled = !!swSector

  const swCompanyOptions = useMemo(
    () =>
      swSector
        ? COMPANIES_LIST.filter((c) => c.sectorId === parseInt(swSector)).map((c) => ({
            label: c.name,
            value: c.id,
          }))
        : [],
    [swSector]
  )

  const handleSectorChange = (val) => {
    setSwSector(val)
    if (val) {
      const ids = COMPANIES_LIST.filter((c) => c.sectorId === parseInt(val)).map((c) => c.id)
      setSwCompanies(ids)
      if (swCriteria.length === 0) setSwCriteria([DEFAULT_CRITERIA_ID])
    } else {
      setSwCompanies([])
    }
    setSwSearched([])
    setSwReport(null)
    setSwActiveTab(null)
  }

  const handleSwSearch = () => {
    if (swCompanies.length === 0) {
      toast.error('Please select at least one Company')
      return
    }
    if (swCriteria.length === 0) {
      toast.error('Please select at least one Compliance Criteria')
      return
    }
    setSwSearched([...swCriteria])
    setSwActiveTab(swCriteria[0])
    setSwThresholds(buildDefaultThresholds())
    setSwReport(null)
  }

  const handleSwGenerate = () => {
    const rows = COMPANIES_LIST.filter((c) => swCompanies.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const row = {
          id: c.id,
          name: c.name,
          sector: c.sector,
          quarter: c.quarter,
        }
        swSearched.forEach((cId) => {
          row[`c_${cId}`] = mockCompliance(c.id, cId)
        })
        return row
      })
    setSwReport(rows)
    toast.success('Report Generated Successfully')
  }

  const swSorted = useMemo(() => {
    if (!swReport) return []
    return [...swReport].sort((a, b) => {
      const va = String(a[swSortCol] ?? '').toLowerCase()
      const vb = String(b[swSortCol] ?? '').toLowerCase()
      return swSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  }, [swReport, swSortCol, swSortDir])

  const swHandleSort = (col) => {
    if (swSortCol === col) setSwSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSwSortCol(col)
      setSwSortDir('asc')
    }
  }

  const handleSwThresholdChange = useCallback((cId, rId, val) => {
    setSwThresholds((p) => ({ ...p, [cId]: { ...p[cId], [rId]: val } }))
  }, [])

  // ScrollTabs items
  const cbTabItems = cbSearched.map((id) => ({
    id,
    label: CRITERIA_MAP[id]?.name ?? '',
  }))
  const swTabItems = swSearched.map((id) => ({
    id,
    label: CRITERIA_MAP[id]?.name ?? '',
  }))

  // CommonTable columns
  const cbColumns = useMemo(() => buildColumns(cbSearched), [cbSearched])
  const swColumns = useMemo(() => buildColumns(swSearched), [swSearched])

  const handleExport = (format) => toast.info(`Exporting as ${format}…`)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Basket Management</h1>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex justify-center mb-2">
        <div className="flex gap-2">
          {[
            { key: 'customized', label: 'Customized Basket' },
            { key: 'sector', label: 'Sector-wise Basket' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-7 py-2.5 text-[13px] font-semibold transition-colors rounded-lg
        ${
          activeTab === t.key
            ? 'bg-[#0B39B5] text-white'
            : 'bg-[#EFF3FF] text-[#041E66] hover:bg-[#dfe7ff]'
        }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ CUSTOMIZED BASKET ══════════════ */}
      {activeTab === 'customized' && (
        <>
          {/* Filter card */}
          <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <MultiSelect
                label="Companies"
                required
                options={companyOptions}
                selected={cbCompanies}
                onChange={setCbCompanies}
              />
              <MultiSelect
                label="Compliance Criteria"
                required
                options={criteriaOptions}
                selected={cbCriteria}
                onChange={setCbCriteria}
              />
              <BtnGold onClick={handleCbSearch} className="py-[10px] px-8">
                Search
              </BtnGold>
            </div>
          </div>

          {/* Criteria scroll tabs */}
          <div className="bg-white rounded-xl px-3 mb-2 border border-slate-200">
            <ScrollTabs items={cbTabItems} activeId={cbActiveTab} onTabClick={setCbActiveTab} />
          </div>

          {/* Ratio threshold table */}
          <div className="mb-2">
            <RatioThresholdTable
              criteriaId={cbActiveTab}
              thresholds={cbThresholds}
              onThresholdChange={handleCbThresholdChange}
            />
          </div>

          {/* Action row */}
          <div className="flex justify-end gap-2 mb-2">
            <BtnPrimary onClick={handleCbGenerate}>Generate Report</BtnPrimary>
            <ExportBtn
              disabled={!cbReport}
              onExcel={() => handleExport('Excel')}
              onPdf={() => handleExport('PDF')}
            />
          </div>

          {/* Results table */}
          <CommonTable
            columns={cbColumns}
            data={cbSorted}
            sortCol={cbSortCol}
            sortDir={cbSortDir}
            onSort={cbHandleSort}
            emptyText="No Record Found"
            headerBg="#E0E6F6"
          />
        </>
      )}

      {/* ══════════════ SECTOR-WISE BASKET ══════════════ */}
      {activeTab === 'sector' && (
        <>
          {/* Filter card */}
          <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <Select
                label="Sector"
                required
                placeholder="-- Select --"
                value={swSector}
                onChange={handleSectorChange}
                options={sectorOptions}
              />
              <MultiSelect
                label="Companies"
                required
                options={swCompanyOptions}
                selected={swCompanies}
                onChange={setSwCompanies}
                disabled={!swSectorEnabled}
              />
              <MultiSelect
                label="Compliance Criteria"
                required
                options={criteriaOptions}
                selected={swCriteria}
                onChange={setSwCriteria}
                disabled={!swSectorEnabled}
              />
              <BtnGold
                onClick={swSectorEnabled ? handleSwSearch : undefined}
                className={`py-[10px] px-8 ${!swSectorEnabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''}`}
              >
                Search
              </BtnGold>
            </div>
          </div>

          {/* Criteria scroll tabs + ratio table — only after Search */}
          {swSearched.length > 0 ? (
            <>
              <div className="bg-white rounded-xl px-3 mb-2 border border-slate-200">
                <ScrollTabs items={swTabItems} activeId={swActiveTab} onTabClick={setSwActiveTab} />
              </div>
              <div className="mb-2">
                <RatioThresholdTable
                  criteriaId={swActiveTab}
                  thresholds={swThresholds}
                  onThresholdChange={handleSwThresholdChange}
                />
              </div>
            </>
          ) : (
            <div className="mb-2">
              <EmptyRatioTable />
            </div>
          )}

          {/* Action row */}
          <div className="flex justify-end gap-2 mb-2">
            <BtnPrimary onClick={handleSwGenerate} disabled={swSearched.length === 0}>
              Generate Report
            </BtnPrimary>
            <ExportBtn
              disabled={!swReport}
              onExcel={() => handleExport('Excel')}
              onPdf={() => handleExport('PDF')}
            />
          </div>

          {/* Results table */}
          <CommonTable
            columns={swColumns}
            data={swSorted}
            sortCol={swSortCol}
            sortDir={swSortDir}
            onSort={swHandleSort}
            emptyText="No Record Found"
            headerBg="#E0E6F6"
          />
        </>
      )}
    </div>
  )
}

export default BasketManagementPage
