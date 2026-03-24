import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { MOCK_COMPANIES } from '../../utils/mockData.js'
import { SearchBar, StatusBadge, ConfirmModal } from '../../components/common/index.jsx'
import { Star } from 'lucide-react'

const SECTORS = ['Banking', 'Cement', 'Textile', 'Oil & Gas', 'Fertilizer']
const MARKETS = ['PSX', 'TADAWUL', 'ADX', 'BURSA']
const ANN_REP = ['March', 'June', 'September', 'December']
const FREQ = ['Yearly', 'Half-Yearly', 'Quarterly']
const GRACE = { Yearly: 6, 'Half-Yearly': 4, Quarterly: 2 }

const CompaniesPage = () => {
  const [companies, setCompanies] = useState(MOCK_COMPANIES)
  const [form, setForm] = useState({ ticker: '', name: '', sector: '', annualRep: '', market: '', freq: '', grace: '' })
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState(true)
  const [exception, setException] = useState(false)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isValid = form.ticker && form.name && form.sector && form.annualRep && form.market

  const filtered = companies.filter(c =>
    [c.ticker, c.name, c.sector, c.market].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div className="page-header"><div className="page-title">Companies</div><SearchBar value={search} onChange={setSearch} placeholder="Company Name" hasFilter /></div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">{editing ? 'Edit Company' : 'Add Company'}</span></div>
        <div className="card-body">
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Ticker <span className="required">*</span></label>
              <input className="form-control" maxLength={20} value={form.ticker} onChange={e => set('ticker', e.target.value)} placeholder="e.g. ACBL" style={{ fontFamily: 'monospace', fontWeight: 600 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Company Name <span className="required">*</span></label>
              <input className="form-control" maxLength={50} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full company name" />
            </div>
            <div className="form-group">
              <label className="form-label">Sector <span className="required">*</span></label>
              <select className="form-control" value={form.sector} onChange={e => set('sector', e.target.value)}>
                <option value="">-- Select --</option>
                {SECTORS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Annual Reporting <span className="required">*</span></label>
              <select className="form-control" value={form.annualRep} onChange={e => set('annualRep', e.target.value)}>
                <option value="">-- Select --</option>
                {ANN_REP.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Market Name <span className="required">*</span></label>
              <select className="form-control" value={form.market} onChange={e => set('market', e.target.value)}>
                <option value="">-- Select --</option>
                {MARKETS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reporting Frequency</label>
              <select className="form-control" value={form.freq} onChange={e => { set('freq', e.target.value); set('grace', GRACE[e.target.value] || '') }}>
                <option value="">-- Select --</option>
                {FREQ.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          {form.freq && <div className="form-group" style={{ maxWidth: 200 }}>
            <label className="form-label">Grace Period (months)</label>
            <input className="form-control" value={form.grace} readOnly style={{ background: '#EEF2F7' }} />
          </div>}
          {editing && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <label className="checkbox-label"><input type="checkbox" checked={status} onChange={e => setStatus(e.target.checked)} /> Active</label>
              <label className="checkbox-label"><input type="checkbox" checked={exception} onChange={e => setException(e.target.checked)} /> Exception by Shariah Advisor</label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editing && <button className="btn btn-ghost" onClick={() => { setEditing(null); setForm({ ticker: '', name: '', sector: '', annualRep: '', market: '', freq: '', grace: '' }) }}>Cancel</button>}
            <button className="btn btn-primary" disabled={!isValid} onClick={() => {
              if (!editing) { setCompanies(p => [...p, { id: Date.now(), ...form, status: 'Active', exception: false }]); toast.success('Record Added Successfully'); setForm({ ticker: '', name: '', sector: '', annualRep: '', market: '', freq: '', grace: '' }) }
              else setConfirm(true)
            }}>{editing ? 'Update' : 'Save'}</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Ticker</th><th>Company Name</th><th>Sector</th><th>Market</th><th>Annual Rep.</th><th>Freq.</th><th>Status</th><th>Edit</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8} className="table-empty">No Records Found</td></tr>
                : filtered.map(c => (
                  <tr key={c.id}>
                    <td><strong style={{ fontFamily: 'monospace' }}>{c.ticker}</strong></td>
                    <td>
                      {c.exception && <Star size={14} className="inline text-[#c9a84c] mr-1 mb-0.5" fill="#c9a84c" />}
                      {c.name}
                    </td>
                    <td>{c.sector}</td>
                    <td><span className="badge badge-info">{c.market}</span></td>
                    <td>{c.annualRep}</td>
                    <td>{c.freq || '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td><button className="action-btn edit" onClick={() => { setEditing(c.id); setForm({ ticker: c.ticker, name: c.name, sector: c.sector, annualRep: c.annualRep, market: c.market, freq: c.freq || '', grace: c.grace || '' }); setStatus(c.status === 'Active'); setException(c.exception) }}>✏️</button></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal open={!!confirm} message="Are you sure you want to do this action?" onYes={() => {
        setCompanies(prev => prev.map(c => c.id === editing ? { ...c, ...form, status: status ? 'Active' : 'Inactive', exception } : c))
        toast.success('Record Updated Successfully'); setConfirm(null); setEditing(null)
      }} onNo={() => setConfirm(null)} />
    </div>
  )
}

export default CompaniesPage
