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
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ backgroundColor: '#E0E6F6' }}>
          <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#041E66]">
            Financial Ratio Name
          </th>
          <th className="px-4 py-3 text-right text-[12px] font-semibold text-[#041E66] w-[180px]">
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
              <td className="px-4 py-2.5 text-[#041E66]">{r.name}</td>
              <td className="px-4 py-2.5 text-right">
                {onThresholdChange ? (
                  /* Editable input — used in Compliance Standing */
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={r.threshold}
                      onChange={(e) => onThresholdChange(i, e.target.value)}
                      className="w-20 text-right px-2 py-1 text-[13px] border border-[#dde4ee]
                                 rounded-lg outline-none focus:border-[#01C9A4] transition-all
                                 text-[#041E66]"
                    />
                    <span className="text-[#041E66] text-[13px]">%</span>
                  </div>
                ) : (
                  <span className="font-medium text-[#041E66]">{r.threshold}%</span>
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
