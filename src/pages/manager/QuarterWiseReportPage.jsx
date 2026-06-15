/**
 * QuarterWiseReportPage.jsx
 * ==========================
 * Quarter Wise Report — shows company compliance status per quarter.
 *
 * UI pattern matches ComplianceStandingPage:
 *   ▸ #EFF3FF header band
 *   ▸ #EFF3FF filter card  (Quarter + Sector + Company + Criteria + Search)
 *   ▸ Ratios panel         (editable thresholds for selected criteria)
 *   ▸ Action row           (Generate Report + Export)
 *   ▸ CommonTable          (Company | Sector | Quarter | Status)
 */

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BtnGold,
  BtnPrimary,
  ExportBtn,
  StatusText,
  MultiSelect,
} from '../../components/common/index.jsx'
import SearchableSelect from '../../components/common/select/SearchableSelect'
import Input from '../../components/common/Input/Input'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import {
  REPORT_QUARTER_OPTIONS as QUARTERS,
  SECTORS as SECTORS_RAW,
  COMPANIES as COMPANIES_RAW,
  CRITERIA_LIST,
  CRITERIA_RATIOS_BY_NAME as CRITERIA_RATIOS,
  MOCK_QUARTER_WISE_RESULTS as MOCK_RESULTS,
} from '../../data/mockData.js'
import RatiosPanel from '../../components/common/report/RatiosPanel.jsx'

