# pages

Route-level page components, organised by user role.

| Folder | Role | Notes |
|---|---|---|
| `auth/` | Public | Login, Signup, Forgot/Reset/Create Password, Multiple Login |
| `admin/` | Admin | Manage Users, User Groups, Pending Requests, Formula Builder, Audit Trail |
| `manager/` | Manager | Pending Approvals, Setups, Configurations, Reports |
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
