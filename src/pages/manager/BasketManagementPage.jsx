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
 *  GetQuarterWiseNonCompliantDetailApi  — Per-ratio breakdown for Non-Compliant modal
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
import { CircleAlert, ArrowUp, ArrowDown } from 'lucide-react'
import {
  BtnGold,
  BtnPrimary,
  BtnDark,
  BtnModalClose,
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
import {
  GetQuarterWiseNonCompliantDetailApi,
  isQuarterWiseSuccess,
  quarterWiseError,
} from '../../services/quarterWise.service.js'

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
// hideSector: true for Sector-wise tab (all rows share the same sector, column is redundant).
// onNonCompliantClick(companyID, quarterId, criteriaID, ratioThresholds) — called when a Non-Compliant cell is clicked.
const buildColumns = (criteriaData, onNonCompliantClick, { hideSector = false } = {}) => [
  { key: 'ticker', title: 'Ticker', sortable: true },
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
  ...(!hideSector ? [{ key: 'sector', title: 'Sector Name', sortable: true }] : []),
  { key: 'quarter', title: 'Quarter Name', sortable: true, align: 'center' },
  ...criteriaData.map((c) => ({
    key: `c_${c.complianceCriteriaID}`,
    title: c.criteriaName,
    sortable: true,
    align: 'center',
    render: (row) => {
      const status = row[`c_${c.complianceCriteriaID}`]
      const isNonCompliant = String(status || '').toLowerCase() === 'non-compliant'
      if (isNonCompliant && onNonCompliantClick) {
        return (
          <button
            type="button"
            className="cursor-pointer underline decoration-dotted underline-offset-2"
            onClick={() =>
              onNonCompliantClick(row.id, row.quarterId, c.complianceCriteriaID, c.ratioThresholds)
            }
          >
            <StatusText status={status} />
          </button>
        )
      }
      return <StatusText status={status} />
    },
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
// quarterId: r.quarterID — backend must add QuarterID to GenerateBasketManagement response (2026-07-06)
// ⚠️ backend sp_GenerateBasketManagement must also SELECT Ticker from Company
const mapResultRows = (results) =>
  (results || []).map((r) => {
    const row = {
      id: r.companyID,
      company: r.company,
      sector: r.sector,
      quarter: r.quarter,
      quarterId: r.quarterID || 0,
      ticker: r.ticker || '',
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
  return [...rows].sort(
    (a, b) =>
      String(a[col] ?? '')
        .toLowerCase()
        .localeCompare(String(b[col] ?? '').toLowerCase()) * d
  )
}

// ── Non-Compliant Detail Modal ──────────────────────────────────────────────
const NonCompliantDetailModal = ({ detail, loading, onClose }) => {
  if (!detail && !loading) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[920px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-200">
          <h2 className="text-[16px] font-semibold text-[#041E66]">Non-Compliant Details</h2>
          <BtnModalClose onClick={onClose} />
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <>
              {/* Meta */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Company</p>
                  <p className="text-[13px] font-semibold text-[#041E66]">{detail.companyName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Quarter</p>
                  <p className="text-[13px] font-semibold text-[#041E66]">{detail.quarterName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Criteria</p>
                  <p className="text-[13px] font-semibold text-[#041E66]">{detail.criteriaName}</p>
                </div>
              </div>

              {/* Ratios table */}
              <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ backgroundColor: '#E0E6F6' }}>
                      <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
                        Financial Ratio
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
                        Threshold
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
                        Validation
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
                        Calculated Value
                      </th>
                      <th className="px-4 py-2.5 text-center text-[12px] font-semibold text-[#041E66]">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.ratios || []).map((r, i) => (
                      <tr key={i} className="border-t border-[#eef2f7]">
                        <td className="px-4 py-2 text-[#041E66]">{r.ratioName}</td>
                        <td className="px-4 py-2 text-center text-[#041E66]">
                          {r.thresholdValue != null ? r.thresholdValue : '—'}
                          {r.thresholdUnit ? ` ${r.thresholdUnit}` : ''}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {Number(r.isMaxValidation) === 1 ? (
                            <ArrowUp size={16} className="text-red-500 inline-block" />
                          ) : (
                            <ArrowDown size={16} className="text-red-500 inline-block" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center text-[#041E66]">
                          {r.calculatedValue != null ? r.calculatedValue : '—'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: r.passed ? '#e6faf5' : '#fef2f2',
                              color: r.passed ? '#01C9A4' : '#E74C3C',
                            }}
                          >
                            {r.passed ? 'Compliant' : 'Non-Compliant'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!detail.ratios || detail.ratios.length === 0) && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-4 text-center text-slate-400 text-[13px]"
                        >
                          No ratio details available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 pb-4">
          <BtnDark onClick={onClose}>Close</BtnDark>
        </div>
      </div>
    </div>
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
        const companies = cSettled.value.data?.responseResult?.companies || []
        setCompanyOpts(
          companies.map((c) => ({
            label: c.companyName || '',
            value: c.pK_CompanyID,
          }))
        )
        // All companies selected by default (Customized Basket tab)
        setCbCompanies(companies.map((c) => c.pK_CompanyID))
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
        const criteria = crSettled.value.data?.responseResult?.complianceCriteria || []
        setCriteriaOpts(
          criteria.map((c) => ({
            label: c.criteriaName || '',
            value: c.pK_ComplianceCriteriaID,
          }))
        )
        // Default Compliance Criteria selected by default (both tabs)
        const defaultCriteria = criteria.find((c) => c.isDefault)
        if (defaultCriteria) {
          setCbCriteria([defaultCriteria.pK_ComplianceCriteriaID])
          setSwCriteria([defaultCriteria.pK_ComplianceCriteriaID])
        }
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
    const hasZero = cbSearchedCriteriaData.some((c) =>
      c.ratioThresholds.some((r) => r.thresholdValue === '' || Number(r.thresholdValue) <= 0)
    )
    if (hasZero) {
      showError('All threshold values must be greater than zero.')
      return
    }
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
      ).map((r) => ({
        name: r.financialRatioName,
        threshold: String(r.thresholdValue ?? ''),
        unit: r.thresholdUnit || '%',
        isMax: Number(r.isMaxValidationApplied) === 1,
      })),
    [cbSearchedCriteriaData, cbActiveTab]
  )

  const cbTabItems = cbSearchedCriteriaData.map((c) => ({
    id: c.complianceCriteriaID,
    label: c.criteriaName,
  }))

  // ── Non-Compliant detail modal state ─────────────────────────────────────
  const [ncDetail, setNcDetail] = useState(null)
  const [ncLoading, setNcLoading] = useState(false)

  const handleNonCompliantClick = useCallback(
    async (companyID, quarterID, criteriaID, ratioThresholds) => {
      setNcDetail(null)
      setNcLoading(true)
      const res = await GetQuarterWiseNonCompliantDetailApi(
        {
          CompanyID: companyID,
          QuarterID: quarterID,
          ComplianceCriteriaID: criteriaID,
          RatioThresholds: (ratioThresholds || []).map((r) => ({
            FK_FinancialRatiosID: r.fK_FinancialRatiosID,
            ThresholdValue: parseFloat(r.thresholdValue) || 0,
            IsMaxValidationApplied: r.isMaxValidationApplied ?? 0,
            ThresholdUnit: r.thresholdUnit || '%',
          })),
        },
        { skipLoader: true }
      )
      setNcLoading(false)

      const rr = res?.data?.responseResult
      if (!res.success || !isQuarterWiseSuccess(rr)) {
        showError(quarterWiseError(rr?.responseMessage) || res.message || 'Failed to load details.')
        return
      }
      setNcDetail(rr)
    },
    []
  )

  const cbColumns = useMemo(
    () => buildColumns(cbSearchedCriteriaData, handleNonCompliantClick),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cbSearchedCriteriaData]
  )

  const cbHandleSort = (col) => {
    if (cbSortCol === col) setCbSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setCbSortCol(col)
      setCbSortDir('asc')
    }
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
    const hasZero = swSearchedCriteriaData.some((c) =>
      c.ratioThresholds.some((r) => r.thresholdValue === '' || Number(r.thresholdValue) <= 0)
    )
    if (hasZero) {
      showError('All threshold values must be greater than zero.')
      return
    }
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
      ).map((r) => ({
        name: r.financialRatioName,
        threshold: String(r.thresholdValue ?? ''),
        unit: r.thresholdUnit || '%',
        isMax: Number(r.isMaxValidationApplied) === 1,
      })),
    [swSearchedCriteriaData, swActiveTab]
  )

  const swTabItems = swSearchedCriteriaData.map((c) => ({
    id: c.complianceCriteriaID,
    label: c.criteriaName,
  }))

  const swColumns = useMemo(
    () => buildColumns(swSearchedCriteriaData, handleNonCompliantClick, { hideSector: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [swSearchedCriteriaData]
  )

  const swHandleSort = (col) => {
    if (swSortCol === col) setSwSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSwSortCol(col)
      setSwSortDir('asc')
    }
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
                <ScrollTabs items={cbTabItems} activeId={cbActiveTab} onTabClick={setCbActiveTab} />
              </div>
              <div className="mb-2">
                <RatiosPanel ratios={cbRatios} onThresholdChange={handleCbThresholdChange} showValidation />
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
                <ScrollTabs items={swTabItems} activeId={swActiveTab} onTabClick={setSwActiveTab} />
              </div>
              <div className="mb-2">
                <RatiosPanel ratios={swRatios} onThresholdChange={handleSwThresholdChange} showValidation />
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

      {/* Non-Compliant detail modal */}
      <NonCompliantDetailModal
        detail={ncDetail}
        loading={ncLoading}
        onClose={() => {
          setNcDetail(null)
          setNcLoading(false)
        }}
      />
    </div>
  )
}

export default BasketManagementPage
