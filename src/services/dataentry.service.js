/**
 * src/services/dataentry.service.js
 * ===================================
 * All DataEntry-role API calls.
 * Port 6005 | POST /DataEntry | Role: DataEntry (RoleID = 3)
 *
 * Request methods are read from .env (VITE_RM_*).
 * All functions follow the project formPost pattern:
 *   formPost(DataEntry_URL, RM.KEY, payload, config)
 */

import { formPost, DataEntry_URL } from '../utils/api'

// ─── Request Methods ──────────────────────────────────────────────────────────
const RM = {
  GET_MARKET_CAPITALIZATION:              import.meta.env.VITE_RM_GET_MARKET_CAPITALIZATION,
  SAVE_MARKET_CAPITALIZATION:             import.meta.env.VITE_RM_SAVE_MARKET_CAPITALIZATION,
  DELETE_MARKET_CAPITALIZATION:           import.meta.env.VITE_RM_DELETE_MARKET_CAPITALIZATION,
  UPLOAD_MARKET_CAPITALIZATION:           import.meta.env.VITE_RM_UPLOAD_MARKET_CAPITALIZATION,
  PARSE_AND_UPLOAD_MARKET_CAPITALIZATION: import.meta.env.VITE_RM_PARSE_AND_UPLOAD_MARKET_CAPITALIZATION,
  BULK_SAVE_MARKET_CAPITALIZATION:        import.meta.env.VITE_RM_BULK_SAVE_MARKET_CAPITALIZATION,
  GET_FINANCIAL_DATA:                     import.meta.env.VITE_RM_GET_FINANCIAL_DATA,
  GET_FINANCIAL_DATA_BY_ID:               import.meta.env.VITE_RM_GET_FINANCIAL_DATA_BY_ID,
  GET_FINANCIAL_DATA_FOR_ENTRY:           import.meta.env.VITE_RM_GET_FINANCIAL_DATA_FOR_ENTRY,
  SAVE_FINANCIAL_DATA:                    import.meta.env.VITE_RM_SAVE_FINANCIAL_DATA,
  SAVE_AND_SUBMIT_FINANCIAL_DATA:         import.meta.env.VITE_RM_SAVE_AND_SUBMIT_FINANCIAL_DATA,
  SUBMIT_FINANCIAL_DATA_FOR_APPROVAL:     import.meta.env.VITE_RM_SUBMIT_FINANCIAL_DATA_FOR_APPROVAL,
  GET_APPROVAL_HISTORY:                   import.meta.env.VITE_RM_GET_APPROVAL_HISTORY,
  GET_PENDING_FINANCIAL_DATA:             import.meta.env.VITE_RM_GET_PENDING_FINANCIAL_DATA,
  GET_AVAILABLE_COMPANIES_FOR_ENTRY:     import.meta.env.VITE_RM_GET_AVAILABLE_COMPANIES_FOR_ENTRY,
}

// ─── Market Capitalization ────────────────────────────────────────────────────

/**
 * GetMarketCapitalization response codes
 * DataEntry_DataEntryServiceManager_GetMarketCapitalization_01 — Unauthorized
 * DataEntry_DataEntryServiceManager_GetMarketCapitalization_02 — No records found
 * DataEntry_DataEntryServiceManager_GetMarketCapitalization_03 — Success
 * DataEntry_DataEntryServiceManager_GetMarketCapitalization_04 — Unexpected exception
 */
export const GET_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_GetMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_GetMarketCapitalization_02: null, // no records — handled in UI
  DataEntry_DataEntryServiceManager_GetMarketCapitalization_03: null, // success
  DataEntry_DataEntryServiceManager_GetMarketCapitalization_04: 'Something went wrong, please try again.',
}

/**
 * Fetch paginated market capitalization records with optional filters.
 * FK_QuarterID (exact) OR QuarterName (LIKE) — ID takes priority when both sent.
 * @param {object} params
 * @param {number}  params.FK_QuarterID   — 0 = all quarters
 * @param {string}  params.QuarterName    — LIKE filter (ignored if FK_QuarterID > 0)
 * @param {number}  params.FK_CompanyID   — 0 = all companies
 * @param {number}  params.FK_SectorID    — 0 = all sectors
 * @param {number}  params.PageSize
 * @param {number}  params.PageNumber     — 0-based page index
 */
export const GetMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.GET_MARKET_CAPITALIZATION, {
    FK_QuarterID: params.FK_QuarterID || 0,
    QuarterName:  params.QuarterName  || '',
    FK_CompanyID: params.FK_CompanyID || 0,
    FK_SectorID:  params.FK_SectorID  || 0,
    PageSize:     params.PageSize     ?? 10,
    PageNumber:   params.PageNumber   ?? 0,
  }, config)

// ─────────────────────────────────────────────────────────────────────────────

/**
 * SaveMarketCapitalization response codes
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_01 — Unauthorized
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_02 — FK_CompanyID required
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_03 — FK_QuarterID required
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_04 — Value must be > 0
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_05 — SharePrice invalid (added 2026-07-02)
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_06 — Success (was _05)
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_07 — Duplicate (Quarter + Company exists) (was _06)
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_08 — Record not found (update) or DB error (was _07)
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_09 — Unexpected exception (was _08)
 */
export const SAVE_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_02: 'Company is required.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_03: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_04: 'Market capitalization value must be greater than zero.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_05: 'Share price is required and must be greater than zero.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_06: null, // success
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_07: 'This company already has a record for the selected quarter.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_08: 'Record not found or failed to save.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_09: 'Something went wrong, please try again.',
}

/**
 * Create or update a market capitalization record.
 * PK_MarketCapitalizationID = 0 → INSERT; > 0 → UPDATE (Value + SharePrice only).
 * @param {object} params
 * @param {number}  params.PK_MarketCapitalizationID — 0 = create, >0 = update
 * @param {number}  params.FK_CompanyID
 * @param {number}  params.FK_QuarterID
 * @param {number}  params.Value                     — must be > 0
 * @param {number}  params.SharePrice                — must be > 0, added 2026-07-02
 */
export const SaveMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.SAVE_MARKET_CAPITALIZATION, {
    PK_MarketCapitalizationID: params.PK_MarketCapitalizationID || 0,
    FK_CompanyID:              params.FK_CompanyID              || 0,
    FK_QuarterID:              params.FK_QuarterID              || 0,
    Value:                     params.Value                     ?? 0,
    SharePrice:                params.SharePrice                ?? 0,
  }, config)

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DeleteMarketCapitalization response codes
 * DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_01 — Unauthorized
 * DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_02 — ID required
 * DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_03 — Success
 * DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_04 — Record not found
 * DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_05 — Unexpected exception
 */
export const DELETE_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_02: 'Record ID is required.',
  DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_03: null, // success
  DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_04: 'Record not found.',
  DataEntry_DataEntryServiceManager_DeleteMarketCapitalization_05: 'Something went wrong, please try again.',
}

/**
 * Permanently delete a market capitalization record by PK.
 * @param {object} params
 * @param {number}  params.PK_MarketCapitalizationID
 */
export const DeleteMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.DELETE_MARKET_CAPITALIZATION, {
    PK_MarketCapitalizationID: params.PK_MarketCapitalizationID || 0,
  }, config)

// ─────────────────────────────────────────────────────────────────────────────

/**
 * UploadMarketCapitalization response codes
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_01 — Unauthorized
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_02 — FK_QuarterID required
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_03 — Records list is empty
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_04 — SharePrice invalid in one or more records (added 2026-07-02)
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_05 — Success (was _04)
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_06 — Quarter already uploaded (re-upload blocked) (was _05)
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_07 — DB error / transaction rolled back (was _06)
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_08 — Unexpected exception (was _07)
 */
export const UPLOAD_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_03: 'No records found in the uploaded file.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_04: 'One or more records has an invalid Share Price.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_05: null, // success
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_06: 'This quarter already has uploaded records. Re-upload is not allowed.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_07: 'Upload failed due to a database error. Please try again.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_08: 'Something went wrong, please try again.',
}

/**
 * Bulk insert market cap records from a parsed Excel file.
 * The entire quarter is rejected if it already has ANY records.
 * Unmatched tickers are silently skipped by the backend.
 * @param {object}   params
 * @param {number}    params.FK_QuarterID
 * @param {Array}     params.Records  — [{ Ticker: string, Value: number, SharePrice: number }]
 */
export const UploadMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.UPLOAD_MARKET_CAPITALIZATION, {
    FK_QuarterID: params.FK_QuarterID || 0,
    Records:      Array.isArray(params.Records) ? params.Records : [],
  }, config)

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ParseAndUploadMarketCapitalization response codes
 * _01 — Unauthorized
 * _02 — FK_QuarterID required
 * _03 — Records list is empty
 * _04 — SharePrice invalid in one or more records (added 2026-07-02, fills pre-existing gap, no renumbering)
 * _05 — Success (analysis complete — nothing saved)
 * _06 — Unexpected exception
 */
export const PARSE_AND_UPLOAD_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_03: 'No records found in the uploaded file.',
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_04: 'One or more records has an invalid Share Price.',
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_05: null, // success
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_06: 'Something went wrong, please try again.',
}

/**
 * Step 1 of 2 — Analysis only, NO data saved.
 * Matches tickers against Companies and checks existing records for the quarter.
 * Returns three arrays: newMarketCapitalization, marketCapAlreadyExists, companiesNotFound.
 * Call BulkSaveMarketCapitalizationApi with newMarketCapitalization to actually save.
 * @param {object}  params
 * @param {number}   params.FK_QuarterID
 * @param {Array}    params.Records  — [{ Ticker: string, Value: number, SharePrice: number }]
 */
export const ParseAndUploadMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.PARSE_AND_UPLOAD_MARKET_CAPITALIZATION, {
    FK_QuarterID: params.FK_QuarterID || 0,
    Records:      Array.isArray(params.Records) ? params.Records : [],
  }, config)

// ─────────────────────────────────────────────────────────────────────────────

/**
 * BulkSaveMarketCapitalization response codes
 * _01 — Unauthorized
 * _02 — FK_QuarterID required
 * _03 — Records list is empty
 * _04 — SharePrice invalid in one or more records (added 2026-07-02)
 * _05 — Success (was _04)
 * _06 — DB failed / rolled back (was _05)
 * _07 — Unexpected exception (was _06)
 */
export const BULK_SAVE_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_03: 'No records to save.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_04: 'One or more records has an invalid Share Price.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_05: null, // success
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_06: 'Save failed due to a database error. Please try again.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_07: 'Something went wrong, please try again.',
}

/**
 * Step 2 of 2 — Upsert: INSERT new / UPDATE existing records for a quarter.
 * Pass the newMarketCapitalization array from ParseAndUploadMarketCapitalizationApi.
 * @param {object}  params
 * @param {number}   params.FK_QuarterID
 * @param {Array}    params.Records  — [{ FK_CompanyID: number, Value: number, SharePrice: number }]
 */
export const BulkSaveMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.BULK_SAVE_MARKET_CAPITALIZATION, {
    FK_QuarterID: params.FK_QuarterID || 0,
    Records:      Array.isArray(params.Records) ? params.Records : [],
  }, config)

// ─── Financial Data ───────────────────────────────────────────────────────────

/**
 * GetFinancialData response codes (verified 2026-06-04).
 * `null` = success or empty list (both handled in UI as "no error").
 */
export const GET_FINANCIAL_DATA_CODES = {
  DataEntry_DataEntryServiceManager_GetFinancialData_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_GetFinancialData_02: null, // no records — handled in UI
  DataEntry_DataEntryServiceManager_GetFinancialData_03: null, // success
  DataEntry_DataEntryServiceManager_GetFinancialData_04: 'Something went wrong, please try again.',
}

/**
 * Paginated list of financial data records (DataEntry role).
 * Server orders by CreationDateTime DESC.
 *
 * @param {Object} params
 * @param {string} [params.QuarterName='']               LIKE filter on quarter name
 * @param {number} [params.FK_QuarterID=0]               exact quarter id (0 = all)
 * @param {number} [params.TickerID=0]                   PK_CompanyID resolved from ticker dropdown (0 = all)
 * @param {number} [params.CompanyNameID=0]              PK_CompanyID resolved from company-name dropdown (0 = all)
 * @param {number} [params.FK_SectorID=0]                exact sector id (0 = all)
 * @param {number} [params.FK_FinancialDataStatusID=0]   0=all, 1=In Progress, 2=Pending, 3=Approved, 4=Declined
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]                 0-based page index
 *
 * Response (`responseResult`):
 *  { financialData: [...rows], totalCount, isExecuted, responseMessage }
 * Row: { pK_FinancialDataID, fK_CompanyID, companyName, ticker, fK_QuarterID, quarterName,
 *        fK_SectorID, sectorName, fK_FinancialDataStatusID, status,
 *        fK_CreatedBy, createdByName, creationDateTime, modifiedDateTime }
 */
