/**
 * pages/manager/FinancialRatiosPage.jsx
 * ========================================
 * Manager configures Financial Ratios via a 2-step wizard.
 *
 * Views: 'list' → 'step1' → 'step2'
 *
 * List View
 * ─────────
 * - "Add Financial Ratio" button
 * - Ratios shown as collapsible accordion panels (collapsed by default)
 * - Each panel: Ratio Name | Edit icon | Expand icon
 * - Expanded: Description, Numerator, Denominator, Classifications list
 * - Default sort: entry sequence
 * - Search: Ratio Name, Description (filter panel)
 *
 * Step 1 – Ratio Details
 * ──────────────────────
 * - Financial Ratio Name: required, max 100 chars, unique check on blur
 * - Numerator dropdown: active classifications (mutually exclusive with denominator)
 * - Denominator dropdown: active classifications (mutually exclusive with numerator)
 * - Description: optional, max 300 chars
 * - Next disabled until all 3 required fields filled
 * - Refresh clears form
 *
 * Step 2 – Add Classifications
 * ────────────────────────────
 * - Collapsible summary panel (ratio name, expands to show numerator/denominator)
 * - Classification dropdown (active classifications)
 * - Add Classification button (disabled until selection; error if duplicate)
 * - Table: Classification Name | Calculated | Prorated | Base | Delete
 * - Save disabled until ≥1 classification added
 * - Back → Step 1, Save → list view
 *
 * TODO: GET/POST/PUT /api/manager/financial-ratios
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Plus,
  SquarePen,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeft,
  Calculator,
  Percent,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import { MOCK_CLASSIFICATIONS } from "../../utils/mockData.js";
import SearchFilter from "../../components/common/searchFilter/SearchFilter";
import Input from "../../components/common/Input/Input";
import Select from "../../components/common/select/Select";

// ── Mock initial ratios ───────────────────────────────────────────────────────
const INITIAL_RATIOS = [
  {
    id: 1,
    seq: 1,
    name: "Debt to Assets",
    numerator: "Long-Term Finance",
    denominator: "Total Assets",
    desc: "Debt to Assets ratio detail",
    classifications: [
      {
        id: 11,
        name: "Long Term Finance",
        calculated: false,
        prorated: false,
        base: "",
      },
      {
        id: 12,
        name: "Less: Islamic Finance (LT)",
        calculated: false,
        prorated: true,
        base: "Long term financing",
      },
      {
        id: 13,
        name: "Total Long Term Finance",
        calculated: true,
        prorated: false,
        base: "",
      },
      {
        id: 14,
        name: "Short Term Finance",
        calculated: false,
        prorated: false,
        base: "",
      },
      {
        id: 15,
        name: "Less: Islamic Finance (ST)",
        calculated: false,
        prorated: true,
        base: "Short Term Finance",
      },
    ],
    status: "Active",
  },
  {
    id: 2,
    seq: 2,
    name: "Non Compliant Income to Total Income",
    numerator: "Non-compliant Income",
    denominator: "Total Income",
    desc: "",
    classifications: [],
    status: "Active",
  },
  {
    id: 3,
    seq: 3,
    name: "Net Liquid Assets per Share",
    numerator: "Total Assets",
    denominator: "Total Long-Term Finance",
    desc: "",
    classifications: [],
    status: "Active",
  },
  {
    id: 4,
    seq: 4,
    name: "Non-compliant Investments to Total Assets",
    numerator: "Non-compliant Investments",
    denominator: "Total Assets",
    desc: "",
    classifications: [],
    status: "Active",
  },
  {
    id: 5,
    seq: 5,
    name: "Illiquid Assets to Total Assets",
    numerator: "Total Long-Term Finance",
    denominator: "Total Assets",
    desc: "",
    classifications: [],
    status: "Active",
  },
];

// ── Active classification options ─────────────────────────────────────────────
const ACTIVE_CLASSIFICATIONS = MOCK_CLASSIFICATIONS.filter(
  (c) => c.status === "Active",
);
const CLASSIF_NAMES = ACTIVE_CLASSIFICATIONS.map((c) => c.name).sort();
const CLASSIF_MAP = Object.fromEntries(
  ACTIVE_CLASSIFICATIONS.map((c) => [c.name, c]),
);

// ── Filter config ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = { name: "", desc: "" };
const FILTER_FIELDS = [
  { key: "name", label: "Ratio Name", type: "input", maxLength: 100 },
  { key: "desc", label: "Description", type: "input", maxLength: 300 },
];
const CHIP_LABELS = { name: "Ratio Name", desc: "Description" };

// ── Empty wizard state ────────────────────────────────────────────────────────
const EMPTY_STEP1 = { name: "", numerator: "", denominator: "", desc: "" };

// ── FinancialRatiosPage ───────────────────────────────────────────────────────
const FinancialRatiosPage = () => {
  const sourceData = useRef(INITIAL_RATIOS);
  const [ratios, setRatios] = useState(INITIAL_RATIOS);
  const [view, setView] = useState("list"); // 'list' | 'step1' | 'step2'
  const [editId, setEditId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  // ── Search / filter ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState({});
  const [search, setSearch] = useState("");

  const mainSearch = filters.name;
  const setMainSearch = useCallback(
    (val) => setFilters((p) => ({ ...p, name: val })),
    [],
  );

  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [step1, setStep1] = useState(EMPTY_STEP1);
  const [step1Errs, setStep1Errs] = useState({});
  const [nameStatus, setNameStatus] = useState(null); // null | 'ok' | 'taken'

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [classifSel, setClassifSel] = useState("");
  const [classifErr, setClassifErr] = useState("");
  const [addedClassifs, setAddedClassifs] = useState([]);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // ── Derived: filtered list ────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const f = { ...applied };
    if (search.trim()) f.name = search.trim();
    return sourceData.current.filter((r) =>
      Object.entries(f).every(
        ([k, v]) => !v || (r[k] || "").toLowerCase().includes(v.toLowerCase()),
      ),
    );
  }, [ratios, applied, search]);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const fetchData = useCallback((f) => {
    setRatios(
      sourceData.current.filter((r) =>
        Object.entries(f).every(
          ([k, v]) =>
            !v || (r[k] || "").toLowerCase().includes(v.toLowerCase()),
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
  const handleFClose = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const removeChip = useCallback(
    (key) => {
      setApplied((prev) => {
        const n = { ...prev };
        delete n[key];
        fetchData(n);
        return n;
      });
    },
    [fetchData],
  );

  // ── Expand / collapse ─────────────────────────────────────────────────────
  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── Open add wizard ───────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setStep1(EMPTY_STEP1);
    setStep1Errs({});
    setNameStatus(null);
    setAddedClassifs([]);
    setClassifSel("");
    setClassifErr("");
    setSummaryOpen(false);
    setView("step1");
  };

  // ── Open edit wizard ──────────────────────────────────────────────────────
  const openEdit = (ratio) => {
    setEditId(ratio.id);
    setStep1({
      name: ratio.name,
      numerator: ratio.numerator,
      denominator: ratio.denominator,
      desc: ratio.desc || "",
    });
    setStep1Errs({});
    setNameStatus("ok");
    setAddedClassifs(ratio.classifications.map((c) => ({ ...c })));
    setClassifSel("");
    setClassifErr("");
    setSummaryOpen(false);
    setView("step1");
  };

  // ── Step 1: name uniqueness check on blur ─────────────────────────────────
  const checkNameUnique = () => {
    const trimmed = step1.name.trim();
    if (!trimmed) return;
    const taken = sourceData.current.some(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase() && r.id !== editId,
    );
    setNameStatus(taken ? "taken" : "ok");
    if (taken)
      setStep1Errs((p) => ({ ...p, name: "Ratio Name already in use." }));
    else setStep1Errs((p) => ({ ...p, name: "" }));
  };

  // ── Step 1: Next ──────────────────────────────────────────────────────────
  const step1Valid =
    step1.name.trim() &&
    step1.numerator &&
    step1.denominator &&
    nameStatus !== "taken";

  const goToStep2 = () => {
    const errs = {};
    if (!step1.name.trim()) errs.name = "Please provide Financial Ratio Name";
    if (!step1.numerator) errs.numerator = "Please select Numerator";
    if (!step1.denominator) errs.denominator = "Please select Denominator";
    if (nameStatus === "taken") errs.name = "Ratio Name already in use.";
    if (Object.keys(errs).length) {
      setStep1Errs(errs);
      return;
    }
    setView("step2");
  };

  // ── Step 2: Add classification ────────────────────────────────────────────
  const handleAddClassif = () => {
    if (!classifSel) return;
    if (addedClassifs.some((c) => c.name === classifSel)) {
      setClassifErr("Classification already added");
      return;
    }
    const meta = CLASSIF_MAP[classifSel] || {};
    setAddedClassifs((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: classifSel,
        calculated: meta.calculated || false,
        prorated: meta.prorated || false,
        base: meta.base || "",
      },
    ]);
    toast.success("Classification added successfully");
    setClassifSel("");
    setClassifErr("");
  };

  const removeClassif = (id) =>
    setAddedClassifs((prev) => prev.filter((c) => c.id !== id));

  // ── Step 2: Save ──────────────────────────────────────────────────────────
  const handleSave = () => {
    if (editId) {
      sourceData.current = sourceData.current.map((r) =>
        r.id === editId
          ? {
              ...r,
              ...step1,
              name: step1.name.trim(),
              desc: step1.desc.trim(),
              classifications: addedClassifs,
            }
          : r,
      );
    } else {
      const newRatio = {
        id: Date.now(),
        seq: sourceData.current.length + 1,
        name: step1.name.trim(),
        numerator: step1.numerator,
        denominator: step1.denominator,
        desc: step1.desc.trim(),
        classifications: addedClassifs,
        status: "Active",
      };
      sourceData.current = [...sourceData.current, newRatio];
    }
    setRatios([...sourceData.current]);
    fetchData(applied);
    toast.success(
      editId ? "Updated Successfully" : "Record Added Successfully",
    );
    setView("list");
  };

  // ── Numerator / denominator mutual exclusion ──────────────────────────────
  const numeratorOpts = CLASSIF_NAMES.filter((n) => n !== step1.denominator);
  const denominatorOpts = CLASSIF_NAMES.filter((n) => n !== step1.numerator);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — STEP 1
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "step1") {
    return (
      <div className="font-sans">
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] font-[400] text-[#0B39B5]">
              {editId ? "Edit Financial Ratio" : "Add Financial Ratio"}
            </h1>
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#dde4ee] rounded-lg
                         text-[13px] font-medium text-[#0B39B5] hover:bg-white transition-colors"
            >
              <ArrowLeft size={14} /> Back to Listing
            </button>
          </div>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2">
          {/* Step tabs */}
          <div className="flex gap-2 mb-5">
            {["Step 1", "Step 2"].map((s, i) => (
              <button
                key={s}
                onClick={() => i === 1 && goToStep2()}
                className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors
                            ${
                              i === 0
                                ? "bg-[#0B39B5] text-white"
                                : "bg-white border border-[#dde4ee] text-[#a0aec0] hover:border-[#0B39B5] hover:text-[#0B39B5]"
                            }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#dde4ee] p-5 space-y-4">
            {/* Ratio Name */}
            <div className="relative">
              <Input
                label="Financial Ratio Name"
                required
                maxLength={100}
                showCount
                placeholder="e.g. Debt to Total Assets"
                value={step1.name}
                onChange={(v) => {
                  setStep1((p) => ({ ...p, name: v }));
                  setNameStatus(null);
                  if (step1Errs.name) setStep1Errs((p) => ({ ...p, name: "" }));
                }}
                onBlur={checkNameUnique}
                error={!!step1Errs.name}
                errorMessage={step1Errs.name}
                rightIcon={
                  nameStatus === "ok" ? (
                    <span className="text-[#01C9A4] text-[16px] font-bold">
                      ✓
                    </span>
                  ) : nameStatus === "taken" ? (
                    <X size={14} className="text-red-400" />
                  ) : null
                }
              />
            </div>

            {/* Numerator + Denominator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Select Numerator"
                required
                placeholder="-- Select Numerator --"
                options={numeratorOpts}
                value={step1.numerator}
                onChange={(v) => {
                  setStep1((p) => ({ ...p, numerator: v }));
                  setStep1Errs((p) => ({ ...p, numerator: "" }));
                }}
                error={!!step1Errs.numerator}
                errorMessage={step1Errs.numerator}
              />
              <Select
                label="Select Denominator"
                required
                placeholder="-- Select Denominator --"
                options={denominatorOpts}
                value={step1.denominator}
                onChange={(v) => {
                  setStep1((p) => ({ ...p, denominator: v }));
                  setStep1Errs((p) => ({ ...p, denominator: "" }));
                }}
                error={!!step1Errs.denominator}
                errorMessage={step1Errs.denominator}
              />
            </div>

            {/* Live preview */}
            {step1.numerator && step1.denominator && (
              <div className="bg-[#EFF3FF] rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-[#0B39B5] mb-1">
                  Preview
                </p>
                <p className="text-[13px] font-mono text-[#041E66]">
                  {step1.numerator}{" "}
                  <span className="text-[#E8923A] font-bold mx-2">÷</span>{" "}
                  {step1.denominator}
                </p>
              </div>
            )}

            {/* Description */}
            <Input
              label="Description"
              maxLength={300}
              showCount
              placeholder="Optional description"
              value={step1.desc}
              onChange={(v) => setStep1((p) => ({ ...p, desc: v }))}
            />

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setStep1(EMPTY_STEP1);
                  setStep1Errs({});
                  setNameStatus(null);
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 border border-[#dde4ee] rounded-lg
                           text-[13px] font-medium text-[#041E66] hover:bg-[#f8f9ff] transition-colors"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={goToStep2}
                disabled={!step1Valid}
                className="px-5 py-2.5 bg-[#0B39B5] hover:bg-[#0a2e94] text-white rounded-lg
                           text-[13px] font-medium disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — STEP 2
  // ─────────────────────────────────────────────────────────────────────────
  if (view === "step2") {
    return (
      <div className="font-sans">
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] font-[400] text-[#0B39B5]">
              {editId ? "Edit Financial Ratio" : "Add Financial Ratio"}
            </h1>
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#dde4ee] rounded-lg
                         text-[13px] font-medium text-[#0B39B5] hover:bg-white transition-colors"
            >
              <ArrowLeft size={14} /> Back to Listing
            </button>
          </div>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-2 space-y-4">
          {/* Step tabs */}
          <div className="flex gap-2">
            {["Step 1", "Step 2"].map((s, i) => (
              <button
                key={s}
                onClick={() => i === 0 && setView("step1")}
                className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors
                            ${
                              i === 1
                                ? "bg-[#0B39B5] text-white"
                                : "bg-white border border-[#dde4ee] text-[#0B39B5] hover:bg-[#EFF3FF]"
                            }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Collapsible summary panel */}
          <div className="bg-white rounded-xl border border-[#dde4ee] overflow-hidden">
            <button
              onClick={() => setSummaryOpen((p) => !p)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#f8f9ff] transition-colors"
            >
              <span className="text-[14px] font-semibold text-[#0B39B5]">
                {step1.name}
              </span>
              {summaryOpen ? (
                <ChevronUp size={16} className="text-[#a0aec0]" />
              ) : (
                <ChevronDown size={16} className="text-[#a0aec0]" />
              )}
            </button>
            {summaryOpen && (
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-[#eef2f7] pt-3">
                {step1.desc && (
                  <div className="md:col-span-3">
                    <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5">
                      Description
                    </p>
                    <p className="text-[13px] text-[#041E66]">{step1.desc}</p>
                  </div>
                )}
                <div className="bg-[#EFF3FF] rounded-xl px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5">
                    Numerator
                  </p>
                  <p className="text-[13px] text-[#041E66]">
                    {step1.numerator}
                  </p>
                </div>
                <div className="bg-[#EFF3FF] rounded-xl px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#01C9A4] mb-0.5">
                    Denominator
                  </p>
                  <p className="text-[13px] text-[#041E66]">
                    {step1.denominator}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Add classification */}
          <div className="bg-white rounded-xl border border-[#dde4ee] p-5">
            <div className="flex items-end gap-3 mb-3">
              <div className="flex-1">
                <Select
                  label="Classification"
                  required
                  placeholder="-- Select Classification --"
                  options={CLASSIF_NAMES.filter(
                    (n) => !addedClassifs.some((c) => c.name === n),
                  )}
                  value={classifSel}
                  onChange={(v) => {
                    setClassifSel(v);
                    setClassifErr("");
                  }}
                  error={!!classifErr}
                  errorMessage={classifErr}
                />
              </div>
              <button
                onClick={handleAddClassif}
                disabled={!classifSel}
                className="flex items-center gap-1.5 px-4 py-[10px] bg-[#01C9A4] hover:bg-[#00b392]
                           text-white rounded-lg text-[13px] font-medium disabled:opacity-40 transition-colors shrink-0"
              >
                <Plus size={14} /> Add Classification
              </button>
            </div>

            {/* Classifications table */}
            <div className="rounded-xl overflow-hidden border border-[#dde4ee]">
              <table className="w-full text-[13px]">
                <thead>
                  <tr
                    className="border-b border-[#dde4ee]"
                    style={{ backgroundColor: "#E0E6F6" }}
                  >
                    {[
                      "Classification Name",
                      "Calculated",
                      "Prorated",
                      "Base Classification",
                      "Delete",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {addedClassifs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-[#a0aec0]"
                      >
                        No Classifications Added
                      </td>
                    </tr>
                  ) : (
                    addedClassifs.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-[#eef2f7] last:border-0"
                      >
                        <td className="px-4 py-2.5 font-medium text-[#041E66]">
                          {c.name}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.calculated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#0B39B5] text-[11px] font-semibold">
                              <Calculator size={11} /> Yes
                            </span>
                          ) : (
                            <span className="text-[#a0aec0]">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.prorated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-[#01C9A4] text-[11px] font-semibold">
                              <Percent size={11} /> Yes
                            </span>
                          ) : (
                            <span className="text-[#a0aec0]">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[#041E66]">
                          {c.base || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => removeClassif(c.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1.5 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Step 2 buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setView("step1")}
                className="px-5 py-2.5 border border-[#dde4ee] rounded-lg text-[13px] font-medium
                           text-[#041E66] hover:bg-[#f8f9ff] transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={addedClassifs.length === 0}
                className="px-5 py-2.5 bg-[#0B39B5] hover:bg-[#0a2e94] text-white rounded-lg
                           text-[13px] font-medium disabled:opacity-40 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Page heading + search ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">
            Financial Ratios
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#01C9A4] hover:bg-[#00b392]
                         text-white rounded-lg text-[13px] font-medium transition-colors shrink-0"
            >
              Add Financial Ratio
            </button>
            <SearchFilter
              placeholder="Search by name"
              mainSearch={mainSearch}
              setMainSearch={setMainSearch}
              filters={filters}
              setFilters={setFilters}
              fields={FILTER_FIELDS}
              onSearch={handleSearch}
              onReset={handleReset}
              onFilterClose={handleFClose}
            />
          </div>
        </div>
      </div>

      <div>
        {/* Filter chips */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                       text-[12px] font-medium text-white bg-[#01C9A4]"
              >
                {CHIP_LABELS[k]}: {v}
                <button
                  onClick={() => removeChip(k)}
                  className="hover:text-white/70"
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

        {/* Ratio accordion — 2-column grid */}
        {displayed.length === 0 ? (
          <div className="bg-[#EFF3FF] rounded-xl  border border-slate-200 py-14 text-center text-[#a0aec0]">
            No Financial Ratios Found
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {displayed.map((ratio) => {
              const isOpen = expanded.has(ratio.id);
              return (
                <div
                  key={ratio.id}
                  className="bg-[#EFF3FF] rounded-xl border border border-slate-200 overflow-hidden"
                >
                  {/* Panel header */}
                  <div className="flex items-start justify-between px-5 py-4">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-[14px] font-semibold text-[#0B39B5] leading-snug">
                        {ratio.name}
                      </p>
                      {ratio.desc && (
                        <p className="text-[12px] text-[#a0aec0] mt-0.5">
                          {ratio.desc}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(ratio)}
                        className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5 transition-colors"
                      >
                        <SquarePen size={16} />
                      </button>
                      <button
                        onClick={() => toggleExpand(ratio.id)}
                        className="text-[#0B39B5] hover:bg-[#EFF3FF] rounded p-1.5 transition-colors"
                      >
                        {isOpen ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded — classifications table */}
                  {isOpen && ratio.classifications.length > 0 && (
                    <div className="border-t border-[#eef2f7] max-h-[260px] overflow-y-auto">
                      <table className="w-full text-[13px]">
                        <thead className="sticky top-0">
                          <tr style={{ backgroundColor: "#E0E6F6" }}>
                            <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-[#041E66]">
                              Classifications Name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ratio.classifications.map((c) => (
                            <tr
                              key={c.id}
                              className="border-t border-[#eef2f7]"
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[#041E66]">
                                    {c.name}
                                  </span>
                                  {c.calculated && (
                                    <span className="flex items-center gap-1.5 text-[#F5A623] shrink-0">
                                      <Calculator size={16} />
                                    </span>
                                  )}
                                  {c.prorated && (
                                    <span className="flex items-center gap-1.5 text-[#01C9A4] shrink-0">
                                      <PieChart size={16} />
                                      {c.base && (
                                        <span className="text-[12px] text-[#041E66]">
                                          {c.base}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Expanded — empty state */}
                  {isOpen && ratio.classifications.length === 0 && (
                    <div className="border-t border-[#eef2f7] py-6 text-center text-[12px] text-[#a0aec0]">
                      No classifications added
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialRatiosPage;
