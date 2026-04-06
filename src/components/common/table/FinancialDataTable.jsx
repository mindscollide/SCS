/**
 * src/components/common/table/FinancialDataTable.jsx
 * ====================================================
 * Reusable financial data grid component.
 * Used in: Add Financial Data, View Financial Data, Edit Financial Data (Pending Approvals).
 *
 * Props:
 *  quarters          {string[]}   — 4 quarter labels (newest first)
 *  companies         {string[]}   — company names for dropdown
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
 *  ratios            {Array}      — financial ratio sections
 *  onCellChange      {Function}   — (ratioId, classId, colIdx, val)
 *  editableCol       {number}     — 0 = newest editable; -1 = all read-only
 *  actions           {ReactNode}  — bottom buttons
 */

import React, { useCallback } from 'react'
import Select from '../select/Select'
import Input from '../Input/Input'

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
// PIE ICON
// ─────────────────────────────────────────────────────────────────────────────

const PieIcon = () => (
  <span
    className="inline-flex items-center justify-center w-5 h-5 rounded-full
                   bg-[#01C9A4] text-white text-[9px] font-bold shrink-0 ml-1.5"
    title="Islamic Finance"
  >
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 1v5h5a5 5 0 0 0-5-5z" />
    </svg>
  </span>
)

// ─────────────────────────────────────────────────────────────────────────────
// CELL — editable or read-only
// ─────────────────────────────────────────────────────────────────────────────

const Cell = ({ value, editable, onChange, isTotal }) => {
  if (!editable) {
    return (
      <td
        className={`px-3 py-2 text-right text-[13px] border-b border-[#eef2f7]
                      ${isTotal ? 'font-bold text-[#0B39B5] bg-[#f0f4ff]' : 'text-[#041E66]'}`}
      >
        {value || ''}
      </td>
    )
  }
  return (
    <td
      className={`px-2 py-1.5 border-b border-[#eef2f7]
                    ${isTotal ? 'bg-[#f0f4ff]' : ''}`}
    >
      <Input
        value={value || ''}
        onChange={onChange}
        bgColor={isTotal ? '#e8eeff' : 'white'}
        borderColor="#dde4ee"
        focusBorderColor="#01C9A4"
        textColor={isTotal ? '#0B39B5' : '#041E66'}
      />
    </td>
  )
}

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
    <div className="font-sans flex flex-col h-full">
      {/* ── Dropdowns row ── */}
      <div
        className={`grid gap-4 mb-4 ${hasThirdField ? 'grid-cols-[1fr_1.5fr_1.5fr]' : 'grid-cols-2'}`}
      >
        <Select
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
        <Select
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
      <div className="flex-1 overflow-hidden rounded-xl border border-[#dde4ee]">
        <div className="h-[420px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            {/* Sticky header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#E0E6F6]">
                <th
                  className="px-4 py-3 text-left text-[12px] font-semibold
                               text-[#041E66] border-b border-[#dde4ee]"
                >
                  Description
                </th>
                {searched &&
                  quarters.map((q, i) => (
                    <th
                      key={i}
                      className={`px-3 py-3 text-right text-[12px] font-semibold
                                border-b border-[#dde4ee]
                                ${i === editableCol ? 'text-[#0B39B5]' : 'text-[#041E66]'}`}
                    >
                      {q}
                    </th>
                  ))}
              </tr>
            </thead>

            <tbody>
              {!searched ? (
                <tr>
                  <td className="text-center py-12 text-[#a0aec0]">No Record Found</td>
                </tr>
              ) : (
                ratios.map((ratio) => (
                  <React.Fragment key={ratio.id}>
                    {/* ── Ratio section heading row ── */}
                    <tr>
                      <td
                        colSpan={quarters.length + 1}
                        className="px-4 py-2.5 bg-[#fffbee] border-b border-[#eef2f7]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[13px] font-semibold text-[#0B39B5]">
                            {ratio.label}
                          </span>
                          {ratio.ratioValue && (
                            <span
                              className={`text-[13px] font-bold flex items-center gap-0.5
                                            ${ratio.ratioUp ? 'text-[#E8923A]' : 'text-[#01C9A4]'}`}
                            >
                              {ratio.ratioValue}
                              {ratio.ratioUp ? ' ↑' : ' ↓'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Classification rows ── */}
                    {ratio.classifications.map((cls) => (
                      <tr
                        key={cls.id}
                        className={`transition-colors ${cls.isTotal ? 'bg-[#f0f4ff]' : 'hover:bg-[#EFF3FF]'}`}
                      >
                        {/* Description cell */}
                        <td
                          className={`px-4 py-2.5 border-b border-[#eef2f7]
                                      ${cls.isTotal ? 'font-bold text-[#0B39B5]' : 'text-[#041E66]'}`}
                        >
                          <div className="flex items-center">
                            <span>{cls.label}</span>
                            {cls.hasPieIcon && <PieIcon />}
                          </div>
                        </td>

                        {/* Quarter value cells */}
                        {quarters.map((_, colIdx) => (
                          <Cell
                            key={colIdx}
                            value={cls.values[colIdx]}
                            editable={colIdx === editableCol}
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
