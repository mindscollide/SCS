/**
 * PendingRequestsPage.jsx
 * ========================
 * Admin reviews and acts on signup requests.
 *
 * Business Rules (SRS)
 * ─────────────────────
 * - Green tick → Approve modal (default notes: "Request Accepted")
 * - Red cross  → Decline modal (default notes: "Request Declined")
 * - Suggestive reasons append to notes (don't replace)
 * - Submit disabled when notes is empty
 * - On Submit: remove row, show toast, close modal
 * - Default sort: Name A→Z
 * - Sortable: Name, Organization, Email, Role, Mobile #, Sent On
 * - Searchable: Name, Organization, Email, Role, Mobile #, Sent On
 * - Main search placeholder: "Name" — filter icon opens more options
 *
 * TODO
 * ─────
 * - GET  /api/admin/pending-requests → replace MOCK_PENDING_REQUESTS
 * - POST /api/admin/approve-request  → replace local remove in handleSubmit
 * - POST /api/admin/decline-request  → replace local remove in handleSubmit
 * - Send email to requestee on approve/decline
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { toast } from "react-toastify";
import SearchFilter from "../../components/common/searchFilter/SearchFilter";
import CommonTable from "../../components/common/table/NormalTable";
import { RequestActionModal } from "../../components/common/Modals/Modals";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — replace with API call
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PENDING_REQUESTS = [
  {
    id: 1,
    name: "John Doe",
    org: "Hilal invest",
    email: "John@hilalinvest.com",
    mobile: "+92 123 456 7879",
    role: "Data Entry",
    sentOn: "October 25, 2025",
  },
  {
    id: 2,
    name: "Sara Khan",
    org: "Al-Hilal Investments",
    email: "sara@hilalinvest.com",
    mobile: "+92 300 111 2222",
    role: "Manager",
    sentOn: "October 26, 2025",
  },
  {
    id: 3,
    name: "Ahmed Ali",
    org: "Hilal Capital",
    email: "ahmed@hilalcap.com",
    mobile: "+92 333 444 5555",
    role: "Data Entry",
    sentOn: "October 27, 2025",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS — outside component to prevent re-creation on render
// ─────────────────────────────────────────────────────────────────────────────

/** Suggestive reasons shown in Approve modal */
const APPROVE_REASONS = [
  "Details are verified",
  "All documents reviewed",
  "Background check passed",
];

/** Suggestive reasons shown in Decline modal */
const DECLINE_REASONS = [
  "Details not verified",
  "Incomplete information",
  "Duplicate account",
];

const EMPTY_FILTERS = {
  name: "",
  org: "",
  email: "",
  role: "",
  mobile: "",
  sentOn: "",
};

/** Maps filter/chip keys to human-readable labels */
const CHIP_LABELS = {
  name: "Name",
  org: "Organization",
  email: "Email",
  role: "Role",
  mobile: "Mobile #",
  sentOn: "Sent On",
};

