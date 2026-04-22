/**
 * src/context/ComplianceCriteriaContext.jsx
 * ===========================================
 * Shared state for ComplianceCriteriaPage (list) ↔ ManageComplianceCriteriaPage (add/edit).
 * Wrap both routes with <ComplianceCriteriaProvider> so context survives navigation.
 *
 * Usage:
 *   const { criteria, setCriteria, editCriteria, setEditCriteria } = useComplianceCriteria()
 */

import React, { createContext, useContext, useState } from 'react'

const ComplianceCriteriaContext = createContext(null)

export const INITIAL_CRITERIA = [
  {
    id: 1,
    name: 'Al-Hilal Standard Criteria',
    desc: 'Standard Shariah compliance criteria used by Hilal Investments',
    isDefault: true,
    status: 'Active',
    ratios: [
      {
        id: 101,
        ratioId: 1,
        ratioName: 'Interest Bearing Debts to Total Assets',
        seq: 1,
        unit: '%',
        threshold: 33,
        type: 'Maximum',
      },
      {
        id: 102,
        ratioId: 2,
        ratioName: 'Illiquid Assets to Total Assets',
        seq: 2,
        unit: '%',
        threshold: 67,
        type: 'Minimum',
      },
    ],
  },
  {
    id: 2,
    name: 'AAOIFI Criteria',
    desc: 'Based on AAOIFI standards for Islamic finance',
    isDefault: false,
    status: 'Active',
    ratios: [
      {
        id: 201,
        ratioId: 1,
        ratioName: 'Interest Bearing Debts to Total Assets',
        seq: 1,
        unit: '%',
        threshold: 33,
        type: 'Maximum',
      },
    ],
  },
  {
    id: 3,
    name: 'Dow Jones Islamic Index',
    desc: 'Criteria based on Dow Jones Islamic Market Index methodology',
    isDefault: false,
    status: 'Active',
    ratios: [],
  },
]

export const ComplianceCriteriaProvider = ({ children }) => {
  const [criteria, setCriteria] = useState(INITIAL_CRITERIA)
  const [editCriteria, setEditCriteria] = useState(null) // null = add mode

  return (
    <ComplianceCriteriaContext.Provider
      value={{ criteria, setCriteria, editCriteria, setEditCriteria }}
    >
      {children}
    </ComplianceCriteriaContext.Provider>
  )
}

export const useComplianceCriteria = () => {
  const ctx = useContext(ComplianceCriteriaContext)
  if (!ctx) throw new Error('useComplianceCriteria must be used inside ComplianceCriteriaProvider')
  return ctx
}
