/**
 * src/components/common/financialData/ApprovalHistoryModal.jsx
 * ==============================================================
 * "View Approval History" modal — full action log of one FinancialData record.
 *
 * API: GetApprovalHistoryApi ({ PK_FinancialDataID }) — called on open with
 * { skipLoader: true } (modal shows its own spinner). Allowed roles:
 * DataEntry + Manager. Verified spec: `E:\SCS\Api document\
 * SCS_FinancialData_API_Reference.md` §6 (success `_04`; `_03` = record not
 * found / no history → empty state, not an error).
 *
 * Timeline rows come back OLDEST FIRST, one per lifecycle event:
 *  'In Progress'          — record created (empty notes)
 *  'Pending For Approval' — each submit/resubmit (submitter notes)
 *  'Approved'/'Declined'  — each Manager action (manager comments)
 *
 * Refetches every time the modal is (re)opened — history may have changed
 * since the last view (e.g. a Manager actioned the record meanwhile).
 *
 * Props
 * ─────
 *  record   object   — the listing row; only `.id` (pK_FinancialDataID) is used.
 *                      null → modal hidden, no API call.
 *  onClose  function — close handler
 *
 * Display: actionOn (yyyyMMddHHmmss) → "dd-mm-yyyy HH:mm". Sorting the
 * "Action On" column compares the raw value so order stays chronological.
 */

import React, { useState, useEffect } from 'react'
import { StatusBadge, SortIconTable, BtnModalClose, BtnGold } from '../index.jsx'
import {
  GetApprovalHistoryApi,
  GET_APPROVAL_HISTORY_CODES,
} from '../../../services/dataentry.service.js'

const HISTORY_SUCCESS = 'DataEntry_DataEntryServiceManager_GetApprovalHistory_04'
const HISTORY_EMPTY = 'DataEntry_DataEntryServiceManager_GetApprovalHistory_03'

const COLS = [
  { key: 'on', title: 'Action On' },
  { key: 'by', title: 'Action By', align: 'center' },
  { key: 'status', title: 'Status', align: 'center' },
  { key: 'notes', title: 'Notes', align: 'center' },
]

/** "20260601091500" → "01-06-2026 09:15" (date-only fallback for short values) */
const fmtApiDateTime = (raw) => {
  if (!raw) return ''
  const s = String(raw)
  if (s.length < 8) return s
  const date = `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`
  return s.length >= 12 ? `${date} ${s.slice(8, 10)}:${s.slice(10, 12)}` : date
}

/** API row → UI row. onRaw keeps yyyyMMddHHmmss for chronological sorting. */
const mapHistoryRow = (h) => ({
  onRaw: h.actionOn || '',
  on: fmtApiDateTime(h.actionOn),
  by: h.actionBy || '',
  status: h.status || '',
  notes: h.notes || '',
})

const ApprovalHistoryModal = ({ record, onClose }) => {
  const [sortCol, setSortCol] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch on open / row change. record === null resets so the next open
  // starts clean and always refetches fresh history.
  useEffect(() => {
    if (!record?.id) {
      setRows([])
      setError('')
      setSortCol('')
      setSortDir('asc')
      return
    }

    let cancelled = false // guard against state writes after close/row-switch
    const load = async () => {
      setLoading(true)
      setError('')
      const res = await GetApprovalHistoryApi(
        { PK_FinancialDataID: record.id },
        { skipLoader: true }
      )
      if (cancelled) return
      setLoading(false)

      const rr = res?.data?.responseResult
      const code = rr?.responseMessage

      if (res.success && code === HISTORY_SUCCESS) {
        setRows(Array.isArray(rr.history) ? rr.history.map(mapHistoryRow) : [])
        return
      }
      if (res.success && code === HISTORY_EMPTY) {
        setRows([]) // record not found / no history → empty state
        return
      }
      setRows([])
      setError(
        GET_APPROVAL_HISTORY_CODES[code] || res.message || 'Failed to load approval history.'
      )
    }
    load()

    return () => {
      cancelled = true
    }
  }, [record?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!record) return null

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // Unsorted = API order (chronological, oldest first). "Action On" sorts on
  // the raw yyyyMMddHHmmss value so order stays chronological.
  const history = [...rows].sort((a, b) => {
    if (!sortCol) return 0
    const key = sortCol === 'on' ? 'onRaw' : sortCol
    const va = (a[key] ?? '').toString().toLowerCase()
    const vb = (b[key] ?? '').toString().toLowerCase()
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
          <BtnModalClose onClick={onClose} />
        </div>

        {/* ── Table ── */}
        <div className="px-6 pb-4">
          <div className="overflow-hidden border border-[#dde4ee]">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ backgroundColor: '#0B39B5' }}>
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-1 text-left text-[12px] font-semibold
                                 text-white whitespace-nowrap cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-1 justify-center">
                        {col.title}
                        {/* <SortIconTable col={col.key} sortCol={sortCol} sortDir={sortDir} /> */}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 bg-white">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-[#E74C3C] bg-white">
                      {error}
                    </td>
                  </tr>
                ) : history.length === 0 ? (
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
                      <td className="px-4 py-2 text-[#000] text-[13px] whitespace-nowrap">
                        {h.on}
                      </td>
                      <td className="px-4 py-2 font-medium text-[#000] text-center">{h.by}</td>
                      <td className="px-4 py-2 text-center">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="px-4 py-2 text-[#000] text-center">{h.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-center px-6 pb-6">
          <BtnGold onClick={onClose}>Close</BtnGold>
        </div>
      </div>
    </div>
  )
}

export default ApprovalHistoryModal