export const GetFinancialDataApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.GET_FINANCIAL_DATA, {
    QuarterName:              params.QuarterName              || '',
    FK_QuarterID:             params.FK_QuarterID             || 0,
    TickerID:                 params.TickerID                 || 0,
    CompanyNameID:            params.CompanyNameID            || 0,
    FK_SectorID:              params.FK_SectorID              || 0,
    FK_FinancialDataStatusID: params.FK_FinancialDataStatusID || 0,
    PageSize:                 params.PageSize                 ?? 10,
    PageNumber:               params.PageNumber               ?? 0,
  }, config)

/**
 * GetFinancialDataForEntry response codes (verified 2026-06-04).
 * `null` = success or empty (handled in UI as "no error").
 */
export const GET_FINANCIAL_DATA_FOR_ENTRY_CODES = {
  DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_03: 'Company is required.',
  DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_04: 'Compliance Criteria is required.',
  DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_05: null, // no ratios mapped to criteria — UI shows empty state
  DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_06: null, // success
  DataEntry_DataEntryServiceManager_GetFinancialDataForEntry_07: 'Something went wrong, please try again.',
}

/**
 * Fetch the ratio + classification + 4-quarter value matrix for one company / quarter / criteria.
 * Read-only — does not save anything. Used by the Add Financial Data form when the
 * user clicks Search (DataEntry role).
 *
 * @param {Object} params
 * @param {number} params.FK_QuarterID              required, > 0
 * @param {number} params.FK_CompanyID              required, > 0
 * @param {number} params.FK_ComplianceCriteriaID   required, > 0 (read from default-criteria store)
 *
 * Response (`responseResult`):
 *  {
 *    quarters: [{ quarterID, quarterName }],   // 4 quarters, descending (newest first)
 *    financialRatios: [{
 *      financialRatioID, financialRatioName, thresholdValue,
 *      isMaxValidationApplied, thresholdUnit, sequence,
 *      classificationList: [{
 *        classificationID, classificationName, isProrated, isCalculated,
 *        expression: ["..."],                    // populated only when isCalculated=1
 *        isDependentClassification: [ids],       // populated only when isCalculated=0
 *        quarterlyValues: [{ quarterID, value }] // 0 when no data saved for that quarter
 *      }]
 *    }],
 *    isExecuted, responseMessage
 *  }
 */
export const GetFinancialDataForEntryApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.GET_FINANCIAL_DATA_FOR_ENTRY, {
    FK_QuarterID:            params.FK_QuarterID            || 0,
    FK_CompanyID:            params.FK_CompanyID            || 0,
    FK_ComplianceCriteriaID: params.FK_ComplianceCriteriaID || 0,
  }, config)

/**
 * SaveFinancialData response codes (verified 2026-06-04).
 * null = success / handled-in-UI; string = error toast.
 */
export const SAVE_FINANCIAL_DATA_CODES = {
  DataEntry_DataEntryServiceManager_SaveFinancialData_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_SaveFinancialData_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_SaveFinancialData_03: 'Company is required.',
  DataEntry_DataEntryServiceManager_SaveFinancialData_04: 'Compliance Criteria is required.',
  DataEntry_DataEntryServiceManager_SaveFinancialData_05: 'This submission is pending approval and cannot be edited.',
  DataEntry_DataEntryServiceManager_SaveFinancialData_06: 'This submission is approved and cannot be edited.',
  DataEntry_DataEntryServiceManager_SaveFinancialData_07: null, // success
  DataEntry_DataEntryServiceManager_SaveFinancialData_08: 'Failed to save, please try again.',
  DataEntry_DataEntryServiceManager_SaveFinancialData_09: 'Something went wrong, please try again.',
}

/**
 * Save financial data (header + classification values) — status stays In Progress (1).
 * One record per (FK_CompanyID + FK_QuarterID): the backend INSERTs or UPDATEs accordingly.
 * Blocked when the existing record is Pending (_05) or Approved (_06).
 *
 * @param {Object} params
 * @param {number} params.FK_QuarterID            required
 * @param {number} params.FK_CompanyID            required
 * @param {number} params.FK_ComplianceCriteriaID required
 * @param {Array}  params.Values                  [{ FK_ClassificationID, Value }] — current-quarter
 *                                                 values for every classification (deduped by ID).
 *                                                 Empty/omitted → header only, existing details kept.
 */
