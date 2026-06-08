/**
 * src/pages/dataentry/FinancialDataListPage.jsx
 * ===============================================
 * Data Entry officer manages their quarterly financial data submissions.
 *
 * Statuses
 * --------
 * In Progress          → can Edit and Send for Approval
 * Pending For Approval → locked (awaiting Manager action)
 * Approved             → locked, read-only
 * Declined             → can Edit only (no send)
 *
 * TODO: GET /api/data-entry/financial-data, POST /api/data-entry/send-approval/:id
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Send, Eye, Clock } from 'lucide-react'
import {
  StatusBadge,
  BtnGold,
  BtnIconEdit,
  BtnChipRemove,
  BtnClearAll,
} from '../../components/common/index.jsx'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import { useFinancialData } from '../../context/FinancialDataContext.jsx'
import CommonTable from '../../components/common/table/NormalTable.jsx'
import { SendForApprovalModal } from '../../components/common/modals/Modals.jsx'
import ApprovalHistoryModal from '../../components/common/financialData/ApprovalHistoryModal.jsx'
import { toast } from 'react-toastify'
import { formatChipValue } from '../../utils/helpers'
import viewHistory from '../../../public/view-history.png'

// ── Filter config ─────────────────────────────────────────────────────────────

const STATUS_OPTS = ['In Progress', 'Pending For Approval', 'Approved', 'Declined']
const EMPTY_FILTERS = { company: '', quarter: '', sector: '', status: '' }
const FILTER_FIELDS = [
  { key: 'quarter', label: 'Quarter Name', type: 'input', maxLength: 50 },
  { key: 'sector', label: 'Sector Name', type: 'input', maxLength: 50 },
  { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS },
]
const CHIP_LABELS = {
  company: 'Company / Ticker',
  quarter: 'Quarter',
  sector: 'Sector',
  status: 'Status',
}

// ─────────────────────────────────────────────────────────────────────────────

const FinancialDataListPage = () => {
  const navigate = useNavigate()
  const { records, setEditRecord, sendForApproval } = useFinancialData()

  // ── Sorting ───────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('quarter')
  const [sortDir, setSortDir] = useState('desc')

  const handleSort = useCallback(
    (col) => {
      if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      else {
        setSortCol(col)
        setSortDir('asc')
      }
    },
    [sortCol]
  )

  // ── Modal state ───────────────────────────────────────────────────────────
  const [sendModal, setSendModal] = useState(null)
  const [histModal, setHistModal] = useState(null)

  // ── Search / filter state ─────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})
  const [mainSearch, setMainSearch] = useState('')

  // ── Derived filtered + sorted data ────────────────────────────────────────
  const displayed = useMemo(() => {
    const f = { ...applied }
    if (mainSearch.trim()) f.company = mainSearch.trim()

    const filtered = records.filter((r) => {
      if (f.company) {
        const q = f.company.toLowerCase()
        if (!r.company?.toLowerCase().includes(q) && !r.ticker?.toLowerCase().includes(q))
          return false
      }
      if (f.quarter && !r.quarter?.toLowerCase().includes(f.quarter.toLowerCase())) return false
      if (f.sector && !r.sector?.toLowerCase().includes(f.sector.toLowerCase())) return false
      if (f.status && r.status !== f.status) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      const va = (a[sortCol] ?? '').toString().toLowerCase()
      const vb = (b[sortCol] ?? '').toString().toLowerCase()
      const cmp = va.localeCompare(vb)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [records, applied, mainSearch, sortCol, sortDir])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const next = {}
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) next[k] = v.trim()
    })
    setApplied(next)
    setFilters(EMPTY_FILTERS)
  }, [filters])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setMainSearch('')
  }, [])

  const removeChip = useCallback((key) => {
    setApplied((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleEdit = useCallback(
    (row) => {
      setEditRecord(row)
      navigate('/data-entry/financial-data/add')
    },
    [setEditRecord, navigate]
  )

  const handleProceed = useCallback(
    (notes) => {
      sendForApproval(sendModal.id, notes)
      toast.success('Sent for approval successfully')
      setSendModal(null)
    },
    [sendModal, sendForApproval]
  )

  const openView = useCallback(
    (row) => {
      navigate(`/data-entry/financial-data/view/${row.id}`)
    },
    [navigate]
  )

  // ── Table column definitions ──────────────────────────────────────────────
  const columns = [
    {
      key: 'quarter',
      title: 'Quarter Name',
      sortable: true,
      render: (row) => <span className="font-semibold">{row.quarter}</span>,
    },
    {
      key: 'ticker',
      title: 'Ticker',
      sortable: true,
      align: 'center',
      render: (row) => <span>{row.ticker}</span>,
    },
    {
      key: 'company',
      title: 'Company Name',
      sortable: true,
      render: (row) => (
        <span
          className="text-[#0B39B5] font-medium cursor-pointer hover:underline"
          onClick={() => openView(row)}
        >
          {row.company}
        </span>
      ),
    },
    {
      key: 'sector',
      title: 'Sector',
      sortable: true,
      align: 'center',
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: '_actions',
      title: 'Actions',
      sortable: false,
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {/* Edit Slot */}
          <div className="w-8 h-8 flex items-center justify-center">
            {(row.status === 'In Progress' || row.status === 'Declined') && (
              <BtnIconEdit icon={<Edit size={14} />} size={14} onClick={() => handleEdit(row)} />
            )}
          </div>

          {/* Send Slot */}
          <div className="w-8 h-8 flex items-center justify-center">
            {row.status === 'In Progress' && (
              <button
                onClick={() => setSendModal(row)}
                className="w-8 h-8 rounded-lg hover:bg-[#e6faf7] hover:text-[#01C9A4]
                           text-slate-400 flex items-center justify-center transition-all"
                title="Send for Approval"
              >
                <Send color="#0B39B5" size={14} />
              </button>
            )}
          </div>

          {/* View Slot */}
          <div className="flex items-center justify-center">
            <BtnIconEdit
              icon={<Eye size={14} />}
              size={14}
              title="View"
              onClick={() => openView(row)}
            />
          </div>
        </div>
      ),
    },
    {
      key: '_history',
      title: 'View Approval History',
      sortable: false,
      align: 'center',
      render: (row) =>
        row.status !== 'In Progress' ? (
          <div className="flex justify-center items-center">
            <img
              className="cursor-pointer"
              onClick={() => setHistModal(row)}
              alt="view approval icon"
              src={viewHistory}
              width={30}
            />
          </div>
        ) : null,
    },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* Header band — title + actions in one row */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                      flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Financial Data List</h1>
        <div className="flex items-center gap-2">
          <BtnGold
            onClick={() => {
              setEditRecord(null)
              navigate('/data-entry/financial-data/add')
            }}
            className="flex items-center gap-2 shrink-0"
          >
            <Plus size={15} /> Add Financial Data
          </BtnGold>
          <SearchFilter
            placeholder="Search by name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={() => setFilters(EMPTY_FILTERS)}
          />
        </div>
      </div>

      {/* Active filter chips */}
      {Object.keys(applied).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {Object.entries(applied).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                         text-[12px] font-medium text-white bg-[#01C9A4]"
            >
              {CHIP_LABELS[k] || k}: {formatChipValue(v)}
              <BtnChipRemove onClick={() => removeChip(k)} />
            </span>
          ))}
          {Object.keys(applied).length > 1 && <BtnClearAll onClick={handleReset} />}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-slate-200">
        <CommonTable
          columns={columns}
          data={displayed}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText="No Record Found"
          headerBg="#E0E6F6"
          headerTextColor="#041E66"
          rowBg="#ffffff"
          rowHoverBg="#EFF3FF"
        />
      </div>

      {/* ── Send for Approval Modal (from common/modals) ── */}
      <SendForApprovalModal
        open={!!sendModal}
        onClose={() => setSendModal(null)}
        onProceed={handleProceed}
      />

      {/* ── Approval History Modal ── */}
      <ApprovalHistoryModal record={histModal} onClose={() => setHistModal(null)} />
    </div>
  )
}

export default FinancialDataListPage
