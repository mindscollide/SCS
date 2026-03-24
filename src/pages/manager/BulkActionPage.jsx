/**
 * BulkActionPage.jsx
 * ===================
 * Manager selects multiple pending records and bulk approves or declines.
 *
 * Design (PSD Bulk Action 01-08):
 *  - Page title "Bulk Action"
 *  - Search bar + filter icon top-right
 *  - Approve (navy blue) + Decline (gold) buttons appear top-right of table
 *    when at least one row is selected
 *  - Table: checkbox | Quarter Name | Ticker | Company Name |
 *           Sector Name | Sent By | Sent On
 *  - Header checkbox = "Select All" / "Unselect All" (teal fill when checked)
 *  - Bulk Approve/Decline → Notes modal (same as PendingApprovalsPage)
 */
import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { MOCK_PENDING_APPROVALS } from '../../utils/mockData.js'
import { SearchBar } from '../../components/common/index.jsx'
import { X } from 'lucide-react'

const BulkNotesModal = ({ open, type, count, onClose, onSubmit }) => {
  const [notes, setNotes] = useState('')
  if (!open) return null
  const isApprove = type === 'approve'
  return (
    <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-5 animate-fade-in"
         onClick={onClose}>
      <div className="bg-white rounded-modal shadow-modal w-full max-w-md animate-slide-up"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7]">
          <span className="text-[15px] font-semibold text-navy">
            {isApprove ? 'Approve' : 'Decline'} {count} Record{count !== 1 ? 's' : ''}
          </span>
          <button onClick={onClose} className="text-slate hover:text-navy">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <label className="block text-[12px] font-medium text-navy mb-1.5">
            Write Notes <span className="text-danger">*</span>
          </label>
          <textarea maxLength={500} value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-[#d8e0ea] rounded-input px-3 py-2
                       text-[13px] resize-none min-h-[90px]" />
          <p className="text-[11px] text-slate mt-1 text-right">{notes.length} / 500</p>
        </div>
        <div className="flex justify-center gap-3 px-5 py-4 border-t border-[#eef2f7]">
          <button onClick={onClose}
            className="px-6 py-[9px] border border-[#d8e0ea] rounded-btn text-[13px]
                       font-medium text-navy hover:bg-page-bg transition-colors">
            No
          </button>
          <button onClick={() => onSubmit(notes)} disabled={!notes.trim()}
            className={`px-6 py-[9px] rounded-btn text-[13px] font-semibold text-white
                        transition-colors ${notes.trim()
                          ? isApprove ? 'bg-blue hover:bg-[#1650a8]'
                                      : 'bg-danger hover:bg-red-700'
                          : 'bg-slate cursor-not-allowed'}`}>
            Yes
          </button>
        </div>
      </div>
    </div>
  )
}

const BulkActionPage = () => {
  const [rows,   setRows]   = useState(MOCK_PENDING_APPROVALS)
  const [selected, setSel]  = useState(new Set())
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(null) // { type: 'approve'|'decline' }

  const filtered = rows.filter(r =>
    [r.ticker, r.company, r.sector, r.quarter, r.sentBy]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )
  const allChecked = filtered.length > 0 && filtered.every(r => selected.has(r.id))

  const toggleAll = () => {
    if (allChecked) setSel(new Set())
    else setSel(new Set(filtered.map(r => r.id)))
  }
  const toggleOne = id => setSel(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const handleAction = (notes) => {
    const type = modal.type
    setRows(prev => prev.filter(r => !selected.has(r.id)))
    toast.success(`${selected.size} record${selected.size !== 1 ? 's' : ''} ${type === 'approve' ? 'Approved' : 'Declined'} successfully`)
    setSel(new Set())
    setModal(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <h1 className="text-[40px] font-semibold text-[#0B39B5]">Bulk Action</h1>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name" onFilterClick={() => {}} />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {/* Action buttons above table */}
        {selected.size > 0 && (
          <div className="flex justify-end gap-2 px-5 py-3 border-b border-[#eef2f7]">
            <button onClick={() => setModal({ type: 'approve' })}
              className="px-5 py-[8px] bg-blue text-white rounded-btn text-[13px]
                         font-semibold hover:bg-[#1650a8] transition-colors">
              Approve
            </button>
            <button onClick={() => setModal({ type: 'decline' })}
              className="px-5 py-[8px] bg-gold text-white rounded-btn text-[13px]
                         font-semibold hover:bg-[#e09a1a] transition-colors">
              Decline
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-table-hd border-b border-[#dde4ee]">
                {/* Select all checkbox */}
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll}
                    className="w-4 h-4 accent-teal rounded cursor-pointer" />
                  <span className="ml-1.5 text-[11px] font-semibold text-slate uppercase tracking-wide">
                    {allChecked ? 'Unselect All' : 'Select All'}
                  </span>
                </th>
                {['Quarter Name','Ticker','Company Name','Sector Name','Sent By','Sent On'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold
                                         text-slate uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate">No Records Found</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id}
                    className={`border-b border-[#eef2f7] transition-colors cursor-pointer
                                ${selected.has(row.id) ? 'bg-[#e8faf4]' : 'hover:bg-page-bg'}`}
                    onClick={() => toggleOne(row.id)}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)}
                      className="w-4 h-4 accent-teal rounded cursor-pointer"
                      onClick={e => e.stopPropagation()} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">{row.quarter}</td>
                  <td className="px-4 py-3 font-mono font-bold text-navy">{row.ticker}</td>
                  <td className="px-4 py-3 text-navy">{row.company}</td>
                  <td className="px-4 py-3 text-navy">{row.sector}</td>
                  <td className="px-4 py-3 text-navy">{row.sentBy}</td>
                  <td className="px-4 py-3 text-slate">{row.sentOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkNotesModal
        open={!!modal}
        type={modal?.type}
        count={selected.size}
        onClose={() => setModal(null)}
        onSubmit={handleAction}
      />
    </div>
  )
}

export default BulkActionPage