export const SaveFinancialDataApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.SAVE_FINANCIAL_DATA, {
    FK_QuarterID:            params.FK_QuarterID            || 0,
    FK_CompanyID:            params.FK_CompanyID            || 0,
    FK_ComplianceCriteriaID: params.FK_ComplianceCriteriaID || 0,
    Values: Array.isArray(params.Values) ? params.Values : [],
  }, config)

/**
 * GetFinancialDataByID response codes (verified 2026-06-04).
 * null = success / handled-in-UI; string = error toast.
 */
export const GET_FINANCIAL_DATA_BY_ID_CODES = {
  DataEntry_DataEntryServiceManager_GetFinancialDataByID_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_GetFinancialDataByID_02: 'Record ID is required.',
  DataEntry_DataEntryServiceManager_GetFinancialDataByID_03: 'Record not found.',
  DataEntry_DataEntryServiceManager_GetFinancialDataByID_04: null, // success
  DataEntry_DataEntryServiceManager_GetFinancialDataByID_05: 'Something went wrong, please try again.',
}

/**
 * Load a single saved financial-data record by PK (for Edit + View).
 * Response is the SAME shape as GetFinancialDataForEntry (quarters[], financialRatios[])
 * PLUS a `header` block:
 *   header: { pK_FinancialDataID, fK_CompanyID, companyName, ticker, fK_QuarterID, quarterName,
 *             fK_ComplianceCriteriaID, complianceCriteriaName, fK_FinancialDataStatusID, status, ... }
 * So `mapEntryDataToTable` (financialFormula.js) maps it identically; the header carries
 * the quarter/company/criteria IDs needed to pre-fill + Save the edited record.
 *
 * @param {Object} params
 * @param {number} params.PK_FinancialDataID  required, > 0
 */
export const GetFinancialDataByIDApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.GET_FINANCIAL_DATA_BY_ID, {
    PK_FinancialDataID: params.PK_FinancialDataID || 0,
  }, config)

/**
 * SaveAndSubmitFinancialData response codes (verified 2026-06-04).
 * null = success / handled-in-UI; string = error toast. Same code layout as SaveFinancialData.
 */
export const SAVE_AND_SUBMIT_FINANCIAL_DATA_CODES = {
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_03: 'Company is required.',
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_04: 'Compliance Criteria is required.',
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_05: 'This submission is already pending approval.',
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_06: 'This submission is already approved.',
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_07: null, // success
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_08: 'Failed to submit, please try again.',
  DataEntry_DataEntryServiceManager_SaveAndSubmitFinancialData_09: 'Something went wrong, please try again.',
}

/**
 * Save financial data AND submit it for Manager approval in one call (DataEntry role).
 * Sets status to Pending For Approval (2), creates a DataApprovalRequest, notifies all
 * active Managers (DB notification + MQTT `financial_data_submitted`).
 * Blocked when the existing record is Pending (_05) or Approved (_06).
 *
 * @param {Object} params
 * @param {number} params.FK_QuarterID            required
 * @param {number} params.FK_CompanyID            required
 * @param {number} params.FK_ComplianceCriteriaID required
 * @param {string} [params.Notes]                 optional submission note
 * @param {Array}  [params.Values]                [{ FK_ClassificationID, Value }] — current-quarter
 *                                                 values (deduped by ID). Empty → header only, keep details.
 */
export const SaveAndSubmitFinancialDataApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.SAVE_AND_SUBMIT_FINANCIAL_DATA, {
    FK_QuarterID:            params.FK_QuarterID            || 0,
    FK_CompanyID:            params.FK_CompanyID            || 0,
    FK_ComplianceCriteriaID: params.FK_ComplianceCriteriaID || 0,
    Notes:                   params.Notes || '',
    Values: Array.isArray(params.Values) ? params.Values : [],
  }, config)

/**
 * SubmitFinancialDataForApproval response codes (new API, 2026-06-09).
 * ⚠️ success is _06 (NOT _07). null = success / handled-in-UI.
 */
export const SUBMIT_FINANCIAL_DATA_FOR_APPROVAL_CODES = {
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_02: 'Record ID is required.',
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_03: 'Record not found.',
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_04: 'This submission is already pending approval.',
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_05: 'This submission is already approved.',
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_06: null, // success
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_07: 'Failed to submit, please try again.',
  DataEntry_DataEntryServiceManager_SubmitFinancialDataForApproval_08: 'Something went wrong, please try again.',
}

