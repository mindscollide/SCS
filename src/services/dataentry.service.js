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
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_05 — Success
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_06 — Duplicate (Quarter + Company exists)
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_07 — Record not found (update) or DB error
 * DataEntry_DataEntryServiceManager_SaveMarketCapitalization_08 — Unexpected exception
 */
export const SAVE_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_02: 'Company is required.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_03: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_04: 'Market capitalization value must be greater than zero.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_05: null, // success
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_06: 'This company already has a record for the selected quarter.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_07: 'Record not found or failed to save.',
  DataEntry_DataEntryServiceManager_SaveMarketCapitalization_08: 'Something went wrong, please try again.',
}

/**
 * Create or update a market capitalization record.
 * PK_MarketCapitalizationID = 0 → INSERT; > 0 → UPDATE (Value only).
 * @param {object} params
 * @param {number}  params.PK_MarketCapitalizationID — 0 = create, >0 = update
 * @param {number}  params.FK_CompanyID
 * @param {number}  params.FK_QuarterID
 * @param {number}  params.Value                     — must be > 0
 */
export const SaveMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.SAVE_MARKET_CAPITALIZATION, {
    PK_MarketCapitalizationID: params.PK_MarketCapitalizationID || 0,
    FK_CompanyID:              params.FK_CompanyID              || 0,
    FK_QuarterID:              params.FK_QuarterID              || 0,
    Value:                     params.Value                     ?? 0,
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
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_04 — Success
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_05 — Quarter already uploaded (re-upload blocked)
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_06 — DB error / transaction rolled back
 * DataEntry_DataEntryServiceManager_UploadMarketCapitalization_07 — Unexpected exception
 */
export const UPLOAD_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_03: 'No records found in the uploaded file.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_04: null, // success
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_05: 'This quarter already has uploaded records. Re-upload is not allowed.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_06: 'Upload failed due to a database error. Please try again.',
  DataEntry_DataEntryServiceManager_UploadMarketCapitalization_07: 'Something went wrong, please try again.',
}

/**
 * Bulk insert market cap records from a parsed Excel file.
 * The entire quarter is rejected if it already has ANY records.
 * Unmatched tickers are silently skipped by the backend.
 * @param {object}   params
 * @param {number}    params.FK_QuarterID
 * @param {Array}     params.Records        — [{ Ticker: string, Value: number }]
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
 * _05 — Success (analysis complete — nothing saved)
 * _06 — Unexpected exception
 */
export const PARSE_AND_UPLOAD_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_ParseAndUploadMarketCapitalization_03: 'No records found in the uploaded file.',
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
 * @param {Array}    params.Records   — [{ Ticker: string, Value: number }]
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
 * _04 — Success
 * _05 — DB failed / rolled back
 * _06 — Unexpected exception
 */
export const BULK_SAVE_MARKET_CAPITALIZATION_CODES = {
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_01: 'Unauthorized access.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_02: 'Quarter is required.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_03: 'No records to save.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_04: null, // success
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_05: 'Save failed due to a database error. Please try again.',
  DataEntry_DataEntryServiceManager_BulkSaveMarketCapitalization_06: 'Something went wrong, please try again.',
}

/**
 * Step 2 of 2 — Upsert: INSERT new / UPDATE existing records for a quarter.
 * Pass the newMarketCapitalization array from ParseAndUploadMarketCapitalizationApi.
 * @param {object}  params
 * @param {number}   params.FK_QuarterID
 * @param {Array}    params.Records   — [{ FK_CompanyID: number, Value: number }]
 */
export const BulkSaveMarketCapitalizationApi = (params = {}, config = {}) =>
  formPost(DataEntry_URL, RM.BULK_SAVE_MARKET_CAPITALIZATION, {
    FK_QuarterID: params.FK_QuarterID || 0,
    Records:      Array.isArray(params.Records) ? params.Records : [],
  }, config)
