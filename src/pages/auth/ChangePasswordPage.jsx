/**
 * src/pages/auth/ChangePasswordPage.jsx
 * =======================================
 * Change password page — inside-app (uses AppLayout — has sidebar + topbar).
 * Route: /scs/change-password
 *
 * Design:
 *  - Page title "Change Password" large navy
 *  - White card, label-left / input-right layout
 *  - Old Password   (eye toggle)
 *  - New Password * (eye toggle + 4-segment policy bar below)
 *  - Confirm Password * (eye toggle + "Match the password" hint)
 *  - Buttons: Cancel (gold) | Update (disabled → blue when valid)
 *
 * Reusable Components Used
 * ─────────────────────────
 * - Input → src/components/common/Input.jsx
 *   Props: type, value, onChange, placeholder, maxLength,
 *          rightIcon, onRightIconClick, bgColor, borderColor,
 *          focusBorderColor, textColor
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'react-toastify'
import Input from '../../components/common/Input/Input'
import {
  changePasswordApi,
  CHANGE_PASSWORD_CODES,
  logoutApi,
} from '../../services/auth.service'
import { BtnPrimary, BtnGold } from '../../components/common'

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD POLICY RULES
// ─────────────────────────────────────────────────────────────────────────────

const POLICY = [
  {
    label: 'No Space 8-20',
    test: (p) => p.length >= 8 && p.length <= 20 && !/\s/.test(p),
  },
  { label: 'Capital Letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Numeric', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p) => /[!@#$%^&*]/.test(p) },
]

/** Shared style props for all password inputs in this page */
const INPUT_STYLE = {
  bgColor: '#ffffff',
  borderColor: '#d8e0ea',
  focusBorderColor: '#01C9A4',
  textColor: '#041E66',
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD INPUT — wraps reusable Input with show/hide eye toggle
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Local wrapper that manages show/hide state and wires
 * the eye icon into the reusable Input's rightIcon prop.
 *
 * Props:
 *  value       {string}
 *  onChange    {Function}
 *  placeholder {string}
 */
const PasswordInput = ({ value, onChange, placeholder, disabled }) => {
  const [show, setShow] = useState(false)
  return (
    <Input
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={20}
      rightIcon={show ? <Eye size={16} /> : <EyeOff size={16} />}
      onRightIconClick={() => setShow((p) => !p)}
      disabled={disabled}
      {...INPUT_STYLE}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ChangePasswordPage = () => {
  const navigate = useNavigate()

  // ── Form state ────────────────────────────────────────────────────────────
  const [old, setOld] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')

  // ── Loading state ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)

  // ── Policy evaluation ─────────────────────────────────────────────────────
  /** Each rule evaluated against current newPwd value */
  const policyResults = POLICY.map((r) => ({ ...r, ok: r.test(newPwd) }))
  const allPass = policyResults.every((r) => r.ok)
  const matches = newPwd === confirm && confirm.length > 0
  const canSave = old.length > 0 && allPass && matches

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!canSave || loading) return

    setLoading(true)

    const result = await changePasswordApi({
      OldPassword:     old,
      NewPassword:     newPwd,
      ConfirmPassword: confirm,
    })

    setLoading(false)

    if (!result.success) {
      toast.error(result.message || 'Something went wrong, please try again.', {
        style:         { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === 'ERM_Auth_AuthServiceManager_ChangePassword_06') {
      // Success — notify, log out, redirect to login
      toast.success('Password changed successfully. Please log in again.')
      logoutApi().catch(() => {})          // fire-and-forget; don't block redirect
      sessionStorage.clear()
      navigate('/login', { replace: true })
    } else {
      const msg =
        CHANGE_PASSWORD_CODES[code] ||
        result.message ||
        'Something went wrong, please try again.'
      toast.error(msg, {
        style:         { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      // Highlight old-password field on incorrect password error
      if (code === 'ERM_Auth_AuthServiceManager_ChangePassword_04') {
        setOld('')
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* ── Page heading ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Change Password</h1>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        <div className=" rounded-xl p-8 max-w-2xl  ">
          {/* ── Old Password ── */}
          <div className="flex items-start gap-4 mb-6">
            <label className="w-[180px] pt-[10px] text-[13px] font-medium text-[#041E66] shrink-0">
              Old Password
            </label>
            <div className="flex-1">
              <PasswordInput value={old} onChange={setOld} placeholder="••••••••••" disabled={loading} />
            </div>
          </div>

          {/* ── New Password + policy bar ── */}
          <div className="flex items-start gap-4 mb-6">
            <label className="w-[180px] pt-[10px] text-[13px] font-medium text-[#041E66] shrink-0">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="flex-1">
              <PasswordInput value={newPwd} onChange={setNewPwd} placeholder="Enter new password" disabled={loading} />
              {/*
               * 4-segment policy indicator
               * Each segment: thin bar + label below
               * Turns teal when its rule passes
               */}
              <div className="flex gap-1 mt-2">
                {policyResults.map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {/* Indicator bar */}
                    <div
                      className={`h-1 w-full rounded-full transition-colors duration-200
                                  ${r.ok ? 'bg-[#01C9A4]' : 'bg-[#d8e0ea]'}`}
                    />
                    {/* Rule label */}
                    <span
                      className={`text-[10px] font-medium text-center leading-tight
                                  transition-colors duration-200
                                  ${r.ok ? 'text-[#01C9A4]' : 'text-[#a0aec0]'}`}
                    >
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Confirm Password + match hint ── */}
          <div className="flex items-start gap-4 mb-8">
            <label className="w-[180px] pt-[10px] text-[13px] font-medium text-[#041E66] shrink-0">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="flex-1">
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter Password"
                disabled={loading}
              />
              {/* Password match hint — turns teal when passwords match */}
              <p
                className={`text-[11px] mt-1 text-center transition-colors duration-200
                            ${matches ? 'text-[#01C9A4]' : 'text-[#a0aec0]'}`}
              >
                {confirm.length > 0 && !matches ? 'Passwords do not match' : 'Match the password'}
              </p>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex justify-center gap-3">
            <BtnGold    size="lg" disabled={loading} onClick={() => navigate(-1)}>Cancel</BtnGold>
            <BtnPrimary size="lg" loading={loading} disabled={!canSave || loading} onClick={handleUpdate}>
              Update
            </BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordPage
