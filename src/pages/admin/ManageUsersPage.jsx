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
import { Users, SquarePen, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  AdminViewDetailEditModal,
  AdminViewGroupsModal,
} from "../../components/common/Modals/Modals";
import CommonTable from "../../components/common/table/NormalTable";
import SearchFilter from "../../components/common/searchFilter/SearchFilter";

/* ── Mock Data ──────────────────────────────────────── */
const ALL_USERS = [
  {
    id: 1,
    userName: "Faheem Arif",
    org: "Al-Hilal Investments",
    email: "Faheem.arif@hilalinvest.com",
    role: "Manager",
    status: "Active",
  },
  {
    id: 2,
    userName: "Humaid Afzal",
    org: "Al-Hilal Investments",
    email: "Humaid.afzal@hilalinvest.com",
    role: "Data Entry",
    status: "In-Active",
  },
  {
    id: 3,
    userName: "Sara Ahmed",
    org: "Hilal Capital",
    email: "sara.ahmed@hilalcap.com",
    role: "Manager",
    status: "Active",
  },
  {
    id: 4,
    userName: "Bilal Khan",
    org: "Al-Hilal Investments",
    email: "bilal.khan@hilalinvest.com",
    role: "Data Entry",
    status: "Active",
  },
  {
    id: 5,
    userName: "James Smith",
    org: "Al-Hilal Investments",
    email: "james.smith@hilalinvest.com",
    role: "Admin",
    status: "Active",
  },
];

/* Column definitions — key maps to user object fields */
const COLS = [
  { key: "userName", label: "User Name" },
  { key: "org", label: "Organization Name" },
  { key: "email", label: "Email ID" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
];

const EMPTY_FILTERS = {
  userName: "",
  org: "",
  email: "",
  role: "",
  status: "",
};

/* ── Main Page ───────────────────────────────────────── */
const ManageUsersPage = () => {
  const [users, setUsers] = useState(ALL_USERS);
  const [sortCol, setSortCol] = useState("userName");
  const [sortDir, setSortDir] = useState("asc");
  const [editUser, setEditUser] = useState(null);
  const [groupUser, setGroupUser] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  /* Single unified filter state — main search updates userName */
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const mainSearch = filters.userName;
  const setMainSearch = (val) => setFilters((p) => ({ ...p, userName: val }));

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
    // e.g. GET /api/admin/users?userName=...&role=...
    const result = ALL_USERS.filter((u) =>
      Object.entries(appliedFilters).every(
        ([k, v]) => !v || u[k]?.toLowerCase().includes(v.toLowerCase()),
      ),
    );
    setUsers(result);
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

  /* ── Filter panel closed without action → clear filter fields only ── */
  const handleFilterClose = () => {
    setFilters(EMPTY_FILTERS);
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

  const COLS = [
    { key: "userName", title: "User Name", sortable: true },
    { key: "org", title: "Organization Name", sortable: true },
    { key: "email", title: "Email ID", sortable: true },
    { key: "role", title: "Role", sortable: true },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <span
          className={`font-semibold ${
            row.status === "Active" ? "text-[#01C9A4]" : "text-[#E8923A]"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "groups",
      title: "Groups",
      render: (row) => (
        <button
          onClick={() => setGroupUser(row)}
          className="text-[#F5A623] hover:bg-[#fff8ed] rounded p-1.5"
        >
          <Users size={18} />
        </button>
      ),
    },
    {
      key: "edit",
      title: "Edit",
      render: (row) => (
        <button
          onClick={() => setEditUser(row)}
          className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5"
        >
          <SquarePen size={18} />
        </button>
      ),
    },
  ];

  const fields = [
    {
      key: "userName",
      label: "User Name",
      type: "input",
      regex: /^[a-zA-Z\s]*$/,
      maxLength: 50,
    },
    { key: "org", label: "Organization Name", type: "input", maxLength: 50 },
    {
      key: "email",
      label: "Email ID",
      type: "input",
      regex: /^[^\s]*$/,
      maxLength: 50,
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: ["Admin", "Manager", "Data Entry"],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "In-Active"],
    },
  ];

  return (
    <div className="font-sans">
      {/* ── Page heading + search bar ── */}
      <div className=" bg-[#EFF3FF] rounded-xl p-2 mb-2  border border-slate-200">
        <div className="flex items-center justify-between  gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">
            View Details
          </h1>

          {/* Search bar row */}
          <SearchFilter
            placeholder="Search users..."
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            filters={filters}
            setFilters={setFilters}
            fields={fields}
            showFilterPanel={true}
            onSearch={handleFilterSearch}
            onReset={handleFilterReset}
            onFilterClose={handleFilterClose}
          />
        </div>
      </div>

      <div className=" bg-[#EFF3FF] rounded-xl p-5 mb-5 ">
        {/* ── Active filter chips ── */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
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
            {/* Clear All — only shown when more than 1 chip */}
            {Object.keys(applied).length > 1 && (
              <button
                onClick={handleFilterReset}
                className="text-[12px] font-semibold text-[#E8923A] hover:underline ml-1"
              >
                Clear All
              </button>
            )}
          </div>
        )}
        {/* ── Table ── */}
        <CommonTable
          columns={COLS}
          data={sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {groupUser && (
        <AdminViewGroupsModal user={groupUser} onClose={() => setGroupUser(null)} />
      )}
      {editUser && (
        <AdminViewDetailEditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ManageUsersPage;
