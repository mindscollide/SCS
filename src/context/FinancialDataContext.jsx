/**
 * src/context/FinancialDataContext.jsx
 * =====================================
 * Shared state for Data Entry financial data submissions.
 * Wraps all /data-entry routes via nested routing + Outlet.
 *
 * Provides:
 *  records          {Array}        — all financial data records
 *  setRecords       {Function}
 *  editRecord       {Object|null}  — record being edited; null = add mode
 *  setEditRecord    {Function}
 *  addRecord        {Function}     — (record) → adds to records list
 *  updateRecord     {Function}     — (id, changes) → merges changes into record
 *  sendForApproval  {Function}     — (id, notes) → sets status to Pending
 *  updateCellValue  {Function}     — (recordId, ratioId, classId, colIdx, val)
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { MOCK_RATIOS } from '../components/common/table/FinancialDataTable.jsx'

// ── Seed data ─────────────────────────────────────────────────────────────────

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
      {
        on: '2026-03-09 11:30',
        by: 'Sara Ahmed',
        status: 'Pending For Approval',
        notes: 'Please verify.',
      },
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
      {
        on: '2026-02-06 11:00',
        by: 'Bilal Khan',
        status: 'Pending For Approval',
        notes: 'Ready for review.',
      },
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
      {
        on: '2026-02-11 10:30',
        by: 'Bilal Khan',
        status: 'Pending For Approval',
        notes: 'Submitted for review.',
      },
      {
        on: '2026-02-12 15:00',
        by: 'Omar Sheikh',
        status: 'Declined',
        notes: 'Figures do not match Q2 report.',
      },
    ],
    ratios: cloneRatios(),
  },
]

// ── Context ───────────────────────────────────────────────────────────────────
const FinancialDataContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export const FinancialDataProvider = ({ children }) => {
  const [records, setRecords] = useState(INITIAL_RECORDS)
  const [editRecord, setEditRecord] = useState(null) // null = add mode

  const addRecord = useCallback((record) => {
    setRecords((prev) => [
      ...prev,
      {
        ...record,
        id: Date.now(),
        status: 'In Progress',
        history: [
          {
            on: new Date().toLocaleString(),
            by: 'Current User',
            status: 'In Progress',
            notes: '—',
          },
        ],
        ratios: record.ratios || cloneRatios(),
      },
    ])
  }, [])

  const updateRecord = useCallback((id, changes) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }, [])

  const sendForApproval = useCallback((id, notes) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const entry = {
          on: new Date().toLocaleString(),
          by: 'Current User',
          status: 'Pending For Approval',
          notes,
        }
        return { ...r, status: 'Pending For Approval', history: [...r.history, entry] }
      })
    )
  }, [])

  const updateCellValue = useCallback((recordId, ratioId, classId, colIdx, val) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r
        return {
          ...r,
          ratios: r.ratios.map((ratio) => {
            if (ratio.id !== ratioId) return ratio
            return {
              ...ratio,
              classifications: ratio.classifications.map((cls) => {
                if (cls.id !== classId) return cls
                const newValues = [...cls.values]
                newValues[colIdx] = val
                return { ...cls, values: newValues }
              }),
            }
          }),
        }
      })
    )
  }, [])

  return (
    <FinancialDataContext.Provider
      value={{
        records,
        setRecords,
        editRecord,
        setEditRecord,
        addRecord,
        updateRecord,
        sendForApproval,
        updateCellValue,
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
