# context

React Context providers for cross-component shared state.

| File | Provider | Hook | Scope |
|---|---|---|---|
| `AuthContext.jsx` | `AuthProvider` | `useAuth` | Entire app — current user, role, login/logout |
| `FinancialDataContext.jsx` | `FinancialDataProvider` | `useFinancialData` | Data Entry routes — records, edit target, approval actions |
| `FinancialRatioContext.jsx` | `FinancialRatioProvider` | `useFinancialRatio` | Financial Ratios manager routes |
| `ComplianceCriteriaContext.jsx` | `ComplianceCriteriaProvider` | `useComplianceCriteria` | Compliance Criteria manager routes |

All providers are mounted in `router.jsx` at the route level, not at the app root, to limit their scope.