/**
 * Submit an ALREADY-SAVED draft record for Manager approval — no value edits.
 * Use this (not SaveAndSubmit) when the data is already saved and you just need to
 * send it for approval (e.g. the list-row Send icon, or the View page Send button).
 * Sets status → Pending, creates a DataApprovalRequest, notifies Managers
 * (DB notification + MQTT `financial_data_submitted`).
 * Blocked when already Pending (_04) or Approved (_05).
 *
 * @param {Object} params
 * @param {number} params.PK_FinancialDataID  required
 * @param {string} [params.Notes]             optional submission note
 */
export const SubmitFinancialDataForApprovalApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.SUBMIT_FINANCIAL_DATA_FOR_APPROVAL, {
    PK_FinancialDataID: params.PK_FinancialDataID || 0,
    Notes:              params.Notes || '',
  }, config)

/**
 * GetApprovalHistory response codes (verified 2026-06-10 against
 * `E:\SCS\Api document\SCS_FinancialData_API_Reference.md` §6 + backend source).
 * `null` = success or empty-state (both handled in UI as "no error").
 */
export const GET_APPROVAL_HISTORY_CODES = {
  DataEntry_DataEntryServiceManager_GetApprovalHistory_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_GetApprovalHistory_02: 'Record ID is required.',
  DataEntry_DataEntryServiceManager_GetApprovalHistory_03: null, // record not found / no history — modal shows empty state
  DataEntry_DataEntryServiceManager_GetApprovalHistory_04: null, // success
  DataEntry_DataEntryServiceManager_GetApprovalHistory_05: 'Something went wrong, please try again.',
}

/**
 * Approval history timeline for one FinancialData record — drives the
 * "View Approval History" modal. Allowed roles: DataEntry + Manager. Read-only, no MQTT.
 *
 * Response (`responseResult`): { history: [...], isExecuted, responseMessage }
 * Row: { actionOn: 'yyyyMMddHHmmss', fK_ActionBy, actionBy, status, notes } — oldest first.
 * Row meaning by `status`: 'In Progress' = record created (empty notes) ·
 * 'Pending For Approval' = a submit/resubmit (submitter notes) ·
 * 'Approved'/'Declined' = Manager action (manager comments).
 *
 * @param {Object} params
 * @param {number} params.PK_FinancialDataID  required (> 0)
 */
export const GetApprovalHistoryApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.GET_APPROVAL_HISTORY, {
    PK_FinancialDataID: params.PK_FinancialDataID || 0,
  }, config)

/**
 * GetPendingFinancialData response codes (verified 2026-06-11 against
 * `E:\SCS\Api document\API_Reference\04_DataEntry.md` §GetPendingFinancialData
 * and `09_Recent_Changes.md` entry #17).
 * `null` = success or empty list (both handled in UI as "no error").
 */
export const GET_PENDING_FINANCIAL_DATA_CODES = {
  DataEntry_DataEntryServiceManager_GetPendingFinancialData_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_GetPendingFinancialData_02: null, // no records — handled in UI
  DataEntry_DataEntryServiceManager_GetPendingFinancialData_03: null, // success
  DataEntry_DataEntryServiceManager_GetPendingFinancialData_04: 'Something went wrong, please try again.',
}

