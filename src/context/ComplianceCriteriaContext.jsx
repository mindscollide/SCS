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

// export const INITIAL_CRITERIA = [
//   {
//     id: 1,
//     name: 'Al-Hilal Standard Criteria',
//     desc: 'Standard Shariah compliance criteria used by Hilal Investments',
//     isDefault: true,
//     status: 'Active',
//     ratios: [
//       {
//         id: 101,
//         ratioId: 1,
//         ratioName: 'Interest Bearing Debts to Total Assets',
//         seq: 1,
//         unit: '%',
//         threshold: 33,
//         type: 'Maximum',
//       },
//       {
//         id: 102,
//         ratioId: 2,
//         ratioName: 'Illiquid Assets to Total Assets',
//         seq: 2,
//         unit: '%',
//         threshold: 67,
//         type: 'Minimum',
//       },
//     ],
//   },
//   {
//     id: 2,
//     name: 'AAOIFI Criteria',
//     desc: 'Based on AAOIFI standards for Islamic finance',
//     isDefault: false,
//     status: 'Active',
//     ratios: [
//       {
//         id: 201,
//         ratioId: 1,
//         ratioName: 'Interest Bearing Debts to Total Assets',
//         seq: 1,
//         unit: '%',
//         threshold: 33,
//         type: 'Maximum',
//       },
//     ],
//   },
//   {
//     id: 3,
//     name: 'Dow Jones Islamic Index',
//     desc: 'Criteria based on Dow Jones Islamic Market Index methodology',
//     isDefault: false,
//     status: 'Active',
//     ratios: [],
//   },
// ]

export const INITIAL_CRITERIA = {
  complianceCriteria: [
    {
      pK_ComplianceCriteriaID: 6,
      criteriaName: 'Standard Shariah Screen',
      description: 'General compliance rules for equity screening.',
      fK_ComplianceCriteriaStatusID: 1,
      status: 'Active',
      isDefault: true,
      createdDate: '2026-05-08 08:13:30',
      lastModifiedDate: '2026-05-08 08:13:30',
    },
    {
      pK_ComplianceCriteriaID: 5,
      criteriaName: 'Cash and Receivables Screen',
      description: 'Ensures cash and interest-bearing securities remain within acceptable limits',
      fK_ComplianceCriteriaStatusID: 2,
      status: 'Inactive',
      isDefault: false,
      createdDate: '2026-05-05 13:37:51',
      lastModifiedDate: '2026-05-05 13:37:51',
    },
    {
      pK_ComplianceCriteriaID: 2,
      criteriaName: 'Debt Ratio Criteria',
      description:
        'Evaluates company debt levels against total assets to ensure Shariah compliance',
      fK_ComplianceCriteriaStatusID: 1,
      status: 'Active',
      isDefault: false,
      createdDate: '2026-05-05 13:37:51',
      lastModifiedDate: '2026-05-05 13:37:51',
    },
    {
      pK_ComplianceCriteriaID: 3,
      criteriaName: 'Interest Income Criteria',
      description: 'Screens companies based on permissible interest income thresholds',
      fK_ComplianceCriteriaStatusID: 1,
      status: 'Active',
      isDefault: false,
      createdDate: '2026-05-05 13:37:51',
      lastModifiedDate: '2026-05-05 13:37:51',
    },
    {
      pK_ComplianceCriteriaID: 4,
      criteriaName: 'Prohibited Activity Screen',
      description: 'Identifies and excludes companies involved in haram business activities',
      fK_ComplianceCriteriaStatusID: 1,
      status: 'Active',
      isDefault: false,
      createdDate: '2026-05-05 13:37:51',
      lastModifiedDate: '2026-05-05 13:37:51',
    },
    {
      pK_ComplianceCriteriaID: 1,
      criteriaName: 'Shariah Standard Criteria',
      description:
        'Primary compliance criteria based on AAOIFI Shariah standards for equity screening',
      fK_ComplianceCriteriaStatusID: 1,
      status: 'Active',
      isDefault: false,
      createdDate: '2026-05-05 13:37:51',
      lastModifiedDate: '2026-05-05 13:37:51',
    },
  ],
}

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
