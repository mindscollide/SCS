# manager.service.js — API Reference

All calls use `formPost(Manager_URL, RM.<KEY>, payload, config)`.  
Pass `{ skipLoader: true }` as `config` for background/modal/scroll fetches.  
`PageNumber` is **zero-based** (0, 1, 2 …).  
`null` in a CODES object means the code is handled silently in the UI.

---

## Pending Approvals

### `getPendingRequestsApi(params, config)`
Fetch a paginated list of pending approval requests.

| Param | Type | Default | Description |
|---|---|---|---|
| `FK_CompanyID` | `number` | `0` | Filter by company; 0 = all |
| `FK_QuarterID` | `number` | `0` | Filter by quarter; 0 = all |
| `FK_StatusID` | `number` | `0` | Filter by status; 0 = all |
| `DateFrom` | `string` | `''` | ISO date string |
| `DateTo` | `string` | `''` | ISO date string |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_PENDING_APPROVALS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | `null` — no records |
| `_03` | `null` — success |
| `_04` | Something went wrong, please try again |

---

### `getPendingApprovalDetailsApi(dataApprovalRequestID, config)`
Fetch details of a single pending approval request.

| Param | Type | Description |
|---|---|---|
| `dataApprovalRequestID` | `number` | Required |

**Codes:** `GET_PENDING_APPROVAL_DETAILS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | Approval request ID is required. |
| `_03` | Approval request not found. |
| `_04` | `null` — success |
| `_05` | Something went wrong, please try again. |

---

## Markets

### `getMarketApi(params, config)`
Fetch a paginated, filterable list of markets.

| Param | Type | Default | Description |
|---|---|---|---|
| `MarketName` | `string` | `''` | Partial name filter |
| `ShortCode` | `string` | `''` | Partial short-code filter |
| `FK_CountryID` | `number` | `0` | 0 = all countries |
| `FK_MarketStatusID` | `number` | `0` | 0 = all statuses |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_MARKET_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | No markets found |
| `_03` | `null` — success |
| `_04` | Something went wrong, please try again |

---

### `saveMarketApi(params, config)`
Create or update a market. Pass `PK_MarketID = 0` to create.

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_MarketID` | `number` | `0` | 0 = create new |
| `FK_CountryID` | `number` | `0` | Required |
| `MarketName` | `string` | `''` | Required; full name |
| `ShortCode` | `string` | `''` | Required; short code |
| `FK_MarketStatusID` | `number` | `0` | 1 = Active, 2 = Inactive |

**Codes:** `SAVE_MARKET_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | FK_CountryID is required |
| `_03` | Market Name (Full Name) is required |
| `_04` | Short Code (Short Name) is required |
| `_05` | `null` — success |
| `_06` | Duplicate — Market Name already exist |
| `_07` | Duplicate — Short Code already exist |
| `_08` | Something went wrong, please try again |

---

## Sectors

### `getSectorsApi(params, config)`
Fetch a paginated, filterable list of sectors.

| Param | Type | Default | Description |
|---|---|---|---|
| `SectorName` | `string` | `''` | Partial name filter |
| `FK_SectorStatusID` | `number` | `0` | 0 = all statuses |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_SECTORS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | No sectors found |
| `_03` | `null` — success |
| `_04` | Something went wrong, please try again |

---

### `saveSectorsApi(params, config)`
Create or update a sector. Pass `PK_SectorID = 0` to create.

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_SectorID` | `number` | `0` | 0 = create new |
| `SectorName` | `string` | `''` | Required |
| `FK_SectorStatusID` | `number` | `0` | 1 = Active, 2 = Inactive |

