# pages

Route-level page components, organised by user role.

| Folder | Role | Count |
|---|---|---|
| `auth/` | Public | 6 pages |
| `admin/` | Admin (RoleID 1) | 5 pages |
| `manager/` | Manager (RoleID 2) | 24 pages |
| `dataentry/` | Data Entry (RoleID 3) | 5 pages |
| `shared/` | All roles | 1 page |

---

## Auth pages (`auth/`)

| File | Route | Status |
|---|---|---|
| `LoginPage.jsx` | `/login` | ✅ Done |
| `SignupPage.jsx` | `/signup` | ✅ Done |
| `ForgotPasswordPage.jsx` | `/forgot-password` | ✅ Done |
| `ResetPasswordPage.jsx` | `/reset-password` | ✅ Done |
| `CreatePasswordPage.jsx` | `/create-password` | ✅ Done |
| `MultipleLoginPage.jsx` | `/multiple-login` | ✅ Done |

---

## Admin pages (`admin/`)

| File | Route | Status |
|---|---|---|
| `ManageUsersPage.jsx` | `/admin/users` | ✅ Done — MQTT: `SIGNUP_REQUEST_APPROVED`, `USER_DETAILS_UPDATED`, `GROUP_CREATED/UPDATED/DELETED` |
| `UserGroupsPage.jsx` | `/admin/user-groups` | ✅ Done — MQTT: `GROUP_CREATED/UPDATED/DELETED` |
| `PendingRequestsPage.jsx` | `/admin/pending-requests` | ✅ Done — MQTT: `NEW_SIGNUP_REQUEST`, `SIGNUP_REQUEST_APPROVED/DECLINED` |
| `FormulaBuilderPage.jsx` | `/admin/formula-builder` | ✅ Done — MQTT: `FORMULA_CREATED/UPDATED` |
| `AuditTrailPage.jsx` | `/admin/audit-trail` | ✅ Done |

---

## Manager pages (`manager/`)

### Pending Approvals

| File | Route | Status |
|---|---|---|
| `PendingApprovalsPage.jsx` | `/manager/pending-approvals` | ⚠️ Partial — core list/approve/decline API wired; MOCK_QUARTERS, MOCK_COMPANIES, MOCK_RATIOS still used in edit form — MQTT: `PENDING_APPROVAL_UPDATED` ✅ |
| `BulkActionPage.jsx` | `/manager/bulk-action` | ✅ Done — MQTT: `PENDING_APPROVAL_UPDATED` ✅ |

### Setups

| File | Route | Status |
|---|---|---|
| `MarketsPage.jsx` | `/manager/markets` | ✅ Done — MQTT: `MARKET_SAVED` ✅ |
| `SectorsPage.jsx` | `/manager/sectors` | ✅ Done — MQTT: `SECTOR_SAVED` ✅ |
| `QuartersPage.jsx` | `/manager/quarters` | ✅ Done — MQTT: `QUARTER_SAVED` ✅ |
| `CompaniesPage.jsx` | `/manager/companies` | ✅ Done — MQTT: `COMPANY_SAVED` ✅ |
| `ClassificationsPage.jsx` | `/manager/classifications` | ✅ Done — MQTT: `CLASSIFICATION_SAVED` ✅ |
| `FinancialRatiosPage.jsx` | `/manager/financial-ratios` | ✅ API done — ❌ MQTT `FINANCIAL_RATIO_SAVED` **PENDING** |
| `ManageFinancialRatioPage.jsx` | `/manager/financial-ratios/manage` | ✅ Done |

#### ManageFinancialRatioPage — key behaviours
- **Step 1** — Ratio Name uniqueness checked on blur via `CheckFinancialRatioName`; Numerator/Denominator from `GetAllActiveClassificationsApi` (open API, loaded on mount, mutually exclusive)
- **Step 2** — Classifications via `LazySearchableSelect` + `getClassificationsApi`; API called **once** on first open, cached in `classifCacheRef`; subsequent opens filter locally — no extra network calls; already-added items excluded via `excludeValues`
- **Calculated pill** (amber "Yes") — clickable → opens `FormulaModal` → calls `GetFormulaByClassificationIDApi`; shows formula token pills or "No formula assigned"
- **Prorated pill** (teal "Yes") — display only, no click action
- Both columns show `—` dash when false

### Configurations

| File | Route | Status |
|---|---|---|
| `SuspendedCompaniesPage.jsx` | `/manager/suspended-companies` | ✅ Done — MQTT: `SUSPENDED_COMPANY_SAVED/DELETED` ✅ |
| `SukukListPage.jsx` | `/manager/sukuk` | ✅ Done — MQTT: `SUKUK_SAVED` ✅ |
| `IslamicBanksPage.jsx` | `/manager/islamic-banks` | ✅ Done — MQTT: `ISLAMIC_BANK_SAVED` ✅ |
| `IslamicBankWindowsPage.jsx` | `/manager/islamic-bank-windows` | ✅ Done — MQTT: `ISLAMIC_BANK_WINDOW_SAVED` ✅ |
| `CharitableOrgsPage.jsx` | `/manager/charitable-orgs` | ✅ Done — MQTT: `CHARITABLE_ORG_SAVED` ✅ |

### Compliance

| File | Route | Status |
|---|---|---|
| `ComplianceCriteriaPage.jsx` | `/manager/compliance-criteria` | ❌ Mock data — needs `GetComplianceCriteriaApi` + lazy load; ❌ MQTT `COMPLIANCE_CRITERIA_SAVED` **PENDING** |
| `ManageComplianceCriteriaPage.jsx` | `/manager/compliance-criteria/manage` | ⚠️ Partial — MOCK_RATIOS used for financial ratios dropdown — needs `GetFinancialRatiosApi` |

### Reports (all using mock data — ❌ API wiring pending)

| File | Route | Description | Status |
|---|---|---|---|
| `ComplianceStandingPage.jsx` | `/manager/reports/compliance-standing` | Companies × Criteria compliance result table | ❌ Mock |
| `BasketManagementPage.jsx` | `/manager/reports/basket-management` | Basket/portfolio compliance view | ❌ Mock |
| `QuarterWiseReportPage.jsx` | `/manager/reports/quarter-wise` | Company compliance per quarter | ❌ Mock |
| `MarketCapPage.jsx` | `/manager/reports/market-cap` | Market capitalisation per company per quarter | ❌ Mock + ❌ MQTT `MARKET_CAP_SAVED/DELETED/UPLOADED` **PENDING** |
| `CompanyListingPage.jsx` | `/manager/reports/company-listing` | Filterable list of all listed companies | ❌ Mock |
| `ShariaNoticePage.jsx` | `/manager/reports/sharia-notice` | Companies that changed compliance status this quarter | ❌ Mock |
| `DataNotReceivedPage.jsx` | `/manager/reports/data-not-received` | Companies that haven't submitted data for selected quarter | ❌ Mock |
| `QuarterlySummaryPage.jsx` | `/manager/reports/quarterly-summary` | Compliant/non-compliant/suspended counts per quarter | ❌ Mock |

---

## Data Entry pages (`dataentry/`)

| File | Route | Status |
|---|---|---|
| `FinancialDataListPage.jsx` | `/data-entry/financial-data` | ❌ Mock — needs real GET + send-for-approval API; ❌ MQTT `DATA_SUBMISSION_STATUS_UPDATED` **PENDING** |
| `AddFinancialDataPage.jsx` | `/data-entry/financial-data/add` | ❌ Mock quarters/companies — needs real API wiring |
| `ViewFinancialDataPage.jsx` | `/data-entry/financial-data/view/:id` | ⚠️ Partial — mock quarters |
| `PendingForApprovalPage.jsx` | `/data-entry/pending-approval` | ❌ Mock — needs real GET API; ❌ MQTT `DATA_SUBMISSION_STATUS_UPDATED` **PENDING** |
| `MarketCapEntryPage.jsx` | `/data-entry/market-cap` | ✅ Done |

#### MarketCapEntryPage — key behaviours
- **Filter pattern** — SearchFilter + applied chips; Quarter and Company filters are independent (no dependency)
- **Manual entry** — Save single record via `SaveMarketCapitalizationApi`; delete via `DeleteMarketCapitalizationApi`
- **2-step Excel upload**:
  1. File picker (drag-and-drop, `.xls`/`.xlsx`) + Quarter select in modal
  2. SheetJS parses `SYMBOL→Ticker`, `Market Capitalization→Value`; rows with empty Ticker or Value ≤ 0 skipped
  3. `ParseAndUploadMarketCapitalizationApi` → analysis only (no save) → returns 3 arrays: `newMarketCapitalization`, `marketCapAlreadyExists`, `companiesNotFound`
  4. Results shown in 3 colour-coded tables (green / amber / red)
  5. `BulkSaveMarketCapitalizationApi` → actual upsert from `newMarketCapitalization`

---

## Shared pages (`shared/`)

| File | Route | Status |
|---|---|---|
| `ChangePasswordPage.jsx` | `/scs/change-password` | ✅ Done — accessible to all roles |

---

## Pending summary

| Category | Count |
|---|---|
| MQTT handlers not yet implemented | 6 |
| Report pages (all mock, need real API) | 8 |
| Setup/DataEntry pages (partial mock) | 7 |
| **Total** | **21** |

See `src/context/README.md` for the full MQTT pending breakdown with payload shapes.
