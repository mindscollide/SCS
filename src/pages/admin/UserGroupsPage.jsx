/**
 * pages/admin/UserGroupsPage.jsx
 * ================================
 * Admin configures groups of Data Entry users.
 * Groups are used for task routing / assignment.
 *
 * Rules (from SRS)
 * ----------------
 * - Min 2, max 4 users per group
 * - Same user cannot appear more than once in a group
 * - Group is saved and appears in the listing below
 *
 * TODO: replace MOCK_USERS_DE with GET /api/admin/data-entry-users
 *       and group CRUD with POST/PUT/DELETE /api/admin/groups
 */

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { SearchBar, ConfirmModal } from '../../components/common/index.jsx'
import { toast } from 'react-toastify'

/** Simulated list of Data Entry users available for grouping */
const MOCK_USERS_DE = ['Bilal Khan', 'Fatima Malik', 'Hamza Ali', 'Zainab Raza', 'Umar Shaikh']

const INITIAL_GROUPS = [
  { id: 1, u1: 'Bilal Khan',  u2: 'Fatima Malik', u3: '',         u4: '' },
  { id: 2, u1: 'Hamza Ali',   u2: 'Zainab Raza',  u3: 'Bilal Khan', u4: '' },
]

const EMPTY_FORM = { u1: '', u2: '', u3: '', u4: '' }

const UserGroupsPage = () => {
  const [groups,  setGroups]  = useState(INITIAL_GROUPS)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)   // null = add mode, id = edit mode
  const [search,  setSearch]  = useState('')
  const [confirm, setConfirm] = useState(null)   // { id } for delete confirmation

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isValid = form.u1 && form.u2

  const filtered = groups.filter(g =>
    [g.u1, g.u2, g.u3, g.u4].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  /* Validate no duplicate users in the group */
  const hasDuplicates = () => {
    const vals = [form.u1, form.u2, form.u3, form.u4].filter(Boolean)
    return new Set(vals).size !== vals.length
  }

  const handleSave = () => {
    if (!isValid) return
    if (hasDuplicates()) { toast.error('Same user cannot be selected more than once'); return }

    if (editing) {
      setGroups(prev => prev.map(g => g.id === editing ? { id: editing, ...form } : g))
      toast.success('User Group updated successfully')
      setEditing(null)
    } else {
      setGroups(prev => [...prev, { id: Date.now(), ...form }])
      toast.success('User Group added successfully')
    }
    setForm(EMPTY_FORM)
  }

  const handleDelete = (id) => setConfirm({ id })

  const confirmDelete = () => {
    setGroups(prev => prev.filter(g => g.id !== confirm.id))
    toast.success('User Group removed')
    setConfirm(null)
  }

  const startEdit = (g) => {
    setEditing(g.id)
    setForm({ u1: g.u1, u2: g.u2, u3: g.u3 || '', u4: g.u4 || '' })
  }

  const cancelEdit = () => { setEditing(null); setForm(EMPTY_FORM) }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div>
          <h2 className="text-[19px] font-bold text-slate-800">User Groups</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Group Data Entry users for task assignment</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by user name…" />
      </div>

      {/* ── Add / Edit Form ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card mb-5">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[14px] font-semibold text-slate-700">
            {editing ? 'Edit Group' : 'Add New Group'}
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {['u1','u2','u3','u4'].map((k, i) => (
              <div key={k}>
                <label className="block text-[12px] font-medium text-slate-600 mb-1.5">
                  User {i + 1} {i < 2 && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-[13px] text-slate-700"
                  value={form[k]}
                  onChange={e => set(k, e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {MOCK_USERS_DE.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            {editing && (
              <button onClick={cancelEdit} className="px-4 py-2 rounded-lg border border-slate-300 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-4 py-2 rounded-lg bg-[#1a6b3c] text-white text-[13px] font-medium hover:bg-[#2a8a4f] disabled:opacity-40 transition-colors"
            >
              {editing ? 'Update Group' : 'Save Group'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Groups Table ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['User 1','User 2','User 3','User 4','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No Groups Found</td></tr>
              ) : filtered.map(g => (
                <tr key={g.id} className="border-b border-slate-100 hover:bg-[#edf7f1] transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{g.u1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{g.u2}</td>
                  <td className="px-4 py-3 text-slate-500">{g.u3 || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{g.u4 || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(g)} className="w-8 h-8 rounded-lg hover:bg-[#edf7f1] hover:text-[#1a6b3c] text-slate-400 flex items-center justify-center transition-all text-[15px]" title="Edit">✏️</button>
                      <button onClick={() => handleDelete(g.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 flex items-center justify-center transition-all" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal open={!!confirm} title="Delete Group" message="Are you sure you want to remove this user group?" type="danger" onYes={confirmDelete} onNo={() => setConfirm(null)} />
    </div>
  )
}

export default UserGroupsPage