// ── Derived options ───────────────────────────────────────────────────────────
const SECTORS = SECTORS_RAW.map((s) => ({ label: s.name, value: s.name }))
const COMPANIES = COMPANIES_RAW.map((c) => ({ label: c.name, value: c.name, sector: c.sector }))
const CRITERIA = CRITERIA_LIST.map((c) => ({ label: c.name, value: c.name }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const sortRows = (rows, col, dir) =>
  [...rows].sort(
    (a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (dir === 'asc' ? 1 : -1)
  )

// ── RatiosPanel ───────────────────────────────────────────────────────────────

// const RatiosPanel = ({ ratios, onThresholdChange }) => {
//   if (!ratios.length) return null
//   return (
//     <div className="bg-white rounded-xl overflow-hidden border border-slate-200 mb-2">
//       <table className="w-full text-[13px]">
//         <thead>
//           <tr style={{ backgroundColor: '#E0E6F6' }}>
//             <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
//               Financial Ratio Name
//             </th>
//             <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-[#041E66]">
//               Threshold value
//             </th>
//           </tr>
//         </thead>
//         <tbody>
//           {ratios.map((r, i) => (
//             <tr key={i} className="border-t border-[#eef2f7]">
//               <td className="px-4 py-2 text-[#041E66]">{r.name}</td>
//               <td className="px-4 py-2 text-right">
//                 <div className="inline-flex items-center gap-1 justify-end">
//                   <Input
//                     value={String(r.threshold)}
//                     onChange={(v) => onThresholdChange(i, v)}
//                     regex={/^[0-9]*$/}
//                     className="w-24"
//                   />
//                   <span className="text-[13px] text-[#041E66]">%</span>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   )
// }

// ─────────────────────────────────────────────────────────────────────────────

const QuarterWiseReportPage = () => {
  // ── Filters ───────────────────────────────────────────────────────────────
  const [selQuarters, setSelQuarters] = useState(QUARTERS.map((q) => q.value))
  const [selSectors, setSelSectors] = useState([])
  const [selCompanies, setSelCompanies] = useState(COMPANIES.map((c) => c.value))
  const [selCriteria, setSelCriteria] = useState('Hilal Compliance Criteria')

  // ── Ratios ────────────────────────────────────────────────────────────────
  const [ratios, setRatios] = useState(CRITERIA_RATIOS['Hilal Compliance Criteria'] ?? [])

  // ── Report state ──────────────────────────────────────────────────────────
  const [searched, setSearched] = useState(true)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [results, setResults] = useState([])
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  const displayed = useMemo(() => sortRows(results, sortCol, sortDir), [results, sortCol, sortDir])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!selCriteria) {
      toast.error('Please select a Compliance Criteria')
      return
    }
    if (selQuarters.length === 0) {
      toast.error('Please select at least one Quarter')
      return
    }
    if (selCompanies.length === 0) {
      toast.error('Please select at least one Company')
      return
    }
    setRatios(CRITERIA_RATIOS[selCriteria] ?? [])
    setSearched(true)
    setReportGenerated(false)
    setResults([])
  }, [selCriteria, selQuarters, selCompanies])

  const handleThresholdChange = useCallback((i, val) => {
    setRatios((prev) => prev.map((r, idx) => (idx === i ? { ...r, threshold: val } : r)))
  }, [])

  const handleGenerate = useCallback(() => {
    const filtered = MOCK_RESULTS.filter(
      (r) => selCompanies.includes(r.company) && selQuarters.includes(r.quarter)
    )

    // Pivot: group by company, quarters become columns
    const grouped = {}
    filtered.forEach((r) => {
      if (!grouped[r.company]) {
        grouped[r.company] = { company: r.company, sector: r.sector }
      }
      grouped[r.company][r.quarter] = r.status
    })

    setResults(Object.values(grouped))
    setReportGenerated(true)
    toast.success('Report Generated Successfully')
  }, [selCompanies, selQuarters])

  const handleSort = useCallback(
    (col) => {
      setSortDir((p) => (sortCol === col ? (p === 'asc' ? 'desc' : 'asc') : 'asc'))
      setSortCol(col)
    },
    [sortCol]
  )

  const columns = useMemo(
    () => [
      { key: 'company', title: 'Company Name', sortable: true },
      { key: 'sector', title: 'Sector Name', sortable: true },
      ...selQuarters.map((q) => ({
        key: q,
        title: q,
        sortable: true,
        render: (row) =>
          row[q] ? <StatusText status={row[q]} /> : <span className="text-gray-300"></span>,
      })),
    ],
    [selQuarters]
  )

  return (
    <div className="font-sans">
      {/* Header band */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Quarter Wise Report</h1>
      </div>

      {/* Filter card */}
      <div className="bg-[#EFF3FF] rounded-xl p-4 mb-2 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] gap-3">
          <div>
            <SearchableSelect
              label="Compliance Criteria"
              required
              placeholder="-- Select --"
              value={selCriteria}
              onChange={setSelCriteria}
              options={CRITERIA}
            />
          </div>
          <div>
            <MultiSelect
              label="Quarter"
              required
              options={QUARTERS}
              selected={selQuarters}
              onChange={setSelQuarters}
            />
            <div className="text-slate flex justify-end text-[12px] font-semibold">
              Multiple selection allowed
            </div>
          </div>
          {/* <MultiSelect
            label="Sector"
            options={SECTORS}
            selected={selSectors}
            onChange={setSelSectors}
          /> */}
          <div>
            <MultiSelect
              label="Company"
              required
              options={COMPANIES}
              selected={selCompanies}
              onChange={setSelCompanies}
            />

            <div className="text-slate flex justify-end text-[12px] font-semibold">
              Multiple selection allowed
            </div>
          </div>
          <div>
            <BtnGold onClick={handleSearch} className="py-[10px] px-8 mt-7">
              Search
            </BtnGold>
          </div>
        </div>
      </div>

      {/* Ratios panel */}
      {searched && <RatiosPanel ratios={ratios} onThresholdChange={handleThresholdChange} />}

      {/* Action row */}
      <div className="flex justify-end gap-2 mb-2">
        <BtnPrimary onClick={handleGenerate} disabled={!searched}>
          Generate Report
        </BtnPrimary>
        <ExportBtn
          disabled={!reportGenerated}
          onExcel={() => toast.info('Exporting as Excel…')}
          onPdf={() => toast.info('Exporting as PDF…')}
        />
      </div>

      {/* Results table */}
      <CommonTable
        columns={columns}
        data={displayed}
        sortCol={sortCol}
        sortDir={sortDir}
        onSort={handleSort}
        emptyText="No Record Found"
        headerBg="#E0E6F6"
      />
    </div>
  )
}

export default QuarterWiseReportPage