/** SearchFilter panel field config */
const FILTER_FIELDS = [
  { key: "name", label: "Name", type: "input", maxLength: 50 },
  { key: "org", label: "Organization", type: "input", maxLength: 50 },
  { key: "email", label: "Email", type: "input", maxLength: 50 },
  {
    key: "role",
    label: "Role",
    type: "select",
    options: ["Data Entry", "Manager", "Admin"],
  },
  { key: "mobile", label: "Mobile #", type: "input", maxLength: 20 },
  { key: "sentOn", label: "Sent On", type: "date" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const PendingRequestsPage = () => {
  // ── Source of truth for requests ────────────────────────────────────────
  const sourceRequests = useRef(MOCK_PENDING_REQUESTS);
  const [requests, setRequests] = useState(MOCK_PENDING_REQUESTS);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null); // { request, type: 'approve' | 'decline' }

  // ── Unified filter state: mainSearch = filters.name ─────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState({});

  const mainSearch = filters.name;
  const setMainSearch = useCallback(
    (val) => setFilters((p) => ({ ...p, name: val })),
    [],
  );

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Filter sourceRequests by given criteria.
   * TODO: replace with API call GET /api/admin/pending-requests?name=...
   */
  const fetchData = useCallback((f) => {
    setRequests(
      sourceRequests.current.filter((r) =>
        Object.entries(f).every(
          ([k, v]) => !v || r[k]?.toLowerCase().includes(v.toLowerCase()),
        ),
      ),
    );
  }, []);

  const handleSearch = useCallback(() => {
    const next = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim();
    });
    setApplied(next);
    fetchData(next);
    setFilters(EMPTY_FILTERS);
  }, [filters, fetchData]);

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setApplied({});
    fetchData({});
  }, [fetchData]);

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const next = { ...prev };
        delete next[key];
        fetchData(next);
        return next;
      });
    },
    [fetchData],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SORT
  // ─────────────────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (col) => {
      setSortCol((prev) => {
        if (prev !== col) setSortDir("asc");
        return col;
      });
      setSortDir((prev) =>
        sortCol === col ? (prev === "asc" ? "desc" : "asc") : "asc",
      );
    },
    [sortCol],
  );

  const sorted = useMemo(
    () =>
      [...requests].sort((a, b) => {
        const va = (a[sortCol] || "").toLowerCase();
        const vb = (b[sortCol] || "").toLowerCase();
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }),
    [requests, sortCol, sortDir],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (notes) => {
      const { request, type } = modal;
      // TODO: POST /api/admin/approve-request or POST /api/admin/decline-request
      sourceRequests.current = sourceRequests.current.filter(
        (r) => r.id !== request.id,
      );
      setRequests(sourceRequests.current);
      toast.success(
        `${request.name} request has been ${type === "approve" ? "Approved ✅" : "Declined ❌"}`,
      );
      setModal(null);
    },
    [modal],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS — memoized for stable reference
  // ─────────────────────────────────────────────────────────────────────────

  const TABLE_COLS = useMemo(
    () => [
      {
        key: "name",
        title: "Name",
        sortable: true,
        render: (row) => (
          <span className="font-semibold text-[#041E66]">{row.name}</span>
        ),
      },
      { key: "org", title: "Organization", sortable: true },
      { key: "email", title: "Email", sortable: true },
      { key: "mobile", title: "Mobile #", sortable: true },
      {
        key: "role",
        title: "Role",
        sortable: true,
        render: (row) => (
          <span
            className="bg-blue-100 text-[#0B39B5] px-2.5 py-0.5
                         rounded-full text-[11px] font-semibold"
          >
            {row.role}
          </span>
        ),
      },
      { key: "sentOn", title: "Sent On", sortable: true },
      {
        key: "actions",
        title: "Actions",
        render: (row) => (
          <div className="flex items-center gap-2">
            {/* Approve — green tick */}
            <button
              onClick={() => setModal({ request: row, type: "approve" })}
              className="text-emerald-500 hover:text-emerald-600 transition-colors"
              title="Approve"
            >
              <CheckCircle size={20} />
            </button>
            {/* Decline — red cross */}
            <button
              onClick={() => setModal({ request: row, type: "decline" })}
              className="text-red-500 hover:text-red-600 transition-colors"
              title="Decline"
            >
              <XCircle size={20} />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">
            Pending Requests
          </h1>
          <SearchFilter
            placeholder="Search by name..."
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
          />
        </div>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        {/* ── Active filter chips ── */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k] || k}: {v}
                <button
                  onClick={() => removeChip(k)}
                  className="hover:text-white/70 transition-colors"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            {Object.keys(applied).length > 1 && (
              <button
                onClick={handleReset}
                className="text-[12px] font-semibold text-[#E8923A] hover:underline ml-1"
              >
                Clear All
              </button>
            )}
          </div>
        )}

        {/* ── Requests table ── */}
        <CommonTable
          columns={TABLE_COLS}
          data={sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Pending Requests"
        />
      </div>

      {/* ── Approve / Decline modal ── */}
      {modal && (
        <RequestActionModal
          row={modal.request}
          type={modal.type}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          infoFields={[
            { label: "First Name", value: modal.request.name.split(" ")[0] },
            {
              label: "Last Name",
              value: modal.request.name.split(" ")[1] || "—",
            },
            { label: "Email", key: "email" },
            { label: "Organization", key: "org" },
            { label: "Role", key: "role" },
            { label: "Mobile #", key: "mobile" },
          ]}
        />
      )}
    </div>
  );
};

export default PendingRequestsPage;
