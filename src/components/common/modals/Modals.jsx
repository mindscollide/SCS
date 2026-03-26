import { useState } from "react";
import { X } from "lucide-react";
import CommonTable from "../table/NormalTable";
import { ROLE_OPTIONS, STATUS_OPTIONS } from "..";
import Input from "../Input/Input";
import Select from "../select/Select";
/* ── View Groups Modal ──────────────────────────────── */
export const AdminViewGroupsModal = ({ user, onClose }) => {
  // Mock group data — replace with real API data
  // Each group is an array of up to 4 user names
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  const MOCK_GROUPS = [
    { id: 1, u1: "Humaid Afzal", u2: "Faheem Arif", u3: "", u4: "" },
    {
      id: 2,
      u1: "Humaid Afzal",
      u2: "Abdul Basit",
      u3: "Syed Wajahat",
      u4: "",
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[20px] font-bold text-[#0B39B5]">
            View User Groups
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-[#0B39B5] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Table ── */}
        <div className="px-6 pb-4">
          <CommonTable
            headerBg="#0B39B5"
            headerTextColor="#ffffff"
            rowBg="#F5F8FF"
            rowHoverBg="#EFF3FF"
            columns={[
              { key: "u1", title: "User Name", sortable: true },
              { key: "u2", title: "User Name", sortable: true },
              { key: "u3", title: "User Name", sortable: true },
              { key: "u4", title: "User Name", sortable: true },
            ]}
            data={[...MOCK_GROUPS].sort((a, b) => {
              if (!sortCol) return 0;
              const va = (a[sortCol] || "").toLowerCase();
              const vb = (b[sortCol] || "").toLowerCase();
              return sortDir === "asc"
                ? va.localeCompare(vb)
                : vb.localeCompare(va);
            })}
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={handleSort}
            emptyText="No groups found for this user."
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-center px-6 py-5">
          <button
            onClick={onClose}
            className="px-12 py-[10px] rounded-xl bg-[#F5A623] hover:bg-[#e09a1a]
                       text-[14px] font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Edit Modal ─────────────────────────────────────── */
export const AdminViewDetailEditModal = ({ user, onClose, onSave }) => {
  const [form, setForm] = useState({ ...user });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName?.trim()) e.fullName = "Required";
    if (!form.org?.trim()) e.org = "Required";
    if (!form.email?.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid email";
    if (!form.role) e.role = "Required";
    if (!form.status) e.status = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[1000]
                 flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[20px] font-bold text-[#0B39B5]">Edit</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-[#0B39B5] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-4">
          {/* Text inputs — User Name, Organization Name, Email ID */}
          {[
            { label: "User Name", k: "fullName", type: "text", maxLength: 100 },
            {
              label: "Organization Name",
              k: "org",
              type: "text",
              maxLength: 100,
            },
            { label: "Email ID", k: "email", type: "email", maxLength: 50 },
          ].map((f) => (
            <Input
              key={f.k}
              label={f.label}
              required
              type={f.type}
              maxLength={f.maxLength}
              value={form[f.k] || ""}
              onChange={(v) => set(f.k, v)}
              error={!!errors[f.k]}
              errorMessage={errors[f.k]}
              bgColor="#EFF3FF"
              borderColor="transparent"
              focusBorderColor="#01C9A4"
            />
          ))}

          {/* Role + Status — side by side */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Role", k: "role", options: ROLE_OPTIONS },
              { label: "Status", k: "status", options: STATUS_OPTIONS },
            ].map((f) => (
              <Select
                key={f.k}
                label={f.label}
                required
                value={form[f.k] || ""}
                onChange={(v) => set(f.k, v)}
                options={f.options}
                error={!!errors[f.k]}
                errorMessage={errors[f.k]}
                bgColor="#EFF3FF"
                borderColor="transparent"
                focusBorderColor="#01C9A4"
              />
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-center gap-3 px-6 py-4 border-t border-slate-100">
          {/* Update — blue */}
          <button
            onClick={() => validate() && onSave(form)}
            className="px-6 py-[9px] rounded-lg bg-[#0B39B5] hover:bg-[#0a2e94]
                       text-[13px] font-semibold text-white transition-colors"
          >
            Update
          </button>
          {/* Cancel — gold */}
          <button
            onClick={onClose}
            className="px-6 py-[9px] rounded-lg bg-[#F5A623] hover:bg-[#e09a1a]
                       text-[13px] font-semibold text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
