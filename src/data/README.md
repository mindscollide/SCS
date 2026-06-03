# data

Static mock/seed data — **temporary scaffolding only**.

> ⚠️ All files in this folder are placeholders used while real API endpoints are being wired.
> Delete imports from here as each page is connected to its real API.

| File | Contents | Used by |
|---|---|---|
| `mockData.js` | Companies, sectors, quarters, markets, financial ratios, compliance criteria, market cap values, report results | See list below |

## Pages still importing from `mockData.js`

These pages need real API wiring before `mockData.js` can be removed:

**Manager — Report pages (8)**
- `ComplianceStandingPage` — companies, criteria, results
- `QuarterWiseReportPage` — quarters, sectors, companies, criteria, results
- `MarketCapPage` — companies, quarters, market cap table data
- `CompanyListingPage` — companies, sectors, markets, filter options
- `DataNotReceivedPage` — quarters, results
- `QuarterlySummaryPage` — quarters, summary data
- `ShariaNoticePage` — quarters, compliant/non-compliant changes
- `BasketManagementPage` — basket data

**Manager — Setup/Config pages (3)**
- `ComplianceCriteriaPage` — criteria list
- `ManageComplianceCriteriaPage` — financial ratios dropdown
- `PendingApprovalsPage` — quarters, companies, ratios for edit form

**Data Entry pages (4)**
- `FinancialDataListPage` — financial records
- `AddFinancialDataPage` — quarters, companies
- `ViewFinancialDataPage` — quarters
- `PendingForApprovalPage` — pending records
