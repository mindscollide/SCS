/**
 * src/components/common/table/FinancialDataTable.jsx
 * ====================================================
 * Reusable financial data grid component.
 * Used in: Add Financial Data, View Financial Data, Edit Financial Data (Pending Approvals).
 *
 * Props:
 *  quarters          {Array}      — Quarter dropdown options: string[] or { label, value }[].
 *                                   Feeds the Quarter SearchableSelect ONLY (the picker that
 *                                   chooses which company/quarter to load). Decoupled from the
 *                                   grid's period COLUMNS, which come from the `columns` prop.
 *  companies         {Array}      — Company dropdown options: string[] or { label, value }[].
 *  selectedQuarter   {string}     — controlled Quarter value
 *  onQuarterChange   {Function}
 *  quarterError      {string}
 *  selectedCompany   {string}     — controlled Company value
 *  onCompanyChange   {Function}
 *  companyError      {string}
 *  defaultCriteria   {string}     — read-only "Default Compliance Criteria" field value
 *  onSearch          {Function}   — called when Search button clicked
 *  disableQuarter    {boolean}    — locks Quarter dropdown after search
 *  disableCompany    {boolean}    — locks Company dropdown until Quarter selected / after search
 *  disableSearch     {boolean}    — locks Search button until Quarter+Company selected / after search
 *  columns           {Array}      — period COLUMNS for the grid (newest first). Accepts either
 *                                   string[] (mock fallback = MOCK_QUARTERS) or { id, label }[]
 *                                   from the API (id = quarterID, label = quarterName). Drives the
 *                                   <colgroup>, header labels, cell count and ratio-row colSpan.
 *                                   Cells map positionally: values[i] sits under columns[i].
 *  ratios            {Array}      — financial ratio sections. Each: { id, label, ratioValue,
 *                                   ratioUp, classifications:[{ id, label, values[], isTotal?,
 *                                   hasPieIcon?, expression?, isDependentClassification? }] }.
 *                                   `values` is positional (one per column), pre-formatted strings.
 *  onCellChange      {Function}   — (ratioId, classId, colIdx, val)
 *  editableCol       {number}     — 0 = newest editable; -1 = all read-only
 *  actions           {ReactNode}  — bottom buttons
 */

import React, { useCallback } from 'react'
import SearchableSelect from '../select/SearchableSelect'
import Input from '../Input/Input'
import chartIcon from '../../../../public/chart-icon.png'
import arrowDown from '../../../../public/arrowdown-icon.png'
import arrowUp from '../../../../public/arrowup-icon.png'
import { Calculator } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_QUARTERS = ['September 2025', 'June 2025', 'March 2025', 'December 2024']
export const MOCK_COMPANIES = ['Al-Hilal Investments', 'Hilal Capital', 'MCB Bank', 'Allied Bank']

