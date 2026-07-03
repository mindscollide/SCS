/**
 * pages/manager/ComplianceStandingPage.jsx
 * ==========================================
 * Compliance Standing report (SRS Report #1) — shared by Manager & Data Entry.
 *
 * The four report endpoints exist identically on BOTH services; the role-aware
 * wrapper in `complianceStanding.service.js` posts to the right one. Routed at
 * /manager/reports/compliance-standing AND /data-entry/reports/compliance-standing.
 *
 * APIs:
 *  GetComplianceStandingThresholdsApi  — Search → prefill the editable thresholds
 *  GenerateComplianceStandingApi       — Generate Report → results table
 *  ExportComplianceStandingApi         — Export → base64 PDF
 *  ExportComplianceStandingExcelApi    — Export → base64 XLSX
 *  GetAllActiveCompanyNamesApi         — Companies multiselect (open, cached)
 *
 *  GetComplianceStandingNonCompliantDetailApi — click Non-Compliant cell →
 *    per-ratio detail modal (added 2026-07-03; reuses sp_GetQuarterWiseNonCompliantDetail).
 *
 * Compliance Criteria field (BOTH roles): LOCKED to the system **default**
 * criteria — shown pre-selected and DISABLED (per requirement 2026-06-12). The
 * value comes from the default seeded at login (getDefaultCriteria / localStorage,
 * kept fresh by MQTT). The report therefore always runs against the current
 * default; there is no criteria picker. (This also sidesteps the fact that the
 * DataEntry service has no endpoint to list all criteria.)
 *
 * Flow:
 *  1. Pick Companies (empty = all active) + a Compliance Criteria → Search.
 *  2. Search loads the criteria's editable thresholds into RatiosPanel.
 *  3. Generate Report runs the engine with the (optionally edited) thresholds.
 *  4. Click Non-Compliant status cell → detail modal with per-ratio breakdown.
 *  5. Export downloads the same report as PDF / Excel.
 *
 * Status ∈ Compliant | Non-Compliant | Suspended | Data Not Available.
 *  IsCarried  → status shown orange (carried forward from an earlier quarter).
 *  IsException→ Shariah-advisor exception (backend already forces Compliant);
 *               CircleAlert icon shown after Company Name (same as Company Setup)
 *               with exceptionReason as tooltip. Status column shows status only.
 *
 * Thresholds payload (Steps 2–4) per ratio:
 *  { FK_FinancialRatiosID, ThresholdValue, IsMaxValidationApplied (1/0), ThresholdUnit }.
 *  RatiosPanel edits only the value; unit + Max/Min are preserved from Step 1.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { CircleAlert, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'react-toastify'
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
import { GetAllActiveCompanyNamesApi } from '../../services/manager.service.js'
import { getDefaultCriteria } from '../../utils/defaultCriteria.js'
import {
  GetComplianceStandingThresholdsApi,
  GenerateComplianceStandingApi,
  ExportComplianceStandingApi,
  ExportComplianceStandingExcelApi,
  GetComplianceStandingNonCompliantDetailApi,
  isComplianceStandingSuccess,
  complianceStandingError,
} from '../../services/complianceStanding.service.js'

// ── Config ──────────────────────────────────────────────────────────────────
const COMPANY_NAMES_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'

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

// ── Status cell — colour by status, orange when carried, exception tag ────────
const STATUS_COLOR = {
  Compliant: '#01C9A4',
  'Non-Compliant': '#E74C3C',
  Suspended: '#7b8db0',
  'Data Not Available': '#a0aec0',
}
const StatusCell = ({ row, onNonCompliantClick }) => {
  const isNonCompliant = row.status === 'Non-Compliant'
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span
        className={`text-[13px] font-semibold${isNonCompliant ? ' cursor-pointer underline decoration-dotted' : ''}`}
        style={{ color: row.isCarried ? '#F5A623' : STATUS_COLOR[row.status] || '#a0aec0' }}
        title={
          row.isCarried
            ? 'Carried forward from an earlier quarter'
            : isNonCompliant
              ? 'Click for details'
              : undefined
        }
        onClick={isNonCompliant ? () => onNonCompliantClick(row) : undefined}
      >
        {row.status || '—'}
      </span>
    </div>
  )
}

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort(
    (a, b) => (a[col] || '').toString().localeCompare((b[col] || '').toString()) * d
  )
}

// ── Non-Compliant Detail Modal (same pattern as QuarterWiseReportPage) ────────
const NonCompliantDetailModal = ({ detail, loading, onClose }) => {
  if (!detail && !loading) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[600px] mx-4">
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
                        Calculated
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

const ComplianceStandingPage = () => {
  // ── Dropdown options ──────────────────────────────────────────────────────
  const [companyOpts, setCompanyOpts] = useState([]) // [{ label, value: PK_CompanyID }]
  const [criteriaOpts, setCriteriaOpts] = useState([]) // [{ label, value: PK_ComplianceCriteriaID }]

  // ── Filters ───────────────────────────────────────────────────────────────
  const [selCompanies, setSelCompanies] = useState([]) // [] = all active companies
  const [criteriaId, setCriteriaId] = useState('')

  // ── Thresholds (editable) — rows carry ratioId/unit/isMax for the payload ──
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

  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  const fetchedRef = useRef(false)

  // ── Load dropdowns on mount (StrictMode-guarded) ──────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const loadCompanies = async () => {
      const res = await GetAllActiveCompanyNamesApi({}, { skipLoader: true })
      if (res.success && res.data?.responseResult?.responseMessage === COMPANY_NAMES_OK) {
        setCompanyOpts(
          (res.data.responseResult.companies || []).map((c) => ({
            label: c.companyName || '',
            value: c.pK_CompanyID,
          }))
        )
      }
    }

    loadCompanies()

    // Compliance Criteria is locked to the system default (same for both roles).
    // Seed the single (disabled) option + its value from localStorage.
    const def = getDefaultCriteria()[0]
    if (def?.pK_ComplianceCriteriaID) {
      setCriteriaOpts([{ label: def.criteriaName || '', value: def.pK_ComplianceCriteriaID }])
      setCriteriaId(def.pK_ComplianceCriteriaID)
    }
  }, [])

  // ── Search → load the criteria's editable thresholds (Step 1) ─────────────
  const handleSearch = useCallback(async () => {
    if (!criteriaId) {
      showError('Please select a compliance criteria.')
      return
    }
    setLoadingThresholds(true)
    setReportGenerated(false)
    setResults([])

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

    // Map API thresholds → RatiosPanel rows, preserving ratioId/unit/isMax for Step 2.
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
  }, [criteriaId, selCompanies])

  const handleThresholdChange = useCallback((i, val) => {
    setRatios((prev) => prev.map((r, idx) => (idx === i ? { ...r, threshold: val } : r)))
  }, [])

  // Build the RatioThresholds payload shared by Generate + both exports.
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
    setGenerating(true)
    const res = await GenerateComplianceStandingApi(
      {
        CompanyIDs: selCompanies,
        ComplianceCriteriaID: criteriaId,
        RatioThresholds: buildThresholdPayload(),
      },
      { skipLoader: true }
    )
    setGenerating(false)

    const rr = res?.data?.responseResult
    if (!res.success || !isComplianceStandingSuccess(rr)) {
      showError(
        complianceStandingError(rr?.responseMessage) || res.message || 'Failed to generate report.'
      )
      return
    }

    setResults(
      (rr.results || []).map((r, idx) => ({
        id: idx,
        companyID: r.companyID,
        company: r.company || '',
        sector: r.sector || '',
        quarter: r.quarter || '',
        quarterID: r.quarterID,
        status: r.status || '',
        isCarried: !!r.isCarried,
        isException: !!r.isException,
        exceptionReason: r.exceptionReason || '',
      }))
    )
    setReportGenerated(true)
  }, [criteriaId, selCompanies, buildThresholdPayload])

  // ── Non-Compliant detail click ────────────────────────────────────────────
  const handleNonCompliantClick = useCallback(
    async (row) => {
      setNcLoading(true)
      setNcDetail(null)

      const res = await GetComplianceStandingNonCompliantDetailApi(
        {
          CompanyID: row.companyID,
          QuarterID: row.quarterID,
          ComplianceCriteriaID: criteriaId,
          RatioThresholds: buildThresholdPayload(),
        },
        { skipLoader: true }
      )
      setNcLoading(false)

      const rr = res?.data?.responseResult
      if (!res.success || !isComplianceStandingSuccess(rr)) {
        showError(
          complianceStandingError(rr?.responseMessage) || res.message || 'Failed to load details.'
        )
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
      const api = isPdf ? ExportComplianceStandingApi : ExportComplianceStandingExcelApi
      const res = await api(
        {
          CompanyIDs: selCompanies,
          ComplianceCriteriaID: criteriaId,
          RatioThresholds: buildThresholdPayload(),
        },
        { skipLoader: true }
      )
      setBusy(false)

      const rr = res?.data?.responseResult
      if (!res.success || !isComplianceStandingSuccess(rr)) {
        showError(complianceStandingError(rr?.responseMessage) || res.message || 'Export failed.')
        return
      }
      const mime =
        rr.contentType ||
        (isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      downloadBase64(
        rr.fileContent,
        rr.fileName || `ComplianceStanding.${isPdf ? 'pdf' : 'xlsx'}`,
        mime
      )
    },
    [selCompanies, criteriaId, buildThresholdPayload]
  )

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  ) // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

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
      { key: 'quarter', title: 'Quarter Name', sortable: true, align: 'center' },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => <StatusCell row={row} onNonCompliantClick={handleNonCompliantClick} />,
      },
    ],
    [handleNonCompliantClick]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Compliance Standing</h1>
      </div>

      {/* Filter card */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-start">
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
            {/* Locked to the system default criteria — display only, not editable */}
            <SearchableSelect
              label="Compliance Criteria"
              required
              disabled
              placeholder="No default criteria set"
              value={criteriaId}
              onChange={() => {}}
              options={criteriaOpts}
            />
          </div>

          <div>
            <BtnGold
              onClick={handleSearch}
              loading={loadingThresholds}
              disabled={!criteriaId || loadingThresholds}
              className="py-[10px] px-8 mt-[23px]"
            >
              Search
            </BtnGold>
          </div>
        </div>
      </div>

      {/* Ratios panel — editable thresholds with real unit + Max/Min */}
      <RatiosPanel
        ratios={ratios}
        onThresholdChange={handleThresholdChange}
        showValidation
        emptyText={
          searched ? 'No ratios mapped to this criteria.' : 'Select a criteria and click Search.'
        }
      />

      {/* Action row */}
      <div className="flex justify-end gap-2 mb-2">
        <BtnPrimary
          onClick={handleGenerate}
          loading={generating}
          disabled={!searched || generating}
        >
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

export default ComplianceStandingPage
