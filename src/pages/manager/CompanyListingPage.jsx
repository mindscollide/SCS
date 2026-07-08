/**
 * CompanyListingPage.jsx
 * =======================
 * Company Listing report (SRS Report #5) — Manager or View Only role.
 *
 * APIs used:
 *  GetAllActiveSectorsApi              — Sector multiselect (localStorage-cached)
 *  GetAllActiveMarketsApi              — Market multiselect (localStorage-cached)
 *  GetAllActiveReportingMonthsApi      — Annual Reporting multiselect (localStorage-cached)
 *  GetAllActiveReportingFrequencyApi   — Reporting Frequency multiselect (localStorage-cached)
 *  GetCompanyListingReportApi          — Generate Report
 *  ExportCompanyListingReportPDFApi    — Export → base64 PDF
 *  ExportCompanyListingReportExcelApi  — Export → base64 XLSX
 *
 * IMPORTANT — response codes differ between Generate and Export endpoints:
 *  GetCompanyListingReport:            _01 Unauthorized | _02 No records | _03 Success       | _04 Exception
 *  ExportCompanyListingReport (PDF):   _01 Unauthorized | _02 Success    | _03 Exception
 *  ExportCompanyListingReportExcel:    _01 Unauthorized | _02 Success    | _03 Exception
 *  (Exports have no "empty results" code — success is always _02.)
 *
 * All filters optional — empty array / 0 / null = all companies. No MQTT (read-only).
 *
 * UI layout:
 *  ▸ #EFF3FF header band — title only
 *  ▸ #EFF3FF filter card — 4 MultiSelects (Annual Reporting, Market, Sector, Reporting Frequency)
 *      + Status (SearchableSelect) + Exception (Checkbox) + Generate Report (BtnPrimary)
 *  ▸ Action row — Export (ExportBtn, enabled after generate)
 *  ▸ CommonTable — Company Name | Ticker | Sector | Market | Reporting Frequency | Status
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { CircleAlert } from 'lucide-react'
import {
  BtnPrimary,
  ExportBtn,
  StatusText,
  MultiSelect,
  Checkbox,
} from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  GetAllActiveSectorsApi,
  GetAllActiveMarketsApi,
  GetAllActiveReportingMonthsApi,
  GetAllActiveReportingFrequencyApi,
  GetCompanyListingReportApi,
  ExportCompanyListingReportPDFApi,
  ExportCompanyListingReportExcelApi,
  GET_COMPANY_LISTING_REPORT_CODES,
} from '../../services/manager.service.js'

// ── Config ──────────────────────────────────────────────────────────────────
// Generate — success/empty codes
const REPORT_OK = 'Manager_ManagerServiceManager_GetCompanyListingReport_03'
const REPORT_EMPTY = 'Manager_ManagerServiceManager_GetCompanyListingReport_02'

// Export — success is _02 (NOT _03 — exports use a different code scheme than Generate)
const EXPORT_PDF_OK = 'Manager_ManagerServiceManager_ExportCompanyListingReport_02'
const EXPORT_EXCEL_OK = 'Manager_ManagerServiceManager_ExportCompanyListingReportExcel_02'

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

// ── Response-code helper (Generate) ─────────────────────────────────────────
const reportError = (code) => {
  if (!code) return 'Something went wrong, please try again.'
  return GET_COMPANY_LISTING_REPORT_CODES[code] || 'Something went wrong, please try again.'
}

// ── Response-code helper (Export — _01 Unauthorized / _03 Exception) ───────
const exportError = (code) => {
  if (!code) return 'Export failed, please try again.'
  if (code.endsWith('_01')) return 'Unauthorized access.'
  if (code.endsWith('_03')) return 'Something went wrong, please try again.'
  return 'Export failed, please try again.'
}

// Hardcoded — no dedicated status API provided
const STATUS_OPTIONS = [
  { value: 1, label: 'Active' },
  { value: 2, label: 'In-Active' },
]

// ── API response row → local table shape ──────────────────────────────────────
const mapRow = (r) => ({
  id: r.companyID,
  company: r.company || '',
  ticker: r.ticker || '',
  sector: r.sectorName || '',
  market: r.marketName || '',
  reportingMonth: r.reportingMonth || '',
  frequency: r.reportingFrequency || '',
  status: r.status || 'Active',
  isException: !!r.isException,
  exceptionReason: r.exceptionReason || '',
})

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * d)
}

// ─────────────────────────────────────────────────────────────────────────────

const CompanyListingPage = () => {
  // ── Dropdown options (from API) ───────────────────────────────────────────
  const [sectorOptions, setSectorOptions] = useState([])
  const [marketOptions, setMarketOptions] = useState([])
  const [reportingMonthOptions, setReportingMonthOptions] = useState([])
  const [frequencyOptions, setFrequencyOptions] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // ── Filters ───────────────────────────────────────────────────────────
  const [selAnnual, setSelAnnual] = useState([]) // ReportingMonthIDs
  const [selMarkets, setSelMarkets] = useState([]) // MarketIDs
  const [selSectors, setSelSectors] = useState([]) // SectorIDs
  const [selFrequency, setSelFrequency] = useState([]) // ReportingFrequencyIDs (multi)
  const [selStatus, setSelStatus] = useState(0) // single FK_CompanyStatusID
  const [exception, setException] = useState(false)

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results, setResults] = useState([])
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportPayload, setExportPayload] = useState(null)
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  const fetchedRef = useRef(false)

  // ── Load dropdowns on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      setLoadingOptions(true)
      const [sectorsRes, marketsRes, monthsRes, freqsRes] = await Promise.all([
        GetAllActiveSectorsApi({}, { skipLoader: true }),
        GetAllActiveMarketsApi({}, { skipLoader: true }),
        GetAllActiveReportingMonthsApi({}, { skipLoader: true }),
        GetAllActiveReportingFrequencyApi({}, { skipLoader: true }),
      ])

      if (sectorsRes.success) {
        const sectors = sectorsRes.data?.responseResult?.sectors || []
        setSectorOptions(sectors.map((s) => ({ label: s.sectorName, value: s.pK_SectorID })))
      }
      if (marketsRes.success) {
        const markets = marketsRes.data?.responseResult?.markets || []
        setMarketOptions(markets.map((m) => ({ label: m.marketName, value: m.pK_MarketID })))
      }
      if (monthsRes.success) {
        const months = monthsRes.data?.responseResult?.reportingMonths || []
        setReportingMonthOptions(
          months.map((m) => ({ label: m.monthName, value: m.pK_ReportingMonthID }))
        )
      }
      if (freqsRes.success) {
        const freqs = freqsRes.data?.responseResult?.reportingFrequencies || []
        setFrequencyOptions(
          freqs.map((f) => ({ label: f.frequencyName, value: f.pK_ReportingFrequencyID }))
        )
      }
      setLoadingOptions(false)
    }

    load()
  }, [])

  // ── Shared payload builder (Generate + both Exports use the same shape) ────
  const buildPayload = useCallback(
    () => ({
      MarketIDs: selMarkets,
      SectorIDs: selSectors,
      ReportingMonthIDs: selAnnual,
      ReportingFrequencyIDs: selFrequency,
      FK_CompanyStatusID: Number(selStatus) || 0,
      IsException: exception ? 1 : null,
    }),
    [selMarkets, selSectors, selAnnual, selFrequency, selStatus, exception]
  )

  // ── Generate Report ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    const res = await GetCompanyListingReportApi(buildPayload(), { skipLoader: true })
    setGenerating(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''

    if (code === REPORT_EMPTY) {
      setResults([])
      setReportGenerated(true)
      return
    }

    if (!res.success || code !== REPORT_OK) {
      showError(reportError(code) || res.message)
      return
    }

    const rows = Array.isArray(rr.results) ? rr.results.map(mapRow) : []
    setResults(rows)
    setExportPayload(buildPayload())
    setReportGenerated(true)
  }, [buildPayload])

  // ── Export (PDF / Excel) ────────────────────────────────────────────────────
  // NOTE: export success code is _02, NOT _03 — different scheme from Generate.
  const handleExport = useCallback(
    async (kind) => {
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setExportingPdf : setExportingExcel
      setBusy(true)
      const api = isPdf ? ExportCompanyListingReportPDFApi : ExportCompanyListingReportExcelApi
      const res = await api(exportPayload, { skipLoader: true })
      setBusy(false)

      const rr = res?.data?.responseResult
      const code = rr?.responseMessage || ''
      const successCode = isPdf ? EXPORT_PDF_OK : EXPORT_EXCEL_OK

      if (!res.success || code !== successCode || !rr?.fileContent) {
        showError(exportError(code) || res.message || 'Export failed.')
        return
      }

      const mime =
        rr.contentType ||
        (isPdf
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      downloadBase64(
        rr.fileContent,
        rr.fileName || `CompanyListing.${isPdf ? 'pdf' : 'xlsx'}`,
        mime
      )
    },
    [exportPayload]
  )

  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  // ── Table columns ─────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
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

      { key: 'sector', title: 'Sector Name', sortable: true, align: 'center' },
      { key: 'market', title: 'Market Names', sortable: true, align: 'center' },
      { key: 'reportingMonth', title: 'Annual Reporting', sortable: true, align: 'center' },
      { key: 'frequency', title: 'Reporting Frequency', sortable: true, align: 'center' },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        align: 'center',
        render: (row) => <StatusText status={row.status} />,
      },
    ],
    []
  )

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Company Listing</h1>
      </div>

      {/* Filter card */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        {/* Row 1 — 4 MultiSelects */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div>
            <MultiSelect
              label="Annual Reporting"
              options={reportingMonthOptions}
              selected={selAnnual}
              onChange={setSelAnnual}
              placeholder="Select Annual Reporting"
              disabled={loadingOptions}
            />
            <div className="text-slate flex justify-end text-[12px] font-semibold">
              Multiple selection allowed
            </div>
          </div>
          <div>
            <MultiSelect
              label="Market"
              options={marketOptions}
              selected={selMarkets}
              onChange={setSelMarkets}
              placeholder="Select Market"
              disabled={loadingOptions}
            />
            <div className="text-slate flex justify-end text-[12px] font-semibold">
              Multiple selection allowed
            </div>
          </div>
          <div>
            <MultiSelect
              label="Sector"
              options={sectorOptions}
              selected={selSectors}
              onChange={setSelSectors}
              placeholder="Select Sector"
              disabled={loadingOptions}
            />
            <div className="text-slate flex justify-end text-[12px] font-semibold">
              Multiple selection allowed
            </div>
          </div>
          <div>
            <MultiSelect
              label="Reporting Frequency"
              options={frequencyOptions}
              selected={selFrequency}
              onChange={setSelFrequency}
              placeholder="Select Reporting Frequency"
              disabled={loadingOptions}
            />
            <div className="text-slate flex justify-end text-[12px] font-semibold">
              Multiple selection allowed
            </div>
          </div>
        </div>

        {/* Row 2 — Status + Exception + Generate */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SearchableSelect
            label="Status"
            value={selStatus}
            onChange={setSelStatus}
            options={STATUS_OPTIONS}
            placeholder="Select Status"
          />
          <div>
            <div className="block text-[12px] font-medium text-[#041E66] mb-[16px]">Exception</div>
            <Checkbox
              label="Exception by Shariah Advisor"
              checked={exception}
              onChange={(e) => setException(e.target.checked)}
            />
          </div>
          <div className="md:col-start-4">
            <div className="h-[18px] mb-1.5" />
            <BtnPrimary onClick={handleGenerate} loading={generating} disabled={generating}>
              Generate Report
            </BtnPrimary>
          </div>
        </div>
      </div>

      {/* Action row — Export */}
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
        rowBg="#ffffff"
      />
    </div>
  )
}

export default CompanyListingPage
