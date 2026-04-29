/**
 * src/components/common/config/SimpleConfigListPage.jsx
 * =======================================================
 * Reusable configuration page for simple single-field name lists.
 *
 * Used by:
 *  - SukukListPage          → Approved List of Sukuk
 *  - IslamicBanksPage       → Islamic Bank
 *  - IslamicBankWindowsPage → Islamic Bank Windows
 *  - CharitableOrgsPage     → Charitable Organizations
 *
 * Features:
 *  ▸ EFF3FF header band     — title (left) + SearchFilter (right), consistent with
 *                              FinancialRatiosPage / ComplianceCriteriaPage layout
 *  ▸ Inline add form        — single Name* Input (common) + BtnTeal Save
 *  ▸ Live search            — SearchFilter (showFilterPanel=false) filters table rows
 *  ▸ Sortable table         — Name column asc/desc via CommonTable
 *  ▸ Delete per row         — red Trash2 → ConfirmModal (common) → remove
 *  ▸ Duplicate check        — blocks adding the same name twice with inline error
 *  ▸ Enter key              — submits the form
 *
 * ALL interactive elements come from src/components/common/:
 *  Input        → common/Input/Input.jsx
 *  BtnTeal      → common/index.jsx
 *  ConfirmModal → common/index.jsx
 *  SearchFilter → common/searchFilter/SearchFilter.jsx
 *  CommonTable  → common/table/NormalTable.jsx
 *
 * Props:
 *  title            {string}   — page heading text
 *  fieldLabel       {string}   — input label (default "Name")
 *  fieldPlaceholder {string}   — input placeholder text
 *  maxLength        {number}   — max chars for input (default 100)
 *  tableColTitle    {string}   — table "Name" column header (default "Name")
 *  initialData      {Array}    — seed rows [{id:number, name:string}]
 *  confirmMessage   {string}   — delete confirmation body text
 *
 * Usage:
 *  import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'
 *
 *  <SimpleConfigListPage
 *    title="Islamic Bank"
 *    fieldLabel="Bank Name"
 *    fieldPlaceholder="Enter bank name"
 *    initialData={INITIAL_BANKS}
 *  />
 */

import React, { useState, useMemo, useCallback } from 'react'
import { toast } from 'react-toastify'
import { ConfirmModal, BtnTeal, BtnIconDelete } from '../index.jsx'
import SearchFilter from '../searchFilter/SearchFilter.jsx'
import Input from '../Input/Input.jsx'
import CommonTable from '../table/NormalTable.jsx'

// ── Empty filter/search state ─────────────────────────────────────────────────
const EMPTY_FILTERS = {}

// ─────────────────────────────────────────────────────────────────────────────

const SimpleConfigListPage = ({
  title,
  fieldLabel = 'Name',
  fieldPlaceholder = 'Enter name',
  maxLength = 100,
  tableColTitle = 'Name',
  initialData = [],
  confirmMessage = 'Are you sure you want to do this action?',
}) => {
  // ── Local data ──────────────────────────────────────────────────────────
  const [data, setData] = useState(initialData)

  // ── Form ────────────────────────────────────────────────────────────────
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')

  // ── SearchFilter state (showFilterPanel=false → main search only) ──────
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  // ── Sort ────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  // ── Delete modal ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED — filtered + sorted display list
  // ─────────────────────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q ? data.filter((item) => item.name.toLowerCase().includes(q)) : [...data]

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      return (a.name || '').localeCompare(b.name || '') * dir
    })
    return list
  }, [data, search, sortDir])

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) {
        setSortDir((p) => (p === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortCol(col)
        setSortDir('asc')
      }
    },
    [sortCol]
  )

  const handleNameChange = useCallback(
    (v) => {
      setNameInput(v)
      if (nameError) setNameError('')
    },
    [nameError]
  )

  /** Validate and add a new record */
  const handleSave = useCallback(() => {
    const trimmed = nameInput.trim()
    if (!trimmed) {
      setNameError(`${fieldLabel} is required`)
      return
    }
    if (data.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameError(`${fieldLabel} already exists`)
      return
    }
    setData((prev) => [...prev, { id: Date.now(), name: trimmed }])
    setNameInput('')
    setNameError('')
    toast.success('Record Added Successfully')
  }, [nameInput, data, fieldLabel])

  /** Enter key submits the form */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') handleSave()
    },
    [handleSave]
  )

  /** Confirm delete — remove row */
  const handleDeleteConfirm = useCallback(() => {
    setData((prev) => prev.filter((d) => d.id !== deleteTarget.id))
    setDeleteTarget(null)
    toast.success('Record Deleted Successfully')
  }, [deleteTarget])

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMN CONFIG
  // ─────────────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: 'name',
        title: tableColTitle,
        sortable: true,
      },
      {
        key: '_delete',
        title: 'Delete',
        render: (row) => (
          <BtnIconDelete
            type="button"
            onClick={() => setDeleteTarget(row)}
            title="Delete record"
          />
        ),
      },
    ],
    [tableColTitle]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band — matches FinancialRatiosPage / ComplianceCriteriaPage ── */}
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">{title}</h1>
          {/* SearchFilter with showFilterPanel=false → clean search input only */}
          <SearchFilter
            placeholder="Search..."
            mainSearch={search}
            setMainSearch={setSearch}
            showFilterPanel={false}
            filters={filters}
            setFilters={setFilters}
            onSearch={() => {}}
            onReset={() => setSearch('')}
          />
        </div>
      </div>

      {/* ── Main card — form section + table ── */}
      <div className="bg-[#EFF3FF] rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Add form ── */}
        <div className="px-4 pt-4 pb-4 border-b border-slate-200">
          {/*
            items-start: all columns start at the same top.
            Phantom spacer (h-[18px] mb-1.5) above Save matches the Input label
            height so the button trigger always aligns with the Input trigger —
            even when an in-flow error message or char-count shifts the Input taller.
          */}
          <div className="flex items-start gap-3">
            {/* Name Input from common/Input/Input.jsx */}
            <div className="flex-1" onKeyDown={handleKeyDown}>
              <Input
                label={fieldLabel}
                required
                value={nameInput}
                onChange={handleNameChange}
                placeholder={fieldPlaceholder}
                maxLength={maxLength}
                showCount
                error={!!nameError}
                errorMessage={nameError}
              />
            </div>

            {/* BtnTeal — phantom spacer offsets for Input label so button
                aligns with the Input trigger regardless of error / char-count */}
            <div className="shrink-0">
              <div className="h-[18px] mb-1.5" />
              <BtnTeal onClick={handleSave} className="px-6 py-[10px]">
                Save
              </BtnTeal>
            </div>
          </div>
        </div>

        {/* ── CommonTable from common/table/NormalTable.jsx ── */}
        <CommonTable
          columns={columns}
          data={displayed}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Record Found"
          headerBg="#E0E6F6"
          rowBg="#ffffff"
          rowHoverBg="#f8fafc"
        />
      </div>

      {/* ── ConfirmModal from common/index.jsx ── */}
      <ConfirmModal
        open={!!deleteTarget}
        message={confirmMessage}
        onYes={handleDeleteConfirm}
        onNo={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default SimpleConfigListPage
