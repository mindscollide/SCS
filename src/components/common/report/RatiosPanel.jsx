/**
 * src/components/common/report/RatiosPanel.jsx
 * ==============================================
 * Displays Financial Ratio Name → Threshold Value table used across
 * Compliance Standing, Basket Management, and Quarter Wise Report pages.
 *
 * Props:
 *  ratios            {Array}    — [{name:string, threshold:number}]
 *  onThresholdChange {Function} — optional; if provided, thresholds become editable.
 *                                 Called with (index, newValue).
 *                                 When omitted the column is read-only.
 *  emptyText         {string}   — shown when ratios is empty (default: "No Record Found")
 *
 * Usage:
 *  import RatiosPanel from '../../components/common/report/RatiosPanel'
 *
 *  // Read-only
 *  <RatiosPanel ratios={selectedCriteriaRatios} />
 *
 *  // Editable thresholds (Compliance Standing)
 *  <RatiosPanel
 *    ratios={ratios}
 *    onThresholdChange={(i, val) => updateThreshold(i, val)}
 *  />
 */

import React from 'react'

// ─────────────────────────────────────────────────────────────────────────────

const RatiosPanel = ({ ratios = [], onThresholdChange, emptyText = 'No Record Found' }) => (
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
            <td colSpan={2} className="py-8 text-center text-[#a0aec0] text-[13px]">
              {emptyText}
            </td>
          </tr>
        ) : (
          ratios.map((r, i) => (
            <tr key={i} className="border-t border-[#eef2f7]">
              <td className="font-semibold px-4 py-2.5 text-[#000] w-3/4">{r.name}</td>
              <td className="px-4 py-2.5 text-center w-1/4">
                {onThresholdChange ? (
                  <div className="flex items-center justify-center">
                    <div
                      className={`flex items-center border rounded-lg px-2 py-1 transition-all w-20
                  ${r.threshold === '' ? 'border-[#dde4ee]' : 'border-[#dde4ee]'} 
                  focus-within:border-[#01C9A4]`}
                    >
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={r.threshold}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            onThresholdChange(i, '')
                            return
                          }
                          if (Number(val) > 100) return
                          if (/^\d*\.?\d{0,2}$/.test(val)) onThresholdChange(i, val)
                        }}
                        className="w-full text-center text-[13px] outline-none text-[#000] bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {r.threshold !== '' && r.threshold !== null && r.threshold !== undefined && (
                        <span className="text-[#000] text-[13px] select-none">%</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="font-medium text-[#000]">{r.threshold}%</span>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)

export default RatiosPanel
