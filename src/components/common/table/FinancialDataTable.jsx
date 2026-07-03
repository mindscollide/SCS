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
 *  defaultCriteria   {string}     — read-only "Compliance Criteria" field value (from record header, not the system default)
 *  onSearch          {Function}   — called when Search button clicked
 *  disableQuarter    {boolean}    — locks Quarter dropdown after search
 *  disableCompany    {boolean}    — locks Company dropdown until Quarter selected / after search
 *  disableSearch     {boolean}    — locks Search button until Quarter+Company selected / after search
 *  columns           {Array}      — period COLUMNS for the grid (newest first). Accepts either
 *                                   string[] (mock fallback = MOCK_QUARTERS) or { id, label }[]
 *                                   from the API (id = quarterID, label = quarterName). Drives the
 *                                   <colgroup>, header labels, cell count and ratio-row colSpan.
 *                                   Cells map positionally: values[i] sits under columns[i].
 *  readOnlyFields    {boolean}    — when true, Quarter & Company render as readonly text inputs
 *                                   instead of SearchableSelect dropdowns (used in View pages)
 *  ratios            {Array}      — financial ratio sections. Each: { id, label, ratioValue,
 *                                   ratioUp, fK_ComparisonClassificationID,
 *                                   thresholdsByQuarter:[{value,up}|null],
 *                                   classifications:[{ id, label, values[], isTotal?,
 *                                   hasPieIcon?, isDisplayAsPercentage?, expression?,
 *                                   isDependentClassification? }] }.
 *                                   `values` is positional (one per column), pre-formatted strings.
 *
 * Per-column thresholds:
 *  Ratio heading row shows threshold + up/down arrow per quarter column (not next to ratio name).
 *  Add/Edit: column 0 uses ratio-level threshold; historical use quarterlyThresholds.
 *  Approved View: all columns use quarterlyThresholds.
 *
 * isDisplayAsPercentage:
 *  Cell multiplies raw value ×100, rounds to 2dp, appends "%" for display only.
 *  Raw value stays in values[] for computation + API save.
 *  Full precision stored (no 2dp rounding before ×100) to avoid precision loss.
 *
 * Shariah Status row:
 *  Shown at the end of each ratio section when fK_ComparisonClassificationID > 0.
 *  Compares the comparison classification's value against the column's threshold:
 *    ratioUp (max): value ≤ threshold → Compliant (green pill)
 *    !ratioUp (min): value ≥ threshold → Compliant
 *  Updates live on Add/Edit as calculated values recompute.
 *  White background + bottom spacer separates it from the next ratio.
 *
 *  onCellChange      {Function}   — (ratioId, classId, colIdx, val)
 *  editableCol       {number}     — 0 = newest editable; -1 = all read-only
 *  actions           {ReactNode}  — bottom buttons
 *  tableMaxHeight    {string}     — CSS max-height for the scrollable data area.
 *                                   Defaults to calc(100vh - 340px) so the grid fills the
 *                                   visible viewport at any screen resolution (topbar 44px +
 *                                   main-padding 48px + header-band 50px + card-padding 40px +
 *                                   dropdowns 74px + buttons 58px + buffer ≈ 340px).
 *                                   Override when the table lives inside a differently-sized
 *                                   shell (e.g. a modal or a page with extra header rows).
 */

import React, { useCallback, useState, useMemo } from 'react'
import SearchableSelect from '../select/SearchableSelect'
import Input from '../Input/Input'
import chartIcon from '../../../../public/chart-icon.png'

import { Calculator, ArrowUp, ArrowDown } from 'lucide-react'
import { parseFinancialValue } from '../../../utils/financialFormula'

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
// CELL — editable or read-only, with comma formatting + max 2 decimal places
// ─────────────────────────────────────────────────────────────────────────────

