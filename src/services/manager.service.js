/**
 * src/services/manager.service.js
 * =================================
 * All Manager-related API calls.
 */

import { formPost, Manager_URL } from '../utils/api'

// ─── Request Methods ──────────────────────────────────────────────────────────
const RM = {
  GET_PENDING_APPROVALS: import.meta.env.VITE_RM_GET_PENDING_APPROVALS,
  GET_PENDING_APPROVAL_DETAILS: import.meta.env.VITE_RM_GET_PENDING_APPROVAL_DETAILS,
  GET_QUARTERS: import.meta.env.VITE_RM_GET_QUARTERS,
  SAVE_QUARTERS: import.meta.env.VITE_RM_SAVE_QUARTERS,
  GET_SECTORS: import.meta.env.VITE_RM_GET_SECTORS,
  SAVE_SECTORS: import.meta.env.VITE_RM_SAVE_SECTORS,
  GET_CLASSIFICATIONS: import.meta.env.VITE_RM_GET_CLASSIFICATIONS,
  SAVE_CLASSIFICATIONS: import.meta.env.VITE_RM_SAVE_CLASSIFICATIONS,
  GET_MARKET: import.meta.env.VITE_RM_GET_MARKET,
  SAVE_MARKET: import.meta.env.VITE_RM_SAVE_MARKET,
  GET_COMPANIES: import.meta.env.VITE_RM_GET_COMPANIES,
  SAVE_COMPANY: import.meta.env.VITE_RM_SAVE_COMPANY,
  GET_ALL_REPORTONG_ACTIVE_MONTHS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_REPORTING_MONTHS,
  GET_ALL_ACTIVE_REPORTING_FREQUENCIES: import.meta.env
    .VITE_RM_GET_ALL_ACTIVE_REPORTING_FREQUENCIES,

  GET_ALL_ACTIVE_MARKETS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_MARKETS,

  GET_ALL_ACTIVE_SECTORS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_SECTORS,
}

// ─── Response Codes ───────────────────────────────────────────────────────────

export const GET_PENDING_APPROVALS_CODES = {
  Manager_ManagerServiceManager_GetPendingApprovals_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetPendingApprovals_02: null, // no records — handled in UI
  Manager_ManagerServiceManager_GetPendingApprovals_03: null, // success
  Manager_ManagerServiceManager_GetPendingApprovals_04: 'Something went wrong, please try again',
}

