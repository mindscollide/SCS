import { useState } from "react";
import {
  X,
} from "lucide-react";
import { ROLE_OPTIONS, STATUS_OPTIONS } from "..";
/* ── View Groups Modal ──────────────────────────────── */
export const ViewGroupsModal = ({ user, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center p-5"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#F8FAFC]">
        <h2 className="text-[15px] font-semibold text-[#0B39B5]">
          Groups — <span className="text-slate-700">{user.fullName}</span>
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-[#0B39B5] transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 text-center">
        <div className="text-slate-300 text-4xl mb-2">👥</div>
        <p className="text-[13px] text-slate-500">
          This user is not assigned to any group yet.
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-end px-5 py-3 border-t border-slate-200 bg-[#F8FAFC]">
        <button
          onClick={onClose}
          className="px-5 py-2 bg-[#0B39B5] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0a2e94] transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

/* ── Edit Modal ─────────────────────────────────────── */
export const EditModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ ...user });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.org.trim()) e.org = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email";
    if (!form.role) e.role = "Required";
    if (!form.status) e.status = "Required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#F8FAFC]">
          <h2 className="text-[15px] font-semibold text-[#0B39B5]">
            Edit User
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-[#0B39B5]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {[
            { label: "User Name", k: "fullName" },
            { label: "Organization Name", k: "org" },
            { label: "Email ID", k: "email", type: "email" },
          ].map((f) => (
            <div key={f.k}>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">
                {f.label} <span className="text-red-500">*</span>
              </label>
              <input
                type={f.type || "text"}
                value={form[f.k]}
                onChange={(e) => set(f.k, e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-[13px]
                  focus:border-[#01C9A4] outline-none transition
                  ${errors[f.k] ? "border-red-400" : "border-slate-300"}`}
              />
              {errors[f.k] && (
                <p className="text-[11px] text-red-500 mt-1">{errors[f.k]}</p>
              )}
            </div>
          ))}

          {/* Selects */}
          {[
            { label: "Role", k: "role", options: ROLE_OPTIONS },
            { label: "Status", k: "status", options: STATUS_OPTIONS },
          ].map((f) => (
            <div key={f.k}>
              <label className="block text-[12px] font-medium text-slate-600 mb-1">
                {f.label} <span className="text-red-500">*</span>
              </label>
              <select
                value={form[f.k]}
                onChange={(e) => set(f.k, e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-[13px]
                  focus:border-[#01C9A4] outline-none transition
                  ${errors[f.k] ? "border-red-400" : "border-slate-300"}`}
              >
                <option value="">-- Select --</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-[#F8FAFC]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-[13px] text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => validate() && onSave(form)}
            className="px-4 py-2 rounded-lg bg-[#0B39B5] text-white text-[13px] font-semibold hover:bg-[#0a2e94]"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};
