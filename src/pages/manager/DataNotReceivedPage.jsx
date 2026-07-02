/**
 * pages/manager/DataNotReceivedPage.jsx
 * ========================================
 * Data Not Received report (SRS Report #7) — Manager or View Only role.
 *
 * Lists active companies that have not submitted any financial data for the
 * selected quarter. Single-step report + export.
 *
 * APIs:
 *  GetAllActiveQuartersApi     — Quarter dropdown (open, cached)
 *  GetDataNotReceivedApi       — Generate Report
 *  ExportDataNotReceivedPdfApi — Export → base64 PDF
 *  ExportDataNotReceivedExcelApi — Export → base64 XLSX
 *
 * UI layout (matches SRS screenshots):
 *  ▸ EFF3FF header band  — title
 *  ▸ Centered filter row — Quarter Name* (SearchableSelect) + Generate Report (BtnPrimary) + Export (ExportBtn)
 *  ▸ CommonTable         — Ticker (sort) | Company Name (sort)
 *
 * Notes:
 *  Empty Results = every active company already has data for that quarter → "No Record Found".
 *  No MQTT for this report.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { BtnPrimary, ExportBtn } from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  GetAllActiveQuartersApi,
  GetDataNotReceivedApi,
  ExportDataNotReceivedPdfApi,
  ExportDataNotReceivedExcelApi,
  GET_DATA_NOT_RECEIVED_CODES,
} from '../../services/manager.service.js'

// ── Config ──────────────────────────────────────────────────────────────────
const QUARTERS_OK = 'Manager_ManagerServiceManager_GetAllActiveQuarters_02'
const REPORT_OK = 'Manager_ManagerServiceManager_GetDataNotReceived_03'

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

// ── Response-code helper ────────────────────────────────────────────────────
const reportError = (code) => {
  if (!code) return 'Something went wrong, please try again.'
  return GET_DATA_NOT_RECEIVED_CODES[code] || 'Something went wrong, please try again.'
}

// ── API response row → local table shape ──────────────────────────────────────
const mapRow = (r) => ({
  id: r.companyID,
  ticker: r.ticker || '',
  company: r.company || '',
})

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortRows = (rows, col, dir) => {
  const d = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * d)
}

// ─────────────────────────────────────────────────────────────────────────────

const DataNotReceivedPage = () => {
  // ── Dropdown options ──────────────────────────────────────────────────────
  const [quarterOpts, setQuarterOpts] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // ── Filters ───────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState('')
  const [quarterError, setQuarterError] = useState('')

  // ── Report state ──────────────────────────────────────────────────────
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results, setResults] = useState([])
  const [generating, setGenerating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [sortCol, setSortCol] = useState('ticker')
  const [sortDir, setSortDir] = useState('asc')

  const fetchedRef = useRef(false)

  // ── Load quarters on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const load = async () => {
      setLoadingOptions(true)
      const qRes = await GetAllActiveQuartersApi({}, { skipLoader: true })

      if (qRes.success && qRes.data?.responseResult?.responseMessage === QUARTERS_OK) {
        setQuarterOpts(
          (qRes.data.responseResult.quarters || []).map((q) => ({
            label: q.quarterName || '',
            value: q.pK_QuarterID,
          }))
        )
      }
      setLoadingOptions(false)
    }

    load()
  }, [])

  // ── Generate Report ───────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!quarter) {
      setQuarterError('Quarter is required')
      return
    }
    setQuarterError('')
    setGenerating(true)
    const res = await GetDataNotReceivedApi({ QuarterID: quarter }, { skipLoader: true })
    setGenerating(false)

    const rr = res?.data?.responseResult
    const code = rr?.responseMessage || ''

    if (!res.success || code !== REPORT_OK) {
      showError(reportError(code) || res.message)
      return
    }

    const rows = Array.isArray(rr.results) ? rr.results.map(mapRow) : []
    setResults(rows)
    setReportGenerated(true)
  }, [quarter])

  // ── Export (PDF / Excel) ──────────────────────────────────────────────────
  const handleExport = useCallback(
    async (kind) => {
      const isPdf = kind === 'pdf'
      const setBusy = isPdf ? setExportingPdf : setExportingExcel
      setBusy(true)
      const api = isPdf ? ExportDataNotReceivedPdfApi : ExportDataNotReceivedExcelApi
      const res = await api({ QuarterID: quarter }, { skipLoader: true })
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
        rr.fileName || `DataNotReceived.${isPdf ? 'pdf' : 'xlsx'}`,
        mime
      )
    },
    [quarter]
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

  // ── Table columns ─────────────────────────────────────────────────────
  const columns = [
    { key: 'ticker', title: 'Ticker', sortable: true },
    { key: 'company', title: 'Company Name', sortable: true, align: 'center' },
  ]

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Data Not Received</h1>
      </div>

      {/* Filter row — centered */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="flex flex-wrap items-start justify-center gap-4">
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

export default DataNotReceivedPage
