// /**
//  * src/pages/manager/PendingApprovalsPage.jsx
//  * ============================================
//  * Manager reviews financial data submitted by Data Entry users.
//  *
//  * Views:
//  *  "list"  → table of pending approvals
//  *  "view"  → read-only FinancialDataTable for selected row
//  *  "edit"  → editable FinancialDataTable for selected row
//  *
//  * Actions per row:
//  *  View    → opens FinancialDataTable in read-only mode (editableCol={-1})
//  *  Edit    → opens FinancialDataTable in edit mode (editableCol={0})
//  *  Approve → RequestActionModal → marks Approved, removes from queue
//  *  Decline → RequestActionModal → marks Declined, removes from queue
//  *
//  * Search Behaviour
//  * ─────────────────
//  * - Main input searches Company Name
//  * - Filter panel: Ticker | Company | Sector | Quarter | Sent By
//  * - Applied filters shown as teal chips — Clear All when > 1
//  *
//  * Reusable Components Used
//  * ─────────────────────────
//  * - FinancialDataTable → src/components/common/FinancialDataTable.jsx
//  * - RequestActionModal → src/components/common/Modals/Modals.jsx
//  * - SearchFilter       → src/components/common/searchFilter/SearchFilter.jsx
//  * - CommonTable        → src/components/common/table/NormalTable.jsx
//  * - ConfirmModal       → src/components/common/index.jsx
//  *
//  * TODO
//  * ─────
//  * - GET  /api/manager/pending-approvals        → replace MOCK_PENDING_APPROVALS
//  * - GET  /api/manager/financial-data/:id       → replace MOCK_RATIOS in view/edit
//  * - POST /api/manager/financial-data/:id       → replace local update in handleUpdate
//  * - POST /api/manager/approve/:id              → replace local remove in handleAction
//  * - POST /api/manager/decline/:id              → replace local remove in handleAction
//  */

// import React, { useState, useMemo, useCallback, useRef } from 'react'
// import { CheckCircle, XCircle, Eye, SquarePen, X } from 'lucide-react'
// import { toast } from 'react-toastify'
// import SearchFilter from '../../components/common/searchFilter/SearchFilter'
// import CommonTable from '../../components/common/table/NormalTable'
// import { RequestActionModal } from '../../components/common/Modals/Modals'
// import FinancialDataTable, {
//   MOCK_QUARTERS,
//   MOCK_COMPANIES,
//   MOCK_RATIOS,
// } from '../../components/common/table/FinancialDataTable'
// import { formatChipValue } from '../../utils/helpers'

// // ─────────────────────────────────────────────────────────────────────────────
// // MOCK DATA — replace with API calls
// // ─────────────────────────────────────────────────────────────────────────────

// const MOCK_PENDING_APPROVALS = [
//   {
//     id: 1,
//     quarter: 'Q1-2025',
//     ticker: 'ACBL',
//     company: 'Allied Bank',
//     sector: 'Banking',
//     sentBy: 'Bilal Khan',
//     sentOn: '01-03-2025',
//   },
//   {
//     id: 2,
//     quarter: 'Q1-2025',
//     ticker: 'MCB',
//     company: 'MCB Bank',
//     sector: 'Banking',
//     sentBy: 'Fatima Malik',
//     sentOn: '02-03-2025',
//   },
//   {
//     id: 3,
//     quarter: 'Q1-2025',
//     ticker: 'OGDC',
//     company: 'Oil & Gas Dev Co',
//     sector: 'Energy',
//     sentBy: 'Hamza Ali',
//     sentOn: '03-03-2025',
//   },
//   {
//     id: 4,
//     quarter: 'Q2-2025',
//     ticker: 'LUCK',
//     company: 'Lucky Cement',
//     sector: 'Cement',
//     sentBy: 'Bilal Khan',
//     sentOn: '04-03-2025',
//   },
//   {
//     id: 5,
//     quarter: 'Q2-2025',
//     ticker: 'PSO',
//     company: 'Pakistan State Oil',
//     sector: 'Energy',
//     sentBy: 'Zainab Raza',
//     sentOn: '05-03-2025',
//   },
// ]

// // ─────────────────────────────────────────────────────────────────────────────
// // CONSTANTS
// // ─────────────────────────────────────────────────────────────────────────────

// const EMPTY_FILTERS = {
//   company: '',
//   ticker: '',
//   sector: '',
//   quarter: '',
//   sentBy: '',
// }

// const CHIP_LABELS = {
//   company: 'Company',
//   ticker: 'Ticker',
//   sector: 'Sector',
//   quarter: 'Quarter',
//   sentBy: 'Sent By',
// }

// const FILTER_FIELDS = [
//   { key: 'company', label: 'Company Name', type: 'input', maxLength: 50 },
//   { key: 'ticker', label: 'Ticker', type: 'input', maxLength: 10 },
//   { key: 'sector', label: 'Sector', type: 'input', maxLength: 50 },
//   {
//     key: 'quarter',
//     label: 'Quarter',
//     type: 'select',
//     options: ['Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025'],
//   },
//   { key: 'sentBy', label: 'Sent By', type: 'input', maxLength: 50 },
// ]

// // ─────────────────────────────────────────────────────────────────────────────
// // COMPONENT
// // ─────────────────────────────────────────────────────────────────────────────

// const PendingApprovalsPage = () => {
//   // ── View state: "list" | "view" | "edit" ─────────────────────────────────
//   const [view, setView] = useState('list')
//   const [activeRow, setActiveRow] = useState(null)

//   // ── Financial data state for view/edit screens ────────────────────────────
//   const [ratios, setRatios] = useState(MOCK_RATIOS)
//   const [selectedQuarter, setSelectedQuarter] = useState('')
//   const [selectedCompany, setSelectedCompany] = useState('')

//   // ── List data ─────────────────────────────────────────────────────────────
//   const sourceData = useRef(MOCK_PENDING_APPROVALS)
//   const [approvals, setApprovals] = useState(MOCK_PENDING_APPROVALS)

//   // ── Action modal state ────────────────────────────────────────────────────
//   const [modal, setModal] = useState(null) // { row, type: 'approve' | 'decline' }

//   // ── Filter + search ───────────────────────────────────────────────────────
//   const [filters, setFilters] = useState(EMPTY_FILTERS)
//   const [applied, setApplied] = useState({})

//   const mainSearch = filters.company
//   const setMainSearch = useCallback((val) => setFilters((p) => ({ ...p, company: val })), [])

//   // ── Sort ──────────────────────────────────────────────────────────────────
//   const [sortCol, setSortCol] = useState('company')
//   const [sortDir, setSortDir] = useState('asc')

//   // ─────────────────────────────────────────────────────────────────────────
//   // NAVIGATION HELPERS
//   // ─────────────────────────────────────────────────────────────────────────

//   /**
//    * Open a row in view or edit mode.
//    * TODO: fetch actual financial data from GET /api/manager/financial-data/:id
//    */
//   const openRow = useCallback((row, mode) => {
//     setActiveRow(row)
//     setSelectedQuarter(row.quarter)
//     setSelectedCompany(row.company)
//     setRatios(MOCK_RATIOS) // TODO: replace with API fetch by row.id
//     setView(mode)
//   }, [])

//   const backToList = useCallback(() => {
//     setView('list')
//     setActiveRow(null)
//   }, [])

//   // ─────────────────────────────────────────────────────────────────────────
//   // CELL EDIT HANDLER
//   // ─────────────────────────────────────────────────────────────────────────

//   /**
//    * Updates a single cell value in the ratios state.
//    * Called by FinancialDataTable when a cell changes in edit mode.
//    */
//   const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
//     setRatios((prev) =>
//       prev.map((ratio) =>
//         ratio.id !== ratioId
//           ? ratio
//           : {
//               ...ratio,
//               classifications: ratio.classifications.map((cls) =>
//                 cls.id !== classId
//                   ? cls
//                   : {
//                       ...cls,
//                       values: cls.values.map((v, i) => (i === colIdx ? val : v)),
//                     }
//               ),
//             }
//       )
//     )
//   }, [])

//   /**
//    * Save edited data.
//    * TODO: PUT /api/manager/financial-data/:id with updated ratios
//    */
//   const handleUpdate = useCallback(() => {
//     toast.success('Record updated successfully')
//     backToList()
//   }, [backToList])

//   // ─────────────────────────────────────────────────────────────────────────
//   // SEARCH + FILTER
//   // ─────────────────────────────────────────────────────────────────────────

//   const fetchData = useCallback((f) => {
//     setApprovals(
//       sourceData.current.filter((r) =>
//         Object.entries(f).every(([k, v]) => !v || r[k]?.toLowerCase().includes(v.toLowerCase()))
//       )
//     )
//   }, [])

//   const handleSearch = useCallback(() => {
//     const next = {}
//     Object.entries(filters).forEach(([k, v]) => {
//       if (v.trim()) next[k] = v.trim()
//     })
//     setApplied(next)
//     fetchData(next)
//     setFilters(EMPTY_FILTERS)
//   }, [filters, fetchData])

//   const handleReset = useCallback(() => {
//     setFilters(EMPTY_FILTERS)
//     setApplied({})
//     fetchData({})
//   }, [fetchData])

//   const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

//   const removeChip = useCallback(
//     (key) => {
//       setApplied((prev) => {
//         const next = { ...prev }
//         delete next[key]
//         fetchData(next)
//         return next
//       })
//     },
//     [fetchData]
//   )

//   // ─────────────────────────────────────────────────────────────────────────
//   // SORT
//   // ─────────────────────────────────────────────────────────────────────────

//   const handleSort = useCallback(
//     (col) => {
//       if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
//       else {
//         setSortCol(col)
//         setSortDir('asc')
//       }
//     },
//     [sortCol]
//   )

//   const sorted = useMemo(
//     () =>
//       [...approvals].sort((a, b) => {
//         const va = (a[sortCol] || '').toLowerCase()
//         const vb = (b[sortCol] || '').toLowerCase()
//         return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
//       }),
//     [approvals, sortCol, sortDir]
//   )

//   // ─────────────────────────────────────────────────────────────────────────
//   // ACTION HANDLER (Approve / Decline)
//   // ─────────────────────────────────────────────────────────────────────────

//   const handleAction = useCallback(
//     (notes) => {
//       const { row, type } = modal
//       // TODO: POST /api/manager/approve/:id or decline/:id
//       sourceData.current = sourceData.current.filter((r) => r.id !== row.id)
//       setApprovals(sourceData.current)
//       toast.success(`${row.ticker} has been ${type === 'approve' ? 'Approved ✅' : 'Declined ❌'}`)
//       setModal(null)
//     },
//     [modal]
//   )

//   // ─────────────────────────────────────────────────────────────────────────
//   // TABLE COLUMN DEFINITIONS
//   // ─────────────────────────────────────────────────────────────────────────

//   const TABLE_COLS = useMemo(
//     () => [
//       {
//         key: 'quarter',
//         title: 'Quarter Name',
//         sortable: true,
//         render: (r) => (
//           <span
//             className="bg-blue-100 text-[#0B39B5] px-2.5 py-0.5
//                          rounded-full text-[11px] font-semibold"
//           >
//             {r.quarter}
//           </span>
//         ),
//       },
//       {
//         key: 'ticker',
//         title: 'Ticker',
//         sortable: true,
//         render: (r) => <span className="font-mono font-bold text-[#041E66]">{r.ticker}</span>,
//       },
//       {
//         key: 'company',
//         title: 'Company Name',
//         sortable: true,
//         render: (r) => <span className="font-medium text-[#0B39B5]">{r.company}</span>,
//       },
//       { key: 'sector', title: 'Sector Name', sortable: true },
//       { key: 'sentBy', title: 'Sent By', sortable: true },
//       { key: 'sentOn', title: 'Sent On', sortable: true },
//       {
//         key: 'actions',
//         title: 'Actions',
//         align: 'center',
//         render: (r) => (
//           <div className="flex items-center justify-center gap-1">
//             {/* View — opens read-only FinancialDataTable */}
//             <button
//               title="View"
//               onClick={() => openRow(r, 'view')}
//               className="w-8 h-8 rounded-lg hover:bg-[#EFF3FF] hover:text-[#0B39B5]
//                        text-slate-400 flex items-center justify-center transition-all"
//             >
//               <Eye size={15} />
//             </button>
//             {/* Edit — opens editable FinancialDataTable */}
//             <button
//               title="Edit"
//               onClick={() => openRow(r, 'edit')}
//               className="w-8 h-8 rounded-lg hover:bg-[#EFF3FF] hover:text-[#0B39B5]
//                        text-slate-400 flex items-center justify-center transition-all"
//             >
//               <SquarePen size={15} />
//             </button>
//             {/* Approve */}
//             <button
//               title="Approve"
//               onClick={() => setModal({ row: r, type: 'approve' })}
//               className="text-emerald-500 hover:text-emerald-600 transition-colors ml-1"
//             >
//               <CheckCircle size={18} />
//             </button>
//             {/* Decline */}
//             <button
//               title="Decline"
//               onClick={() => setModal({ row: r, type: 'decline' })}
//               className="text-red-500 hover:text-red-600 transition-colors"
//             >
//               <XCircle size={18} />
//             </button>
//           </div>
//         ),
//       },
//     ],
//     [openRow]
//   )

//   // ─────────────────────────────────────────────────────────────────────────
//   // RENDER — VIEW / EDIT MODE
//   // ─────────────────────────────────────────────────────────────────────────

//   if (view === 'view' || view === 'edit') {
//     const isEdit = view === 'edit'
//     return (
//       <div className="font-sans">
//         {/* ── Page heading ── */}
//         <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
//           <h1 className="text-[26px] font-[400] text-[#0B39B5]">{isEdit ? 'Edit' : 'View'}</h1>
//         </div>

//         <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
//           <div className="bg-white rounded-xl p-5 border border-[#dde4ee]">
//             <FinancialDataTable
//               quarters={MOCK_QUARTERS}
//               companies={MOCK_COMPANIES}
//               selectedQuarter={selectedQuarter}
//               onQuarterChange={setSelectedQuarter}
//               selectedCompany={selectedCompany}
//               onCompanyChange={setSelectedCompany}
//               ratios={ratios}
//               editableCol={isEdit ? 0 : -1}
//               onCellChange={isEdit ? handleCellChange : undefined}
//               actions={
//                 <>
//                   {/* Close — gold */}
//                   <button
//                     onClick={backToList}
//                     className="px-8 py-[10px] rounded-lg bg-[#F5A623] hover:bg-[#e09a1a]
//                                text-[13px] font-semibold text-white transition-colors"
//                   >
//                     Close
//                   </button>
//                   {/* Update (edit mode only) — blue */}
//                   {isEdit && (
//                     <button
//                       onClick={handleUpdate}
//                       className="px-8 py-[10px] rounded-lg bg-[#0B39B5] hover:bg-[#0a2e94]
//                                  text-[13px] font-semibold text-white transition-colors"
//                     >
//                       Update
//                     </button>
//                   )}
//                 </>
//               }
//             />
//           </div>
//         </div>
//       </div>
//     )
//   }

//   // ─────────────────────────────────────────────────────────────────────────
//   // RENDER — LIST MODE
//   // ─────────────────────────────────────────────────────────────────────────

//   return (
//     <div className="font-sans">
//       {/* ── Page heading + search ── */}
//       <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
//         <div className="flex items-center justify-between gap-4">
//           <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Approvals</h1>
//           <SearchFilter
//             placeholder="Search by company..."
//             mainSearch={mainSearch}
//             setMainSearch={setMainSearch}
//             filters={filters}
//             setFilters={setFilters}
//             fields={FILTER_FIELDS}
//             onSearch={handleSearch}
//             onReset={handleReset}
//             onFilterClose={handleFilterClose}
//           />
//         </div>
//       </div>

//       <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
//         {/* ── Active filter chips ── */}
//         {Object.keys(applied).length > 0 && (
//           <div className="flex flex-wrap items-center gap-2 mb-4">
//             {Object.entries(applied).map(([k, v]) => (
//               <span
//                 key={k}
//                 className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
//                            text-[12px] font-medium text-white bg-[#01C9A4]"
//               >
//                 {CHIP_LABELS[k] || k}: {formatChipValue(v)}
//                 <button
//                   onClick={() => removeChip(k)}
//                   className="hover:text-white/70 transition-colors"
//                 >
//                   <X size={13} />
//                 </button>
//               </span>
//             ))}
//             {Object.keys(applied).length > 1 && (
//               <button
//                 onClick={handleReset}
//                 className="text-[12px] font-semibold text-[#E8923A] hover:underline ml-1"
//               >
//                 Clear All
//               </button>
//             )}
//           </div>
//         )}

//         {/* ── Table ── */}
//         <CommonTable
//           columns={TABLE_COLS}
//           data={sorted}
//           sortCol={sortCol}
//           sortDir={sortDir}
//           onSort={handleSort}
//           emptyText="No Pending Approvals"
//         />
//       </div>

//       {/* ── Approve / Decline modal ── */}
//       {modal && (
//         <RequestActionModal
//           row={modal.row}
//           type={modal.type}
//           title={modal.type === 'approve' ? 'Approval' : 'Reject'}
//           defaultNotes={modal.type === 'approve' ? 'Approved' : 'Declined'}
//           onClose={() => setModal(null)}
//           onSubmit={handleAction}
//           infoFields={[
//             { label: 'Company', key: 'company' },
//             { label: 'Ticker', key: 'ticker' },
//             { label: 'Quarter', key: 'quarter' },
//             { label: 'Sent By', key: 'sentBy' },
//           ]}
//           approveReasons={['Data verified', 'Calculations match', 'All documents reviewed']}
//           declineReasons={['Data mismatch', 'Incomplete information', 'Requires revision']}
//         />
//       )}
//     </div>
//   )
// }

// export default PendingApprovalsPage

/**
 * src/pages/manager/PendingApprovalsPage.jsx
 * ============================================
 * Manager reviews financial data submitted by Data Entry users.
 *
 * Views:
 *  "list"  → table of pending approvals (infinite scroll, real API)
 *  "view"  → read-only FinancialDataTable for selected row
 *  "edit"  → editable FinancialDataTable for selected row
 *
 * API: getPendingRequestsApi / GET_PENDING_APPROVALS_CODES
 */
/**
 * src/pages/manager/PendingApprovalsPage.jsx
 * ============================================
 * Manager reviews financial data submitted by Data Entry users.
 *
 * Views:
 *  "list"  → table of pending approvals (infinite scroll, real API)
 *  "view"  → read-only FinancialDataTable for selected row
 *  "edit"  → editable FinancialDataTable for selected row
 *
 * API: getPendingRequestsApi / GET_PENDING_APPROVALS_CODES
 */

/**
 * src/pages/manager/PendingApprovalsPage.jsx
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { CheckCircle, XCircle, SquarePen, X, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import SearchFilter from '../../components/common/searchFilter/SearchFilter'
import CommonTable from '../../components/common/table/NormalTable'
import { RequestActionModal } from '../../components/common/Modals/Modals'
import FinancialDataTable, {
  MOCK_QUARTERS,
  MOCK_COMPANIES,
  MOCK_RATIOS,
} from '../../components/common/table/FinancialDataTable'
import { formatChipValue, toAPIDateOnly, toDisplayDate } from '../../utils/helpers'
import {
  getPendingRequestsApi,
  GET_PENDING_APPROVALS_CODES,
  getPendingApprovalDetailsApi,
  GET_PENDING_APPROVAL_DETAILS_CODES,
} from '../../services/manager.service'
import useInfiniteScroll from '../../hooks/useInfiniteScroll'
import { ConfirmModal } from '../../components/common'

// ─── Constants ────────────────────────────────────────────────────────────────
// ── Confirmation modal state ─────────────────────────────────────────────
// null | 'close' | 'update'

const PAGE_SIZE = 10
// Topbar 44px + main padding-top 24px + heading bar ~52px + mb-2 8px + card padding-top 20px + buffer 12px
const TABLE_MAX_HEIGHT = 'calc(100vh - 200px)'

const EMPTY_FILTERS = {
  company: '',
  ticker: '',
  sector: '',
  quarter: '',
  sentBy: '',
  dateRange: { start: '', end: '' },
}

const CHIP_LABELS = {
  company: 'Company',
  ticker: 'Ticker',
  sector: 'Sector',
  quarter: 'Quarter',
  sentBy: 'Sent By',
  dateRange: 'Date',
}

const FILTER_FIELDS = [
  { key: 'company', label: 'Company Name', type: 'input', maxLength: 50 },
  { key: 'ticker', label: 'Ticker', type: 'input', maxLength: 10 },
  { key: 'sector', label: 'Sector', type: 'input', maxLength: 50 },
  {
    key: 'quarter',
    label: 'Quarter',
    type: 'select',
    options: ['Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025'],
  },
  { key: 'sentBy', label: 'Sent By', type: 'input', maxLength: 50 },
  { key: 'dateRange', label: 'Date', type: 'daterange', placeholder: 'Select date range' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "YYYYMMDD" → "DD-MM-YYYY" */
const parseSubmittedAt = (raw) => {
  if (!raw) return '—'
  const s = String(raw)
  if (s.length !== 8) return s
  return `${s.slice(6, 8)}-${s.slice(4, 6)}-${s.slice(0, 4)}`
}

/** Map list-API row → UI row */
const mapApproval = (r) => ({
  id: r.dataApprovalRequestID,
  quarter: r.quarterName ?? '',
  ticker: r.ticker ?? '',
  company: r.companyName ?? '',
  sector: r.sector ?? '—',
  sentBy: r.submittedByName ?? '',
  sentOn: parseSubmittedAt(r.submittedAt),
  raw: r,
})

// ─────────────────────────────────────────────────────────────────────────────
// Detail info card — shown above the financial table in view/edit mode
// ─────────────────────────────────────────────────────────────────────────────

const DetailInfoCard = ({ detail }) => {
  if (!detail) return null

  const fields = [
    { label: 'Company', value: detail.companyName },
    { label: 'Ticker', value: detail.ticker },
    { label: 'Quarter', value: detail.quarterName },
    { label: 'Status', value: detail.status },
    { label: 'Submitted By', value: detail.submittedByName },
    { label: 'Submitted At', value: parseSubmittedAt(detail.submittedAt) },
    { label: 'Start Date', value: parseSubmittedAt(detail.startDate) },
    { label: 'End Date', value: parseSubmittedAt(detail.endDate) },
  ]

  return (
    <div className="mb-4 p-4 bg-[#f8faff] border border-[#dde4ee] rounded-xl">
      {detail.description && (
        <p className="text-[12px] text-[#6b7c9e] mb-3 italic">"{detail.description}"</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[11px] font-medium text-[#6b7c9e] uppercase tracking-wide">
              {label}
            </p>
            <p className="text-[13px] font-semibold text-[#041E66] mt-0.5">{value || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PendingApprovalsPage = () => {
  // ── View state ───────────────────────────────────────────────────────────
  const [view, setView] = useState('list') // "list" | "view" | "edit"
  const [activeRow, setActiveRow] = useState(null)

  // ── Detail page state ────────────────────────────────────────────────────
  const [detail, setDetail] = useState(null) // raw API response.request object
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  // ── Financial data state ─────────────────────────────────────────────────
  const [ratios, setRatios] = useState(MOCK_RATIOS)
  const [selectedQuarter, setSelectedQuarter] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')

  // ── List / pagination state ──────────────────────────────────────────────
  const [approvals, setApprovals] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // ── Action modal ─────────────────────────────────────────────────────────
  const [modal, setModal] = useState(null)

  // ── Confirmation modal: null | 'close' | 'update' ────────────────────────
  const [confirm, setConfirm] = useState(null)

  // ── Filter + search ──────────────────────────────────────────────────────
  const [mainSearch, setMainSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [applied, setApplied] = useState({})

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('company')
  const [sortDir, setSortDir] = useState('asc')

  // ── Refs ─────────────────────────────────────────────────────────────────
  const hasFetched = useRef(false)
  const sentinelRef = useRef(null)
  const scrollRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { page, applied }

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH — LIST
  // ─────────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (appliedFilters = {}, pageNumber = 0, append = false) => {
    if (append) setLoadingMore(true)

    const params = {
      PageSize: PAGE_SIZE,
      PageNumber: pageNumber,
      FK_CompanyID: appliedFilters.FK_CompanyID || 0,
      FK_QuarterID: appliedFilters.FK_QuarterID || 0,
      FK_StatusID: appliedFilters.FK_StatusID || 0,
      DateFrom: appliedFilters.sentOnFrom || '',
      DateTo: appliedFilters.sentOnTo || '',
    }

    const result = await getPendingRequestsApi(params, { skipLoader: true })

    if (append) setLoadingMore(false)
    setLoadingInitial(false)

    if (!result.success) {
      toast.error(result.message || 'Failed to load pending approvals.', {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_03') {
      const newRows = (rr.requests ?? []).map(mapApproval)
      setApprovals((prev) => (append ? [...prev, ...newRows] : newRows))
      setTotalCount(rr.totalCount ?? newRows.length)
      return
    }

    if (code === 'Manager_ManagerServiceManager_GetPendingApprovals_02') {
      if (!append) {
        setApprovals([])
        setTotalCount(0)
      }
      return
    }

    toast.error(GET_PENDING_APPROVALS_CODES[code] || 'Something went wrong.', {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData({}, 0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // FETCH — DETAIL  (GetPendingApprovalDetails)
  // ─────────────────────────────────────────────────────────────────────────

  const fetchDetail = useCallback(async (approvalId) => {
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)

    const result = await getPendingApprovalDetailsApi(approvalId, { skipLoader: true })

    setDetailLoading(false)

    if (!result.success) {
      const msg = result.message || 'Failed to load approval details.'
      setDetailError(msg)
      toast.error(msg, {
        style: { backgroundColor: '#E74C3C', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    // ── Success ──
    if (code === 'Manager_ManagerServiceManager_GetPendingApprovalDetails_04') {
      const req = rr.request
      setDetail(req)
      // Pre-populate dropdowns from live API data
      setSelectedQuarter(req.quarterName ?? '')
      setSelectedCompany(req.companyName ?? '')
      // TODO: replace MOCK_RATIOS with real financial data API
      setRatios(MOCK_RATIOS)
      return
    }

    // ── All error codes ──
    const errMsg =
      GET_PENDING_APPROVAL_DETAILS_CODES[code] || 'Something went wrong, please try again.'
    setDetailError(errMsg)
    toast.error(errMsg, {
      style: { backgroundColor: '#E74C3C', color: '#fff' },
      progressStyle: { backgroundColor: '#ffffff50' },
    })
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────

  const openRow = useCallback(
    (row, mode) => {
      setActiveRow(row)
      setView(mode)
      fetchDetail(row.id) // ← real API call
    },
    [fetchDetail]
  )

  const backToList = useCallback(() => {
    setView('list')
    setActiveRow(null)
    setDetail(null)
    setDetailError(null)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // CELL EDIT
  // ─────────────────────────────────────────────────────────────────────────

  const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
    setRatios((prev) =>
      prev.map((ratio) =>
        ratio.id !== ratioId
          ? ratio
          : {
              ...ratio,
              classifications: ratio.classifications.map((cls) =>
                cls.id !== classId
                  ? cls
                  : { ...cls, values: cls.values.map((v, i) => (i === colIdx ? val : v)) }
              ),
            }
      )
    )
  }, [])

  // Opens the "are you sure you want to update?" confirmation
  const handleUpdate = useCallback(() => {
    setConfirm('update')
  }, [])

  const handleConfirmProceed = useCallback(() => {
    if (confirm === 'close') {
      setConfirm(null)
      backToList() // discard changes → back to list
    }

    if (confirm === 'update') {
      setConfirm(null)
      // TODO: PUT /api/manager/financial-data/:id with updated ratios
      toast.success('Record Updated Successfully.', {
        style: { backgroundColor: '#01C9A4', color: '#fff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      backToList() // save → back to list
    }
  }, [confirm, backToList])

  const handleConfirmCancel = useCallback(() => {
    setConfirm(null) // close modal, stay on edit screen, data intact
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // INFINITE SCROLL
  // ─────────────────────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    const { page: p, applied: ap } = stateRef.current
    setPage(p + 1)
    fetchData(ap, p + 1, true)
  }, [fetchData])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore: approvals.length < totalCount,
    loading: loadingMore,
    onLoadMore: handleLoadMore,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH + FILTER
  // ─────────────────────────────────────────────────────────────────────────

  const handleSearch = () => {
    const newApplied = {}
    if (mainSearch.trim()) newApplied.company = mainSearch.trim()

    Object.entries(filters).forEach(([k, v]) => {
      if (!v) return
      if (k === 'dateRange') {
        if (v.start || v.end) {
          newApplied.dateRange = v
          if (v.start) newApplied.sentOnFrom = toAPIDateOnly(v.start)
          if (v.end) newApplied.sentOnTo = toAPIDateOnly(v.end)
        }
        return
      }
      if (typeof v === 'string' && v.trim()) newApplied[k] = v.trim()
    })

    setApplied(newApplied)
    setPage(0)
    fetchData(newApplied, 0, false)
    setFilters(EMPTY_FILTERS)
  }

  const handleReset = useCallback(() => {
    setMainSearch('')
    setFilters(EMPTY_FILTERS)
    setApplied({})
    setPage(0)
    fetchData({}, 0, false)
  }, [fetchData])

  const handleFilterClose = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const removeChip = useCallback(
    (key) => {
      const next = { ...applied }
      if (key === 'dateRange') {
        delete next.dateRange
        delete next.sentOnFrom
        delete next.sentOnTo
      } else delete next[key]
      setApplied(next)
      setPage(0)
      fetchData(next, 0, false)
    },
    [applied, fetchData]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SORT
  // ─────────────────────────────────────────────────────────────────────────

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

  const sorted = useMemo(
    () =>
      [...approvals].sort((a, b) => {
        const va = (a[sortCol] || '').toLowerCase()
        const vb = (b[sortCol] || '').toLowerCase()
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }),
    [approvals, sortCol, sortDir]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // APPROVE / DECLINE
  // ─────────────────────────────────────────────────────────────────────────

  const handleAction = useCallback(
    async (notes) => {
      const { row, type } = modal
      // TODO: POST /api/manager/approve/:id  or  /api/manager/decline/:id
      setApprovals((prev) => prev.filter((r) => r.id !== row.id))
      setTotalCount((c) => c - 1)
      toast.success(
        type === 'approve' ? 'Request approved successfully.' : 'Request declined successfully.',
        {
          style: { backgroundColor: '#01C9A4', color: '#fff' },
          progressStyle: { backgroundColor: '#ffffff50' },
        }
      )
      setModal(null)
    },
    [modal]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // TABLE COLUMNS
  // ─────────────────────────────────────────────────────────────────────────

  const TABLE_COLS = useMemo(
    () => [
      {
        key: 'quarter',
        title: 'Quarter Name',
        sortable: true,
        render: (r) => <span className="font-semibold ">{r.quarter}</span>,
      },
      { key: 'ticker', title: 'Ticker', sortable: true, align: 'center' },
      {
        key: 'company',
        title: 'Company Name',
        sortable: true,
        align: 'center',
        render: (r) => (
          <span className="cursor-pointer" onClick={() => openRow(r, 'view')}>
            {r.company}
          </span>
        ),
      },
      { key: 'sector', title: 'Sector Name', sortable: true, align: 'center' },
      { key: 'sentBy', title: 'Sent By', sortable: true, align: 'center' },
      {
        key: 'sentOn',
        title: 'Sent On',
        sortable: true,
        align: 'center',
        render: (r) => <span className="whitespace-nowrap">{r.sentOn}</span>,
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'center',
        render: (r) => (
          <div className="flex items-center justify-center gap-1">
            <button
              title="Edit"
              onClick={() => openRow(r, 'edit')}
              className="w-8 h-8 rounded-lg text-[#0B39B5] hover:bg-[#EFF3FF]
                         flex items-center justify-center transition-all"
            >
              <SquarePen size={15} />
            </button>
            <button
              title="Approve"
              onClick={() => setModal({ row: r, type: 'approve' })}
              className="text-emerald-500 w-8 h-8 hover:text-emerald-600 transition-colors ml-1"
            >
              <CheckCircle size={18} />
            </button>
            <button
              title="Decline"
              onClick={() => setModal({ row: r, type: 'decline' })}
              className="text-red-500 w-8 h-8 hover:text-red-600 transition-colors"
            >
              <XCircle size={18} />
            </button>
          </div>
        ),
      },
    ],
    [openRow]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — VIEW / EDIT MODE
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'view' || view === 'edit') {
    const isEdit = view === 'edit'

    return (
      <div className="font-sans">
        {/* Heading */}
        <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 shadow-sm border border-slate-200">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">
            {/* {isEdit ? 'Edit' : 'View'} — Pending Approval */}
            {isEdit ? 'Edit' : 'View'}
          </h1>
        </div>

        <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
          <div className="bg-white rounded-xl p-5 border border-[#dde4ee]">
            {/* ── Detail loading spinner ── */}
            {detailLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                <p className="text-[13px] text-[#6b7c9e]">Loading approval details…</p>
              </div>
            )}

            {/* ── Detail error state ── */}
            {!detailLoading && detailError && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle size={36} className="text-red-400" />
                <p className="text-[14px] font-medium text-red-500">{detailError}</p>
                <button
                  onClick={() => fetchDetail(activeRow?.id)}
                  className="mt-2 px-5 py-2 rounded-lg bg-[#0B39B5] text-white
                             text-[13px] font-semibold hover:bg-[#0a2e94] transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── Detail loaded ── */}
            {!detailLoading && !detailError && detail && (
              <>
                {/* <DetailInfoCard detail={detail} /> */}

                <FinancialDataTable
                  quarters={MOCK_QUARTERS}
                  companies={MOCK_COMPANIES}
                  selectedQuarter={selectedQuarter}
                  onQuarterChange={setSelectedQuarter}
                  selectedCompany={selectedCompany}
                  onCompanyChange={setSelectedCompany}
                  ratios={ratios}
                  searched
                  editableCol={isEdit ? 0 : -1}
                  onCellChange={isEdit ? handleCellChange : undefined}
                  disableQuarter={!isEdit}
                  disableCompany={!isEdit}
                  actions={
                    <>
                      {/* ── Close ── */}
                      {/* View mode: close immediately (nothing to lose) */}
                      {/* Edit mode: prompt before discarding changes     */}
                      <button
                        onClick={isEdit ? () => setConfirm('close') : backToList}
                        className="px-8 py-[10px] rounded-lg bg-[#F5A623] hover:bg-[#e09a1a]
                                   text-[13px] font-semibold text-white transition-colors"
                      >
                        Close
                      </button>

                      {/* ── Update (edit mode only) ── */}
                      {isEdit && (
                        <button
                          onClick={handleUpdate}
                          className="px-8 py-[10px] rounded-lg bg-[#0B39B5] hover:bg-[#0a2e94]
                                     text-[13px] font-semibold text-white transition-colors"
                        >
                          Update
                        </button>
                      )}
                    </>
                  }
                />
              </>
            )}
          </div>
        </div>

        {/* ── Confirmation modal (Close / Update) ── */}
        <ConfirmModal
          open={!!confirm}
          message={
            confirm === 'close'
              ? 'All the changes will be lost. Are you sure you want to close?'
              : 'Are you sure you want to update the information?'
          }
          onYes={handleConfirmProceed} // Proceed
          onNo={handleConfirmCancel} // Cancel
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — LIST MODE
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans">
      <div className="bg-[#EFF3FF] rounded-xl p-2 mb-2 border border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[26px] font-[400] text-[#0B39B5]">Pending Approvals</h1>
          <SearchFilter
            placeholder="Company Name"
            mainSearch={mainSearch}
            setMainSearch={setMainSearch}
            mainSearchKey="company"
            filters={filters}
            setFilters={setFilters}
            fields={FILTER_FIELDS}
            showFilterPanel={true}
            onSearch={handleSearch}
            onReset={handleReset}
            onFilterClose={handleFilterClose}
          />
        </div>
      </div>

      <div className="bg-[#EFF3FF] rounded-xl p-5 mb-5">
        {/* Filter chips */}
        {Object.keys(applied).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {Object.entries(applied)
              .filter(([k]) => k !== 'sentOnFrom' && k !== 'sentOnTo')
              .map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                             text-[12px] font-medium text-white bg-[#01C9A4]"
                >
                  {k === 'dateRange'
                    ? `Date: ${v.start ? toDisplayDate(v.start) : '…'} → ${v.end ? toDisplayDate(v.end) : '…'}`
                    : `${CHIP_LABELS[k] || k}: ${formatChipValue(v)}`}
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

        <CommonTable
          columns={TABLE_COLS}
          data={loadingInitial ? [] : sorted}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={handleSort}
          emptyText={loadingInitial ? '' : 'No Pending Approvals'}
          scrollable
          maxHeight={TABLE_MAX_HEIGHT}
          scrollRef={scrollRef}
          footerSlot={
            <>
              {loadingInitial && (
                <div className="flex justify-center py-14">
                  <div className="w-7 h-7 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}
              <div ref={sentinelRef} className="h-px" />
              {loadingMore && (
                <div className="flex justify-center py-5">
                  <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                </div>
              )}
              {!loadingInitial &&
                !loadingMore &&
                totalCount > PAGE_SIZE &&
                approvals.length >= totalCount && (
                  <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
                )}
            </>
          }
        />
      </div>

      {modal && (
        <RequestActionModal
          row={modal.row}
          type={modal.type}
          title={modal.type === 'approve' ? 'Approval' : 'Reject'}
          defaultNotes={modal.type === 'approve' ? 'Approved' : 'Declined'}
          onClose={() => setModal(null)}
          onSubmit={handleAction}
          infoFields={[
            { label: 'Company', key: 'company' },
            { label: 'Ticker', key: 'ticker' },
            { label: 'Quarter', key: 'quarter' },
            { label: 'Sent By', key: 'sentBy' },
          ]}
          approveReasons={['Data verified', 'Calculations match', 'All documents reviewed']}
          declineReasons={['Data mismatch', 'Incomplete information', 'Requires revision']}
        />
      )}
    </div>
  )
}

export default PendingApprovalsPage