export const MOCK_RATIOS = [
  {
    id: 1,
    label: 'Interest Bearing Debts to Total Assets',
    ratioValue: '37%',
    ratioUp: true,
    classifications: [
      { id: 11, label: 'Long Term Finance', values: ['250,000.00', '14,877.80', '', '13,619.64'] },
      {
        id: 12,
        label: 'Less: Islamic Finance (LT)',
        values: ['50,000.00', '11,512.11', '', '11,405.58'],
        hasPieIcon: true,
      },
      {
        id: 13,
        label: 'Total Interest Bearing Long term Finance',
        values: ['200,000.00', '3,366.00', '3,106.94', '2,214.07'],
        isTotal: true,
      },
      { id: 14, label: 'Lease Liabilities', values: ['1,000.00', '-', '72.00', '72.00'] },
      { id: 15, label: 'Short Term Finance', values: ['200,000.00', '', '22.00', '22.00'] },
      {
        id: 16,
        label: 'Less: Islamic Finance (ST)',
        values: ['70,000.00', '6,269.06', '', '2,448.49'],
        hasPieIcon: true,
      },
      {
        id: 17,
        label: 'Total Interest Bearing Short term Finance',
        values: ['130,000.00', '5,798.62', '', '2,375.00'],
        isTotal: true,
      },
      {
        id: 18,
        label: 'Current Portion of Long Term Finance',
        values: ['2,000.00', '470.44', '294.10', '73.50'],
      },
      {
        id: 19,
        label: 'Current Portion of Lease Liabilites',
        values: ['3,000.00', '1,390.00', '1,444.76', '1,453.00'],
      },
      { id: 20, label: "Sponosor's Loan", values: ['4,000.00', '-', '-', '-'] },
    ],
  },
  {
    id: 2,
    label: 'Non-compliant Investments to Total Assets',
    ratioValue: '12%',
    ratioUp: false,
    classifications: [
      { id: 21, label: 'Total Long Term Investments', values: ['-', '-', '72.00', '72.00'] },
      { id: 22, label: 'Short Term Investments at Cost', values: ['2.52', '', '22.00', '22.00'] },
      {
        id: 23,
        label: 'Total Investments',
        values: ['2.52', '6,269.06', '', '2,448.49'],
        isTotal: true,
      },
      { id: 24, label: 'Total Deposits', values: ['', '5,798.62', '', '2,375.00'] },
      { id: 25, label: 'Total Assets', values: ['625.52', '470.44', '294.10', '73.50'] },
      {
        id: 26,
        label: 'Adjusted Total Assets',
        values: ['1,390.00', '1,390.00', '1,444.76', '1,453.00'],
        isTotal: true,
      },
      { id: 27, label: 'Market Capitalization', values: ['-', '-', '-', '-'] },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CELL — editable or read-only
// ─────────────────────────────────────────────────────────────────────────────

const Cell = ({ value, editable, onChange, isTotal }) => (
  <td
    className={`px-2 py-1.5 border-b border-l border-[#eef2f7] w-[150px] min-w-[150px] max-w-[150px]
                ${isTotal ? 'bg-[#f0f4ff]' : ''}`}
  >
    <input
      type="text"
      value={value ?? ''}
      disabled={!editable}
      onChange={editable ? (e) => onChange(e.target.value) : undefined}
      className={`w-full px-2.5 py-[6px] rounded-md border text-right text-[13px]
                  transition-colors outline-none
                  ${isTotal ? 'font-bold' : ''}
                  ${
                    editable
                      ? 'bg-white border-[#dde4ee] text-[#041E66] focus:border-[#01C9A4] focus:ring-1 focus:ring-[#01C9A4]/20 cursor-text'
                      : 'bg-[#f8fafc] border-[#e9edf5] text-[#041E66] cursor-default'
                  }
                  ${isTotal && editable ? '!bg-[#e8eeff] !border-[#c5d0f5]' : ''}
                  ${isTotal && !editable ? '!bg-[#eef1fb] !border-[#d5dcf0]' : ''}`}
    />
  </td>
)
// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL DATA TABLE
// ─────────────────────────────────────────────────────────────────────────────

const FinancialDataTable = ({
  quarters = MOCK_QUARTERS,
  companies = MOCK_COMPANIES,
  selectedQuarter,
  onQuarterChange,
  quarterError,
  selectedCompany,
  onCompanyChange,
  companyError,
  defaultCriteria,
  onSearch,
  disableQuarter = false,
  disableCompany = false,
  disableSearch = false,
  searched = false, // true after Search clicked — shows quarter cols + data
  columns = MOCK_QUARTERS, // period columns: string[] OR { id, label }[] (newest first)
  ratios = MOCK_RATIOS,
  onCellChange,
  editableCol = 0,
  actions,
}) => {
  const handleChange = useCallback(
    (ratioId, classId, colIdx, val) => {
      onCellChange?.(ratioId, classId, colIdx, val)
    },
    [onCellChange]
  )

  const hasThirdField = defaultCriteria !== undefined

  return (
    <div className="font-sans flex rounded-none flex-col h-full">
      {/* ── Dropdowns row ── */}
      <div
        className={`grid gap-4 mb-4 ${hasThirdField ? 'grid-cols-[1fr_1.5fr_1.5fr]' : 'grid-cols-2'}`}
      >
        <SearchableSelect
          label="Quarter Name"
          required
          value={selectedQuarter}
          onChange={onQuarterChange}
          options={quarters}
          placeholder="Select Quarter Name"
          bgColor="#ffffff"
          borderColor="#e2e8f0"
          focusBorderColor="#01C9A4"
          error={!!quarterError}
          errorMessage={quarterError}
          disabled={disableQuarter}
        />
        <SearchableSelect
          label="Company"
          required
          value={selectedCompany}
          onChange={onCompanyChange}
          options={companies}
          placeholder="Select Company"
          bgColor="#ffffff"
          borderColor="#e2e8f0"
          focusBorderColor="#01C9A4"
          error={!!companyError}
          errorMessage={companyError}
          disabled={disableCompany}
        />
        {hasThirdField && (
          <div>
            <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
              Default Compliance Criteria <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={defaultCriteria}
                className="flex-1 border border-[#e2e8f0] rounded-lg px-3 py-[10px]
                           text-[13px] text-[#041E66] bg-[#f8fafc] outline-none cursor-default"
              />
              <button
                onClick={onSearch}
                disabled={disableSearch || !onSearch}
                className="px-5 py-[10px] bg-[#F5A623] hover:bg-[#e09a1a] text-white
                           rounded-lg text-[13px] font-semibold transition-colors shrink-0
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable data table ── */}
      <div className="flex-1 overflow-hidden border border-[#dde4ee]">
        <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-[13px] border-collapse table-fixed">
            <colgroup>
              <col /> {/* Description — fills remaining space */}
              {searched && columns.map((_, i) => <col key={i} style={{ width: '150px' }} />)}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#E0E6F6]">
                <th
                  className="px-4 py-3 text-left text-[12px] font-semibold
                   text-[#041E66] border-b border-[#dde4ee]"
                >
                  Description
                </th>
                {searched &&
                  columns.map((q, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-left text-[12px] font-semibold
             text-[#041E66] border-b border-[#dde4ee]"
                    >
                      {typeof q === 'string' ? q : q.label}
                    </th>
                  ))}
              </tr>
            </thead>

            <tbody>
              {!searched ? (
                <tr className="">
                  <td className="text-center py-12 text-[#a0aec0]">No Record Found</td>
                </tr>
              ) : (
                ratios.map((ratio) => (
                  <React.Fragment key={ratio.id}>
                    {/* ── Ratio section heading row ── */}
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-2.5 bg-[#fffbee] border-r border-[#eef2f7]"
                      >
                        <div className="flex w-[430px] justify-between gap-3">
                          <span className="text-[13px] font-semibold text-[#0B39B5]">
                            {ratio.label}
                          </span>
                          {ratio.ratioValue && (
                            <span className={`text-[13px] flex items-center gap-0.5 text-[#000]`}>
                              {ratio.ratioValue}
                              <img
                                src={ratio.ratioUp ? arrowUp : arrowDown}
                                alt="direction"
                                className="w-5 h-5 object-contain shrink-0"
                                draggable={false}
                              />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Classification rows ── */}
                    {ratio.classifications.map((cls) => (
                      <tr key={cls.id}>
                        {/* Description cell */}
                        <td
                          className={`px-4 py-2.5 border-b border-[#eef2f7]
              ${cls.isTotal ? 'font-bold text-[#000]' : 'text-[#000]'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{cls.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {cls.hasPieIcon && (
                                <div className="relative group">
                                  <img
                                    src={chartIcon}
                                    alt="Pie Icon"
                                    className="object-contain h-auto w-6"
                                    draggable={false}
                                  />
                                  <div
                                    className="absolute bottom-full right-0 mb-1.5 z-50 hidden group-hover:block
                          bg-[#1a2b5e] text-white text-[11px] rounded-full px-2.5 py-1.5
                          whitespace-nowrap shadow-lg pointer-events-none"
                                  >
                                    {cls.label}
                                    <div className="absolute top-full right-3 border-4 border-transparent border-t-[#1a2b5e]" />
                                  </div>
                                </div>
                              )}
                              {cls.isTotal && (
                                <div className="relative group">
                                  <Calculator size={18} className="text-[#e3a204] cursor-pointer" />
                                  <div
                                    className="absolute bottom-full right-0 mb-1.5 z-50 hidden group-hover:block
                          bg-[#1a2b5e] text-white text-[11px] rounded-full px-2.5 py-1.5
                          whitespace-nowrap shadow-lg pointer-events-none"
                                  >
                                    {cls.label}
                                    <div className="absolute top-full right-3 border-4 border-transparent border-t-[#1a2b5e]" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quarter value cells.
                            Calculated rows (cls.isCalculated) are formula-derived →
                            always read-only. Legacy/mock rows have no isCalculated
                            flag, so `!undefined` keeps them editable (no regression). */}
                        {columns.map((_, colIdx) => (
                          <Cell
                            key={colIdx}
                            value={cls.values[colIdx]}
                            editable={colIdx === editableCol && !cls.isCalculated}
                            isTotal={cls.isTotal}
                            onChange={(val) => handleChange(ratio.id, cls.id, colIdx, val)}
                          />
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Action buttons ── */}
      {actions && <div className="flex justify-center gap-3 mt-5">{actions}</div>}
    </div>
  )
}

export default FinancialDataTable