export const GET_PENDING_APPROVAL_DETAILS_CODES = {
  Manager_ManagerServiceManager_GetPendingApprovalDetails_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_02: 'Approval request ID is required.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_03: 'Approval request not found.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_04: null, // success — handled in UI
  Manager_ManagerServiceManager_GetPendingApprovalDetails_05:
    'Something went wrong, please try again.',
}
// ─── GET Market ─────────────────────────────────────────────────────────────
export const GET_MARKET_CODES = {
  Manager_ManagerServiceManager_GetMarkets_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetMarkets_02: 'No markets found',
  Manager_ManagerServiceManager_GetMarkets_03: null,
  Manager_ManagerServiceManager_GetMarkets_04: 'Something went wrong, please try again',
}
// ─── SAVE Market ─────────────────────────────────────────────────────────────
export const SAVE_MARKET_CODES = {
  Manager_ManagerServiceManager_SaveMarket_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveMarket_02: 'FK_CountryID is required',
  Manager_ManagerServiceManager_SaveMarket_03: 'Market Name (Full Name) is required',
  Manager_ManagerServiceManager_SaveMarket_04: 'Short Code (Short Name) is required',
  Manager_ManagerServiceManager_SaveMarket_05: null,
  Manager_ManagerServiceManager_SaveMarket_06:
    'Duplicate — Market Name or Short Code already exists',
  Manager_ManagerServiceManager_SaveMarket_07: 'Failed to save, please try again',
  Manager_ManagerServiceManager_SaveMarket_08: 'Something went wrong, please try again',
}
// ─── GET SECTORS ─────────────────────────────────────────────────────────────
export const GET_SECTORS_CODES = {
  Manager_ManagerServiceManager_GetSectors_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetSectors_02: 'No sectors found',
  Manager_ManagerServiceManager_GetSectors_03: null,
  Manager_ManagerServiceManager_GetSectors_04: 'Something went wrong, please try again',
}
// ─── SAVE SECTORS ─────────────────────────────────────────────────────────────
export const SAVE_SECTORS_CODES = {
  Manager_ManagerServiceManager_SaveSector_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveSector_02: 'Sector Name is required',
  Manager_ManagerServiceManager_SaveSector_03:
    'Secto rName invalid — alphabets only, max 50 characters',
  Manager_ManagerServiceManager_SaveSector_04: null,
  Manager_ManagerServiceManager_SaveSector_05: 'Duplicate — Sector Name already exists',
  Manager_ManagerServiceManager_SaveSector_06: 'Failed to save, please try again',
  Manager_ManagerServiceManager_SaveSector_07: 'Something went wrong, please try again',
}
// ─── GET Quarters ─────────────────────────────────────────────────────────────
export const GET_QUARTERS_CODES = {
  Manager_ManagerServiceManager_GetQuarters_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetQuarters_02: 'No quarters found',
  Manager_ManagerServiceManager_GetQuarters_03: null, // success — handled in UI
  Manager_ManagerServiceManager_GetQuarters_04: 'Something went wrong, please try again',
}
// ─── SAVE Quarters ─────────────────────────────────────────────────────────────
export const SAVE_QUARTERS_CODES = {
  Manager_ManagerServiceManager_SaveQuarter_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveQuarter_02: 'Quarter Name is required',
  Manager_ManagerServiceManager_SaveQuarter_03: 'StartDate is required (format: yyyyMMdd)',
  Manager_ManagerServiceManager_SaveQuarter_04: 'EndDate is required (format: yyyyMMdd)',
  Manager_ManagerServiceManager_SaveQuarter_05: null, // success — handled in UI
  Manager_ManagerServiceManager_SaveQuarter_06:
    'Duplicate — Quarter Name or date range already exists',
  Manager_ManagerServiceManager_SaveQuarter_07: 'Failed to save, please try again',
  Manager_ManagerServiceManager_SaveQuarter_08: 'Something went wrong, please try again',
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const getPendingRequestsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_PENDING_APPROVALS,
    {
      FK_CompanyID: params.FK_CompanyID || 0,
      FK_QuarterID: params.FK_QuarterID || 0,
      FK_StatusID: params.FK_StatusID || 0,
      DateFrom: params.DateFrom || '',
      DateTo: params.DateTo || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

export const getPendingApprovalDetailsApi = (dataApprovalRequestID, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_PENDING_APPROVAL_DETAILS,
    { DataApprovalRequestID: dataApprovalRequestID },
    config
  )

/**
 * Fetch a paginated, searchable list of quarters.
 *
 * @param {Object} params
 * @param {string} [params.QuarterName='']
 * @param {string} [params.StartDate='']       yyyyMMdd format
 * @param {string} [params.EndDate='']         yyyyMMdd format
 * @param {number} [params.FK_QuarterStatusID=0]  0=all, 1=Active, 2=Closed
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]       zero-based
 */
export const getQuartersApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_QUARTERS,
    {
      QuarterName: params.QuarterName || '',
      StartDate: params.StartDate || '',
      EndDate: params.EndDate || '',
      FK_QuarterStatusID: params.FK_QuarterStatusID ?? 0,
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

// ─── Save / Update Quarter ────────────────────────────────────────────────────

/**
 * Create or update a quarter.
 *  - Pass PK_QuarterID = 0 to create (status defaults to Active on server).
 *  - Pass PK_QuarterID > 0 to update an existing record.
 *
 * @param {Object} params
 * @param {number} [params.PK_QuarterID=0]
 * @param {string} params.QuarterName
 * @param {string} params.StartDate           yyyyMMdd format  e.g. '20260101'
 * @param {string} params.EndDate             yyyyMMdd format  e.g. '20260331'
 * @param {string} [params.Description='']
 * @param {number} [params.FK_QuarterStatusID=1]  1=Active, 2=Closed (used on update)
 */
export const SaveQuartersApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_QUARTERS,
    {
      PK_QuarterID: params.PK_QuarterID || 0,
      QuarterName: params.QuarterName || '',
      StartDate: params.StartDate || '',
      EndDate: params.EndDate || '',
      Description: params.Description || '',
      FK_QuarterStatusID: params.FK_QuarterStatusID ?? 1,
    },
    config
  )

// ─── GET Classifications ─────────────────────────────────────────────────────────────
export const GET_CLASSIFICATIONS_CODES = {
  Manager_ManagerServiceManager_GetClassifications_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetClassifications_02: 'No classifications found',
  Manager_ManagerServiceManager_GetClassifications_03: null, // success — handled in UI
  Manager_ManagerServiceManager_GetClassifications_04: 'Something went wrong, please try again',
}

/**
 * Fetch a paginated, searchable list of quarters.
 *
 * @param {Object} params
 * @param {string} [params.Name='']
 * @param {string} [params.Description='']
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]       zero-based
 */
export const getClassificationsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_CLASSIFICATIONS,
    {
      Name: params.Name || '',
      Description: params.Description || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

// ─── GET Classifications ─────────────────────────────────────────────────────────────
export const SAVE_CLASSIFICATIONS_CODES = {
  Manager_ManagerServiceManager_SaveClassification_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveClassification_02: 'Name is required',
  Manager_ManagerServiceManager_SaveClassification_03: 'Classification created or updated', // success — handled in UI
  Manager_ManagerServiceManager_SaveClassification_04: 'Duplicate — Name already exists',
  Manager_ManagerServiceManager_SaveClassification_05: 'Failed to save, please try again',
  Manager_ManagerServiceManager_SaveClassification_06: 'Something went wrong, please try again',
  Manager_ManagerServiceManager_SaveClassification_07:
    'BaseClassificationID is required when IsProrated=1',
  Manager_ManagerServiceManager_SaveClassification_08:
    'A classification cannot be its own base classification',
}

/**
 * Create or update a quarter.
 *  - Pass PK_QuarterID = 0 to create (status defaults to Active on server).
 *  - Pass PK_QuarterID > 0 to update an existing record.
 *
 * @param {Object} params
 * @param {number} [params.ClassificationID=0]
 * @param {string} params.Name
 * @param {number} [params.IsCalculated=0]
 * @param {number} [params.ClassificationStatusID=0]
 * @param {string} params.Description
 * @param {number} [params.IsProrated  ]         yyyyMMdd format  e.g. '20260101'
 * @param {number} params.BaseClassificationID             yyyyMMdd format  e.g. '20260331'
 */
export const SaveClassificationsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_CLASSIFICATIONS,
    {
      ClassificationID: params.ClassificationID || 0,
      Name: params.Name || '',
      IsCalculated: params.IsCalculated || 0,
      ClassificationStatusID: params.ClassificationStatusID || 1,
      Description: params.Description || '',
      IsProrated: params.IsProrated || 0,
      BaseClassificationID: params.BaseClassificationID || 0, // ✅ was BaseClassificationID
    },
    config
  )

export const getSectorsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_SECTORS,
    {
      SectorName: params.SectorName || '',
      FK_SectorStatusID: params.FK_SectorStatusID || 0,
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

export const getMarketApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_MARKET,
    {
      MarketName: params.MarketName || '',
      ShortCode: params.ShortCode || '',
      FK_CountryID: params.FK_CountryID || 0,
      FK_MarketStatusID: params.FK_MarketStatusID || 0,
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

export const saveSectorsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_SECTORS,
    {
      PK_SectorID: params.PK_SectorID ?? 0,
      SectorName: params.SectorName || '',
      FK_SectorStatusID: params.FK_SectorStatusID ?? 0,
    },
    config
  )

export const saveMarketApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_MARKET,
    {
      PK_MarketID: params.PK_MarketID ?? 0,
      FK_CountryID: params.FK_CountryID ?? 0,
      MarketName: params.MarketName || '',
      ShortCode: params.ShortCode || '',
      FK_MarketStatusID: params.FK_MarketStatusID ?? 0,
    },
    config
  )

// ─── Response Codes ───────────────────────────────────────────────────────────
export const GET_COMPANIES_CODES = {
  Manager_ManagerServiceManager_GetCompanies_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetCompanies_02: 'No companies found', // no records — handled in UI
  Manager_ManagerServiceManager_GetCompanies_03: null, // success
  Manager_ManagerServiceManager_GetCompanies_04: 'Something went wrong, please try again',
}

// API Call
export const GetCompaniesApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_COMPANIES,
    {
      Ticker: params.Ticker || '',
      CompanyName: params.CompanyName || '',
      FK_SectorID: params.FK_SectorID || 0,
      FK_MarketID: params.FK_MarketID || 0,
      AnnualReporting: params.AnnualReporting || '',
      ReportingFrequency: params.ReportingFrequency || '',
      IsExceptionByShariah: params.IsExceptionByShariah || 0,
      FK_CompanyStatusID: params.FK_CompanyStatusID || 0,
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

// ─── Response Codes ───────────────────────────────────────────────────────────
export const SAVE_COMPANY_CODES = {
  Manager_ManagerServiceManager_SaveCompany_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveCompany_02: 'Ticker is required',
  Manager_ManagerServiceManager_SaveCompany_03: 'CompanyName is required',
  Manager_ManagerServiceManager_SaveCompany_04: 'Error	FK_SectorID is required',
  Manager_ManagerServiceManager_SaveCompany_05: 'FK_MarketID is required',
  Manager_ManagerServiceManager_SaveCompany_06: 'Company created or updated', // success
  Manager_ManagerServiceManager_SaveCompany_07: 'Duplicate — Ticker or CompanyName already exists',
  Manager_ManagerServiceManager_SaveCompany_08: 'Failed to save, please try again',
  Manager_ManagerServiceManager_SaveCompany_09: 'Something went wrong, please try again',
}

// API Call
export const SaveCompanyApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_COMPANY,
    {
      PK_CompanyID: params.PK_CompanyID || 0,
      Ticker: params.Ticker || '',
      CompanyName: params.CompanyName || '',
      FK_SectorID: params.FK_SectorID || 0,
      FK_MarketID: params.FK_MarketID || 0,
      AnnualReporting: params.AnnualReporting || '',
      ReportingFrequency: params.ReportingFrequency || '',
      GracePeriod: params.GracePeriod || 0,
      FK_CompanyStatusID: params.FK_CompanyStatusID || 0,
      IsExceptionByShariah: params.IsExceptionByShariah || 0,
      ShariahExceptionReason: params.ShariahExceptionReason || '',
    },
    config
  )

// ─── Response Codes ───────────────────────────────────────────────────────────
export const GET_ALL_ACTIVE_REPORTING_MONTHS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveReportingMonths_01: 'No active reporting months found',
  Manager_ManagerServiceManager_GetAllActiveReportingMonths_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveReportingMonths_03: 'Unexpected server exception',
}

// API Call
export const GetAllActiveReportingMonthsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_REPORTONG_ACTIVE_MONTHS,
    {
      MonthName: params.MonthName || '',
    },
    config
  )

