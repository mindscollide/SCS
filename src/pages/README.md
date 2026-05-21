# pages

Route-level page components, organised by user role.

| Folder | Role | Notes |
|---|---|---|
| `auth/` | Public | Login, Signup, Forgot/Reset/Create Password, Multiple Login |
| `admin/` | Admin | Manage Users, User Groups, Pending Requests, Formula Builder, Audit Trail |
| `manager/` | Manager | Pending Approvals, Setups, Configurations, Reports, Financial Ratios |
| `dataentry/` | Data Entry | Financial Data (List/Add/View), Pending Approvals, Market Cap Entry |
| `shared/` | All roles | Change Password |

## Data Entry pages

| File | Route | Description |
|---|---|---|
| `FinancialDataListPage.jsx` | `/data-entry/financial-data` | CRUD list with status badges and action buttons |
| `AddFinancialDataPage.jsx` | `/data-entry/financial-data/add` | Add or Edit financial data with ratio table |
| `ViewFinancialDataPage.jsx` | `/data-entry/financial-data/view/:id` | Read-only view with optional Send For Approval |
| `PendingForApprovalPage.jsx` | `/data-entry/pending-approval` | Records awaiting manager action |
| `MarketCapEntryPage.jsx` | `/data-entry/market-cap` | Manual entry + Excel upload for market capitalisation |

### MarketCapEntryPage — key behaviours
- **Filter pattern** — SearchFilter + applied chips; `QuarterName` filter removed (always sends `QuarterName: ''`); Company and Quarter dropdowns are independent (no dependency between them)
- **Upload flow (2-step)**:
  1. File picker (drag-and-drop, `.xls`/`.xlsx` only) + Quarter select inside modal
  2. SheetJS parses SYMBOL→Ticker, Market Capitalization→Value columns; rows with empty Ticker or Value ≤ 0 skipped
  3. `ParseAndUploadMarketCapitalizationApi` → analysis only, returns 3 arrays: `newMarketCapitalization`, `marketCapAlreadyExists`, `companiesNotFound`
  4. Results shown in 3 colour-coded tables (green / amber / red)
  5. `BulkSaveMarketCapitalizationApi` → actual upsert using `newMarketCapitalization`

## Manager pages — Financial Ratio wizard

| File | Route | Description |
|---|---|---|
| `ManageFinancialRatioPage.jsx` | `/manager/financial-ratios/manage` | 2-step Add/Edit wizard for Financial Ratios |

### ManageFinancialRatioPage — key behaviours
- **Step 1** — Ratio Name (uniqueness checked on blur via `CheckFinancialRatioName`), Numerator / Denominator dropdowns (mutually exclusive, fed from `GetAllActiveClassificationsApi` loaded on mount), Description textarea
- **Step 2** — Classifications dropdown uses `LazySearchableSelect` + `getClassificationsApi`:
  - API called **once** on first dropdown open; results cached in `classifCacheRef`
  - All subsequent opens / search queries filter the local cache — **no additional network calls**
  - Already-added classifications excluded via `excludeValues`
  - Calculated column shows amber "Yes" pill (clickable → `FormulaModal`) or "—"
  - Prorated column shows teal "Yes" pill or "—"
  - Rows are drag-and-drop reorderable
- **FormulaModal** — opened by clicking calculated pill; calls `GetFormulaByClassificationIDApi`; shows formula token pills or "No formula assigned"
