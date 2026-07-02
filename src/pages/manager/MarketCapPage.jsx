/**
 * pages/manager/MarketCapPage.jsx
 * =================================
 * Market Capitalization Report (SRS Report #3) — Manager only.
 *
 * Routed at /manager/reports/market-cap.
 *
 * APIs:
 *  GetAllActiveCompanyNamesApi   — Companies multiselect (open, cached)
 *  GetAllActiveQuartersApi       — Quarters multiselect (open, cached)
 *  GenerateMarketCapReportApi    — Generate Report → multi-quarter value matrix
 *  ExportMarketCapReportApi      — Export → base64 PDF
 *  ExportMarketCapReportExcelApi — Export → base64 XLSX
 *
 * No compliance criteria or thresholds — pure data lookup from MarketCapitalization table.
 *
 * Flow:
 *  1. Pick Companies (empty = all active) + Quarters (required, ≥1) → Generate Report.
 *  2. Table shows Company Name | Sector | Quarter1…QuarterN with numeric values.
 *     IsException companies show a CircleAlert (gold) icon after the company name with
 *     exceptionReason as tooltip — requires backend SP to return IsException + ExceptionReason.
 *  3. Export downloads the same report as PDF / Excel.
 *
 * Default sorting: Company Name alphabetical.
 * Sorting on: Company Name, Sector, and all Quarter columns.
 * Values formatted with thousand separators; null = "—".
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { CircleAlert } from 'lucide-react'
import { BtnPrimary, ExportBtn, MultiSelect } from '../../components/common/index.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  GetAllActiveCompanyNamesApi,
  GetAllActiveQuartersApi,
  GenerateMarketCapReportApi,
  ExportMarketCapReportApi,
  ExportMarketCapReportExcelApi,
  MARKET_CAP_REPORT_CODES,
} from '../../services/manager.service.js'

// ── Config ──────────────────────────────────────────────────────────────────
const COMPANY_NAMES_OK = 'Manager_ManagerServiceManager_GetAllActiveCompanyNames_02'
const QUARTERS_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const REPORT_OK = 'Manager_ManagerServiceManager_GenerateMarketCapReport_03'

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

// ── Format number with thousand separators ──────────────────────────────────
const fmtValue = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Sort helper (supports numeric quarter columns) ──────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[col]
    const bv = b[col]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * d
    if (typeof av === 'number') return -1 * d
    if (typeof bv === 'number') return 1 * d
    return String(av ?? '').localeCompare(String(bv ?? '')) * d
  })
}

// ── Response-code helper ────────────────────────────────────────────────────
const reportError = (code) => {
  if (!code) return 'Something went wrong, please try again.'
  return MARKET_CAP_REPORT_CODES[code] || 'Something went wrong, please try again.'
}

// ─────────────────────────────────────────────────────────────────────────────

const MarketCapPage = () => {
  // ── Dropdown options ──────────────────────────────────────────────────────
  const [companyOpts, setCompanyOpts] = useState([])
  const [quarterOpts, setQuarterOpts] = useState([])

  // ── Filters ───────────────────────────────────────────────────────────────
  const [selCompanies, setSelCompanies] = useState([])
  const [selQuarters, setSelQuarters] = useState([])

  // ── Report state ──────────────────────────────────────────────────────────
  const [results, setResults] = useState([])
  const [reportGenerated, setReportGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [generatedQuarters, setGeneratedQuarters] = useState([])

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  const fetchedRef = useRef(false)

  // ── Load dropdowns on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      const [qRes, cRes] = await Promise.all([
        GetAllActiveQuartersApi({}, { skipLoader: true }),
        GetAllActiveCompanyNamesApi({}, { skipLoader: true }),
      ])

      if (qRes.success && qRes.data?.responseResult?.responseMessage === QUARTERS_OK) {
        setQuarterOpts(
          (qRes.data.responseResult.quarters || []).map((q) => ({
            label: q.quarterName || '',
            value: q.pK_QuarterID,
          }))
        )
      }

      if (cRes.success && cRes.data?.responseResult?.responseMessage === COMPANY_NAMES_OK) {
        setCompanyOpts(
          (cRes.data.responseResult.companies || []).map((c) => ({
            label: c.companyName || '',
            value: c.pK_CompanyID,
          }))
        )
      }
    }

    load()
  }, [])

  // ── Generate Report ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (selQuarters.length === 0) {
      showError('Please select at least one quarter.')
      return
    }
    setGenerating(true)
    const res = await GenerateMarketCapReportApi(
      { CompanyIDs: selCompanies, QuarterIDs: selQuarters },
      { skipLoader: true }
    )
    setGenerating(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''
    if (!res.success || code !== REPORT_OK) {
      showError(reportError(code) || res.message)
      return
    }

    // Pivot: one row per company×quarter → company rows with quarter columns
    const raw = rr.results || []
    const grouped = {}
    const quarterNameMap = {}
    raw.forEach((r) => {
      const key = r.companyID ?? r.company
      if (!grouped[key]) {
        grouped[key] = {
          id: r.companyID || key,
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
      grouped[key][qKey] = r.value
      quarterNameMap[r.quarterID] = r.quarter || ''
    })

    const qCols = selQuarters
      .filter((qId) => quarterNameMap[qId])
      .map((qId) => ({ id: qId, name: quarterNameMap[qId], key: `q_${qId}` }))

    setResults(Object.values(grouped))
    setGeneratedQuarters(qCols)
    setReportGenerated(true)
  }, [selCompanies, selQuarters])

  // ── Export (PDF / Excel) ──────────────────────────────────────────────────
  const handleExport = useCallback(
    async (kind) => {
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setExportingPdf : setExportingExcel
      setBusy(true)
      const api = isPdf ? ExportMarketCapReportApi : ExportMarketCapReportExcelApi
      const res = await api(
        { CompanyIDs: selCompanies, QuarterIDs: selQuarters },
        { skipLoader: true }
      )
      setBusy(false)

      const rr = res?.data?.responseResult
      const code = rr?.responseMessage || ''
      if (!res.success || !code.endsWith('_03')) {
        showError(reportError(code) || res.message || 'Export failed.')
        return
      }
      const mime =
        rr.contentType ||
        (isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      downloadBase64(
        rr.fileContent,
        rr.fileName || `MarketCapReport.${isPdf ? 'pdf' : 'xlsx'}`,
        mime
      )
    },
    [selCompanies, selQuarters]
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
      { key: 'sector', title: 'Sector Name', sortable: true, align: 'center' },
      ...generatedQuarters.map((q) => ({
        key: q.key,
        title: q.name,
        sortable: true,
        align: 'center',
        render: (row) => <span className="font-medium text-[#041E66]">{fmtValue(row[q.key])}</span>,
      })),
    ],
    [generatedQuarters]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Market Capitalization</h1>
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
            <BtnPrimary
              onClick={handleGenerate}
              loading={generating}
              disabled={selQuarters.length === 0 || generating}
              className="py-[10px] px-8 mt-[23px]"
            >
              Generate Report
            </BtnPrimary>
          </div>
        </div>
      </div>

      {/* Action row — Export (enabled after generate) */}
      <div className="flex justify-end gap-2 mb-2">
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

export default MarketCapPage