/**
 * Paginated list of this DataEntry user's FinancialData submissions currently in
 * "Pending For Approval" (FK_FinancialDataStatusID hard-locked to 2 on the server).
 *
 * Differences from GetFinancialDataApi:
 *  - No FK_FinancialDataStatusID — the SP always filters to status 2.
 *  - SentOnFrom / SentOnTo (yyyyMMdd) bound the LATEST PENDING DataApprovalRequest's
 *    SubmittedDateTime per row (server normalises the lower bound to yyyyMMdd000000
 *    and the upper bound to yyyyMMdd235959, so each whole day is inclusive).
 *  - Response rows include `sentOn` (yyyyMMddHHmmss), `pK_DataApprovalRequestID`,
 *    `fK_SubmittedBy`, `submittedByName`, `submissionNotes` from the join with
 *    DataApprovalRequests — no need to fall back to modifiedDateTime for "Sent On".
 *
 * Rows ordered by `SentOn DESC` on the server. Read-only — **no MQTT**.
 *
 * @param {Object} params
 * @param {string} [params.QuarterName='']    LIKE filter on quarter name
 * @param {number} [params.FK_QuarterID=0]    exact quarter id (0 = all)
 * @param {number} [params.TickerID=0]        PK_CompanyID from the ticker dropdown (0 = all)
 * @param {number} [params.CompanyNameID=0]   PK_CompanyID from the company-name dropdown (0 = all)
 * @param {number} [params.FK_SectorID=0]     exact sector id (0 = all)
 * @param {string} [params.SentOnFrom='']     yyyyMMdd (inclusive lower bound on submission day)
 * @param {string} [params.SentOnTo='']       yyyyMMdd (inclusive upper bound on submission day)
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]      0-based page index
 *
 * Response (`responseResult`):
 *  { financialData: [...rows], totalCount, isExecuted, responseMessage }
 * Row fields (camelCase):
 *  pK_FinancialDataID, fK_CompanyID, companyName, ticker, fK_QuarterID, quarterName,
 *  fK_SectorID, sectorName, fK_FinancialDataStatusID (always 2), status,
 *  fK_CreatedBy, createdByName, creationDateTime, modifiedDateTime,
 *  sentOn (yyyyMMddHHmmss), pK_DataApprovalRequestID,
 *  fK_SubmittedBy, submittedByName, submissionNotes.
 */
export const GetPendingFinancialDataApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.GET_PENDING_FINANCIAL_DATA, {
    QuarterName:   params.QuarterName   || '',
    FK_QuarterID:  params.FK_QuarterID  || 0,
    TickerID:      params.TickerID      || 0,
    CompanyNameID: params.CompanyNameID || 0,
    FK_SectorID:   params.FK_SectorID   || 0,
    SentOnFrom:    params.SentOnFrom    || '',
    SentOnTo:      params.SentOnTo      || '',
    PageSize:      params.PageSize      ?? 10,
    PageNumber:    params.PageNumber    ?? 0,
  }, config)

// ─── Available Companies for Entry ───────────────────────────────────────────

/**
 * GetAvailableCompaniesForEntry response codes (per recent_changes #35, 2026-06-22).
 *
 * SRS 11.1.2: The Company dropdown on the Add Financial Data page must show only
 * active companies whose Financial Data for the selected quarter has NOT been
 * entered yet. This API enforces that — it filters out companies that already
 * have a FinancialData row for the given quarter (any status: In Progress,
 * Pending, Approved, Declined).
 *
 * `null` = success or empty list (both handled in UI as "no error" — Law 22).
 * _03 = no available companies → dropdown renders empty, no toast.
 * _04 = success → response.companies populated.
 *
 * SP: sp_GetAvailableCompaniesForEntry (DataEntry DB).
 */
export const GET_AVAILABLE_COMPANIES_FOR_ENTRY_CODES = {
  DataEntry_DataEntryServiceManager_GetAvailableCompaniesForEntry_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_GetAvailableCompaniesForEntry_02: 'Please select a quarter.',
  DataEntry_DataEntryServiceManager_GetAvailableCompaniesForEntry_03: null, // no companies available
  DataEntry_DataEntryServiceManager_GetAvailableCompaniesForEntry_04: null, // success
  DataEntry_DataEntryServiceManager_GetAvailableCompaniesForEntry_05: 'Something went wrong, please try again.',
}

/**
 * Returns active companies that do not have Financial Data for the given quarter.
 * Used by AddFinancialDataPage to populate the Company dropdown after quarter
 * selection — replaces GetAllActiveCompanyNamesApi in the add-mode flow.
 *
 * Called via handleQuarterSelect in AddFinancialDataPage → FinancialDataForm
 * fires onQuarterSelect(quarterId) on quarter dropdown change.
 *
 * Response shape: { companies: [{ pK_CompanyID, companyName, ticker }] }
 * Companies are sorted alphabetically by companyName (server-side).
 *
 * @param {Object} params
 * @param {number} params.FK_QuarterID  required (> 0) — the selected quarter PK
 * @param {Object} [config]             { skipLoader: true } recommended
 * @returns {Promise} formPost promise → { success, data: { responseResult } }
 */
export const GetAvailableCompaniesForEntryApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.GET_AVAILABLE_COMPANIES_FOR_ENTRY, {
    FK_QuarterID: params.FK_QuarterID || 0,
  }, config)
