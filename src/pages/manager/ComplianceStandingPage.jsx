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
 *  4. Export downloads the same report as PDF / Excel.
 *
 * Status ∈ Compliant | Non-Compliant | Suspended | Data Not Available.
 *  IsCarried  → status shown orange (carried forward from an earlier quarter).
 *  IsException→ Shariah-advisor exception (backend already forces Compliant); we
 *               show an "Exception" tag with the reason as a tooltip.
 *
 * Thresholds payload (Steps 2–4) per ratio:
 *  { FK_FinancialRatiosID, ThresholdValue, IsMaxValidationApplied (1/0), ThresholdUnit }.
 *  RatiosPanel edits only the value; unit + Max/Min are preserved from Step 1.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { BtnGold, BtnPrimary, ExportBtn, MultiSelect } from '../../components/common/index.jsx'
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
const StatusCell = ({ row }) => (
  <div className="flex items-center justify-center gap-1.5">
    <span
      className="text-[13px] font-semibold"
      style={{ color: row.isCarried ? '#F5A623' : STATUS_COLOR[row.status] || '#a0aec0' }}
      title={row.isCarried ? 'Carried forward from an earlier quarter' : undefined}
    >
      {row.status || '—'}
    </span>
    {row.isException && (
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#fff4e0] text-[#F5A623]"
        title={row.exceptionReason || 'Shariah-advisor exception'}
      >
        Exception
      </span>
    )}
  </div>
)

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => (a[col] || '').toString().localeCompare((b[col] || '').toString()) * d)
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
      showError(complianceStandingError(rr?.responseMessage) || res.message || 'Failed to load thresholds.')
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
      showError(complianceStandingError(rr?.responseMessage) || res.message || 'Failed to generate report.')
      return
    }

    setResults(
      (rr.results || []).map((r, idx) => ({
        id: idx,
        company: r.company || '',
        sector: r.sector || '',
        quarter: r.quarter || '',
        status: r.status || '',
        isCarried: !!r.isCarried,
        isException: !!r.isException,
        exceptionReason: r.exceptionReason || '',
      }))
    )
    setReportGenerated(true)
  }, [criteriaId, selCompanies, buildThresholdPayload])

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
      downloadBase64(rr.fileContent, rr.fileName || `ComplianceStanding.${isPdf ? 'pdf' : 'xlsx'}`, mime)
    },
    [selCompanies, criteriaId, buildThresholdPayload]
  )

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = useCallback((col) => {
    setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
    setSortCol(col)
  }, [sortCol]) // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  const columns = useMemo(
    () => [
      { key: 'company', title: 'Company Name', sortable: true },
      { key: 'sector', title: 'Sector', sortable: true, align: 'center' },
      { key: 'quarter', title: 'Quarter Name', sortable: true, align: 'center' },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => <StatusCell row={row} />,
      },
    ],
    []
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
    </div>
  )
}

export default ComplianceStandingPage
