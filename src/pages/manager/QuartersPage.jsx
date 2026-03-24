import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { PageHeader, SearchBar, StatusText, ConfirmModal, SortIcon, BtnPrimary, BtnSlate } from '../../components/common/index.jsx'

const MOCK = [
  { id: 1, name: 'September 2025', status: 'Active' },
  { id: 2, name: 'June 2025',      status: 'Active' },
  { id: 3, name: 'March 2025',     status: 'Inactive' },
]

const QuartersPage = () => {
  const [quarters, setQuarters] = useState(MOCK)
  const [name,     setName]     = useState('')
  const [editing,  setEditing]  = useState(null)
  const [active,   setActive]   = useState(true)
  const [search,   setSearch]   = useState('')
  const [confirm,  setConfirm]  = useState(false)

  const filtered = quarters.filter(q => q.name.toLowerCase().includes(search.toLowerCase()))

  const handleSave = () => {
    if (!name.trim()) return
    if (editing) { setConfirm(true); return }
    setQuarters(p => [...p, { id: Date.now(), name, status: 'Active' }])
    toast.success('Record Added Successfully')
    setName('')
  }

  return (
    <div>
      <PageHeader title="Manage Quarters" right={<SearchBar value={search} onChange={setSearch} onFilterClick={() => {}} />} />

      <div className="bg-white rounded-card shadow-card mb-5 p-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[12px] font-semibold text-[#1B3A6B] mb-1.5">Quarter Name <span className="text-[#E74C3C]">*</span></label>
            <input type="month" className="w-full border border-[#CBD5E0] rounded-lg px-3 py-2.5 text-[13px] text-[#1B3A6B]"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          {editing && (
            <label className="flex items-center gap-2 mb-1 text-[13px] text-[#1B3A6B] cursor-pointer shrink-0">
              <input type="checkbox" className="accent-[#00B894]" checked={active} onChange={e => setActive(e.target.checked)} /> Active
            </label>
          )}
          <div className="flex gap-2">
            {editing && <button onClick={() => { setEditing(null); setName('') }} className="px-4 py-2.5 border border-[#CBD5E0] rounded-lg text-[13px] text-[#1B3A6B] hover:bg-[#EEF2F7]">Cancel</button>}
            {name.trim()
              ? <BtnPrimary onClick={handleSave}>{editing ? 'Update' : 'Save'}</BtnPrimary>
              : <BtnSlate disabled>{editing ? 'Update' : 'Save'}</BtnSlate>
            }
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-[#EEF2F7] border-b border-[#E2E8F0]">
            {['Quarter Name','Edit','Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7A99] uppercase">{h}{h==='Quarter Name'&&<SortIcon/>}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={3} className="text-center py-12 text-[#A0AEC0]">No Record Found</td></tr>
              : filtered.map(q => (
              <tr key={q.id} className="border-b border-[#E2E8F0] hover:bg-[#EEF2F7] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1B3A6B]">{q.name}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setEditing(q.id); setName(q.name); setActive(q.status==='Active') }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#EEF2F7] text-[#1B5FC1]">✏️</button>
                </td>
                <td className="px-4 py-3"><StatusText status={q.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal open={confirm} onYes={() => {
        setQuarters(p => p.map(q => q.id === editing ? { ...q, name, status: active ? 'Active' : 'Inactive' } : q))
        toast.success('Updated Successfully')
        setConfirm(false); setEditing(null); setName('')
      }} onNo={() => setConfirm(false)} />
    </div>
  )
}
export default QuartersPage