**Codes:** `SAVE_SECTORS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | Sector Name is required |
| `_03` | Sector Name invalid — alphabets only, max 50 characters |
| `_04` | `null` — success |
| `_05` | Duplicate — Sector Name already exists |
| `_06` | Failed to save, please try again |
| `_07` | Something went wrong, please try again |

---

## Quarters

### `getQuartersApi(params, config)`
Fetch a paginated, filterable list of quarters.

| Param | Type | Default | Description |
|---|---|---|---|
| `QuarterName` | `string` | `''` | Partial name filter |
| `StartDate` | `string` | `''` | yyyyMMdd format |
| `EndDate` | `string` | `''` | yyyyMMdd format |
| `FK_QuarterStatusID` | `number` | `0` | 0 = all, 1 = Active, 2 = Closed |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_QUARTERS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | No quarters found |
| `_03` | `null` — success |
| `_04` | Something went wrong, please try again |

---

### `SaveQuartersApi(params, config)`
Create or update a quarter. Pass `PK_QuarterID = 0` to create.

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_QuarterID` | `number` | `0` | 0 = create new |
| `QuarterName` | `string` | — | Required |
| `StartDate` | `string` | — | yyyyMMdd, e.g. `20260101` |
| `EndDate` | `string` | — | yyyyMMdd, e.g. `20260331` |
| `Description` | `string` | `''` | |
| `FK_QuarterStatusID` | `number` | `1` | 1 = Active, 2 = Closed |

**Codes:** `SAVE_QUARTERS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | Quarter Name is required |
| `_03` | StartDate is required (format: yyyyMMdd) |
| `_04` | EndDate is required (format: yyyyMMdd) |
| `_05` | `null` — success |
| `_06` | Duplicate — Quarter Name or date range already exists |
| `_07` | Failed to save, please try again |
| `_08` | Something went wrong, please try again |

---

## Classifications

### `getClassificationsApi(params, config)`
Fetch a paginated, filterable list of classifications.

| Param | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `''` | Partial name filter |
| `Description` | `string` | `''` | Partial description filter |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_CLASSIFICATIONS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | No classifications found |
| `_03` | `null` — success |
| `_04` | Something went wrong, please try again |

---

### `SaveClassificationsApi(params, config)`
Create or update a classification. Pass `ClassificationID = 0` to create.

| Param | Type | Default | Description |
|---|---|---|---|
| `ClassificationID` | `number` | `0` | 0 = create new |
| `Name` | `string` | — | Required |
| `Description` | `string` | `''` | |
| `IsCalculated` | `number` | `0` | 1 = yes |
| `IsProrated` | `number` | `0` | 1 = yes; requires `BaseClassificationID` |
| `BaseClassificationID` | `number` | `0` | Required when `IsProrated = 1` |
| `ClassificationStatusID` | `number` | `1` | 1 = Active, 2 = Inactive |

**Codes:** `SAVE_CLASSIFICATIONS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | Name is required |
| `_03` | `null` — success |
| `_04` | Duplicate — Name already exists |
| `_05` | Failed to save, please try again |
| `_06` | Something went wrong, please try again |
| `_07` | BaseClassificationID is required when IsProrated=1 |
| `_08` | A classification cannot be its own base classification |

---

## Companies

### `GetCompaniesApi(params, config)`
Fetch a paginated, filterable list of companies.

| Param | Type | Default | Description |
|---|---|---|---|
| `CompanyID` | `number` | `0` | Exact match by ID; 0 = all |
| `Ticker` | `string` | `''` | Partial ticker filter |
| `CompanyName` | `string` | `''` | Partial name filter |
| `FK_SectorID` | `number` | `0` | 0 = all sectors |
| `FK_MarketID` | `number` | `0` | 0 = all markets |
| `FK_ReportingMonthID` | `number` | `0` | 0 = all months |
| `FK_ReportingFrequencyID` | `number` | `0` | 0 = all frequencies |
| `GracePeriod` | `number` | `0` | 0 = all |
| `IsException` | `number` | `0` | 0 = all, 1 = exception only |
| `FK_CompanyStatusID` | `number` | `0` | 0 = all statuses |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_COMPANIES_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | No companies found |
| `_03` | `null` — success |
| `_04` | Something went wrong, please try again |

