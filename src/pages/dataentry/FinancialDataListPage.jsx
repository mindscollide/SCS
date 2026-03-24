/**
 * pages/dataentry/FinancialDataListPage.jsx
 * ===========================================
 * Data Entry officer manages their quarterly financial data submissions.
 *
 * Statuses
 * --------
 * In Progress          → can Edit and Send for Approval
 * Pending For Approval → locked (awaiting Manager action)
 * Approved             → locked, read-only
 * Declined             → can Re-submit (send again after corrections)
 *
 * Approval History modal shows the full timeline of status changes.
 *
 * TODO: GET /api/data-entry/financial-data, POST /api/data-entry/send-approval/:id
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Send, Eye, Clock, X } from 'lucide-react'
import { MOCK_FINANCIAL_DATA } from '../../utils/mockData.js'
import { SearchBar, StatusBadge } from '../../components/common/index.jsx'
import { toast } from 'react-toastify'

const HISTORY = [
  { on: '2026-03-10 09:00', by: 'Bilal Khan',  status: 'In Progress',          notes: '—' },
  { on: '2026-03-10 11:30', by: 'Bilal Khan',  status: 'Pending For Approval',  notes: 'Please verify' },
  { on: '2026-03-10 14:00', by: 'Sara Ahmed',  status: 'Approved',              notes: 'Data verified and matches.' },
]

const FinancialDataListPage = () => {
  const navigate = useNavigate()
  const [data,        setData]        = useState(MOCK_FINANCIAL_DATA)
  const [search,      setSearch]      = useState('')
  const [sendModal,   setSendModal]   = useState(null)
  const [histModal,   setHistModal]   = useState(null)
  const [notes,       setNotes]       = useState('Please Verify')

  const filtered = data.filter(d =>
    [d.ticker, d.company, d.sector, d.quarter, d.status]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSend = () => {
    setData(prev => prev.map(d => d.id === sendModal.id ? { ...d, status: 'Pending For Approval' } : d))
    toast.success('Sent for approval successfully')
    setSendModal(null)
    setNotes('Please Verify')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Financial Data</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Manage quarterly financial data submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search…" onFilterClick={() => {}} />
          <button onClick={() => navigate('/scs/data-entry/financial-data/add')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a6b3c] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a8a4f] transition-colors shrink-0">
            <Plus size={15} /> Add Financial Data
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              {['Quarter','Ticker','Company Name','Sector','Status','Actions','History'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No Data Found</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-[#edf7f1] transition-colors">
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">{row.quarter}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{row.ticker}</td>
                  <td className="px-4 py-3 text-[#1a6b3c] font-medium cursor-pointer hover:underline">{row.company}</td>
                  <td className="px-4 py-3 text-slate-600">{row.sector}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {row.status === 'In Progress' && (
                        <button className="w-8 h-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400 flex items-center justify-center transition-all" title="Edit"><Edit size={14} /></button>
                      )}
                      {(row.status === 'In Progress' || row.status === 'Declined') && (
                        <button onClick={() => setSendModal(row)} className="w-8 h-8 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 text-slate-400 flex items-center justify-center transition-all" title="Send for Approval"><Send size={14} /></button>
                      )}
                      <button className="w-8 h-8 rounded-lg hover:bg-[#edf7f1] hover:text-[#1a6b3c] text-slate-400 flex items-center justify-center transition-all" title="View"><Eye size={14} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.status !== 'In Progress' && (
                      <button onClick={() => setHistModal(row)} className="w-8 h-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 text-slate-400 flex items-center justify-center transition-all" title="View History"><Clock size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Send for Approval Modal ── */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5 animate-fade-in" onClick={() => setSendModal(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="text-[15px] font-semibold text-slate-800">Send for Approval</span>
              <button onClick={() => setSendModal(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>
            <div className="p-5">
              <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
                Are you sure you want to send <strong>{sendModal.ticker}</strong> data for approval?
                You will not be able to make changes after sending.
              </p>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Notes</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] resize-none min-h-[80px]"
                maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} />
              <p className="text-[11px] text-slate-400 mt-1 text-right">{notes.length}/500</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setSendModal(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSend} className="px-4 py-2 bg-[#1a6b3c] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a8a4f] transition-colors">Proceed</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval History Modal ── */}
      {histModal && (
        <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5 animate-fade-in" onClick={() => setHistModal(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="text-[15px] font-semibold text-slate-800">Approval History — {histModal.ticker}</span>
              <button onClick={() => setHistModal(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>
            <div className="p-5">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    {['Action On','Action By','Status','Notes'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {HISTORY.map((h, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 text-slate-500 text-[12px]">{h.on}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{h.by}</td>
                        <td className="px-4 py-3"><StatusBadge status={h.status} /></td>
                        <td className="px-4 py-3 text-slate-500">{h.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end px-5 py-3 border-t border-slate-100">
              <button onClick={() => setHistModal(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialDataListPage
