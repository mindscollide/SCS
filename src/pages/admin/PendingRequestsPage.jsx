/**
 * pages/admin/PendingRequestsPage.jsx
 * =====================================
 * Admin reviews signup requests submitted via /signup.
 *
 * Actions
 * -------
 * Approve → ConfirmModal → user is created, Create-Password email sent
 * Decline → Notes modal  → user is notified by email
 *
 * Both actions remove the row from the table on success.
 *
 * TODO: connect to POST /api/admin/approve-request and
 *       POST /api/admin/decline-request when backend is ready.
 */

import React, { useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { MOCK_PENDING_REQUESTS } from '../../utils/mockData.js'
import { SearchBar } from '../../components/common/index.jsx'
import { toast } from 'react-toastify'

const APPROVE_REASONS = ['Valid credentials', 'All documents verified', 'Background check passed']
const DECLINE_REASONS = ['Incomplete information', 'Invalid organization', 'Duplicate request']

const ActionModal = ({ request, type, onClose, onSubmit }) => {
  const [notes, setNotes] = useState(type === 'approve' ? 'Request Accepted' : 'Request Declined')
  const isApprove = type === 'approve'

  return (
    <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-[15px] font-semibold text-slate-800">
            {request.name} has requested to sign up
          </span>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {/* User details grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
            {[
              ['First Name',    request.name.split(' ')[0]],
              ['Last Name',     request.name.split(' ')[1] || '—'],
              ['Email',         request.email],
              ['Mobile #',      request.mobile],
              ['Role',          request.role],
              ['Organization',  request.org],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
                <p className="text-[13px] font-medium text-slate-700">{val}</p>
              </div>
            ))}
          </div>
          {/* Notes */}
          <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Write Notes <span className="text-red-500">*</span></label>
          <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] resize-none min-h-[80px]"
            maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} />
          <p className="text-[11px] text-slate-400 mt-1 text-right">{notes.length}/500</p>
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(isApprove ? APPROVE_REASONS : DECLINE_REASONS).map((s, i) => (
              <button key={i} onClick={() => setNotes(p => p ? p + '\n' + s : s)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-[#edf7f1] text-slate-600 hover:text-[#1a6b3c]
                           rounded-md text-[12px] border border-slate-200 hover:border-[#b8dfc9] transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-[13px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => onSubmit(notes)}
            disabled={!notes.trim()}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium text-white disabled:opacity-40 transition-colors
                        ${isApprove ? 'bg-[#1a6b3c] hover:bg-[#2a8a4f]' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isApprove ? 'Approve' : 'Decline'}
          </button>
        </div>
      </div>
    </div>
  )
}

const PendingRequestsPage = () => {
  const [requests, setRequests] = useState(MOCK_PENDING_REQUESTS)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null) // { request, type: 'approve'|'decline' }

  const filtered = requests.filter(r =>
    [r.name, r.org, r.email, r.role].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSubmit = (notes) => {
    const { request, type } = modal
    setRequests(prev => prev.filter(r => r.id !== request.id))
    toast.success(`${request.name}'s request has been ${type === 'approve' ? 'Approved' : 'Declined'}`)
    setModal(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Pending Requests</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Review and act on signup requests</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name…" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Name','Organization','Email','Mobile #','Role','Sent On','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No Pending Requests</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-[#edf7f1] transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.org}</td>
                  <td className="px-4 py-3 text-slate-600">{r.email}</td>
                  <td className="px-4 py-3 text-slate-600">{r.mobile}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">{r.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[12px]">{r.sentOn}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ request: r, type: 'approve' })}
                        className="w-8 h-8 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 text-slate-400
                                   flex items-center justify-center transition-all" title="Approve">
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => setModal({ request: r, type: 'decline' })}
                        className="w-8 h-8 rounded-lg hover:bg-red-100 hover:text-red-600 text-slate-400
                                   flex items-center justify-center transition-all" title="Decline">
                        <XCircle size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ActionModal request={modal.request} type={modal.type} onClose={() => setModal(null)} onSubmit={handleSubmit} />}
    </div>
  )
}

export default PendingRequestsPage
