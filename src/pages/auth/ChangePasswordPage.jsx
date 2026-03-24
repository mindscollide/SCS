/**
 * ChangePasswordPage.jsx
 * =======================
 * Inside-app page (uses AppLayout — has sidebar + topbar).
 * Route: /scs/change-password
 *
 * Design (PSD 09):
 *  - Page title "Change Password" large navy bold
 *  - White card, form centered, label-left / input-right layout
 *  - Old Password   (eye toggle)
 *  - New Password * (eye toggle + 4-segment policy bar below)
 *  - Confirm Password * (eye toggle + "Match the password" hint)
 *  - Buttons: Cancel (gold) | Update (slate disabled → blue when valid)
 *
 * Policy segments: No Space 8-20 | Capital Letter | Numeric | Special character
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-toastify'

const POLICY = [
  { label: 'No Space 8-20', test: p => p.length >= 8 && p.length <= 20 && !/\s/.test(p) },
  { label: 'Capital Letter', test: p => /[A-Z]/.test(p) },
  { label: 'Numeric',        test: p => /[0-9]/.test(p) },
  { label: 'Special character', test: p => /[!@#$%^&*]/.test(p) },
]

const EyeInput = ({ value, onChange, placeholder, id }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={20}
        className="w-full px-3 py-[10px] pr-10 border border-[#d8e0ea] rounded-input
                   text-[13px] text-navy placeholder:text-[#a0aec0]
                   bg-white transition-colors"
      />
      <button type="button" onClick={() => setShow(p => !p)}
        className="absolute right-3 text-[#a0aec0] hover:text-navy transition-colors">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const [old,     setOld]     = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confirm, setConfirm] = useState('')

  const policyResults = POLICY.map(r => ({ ...r, ok: r.test(newPwd) }))
  const allPass = policyResults.every(r => r.ok)
  const matches = newPwd === confirm && confirm.length > 0
  const canSave = old && allPass && matches

  const handleUpdate = () => {
    if (!canSave) return
    toast.success('Password updated successfully')
    navigate(-1)
  }

  return (
    <div>
      <h1 className="text-[26px] font-[40] text-[#0B39B5] mb-6">Change Password</h1>

      <div className="bg-white rounded-card shadow-card p-8 max-w-2xl">
        {/* Old Password */}
        <div className="flex items-start gap-4 mb-7">
          <label className="w-[170px] pt-[10px] text-[13px] font-medium text-navy shrink-0">
            Old Password
          </label>
          <div className="flex-1">
            <EyeInput value={old} onChange={setOld} placeholder="••••••••••" id="old" />
          </div>
        </div>

        {/* New Password */}
        <div className="flex items-start gap-4 mb-7">
          <label className="w-[170px] pt-[10px] text-[13px] font-medium text-navy shrink-0">
            New Password <span className="text-danger">*</span>
          </label>
          <div className="flex-1">
            <EyeInput value={newPwd} onChange={setNewPwd} placeholder="Enter new password" id="new" />
            {/* 4-segment policy bar */}
            <div className="flex gap-1 mt-2">
              {policyResults.map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`h-1 w-full rounded-full transition-colors duration-200
                    ${r.ok ? 'bg-teal' : 'bg-[#d8e0ea]'}`} />
                  <span className={`text-[10px] font-medium text-center leading-tight
                    ${r.ok ? 'text-teal' : 'text-[#a0aec0]'}`}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex items-start gap-4 mb-8">
          <label className="w-[170px] pt-[10px] text-[13px] font-medium text-navy shrink-0">
            Confirm Password <span className="text-danger">*</span>
          </label>
          <div className="flex-1">
            <EyeInput value={confirm} onChange={setConfirm}
              placeholder="Re-enter Password" id="confirm" />
            <p className={`text-[11px] mt-1 text-center transition-colors
              ${matches ? 'text-teal' : 'text-[#a0aec0]'}`}>
              {confirm.length > 0 && !matches ? 'Passwords do not match' : 'Match the password'}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button onClick={() => navigate(-1)}
            className="px-8 py-[9px] bg-gold text-white rounded-btn
                       text-[13px] font-semibold hover:bg-[#e09a1a] transition-colors">
            Cancel
          </button>
          <button onClick={handleUpdate} disabled={!canSave}
            className={`px-8 py-[9px] rounded-btn text-[13px] font-semibold text-white
                        transition-colors ${canSave
                          ? 'bg-blue hover:bg-[#1650a8] cursor-pointer'
                          : 'bg-slate cursor-not-allowed'}`}>
            Update
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPage
