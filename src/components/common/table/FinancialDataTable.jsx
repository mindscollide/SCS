/**
 * FinancialDataTable.jsx
 * =======================
 * Reusable financial data grid component.
 * Used in: Add Financial Data, View Financial Data, Edit Financial Data (Pending Approvals).
 *
 * Layout:
 * ────────
 * - Quarter Name dropdown + Company dropdown (top row)
 * - Scrollable table: Description | Q1 (editable) | Q2 | Q3 | Q4 (read-only)
 * - Financial ratio section headings appear as teal rows
 * - Classifications listed under each ratio
 * - Action buttons at the bottom (passed via `actions` prop)
 *
 * Props:
 *  quarters       {string[]}  — array of 4 quarter labels (newest first)
 *                               e.g. ["September 2025", "June 2025", "March 2025", "December 2024"]
 *
 *  companies      {string[]}  — list of company names for the dropdown
 *
 *  selectedQuarter {string}   — controlled value for Quarter Name dropdown
 *  onQuarterChange {Function} — called with new quarter string
 *
 *  selectedCompany {string}   — controlled value for Company dropdown
 *  onCompanyChange {Function} — called with new company string
 *
 *  ratios         {Array}     — financial ratio sections
 *                               [{
 *                                 id, label,
 *                                 classifications: [{
 *                                   id, label,
 *                                   values: [q1, q2, q3, q4]  ← string/number per quarter
 *                                 }]
 *                               }]
 *
 *  onCellChange   {Function}  — called when an editable cell changes
 *                               (ratioId, classificationId, quarterIndex, newValue)
 *                               omit or pass null for read-only mode
 *
 *  editableCol    {number}    — index of the editable quarter column (default: 0 = newest)
 *                               pass -1 for fully read-only
 *
 *  actions        {ReactNode} — buttons rendered below the table (Close, Update, etc.)
 *
 * Usage — View (read-only):
 *  <FinancialDataTable
 *    quarters={QUARTERS}
 *    companies={COMPANIES}
 *    selectedQuarter={quarter}
 *    onQuarterChange={setQuarter}
 *    selectedCompany={company}
 *    onCompanyChange={setCompany}
 *    ratios={ratios}
 *    editableCol={-1}
 *    actions={
 *      <>
 *        <button onClick={onClose}>Close</button>
 *        <button onClick={onSendForApproval}>Send For Approval</button>
 *      </>
 *    }
 *  />
 *
 * Usage — Edit:
 *  <FinancialDataTable
 *    quarters={QUARTERS}
 *    companies={COMPANIES}
 *    selectedQuarter={quarter}
 *    onQuarterChange={setQuarter}
 *    selectedCompany={company}
 *    onCompanyChange={setCompany}
 *    ratios={ratios}
 *    editableCol={0}
 *    onCellChange={handleCellChange}
 *    actions={
 *      <>
 *        <button onClick={onClose}>Close</button>
 *        <button onClick={onUpdate}>Update</button>
 *      </>
 *    }
 *  />
 */

import React, { useCallback } from "react";
import Select from "../select/Select";
import Input from "../Input/Input";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — remove when connecting to API
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_QUARTERS  = ["September 2025", "June 2025", "March 2025", "December 2024"];
export const MOCK_COMPANIES = ["Al-Hilal Investments", "Hilal Capital", "MCB Bank", "Allied Bank"];

