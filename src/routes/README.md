# routes

Centralised React Router v6 configuration.

| File | Description |
|---|---|
| `router.jsx` | Single `createBrowserRouter` export — all routes defined here, all pages lazy-loaded via `React.lazy` |
| `PrivateRoute.jsx` | Checks `sessionStorage.getItem('auth_token')` — redirects to `/login` if absent; also guards against bfcache restore |
| `RoleRoute.jsx` | Checks `user_roles` in sessionStorage — redirects non-matching role to their home route |

## Role home routes

| Role | RoleID | Home |
|---|---|---|
| Admin | 1 | `/admin/users` |
| Manager | 2 | `/manager/pending-approvals` |
| Data Entry | 3 | `/data-entry/financial-data` |

## Full route map

```
/                               → redirect to /login
/login                          → LoginPage
/signup                         → SignupPage
/forgot-password                → ForgotPasswordPage
/reset-password                 → ResetPasswordPage
/create-password                → CreatePasswordPage
/multiple-login                 → MultipleLoginPage

/scs  (AppLayout — PrivateRoute)
  change-password               → ChangePasswordPage  (all roles)

  ── Admin (RoleRoute: [1]) ─────────────────────────────────────────
  admin/users                   → ManageUsersPage
  admin/user-groups             → UserGroupsPage
  admin/pending-requests        → PendingRequestsPage
  admin/formula-builder         → FormulaBuilderPage
  admin/audit-trail             → AuditTrailPage

  ── Manager (RoleRoute: [2]) ───────────────────────────────────────
  manager/pending-approvals     → PendingApprovalsPage
  manager/bulk-action           → BulkActionPage

  Setups:
  manager/markets               → MarketsPage
  manager/sectors               → SectorsPage
  manager/quarters              → QuartersPage
  manager/companies             → CompaniesPage
  manager/classifications       → ClassificationsPage
  manager/financial-ratios      → FinancialRatiosPage       (FinancialRatioProvider)
  manager/financial-ratios/manage → ManageFinancialRatioPage

  Configurations:
  manager/suspended-companies   → SuspendedCompaniesPage
  manager/sukuk                 → SukukListPage
  manager/islamic-banks         → IslamicBanksPage
  manager/islamic-bank-windows  → IslamicBankWindowsPage
  manager/charitable-orgs       → CharitableOrgsPage

  Compliance:
  manager/compliance-criteria   → ComplianceCriteriaPage    (ComplianceCriteriaProvider)
  manager/compliance-criteria/manage → ManageComplianceCriteriaPage

  Reports:
  manager/reports/compliance-standing  → ComplianceStandingPage
  manager/reports/basket-management    → BasketManagementPage
  manager/reports/quarter-wise         → QuarterWiseReportPage
  manager/reports/market-cap           → MarketCapPage
  manager/reports/company-listing      → CompanyListingPage
  manager/reports/sharia-notice        → ShariaNoticePage
  manager/reports/data-not-received    → DataNotReceivedPage
  manager/reports/quarterly-summary    → QuarterlySummaryPage

  ── Data Entry (RoleRoute: [3]) ────────────────────────────────────
  data-entry/  (FinancialDataProvider)
    financial-data              → FinancialDataListPage
    financial-data/add          → AddFinancialDataPage
    financial-data/view/:id     → ViewFinancialDataPage
    pending-approval            → PendingForApprovalPage
    market-cap                  → MarketCapEntryPage
    reports/compliance-standing → ComplianceStandingPage   (shared with Manager)
```

## Lazy loading

All pages are wrapped in `React.lazy` + `React.Suspense` (two levels):
- Outer: `App.jsx` — handles very first load
- Inner: `AppLayout.jsx` — sidebar/topbar stay visible during page transitions

## Guards

- **`PrivateRoute`** — `sessionStorage.getItem('auth_token')` must be present
  - Also handles bfcache: listens to `pageshow` event, if `e.persisted` and no token → redirect to `/login`
- **`RoleRoute`** — reads `user_roles` from sessionStorage, checks against `allowedRoleIds[]`
  - Redirects to role home if mismatch
