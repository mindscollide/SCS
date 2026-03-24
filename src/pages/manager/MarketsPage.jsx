/**
 * pages/manager/MarketsPage.jsx
 * ===============================
 * Manager manages the list of stock markets (e.g. PSX, TADAWUL).
 *
 * Fields: Country | Market Full Name | Market Short Name | Status (on edit)
 *
 * Add   → form on top, Save button creates new record
 * Edit  → pre-fills form, Update button → ConfirmModal → saves
 *
 * TODO: GET/POST/PUT /api/manager/markets
 */

import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { MOCK_MARKETS } from '../../utils/mockData.js'
import { SearchBar, StatusBadge, ConfirmModal } from '../../components/common/index.jsx'

const COUNTRIES = ['Pakistan','Saudi Arabia','UAE','Malaysia','Turkey','Egypt','Jordan','Bahrain','Kuwait','Oman']

const MarketsPage = () => {
  const [markets, setMarkets] = useState(MOCK_MARKETS)
  const [form,    setForm]    = useState({ country: '', fullName: '', shortName: '' })
  const [editing, setEditing] = useState(null)
  const [active,  setActive]  = useState(true)
  const [search,  setSearch]  = useState('')
  const [confirm, setConfirm] = useState(null)
  const [pending, setPending] = useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isValid = form.country && form.fullName && form.shortName

  const filtered = markets.filter(m =>
    [m.country, m.fullName, m.shortName].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSave = () => {
    if (!isValid) return
    if (editing) {
      setPending({ ...form, id: editing, status: active ? 'Active' : 'Inactive' })
      setConfirm(true)
    } else {
      setMarkets(p => [...p, { id: Date.now(), ...form, status: 'Active' }])
      toast.success('Record Added Successfully')
      setForm({ country: '', fullName: '', shortName: '' })
    }
  }

  const handleEdit = (m) => {
    setEditing(m.id)
    setForm({ country: m.country, fullName: m.fullName, shortName: m.shortName })
    setActive(m.status === 'Active')
  }

  const cancelEdit = () => { setEditing(null); setForm({ country: '', fullName: '', shortName: '' }) }

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">Markets</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Manage stock markets available in the system</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search markets…" onFilterClick={() => {}} />
      </div>

      {/* ── Add / Edit Form ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card mb-5">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[14px] font-semibold text-slate-700">{editing ? 'Edit Market' : 'Add Market'}</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Country <span className="text-red-500">*</span></label>
              <select className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                value={form.country} onChange={e => set('country', e.target.value)}>
                <option value="">-- Select Country --</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Market Full Name <span className="text-red-500">*</span></label>
              <input maxLength={50} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Pakistan Stock Exchange" />
              <p className="text-[11px] text-slate-400 mt-1 text-right">{form.fullName.length}/50</p>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-600 mb-1.5">Market Short Name <span className="text-red-500">*</span></label>
              <input maxLength={20} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700 font-mono font-bold uppercase"
                value={form.shortName} onChange={e => set('shortName', e.target.value.toUpperCase())} placeholder="PSX" />
            </div>
          </div>
          {editing && (
            <label className="flex items-center gap-2 mb-4 cursor-pointer text-[13px] text-slate-600">
              <input type="checkbox" className="accent-[#1a6b3c]" checked={active} onChange={e => setActive(e.target.checked)} /> Active
            </label>
          )}
          <div className="flex justify-end gap-2">
            {editing && <button onClick={cancelEdit} className="px-4 py-2 border border-slate-300 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>}
            <button onClick={handleSave} disabled={!isValid}
              className="px-4 py-2 bg-[#1a6b3c] text-white rounded-lg text-[13px] font-medium hover:bg-[#2a8a4f] disabled:opacity-40 transition-colors">
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
              {['Country','Market Full Name','Market Short Name','Status','Edit'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-slate-400">No Records Found</td></tr>
                : filtered.map(m => (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-[#edf7f1] transition-colors">
                  <td className="px-4 py-3 text-slate-600">{m.country}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{m.fullName}</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#1a6b3c]">{m.shortName}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3"><button onClick={() => handleEdit(m)} className="w-8 h-8 rounded-lg hover:bg-[#edf7f1] hover:text-[#1a6b3c] text-slate-400 flex items-center justify-center transition-all text-[15px]">✏️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal open={!!confirm} message="Are you sure you want to update this record?"
        onYes={() => {
          setMarkets(p => p.map(m => m.id === pending.id ? pending : m))
          toast.success('Updated Successfully')
          setConfirm(null); setPending(null); setEditing(null)
          setForm({ country: '', fullName: '', shortName: '' })
        }}
        onNo={() => setConfirm(null)} />
    </div>
  )
}

export default MarketsPage