export const MOCK_RATIOS = [
  {
    id: 1,
    label: "Interest Bearing Securities to Total Assets",
    classifications: [
      { id: 11, label: "Accrued Interest",          values: ["-",       "-",       "-",        "-"]        },
      { id: 12, label: "Total Interest bearing debts", values: ["2,129.00","5,226.00","4,939.00", "3,833.00"] },
      { id: 13, label: "Total Assets",              values: ["50,486.00","47,778.00","47,944.00","49,333.00"] },
    ],
  },
  {
    id: 2,
    label: "Non-compliant Investments to Total Assets",
    classifications: [
      { id: 21, label: "Total Long Term Investments",    values: ["-",      "-",        "72.00",   "72.00"]    },
      { id: 22, label: "Short Term Investments at Cost", values: ["2.52",   "",         "22.00",   "22.00"]    },
      { id: 23, label: "Total Investments",              values: ["2.52",   "6,269.06", "",        "2,448.49"] },
      { id: 24, label: "Total Deposits",                 values: ["",       "(5,798.62)","",        "(2,375.00)"] },
      { id: 25, label: "Total Assets",                   values: ["625.52", "470.44",   "294.10",  "73.50"]    },
      { id: 26, label: "Adjusted Total Assets",          values: ["1,390.00","1,390.00","1,444.76","1,453.00"] },
      { id: 27, label: "Market Capitalization",          values: ["-",      "-",        "-",       "-"]        },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CELL — single table cell (editable or read-only)
// ─────────────────────────────────────────────────────────────────────────────

const Cell = ({ value, editable, onChange }) => {
  if (!editable) {
    return (
      <td className="px-3 py-2 text-right text-[13px] text-[#041E66] border-b border-[#eef2f7]">
        {value || ""}
      </td>
    );
  }
  return (
    <td className="px-2 py-1.5 border-b border-[#eef2f7]">
      <Input
        value={value || ""}
        onChange={onChange}
        bgColor="white"
        borderColor="#dde4ee"
        focusBorderColor="#01C9A4"
        textColor="#041E66"
      />
    </td>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL DATA TABLE
// ─────────────────────────────────────────────────────────────────────────────

const FinancialDataTable = ({
  quarters      = MOCK_QUARTERS,
  companies     = MOCK_COMPANIES,
  selectedQuarter,
  onQuarterChange,
  selectedCompany,
  onCompanyChange,
  ratios        = MOCK_RATIOS,
  onCellChange,
  editableCol   = 0,
  actions,
}) => {

  const handleChange = useCallback((ratioId, classId, colIdx, val) => {
    onCellChange?.(ratioId, classId, colIdx, val);
  }, [onCellChange]);

  return (
    <div className="font-sans flex flex-col h-full">

      {/* ── Quarter + Company dropdowns ── */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Select
          label="Quarter Name"
          required
          value={selectedQuarter}
          onChange={onQuarterChange}
          options={quarters}
          placeholder="Select Quarter"
          bgColor="#ffffff"
          borderColor="#e2e8f0"
          focusBorderColor="#01C9A4"
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
        />
      </div>

      {/* ── Scrollable data table ── */}
      <div className="flex-1 overflow-hidden rounded-xl border border-[#dde4ee]">
        <div className="h-[460px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">

            {/* Sticky header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#E0E6F6]">
                <th className="px-4 py-3 text-left text-[12px] font-semibold
                               text-[#041E66] w-[40%] border-b border-[#dde4ee]">
                  Description
                </th>
                {quarters.map((q, i) => (
                  <th key={i}
                    className={`px-3 py-3 text-right text-[12px] font-semibold
                                border-b border-[#dde4ee]
                                ${i === editableCol ? "text-[#0B39B5]" : "text-[#041E66]"}`}
                  >
                    {q}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {ratios.map((ratio) => (
                <React.Fragment key={ratio.id}>

                  {/* ── Ratio section heading row ── */}
                  <tr>
                    <td
                      colSpan={quarters.length + 1}
                      className="px-4 py-2.5 bg-[#f8fafc] border-b border-[#eef2f7]"
                    >
                      <span className="text-[13px] font-semibold text-[#0B39B5]">
                        {ratio.label}
                      </span>
                    </td>
                  </tr>

                  {/* ── Classification rows ── */}
                  {ratio.classifications.map((cls) => (
                    <tr
                      key={cls.id}
                      className="hover:bg-[#EFF3FF] transition-colors"
                    >
                      {/* Description */}
                      <td className="px-4 py-2.5 text-[13px] text-[#041E66]
                                     border-b border-[#eef2f7]">
                        {cls.label}
                      </td>

                      {/* Quarter value cells */}
                      {quarters.map((_, colIdx) => (
                        <Cell
                          key={colIdx}
                          value={cls.values[colIdx]}
                          editable={colIdx === editableCol}
                          onChange={(val) =>
                            handleChange(ratio.id, cls.id, colIdx, val)
                          }
                        />
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Action buttons ── */}
      {actions && (
        <div className="flex justify-center gap-3 mt-6">
          {actions}
        </div>
      )}
    </div>
  );
};

export default FinancialDataTable;
