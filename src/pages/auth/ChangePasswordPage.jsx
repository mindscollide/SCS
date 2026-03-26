/**
 * ChangePasswordPage.jsx
 * =======================
 * Inside-app page (uses AppLayout — has sidebar + topbar).
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

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import Input from "../../components/common/Input/Input";

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD POLICY RULES
// ─────────────────────────────────────────────────────────────────────────────

const POLICY = [
  {
    label: "No Space 8-20",
    test: (p) => p.length >= 8 && p.length <= 20 && !/\s/.test(p),
  },
  { label: "Capital Letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Numeric", test: (p) => /[0-9]/.test(p) },
  { label: "Special character", test: (p) => /[!@#$%^&*]/.test(p) },
];

/** Shared style props for all password inputs in this page */
const INPUT_STYLE = {
  bgColor: "#ffffff",
  borderColor: "#d8e0ea",
  focusBorderColor: "#01C9A4",
  textColor: "#041E66",
};

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
const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <Input
      type={show ? "text" : "password"}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={20}
      rightIcon={show ? <Eye size={16} /> : <EyeOff size={16} />}
      onRightIconClick={() => setShow((p) => !p)}
      {...INPUT_STYLE}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ChangePasswordPage = () => {
  const navigate = useNavigate();

  // ── Form state ────────────────────────────────────────────────────────────
  const [old, setOld] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");

  // ── Policy evaluation ─────────────────────────────────────────────────────
  /** Each rule evaluated against current newPwd value */
  const policyResults = POLICY.map((r) => ({ ...r, ok: r.test(newPwd) }));
  const allPass = policyResults.every((r) => r.ok);
  const matches = newPwd === confirm && confirm.length > 0;
  const canSave = old && allPass && matches;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleUpdate = () => {
    if (!canSave) return;
    // TODO: PUT /api/auth/change-password { old, newPwd }
    toast.success("Password updated successfully");
    navigate(-1);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* ── Page heading ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">
          Change Password
        </h1>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        <div className=" rounded-xl p-8 max-w-2xl  ">
          {/* ── Old Password ── */}
          <div className="flex items-start gap-4 mb-6">
            <label className="w-[180px] pt-[10px] text-[13px] font-medium text-[#041E66] shrink-0">
              Old Password
            </label>
            <div className="flex-1">
              <PasswordInput
                value={old}
                onChange={setOld}
                placeholder="••••••••••"
              />
            </div>
          </div>

          {/* ── New Password + policy bar ── */}
          <div className="flex items-start gap-4 mb-6">
            <label className="w-[180px] pt-[10px] text-[13px] font-medium text-[#041E66] shrink-0">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="flex-1">
              <PasswordInput
                value={newPwd}
                onChange={setNewPwd}
                placeholder="Enter new password"
              />
              {/*
               * 4-segment policy indicator
               * Each segment: thin bar + label below
               * Turns teal when its rule passes
               */}
              <div className="flex gap-1 mt-2">
                {policyResults.map((r, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    {/* Indicator bar */}
                    <div
                      className={`h-1 w-full rounded-full transition-colors duration-200
                                  ${r.ok ? "bg-[#01C9A4]" : "bg-[#d8e0ea]"}`}
                    />
                    {/* Rule label */}
                    <span
                      className={`text-[10px] font-medium text-center leading-tight
                                  transition-colors duration-200
                                  ${r.ok ? "text-[#01C9A4]" : "text-[#a0aec0]"}`}
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
              />
              {/* Password match hint — turns teal when passwords match */}
              <p
                className={`text-[11px] mt-1 text-center transition-colors duration-200
                            ${matches ? "text-[#01C9A4]" : "text-[#a0aec0]"}`}
              >
                {confirm.length > 0 && !matches
                  ? "Passwords do not match"
                  : "Match the password"}
              </p>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="flex justify-center gap-3">
            {/* Cancel — gold */}
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-[9px] rounded-lg bg-[#F5A623] hover:bg-[#e09a1a]
                         text-[13px] font-semibold text-white transition-colors"
            >
              Cancel
            </button>
            {/* Update — blue when valid, muted when not */}
            <button
              onClick={handleUpdate}
              disabled={!canSave}
              className={`px-8 py-[9px] rounded-lg text-[13px] font-semibold text-white
                          transition-colors
                          ${
                            canSave
                              ? "bg-[#0B39B5] hover:bg-[#0a2e94] cursor-pointer"
                              : "bg-[#a0aec0] cursor-not-allowed"
                          }`}
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
