/**
 * ManageUsersPage.jsx
 *
 * Search behaviour:
 * ─────────────────
 * 1. Main search input searches "User Name" field only
 * 2. Pressing Enter or clicking Search calls fetchData()
 * 3. Filter panel has per-field inputs
 * 4. When filter panel opens, any text in main input moves
 *    into the "User Name" filter field and main input clears
 * 5. Active filters shown as teal chips below the page heading
 * 6. Clicking X on a chip removes that filter and re-fetches
 * 7. Reset clears all filters and re-fetches
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Users,
  SquarePen,
  X,
  ChevronUp,
  ChevronDown,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "react-toastify";

/* ── Mock Data ──────────────────────────────────────── */
const ALL_USERS = [
  {
    id: 1,
    fullName: "Faheem Arif",
    org: "Al-Hilal Investments",
    email: "Faheem.arif@hilalinvest.com",
    role: "Manager",
    status: "Active",
  },
  {
    id: 2,
    fullName: "Humaid Afzal",
    org: "Al-Hilal Investments",
    email: "Humaid.afzal@hilalinvest.com",
    role: "Data Entry",
    status: "In-Active",
  },
  {
    id: 3,
    fullName: "Sara Ahmed",
    org: "Hilal Capital",
    email: "sara.ahmed@hilalcap.com",
    role: "Manager",
    status: "Active",
  },
  {
    id: 4,
    fullName: "Bilal Khan",
    org: "Al-Hilal Investments",
    email: "bilal.khan@hilalinvest.com",
    role: "Data Entry",
    status: "Active",
  },
  {
    id: 5,
    fullName: "James Smith",
    org: "Al-Hilal Investments",
    email: "james.smith@hilalinvest.com",
    role: "Admin",
    status: "Active",
  },
];

const ROLE_OPTIONS = ["Admin", "Manager", "Data Entry"];
const STATUS_OPTIONS = ["Active", "In-Active"];

/* Column definitions — key maps to user object fields */
const COLS = [
  { key: "fullName", label: "User Name" },
  { key: "org", label: "Organization Name" },
  { key: "email", label: "Email ID" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
];

const EMPTY_FILTERS = {
  fullName: "",
  org: "",
  email: "",
  role: "",
  status: "",
};

/* ── Sort icon ──────────────────────────────────────── */
const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col)
    return (
      <span className="inline-flex flex-col ml-1 opacity-40">
        <ChevronUp size={9} className="-mb-[2px]" />
        <ChevronDown size={9} className="-mt-[2px]" />
      </span>
    );
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="inline ml-1 text-[#01C9A4]" />
  ) : (
    <ChevronDown size={12} className="inline ml-1 text-[#01C9A4]" />
  );
};

