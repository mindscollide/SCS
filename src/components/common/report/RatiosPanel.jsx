/**
 * src/components/common/report/RatiosPanel.jsx
 * ==============================================
 * Displays Financial Ratio Name → Threshold Value (+ optional Validation)
 * table used across Compliance Standing, Basket Management, and Quarter Wise
 * Report pages.
 *
 * Props:
 *  ratios            {Array}    — [{ name, threshold, unit?, isMax? }]
 *                                 unit  — '%' | '#' | 'Ratio' (default '%')
 *                                 isMax — true=Maximum, false=Minimum (validation arrow)
 *  onThresholdChange {Function} — optional; if provided, thresholds become editable.
 *                                 Called with (index, newValue). Read-only when omitted.
 *  showValidation    {boolean}  — when true, renders a ▲ (Maximum) or ▼ (Minimum) red
 *                                 arrow inline next to the threshold value. No extra
 *                                 column header. Default false (back-compat with Basket /
 *                                 Quarter Wise).
 *  emptyText         {string}   — shown when ratios is empty (default: "No Record Found")
 *
 * Unit handling: the editable input only caps at 100 for the '%' unit (other
 * units like '#' / 'Ratio' have no upper bound). The unit suffix is rendered
 * from `r.unit` (falls back to '%' so existing %-only callers are unaffected).
 *
 * Usage:
 *  // Read-only
 *  <RatiosPanel ratios={selectedCriteriaRatios} />
 *  // Editable thresholds + real unit + Max/Min arrows (Compliance Standing)
 *  <RatiosPanel ratios={ratios} onThresholdChange={updateThreshold} showValidation />
 */

import React from 'react'

const RatiosPanel = ({
  ratios = [],
  onThresholdChange,
  showValidation = false,
  emptyText = 'No Record Found',
}) => {
  const colSpan = 2
  // Threshold-input change guard — caps at 100 only for percentage units.
  const handleInput = (i, unit, raw) => {
    if (raw === '') return onThresholdChange(i, '')
    if (unit === '%' && Number(raw) > 100) return
    if (/^\d*\.?\d{0,2}$/.test(raw)) onThresholdChange(i, raw)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-2">
      <table className="w-full text-[13px] table-fixed">
        <thead>
          <tr style={{ backgroundColor: '#E0E6F6' }}>
            <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#041E66] w-3/4">
              Financial Ratio Name
            </th>
            <th className="px-4 py-3 text-center text-[12px] font-semibold text-[#041E66] w-1/4">
              Threshold value
            </th>
          </tr>
        </thead>
        <tbody>
          {ratios.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="py-8 text-center text-[#a0aec0] text-[13px]">
                {emptyText}
              </td>
            </tr>
          ) : (
            ratios.map((r, i) => {
              const unit = r.unit ?? '%'
              const hasVal = r.threshold !== '' && r.threshold !== null && r.threshold !== undefined
              return (
                <tr key={i} className="border-t border-[#eef2f7]">
                  <td className="font-semibold px-4 py-2.5 text-[#000] w-3/4">
                    {r.name}
                  </td>
                  <td className="px-4 py-2.5 text-center w-1/4">
                    {onThresholdChange ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <div
                          className="flex items-center border border-[#dde4ee] rounded-lg px-2 py-1
                                     transition-all w-24 focus-within:border-[#01C9A4]"
                        >
                          <input
                            type="number"
                            min={0}
                            max={unit === '%' ? 100 : undefined}
                            value={r.threshold}
                            onChange={(e) => handleInput(i, unit, e.target.value)}
                            className="w-full text-center text-[13px] outline-none text-[#000] bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          {hasVal && (
                            <span className="text-[#000] text-[13px] select-none pl-0.5">{unit}</span>
                          )}
                        </div>
                        {showValidation && (
                          <span
                            className="text-[14px] font-bold leading-none select-none"
                            style={{ color: '#E74C3C' }}
                            title={r.isMax ? 'Maximum' : 'Minimum'}
                          >
                            {r.isMax ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-medium text-[#000]">
                          {hasVal ? `${r.threshold}${unit}` : '—'}
                        </span>
                        {showValidation && (
                          <span
                            className="text-[14px] font-bold leading-none select-none"
                            style={{ color: '#E74C3C' }}
                            title={r.isMax ? 'Maximum' : 'Minimum'}
                          >
                            {r.isMax ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default RatiosPanel
