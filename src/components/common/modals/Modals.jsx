import React, { useState, useCallback } from "react";
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

/**
 * RequestActionModal
 * ===================
 * Reusable Approve / Decline modal for signup/action requests.
 * Displays a heading, info cards from the passed row, notes textarea,
 * suggestive reason chips, and Yes/No buttons.
 *
 * Props:
 *  row            {Object}    — data object to display in info cards
 *  type           {string}    — "approve" | "decline"
 *  onClose        {Function}  — called on No or backdrop click
 *  onSubmit       {Function}  — called with notes string on Yes
 *
 *  title          {string}    — modal heading
 *                               default: row.name + " has requested to sign up on SCS"
 *
 *  defaultNotes   {string}    — pre-filled textarea value
 *                               default: "Request Accepted" | "Request Declined"
 *
 *  infoFields     {Array}     — defines info cards shown below heading
 *                               [{ label: "First Name", value: "John" }]
 *                               OR [{ label: "First Name", key: "firstName" }]
 *                               — use `value` for computed/static values
 *                               — use `key` to read directly from `row`
 *
 *  approveReasons {string[]}  — suggestive chips for approve type
 *  declineReasons {string[]}  — suggestive chips for decline type
 *
 * Usage — Admin Pending Requests (signup):
 *  <RequestActionModal
 *    row={modal.request}
 *    type={modal.type}
 *    onClose={() => setModal(null)}
 *    onSubmit={handleSubmit}
 *    infoFields={[
 *      { label: "First Name",    value: request.name.split(" ")[0] },
 *      { label: "Last Name",     value: request.name.split(" ")[1] || "—" },
 *      { label: "Email",         key: "email" },
 *      { label: "Organization",  key: "org" },
 *      { label: "Role",          key: "role" },
 *      { label: "Mobile #",      key: "mobile" },
 *    ]}
 *  />
 *
 * Usage — Manager Pending Approvals (financial data):
 *  <RequestActionModal
 *    row={modal.row}
 *    type={modal.type}
 *    title={modal.type === "approve" ? "Approval" : "Reject"}
 *    defaultNotes={modal.type === "approve" ? "Approved" : "Declined"}
 *    onClose={() => setModal(null)}
 *    onSubmit={handleAction}
 *    infoFields={[
 *      { label: "Company",  key: "company" },
 *      { label: "Ticker",   key: "ticker"  },
 *      { label: "Quarter",  key: "quarter" },
 *      { label: "Sent By",  key: "sentBy"  },
 *    ]}
 *    approveReasons={["Data verified", "Calculations match"]}
 *    declineReasons={["Data mismatch", "Requires revision"]}
 *  />
 */

/** Default suggestive reasons — can be overridden via props */
const DEFAULT_REQUEST_APPROVE_REASONS = [
  "Details are verified",
  "All documents reviewed",
  "Background check passed",
];
const DEFAULT_REQUEST_DECLINE_REASONS = [
  "Details not verified",
  "Incomplete information",
  "Duplicate account",
];

