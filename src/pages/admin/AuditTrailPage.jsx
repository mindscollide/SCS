/**
 * pages/admin/AuditTrailPage.jsx
 * ================================
 * Admin views a log of all user actions within the system.
 *
 * Filters: User Name | Organization | Email | IP Address | Date Range
 *
 * Table columns:
 *   User Name | Organization | Email | IP Address | Login Date |
 *   Login Time | Actions Count | Logout Time | View (detail)
 *
 * Clicking "View" opens a modal showing individual action log entries.
 *
 * Export button generates Excel/PDF (TODO: wire to exportApi).
 *
 * TODO: replace mock data with GET /api/admin/audit-trail?filters=...
 */

import React, { useState } from 'react'
import { Download, Eye, X } from 'lucide-react'
import { toast } from 'react-toastify'

const AUDIT_DATA = [
  { id: 1, user: 'Muhammad Aamir', org: 'Minds Collide',    email: 'aamir@hilal.com', ip: '192.168.1.10', loginDate: '12-03-2026', loginTime: '09:00 AM', actions: 5,  logoutTime: '10:30 AM' },
  { id: 2, user: 'Sara Ahmed',     org: 'Hilal Investments', email: 'sara@hilal.com',  ip: '192.168.1.20', loginDate: '12-03-2026', loginTime: '10:15 AM', actions: 12, logoutTime: '12:00 PM' },
  { id: 3, user: 'Bilal Khan',     org: 'Hilal Investments', email: 'bilal@hilal.com', ip: '192.168.1.15', loginDate: '11-03-2026', loginTime: '08:45 AM', actions: 8,  logoutTime: '05:30 PM' },
]

const ACTION_DETAIL = [
  { time: '09:02 AM', desc: 'User login',                        prev: '—',       updated: '—' },
  { time: '09:15 AM', desc: 'Updated company ACBL — Status',     prev: 'Active',  updated: 'Inactive' },
  { time: '09:45 AM', desc: 'Approved financial data for MCB',   prev: 'Pending', updated: 'Approved' },
]

const AuditTrailPage = () => {
  const [filters,  setFilters]  = useState({ user: '', org: '', email: '', ip: '', from: '', to: '' })
  const [results,  setResults]  = useState([])
  const [searched, setSearched] = useState(false)
  const [viewRow,  setViewRow]  = useState(null)

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const handleGenerate = () => {
    /* TODO: call GET /api/admin/audit-trail?...filters with actual filters */
    setResults(AUDIT_DATA)
    setSearched(true)
  }

  const handleClear = () => {
    setFilters({ user: '', org: '', email: '', ip: '', from: '', to: '' })
    setResults([])
    setSearched(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Audit Trail</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Monitor all user activity across the system</p>
        </div>
        <button
          disabled={!searched}
          onClick={() => toast.info('Export feature coming soon')}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600
                     hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          <Download size={15} /> Export
        </button>
      </div>

      {/* ── Filters card ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card mb-5">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[14px] font-semibold text-slate-700">Search Criteria</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">User Name</label>
              <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                value={filters.user} onChange={e => setF('user', e.target.value)}>
                <option value="">All Users</option>
                {AUDIT_DATA.map(r => <option key={r.id}>{r.user}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Organization</label>
              <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                value={filters.org} onChange={e => setF('org', e.target.value)}>
                <option value="">All</option>
                <option>Minds Collide</option><option>Hilal Investments</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Email ID</label>
              <input className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                placeholder="email@example.com" value={filters.email} onChange={e => setF('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">IP Address</label>
              <input className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                placeholder="999.999.999.999" value={filters.ip} onChange={e => setF('ip', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">From Date</label>
              <input type="date" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                value={filters.from} onChange={e => setF('from', e.target.value)} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">To Date</label>
              <input type="date" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                value={filters.to} onChange={e => setF('to', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleClear} className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">Clear</button>
            <button onClick={handleGenerate} className="px-4 py-2 bg-[#1a6b3c] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a8a4f] transition-colors">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* ── Results table ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['User Name','Organization','Email','IP Address','Login Date','Login Time','Actions','Logout Time','View'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                  {searched ? 'No records found for selected criteria' : 'Set filters above and click Generate Report'}
                </td></tr>
              ) : results.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-[#edf7f1] transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.user}</td>
                  <td className="px-4 py-3 text-slate-600">{r.org}</td>
                  <td className="px-4 py-3 text-slate-600">{r.email}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-500">{r.ip}</td>
                  <td className="px-4 py-3 text-slate-600">{r.loginDate}</td>
                  <td className="px-4 py-3 text-slate-600">{r.loginTime}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">{r.actions}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.logoutTime}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewRow(r)} className="w-8 h-8 rounded-lg hover:bg-[#edf7f1] hover:text-[#1a6b3c] text-slate-400 flex items-center justify-center transition-all">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Action detail modal ── */}
      {viewRow && (
        <div className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5 animate-fade-in" onClick={() => setViewRow(null)}>
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="text-[15px] font-semibold text-slate-800">Action Log — {viewRow.user}</span>
              <button onClick={() => setViewRow(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 rounded-xl p-3 mb-4">
                <div><p className="text-[11px] text-slate-400">User</p><p className="font-semibold text-slate-700">{viewRow.user}</p></div>
                <div><p className="text-[11px] text-slate-400">IP</p><p className="font-mono text-[12px] text-slate-700">{viewRow.ip}</p></div>
                <div><p className="text-[11px] text-slate-400">Session</p><p className="text-slate-700 text-[12px]">{viewRow.loginDate} {viewRow.loginTime} – {viewRow.logoutTime}</p></div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-[13px]">
                  <thead><tr className="bg-slate-50 border-b border-slate-200">
                    {['Description','Action Time','Previous Value','Updated Value'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {ACTION_DETAIL.map((a, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 text-slate-700">{a.desc}</td>
                        <td className="px-4 py-3 text-slate-500 text-[12px]">{a.time}</td>
                        <td className="px-4 py-3 text-slate-500">{a.prev}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{a.updated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setViewRow(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">Close</button>
              <button onClick={() => toast.info('Export coming soon')} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditTrailPage
