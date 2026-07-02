/**
 * src/pages/manager/BasketManagementPage.jsx
 * ============================================
 * Basket Management Report — two tabs:
 *   • Customized Basket  — multi-select Companies + Compliance Criteria
 *   • Sector-wise Basket — Sector (single) → enables Companies + Criteria
 *
 * APIs:
 *  GetAllActiveCompanyNamesApi          — Companies dropdown (Customized tab, cached)
 *  GetAllActiveSectorsApi               — Sectors dropdown (Sector-wise tab, cached)
 *  GetComplianceCriteriaApi             — Criteria dropdown (both tabs, PageSize 200)
 *  GetActiveCompanyNamesBySectorApi     — Sector-wise companies (on sector change, uncached)
 *  GetBasketManagementThresholdsApi     — Customized Search → editable thresholds per criteria
 *  GetSectorWiseBasketThresholdsApi     — Sector-wise Search → same response shape
 *  GenerateBasketManagementApi          — Generate report (both tabs, SectorID=0 for Customized)
 *  ExportBasketManagementApi            — PDF export (both tabs)
 *  ExportBasketManagementExcelApi       — Excel export (both tabs)
 *
 * Flow (both tabs):
 *  1. Search → load editable thresholds (one scrollable tab per criteria)
 *  2. Generate Report → company × criteria compliance matrix
 *  3. Export → same payload sent to generate returns base64 PDF/Excel
 *
 * Roles: Manager (2) + View Only (4)
 * MQTT: none — read-only report, no mutations
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { CircleAlert } from 'lucide-react'
import {
  BtnGold,
  BtnPrimary,
  ExportBtn,
  StatusText,
  MultiSelect,
  ScrollTabs,
} from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import RatiosPanel from '../../components/common/report/RatiosPanel.jsx'
import {
  GetAllActiveCompanyNamesApi,
  GetAllActiveSectorsApi,
  GetComplianceCriteriaApi,
  GetActiveCompanyNamesBySectorApi,
  GetBasketManagementThresholdsApi,
  GET_BASKET_MANAGEMENT_THRESHOLDS_CODES,
  GetSectorWiseBasketThresholdsApi,
  GET_SECTOR_WISE_BASKET_THRESHOLDS_CODES,
  GenerateBasketManagementApi,
  GENERATE_BASKET_MANAGEMENT_CODES,
  ExportBasketManagementApi,
  EXPORT_BASKET_MANAGEMENT_CODES,
  ExportBasketManagementExcelApi,
  EXPORT_BASKET_MANAGEMENT_EXCEL_CODES,
} from '../../services/manager.service.js'

// ── Response-code sentinels ───────────────────────────────────────────────────
const CB_THRESHOLDS_OK = 'Manager_ManagerServiceManager_GetBasketManagementThresholds_04'
const SW_THRESHOLDS_OK = 'Manager_ManagerServiceManager_GetSectorWiseBasketThresholds_05'
const GENERATE_OK = 'Manager_ManagerServiceManager_GenerateBasketManagement_04'

// ── Helpers ───────────────────────────────────────────────────────────────────
const RED_TOAST = {
  style: { backgroundColor: '#E74C3C', color: '#fff' },
  progressStyle: { backgroundColor: '#ffffff50' },
}
const showError = (msg) => toast.error(msg, RED_TOAST)

const downloadBase64 = (base64, fileName, mime) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Build CommonTable column definitions from the searched criteria data.
// Each criteria becomes a status column keyed by its ID.
const buildColumns = (criteriaData) => [
  {
    key: 'company',
    title: 'Company Name',
    sortable: true,
    render: (row) => (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-[#000]">{row.company}</span>
        {row.isException && (
          <span title={row.exceptionReason || 'Shariah-advisor exception'}>
            <CircleAlert size={16} className="text-[#F5A623] shrink-0" />
          </span>
        )}
      </div>
    ),
  },
  { key: 'sector', title: 'Sector Name', sortable: true },
  { key: 'quarter', title: 'Quarter Name', sortable: true },
  ...criteriaData.map((c) => ({
    key: `c_${c.complianceCriteriaID}`,
    title: c.criteriaName,
    sortable: true,
    render: (row) => <StatusText status={row[`c_${c.complianceCriteriaID}`]} />,
  })),
]

// Build the Criteria array for GenerateBasketManagement / Export payloads
// from the current (possibly edited) searched criteria data.
const buildCriteriaPayload = (criteriaData) =>
  criteriaData.map((c) => ({
    ComplianceCriteriaID: c.complianceCriteriaID,
    RatioThresholds: (c.ratioThresholds || []).map((r) => ({
      FK_FinancialRatiosID: r.fK_FinancialRatiosID,
      ThresholdValue: parseFloat(r.thresholdValue) || 0,
      IsMaxValidationApplied: r.isMaxValidationApplied ?? 0,
      ThresholdUnit: r.thresholdUnit || '%',
    })),
  }))

// Map raw API result rows into flat table rows keyed by criteria ID.
const mapResultRows = (results) =>
  (results || []).map((r) => {
    const row = {
      id: r.companyID,
      company: r.company,
      sector: r.sector,
      quarter: r.quarter,
      isException: r.isException,
      exceptionReason: r.exceptionReason,
    }
    ;(r.statuses || []).forEach((s) => {
      row[`c_${s.complianceCriteriaID}`] = s.status
    })
    return row
  })

const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) =>
    String(a[col] ?? '')
      .toLowerCase()
      .localeCompare(String(b[col] ?? '').toLowerCase()) * d
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const BasketManagementPage = () => {
  const [activeTab, setActiveTab] = useState('customized')

  // ── Shared dropdown options (loaded on mount) ─────────────────────────────
  const [companyOpts, setCompanyOpts] = useState([])
  const [sectorOpts, setSectorOpts] = useState([])
  const [criteriaOpts, setCriteriaOpts] = useState([])

  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      // allSettled — a criteria failure (e.g. endpoint not yet deployed) must not
      // block companies or sectors from populating their dropdowns.
      const [cSettled, sSettled, crSettled] = await Promise.allSettled([
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
        GetAllActiveSectorsApi({}, { skipLoader: true }),
        GetComplianceCriteriaApi({ PageSize: 200, PageNumber: 0 }, { skipLoader: true }),
      ])

      if (cSettled.status === 'fulfilled' && cSettled.value?.success) {
        setCompanyOpts(
          (cSettled.value.data?.responseResult?.companies || []).map((c) => ({
            label: c.companyName || '',
            value: c.pK_CompanyID,
          }))
        )
      }

      if (sSettled.status === 'fulfilled' && sSettled.value?.success) {
        setSectorOpts(
          (sSettled.value.data?.responseResult?.sectors || []).map((s) => ({
            label: s.sectorName || '',
            value: s.pK_SectorID,
          }))
        )
      }

      if (crSettled.status === 'fulfilled' && crSettled.value?.success) {
        setCriteriaOpts(
          (crSettled.value.data?.responseResult?.complianceCriteria || []).map((c) => ({
            label: c.criteriaName || '',
            value: c.pK_ComplianceCriteriaID,
          }))
        )
      }
    }

    load()
  }, [])

  // ── Customized Basket state ───────────────────────────────────────────────
  const [cbCompanies, setCbCompanies] = useState([])
  const [cbCriteria, setCbCriteria] = useState([])
  // After Search — array of { complianceCriteriaID, criteriaName, ratioThresholds:[...] }
  // ratioThresholds items have thresholdValue stored as editable string
  const [cbSearchedCriteriaData, setCbSearchedCriteriaData] = useState([])
  const [cbActiveTab, setCbActiveTab] = useState(null)
  const [cbReport, setCbReport] = useState(null)
  const [cbExportPayload, setCbExportPayload] = useState(null) // reused for both PDF + Excel
  const [cbSearching, setCbSearching] = useState(false)
  const [cbGenerating, setCbGenerating] = useState(false)
  const [cbExportingPdf, setCbExportingPdf] = useState(false)
  const [cbExportingExcel, setCbExportingExcel] = useState(false)
  const [cbSortCol, setCbSortCol] = useState('company')
  const [cbSortDir, setCbSortDir] = useState('asc')

  const handleCbSearch = useCallback(async () => {
    if (cbCompanies.length === 0) {
      showError('Please select at least one company.')
      return
    }
    if (cbCriteria.length === 0) {
      showError('Please select at least one compliance criteria.')
      return
    }
    setCbSearching(true)
    const res = await GetBasketManagementThresholdsApi(
      { CompanyIDs: cbCompanies, ComplianceCriteriaIDs: cbCriteria },
      { skipLoader: true }
    )
    setCbSearching(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''
    if (!res.success || code !== CB_THRESHOLDS_OK) {
      showError(GET_BASKET_MANAGEMENT_THRESHOLDS_CODES[code] || res.message || 'Search failed.')
      return
    }

    const criteriaData = (rr.criteria || []).map((c) => ({
      ...c,
      ratioThresholds: (c.ratioThresholds || []).map((r) => ({
        ...r,
        thresholdValue: String(r.thresholdValue ?? ''),
      })),
    }))
    setCbSearchedCriteriaData(criteriaData)
    setCbActiveTab(criteriaData[0]?.complianceCriteriaID ?? null)
    setCbReport(null)
    setCbExportPayload(null)
  }, [cbCompanies, cbCriteria])

  const handleCbThresholdChange = useCallback(
    (i, val) => {
      setCbSearchedCriteriaData((prev) =>
        prev.map((c) => {
          if (c.complianceCriteriaID !== cbActiveTab) return c
          const updated = [...c.ratioThresholds]
          updated[i] = { ...updated[i], thresholdValue: val }
          return { ...c, ratioThresholds: updated }
        })
      )
    },
    [cbActiveTab]
  )

  const handleCbGenerate = useCallback(async () => {
    if (cbSearchedCriteriaData.length === 0) return
    const criteria = buildCriteriaPayload(cbSearchedCriteriaData)
    setCbGenerating(true)
    const res = await GenerateBasketManagementApi(
      { SectorID: 0, CompanyIDs: cbCompanies, Criteria: criteria },
      { skipLoader: true }
    )
    setCbGenerating(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''
    if (!res.success || code !== GENERATE_OK) {
      showError(GENERATE_BASKET_MANAGEMENT_CODES[code] || res.message || 'Generate failed.')
      return
    }

    setCbReport(mapResultRows(rr.results))
    setCbExportPayload({ SectorID: 0, CompanyIDs: cbCompanies, Criteria: criteria })
  }, [cbCompanies, cbSearchedCriteriaData])

  const handleCbExport = useCallback(
    async (kind) => {
      if (!cbExportPayload) return
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setCbExportingPdf : setCbExportingExcel
      setBusy(true)
      const api = isPdf ? ExportBasketManagementApi : ExportBasketManagementExcelApi
      const res = await api(cbExportPayload, { skipLoader: true })
      setBusy(false)

      const rr = res?.data?.responseResult
      const code = rr?.responseMessage || ''
      const CODES = isPdf ? EXPORT_BASKET_MANAGEMENT_CODES : EXPORT_BASKET_MANAGEMENT_EXCEL_CODES
      if (!res.success || !code.endsWith('_04')) {
        showError(CODES[code] || res.message || 'Export failed.')
        return
      }
      downloadBase64(
        rr.fileContent,
        rr.fileName || `BasketManagement.${isPdf ? 'pdf' : 'xlsx'}`,
        rr.contentType ||
          (isPdf
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      )
    },
    [cbExportPayload]
  )

  const cbRatios = useMemo(
    () =>
      (
        cbSearchedCriteriaData.find((c) => c.complianceCriteriaID === cbActiveTab)
          ?.ratioThresholds ?? []
      ).map((r) => ({ name: r.financialRatioName, threshold: String(r.thresholdValue ?? '') })),
    [cbSearchedCriteriaData, cbActiveTab]
  )

  const cbTabItems = cbSearchedCriteriaData.map((c) => ({
    id: c.complianceCriteriaID,
    label: c.criteriaName,
  }))

  const cbColumns = useMemo(() => buildColumns(cbSearchedCriteriaData), [cbSearchedCriteriaData])

  const cbHandleSort = (col) => {
    if (cbSortCol === col) setCbSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setCbSortCol(col); setCbSortDir('asc') }
  }

  const cbSorted = useMemo(
    () => (cbReport ? sortRows(cbReport, cbSortCol, cbSortDir) : []),
    [cbReport, cbSortCol, cbSortDir]
  )

  // ── Sector-wise Basket state ──────────────────────────────────────────────
  const [swSector, setSwSector] = useState('')
  const [swCompanyOptions, setSwCompanyOptions] = useState([])
  const [swCompanies, setSwCompanies] = useState([])
  const [swCriteria, setSwCriteria] = useState([])
  const [swSearchedCriteriaData, setSwSearchedCriteriaData] = useState([])
  const [swActiveTab, setSwActiveTab] = useState(null)
  const [swReport, setSwReport] = useState(null)
  const [swExportPayload, setSwExportPayload] = useState(null)
  const [swSectorLoading, setSwSectorLoading] = useState(false)
  const [swSearching, setSwSearching] = useState(false)
  const [swGenerating, setSwGenerating] = useState(false)
  const [swExportingPdf, setSwExportingPdf] = useState(false)
  const [swExportingExcel, setSwExportingExcel] = useState(false)
  const [swSortCol, setSwSortCol] = useState('company')
  const [swSortDir, setSwSortDir] = useState('asc')

  const handleSectorChange = useCallback(async (val) => {
    setSwSector(val)
    setSwCompanies([])
    setSwCompanyOptions([])
    setSwSearchedCriteriaData([])
    setSwReport(null)
    setSwActiveTab(null)
    setSwExportPayload(null)
    if (!val) return

    setSwSectorLoading(true)
    const res = await GetActiveCompanyNamesBySectorApi(Number(val), { skipLoader: true })
    setSwSectorLoading(false)

    if (res.success) {
      const companies = res.data?.responseResult?.companies || []
      setSwCompanyOptions(
        companies.map((c) => ({ label: c.companyName || '', value: c.pK_CompanyID }))
      )
      // Auto-select all companies in the chosen sector
      setSwCompanies(companies.map((c) => c.pK_CompanyID))
    }
  }, [])

  const handleSwSearch = useCallback(async () => {
    if (!swSector) {
      showError('Please select a sector.')
      return
    }
    if (swCompanies.length === 0) {
      showError('Please select at least one company.')
      return
    }
    if (swCriteria.length === 0) {
      showError('Please select at least one compliance criteria.')
      return
    }
    setSwSearching(true)
    const res = await GetSectorWiseBasketThresholdsApi(
      {
        SectorID: Number(swSector),
        CompanyIDs: swCompanies,
        ComplianceCriteriaIDs: swCriteria,
      },
      { skipLoader: true }
    )
    setSwSearching(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''
    if (!res.success || code !== SW_THRESHOLDS_OK) {
      showError(GET_SECTOR_WISE_BASKET_THRESHOLDS_CODES[code] || res.message || 'Search failed.')
      return
    }

    const criteriaData = (rr.criteria || []).map((c) => ({
      ...c,
      ratioThresholds: (c.ratioThresholds || []).map((r) => ({
        ...r,
        thresholdValue: String(r.thresholdValue ?? ''),
      })),
    }))
    setSwSearchedCriteriaData(criteriaData)
    setSwActiveTab(criteriaData[0]?.complianceCriteriaID ?? null)
    setSwReport(null)
    setSwExportPayload(null)
  }, [swSector, swCompanies, swCriteria])

  const handleSwThresholdChange = useCallback(
    (i, val) => {
      setSwSearchedCriteriaData((prev) =>
        prev.map((c) => {
          if (c.complianceCriteriaID !== swActiveTab) return c
          const updated = [...c.ratioThresholds]
          updated[i] = { ...updated[i], thresholdValue: val }
          return { ...c, ratioThresholds: updated }
        })
      )
    },
    [swActiveTab]
  )

  const handleSwGenerate = useCallback(async () => {
    if (swSearchedCriteriaData.length === 0) return
    const criteria = buildCriteriaPayload(swSearchedCriteriaData)
    setSwGenerating(true)
    const res = await GenerateBasketManagementApi(
      { SectorID: Number(swSector), CompanyIDs: swCompanies, Criteria: criteria },
      { skipLoader: true }
    )
    setSwGenerating(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''
    if (!res.success || code !== GENERATE_OK) {
      showError(GENERATE_BASKET_MANAGEMENT_CODES[code] || res.message || 'Generate failed.')
      return
    }

    setSwReport(mapResultRows(rr.results))
    setSwExportPayload({ SectorID: Number(swSector), CompanyIDs: swCompanies, Criteria: criteria })
  }, [swSector, swCompanies, swSearchedCriteriaData])

  const handleSwExport = useCallback(
    async (kind) => {
      if (!swExportPayload) return
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setSwExportingPdf : setSwExportingExcel
      setBusy(true)
      const api = isPdf ? ExportBasketManagementApi : ExportBasketManagementExcelApi
      const res = await api(swExportPayload, { skipLoader: true })
      setBusy(false)

      const rr = res?.data?.responseResult
      const code = rr?.responseMessage || ''
      const CODES = isPdf ? EXPORT_BASKET_MANAGEMENT_CODES : EXPORT_BASKET_MANAGEMENT_EXCEL_CODES
      if (!res.success || !code.endsWith('_04')) {
        showError(CODES[code] || res.message || 'Export failed.')
        return
      }
      downloadBase64(
        rr.fileContent,
        rr.fileName || `BasketManagement.${isPdf ? 'pdf' : 'xlsx'}`,
        rr.contentType ||
          (isPdf
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      )
    },
    [swExportPayload]
  )

  const swRatios = useMemo(
    () =>
      (
        swSearchedCriteriaData.find((c) => c.complianceCriteriaID === swActiveTab)
          ?.ratioThresholds ?? []
      ).map((r) => ({ name: r.financialRatioName, threshold: String(r.thresholdValue ?? '') })),
    [swSearchedCriteriaData, swActiveTab]
  )

  const swTabItems = swSearchedCriteriaData.map((c) => ({
    id: c.complianceCriteriaID,
    label: c.criteriaName,
  }))

  const swColumns = useMemo(() => buildColumns(swSearchedCriteriaData), [swSearchedCriteriaData])

  const swHandleSort = (col) => {
    if (swSortCol === col) setSwSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSwSortCol(col); setSwSortDir('asc') }
  }

  const swSorted = useMemo(
    () => (swReport ? sortRows(swReport, swSortCol, swSortDir) : []),
    [swReport, swSortCol, swSortDir]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Basket Management</h1>
      </div>

      {/* Tab switcher */}
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
              <div>
                <MultiSelect
                  label="Companies"
                  required
                  options={companyOpts}
                  selected={cbCompanies}
                  onChange={setCbCompanies}
                />
                <div className="text-slate flex justify-end text-[12px] font-semibold">
                  Multiple selection allowed
                </div>
              </div>
              <div>
                <MultiSelect
                  label="Compliance Criteria"
                  required
                  options={criteriaOpts}
                  selected={cbCriteria}
                  onChange={setCbCriteria}
                />
                <div className="text-slate flex justify-end text-[12px] font-semibold">
                  Multiple selection allowed
                </div>
              </div>
              <div>
                <BtnGold
                  onClick={handleCbSearch}
                  loading={cbSearching}
                  disabled={cbSearching}
                  className="py-[10px] px-8 mb-[18.5px]"
                >
                  Search
                </BtnGold>
              </div>
            </div>
          </div>

          {/* Criteria scroll tabs + ratio panel — shown only after Search */}
          {cbSearchedCriteriaData.length > 0 ? (
            <>
              <div className="bg-white rounded-xl px-3 mb-2 border border-slate-200">
                <ScrollTabs
                  items={cbTabItems}
                  activeId={cbActiveTab}
                  onTabClick={setCbActiveTab}
                />
              </div>
              <div className="mb-2">
                <RatiosPanel ratios={cbRatios} onThresholdChange={handleCbThresholdChange} />
              </div>
            </>
          ) : (
            <div className="mb-2">
              <RatiosPanel ratios={[]} />
            </div>
          )}

          {/* Action row */}
          <div className="flex justify-end gap-2 mb-2">
            <BtnPrimary
              onClick={handleCbGenerate}
              loading={cbGenerating}
              disabled={cbSearchedCriteriaData.length === 0 || cbGenerating}
            >
              Generate Report
            </BtnPrimary>
            <ExportBtn
              disabled={!cbExportPayload || cbExportingPdf || cbExportingExcel}
              onExcel={() => handleCbExport('excel')}
              onPdf={() => handleCbExport('pdf')}
            />
          </div>

          {/* Results table */}
          <CommonTable
            columns={cbColumns}
            data={cbSorted}
            sortCol={cbSortCol}
            sortDir={cbSortDir}
            onSort={cbHandleSort}
            emptyText={cbReport ? 'No Record Found' : 'Generate the report to view results.'}
            headerBg="#E0E6F6"
            headerTextColor="#041E66"
            rowBg="#ffffff"
            rowHoverBg="#EFF3FF"
          />
        </>
      )}

      {/* ══════════════ SECTOR-WISE BASKET ══════════════ */}
      {activeTab === 'sector' && (
        <>
          {/* Filter card */}
          <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3">
              <div>
                <SearchableSelect
                  label="Sector"
                  required
                  placeholder="-- Select --"
                  value={swSector}
                  onChange={handleSectorChange}
                  options={sectorOpts}
                />
              </div>
              <div>
                <MultiSelect
                  label="Companies"
                  required
                  options={swCompanyOptions}
                  selected={swCompanies}
                  onChange={setSwCompanies}
                  disabled={!swSector || swSectorLoading}
                />
                <div className="text-slate flex justify-end text-[12px] font-semibold">
                  Multiple selection allowed
                </div>
              </div>
              <div>
                <MultiSelect
                  label="Compliance Criteria"
                  required
                  options={criteriaOpts}
                  selected={swCriteria}
                  onChange={setSwCriteria}
                  disabled={!swSector}
                />
                <div className="text-slate flex justify-end text-[12px] font-semibold">
                  Multiple selection allowed
                </div>
              </div>
              <div>
                <BtnGold
                  onClick={handleSwSearch}
                  loading={swSearching}
                  disabled={!swSector || swSearching || swSectorLoading}
                  className="py-[10px] px-8 mt-7"
                >
                  Search
                </BtnGold>
              </div>
            </div>
          </div>

          {/* Criteria scroll tabs + ratio panel — shown only after Search */}
          {swSearchedCriteriaData.length > 0 ? (
            <>
              <div className="bg-white rounded-xl px-3 mb-2 border border-slate-200">
                <ScrollTabs
                  items={swTabItems}
                  activeId={swActiveTab}
                  onTabClick={setSwActiveTab}
                />
              </div>
              <div className="mb-2">
                <RatiosPanel ratios={swRatios} onThresholdChange={handleSwThresholdChange} />
              </div>
            </>
          ) : (
            <div className="mb-2">
              <RatiosPanel ratios={[]} />
            </div>
          )}

          {/* Action row */}
          <div className="flex justify-end gap-2 mb-2">
            <BtnPrimary
              onClick={handleSwGenerate}
              loading={swGenerating}
              disabled={swSearchedCriteriaData.length === 0 || swGenerating}
            >
              Generate Report
            </BtnPrimary>
            <ExportBtn
              disabled={!swExportPayload || swExportingPdf || swExportingExcel}
              onExcel={() => handleSwExport('excel')}
              onPdf={() => handleSwExport('pdf')}
            />
          </div>

          {/* Results table */}
          <CommonTable
            columns={swColumns}
            data={swSorted}
            sortCol={swSortCol}
            sortDir={swSortDir}
            onSort={swHandleSort}
            emptyText={swReport ? 'No Record Found' : 'Generate the report to view results.'}
            headerBg="#E0E6F6"
            headerTextColor="#041E66"
            rowBg="#ffffff"
            rowHoverBg="#EFF3FF"
          />
        </>
      )}
    </div>
  )
}

export default BasketManagementPage
