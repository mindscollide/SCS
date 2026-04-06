/**
 * src/components/common/financialData/ApprovalHistoryModal.jsx
 * ==============================================================
 * Reusable approval history modal.
 * Shows the full action log for a financial data record.
 *
 * Props
 * ─────
 *  record   object   — the financial data record (must have .history[])
 *  onClose  function — close handler
 *
 * history item shape: { on, by, status, notes }
 */

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { StatusBadge } from '../index.jsx'
import { SortIconTable } from '../index.jsx'

const COLS = [
  { key: 'on', title: 'Action On' },
  { key: 'by', title: 'Action By' },
  { key: 'status', title: 'Status' },
  { key: 'notes', title: 'Notes' },
]

const ApprovalHistoryModal = ({ record, onClose }) => {
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  if (!record) return null

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const history = [...(record.history || [])].sort((a, b) => {
    if (!sortCol) return 0
    const va = (a[sortCol] ?? '').toString().toLowerCase()
    const vb = (b[sortCol] ?? '').toString().toLowerCase()
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-[20px] font-bold text-[#0B39B5]">View Approval History</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center
                       text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Table ── */}
        <div className="px-6 pb-4">
          <div className="rounded-xl overflow-hidden border border-[#dde4ee]">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ backgroundColor: '#0B39B5' }}>
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-[12px] font-semibold
                                 text-white whitespace-nowrap cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1">
                        {col.title}
                        <SortIconTable col={col.key} sortCol={sortCol} sortDir={sortDir} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-[#a0aec0] bg-white">
                      No history available
                    </td>
                  </tr>
                ) : (
                  history.map((h, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#eef2f7] last:border-0 transition-colors"
                      style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f5f8ff' }}
                    >
                      <td className="px-4 py-3 text-[#041E66] text-[13px]">{h.on}</td>
                      <td className="px-4 py-3 font-medium text-[#041E66]">{h.by}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="px-4 py-3 text-[#041E66]">{h.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-center px-6 pb-6">
          <button
            onClick={onClose}
            className="px-12 py-[10px] bg-[#F5A623] hover:bg-[#e09a1a] text-white
                       rounded-xl text-[14px] font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ApprovalHistoryModal
