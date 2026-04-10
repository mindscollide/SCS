/**
 * src/context/FinancialDataContext.jsx
 * =====================================
 * Shared state for Data Entry financial data submissions.
 * Wraps all /data-entry routes via nested routing + Outlet.
 *
 * Pattern: useReducer (state) + services/financial.service.js (API calls)
 *
 * Context value:
 *  @prop {Array}        records         — all financial data records
 *  @prop {Object|null}  editRecord      — record being edited; null = add mode
 *  @prop {boolean}      loading         — true while API call is in-flight
 *  @prop {string|null}  error           — last error message
 *  @prop {Function}     loadRecords()   — fetch all records from API
 *  @prop {Function}     addRecord()     — POST new record
 *  @prop {Function}     updateRecord()  — PUT existing record
 *  @prop {Function}     sendForApproval(id, notes) — send record to manager
 *  @prop {Function}     updateCellValue(recordId, ratioId, classId, colIdx, val)
 *  @prop {Function}     setEditRecord(record|null)
 *  @prop {Function}     clearError()
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import { MOCK_RATIOS } from '../components/common/table/FinancialDataTable.jsx'
import {
  fetchRecords,
  createRecord,
  updateRecord as updateRecordApi,
  sendForApprovalApi,
  updateCellApi,
} from '../services/financial.service'

// ── Seed / helpers ─────────────────────────────────────────────────────────────

const cloneRatios = () =>
  MOCK_RATIOS.map((r) => ({
    ...r,
    classifications: r.classifications.map((c) => ({ ...c, values: [...c.values] })),
  }))

export const INITIAL_RECORDS = [
  {
    id: 1,
    quarter: 'September 2025',
    ticker: 'ABOT',
    company: 'Abbot Laboratories (Pakistan) Limited',
    sector: 'Pharmaceuticals',
    status: 'In Progress',
    history: [{ on: '2026-03-10 09:00', by: 'Bilal Khan', status: 'In Progress', notes: '—' }],
    ratios: cloneRatios(),
  },
  {
    id: 2,
    quarter: 'September 2025',
    ticker: 'AICL',
    company: 'Adamjee Insurance Company Limited',
    sector: 'Insurance',
    status: 'Pending For Approval',
    history: [
      { on: '2026-03-08 10:00', by: 'Sara Ahmed', status: 'In Progress', notes: '—' },
      { on: '2026-03-09 11:30', by: 'Sara Ahmed', status: 'Pending For Approval', notes: 'Please verify.' },
    ],
    ratios: cloneRatios(),
  },
  {
    id: 3,
    quarter: 'June 2025',
    ticker: 'ACPL',
    company: 'Attock Cement (Pakistan) Limited',
    sector: 'Cement',
    status: 'Approved',
    history: [
      { on: '2026-02-05 09:00', by: 'Bilal Khan', status: 'In Progress', notes: '—' },
      { on: '2026-02-06 11:00', by: 'Bilal Khan', status: 'Pending For Approval', notes: 'Ready for review.' },
      { on: '2026-02-07 14:00', by: 'Omar Sheikh', status: 'Approved', notes: 'Data verified.' },
    ],
    ratios: cloneRatios(),
  },
  {
    id: 4,
    quarter: 'June 2025',
    ticker: 'CNERGY',
    company: 'Cnergyico PK Limited',
    sector: 'Oil & Gas',
    status: 'Declined',
    history: [
      { on: '2026-02-10 09:00', by: 'Bilal Khan', status: 'In Progress', notes: '—' },
      { on: '2026-02-11 10:30', by: 'Bilal Khan', status: 'Pending For Approval', notes: 'Submitted for review.' },
      { on: '2026-02-12 15:00', by: 'Omar Sheikh', status: 'Declined', notes: 'Figures do not match Q2 report.' },
    ],
    ratios: cloneRatios(),
  },
]

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState = {
  records: INITIAL_RECORDS,  // replaced by API data on loadRecords()
  editRecord: null,
  loading: false,
  error: null,
}

// ── Reducer ───────────────────────────────────────────────────────────────────

const financialDataReducer = (state, action) => {
  switch (action.type) {

    // ── API loading states ──
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, records: action.payload }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload }

    // ── Local optimistic updates (also mirrored to API) ──
    case 'ADD_RECORD':
      return { ...state, records: [...state.records, action.payload] }

    case 'UPDATE_RECORD':
      return {
        ...state,
        records: state.records.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.changes } : r
        ),
      }

    case 'SEND_FOR_APPROVAL':
      return {
        ...state,
        records: state.records.map((r) => {
          if (r.id !== action.payload.id) return r
          const entry = {
            on: new Date().toLocaleString(),
            by: 'Current User',
            status: 'Pending For Approval',
            notes: action.payload.notes,
          }
          return { ...r, status: 'Pending For Approval', history: [...r.history, entry] }
        }),
      }

    case 'UPDATE_CELL':
      return {
        ...state,
        records: state.records.map((r) => {
          if (r.id !== action.payload.recordId) return r
          return {
            ...r,
            ratios: r.ratios.map((ratio) => {
              if (ratio.id !== action.payload.ratioId) return ratio
              return {
                ...ratio,
                classifications: ratio.classifications.map((cls) => {
                  if (cls.id !== action.payload.classId) return cls
                  const newValues = [...cls.values]
                  newValues[action.payload.colIdx] = action.payload.val
                  return { ...cls, values: newValues }
                }),
              }
            }),
          }
        }),
      }

    case 'SET_EDIT_RECORD':
      return { ...state, editRecord: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const FinancialDataContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export const FinancialDataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(financialDataReducer, initialState)

  /**
   * Load all records from API.
   * Falls back to INITIAL_RECORDS (mock) if API is not ready.
   */
  const loadRecords = useCallback(async () => {
    dispatch({ type: 'FETCH_START' })
    const result = await fetchRecords()
    if (result.success) {
      dispatch({ type: 'FETCH_SUCCESS', payload: result.data?.records || result.data })
    } else {
      // Keep existing records (mock), just clear loading
      dispatch({ type: 'FETCH_ERROR', payload: result.message })
    }
  }, [])

  /**
   * Add a new record — optimistic local update + API call.
   * @param {object} record
   */
  const addRecord = useCallback(async (record) => {
    const newRecord = {
      ...record,
      id: Date.now(),
      status: 'In Progress',
      history: [{ on: new Date().toLocaleString(), by: 'Current User', status: 'In Progress', notes: '—' }],
      ratios: record.ratios || cloneRatios(),
    }
    // Optimistic update
    dispatch({ type: 'ADD_RECORD', payload: newRecord })
    // API call (fire and forget for now; handle rollback when backend is live)
    await createRecord(newRecord)
  }, [])

  /**
   * Update an existing record — optimistic local update + API call.
   * @param {number|string} id
   * @param {object} changes
   */
  const updateRecord = useCallback(async (id, changes) => {
    dispatch({ type: 'UPDATE_RECORD', payload: { id, changes } })
    await updateRecordApi(id, changes)
  }, [])

  /**
   * Send a record for manager approval.
   * @param {number|string} id
   * @param {string} notes
   */
  const sendForApproval = useCallback(async (id, notes) => {
    dispatch({ type: 'SEND_FOR_APPROVAL', payload: { id, notes } })
    await sendForApprovalApi(id, notes)
  }, [])

  /**
   * Update a single cell value inside a record's ratio table.
   * @param {number} recordId
   * @param {number} ratioId
   * @param {number} classId
   * @param {number} colIdx
   * @param {*}      val
   */
  const updateCellValue = useCallback(async (recordId, ratioId, classId, colIdx, val) => {
    dispatch({ type: 'UPDATE_CELL', payload: { recordId, ratioId, classId, colIdx, val } })
    await updateCellApi(recordId, { ratioId, classId, colIdx, value: val })
  }, [])

  const setEditRecord = useCallback(
    (record) => dispatch({ type: 'SET_EDIT_RECORD', payload: record }),
    []
  )

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), [])

  return (
    <FinancialDataContext.Provider
      value={{
        records: state.records,
        editRecord: state.editRecord,
        loading: state.loading,
        error: state.error,
        loadRecords,
        addRecord,
        updateRecord,
        sendForApproval,
        updateCellValue,
        setEditRecord,
        clearError,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useFinancialData = () => {
  const ctx = useContext(FinancialDataContext)
  if (!ctx) throw new Error('useFinancialData must be used within <FinancialDataProvider>')
  return ctx
}