// ─── Response Codes ───────────────────────────────────────────────────────────
export const GET_ALL_ACTIVE_REPORTING_FREQUENCY_CODES = {
  Manager_ManagerServiceManager_GetAllActiveReportingFrequencies_02:
    'No active reporting frequency found',
  Manager_ManagerServiceManager_GetAllActiveReportingFrequencies_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveReportingFrequencies_02: 'Unexpected server exception',
}
// API Call
export const GetAllActiveReportingFrequencyApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_REPORTING_FREQUENCIES,
    {
      FrequencyName: params.FrequencyName || '',
    },
    config
  )

// ─── Response Codes ───────────────────────────────────────────────────────────
export const GET_ALL_ACTIVE_MARKETS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveMarkets_01: 'No active markets found',
  Manager_ManagerServiceManager_GetAllActiveMarkets_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveMarkets_03: 'Unexpected server exception',
}
// API Call
export const GetAllActiveMarketsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_MARKETS,
    {
      MarketName: params.MarketName,
    },
    config
  )

// ─── Response Codes ───────────────────────────────────────────────────────────
export const GET_ALL_ACTIVE_SECTORS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveSectors_01: 'No active sectors found',
  Manager_ManagerServiceManager_GetAllActiveSectors_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveSectors_03: 'Unexpected server exception',
}

// API Call
export const GetAllActiveSectorsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_SECTORS,
    {
      SectorName: params.SectorName,
    },
    config
  )
