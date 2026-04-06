/**
 * src/context/FinancialRatioContext.jsx
 * =======================================
 * Shared state for Financial Ratios list + wizard.
 * Wraps both /financial-ratios and /financial-ratios/manage routes.
 *
 * Provides:
 *  ratios      {Array}    — master (unfiltered) ratios list
 *  setRatios   {Function} — update master list (called after add/edit save)
 *  editRatio   {Object|null} — ratio being edited; null = add mode
 *  setEditRatio {Function}
 */

import React, { createContext, useContext, useState } from 'react'

// ── Shared initial data ───────────────────────────────────────────────────────
export const INITIAL_RATIOS = [
  {
    id: 1,
    seq: 1,
    name: 'Debt to Assets',
    numerator: 'Long-Term Finance',
    denominator: 'Total Assets',
    desc: 'Debt to Assets ratio detail',
    classifications: [
      { id: 11, name: 'Long Term Finance', calculated: false, prorated: false, base: '' },
      {
        id: 12,
        name: 'Less: Islamic Finance (LT)',
        calculated: false,
        prorated: true,
        base: 'Long term financing',
      },
      { id: 13, name: 'Total Long Term Finance', calculated: true, prorated: false, base: '' },
      { id: 14, name: 'Short Term Finance', calculated: false, prorated: false, base: '' },
      {
        id: 15,
        name: 'Less: Islamic Finance (ST)',
        calculated: false,
        prorated: true,
        base: 'Short Term Finance',
      },
    ],
    status: 'Active',
  },
  {
    id: 2,
    seq: 2,
    name: 'Non Compliant Income to Total Income',
    numerator: 'Non-compliant Income',
    denominator: 'Total Income',
    desc: '',
    classifications: [],
    status: 'Active',
  },
  {
    id: 3,
    seq: 3,
    name: 'Net Liquid Assets per Share',
    numerator: 'Total Assets',
    denominator: 'Total Long-Term Finance',
    desc: '',
    classifications: [],
    status: 'Active',
  },
  {
    id: 4,
    seq: 4,
    name: 'Non-compliant Investments to Total Assets',
    numerator: 'Non-compliant Investments',
    denominator: 'Total Assets',
    desc: '',
    classifications: [],
    status: 'Active',
  },
  {
    id: 5,
    seq: 5,
    name: 'Illiquid Assets to Total Assets',
    numerator: 'Total Long-Term Finance',
    denominator: 'Total Assets',
    desc: '',
    classifications: [],
    status: 'Active',
  },
]

// ── Context ───────────────────────────────────────────────────────────────────
const FinancialRatioContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export const FinancialRatioProvider = ({ children }) => {
  const [ratios, setRatios] = useState(INITIAL_RATIOS)
  const [editRatio, setEditRatio] = useState(null) // null = add mode

  return (
    <FinancialRatioContext.Provider value={{ ratios, setRatios, editRatio, setEditRatio }}>
      {children}
    </FinancialRatioContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useFinancialRatio = () => {
  const ctx = useContext(FinancialRatioContext)
  if (!ctx) throw new Error('useFinancialRatio must be used within <FinancialRatioProvider>')
  return ctx
}
