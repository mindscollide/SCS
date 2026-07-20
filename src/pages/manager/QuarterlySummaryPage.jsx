/**
 * pages/manager/QuarterlySummaryPage.jsx
 * =========================================
 * Quarterly Summary report — shows compliant / non-compliant / suspended /
 * total company counts, for the selected quarter AND its preceding quarter.
 *
 * APIs:
 *  GetAllActiveQuartersApi        — Quarter dropdown (open, cached)
 *  GenerateQuarterlySummaryApi    — Generate Report → selectedQuarter + precedingQuarter
 *  ExportQuarterlySummaryApi      — Export → base64 PDF
 *  ExportQuarterlySummaryExcelApi — Export → base64 XLSX
 *
 * IMPORTANT — response codes (all three endpoints use the SAME scheme, unlike
 * CompanyListing's report/export split):
 *  _01 Unauthorized | _02 QuarterID required | _03 Success | _04 Unexpected exception
 *
 * The backend now returns both quarters directly in one call — no need to derive
 * the preceding quarter client-side from the quarters dropdown list anymore.
 *
 * UI layout (matches SRS screenshots):
 *  ▸ EFF3FF header band  — title
 *  ▸ Centered filter row — Compliance Criteria (readonly, display-only) + Quarter Name*
 *    (SearchableSelect) + Generate Report (BtnPrimary) + Export (ExportBtn)
 *  ▸ Per-quarter sections — green/teal header bar + 4-column summary table
 *    Section 1 = selected quarter, Section 2 = preceding quarter (omitted if none).
 *
 * Compliance Criteria field: display-only, NOT sent to any API on this page
 * (GenerateQuarterlySummary only takes QuarterID). Shows the system default
 * criteria's name (read once from localStorage at mount, same lightweight
 * pattern as ComplianceCriteriaPage's header — no MQTT re-sync needed here
 * since it's informational only, not used for report generation).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { BtnPrimary, ExportBtn } from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import { getDefaultCriteriaName } from '../../utils/defaultCriteria.js'
import {
  GetAllActiveQuartersApi,
  GenerateQuarterlySummaryApi,
  ExportQuarterlySummaryApi,
  ExportQuarterlySummaryExcelApi,
  GENERATE_QUARTERLY_SUMMARY_CODES,
} from '../../services/manager.service.js'

// ── Config ──────────────────────────────────────────────────────────────────
const QUARTERS_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'

const GENERATE_OK = 'Manager_ManagerServiceManager_GenerateQuarterlySummary_03'
const EXPORT_PDF_OK = 'Manager_ManagerServiceManager_ExportQuarterlySummary_03'
const EXPORT_EXCEL_OK = 'Manager_ManagerServiceManager_ExportQuarterlySummaryExcel_03'

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

// ── Response-code helper (Generate) — codes are shared shape across all 3 endpoints,
// but message text is specific to Generate's own map. Export errors are handled inline
// since they use their own "_02 = QuarterID required" wording per endpoint name. ──────
const reportError = (code) => {
  if (!code) return 'Something went wrong, please try again.'
  return GENERATE_QUARTERLY_SUMMARY_CODES[code] || 'Something went wrong, please try again.'
}

const exportError = (code) => {
  if (!code) return 'Export failed, please try again.'
  if (code.endsWith('_01')) return 'Unauthorized access.'
  if (code.endsWith('_02')) return 'Please select a quarter.'
  if (code.endsWith('_04')) return 'Something went wrong, please try again.'
  return 'Export failed, please try again.'
}

// ── API section → local table row shape ───────────────────────────────────────
const mapSection = (q) => ({
  quarter: (q.quarterName || '').toUpperCase(),
  compliant: q.compliantCount ?? 0,
  nonCompliant: q.nonCompliantCount ?? 0,
  suspended: q.suspendedCount ?? 0,
  total: q.totalCount ?? 0,
})

// ── Summary section columns ───────────────────────────────────────────────────
const SUMMARY_COLUMNS = [
  {
    key: 'compliant',
    title: "Shariah Compliant Co's",
    align: 'center',
    render: (r) => <span className="text-[#041E66] font-semibold ">{r.compliant}</span>,
  },
  {
    key: 'nonCompliant',
    title: "Shariah Non-Compliant Co's",
    align: 'center',

    render: (r) => <span className="text-[#041E66] font-semibold">{r.nonCompliant}</span>,
  },
  {
    key: 'suspended',
    align: 'center',
    title: "Suspended Co's",
    render: (r) => <span className="text-[#041E66] font-semibold">{r.suspended}</span>,
  },
  {
    key: 'total',
    align: 'center',
    title: "Total Co's",
    render: (r) => <span className="text-[#041E66] font-semibold">{r.total}</span>,
  },
]

// ── Section header — coloured bar above each quarter table ────────────────────
const SectionHeader = ({ label, bgColor }) => (
  <div className={`${bgColor} text-white px-3 py-2 font-semibold text-center`}>
    <span className="text-[13px] font-bold text-white tracking-wide">{label}</span>
  </div>
)
// Table getHeaderColor ─────────────────────────────────────────────────────────────────────────────
const getHeaderColor = (idx) => (idx % 2 === 0 ? 'bg-[#5ec97c]' : 'bg-[#50a5cc]')

const QuarterlySummaryPage = () => {
  // ── Compliance Criteria — display-only, system default ────────────────────
  const [defaultCriteriaName] = useState(() => getDefaultCriteriaName())

  // ── Quarter dropdown — loaded from API ────────────────────────────────────
  const [quarterOpts, setQuarterOpts] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const loadQuarters = async () => {
      setLoadingOptions(true)
      const qRes = await GetAllActiveQuartersApi({}, { skipLoader: true })

      if (qRes.success && qRes.data?.responseResult?.responseMessage === QUARTERS_OK) {
        const list = qRes.data.responseResult.quarters || []
        setQuarterOpts(
          list.map((q) => ({
            label: q.quarterName || '',
            value: q.pK_QuarterID,
          }))
        )
        // Default-select the most recent quarter (API returns desc by startDate)
        if (list.length > 0) {
          setQuarter(list[0].pK_QuarterID)
        }
      }
      setLoadingOptions(false)
    }

    loadQuarters()
  }, [])

  // ── Filters ───────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState('')
  const [quarterError, setQuarterError] = useState('')

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [sections, setSections] = useState([])
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportPayload, setExportPayload] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)

  // ── Generate Report ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!quarter) {
      setQuarterError('Quarter is required')
      return
    }
    setQuarterError('')
    setGenerating(true)
    const res = await GenerateQuarterlySummaryApi({ QuarterID: quarter }, { skipLoader: true })
    setGenerating(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''

    if (!res.success || code !== GENERATE_OK) {
      showError(reportError(code) || res.message)
      return
    }

    const newSections = []
    if (rr.selectedQuarter) newSections.push(mapSection(rr.selectedQuarter))
    if (rr.precedingQuarter) newSections.push(mapSection(rr.precedingQuarter))

    setSections(newSections)
    setExportPayload({ QuarterID: quarter })
    setReportGenerated(true)
  }, [quarter])

  // ── Export (PDF / Excel) ──────────────────────────────────────────────────
  const handleExport = useCallback(
    async (kind) => {
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setExportingPdf : setExportingExcel
      setBusy(true)
      const api = isPdf ? ExportQuarterlySummaryApi : ExportQuarterlySummaryExcelApi
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
        rr.fileName || `QuarterlySummary.${isPdf ? 'pdf' : 'xlsx'}`,
        mime
      )
    },
    [exportPayload]
  )

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Quarterly Summary</h1>
      </div>

      {/* Filter row — centered */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="flex flex-wrap items-start justify-center gap-4">
          <div className="w-[260px]">
            <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
              Compliance Criteria
            </label>
            <input
              type="text"
              readOnly
              value={defaultCriteriaName}
              placeholder="No default criteria set"
              className="w-full px-3 py-[10px] rounded-lg text-[13px] border border-[#e2e8f0] text-[#041E66] bg-[#f8f9fb] outline-none cursor-default"
            />
          </div>

          <div className="w-[260px]">
            <SearchableSelect
              label="Quarter Name"
              required
              placeholder="Select Quarter"
              options={quarterOpts}
              value={quarter}
              onChange={(v) => {
                setQuarter(v)
                setQuarterError('')
                setReportGenerated(false)
              }}
              error={!!quarterError}
              errorMessage={quarterError}
              disabled={loadingOptions}
            />
          </div>
          {/* Phantom spacer matches Select label height so buttons align with trigger */}
          <div>
            <div className="h-[18px] mb-1.5" />
            <div className="flex gap-2">
              <BtnPrimary
                disabled={quarter === '' || generating}
                loading={generating}
                onClick={handleGenerate}
              >
                Generate Report
              </BtnPrimary>
              <ExportBtn
                disabled={!reportGenerated || exportingPdf || exportingExcel}
                onPdf={() => handleExport('pdf')}
                onExcel={() => handleExport('excel')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quarter sections */}
      {sections.map((sec, idx) => (
        <div key={idx} className="mb-3 overflow-hidden border border-slate-200">
          <SectionHeader bgColor={getHeaderColor(idx)} label={sec.quarter} />
          <CommonTable
            columns={SUMMARY_COLUMNS}
            data={[{ id: idx, ...sec }]}
            emptyText="No Record Found"
            headerBg="#E0E6F6"
            rowBg="#ffffff"
          />
        </div>
      ))}

      {!reportGenerated && sections.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center text-[#a0aec0] text-[13px]">
          Select a quarter and click Generate Report
        </div>
      )}
    </div>
  )
}

export default QuarterlySummaryPage
