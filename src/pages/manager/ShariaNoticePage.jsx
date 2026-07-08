/**
 * src/pages/manager/ShariaNoticePage.jsx
 * ========================================
 * Shariah Notice Report (SRS Report #6) — Manager and View Only roles.
 * Routed at /manager/reports/sharia-notice and /view-only/reports/sharia-notice.
 *
 * APIs:
 *  GetAllActiveQuartersApi    — Quarters dropdown (open, cached)
 *  GenerateShariaNoticeApi    — Generate → { ImprovedToCompliant, DeterioratedToNonCompliant }
 *  ExportShariaNoticeApi      — PDF export
 *  ExportShariaNoticeExcelApi — Excel export
 *
 * Flow:
 *  1. Quarter dropdown defaults to the last active quarter (by startDate) → Generate Report.
 *  2. Two tables show companies that flipped compliance status between the
 *     preceding quarter and the selected quarter (Default Criteria only):
 *       • "FROM NON-COMPLIANT TO COMPLIANT"  — ImprovedToCompliant list
 *       • "FROM COMPLIANT TO NON-COMPLIANT"  — DeterioratedToNonCompliant list
 *     One row per company × failing ratio. Both lists may be empty (_03 = success).
 *  3. Export → same QuarterID payload → base64 PDF or XLSX.
 *
 * MQTT: none — read-only report.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { BtnPrimary, ExportBtn } from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  GetAllActiveQuartersApi,
  GenerateShariaNoticeApi,
  GENERATE_SHARIA_NOTICE_CODES,
  ExportShariaNoticeApi,
  EXPORT_SHARIA_NOTICE_CODES,
  ExportShariaNoticeExcelApi,
  EXPORT_SHARIA_NOTICE_EXCEL_CODES,
} from '../../services/manager.service.js'

// ── Success code sentinel ─────────────────────────────────────────────────────
const GENERATE_OK = 'Manager_ManagerServiceManager_GenerateShariaNotice_03'

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

const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * d)
}

// ── Table columns (shared by both tables) ─────────────────────────────────────
const TABLE_COLUMNS = [
  { key: 'company', title: 'Company Name', sortable: true },
  { key: 'ticker', title: 'Ticker', sortable: true, align: 'center' },
  { key: 'ratio', title: 'Ratio Name', sortable: true, align: 'center' },
  { key: 'threshold', title: 'Threshold Value', sortable: true, align: 'center' },
]

// ── Coloured section header bar ───────────────────────────────────────────────
const SectionHeader = ({ label, color }) => (
  <div className="text-center px-4 py-3" style={{ backgroundColor: color }}>
    <span className="text-[13px] font-bold text-white tracking-wide">{label}</span>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

const ShariaNoticePage = () => {
  // ── Dropdown options ──────────────────────────────────────────────────────
  const [quarterOpts, setQuarterOpts] = useState([])

  // ── Filters ───────────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState('')
  const [quarterError, setQuarterError] = useState('')

  // ── Report state ──────────────────────────────────────────────────────────
  const [toCompliant, setToCompliant] = useState([])
  const [toNonCompliant, setToNonCompliant] = useState([])
  const [reportGenerated, setReportGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportPayload, setExportPayload] = useState(null)

  // ── Sorting — independent per table ──────────────────────────────────────
  const [t1SortCol, setT1SortCol] = useState('company')
  const [t1SortDir, setT1SortDir] = useState('asc')
  const [t2SortCol, setT2SortCol] = useState('company')
  const [t2SortDir, setT2SortDir] = useState('asc')

  const fetchedRef = useRef(false)

  // ── Load quarters on mount, default to the last active quarter ────────────
  // "Last active" = the quarter with the most recent startDate, mirroring the
  // startDate-based derivation used on QuarterlySummaryPage rather than
  // trusting array order/index from the API.
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    const load = async () => {
      const res = await GetAllActiveQuartersApi({}, { skipLoader: true })
      if (res.success) {
        const quarters = res.data?.responseResult?.quarters || []
        const opts = quarters.map((q) => ({
          label: q.quarterName || '',
          value: q.pK_QuarterID,
          startDate: q.startDate,
        }))
        setQuarterOpts(opts)

        if (opts.length > 0) {
          const lastActive = opts.reduce((latest, curr) =>
            new Date(curr.startDate) > new Date(latest.startDate) ? curr : latest
          )
          setQuarter(lastActive.value)
        }
      }
    }
    load()
  }, [])

  // ── Generate Report ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!quarter) {
      setQuarterError('Quarter is required.')
      return
    }
    setQuarterError('')
    setGenerating(true)
    const res = await GenerateShariaNoticeApi({ QuarterID: quarter }, { skipLoader: true })
    setGenerating(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''

    if (!res.success || code !== GENERATE_OK) {
      showError(GENERATE_SHARIA_NOTICE_CODES[code] || res.message || 'Failed to generate report.')
      return
    }

    const mapRows = (list) =>
      (list || []).map((r, idx) => ({
        id: idx,
        company: r.company || '',
        ticker: r.ticker || '',
        ratio: r.ratioName || '',
        threshold: r.thresholdText || '',
      }))

    setToCompliant(mapRows(rr.improvedToCompliant))
    setToNonCompliant(mapRows(rr.deterioratedToNonCompliant))
    setExportPayload({ QuarterID: quarter })
    setReportGenerated(true)
  }, [quarter])

  // ── Export (PDF / Excel) ───────────────────────────────────────────────────
  const handleExport = useCallback(
    async (kind) => {
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setExportingPdf : setExportingExcel
      setBusy(true)
      const api = isPdf ? ExportShariaNoticeApi : ExportShariaNoticeExcelApi
      const CODES = isPdf ? EXPORT_SHARIA_NOTICE_CODES : EXPORT_SHARIA_NOTICE_EXCEL_CODES
      const res = await api(exportPayload, { skipLoader: true })
      setBusy(false)

      const rr = res?.data?.responseResult
      const code = rr?.responseMessage || ''
      if (!res.success || !code.endsWith('_03')) {
        showError(CODES[code] || res.message || 'Export failed.')
        return
      }
      downloadBase64(
        rr.fileContent,
        rr.fileName || `ShariaNotice.${isPdf ? 'pdf' : 'xlsx'}`,
        rr.contentType ||
          (isPdf
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      )
    },
    [exportPayload]
  )

  // ── Sort handlers ─────────────────────────────────────────────────────────
  const handleT1Sort = useCallback(
    (col) => {
      setT1SortDir((p) => (t1SortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setT1SortCol(col)
    },
    [t1SortCol]
  )

  const handleT2Sort = useCallback(
    (col) => {
      setT2SortDir((p) => (t2SortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setT2SortCol(col)
    },
    [t2SortCol]
  )

  const displayedT1 = useMemo(
    () => sortRows(toCompliant, t1SortCol, t1SortDir),
    [toCompliant, t1SortCol, t1SortDir]
  )
  const displayedT2 = useMemo(
    () => sortRows(toNonCompliant, t2SortCol, t2SortDir),
    [toNonCompliant, t2SortCol, t2SortDir]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Shariah Notice</h1>
      </div>

      {/* Filter row — centered */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="flex flex-wrap items-start justify-center gap-4">
          <div className="w-[260px]">
            <SearchableSelect
              label="Quarters"
              required
              placeholder="Select Quarter"
              options={quarterOpts}
              value={quarter}
              onChange={(v) => {
                setQuarter(v)
                setQuarterError('')
                setReportGenerated(false)
                setToCompliant([])
                setToNonCompliant([])
              }}
              error={!!quarterError}
              errorMessage={quarterError}
            />
          </div>

          {/* Phantom spacer aligns buttons with the select trigger */}
          <div>
            <div className="h-[18px] mb-1.5" />
            <div className="flex gap-2">
              <BtnPrimary
                onClick={handleGenerate}
                loading={generating}
                disabled={generating || quarter === ''}
              >
                Generate Report
              </BtnPrimary>
              <ExportBtn
                disabled={
                  !reportGenerated ||
                  (toCompliant.length === 0 && toNonCompliant.length === 0) ||
                  exportingPdf ||
                  exportingExcel
                }
                onPdf={() => handleExport('pdf')}
                onExcel={() => handleExport('excel')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table 1 — Non-Compliant → Compliant (teal) */}
      <div className="mb-4 overflow-hidden border border-slate-200 rounded-xl">
        <SectionHeader label="FROM NON-COMPLIANT TO COMPLIANT" color="#01C9A4" />
        <CommonTable
          columns={TABLE_COLUMNS}
          data={displayedT1}
          sortCol={t1SortCol}
          sortDir={t1SortDir}
          onSort={handleT1Sort}
          emptyText={reportGenerated ? 'No Record Found' : 'Generate the report to view results.'}
          headerBg="#E0E6F6"
          headerTextColor="#041E66"
          rowBg="#ffffff"
          rowHoverBg="#EFF3FF"
        />
      </div>

      {/* Table 2 — Compliant → Non-Compliant (red) */}
      <div className="overflow-hidden border border-slate-200 rounded-xl">
        <SectionHeader label="FROM COMPLIANT TO NON-COMPLIANT" color="#EF4444" />
        <CommonTable
          columns={TABLE_COLUMNS}
          data={displayedT2}
          sortCol={t2SortCol}
          sortDir={t2SortDir}
          onSort={handleT2Sort}
          emptyText={reportGenerated ? 'No Record Found' : 'Generate the report to view results.'}
          headerBg="#E0E6F6"
          headerTextColor="#041E66"
          rowBg="#ffffff"
          rowHoverBg="#EFF3FF"
        />
      </div>
    </div>
  )
}

export default ShariaNoticePage
