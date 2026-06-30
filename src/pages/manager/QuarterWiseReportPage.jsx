/**
 * pages/manager/QuarterWiseReportPage.jsx
 * =========================================
 * Quarter-wise Report (SRS Report #2) — Manager only.
 *
 * Routed at /manager/reports/quarter-wise.
 *
 * APIs:
 *  GetComplianceStandingThresholdsApi  — Search → prefill editable thresholds (reused from Report #1)
 *  GenerateQuarterWiseReportApi        — Generate Report → multi-quarter compliance matrix
 *  GetQuarterWiseNonCompliantDetailApi — click Non-Compliant cell → per-ratio detail modal
 *  ExportQuarterWiseReportApi          — Export → base64 PDF
 *  ExportQuarterWiseReportExcelApi     — Export → base64 XLSX
 *  GetAllActiveCompanyNamesApi         — Companies multiselect (open, cached)
 *  GetAllActiveQuartersApi             — Quarters multiselect (open, cached)
 *
 * Compliance Criteria: editable dropdown — loads all criteria from
 * GetComplianceCriteriaApi. No default pre-selected.
 *
 * Flow:
 *  1. Pick Quarters (last 4 default) + Companies (empty = all active)
 *     + Criteria (locked to default) → Search.
 *  2. Search loads the criteria's editable thresholds into RatiosPanel.
 *  3. Generate Report runs the engine with (optionally edited) thresholds.
 *  4. Click Non-Compliant status cell → detail modal with per-ratio breakdown.
 *  5. Export downloads the same report as PDF / Excel.
 *
 * Status ∈ Compliant | Non-Compliant | Suspended | Data Not Available.
 *  IsCarried  → status shown orange (carried forward from an earlier quarter).
 *  IsException→ CircleAlert icon after Company Name (same as Company Setup)
 *               with exceptionReason as tooltip.
 *
 * Non-Compliant Detail modal:
 *  Result column shows "Compliant" / "Non-Compliant" (not Pass/Fail).
 *
 * Table columns are dynamic: Company Name | Sector | Quarter1 … QuarterN.
 * The API returns one row per company×quarter — we pivot to company rows.
 *
 * Default sorting: Company Name alphabetical.
 * Sorting on: Company Name, Sector Name, and all Quarter columns.
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
  MultiSelect,
} from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import RatiosPanel from '../../components/common/report/RatiosPanel.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  GetAllActiveCompanyNamesApi,
  GetAllActiveQuartersApi,
  GetComplianceCriteriaApi,
} from '../../services/manager.service.js'
import {
  GetComplianceStandingThresholdsApi,
  isComplianceStandingSuccess,
  complianceStandingError,
} from '../../services/complianceStanding.service.js'
import {
  GenerateQuarterWiseReportApi,
  GetQuarterWiseNonCompliantDetailApi,
  ExportQuarterWiseReportApi,
  ExportQuarterWiseReportExcelApi,
  isQuarterWiseSuccess,
  quarterWiseError,
} from '../../services/quarterWise.service.js'

// ── Config ──────────────────────────────────────────────────────────────────
const COMPANY_NAMES_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const QUARTERS_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const CRITERIA_OK = 'Manager_ManagerServiceManager_GetComplianceCriteria_03'

const RED_TOAST = {
  style: { backgroundColor: '#E74C3C', color: '#fff' },
  progressStyle: { backgroundColor: '#ffffff50' },
}
const showError = (msg) => toast.error(msg, RED_TOAST)

// ── base64 → file download ────────────────────────────────────────────────────
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

// ── Status colours ──────────────────────────────────────────────────────────
const STATUS_COLOR = {
  Compliant: '#01C9A4',
  'Non-Compliant': '#E74C3C',
  Suspended: '#7b8db0',
  'Data Not Available': '#a0aec0',
}

// ── Sort helper ─────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort(
    (a, b) => (a[col] || '').toString().localeCompare((b[col] || '').toString()) * d
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
                          {Number(r.isMaxValidation) === 1
                            ? <ArrowUp size={16} className="text-red-500 inline-block" />
                            : <ArrowDown size={16} className="text-red-500 inline-block" />}
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
                        <td colSpan={5} className="px-4 py-4 text-center text-slate-400 text-[13px]">
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

const QuarterWiseReportPage = () => {
  // ── Dropdown options ──────────────────────────────────────────────────────
  const [companyOpts, setCompanyOpts] = useState([])
  const [quarterOpts, setQuarterOpts] = useState([])
  const [criteriaOpts, setCriteriaOpts] = useState([])

  // ── Filters ───────────────────────────────────────────────────────────────
  const [selCompanies, setSelCompanies] = useState([])
  const [selQuarters, setSelQuarters] = useState([])
  const [criteriaId, setCriteriaId] = useState('')

  // ── Thresholds (editable) ────────────────────────────────────────────────
  const [ratios, setRatios] = useState([])
  const [searched, setSearched] = useState(false)
  const [loadingThresholds, setLoadingThresholds] = useState(false)

  // ── Report results ────────────────────────────────────────────────────────
  const [results, setResults] = useState([])
  const [reportGenerated, setReportGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  // ── Non-Compliant modal ──────────────────────────────────────────────────
  const [ncDetail, setNcDetail] = useState(null)
  const [ncLoading, setNcLoading] = useState(false)

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // Track which quarter IDs were used for the generated report (columns only
  // update on Generate, not on dropdown change — per SRS requirement).
  const [generatedQuarters, setGeneratedQuarters] = useState([])

  const fetchedRef = useRef(false)

  // ── Load dropdowns on mount (StrictMode-guarded) ──────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      const [qRes, cRes, crRes] = await Promise.all([
        GetAllActiveQuartersApi({}, { skipLoader: true }),
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
        GetComplianceCriteriaApi({ PageSize: 1000, PageNumber: 0 }, { skipLoader: true }),
      ])

      if (qRes.success && qRes.data?.responseResult?.responseMessage === QUARTERS_OK) {
        const opts = (qRes.data.responseResult.quarters || []).map((q) => ({
          label: q.quarterName || '',
          value: q.pK_QuarterID,
        }))
        setQuarterOpts(opts)
      }

      if (cRes.success && cRes.data?.responseResult?.responseMessage === COMPANY_NAMES_OK) {
        setCompanyOpts(
          (cRes.data.responseResult.companies || []).map((c) => ({
            label: c.companyName || '',
            value: c.pK_CompanyID,
          }))
        )
      }

      if (crRes.success && crRes.data?.responseResult?.responseMessage === CRITERIA_OK) {
        setCriteriaOpts(
          (crRes.data.responseResult.complianceCriteria || []).map((c) => ({
            label: c.criteriaName || '',
            value: c.pK_ComplianceCriteriaID,
          }))
        )
      }
    }

    load()
  }, [])

  // ── Search → load editable thresholds (reuses ComplianceStanding Step 1) ──
  const handleSearch = useCallback(async () => {
    if (!criteriaId) {
      showError('Please select a compliance criteria.')
      return
    }
    if (selQuarters.length === 0) {
      showError('Please select at least one quarter.')
      return
    }
    setLoadingThresholds(true)
    setReportGenerated(false)
    setResults([])
    setGeneratedQuarters([])

    const res = await GetComplianceStandingThresholdsApi(
      { ComplianceCriteriaID: criteriaId, CompanyIDs: selCompanies },
      { skipLoader: true }
    )
    setLoadingThresholds(false)

    const rr = res?.data?.responseResult
    if (!res.success || !isComplianceStandingSuccess(rr)) {
      showError(
        complianceStandingError(rr?.responseMessage) || res.message || 'Failed to load thresholds.'
      )
      return
    }

    setRatios(
      (rr.ratioThresholds || []).map((t) => ({
        ratioId: t.fK_FinancialRatiosID,
        name: t.financialRatioName || '',
        threshold: t.thresholdValue ?? '',
        unit: t.thresholdUnit || '%',
        isMax: Number(t.isMaxValidationApplied) === 1,
      }))
    )
    setSearched(true)
  }, [criteriaId, selCompanies, selQuarters])

  const handleThresholdChange = useCallback((i, val) => {
    setRatios((prev) => prev.map((r, idx) => (idx === i ? { ...r, threshold: val } : r)))
  }, [])

  // Build RatioThresholds payload shared by Generate + exports + detail.
  const buildThresholdPayload = useCallback(
    () =>
      ratios.map((r) => ({
        FK_FinancialRatiosID: r.ratioId,
        ThresholdValue: r.threshold === '' ? 0 : Number(r.threshold),
        IsMaxValidationApplied: r.isMax ? 1 : 0,
        ThresholdUnit: r.unit || '%',
      })),
    [ratios]
  )

  // ── Generate Report (Step 2) ──────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!criteriaId) {
      showError('Please select a compliance criteria.')
      return
    }
    if (selQuarters.length === 0) {
      showError('Please select at least one quarter.')
      return
    }
    setGenerating(true)
    const res = await GenerateQuarterWiseReportApi(
      {
        CompanyIDs: selCompanies,
        QuarterIDs: selQuarters,
        ComplianceCriteriaID: criteriaId,
        RatioThresholds: buildThresholdPayload(),
      },
      { skipLoader: true }
    )
    setGenerating(false)

    const rr = res?.data?.responseResult
    if (!res.success || !isQuarterWiseSuccess(rr)) {
      showError(quarterWiseError(rr?.responseMessage) || res.message || 'Failed to generate report.')
      return
    }

    // Pivot: API returns one row per company×quarter → group by company
    const raw = rr.results || []
    const grouped = {}
    const quarterNameMap = {}
    raw.forEach((r) => {
      const key = r.companyID ?? r.company
      if (!grouped[key]) {
        grouped[key] = {
          id: r.companyID || key,
          companyID: r.companyID,
          company: r.company || '',
          sector: r.sector || '',
          isException: false,
          exceptionReason: '',
        }
      }
      if (r.isException) {
        grouped[key].isException = true
        grouped[key].exceptionReason = r.exceptionReason || ''
      }
      const qKey = `q_${r.quarterID}`
      grouped[key][qKey] = r.status || ''
      grouped[key][`${qKey}_carried`] = !!r.isCarried
      grouped[key][`${qKey}_quarterID`] = r.quarterID
      quarterNameMap[r.quarterID] = r.quarter || ''
    })

    // Build the quarter column order from the selected quarters (preserve selection order).
    // Only include quarters that appear in the results.
    const qCols = selQuarters
      .filter((qId) => quarterNameMap[qId])
      .map((qId) => ({ id: qId, name: quarterNameMap[qId], key: `q_${qId}` }))

    setResults(Object.values(grouped))
    setGeneratedQuarters(qCols)
    setReportGenerated(true)
  }, [criteriaId, selCompanies, selQuarters, buildThresholdPayload])

  // ── Non-Compliant detail click ────────────────────────────────────────────
  const handleNonCompliantClick = useCallback(
    async (companyID, quarterID) => {
      setNcLoading(true)
      setNcDetail(null)
      const res = await GetQuarterWiseNonCompliantDetailApi(
        {
          CompanyID: companyID,
          QuarterID: quarterID,
          ComplianceCriteriaID: criteriaId,
          RatioThresholds: buildThresholdPayload(),
        },
        { skipLoader: true }
      )
      setNcLoading(false)

      const rr = res?.data?.responseResult
      if (!res.success || !isQuarterWiseSuccess(rr)) {
        showError(quarterWiseError(rr?.responseMessage) || res.message || 'Failed to load details.')
        return
      }
      setNcDetail({
        companyName: rr.companyName || '',
        quarterName: rr.quarterName || '',
        criteriaName: rr.criteriaName || '',
        ratios: (rr.ratios || []).map((r) => ({
          ratioName: r.ratioName || '',
          thresholdValue: r.thresholdValue,
          thresholdUnit: r.thresholdUnit || '%',
          isMaxValidation: r.isMaxValidation,
          calculatedValue: r.calculatedValue,
          passed: !!r.passed,
        })),
      })
    },
    [criteriaId, buildThresholdPayload]
  )

  // ── Export (PDF / Excel) ──────────────────────────────────────────────────
  const handleExport = useCallback(
    async (kind) => {
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setExportingPdf : setExportingExcel
      setBusy(true)
      const api = isPdf ? ExportQuarterWiseReportApi : ExportQuarterWiseReportExcelApi
      const res = await api(
        {
          CompanyIDs: selCompanies,
          QuarterIDs: selQuarters,
          ComplianceCriteriaID: criteriaId,
          RatioThresholds: buildThresholdPayload(),
        },
        { skipLoader: true }
      )
      setBusy(false)

      const rr = res?.data?.responseResult
      if (!res.success || !isQuarterWiseSuccess(rr)) {
        showError(quarterWiseError(rr?.responseMessage) || res.message || 'Export failed.')
        return
      }
      const mime =
        rr.contentType ||
        (isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      downloadBase64(rr.fileContent, rr.fileName || `QuarterWiseReport.${isPdf ? 'pdf' : 'xlsx'}`, mime)
    },
    [selCompanies, selQuarters, criteriaId, buildThresholdPayload]
  )

  // ── Sorting ───────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  // ── Dynamic columns — Company | Sector | Quarter1…QuarterN ────────────────
  const columns = useMemo(
    () => [
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
      { key: 'sector', title: 'Sector', sortable: true, align: 'center' },
      ...generatedQuarters.map((q) => ({
        key: q.key,
        title: q.name,
        sortable: true,
        align: 'center',
        render: (row) => {
          const status = row[q.key]
          const isCarried = row[`${q.key}_carried`]
          const isNonCompliant = status === 'Non-Compliant'

          return (
            <span
              className={`text-[13px] font-semibold${isNonCompliant ? ' cursor-pointer underline decoration-dotted' : ''}`}
              style={{ color: isCarried ? '#F5A623' : STATUS_COLOR[status] || '#a0aec0' }}
              title={
                isCarried
                  ? 'Carried forward from an earlier quarter'
                  : isNonCompliant
                    ? 'Click for details'
                    : undefined
              }
              onClick={
                isNonCompliant
                  ? () => handleNonCompliantClick(row.companyID, row[`${q.key}_quarterID`])
                  : undefined
              }
            >
              {status || '—'}
            </span>
          )
        },
      })),
    ],
    [generatedQuarters, handleNonCompliantClick]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Quarter Wise Report</h1>
      </div>

      {/* Filter card */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-start">
          <div>
            <SearchableSelect
              label="Compliance Criteria"
              required
              placeholder="-- Select --"
              value={criteriaId}
              onChange={setCriteriaId}
              options={criteriaOpts}
            />
          </div>

          <div>
            <MultiSelect
              label="Quarters"
              required
              options={quarterOpts}
              selected={selQuarters}
              onChange={setSelQuarters}
              placeholder="Select quarters"
              maxSelect={8}
            />
          </div>

          <div>
            <MultiSelect
              label="Companies"
              options={companyOpts}
              selected={selCompanies}
              onChange={setSelCompanies}
              placeholder="All companies"
              helperText="Leave empty to include all active companies"
            />
          </div>

          <div>
            <BtnGold
              onClick={handleSearch}
              loading={loadingThresholds}
              disabled={!criteriaId || selQuarters.length === 0 || loadingThresholds}
              className="py-[10px] px-8 mt-[23px]"
            >
              Search
            </BtnGold>
          </div>
        </div>
      </div>

      {/* Ratios panel — editable thresholds with unit + Max/Min */}
      <RatiosPanel
        ratios={ratios}
        onThresholdChange={handleThresholdChange}
        showValidation
        emptyText={searched ? 'No ratios mapped to this criteria.' : 'Select a criteria and click Search.'}
      />

      {/* Action row */}
      <div className="flex justify-end gap-2 mb-2">
        <BtnPrimary onClick={handleGenerate} loading={generating} disabled={!searched || generating}>
          Generate Report
        </BtnPrimary>
        <ExportBtn
          disabled={!reportGenerated || exportingPdf || exportingExcel}
          onPdf={() => handleExport('pdf')}
          onExcel={() => handleExport('excel')}
        />
      </div>

      {/* Results table */}
      <CommonTable
        columns={columns}
        data={displayed}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        emptyText={reportGenerated ? 'No Record Found' : 'Generate the report to view results.'}
        headerBg="#E0E6F6"
        headerTextColor="#041E66"
        rowBg="#ffffff"
        rowHoverBg="#EFF3FF"
      />

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

export default QuarterWiseReportPage
