/**
 * ChangePasswordPage.jsx — Authenticated change password
 *
 * Design (from screen 09 - Change Password):
 * ─────────────────────────────────────────────────────────────────
 * Uses full app layout (topbar + sidebar).
 * White card, centered form (max-w-xl), label on left, input on right.
 *
 * Fields:
 *   Old Password    — label, input with eye toggle, no policy bar
 *   New Password *  — label, input with eye toggle, 4 policy segments below
 *   Confirm Password * — label, input with eye toggle, "Match the password" hint
 *
 * Buttons: Cancel (yellow) | Update (slate→navy when valid)
 *
 * Policy segments (4 in a row under New Password):
 *   No Space 8-20 | Capital Letter | Numeric | Special character
 *   Grey bar → turns green when rule passes
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { BtnYellow, BtnPrimary, BtnSlate } from '../../components/common/index.jsx'
import { toast } from 'react-toastify'

const POLICY = [
  { label: 'No Space 8-20',    test: p => p.length >= 8 && p.length <= 20 && !/\s/.test(p) },
  { label: 'Capital Letter',   test: p => /[A-Z]/.test(p) },
  { label: 'Numeric',          test: p => /[0-9]/.test(p) },
  { label: 'Special character',test: p => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]

const EyeInput = ({ value, onChange, placeholder, id }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative flex items-center">
      <input
        id={id} type={show ? 'text' : 'password'}
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || ''}
        className="w-full border border-[#CBD5E0] rounded-lg px-3 py-2.5 text-[13px]
                   text-[#1B3A6B] pr-10"
      />
      <button type="button" onClick={() => setShow(p => !p)}
        className="absolute right-3 text-[#A0AEC0] hover:text-[#1B3A6B]">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

const ChangePasswordPage = () => {
  const navigate = useNavigate()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')

  const policyResults = POLICY.map(r => ({ ...r, pass: r.test(newPwd) }))
  const allPass  = policyResults.every(r => r.pass)
  const matching = newPwd === confirm && confirm.length > 0
  const canSave  = oldPwd.trim() && allPass && matching

  const handleUpdate = () => {
    /* TODO: call PUT /api/auth/change-password */
    toast.success('Password updated successfully')
    navigate(-1)
  }

  return (
    <div>
      <h1 className="text-[40px] font-semibold text-[#0B39B5] mb-5">Change Password</h1>

      <div className="bg-white rounded-card shadow-card p-8 max-w-2xl">
        {/* Old Password */}
        <div className="flex items-center gap-6 mb-6">
          <label className="w-44 text-[13px] font-medium text-[#1B3A6B] shrink-0">
            Old Password
          </label>
          <div className="flex-1">
            <EyeInput value={oldPwd} onChange={setOldPwd} placeholder="••••••••••" id="old-pwd" />
          </div>
        </div>

        {/* New Password */}
        <div className="flex items-start gap-6 mb-6">
          <label className="w-44 text-[13px] font-medium text-[#1B3A6B] shrink-0 pt-2.5">
            New Password <span className="text-[#E74C3C]">*</span>
          </label>
          <div className="flex-1">
            <EyeInput value={newPwd} onChange={setNewPwd} placeholder="Enter new password" id="new-pwd" />
            {/* Policy segments */}
            <div className="flex items-center gap-1.5 mt-2">
              {policyResults.map((r, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className={`h-[3px] rounded-full mb-1 transition-colors
                    ${r.pass ? 'bg-[#00B894]' : 'bg-[#CBD5E0]'}`} />
                  <span className={`text-[10px] font-medium whitespace-nowrap
                    ${r.pass ? 'text-[#00B894]' : 'text-[#A0AEC0]'}`}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex items-start gap-6 mb-8">
          <label className="w-44 text-[13px] font-medium text-[#1B3A6B] shrink-0 pt-2.5">
            Confirm Password <span className="text-[#E74C3C]">*</span>
          </label>
          <div className="flex-1">
            <EyeInput value={confirm} onChange={setConfirm} placeholder="Re-enter Password" id="confirm-pwd" />
            <p className={`text-[11px] mt-1.5 ${matching ? 'text-[#00B894]' : 'text-[#A0AEC0]'}`}>
              {confirm.length === 0 ? 'Match the password' : matching ? '✓ Passwords match' : 'Passwords do not match'}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3">
          <BtnYellow onClick={() => navigate(-1)} className="w-32">Cancel</BtnYellow>
          {canSave
            ? <BtnPrimary onClick={handleUpdate} className="w-32">Update</BtnPrimary>
            : <BtnSlate disabled className="w-32">Update</BtnSlate>
          }
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPage
