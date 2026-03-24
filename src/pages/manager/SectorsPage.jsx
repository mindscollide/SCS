/**
 * pages/manager/SectorsPage.jsx
 * ================================
 * Manager manages the list of company sectors (e.g. Banking, Cement).
 *
 * Fields: Sector Name | Status (on edit only)
 *
 * TODO: GET/POST/PUT /api/manager/sectors
 */

import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { MOCK_SECTORS } from '../../utils/mockData.js'
import { SearchBar, StatusBadge, ConfirmModal } from '../../components/common/index.jsx'

const SectorsPage = () => {
  const [sectors, setSectors] = useState(MOCK_SECTORS)
  const [name,    setName]    = useState('')
  const [editing, setEditing] = useState(null)
  const [active,  setActive]  = useState(true)
  const [search,  setSearch]  = useState('')
  const [confirm, setConfirm] = useState(null)

  const filtered = sectors.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  const handleSave = () => {
    if (!name.trim()) return
    if (editing) { setConfirm(true); return }
    setSectors(p => [...p, { id: Date.now(), name, status: 'Active' }])
    toast.success('Record Added Successfully')
    setName('')
  }

  const cancelEdit = () => { setEditing(null); setName('') }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Sectors</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Manage company sectors</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search sectors…" />
      </div>

      {/* ── Form ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card mb-5">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[14px] font-semibold text-slate-700">{editing ? 'Edit Sector' : 'Add Sector'}</h3>
        </div>
        <div className="p-5 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Sector Name <span className="text-red-500">*</span></label>
            <input maxLength={50} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
              value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Banking" />
            <p className="text-[11px] text-slate-400 mt-1 text-right">{name.length}/50</p>
          </div>
          {editing && (
            <label className="flex items-center gap-2 mb-5 cursor-pointer text-[13px] text-slate-600 shrink-0">
              <input type="checkbox" className="accent-[#1a6b3c]" checked={active} onChange={e => setActive(e.target.checked)} /> Active
            </label>
          )}
          <div className="flex gap-2 mb-5">
            {editing && <button onClick={cancelEdit} className="px-4 py-2.5 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>}
            <button onClick={handleSave} disabled={!name.trim()}
              className="px-4 py-2.5 bg-[#1a6b3c] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a8a4f] disabled:opacity-40 transition-colors">
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              {['Sector Name','Status','Edit'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={3} className="text-center py-12 text-slate-400">No Records Found</td></tr>
                : filtered.map(s => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-[#edf7f1] transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditing(s.id); setName(s.name); setActive(s.status === 'Active') }}
                      className="w-8 h-8 rounded-lg hover:bg-[#edf7f1] hover:text-[#1a6b3c] text-slate-400 flex items-center justify-center transition-all text-[15px]">
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal open={!!confirm} message="Are you sure you want to update this record?"
        onYes={() => {
          setSectors(p => p.map(s => s.id === editing ? { ...s, name, status: active ? 'Active' : 'Inactive' } : s))
          toast.success('Updated Successfully')
          setConfirm(null); setEditing(null); setName('')
        }}
        onNo={() => setConfirm(null)} />
    </div>
  )
}

export default SectorsPage