/* ── View Groups Modal ──────────────────────────────── */
const ViewGroupsModal = ({ user, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-5"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.16)] w-full max-w-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7]">
        <span className="text-[15px] font-semibold text-[#0B39B5]">
          Groups — {user.fullName}
        </span>
        <button
          onClick={onClose}
          className="text-[#a0aec0] hover:text-[#0B39B5]"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-5">
        <p className="text-[13px] text-[#a0aec0] text-center py-4">
          This user is not assigned to any group yet.
        </p>
      </div>
      <div className="flex justify-end px-5 py-3 border-t border-[#eef2f7]">
        <button
          onClick={onClose}
          className="px-5 py-[9px] bg-[#0B39B5] text-white rounded-[8px] text-[13px] font-semibold hover:bg-[#0a2e94] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

/* ── Edit Modal ─────────────────────────────────────── */
const EditModal = ({ user, onClose, onSave }) => {
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
      className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.16)] w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7]">
          <span className="text-[15px] font-semibold text-[#0B39B5]">
            Edit User
          </span>
          <button
            onClick={onClose}
            className="text-[#a0aec0] hover:text-[#0B39B5]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: "User Name", k: "fullName", max: 100 },
            { label: "Organization Name", k: "org", max: 100 },
            { label: "Email ID", k: "email", max: 50, type: "email" },
          ].map((f) => (
            <div key={f.k}>
              <label className="block text-[12px] font-semibold text-[#0B39B5] mb-1">
                {f.label} <span className="text-red-500">*</span>
              </label>
              <input
                type={f.type || "text"}
                maxLength={f.max}
                value={form[f.k]}
                onChange={(e) => set(f.k, e.target.value)}
                className={`w-full px-3 py-[10px] rounded-[8px] border text-[13px] text-[#041E66]
                            outline-none focus:border-[#01C9A4] transition-all bg-white
                            ${errors[f.k] ? "border-red-400" : "border-[#dde4ee]"}`}
              />
              {errors[f.k] && (
                <p className="text-[11px] text-red-500 mt-1">{errors[f.k]}</p>
              )}
            </div>
          ))}
          {[
            { label: "Role", k: "role", options: ROLE_OPTIONS },
            { label: "Status", k: "status", options: STATUS_OPTIONS },
          ].map((f) => (
            <div key={f.k}>
              <label className="block text-[12px] font-semibold text-[#0B39B5] mb-1">
                {f.label} <span className="text-red-500">*</span>
              </label>
              <select
                value={form[f.k]}
                onChange={(e) => set(f.k, e.target.value)}
                className={`w-full px-3 py-[10px] rounded-[8px] border text-[13px] text-[#041E66]
                            outline-none focus:border-[#01C9A4] transition-all bg-white
                            ${errors[f.k] ? "border-red-400" : "border-[#dde4ee]"}`}
              >
                <option value="">-- Select --</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              {errors[f.k] && (
                <p className="text-[11px] text-red-500 mt-1">{errors[f.k]}</p>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#eef2f7]">
          <button
            onClick={onClose}
            className="px-5 py-[9px] border border-[#dde4ee] rounded-[8px] text-[13px] font-medium text-[#041E66] hover:bg-[#EFF3FF] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (validate()) onSave(form);
            }}
            className="px-5 py-[9px] bg-[#0B39B5] text-white rounded-[8px] text-[13px] font-semibold hover:bg-[#0a2e94] transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ───────────────────────────────────────── */
const ManageUsersPage = () => {
  const [users, setUsers] = useState(ALL_USERS);
  const [sortCol, setSortCol] = useState("fullName");
  const [sortDir, setSortDir] = useState("asc");
  const [editUser, setEditUser] = useState(null);
  const [groupUser, setGroupUser] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  /* Main search input (searches User Name only) */
  const [mainSearch, setMainSearch] = useState("");

  /* Filter panel inputs (per field) */
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  /* Applied filters — shown as chips, used for API call */
  const [applied, setApplied] = useState({});

  const filterRef = useRef(null);

  /* Close filter panel on outside click */
  useEffect(() => {
    const h = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target))
        setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Simulates API call with current applied filters ── */
  const fetchData = (appliedFilters) => {
    // TODO: replace with real API call
    // e.g. GET /api/admin/users?fullName=...&role=...
    const result = ALL_USERS.filter((u) =>
      Object.entries(appliedFilters).every(
        ([k, v]) => !v || u[k]?.toLowerCase().includes(v.toLowerCase()),
      ),
    );
    setUsers(result);
  };

  /* ── Open filter panel: move main search → fullName field ── */
  const handleOpenFilter = () => {
    if (mainSearch.trim()) {
      setFilters((p) => ({ ...p, fullName: mainSearch.trim() }));
      setMainSearch("");
    }
    setShowFilter(true);
  };

  /* ── Main search: Enter key or Search button ── */
  const handleMainSearch = () => {
    const newApplied = { ...applied, fullName: mainSearch.trim() };
    if (!mainSearch.trim()) delete newApplied.fullName;
    setApplied(newApplied);
    fetchData(newApplied);
    setMainSearch("");
  };

  /* ── Filter panel Search button ── */
  const handleFilterSearch = () => {
    const newApplied = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) newApplied[k] = v.trim();
    });
    setApplied(newApplied);
    fetchData(newApplied);
    setFilters(EMPTY_FILTERS);
    setShowFilter(false);
  };

  /* ── Filter panel Reset button ── */
  const handleFilterReset = () => {
    setFilters(EMPTY_FILTERS);
    setMainSearch("");
    setApplied({});
    fetchData({});
    setShowFilter(false);
  };

  /* ── Remove a single chip ── */
  const removeChip = (key) => {
    const newApplied = { ...applied };
    delete newApplied[key];
    setApplied(newApplied);
    setFilters((p) => ({ ...p, [key]: "" }));
    fetchData(newApplied);
  };

  /* ── Sort ── */
  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  /* ── Client-side sort (API already filtered) ── */
  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        const va = (a[sortCol] || "").toLowerCase();
        const vb = (b[sortCol] || "").toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }),
    [users, sortCol, sortDir],
  );

  const handleSave = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    toast.success("Updated Successfully");
    setEditUser(null);
  };

  /* Active chip labels */
  const chipLabel = (key) => COLS.find((c) => c.key === key)?.label || key;

  return (
    <div className="font-sans">
      {/* ── Page heading + search bar ── */}
      <div className="flex items-center justify-between mb-3 gap-4">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">View Details</h1>

        {/* Search bar row */}
        <div className="flex items-center gap-2" ref={filterRef}>
          {/* Main input */}
          <div
            className="flex items-center bg-white border border-[#dde4ee] rounded-[8px]
                          px-3 py-[8px] gap-2 min-w-[220px]
                          focus-within:border-[#01C9A4]
                          focus-within:shadow-[0_0_0_3px_rgba(1,201,164,0.12)]
                          transition-all duration-150"
          >
            <Search size={15} className="text-[#a0aec0] shrink-0" />
            <input
              value={mainSearch}
              onChange={(e) => setMainSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleMainSearch()}
              placeholder="Search by name"
              className="flex-1 border-none outline-none bg-transparent text-[13px]
                         text-[#041E66] placeholder:text-[#a0aec0]"
            />
          </div>

          {/* Filter icon */}
          <div className="relative">
            <button
              onClick={handleOpenFilter}
              className="w-9 h-9 flex items-center justify-center rounded-[8px]
                         bg-[#041E66] text-white hover:bg-[#0B39B5] transition-colors shrink-0"
            >
              <SlidersHorizontal size={16} />
            </button>

            {/* Filter dropdown panel */}
            {showFilter && (
              <div
                className="absolute top-[calc(100%+6px)] right-0 w-[280px] bg-white
                              border border-[#dde4ee] rounded-[12px]
                              shadow-[0_4px_16px_rgba(0,0,0,0.12)] z-50 p-4"
              >
                <p className="text-[12px] font-semibold text-[#0B39B5] mb-3">
                  Filter Options
                </p>
                {COLS.map((col) => (
                  <div key={col.key} className="mb-3">
                    <label className="block text-[11px] font-medium text-[#a0aec0] mb-1">
                      {col.label}
                    </label>
                    {col.key === "role" ? (
                      <select
                        value={filters.role}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, role: e.target.value }))
                        }
                        className="w-full px-2.5 py-[7px] rounded-[6px] border border-[#dde4ee]
                                   text-[12px] text-[#041E66] outline-none
                                   focus:border-[#01C9A4] transition-all bg-white"
                      >
                        <option value="">All Roles</option>
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    ) : col.key === "status" ? (
                      <select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, status: e.target.value }))
                        }
                        className="w-full px-2.5 py-[7px] rounded-[6px] border border-[#dde4ee]
                                   text-[12px] text-[#041E66] outline-none
                                   focus:border-[#01C9A4] transition-all bg-white"
                      >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={filters[col.key]}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            [col.key]: e.target.value,
                          }))
                        }
                        placeholder={`Search ${col.label}`}
                        className="w-full px-2.5 py-[7px] rounded-[6px] border border-[#dde4ee]
                                   text-[12px] text-[#041E66] outline-none
                                   focus:border-[#01C9A4] transition-all"
                      />
                    )}
                  </div>
                ))}

                {/* Buttons */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleFilterSearch}
                    className="flex-1 py-[8px] rounded-[8px] text-[13px] font-semibold
                               text-white bg-[#F5A623] hover:bg-[#e09a1a] transition-colors"
                  >
                    Search
                  </button>
                  <button
                    onClick={handleFilterReset}
                    className="flex-1 py-[8px] rounded-[8px] text-[13px] font-semibold
                               text-white bg-[#1a3fb5] hover:bg-[#152f8a] transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {Object.keys(applied).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(applied).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                         text-[12px] font-medium text-white bg-[#01C9A4]"
            >
              {chipLabel(k)}: {v}
              <button
                onClick={() => removeChip(k)}
                className="hover:text-white/70 transition-colors"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#EFF3FF] border-b border-[#dde4ee]">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-[12px] font-semibold text-[#6b7a99]
                               whitespace-nowrap cursor-pointer hover:text-[#0B39B5]
                               select-none transition-colors"
                  >
                    {col.label}
                    <SortIcon
                      col={col.key}
                      sortCol={sortCol}
                      sortDir={sortDir}
                    />
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6b7a99]">
                  Groups
                </th>
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-[#6b7a99]">
                  Edit
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-14 text-[13px] text-[#a0aec0]"
                  >
                    No Record Found
                  </td>
                </tr>
              ) : (
                sorted.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[#eef2f7] hover:bg-[#f8fafc] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#041E66] font-medium">
                      {u.fullName}
                    </td>
                    <td className="px-4 py-3 text-[#041E66]">{u.org}</td>
                    <td className="px-4 py-3 text-[#041E66]">{u.email}</td>
                    <td className="px-4 py-3 text-[#041E66]">{u.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[13px] font-semibold
                      ${u.status === "Active" ? "text-[#01C9A4]" : "text-[#E8923A]"}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setGroupUser(u)}
                        className="text-[#F5A623] hover:bg-[#fff8ed] rounded-[6px] p-1.5 transition-colors"
                        title="View Groups"
                      >
                        <Users size={18} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditUser(u)}
                        className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded-[6px] p-1.5 transition-colors"
                        title="Edit"
                      >
                        <SquarePen size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {groupUser && (
        <ViewGroupsModal user={groupUser} onClose={() => setGroupUser(null)} />
      )}
      {editUser && (
        <EditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManageUsersPage;
