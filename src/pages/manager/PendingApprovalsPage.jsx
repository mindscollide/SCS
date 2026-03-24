/**
 * pages/manager/PendingApprovalsPage.jsx
 * =========================================
 * Manager reviews financial data submitted by Data Entry users.
 *
 * Actions per row
 * ---------------
 * View    → read-only preview of the financial data (modal)
 * Edit    → manager can modify data before approving
 * Approve → NotesModal → marks record as Approved, notifies Data Entry user
 * Decline → NotesModal → marks record as Declined, notifies Data Entry user
 *
 * Row is removed from this queue once acted upon.
 *
 * TODO: GET /api/manager/pending-approvals, POST /api/manager/approve/:id,
 *       POST /api/manager/decline/:id
 */

import React, { useState } from 'react'
import { CheckCircle, XCircle, Eye, Edit, X } from 'lucide-react'
import { MOCK_PENDING_APPROVALS } from '../../utils/mockData.js'
import { SearchBar } from '../../components/common/index.jsx'
import { toast } from 'react-toastify'

const APPROVE_REASONS = ['Data verified', 'Calculations match', 'All documents reviewed']
const DECLINE_REASONS  = ['Data mismatch', 'Incomplete information', 'Requires revision']

/** Notes modal for Approve / Decline actions */
const ReasonModal = ({ open, type, onClose, onSubmit }) => {
  const [reason, setReason] = useState(type === 'approve' ? 'Approved' : 'Declined')
  const isApprove = type === 'approve'
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-[15px] font-semibold text-slate-800">
            {isApprove ? '✅ Approve Record' : '❌ Decline Record'}
          </span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-5">
          <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Reason <span className="text-red-500">*</span></label>
          <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] resize-none min-h-[90px]"
            maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
          <p className="text-[11px] text-slate-400 mt-1 text-right">{reason.length}/500</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(isApprove ? APPROVE_REASONS : DECLINE_REASONS).map((r, i) => (
              <button key={i} onClick={() => setReason(p => p ? p + '\n' + r : r)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#edf7f1] text-slate-600 hover:text-[#1a6b3c] rounded-md text-[12px] border border-slate-200 transition-all">
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">No</button>
          <button onClick={() => onSubmit(reason)} disabled={!reason.trim()}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-colors
                        ${isApprove ? 'bg-[#1a6b3c] hover:bg-[#2a8a4f]' : 'bg-red-600 hover:bg-red-700'}`}>
            Yes
          </button>
        </div>
      </div>
    </div>
  )
}

const PendingApprovalsPage = () => {
  const [approvals, setApprovals] = useState(MOCK_PENDING_APPROVALS)
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(null)  // { row, type }

  const filtered = approvals.filter(a =>
    [a.ticker, a.company, a.sector, a.quarter, a.sentBy]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAction = (reason) => {
    const { row, type } = modal
    setApprovals(prev => prev.filter(a => a.id !== row.id))
    toast.success(`${row.ticker} has been ${type === 'approve' ? 'Approved ✅' : 'Declined ❌'}`)
    setModal(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Pending Approvals</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {approvals.length} record{approvals.length !== 1 ? 's' : ''} awaiting your review
          </p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by company…" onFilterClick={() => {}} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Quarter','Ticker','Company Name','Sector','Sent By','Sent On','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No Pending Approvals</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-[#edf7f1] transition-colors">
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">{a.quarter}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{a.ticker}</td>
                  <td className="px-4 py-3 text-[#1a6b3c] font-medium cursor-pointer hover:underline">{a.company}</td>
                  <td className="px-4 py-3 text-slate-600">{a.sector}</td>
                  <td className="px-4 py-3 text-slate-600">{a.sentBy}</td>
                  <td className="px-4 py-3 text-slate-400 text-[12px]">{a.sentOn}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 rounded-lg hover:bg-[#edf7f1] hover:text-[#1a6b3c] text-slate-400 flex items-center justify-center transition-all" title="View"><Eye size={15} /></button>
                      <button className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400 flex items-center justify-center transition-all" title="Edit"><Edit size={15} /></button>
                      <button onClick={() => setModal({ row: a, type: 'approve' })} className="w-8 h-8 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 text-slate-400 flex items-center justify-center transition-all" title="Approve"><CheckCircle size={15} /></button>
                      <button onClick={() => setModal({ row: a, type: 'decline' })} className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600 text-slate-400 flex items-center justify-center transition-all" title="Decline"><XCircle size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReasonModal open={!!modal} type={modal?.type} onClose={() => setModal(null)} onSubmit={handleAction} />
    </div>
  )
}

export default PendingApprovalsPage