---

### `SaveCompanyApi(params, config)`
Create or update a company. Pass `PK_CompanyID = 0` to create.

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_CompanyID` | `number` | `0` | 0 = create new |
| `Ticker` | `string` | — | Required |
| `CompanyName` | `string` | — | Required |
| `FK_SectorID` | `number` | — | Required |
| `FK_MarketID` | `number` | — | Required |
| `FK_ReportingMonthID` | `number` | `0` | |
| `FK_ReportingFrequencyID` | `number` | `0` | |
| `GracePeriod` | `number` | `0` | |
| `FK_CompanyStatusID` | `number` | `0` | 1 = Active, 2 = Inactive |
| `IsException` | `number` | `0` | 1 = Shariah exception |
| `ExceptionReason` | `string` | `''` | Required when `IsException = 1` |

**Codes:** `SAVE_COMPANY_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | Ticker is required |
| `_03` | CompanyName is required |
| `_04` | FK_SectorID is required |
| `_05` | FK_MarketID is required |
| `_06` | ExceptionReason is required when IsException = 1 |
| `_07` | `null` — success |
| `_08` | Duplicate -- Ticker or Company Name already exists |
| `_09` | failed; DB insert/update returned 0 rows |
| `_10` | unexpected server exception |

---

## Lookup APIs

These return flat lists for dropdowns. No pagination.

### `GetAllActiveReportingMonthsApi(params, config)`
**Codes:** `GET_ALL_ACTIVE_REPORTING_MONTHS_CODES`

| Param | Type | Default |
|---|---|---|
| `MonthName` | `string` | `''` |

### `GetAllActiveReportingFrequencyApi(params, config)`
**Codes:** `GET_ALL_ACTIVE_REPORTING_FREQUENCY_CODES`

| Param | Type | Default |
|---|---|---|
| `FrequencyName` | `string` | `''` |

### `GetAllActiveMarketsApi(params, config)`
**Codes:** `GET_ALL_ACTIVE_MARKETS_CODES`

| Param | Type | Default |
|---|---|---|
| `MarketName` | `string` | `''` |

### `GetAllActiveSectorsApi(params, config)`
**Codes:** `GET_ALL_ACTIVE_SECTORS_CODES`

| Param | Type | Default |
|---|---|---|
| `SectorName` | `string` | `''` |

### `GetAllActiveQuartersApi(params, config)`
**Codes:** `GET_ALL_ACTIVE_QUARTERS_CODES`

| Param | Type | Default |
|---|---|---|
| `QuarterName` | `string` | `''` |

### `GetAllActiveCompanyNamesApi(params, config)`
**Codes:** `GET_ALL_ACTIVE_COMPANY_NAMES_CODES`

| Param | Type | Default |
|---|---|---|
| `CompanyName` | `string` | `''` |

### `GetAllActiveCompanyTickersApi(params, config)`
**Codes:** `GET_ALL_ACTIVE_COMPANY_TICKERS_CODES`

| Param | Type | Default |
|---|---|---|
| `Ticker` | `string` | `''` |

---

## Financial Ratios

### `GetFinancialRatiosApi(params, config)`
Fetch a paginated, filterable list of financial ratios.

| Param | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `''` | Partial name filter |
| `Description` | `string` | `''` | Partial description filter |
| `FK_FinancialRatioStatusID` | `number` | `0` | 0 = all statuses |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_ALL_FINANCIAL_RATIOS_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized - caller is not a Manager |
| `_02` | No financial ratios found matching the filters |
| `_03` | `null` — success |
| `_04` | Unexpected server exception |

---

### `GetFinancialRatioByIDApi(params, config)`
Fetch a single financial ratio by primary key.

| Param | Type | Description |
|---|---|---|
| `PK_FinancialRatiosID` | `number` | Required; must be > 0 |