export const RequestActionModal = ({
  row,
  type,
  onClose,
  onSubmit,
  title,
  defaultNotes,
  infoFields = [],
  approveReasons = DEFAULT_REQUEST_APPROVE_REASONS,
  declineReasons = DEFAULT_REQUEST_DECLINE_REASONS,
}) => {
  const isApprove = type === "approve";

  const [notes, setNotes] = useState(
    defaultNotes ?? (isApprove ? "Request Accepted" : "Request Declined"),
  );

  const appendReason = useCallback((r) => {
    setNotes((p) => (p ? `${p}\n${r}` : r));
  }, []);

  const hasNotes = notes.trim().length > 0;
  const reasons = isApprove ? approveReasons : declineReasons;

  /**
   * Resolve a field value — supports both `key` (read from row)
   * and `value` (static/computed, passed directly).
   */
  const resolveValue = (field) =>
    field.value !== undefined ? field.value : (row?.[field.key] ?? "—");

  /** Default title uses row.name if available */
  const heading =
    title ??
    (row?.name
      ? `${row.name} has requested to sign up on SCS`
      : isApprove
        ? "Approval"
        : "Reject");

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
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-[18px] font-bold text-[#0B39B5]">{heading}</h2>
        </div>

        <div className="px-6 pb-5">
          {/* ── Info cards (rendered from infoFields prop) ── */}
          {infoFields.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {infoFields.map((field, i) => (
                <div key={i} className="bg-[#e8faf6] rounded-xl px-4 py-3">
                  <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5">
                    {field.label}
                  </p>
                  <p className="text-[13px] text-[#041E66]">
                    {resolveValue(field)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Notes label + textarea ── */}
          <label className="block text-[14px] font-bold text-[#0B39B5] mb-2">
            Write Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            className="w-full border border-[#dde4ee] rounded-xl px-4 py-3
                       text-[13px] text-[#041E66] resize-none min-h-[90px]
                       focus:border-[#01C9A4] outline-none transition-all"
          />
          <p className="text-[11px] text-[#a0aec0] mt-1 text-right">
            {notes.length} / 500
          </p>

          {/* ── Suggestive reason chips ── */}
          <div className="flex flex-wrap gap-2 mt-2 mb-6">
            {reasons.map((r, i) => (
              <button
                key={i}
                onClick={() => appendReason(r)}
                className="px-3 py-1.5 bg-white border border-[#dde4ee] rounded-full
                           text-[12px] text-[#041E66] hover:bg-[#EFF3FF]
                           hover:border-[#0B39B5] transition-all"
              >
                {r}
              </button>
            ))}
          </div>

          {/* ── Yes / No buttons — disabled until notes provided ── */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => hasNotes && onSubmit(notes)}
              disabled={!hasNotes}
              className="px-10 py-[10px] rounded-lg bg-[#0B39B5] hover:bg-[#0a2e94]
                         text-[14px] font-semibold text-white
                         disabled:opacity-40 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={onClose}
              disabled={!hasNotes}
              className="px-10 py-[10px] rounded-lg bg-[#F5A623] hover:bg-[#e09a1a]
                         text-[14px] font-semibold text-white
                         disabled:opacity-40 transition-colors"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Formula component map for calculated classifications ──────────────────────
const FORMULA_COMPONENTS = {
  'Total Long-Term Finance':                    [{ label: 'Long-Term Finance', op: '-' },      { label: 'Islamic Finance (LT)', op: null }],
  'Total Assets':                               [{ label: 'Fixed Assets', op: '+' },           { label: 'Current Assets', op: null }],
  'Total Interest Bearing Long term Finance':   [{ label: 'Long-Term Finance', op: '-' },      { label: 'Islamic Finance (LT)', op: null }],
  'Total Short Term Finance':                   [{ label: 'Short Term Finance', op: '-' },     { label: 'Less: Islamic Finance (ST)', op: null }],
  'Non-compliant Investments':                  [{ label: 'Total Investments', op: '-' },      { label: 'Compliant Investments', op: null }],
  'Non-compliant Income':                       [{ label: 'Total Income', op: '-' },           { label: 'Compliant Income', op: null }],
}

// ── Inline View Formula Modal ─────────────────────────────────────────────────
export const FormulaModal = ({ item, onClose }) => {
  if (!item) return null;

  const typeLabel = item.calculated
    ? "Calculated Classification"
    : item.prorated
      ? "Prorated Classification"
      : "Classification";

  // For calculated: show component pills
  // For prorated: show base ÷ period pills
  // For regular: show single "Raw Input" pill
  const tokens = item.calculated
    ? FORMULA_COMPONENTS[item.name] || [{ label: item.name, op: null }]
    : item.prorated
      ? [
          { label: item.base, op: "÷" },
          { label: "Applicable Period", op: null },
        ]
      : [{ label: "Raw Financial Input", op: null }];

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-[20px] font-bold text-[#0B39B5]">{typeLabel}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {/* Classification name */}
          <p className="text-[16px] font-semibold text-[#041E66] mb-5">
            {item.name}
          </p>

          {/* Formula pill row */}
          <div className="flex flex-wrap items-center gap-2">
            {tokens.map((token, i) => (
              <React.Fragment key={i}>
                <span
                  className="px-4 py-2 rounded-lg border border-[#0B39B5] bg-white
                                 text-[13px] font-medium text-[#041E66] whitespace-nowrap"
                >
                  {token.label}
                </span>
                {token.op && (
                  <span className="text-[15px] font-bold text-[#041E66] px-1">
                    {token.op}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center px-6 py-5">
          <button
            onClick={onClose}
            className="px-16 py-[10px] bg-[#F5A623] hover:bg-[#e09a1a] text-white
                       rounded-xl text-[14px] font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
