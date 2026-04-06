# routes

Centralised React Router v6 configuration.

| File | Description |
|---|---|
| `router.jsx` | Single `createBrowserRouter` export. All routes defined here. |

## Route structure

```
/                          → redirect to /login
/login                     → LoginPage
/signup                    → SignupPage
/forgot-password           → ForgotPasswordPage
/reset-password            → ResetPasswordPage
/create-password           → CreatePasswordPage
/multiple-login            → MultipleLoginPage

/scs  (AppLayout)
  change-password          → ChangePasswordPage

  admin/
    users                  → ManageUsersPage
    user-groups            → UserGroupsPage
    pending-requests       → PendingRequestsPage
    formula-builder        → FormulaBuilderPage
    audit-trail            → AuditTrailPage

  manager/
    pending-approvals      → PendingApprovalsPage
    bulk-action            → BulkActionPage
    markets / sectors / quarters / companies / classifications
    financial-ratios       → FinancialRatiosPage  (FinancialRatioProvider)
    financial-ratios/manage→ ManageFinancialRatioPage
    compliance-criteria    → ComplianceCriteriaPage (ComplianceCriteriaProvider)
    compliance-criteria/manage → ManageComplianceCriteriaPage
    reports/...            → Various report pages

  data-entry  (FinancialDataProvider)
    financial-data         → FinancialDataListPage
    financial-data/add     → AddFinancialDataPage
    financial-data/view/:id→ ViewFinancialDataPage
    pending-approval       → PendingForApprovalPage
    market-cap             → MarketCapEntryPage
```