const formatFinancial = (v) => {
  if (v === '' || v === null || v === undefined) return ''
  const str = String(v).replace(/,/g, '').trim()
  if (str === '' || str === '-') return str
  const n = parseFloat(str)
  if (isNaN(n)) return str
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const Cell = ({ value, editable, onChange, isTotal, isDisplayAsPercentage }) => {
  const [focused, setFocused] = useState(false)
  const [localVal, setLocalVal] = useState('')

  const pctValue = isDisplayAsPercentage
    ? String(Math.round(parseFloat(String(value ?? '').replace(/,/g, '') || '0') * 100 * 100) / 100)
    : value
  const displayValue = focused ? localVal : formatFinancial(pctValue) + (isDisplayAsPercentage ? '%' : '')

  const handleFocus = () => {
    setFocused(true)
    setLocalVal(String(value ?? '').replace(/,/g, ''))
  }

  const handleBlur = () => {
    setFocused(false)
  }

  const handleChange = (e) => {
    const v = e.target.value
    if (v === '' || /^-?\d*\.?\d{0,2}$/.test(v)) {
      setLocalVal(v)
      onChange(v)
    }
  }

  return (
    <td
      className={`px-2 py-1.5 border-b border-l border-[#eef2f7] w-[150px] min-w-[150px] max-w-[150px]
                  ${isTotal ? 'bg-[#f0f4ff]' : ''}`}
    >
      <input
        type="text"
        value={displayValue}
        disabled={!editable}
        onFocus={editable ? handleFocus : undefined}
        onBlur={editable ? handleBlur : undefined}
        onChange={editable ? handleChange : undefined}
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
  readOnlyFields = false, // true = Quarter & Company render as readonly text inputs
  searched = false, // true after Search clicked — shows quarter cols + data
  columns = MOCK_QUARTERS, // period columns: string[] OR { id, label }[] (newest first)
  ratios = MOCK_RATIOS,
  onCellChange,
  editableCol = 0,
  actions,
  tableMaxHeight = 'calc(100vh - 340px)',
  criteriaLabel = 'Default Compliance Criteria',
  criteriaRequired = true,
  fieldsRequired = true, // false in edit/view — hides asterisks on Quarter & Company
}) => {
  const handleChange = useCallback(
    (ratioId, classId, colIdx, val) => {
      onCellChange?.(ratioId, classId, colIdx, val)
    },
    [onCellChange]
  )

  // Build classification ID → name map for formula expression tooltips
  const classNameMap = useMemo(() => {
    const map = {}
    ratios.forEach((r) =>
      (r.classifications || []).forEach((c) => { map[c.id] = c.label })
    )
    return map
  }, [ratios])

  const formatExpression = useCallback(
    (expr) => {
      if (!expr?.length) return ''
      const raw = Array.isArray(expr) ? expr[0] : expr
      return String(raw)
        .split(/\s+/)
        .map((t) => {
          if (['+', '-', 'x', '/', '(', ')'].includes(t)) return t
          return classNameMap[Number(t)] || t
        })
        .join(' ')
    },
    [classNameMap]
  )

  const hasThirdField = defaultCriteria !== undefined

  return (
    <div className="font-sans flex rounded-none flex-col h-full">
      {/* ── Dropdowns row ── */}
      <div
        className={`grid gap-4 mb-4 ${hasThirdField ? 'grid-cols-[1fr_1.5fr_1.5fr]' : 'grid-cols-2'}`}
      >
        {readOnlyFields ? (
          <div>
            <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
              Quarter Name{fieldsRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              readOnly
              value={typeof selectedQuarter === 'object' ? selectedQuarter.label : selectedQuarter || ''}
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-[10px]
                         text-[13px] text-[#041E66] bg-[#f8fafc] outline-none cursor-default"
            />
          </div>
        ) : (
          <SearchableSelect
            label="Quarter Name"
            required={fieldsRequired}
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
        )}
        {readOnlyFields ? (
          <div>
            <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
              Company{fieldsRequired && <span className="text-red-500">*</span>}
            </label>
            <input
              readOnly
              value={typeof selectedCompany === 'object' ? selectedCompany.label : selectedCompany || ''}
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-[10px]
                         text-[13px] text-[#041E66] bg-[#f8fafc] outline-none cursor-default"
            />
          </div>
        ) : (
          <SearchableSelect
            label="Company"
            required={fieldsRequired}
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
        )}
        {hasThirdField && (
          <div>
            <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
              {criteriaLabel}{criteriaRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={defaultCriteria}
                className="flex-1 border border-[#e2e8f0] rounded-lg px-3 py-[10px]
                           text-[13px] text-[#041E66] bg-[#f8fafc] outline-none cursor-default"
              />
              {!readOnlyFields && (
                <button
                  onClick={onSearch}
                  disabled={disableSearch || !onSearch}
                  className="px-5 py-[10px] bg-[#F5A623] hover:bg-[#e09a1a] text-white
                             rounded-lg text-[13px] font-semibold transition-colors shrink-0
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Search
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable data table ── */}
      <div className="flex-1 overflow-hidden border border-[#dde4ee]">
        <div
          className="overflow-y-auto overflow-x-auto min-h-[250px]"
          style={{ maxHeight: tableMaxHeight }}
        >
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
                      className="px-4 py-3 text-center text-[12px] font-semibold
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
                      <td className="px-4 py-2.5 bg-[#fffbee] border-r border-[#eef2f7]">
                        <span className="text-[13px] font-semibold text-[#0B39B5]">
                          {ratio.label}
                        </span>
                      </td>
                      {columns.map((_, ci) => {
                        const t = ratio.thresholdsByQuarter?.[ci]
                        return (
                          <td
                            key={ci}
                            className="px-4 py-2.5 bg-[#fffbee] border-r border-[#eef2f7] text-center"
                          >
                            {t?.value ? (
                              <span className="text-[13px] inline-flex items-center justify-center gap-0.5 text-[#000]">
                                {t.value}
                                {t.up ? <ArrowUp size={14} className="text-red-500 shrink-0" /> : <ArrowDown size={14} className="text-red-500 shrink-0" />}
                              </span>
                            ) : null}
                          </td>
                        )
                      })}
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
                                <div className="relative group cursor-default">
                                  <img
                                    src={chartIcon}
                                    alt="Prorated"
                                    className="object-contain h-auto w-6"
                                    draggable={false}
                                  />
                                  <div
                                    className="absolute bottom-full right-0 mb-1.5 z-50 hidden group-hover:block
                          bg-[#1a2b5e] text-white text-[11px] rounded-full px-2.5 py-1.5
                          whitespace-nowrap shadow-lg pointer-events-none"
                                  >
                                    {cls.baseClassification?.classificationName || cls.label}
                                    <div className="absolute top-full right-3 border-4 border-transparent border-t-[#1a2b5e]" />
                                  </div>
                                </div>
                              )}
                              {cls.isTotal && (
                                <div className="relative group">
                                  <Calculator size={18} className="text-[#e3a204] cursor-default" />
                                  <div
                                    className="absolute bottom-full right-0 mb-1.5 z-50 hidden group-hover:block
                          bg-[#1a2b5e] text-white text-[11px] rounded-lg px-3 py-2
                          w-max max-w-[250px] break-words leading-relaxed shadow-lg pointer-events-none"
                                  >
                                    {formatExpression(cls.expression) || cls.label}
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
                            isDisplayAsPercentage={cls.isDisplayAsPercentage}
                            onChange={(val) => handleChange(ratio.id, cls.id, colIdx, val)}
                          />
                        ))}
                      </tr>
                    ))}

                    {/* ── Shariah Status row ── */}
                    {ratio.fK_ComparisonClassificationID > 0 && (
                      <>
                      <tr className="bg-white">
                        <td className="px-4 py-3 border-b border-[#eef2f7] font-bold text-[#000] bg-white">
                          Shariah Status
                        </td>
                        {columns.map((_, colIdx) => {
                          const compCls = ratio.classifications.find(
                            (c) => Number(c.id) === Number(ratio.fK_ComparisonClassificationID)
                          )
                          const compVal = compCls
                            ? parseFinancialValue(compCls.values?.[colIdx])
                            : null
                          const t = ratio.thresholdsByQuarter?.[colIdx]
                          const threshold = t?.value ? parseFloat(String(t.value).replace(/[^0-9.\-]/g, '')) : null

                          // Historical column (not the entry/current quarter) where the threshold
                          // was never set (null or 0) AND every classification value is 0 means
                          // no data was entered for that quarter — show "Data Not Available" rather
                          // than "Compliant" (which implies the ratio was actually evaluated).
                          const allValuesZero = ratio.classifications.every(
                            (c) => parseFinancialValue(c.values?.[colIdx]) === 0
                          )
                          const isNoData =
                            colIdx > 0 && (threshold === null || threshold === 0) && allValuesZero

                          let status = null
                          if (isNoData) {
                            status = 'Data Not Available'
                          } else if (compVal !== null && threshold !== null && !isNaN(threshold)) {
                            if (!threshold) {
                              status = 'Compliant'
                            } else {
                              // Only ×100 for percentage classifications; raw value for # unit
                              const compareVal = compCls?.isDisplayAsPercentage ? compVal * 100 : compVal
                              if (t.up) {
                                // Max validation: value >= threshold → Non-Compliant
                                status = compareVal >= threshold ? 'Non-Compliant' : 'Compliant'
                              } else {
                                // Min validation: value <= threshold → Non-Compliant
                                status = compareVal <= threshold ? 'Non-Compliant' : 'Compliant'
                              }
                            }
                          }

                          return (
                            <td
                              key={colIdx}
                              className="px-2 py-3 border-b border-l border-[#eef2f7] text-center bg-white"
                            >
                              {status && (
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-[12px] font-semibold ${
                                    status === 'Compliant'
                                      ? 'bg-[#DCFCE7] text-[#15803D]'
                                      : status === 'Non-Compliant'
                                      ? 'bg-[#FEE2E2] text-[#B91C1C]'
                                      : 'bg-[#F1F5F9] text-[#64748B]'
                                  }`}
                                >
                                  {status}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                      <tr><td colSpan={columns.length + 1} className="h-3" /></tr>
                      </>
                    )}
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