**Codes:** `GET_FINANCIAL_RATIO_BY_ID_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized - caller is not a Manager |
| `_02` | PK_FinancialRatiosID is required (must be greater than 0) |
| `_03` | Not found - no ratio exists with this ID |
| `_04` | `null` — success |
| `_05` | Unexpected server exception |

---

### `CheckFinancialRatioName(params, config)`
Check whether a financial ratio name is already taken.

| Param | Type | Description |
|---|---|---|
| `Name` | `string` | Name to check |

**Codes:** `CHECK_FINANCIAL_RATIO_NAME_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized - caller is not a Manager |
| `_02` | Name is required |
| `_03` | `null` — available |
| `_04` | Unexpected server exception |

---

### `SaveFinancialRatioApi(params, config)`
Create or update a financial ratio. Pass `PK_FinancialRatiosID = 0` to create.

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_FinancialRatiosID` | `number` | `0` | 0 = create new |
| `Name` | `string` | — | Required |
| `Description` | `string` | `''` | |
| `FK_FinancialRatioStatusID` | `number` | `1` | 1 = Active |
| `FK_NumeratorClassificationID` | `number` | `0` | Required |
| `FK_DenominatorClassificationID` | `number` | `0` | Required |
| `ClassificationIDs` | `number[]` | `[]` | Required; mapped classification IDs |

**Codes:** `SAVE_FINANCIAL_RATIO_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | Name is required |
| `_03` | Numerator is required |
| `_04` | Denominator is required |
| `_05` | `null` — success |
| `_06` | Duplicate - Name already exists |
| `_07` | DB error (transaction rolled back) |
| `_08` | Unexpected server exception |
| `_09` | ClassificationIDs list is required |

---

## Formula by Classification

### `GetFormulaByClassificationIDApi(params, config)`
Fetch the formula associated with a given classification.

| Param | Type | Description |
|---|---|---|
| `ClassificationID` | `number` | Required; must be > 0 |

**Codes:** `GET_FORMULA_BY_CLASSIFICATION_ID_CODES`

| Code | Message |
|---|---|
| `_01` | ClassificationID is required |
| `_02` | Formula not found for this classification |
| `_03` | `null` — success |
| `_04` | Something went wrong, please try again |

---

## Islamic Banks

### `GetIslamicBanksApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `''` | Partial name filter |
| `Description` | `string` | `''` | Partial description filter |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_ISLAMIC_BANKS_CODES` — `_03` = success

### `SaveIslamicBankApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_IslamicBankID` | `number` | `0` | 0 = create new |
| `Name` | `string` | — | Required |

**Codes:** `SAVE_ISLAMIC_BANKS_CODES` — `_03` = success, `_04` = duplicate name

### `DeleteIslamicBankApi(params, config)`

| Param | Type | Description |
|---|---|---|
| `PK_IslamicBankID` | `number` | Required; must be > 0 |

**Codes:** `DELETE_ISLAMIC_BANKS_CODES` — `_03` = success

---

## Sukuk

### `GetSukukApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `''` | Partial name filter |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_SUKUK_CODES` — `_03` = success

### `SaveSukukApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_SukukID` | `number` | `0` | 0 = create new |
| `Name` | `string` | — | Required |

**Codes:** `SAVE_SUKUK_CODES` — `_03` = success, `_04` = duplicate name

### `DeleteSukukApi(params, config)`

| Param | Type | Description |
|---|---|---|
| `PK_SukukID` | `number` | Required; must be > 0 |

**Codes:** `DELETE_SUKUK_CODES` — `_03` = success

---

## Charitable Organizations

### `GetCharitableOrgsApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `''` | Partial name filter |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_CHARITABLE_ORGS_CODES` — `_03` = success

### `SaveCharitableOrgApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_CharitableOrganizationsID` | `number` | `0` | 0 = create new |
| `Name` | `string` | — | Required |

**Codes:** `SAVE_CHARITABLE_ORGS_CODES` — `_03` = success, `_04` = duplicate name

### `DeleteCharitableOrgApi(params, config)`

| Param | Type | Description |
|---|---|---|
| `PK_CharitableOrganizationsID` | `number` | Required; must be > 0 |

**Codes:** `DELETE_CHARITABLE_ORGS_CODES` — `_03` = success

---

## Islamic Bank Windows

### `GetIslamicBankWindowsApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `Name` | `string` | `''` | Partial name filter |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_ISLAMIC_BANK_WINDOWS_CODES` — `_03` = success

### `SaveIslamicBankWindowApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `PK_IslamicBankWindowsID` | `number` | `0` | 0 = create new |
| `Name` | `string` | — | Required |

**Codes:** `SAVE_ISLAMIC_BANK_WINDOW_CODES` — `_03` = success, `_04` = duplicate name

### `DeleteIslamicBankWindowApi(params, config)`

| Param | Type | Description |
|---|---|---|
| `PK_IslamicBankWindowsID` | `number` | Required; must be > 0 |

**Codes:** `DELETE_ISLAMIC_BANK_WINDOW_CODES` — `_03` = success

---

## Suspended Companies

### `GetSuspendedCompaniesApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `CompanyName` | `string` | `''` | Partial name filter |
| `CompanyID` | `number` | `0` | Exact match by ID; 0 = all |
| `TickerID` | `number` | `0` | 0 = all |
| `SectorID` | `number` | `0` | 0 = all sectors |
| `QuarterID` | `number` | `0` | 0 = all quarters |
| `PageSize` | `number` | `10` | |
| `PageNumber` | `number` | `0` | Zero-based |

**Codes:** `GET_SUSPENDED_COMPANIES_CODES` — `_02` = success

### `SaveSuspendedCompanyApi(params, config)`

| Param | Type | Default | Description |
|---|---|---|---|
| `IsEdit` | `number` | `0` | 0 = create new, 1 = update |
| `FK_CompanyID` | `number` | — | Required |
| `FK_FromQuarterID` | `number` | — | Required; start of suspension range |
| `FK_ToQuarterID` | `number` | — | Required; end of suspension range |

**Codes:** `SAVE_SUSPENDED_COMPANY_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | Company is required |
| `_03` | To quarter is required |
| `_04` | `null` — success |
| `_05` | Duplicate - Same Quarter range selection again a company |
| `_06` | Failed — unexpected SP result |
| `_07` | unexpected server exception |

### `DeleteSuspendedCompanyApi(params, config)`
Deletes by composite key `(FK_CompanyID, FK_FromQuarterID, FK_ToQuarterID)`.

| Param | Type | Description |
|---|---|---|
| `FK_CompanyID` | `number` | Required |
| `FK_FromQuarterID` | `number` | Required |
| `FK_ToQuarterID` | `number` | Required |

**Codes:** `DELETE_SUSPENDED_COMPANY_CODES`

| Code | Message |
|---|---|
| `_01` | Unauthorized access. |
| `_02` | FK_CompanyID is required |
| `_03` | FK_FromQuarterID is required |
| `_04` | FK_ToQuarterID is required |
| `_05` | `null` — success |
| `_06` | Record not found |
| `_07` | Failed — unexpected SP result |
| `_08` | Unexpected server exception |

---

## Notifications

### `getAllManagerNotifications(config)`
Fetch all notifications for the current manager. No params.

**Codes:** `GET_ALL_MANAGER_NOTIFICATIONS_CODES` — `_03` = success

### `markManagerNotificationsAsReadAPI(notificationIDs, config)`

| Param | Type | Description |
|---|---|---|
| `notificationIDs` | `number[]` | Array of notification IDs to mark as read |

**Codes:** `MARK_MANAGER_NOTIFICATIONS_AS_READ_CODES` — `_02` = success
