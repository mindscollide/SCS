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
  GET_FINANCIAL_RATIOS: import.meta.env.VITE_RM_GET_FINANCIAL_RATIOS,
  GET_FINANCIAL_RATIO_BY_ID: import.meta.env.VITE_RM_GET_FINANCIAL_RATIO_BY_ID,
  SAVE_FINANCIAL_RATIO: import.meta.env.VITE_RM_SAVE_FINANCIAL_RATIO,
  CHECK_FINANCIAL_RATIO_NAME: import.meta.env.VITE_RM_CHECK_FINANCIAL_RATIO_NAME,

  GET_ISLAMIC_BANKS: import.meta.env.VITE_RM_GET_ISLAMIC_BANKS,
  SAVE_ISLAMIC_BANKS: import.meta.env.VITE_RM_SAVE_ISLAMIC_BANKS,
  DELETE_ISLAMIC_BANKS: import.meta.env.VITE_RM_DELETE_ISLAMIC_BANKS,

  GET_SUKUK: import.meta.env.VITE_RM_GET_SUKUK,
  SAVE_SUKUK: import.meta.env.VITE_RM_SAVE_SUKUK,
  DELETE_SUKUK: import.meta.env.VITE_RM_DELETE_SUKUK,

  GET_CHARITABLE_ORGS: import.meta.env.VITE_RM_GET_CHARITABLE_ORGS,
  SAVE_CHARITABLE_ORGS: import.meta.env.VITE_RM_SAVE_CHARITABLE_ORGS,
  DELETE_CHARITABLE_ORGS: import.meta.env.VITE_RM_DELETE_CHARITABLE_ORGS,

  GET_ISLAMIC_BANK_WINDOWS: import.meta.env.VITE_RM_GET_ISLAMIC_BANK_WINDOWS,
  SAVE_ISLAMIC_BANK_WINDOW: import.meta.env.VITE_RM_SAVE_ISLAMIC_BANK_WINDOW,
  DELETE_ISLAMIC_BANK_WINDOW: import.meta.env.VITE_RM_DELETE_ISLAMIC_BANK_WINDOW,

  GET_ALL_ACTIVE_COMPANY_NAMES: import.meta.env.VITE_RM_GET_ALL_ACTIVE_COMPANY_NAMES,
  GET_ALL_ACTIVE_QUARTERS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_QUARTERS,
  GET_ALL_ACTIVE_CLASSIFICATIONS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_CLASSIFICATIONS,

  GET_SUSPENDED_COMPANIES: import.meta.env.VITE_RM_GET_SUSPENDED_COMPANIES,
  SAVE_SUSPENDED_COMPANY: import.meta.env.VITE_RM_SAVE_SUSPENDED_COMPANY,
  DELETE_SUSPENDED_COMPANY: import.meta.env.VITE_RM_DELETE_SUSPENDED_COMPANY,

  GET_ALL_COMPANIES: import.meta.env.VITE_RM_GET_ALL_COMPANIES,
  GET_ALL_ACTIVE_COMPANY_TICKERS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_COMPANY_TICKERS,
  GET_FORMULA_BY_CLASSIFICATION_ID: import.meta.env.VITE_RM_GET_FORMULA_BY_CLASSIFICATION_ID,
  // ── Notifications ──
  GET_ALL_NOTIFICATIONS: import.meta.env.VITE_RM_GET_ALL_NOTIFICATIONS,
  MARK_NOTIFICATIONS_AS_READ: import.meta.env.VITE_RM_MARK_NOTIFICATIONS_AS_READ,

  UPDATE_PENDING_APPROVAL: import.meta.env.VITE_RM_UPDATE_PENDING_APPROVAL,

  GET_COMPLIANCE_CRITERIA: import.meta.env.VITE_RM_GET_COMPLIANCE_CRITERIA,
  SET_DEFAULT_COMPLIANCE_CRITERIA: import.meta.env.VITE_RM_SET_DEFAULT_COMPLIANCE_CRITERIA,
  GET_COMPLIANCE_CRITERIA_BY_ID: import.meta.env.VITE_RM_GET_COMPLIANCE_CRITERIA_BY_ID,
  CHECK_COMPLIANCE_CRITERIA_NAME: import.meta.env.VITE_RM_CHECK_COMPLIANCE_CRITERIA_NAME,
  GET_ALL_ACTIVE_FINANCIAL_RATIOS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_FINANCIAL_RATIOS,
  SAVE_COMPLIANCE_CRITERIA: import.meta.env.VITE_RM_SAVE_COMPLIANCE_CRITERIA,
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENDING APPROVALS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `getPendingRequestsApi`. null = handled in UI. */
export const GET_PENDING_APPROVALS_CODES = {
  Manager_ManagerServiceManager_GetPendingApprovals_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetPendingApprovals_02: null, // no records
  Manager_ManagerServiceManager_GetPendingApprovals_03: null, // success
  Manager_ManagerServiceManager_GetPendingApprovals_04: 'Something went wrong, please try again',
}

/**
 * Fetch a paginated list of pending approval requests.
 * @param {Object} params
 * @param {number} [params.FK_CompanyID=0]    filter by company; 0 = all
 * @param {number} [params.FK_QuarterID=0]    filter by quarter; 0 = all
 * @param {number} [params.FK_StatusID=0]     filter by status; 0 = all
 * @param {string} [params.DateFrom='']       ISO date string
 * @param {string} [params.DateTo='']         ISO date string
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]      zero-based page index
 */
export const getPendingRequestsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_PENDING_APPROVALS,
    {
      CompanyName: params.CompanyName || '',
      FK_CompanyID: params.FK_CompanyID || 0,
      TickerID: params.TickerID || 0,
      SectorID: params.SectorID || 0,
      FK_QuarterID: params.FK_QuarterID || 0,
      SentBy: params.SentBy || 0,
      DateFrom: params.DateFrom || '',
      DateTo: params.DateTo || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

/** Response codes for `getPendingApprovalDetailsApi`. null = handled in UI. */
export const GET_PENDING_APPROVAL_DETAILS_CODES = {
  Manager_ManagerServiceManager_GetPendingApprovalDetails_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_02: 'Approval request ID is required.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_03: 'Approval request not found.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_04: null, // success
  Manager_ManagerServiceManager_GetPendingApprovalDetails_05:
    'Something went wrong, please try again.',
}

/**
 * Fetch details of a single pending approval request.
 * @param {number} dataApprovalRequestID
 */
export const getPendingApprovalDetailsApi = (dataApprovalRequestID, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_PENDING_APPROVAL_DETAILS,
    { DataApprovalRequestID: dataApprovalRequestID },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `getMarketApi`. null = handled in UI. */
export const GET_MARKET_CODES = {
  Manager_ManagerServiceManager_GetMarkets_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetMarkets_02: 'No markets found',
  Manager_ManagerServiceManager_GetMarkets_03: null, // success
  Manager_ManagerServiceManager_GetMarkets_04: 'Something went wrong, please try again',
}

/**
 * Fetch a paginated, filterable list of markets.
 * @param {Object} params
 * @param {string} [params.MarketName='']       partial name filter
 * @param {string} [params.ShortCode='']        partial short-code filter
 * @param {number} [params.FK_CountryID=0]      0 = all countries
 * @param {number} [params.FK_MarketStatusID=0] 0 = all statuses
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]        zero-based page index
 */
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

/** Response codes for `saveMarketApi`. null = success, handled in UI. */
export const SAVE_MARKET_CODES = {
  Manager_ManagerServiceManager_SaveMarket_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveMarket_02: 'FK_CountryID is required',
  Manager_ManagerServiceManager_SaveMarket_03: 'Market Name (Full Name) is required',
  Manager_ManagerServiceManager_SaveMarket_04: 'Short Code (Short Name) is required',
  Manager_ManagerServiceManager_SaveMarket_05: null, // success
  Manager_ManagerServiceManager_SaveMarket_06: 'Duplicate — Market Name already exists',
  Manager_ManagerServiceManager_SaveMarket_07: 'Duplicate — Short Code already exists',
  Manager_ManagerServiceManager_SaveMarket_08:
    'Duplicate — Market Name and Short Code already exist',
  Manager_ManagerServiceManager_SaveMarket_09: 'Failed to save — DB error',
  Manager_ManagerServiceManager_SaveMarket_10: 'Unexpected server exception',
}

/**
 * Create or update a market. Pass `PK_MarketID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_MarketID=0]        0 = create new
 * @param {number} [params.FK_CountryID=0]        required
 * @param {string} [params.MarketName='']         required; full name
 * @param {string} [params.ShortCode='']          required; short code
 * @param {number} [params.FK_MarketStatusID=0]   1 = Active, 2 = Inactive
 */
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTORS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `getSectorsApi`. null = handled in UI. */
export const GET_SECTORS_CODES = {
  Manager_ManagerServiceManager_GetSectors_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetSectors_02: 'No sectors found',
  Manager_ManagerServiceManager_GetSectors_03: null, // success
  Manager_ManagerServiceManager_GetSectors_04: 'Something went wrong, please try again',
}

/**
 * Fetch a paginated, filterable list of sectors.
 * @param {Object} params
 * @param {string} [params.SectorName='']         partial name filter
 * @param {number} [params.FK_SectorStatusID=0]   0 = all statuses
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]           zero-based page index
 */
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

/** Response codes for `saveSectorsApi`. null = success, handled in UI. */
export const SAVE_SECTORS_CODES = {
  Manager_ManagerServiceManager_SaveSector_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveSector_02: 'Sector Name is required',
  Manager_ManagerServiceManager_SaveSector_03: null, // success
  Manager_ManagerServiceManager_SaveSector_04: 'Duplicate — Sector Name already exists',
  Manager_ManagerServiceManager_SaveSector_05: 'Record not found',
  Manager_ManagerServiceManager_SaveSector_06: 'Something went wrong, please try again',
}

/**
 * Create or update a sector. Pass `PK_SectorID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_SectorID=0]          0 = create new
 * @param {string} [params.SectorName='']           required
 * @param {number} [params.FK_SectorStatusID=0]     1 = Active, 2 = Inactive
 */
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

// ═══════════════════════════════════════════════════════════════════════════════
// QUARTERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `getQuartersApi`. null = handled in UI. */
export const GET_QUARTERS_CODES = {
  Manager_ManagerServiceManager_GetQuarters_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetQuarters_02: 'No quarters found',
  Manager_ManagerServiceManager_GetQuarters_03: null, // success
  Manager_ManagerServiceManager_GetQuarters_04: 'Something went wrong, please try again',
}

/**
 * Fetch a paginated, filterable list of quarters.
 * @param {Object} params
 * @param {string} [params.QuarterName='']          partial name filter
 * @param {string} [params.StartDate='']            yyyyMMdd format
 * @param {string} [params.EndDate='']              yyyyMMdd format
 * @param {number} [params.FK_QuarterStatusID=0]    0 = all, 1 = Active, 2 = Closed
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]            zero-based page index
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

/** Response codes for `SaveQuartersApi`. null = success, handled in UI. */
export const SAVE_QUARTERS_CODES = {
  Manager_ManagerServiceManager_SaveQuarter_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveQuarter_02: 'Quarter Name is required',
  Manager_ManagerServiceManager_SaveQuarter_03: 'StartDate is required (format: yyyyMMdd)',
  Manager_ManagerServiceManager_SaveQuarter_04: 'EndDate is required (format: yyyyMMdd)',
  Manager_ManagerServiceManager_SaveQuarter_05: null, // success
  Manager_ManagerServiceManager_SaveQuarter_06:
    'Duplicate — Quarter Name or date range already exists',
  Manager_ManagerServiceManager_SaveQuarter_07: 'Failed to save, please try again',
  Manager_ManagerServiceManager_SaveQuarter_08: 'Something went wrong, please try again',
}

/**
 * Create or update a quarter. Pass `PK_QuarterID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_QuarterID=0]           0 = create new
 * @param {string} params.QuarterName                required
 * @param {string} params.StartDate                  yyyyMMdd, e.g. '20260101'
 * @param {string} params.EndDate                    yyyyMMdd, e.g. '20260331'
 * @param {string} [params.Description='']
 * @param {number} [params.FK_QuarterStatusID=1]     1 = Active, 2 = Closed
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

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `getClassificationsApi`. null = handled in UI. */
export const GET_CLASSIFICATIONS_CODES = {
  Manager_ManagerServiceManager_GetClassifications_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetClassifications_02: 'No classifications found',
  Manager_ManagerServiceManager_GetClassifications_03: null, // success
  Manager_ManagerServiceManager_GetClassifications_04: 'Something went wrong, please try again',
}

/**
 * Fetch a paginated, filterable list of classifications.
 * @param {Object} params
 * @param {string} [params.Name='']          partial name filter
 * @param {string} [params.Description='']   partial description filter
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]     zero-based page index
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

/** Response codes for `SaveClassificationsApi`. null = success, handled in UI. */
export const SAVE_CLASSIFICATIONS_CODES = {
  Manager_ManagerServiceManager_SaveClassification_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveClassification_02: 'Name is required',
  Manager_ManagerServiceManager_SaveClassification_03: null, // success
  Manager_ManagerServiceManager_SaveClassification_04: 'Duplicate — Name already exists',
  Manager_ManagerServiceManager_SaveClassification_05:
    'A classification cannot be its own base classification',
  Manager_ManagerServiceManager_SaveClassification_06: 'Something went wrong, please try again',
}

/**
 * Create or update a classification. Pass `ClassificationID = 0` to create.
 * @param {Object} params
 * @param {number} [params.ClassificationID=0]          0 = create new
 * @param {string} params.Name                          required
 * @param {string} [params.Description='']
 * @param {number} [params.IsCalculated=0]              1 = yes
 * @param {number} [params.IsProrated=0]                1 = yes; requires BaseClassificationID
 * @param {number} [params.BaseClassificationID=0]      required when IsProrated = 1
 * @param {number} [params.ClassificationStatusID=1]    1 = Active, 2 = Inactive
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
      BaseClassificationID: params.BaseClassificationID || 0,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetCompaniesApi`. null = handled in UI. */
export const GET_COMPANIES_CODES = {
  Manager_ManagerServiceManager_GetCompanies_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetCompanies_02: 'No companies found',
  Manager_ManagerServiceManager_GetCompanies_03: null, // success
  Manager_ManagerServiceManager_GetCompanies_04: 'Something went wrong, please try again',
}

/**
 * Fetch a paginated, filterable list of companies.
 * @param {Object} params
 * @param {number} [params.CompanyID=0]                  exact match by ID; 0 = all
 * @param {number} [params.TickerID=0]                   exact match by company ticker ID; 0 = all
 * @param {string} [params.CompanyName='']               partial name filter
 * @param {number} [params.FK_SectorID=0]                0 = all sectors
 * @param {number} [params.FK_MarketID=0]                0 = all markets
 * @param {number} [params.FK_ReportingMonthID=0]        0 = all months
 * @param {number} [params.FK_ReportingFrequencyID=0]    0 = all frequencies
 * @param {number|null} [params.GracePeriod=null]        null = no filter
 * @param {number|null} [params.IsException=null]        null = no filter, 1 = yes, 0 = no
 * @param {number} [params.FK_CompanyStatusID=0]         0 = all statuses
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]                 zero-based page index
 */
export const GetCompaniesApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_COMPANIES,
    {
      CompanyID: params.CompanyID || 0,
      TickerID: params.TickerID || 0,
      CompanyName: params.CompanyName || '',
      FK_SectorID: params.FK_SectorID || 0,
      FK_MarketID: params.FK_MarketID || 0,
      FK_ReportingMonthID: params.FK_ReportingMonthID || 0,
      FK_ReportingFrequencyID: params.FK_ReportingFrequencyID || 0,
      GracePeriod: params.GracePeriod ?? null,
      IsException: params.IsException ?? null,
      FK_CompanyStatusID: params.FK_CompanyStatusID || 0,
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

/** Response codes for `GetAllCompaniesApi`. null = handled in UI. */
export const GET_ALL_COMPANIES_CODES = {
  Manager_ManagerServiceManager_GetAllCompanies_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetAllCompanies_02: null, // no data
  Manager_ManagerServiceManager_GetAllCompanies_03: null, // success
  Manager_ManagerServiceManager_GetAllCompanies_04: 'Unexpected server exception',
}

/** Fetch full unpaginated company list (for bulk/dropdown use). No params. */
export const GetAllCompaniesApi = (config = {}) =>
  formPost(Manager_URL, RM.GET_ALL_COMPANIES, {}, config)

// ─────────────────────────────────────────────────────────────────────────────

/** Response codes for `SaveCompanyApi`. null = success, handled in UI. */
export const SAVE_COMPANY_CODES = {
  Manager_ManagerServiceManager_SaveCompany_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveCompany_02: 'Ticker is required',
  Manager_ManagerServiceManager_SaveCompany_03: 'CompanyName is required',
  Manager_ManagerServiceManager_SaveCompany_04: 'FK_SectorID is required',
  Manager_ManagerServiceManager_SaveCompany_05: 'FK_MarketID is required',
  Manager_ManagerServiceManager_SaveCompany_06: 'ExceptionReason is required when IsException = 1',
  Manager_ManagerServiceManager_SaveCompany_07: null, // success
  Manager_ManagerServiceManager_SaveCompany_08:
    'Duplicate -- Ticker or Company Name already exists',
  Manager_ManagerServiceManager_SaveCompany_09: 'failed; DB insert/update returned 0 rows',
  Manager_ManagerServiceManager_SaveCompany_10: 'unexpected server exception',
}

/**
 * Create or update a company. Pass `PK_CompanyID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_CompanyID=0]               0 = create new
 * @param {string} params.Ticker                         required
 * @param {string} params.CompanyName                    required
 * @param {number} params.FK_SectorID                    required
 * @param {number} params.FK_MarketID                    required
 * @param {number} [params.FK_ReportingMonthID=0]
 * @param {number} [params.FK_ReportingFrequencyID=0]
 * @param {number} [params.GracePeriod=0]
 * @param {number} [params.FK_CompanyStatusID=0]         1 = Active, 2 = Inactive
 * @param {number} [params.IsException=0]                1 = Shariah exception
 * @param {string} [params.ExceptionReason='']           required when IsException = 1
 */
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
      FK_ReportingMonthID: params.FK_ReportingMonthID || 0,
      FK_ReportingFrequencyID: params.FK_ReportingFrequencyID || 0,
      GracePeriod: params.GracePeriod || 0,
      FK_CompanyStatusID: params.FK_CompanyStatusID || 0,
      IsException: params.IsException || 0,
      ExceptionReason: params.ExceptionReason || '',
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Reporting Months
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetAllActiveReportingMonthsApi`. null = handled in UI. */
export const GET_ALL_ACTIVE_REPORTING_MONTHS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveReportingMonths_01: 'No active reporting months found',
  Manager_ManagerServiceManager_GetAllActiveReportingMonths_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveReportingMonths_03: 'Unexpected server exception',
}

/**
 * Fetch all active reporting months (lookup/dropdown use).
 * @param {Object} [params]
 * @param {string} [params.MonthName='']   optional name filter
 */
export const GetAllActiveReportingMonthsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_REPORTONG_ACTIVE_MONTHS,
    {
      MonthName: params.MonthName || '',
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Reporting Frequencies
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetAllActiveReportingFrequencyApi`. null = handled in UI. */
export const GET_ALL_ACTIVE_REPORTING_FREQUENCY_CODES = {
  Manager_ManagerServiceManager_GetAllActiveReportingFrequencies_01:
    'No active reporting frequency found',
  Manager_ManagerServiceManager_GetAllActiveReportingFrequencies_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveReportingFrequencies_03: 'Unexpected server exception',
}

/**
 * Fetch all active reporting frequencies (lookup/dropdown use).
 * @param {Object} [params]
 * @param {string} [params.FrequencyName='']   optional name filter
 */
export const GetAllActiveReportingFrequencyApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_REPORTING_FREQUENCIES,
    {
      FrequencyName: params.FrequencyName || '',
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Markets
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetAllActiveMarketsApi`. null = handled in UI. */
export const GET_ALL_ACTIVE_MARKETS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveMarkets_01: 'No active markets found',
  Manager_ManagerServiceManager_GetAllActiveMarkets_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveMarkets_03: 'Unexpected server exception',
}

/**
 * Fetch all active markets (lookup/dropdown use).
 * @param {Object} [params]
 * @param {string} [params.MarketName='']   optional name filter
 */
export const GetAllActiveMarketsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_MARKETS,
    {
      MarketName: params.MarketName,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Sectors
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetAllActiveSectorsApi`. null = handled in UI. */
export const GET_ALL_ACTIVE_SECTORS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveSectors_01: 'No active sectors found',
  Manager_ManagerServiceManager_GetAllActiveSectors_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveSectors_03: 'Unexpected server exception',
}

/**
 * Fetch all active sectors (lookup/dropdown use).
 * @param {Object} [params]
 * @param {string} [params.SectorName='']   optional name filter
 */
export const GetAllActiveSectorsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_SECTORS,
    {
      SectorName: params.SectorName,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Quarters
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetAllActiveQuartersApi`. null = handled in UI. */
export const GET_ALL_ACTIVE_QUARTERS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveQuarters_01: 'No active quarters found',
  Manager_ManagerServiceManager_GetAllActiveQuarters_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveQuarters_03: 'Unexpected server exception',
}

/**
 * Fetch all active quarters (lookup/dropdown use).
 * @param {Object} [params]
 * @param {string} [params.QuarterName='']   optional name filter
 */
export const GetAllActiveQuartersApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_QUARTERS,
    {
      QuarterName: params.QuarterName || '',
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Classifications (open — no token required)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all active classifications for dropdowns (open API — no token required).
 * Used in ManageFinancialRatioPage Step 1 for Numerator / Denominator dropdowns.
 * Loaded once on page mount; NOT used for Step 2 (use getClassificationsApi instead).
 *
 * @param {Object} [params]
 * @param {string} [params.Name='']  optional name filter (pass '' to get all)
 */
export const GetAllActiveClassificationsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_CLASSIFICATIONS,
    { Name: params.Name || '' },
    { skipAuth: true, ...config }
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Company Names
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetAllActiveCompanyNamesApi`. null = handled in UI. */
export const GET_ALL_ACTIVE_COMPANY_NAMES_CODES = {
  Manager_ManagerServiceManager_GetAllActiveCompanyNames_01: 'No active companies found',
  Manager_ManagerServiceManager_GetAllActiveCompanyNames_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveCompanyNames_03: 'Unexpected server exception',
}

/**
 * Fetch all active company names (lookup/dropdown use).
 * @param {Object} [params]
 * @param {string} [params.CompanyName='']   optional name filter
 */
export const GetAllActiveCompanyNamesApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_COMPANY_NAMES,
    {
      CompanyName: params.CompanyName || '',
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUP — Active Company Tickers
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetAllActiveCompanyTickersApi`. null = handled in UI. */
export const GET_ALL_ACTIVE_COMPANY_TICKERS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveCompanyTickers_01: 'No active tickers found',
  Manager_ManagerServiceManager_GetAllActiveCompanyTickers_02: null, // success
  Manager_ManagerServiceManager_GetAllActiveCompanyTickers_03: 'Unexpected server exception',
}

/**
 * Fetch all active company tickers (lookup/dropdown use).
 * @param {Object} [params]
 * @param {string} [params.Ticker='']   optional ticker filter
 */
export const GetAllActiveCompanyTickersApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_COMPANY_TICKERS,
    {
      Ticker: params.Ticker || '',
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL RATIOS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetFinancialRatiosApi`. null = handled in UI. */
export const GET_ALL_FINANCIAL_RATIOS_CODES = {
  Manager_ManagerServiceManager_GetFinancialRatios_01: 'Unauthorized - caller is not a Manager',
  Manager_ManagerServiceManager_GetFinancialRatios_02:
    'No financial ratios found matching the filters',
  Manager_ManagerServiceManager_GetFinancialRatios_03: null, // success
  Manager_ManagerServiceManager_GetFinancialRatios_04: 'Unexpected server exception',
}

/**
 * Fetch a paginated, filterable list of financial ratios.
 * @param {Object} params
 * @param {string} [params.Name='']                       partial name filter
 * @param {string} [params.Description='']                partial description filter
 * @param {number} [params.FK_FinancialRatioStatusID=0]   0 = all statuses
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]                  zero-based page index
 */
export const GetFinancialRatiosApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_FINANCIAL_RATIOS,
    {
      Name: params.Name || '',
      Description: params.Description || '',
      FK_FinancialRatioStatusID: params.FK_FinancialRatioStatusID || 0,
      PageSize: params.PageSize || 0,
      PageNumber: params.PageNumber || 0,
    },
    config
  )

/** Response codes for `GetFinancialRatioByIDApi`. null = handled in UI. */
export const GET_FINANCIAL_RATIO_BY_ID_CODES = {
  Manager_ManagerServiceManager_GetFinancialRatioByID_01: 'Unauthorized - caller is not a Manager',
  Manager_ManagerServiceManager_GetFinancialRatioByID_02:
    'PK_FinancialRatiosID is required (must be greater than 0)',
  Manager_ManagerServiceManager_GetFinancialRatioByID_03:
    'Not found - no ratio exists with this ID',
  Manager_ManagerServiceManager_GetFinancialRatioByID_04: null, // success
  Manager_ManagerServiceManager_GetFinancialRatioByID_05: 'Unexpected server exception',
}

/**
 * Fetch a single financial ratio by its primary key.
 * @param {Object} params
 * @param {number} params.PK_FinancialRatiosID   required; must be > 0
 */
export const GetFinancialRatioByIDApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_FINANCIAL_RATIO_BY_ID,
    {
      PK_FinancialRatiosID: params.PK_FinancialRatiosID || 0,
    },
    config
  )

/** Response codes for `CheckFinancialRatioName`. null = handled in UI. */
export const CHECK_FINANCIAL_RATIO_NAME_CODES = {
  Manager_ManagerServiceManager_CheckFinancialRatioName_01:
    'Unauthorized - caller is not a Manager',
  Manager_ManagerServiceManager_CheckFinancialRatioName_02: 'Name is required',
  Manager_ManagerServiceManager_CheckFinancialRatioName_03: null, // success / available
  Manager_ManagerServiceManager_CheckFinancialRatioName_04: 'Unexpected server exception',
}

/**
 * Check whether a financial ratio name is already taken.
 * @param {Object} params
 * @param {string} params.Name   name to check
 */
export const CheckFinancialRatioName = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.CHECK_FINANCIAL_RATIO_NAME,
    {
      Name: params.Name,
    },
    config
  )

/** Response codes for `SaveFinancialRatioApi`. null = success, handled in UI. */
export const SAVE_FINANCIAL_RATIO_CODES = {
  Manager_ManagerServiceManager_SaveFinancialRatio_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveFinancialRatio_02: 'Name is required',
  Manager_ManagerServiceManager_SaveFinancialRatio_03: 'Numerator is required',
  Manager_ManagerServiceManager_SaveFinancialRatio_04: 'Denominator is required',
  Manager_ManagerServiceManager_SaveFinancialRatio_05: null, // success
  Manager_ManagerServiceManager_SaveFinancialRatio_06: 'Duplicate - Name already exists',
  Manager_ManagerServiceManager_SaveFinancialRatio_07: 'DB error (transaction rolled back)',
  Manager_ManagerServiceManager_SaveFinancialRatio_08: 'Unexpected server exception',
  Manager_ManagerServiceManager_SaveFinancialRatio_09: 'ClassificationIDs list is required',
}

/**
 * Create or update a financial ratio. Pass `PK_FinancialRatiosID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_FinancialRatiosID=0]              0 = create new
 * @param {string} params.Name                                  required
 * @param {string} [params.Description='']
 * @param {number} [params.FK_FinancialRatioStatusID=1]         1 = Active
 * @param {number} [params.FK_NumeratorClassificationID=0]      required
 * @param {number} [params.FK_DenominatorClassificationID=0]    required
 * @param {number[]} params.ClassificationIDs                   required; mapped classification IDs
 */
export const SaveFinancialRatioApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_FINANCIAL_RATIO,
    {
      PK_FinancialRatiosID: params.PK_FinancialRatiosID || 0,
      Name: params.Name || '',
      Description: params.Description || '',
      FK_FinancialRatioStatusID: params.FK_FinancialRatioStatusID || 1,
      FK_NumeratorClassificationID: params.FK_NumeratorClassificationID || 0,
      FK_DenominatorClassificationID: params.FK_DenominatorClassificationID || 0,
      ClassificationIDs: params.ClassificationIDs || [],
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULA BY CLASSIFICATION ID
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Response codes for `GetFormulaByClassificationIDApi`.
 * null = success handled in UI (check isExecuted + formula fields).
 *
 * _04 is the actual success code (isExecuted:true, formula object present or null).
 * FormulaModal uses isExecuted boolean — not string matching — to detect success.
 */
export const GET_FORMULA_BY_CLASSIFICATION_ID_CODES = {
  Manager_ManagerServiceManager_GetFormulaByClassificationID_01: 'ClassificationID is required.',
  Manager_ManagerServiceManager_GetFormulaByClassificationID_02:
    'No formula found for this classification.',
  Manager_ManagerServiceManager_GetFormulaByClassificationID_03:
    'No formula found for this classification.',
  Manager_ManagerServiceManager_GetFormulaByClassificationID_04: null, // success — isExecuted:true + formula object
  Manager_ManagerServiceManager_GetFormulaByClassificationID_05:
    'Something went wrong, please try again.',
}

/**
 * Fetch the formula associated with a given classification.
 * Used by FormulaModal (Modals.jsx) — called when a user clicks the Calculated pill
 * in the ManageFinancialRatioPage Step 2 table.
 *
 * @param {Object} params
 * @param {number} params.ClassificationID  — pK_ClassificationID; must be > 0
 */
export const GetFormulaByClassificationIDApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_FORMULA_BY_CLASSIFICATION_ID,
    {
      ClassificationID: params.ClassificationID || 0,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// ISLAMIC BANKS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetIslamicBanksApi`. null = handled in UI. */
export const GET_ISLAMIC_BANKS_CODES = {
  Manager_ManagerServiceManager_GetIslamicBanks_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetIslamicBanks_02: '', // no data
  Manager_ManagerServiceManager_GetIslamicBanks_03: null, // success
  Manager_ManagerServiceManager_GetIslamicBanks_04: 'Unexpected server exception',
}

/**
 * Fetch a paginated list of Islamic banks.
 * @param {Object} params
 * @param {string} [params.Name='']          partial name filter
 * @param {string} [params.Description='']   partial description filter
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]     zero-based page index
 */
export const GetIslamicBanksApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ISLAMIC_BANKS,
    {
      Name: params.Name || '',
      Description: params.Description || '',
      PageSize: params.PageSize || 10,
      PageNumber: params.PageNumber || 0,
    },
    config
  )

/** Response codes for `SaveIslamicBankApi`. null = success, handled in UI. */
export const SAVE_ISLAMIC_BANKS_CODES = {
  Manager_ManagerServiceManager_SaveIslamicBank_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveIslamicBank_02: 'Name is required',
  Manager_ManagerServiceManager_SaveIslamicBank_03: null, // success
  Manager_ManagerServiceManager_SaveIslamicBank_04: 'Name already exists',
  Manager_ManagerServiceManager_SaveIslamicBank_05: 'DB insert/update returned 0 rows',
  Manager_ManagerServiceManager_SaveIslamicBank_06: 'unexpected server exception',
}

/**
 * Create or update an Islamic bank. Pass `PK_IslamicBankID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_IslamicBankID=0]   0 = create new
 * @param {string} params.Name                   required
 */
export const SaveIslamicBankApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_ISLAMIC_BANKS,
    {
      PK_IslamicBankID: params.PK_IslamicBankID || 0,
      Name: params.Name || '',
      FK_IslamicBankStatusID: params.FK_IslamicBankStatusID || 0,
    },
    config
  )

/** Response codes for `DeleteIslamicBankApi`. null = success, handled in UI. */
export const DELETE_ISLAMIC_BANKS_CODES = {
  Manager_ManagerServiceManager_DeleteIslamicBank_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_DeleteIslamicBank_02: 'PK_IslamicBankID is required',
  Manager_ManagerServiceManager_DeleteIslamicBank_03: null, // success
  Manager_ManagerServiceManager_DeleteIslamicBank_04: 'Record not found or already deleted',
  Manager_ManagerServiceManager_DeleteIslamicBank_05: 'Unexpected server exception',
}

/**
 * Delete an Islamic bank by its primary key.
 * @param {Object} params
 * @param {number} params.PK_IslamicBankID   required; must be > 0
 */
export const DeleteIslamicBankApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.DELETE_ISLAMIC_BANKS,
    {
      PK_IslamicBankID: params.PK_IslamicBankID || 0,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// SUKUK
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetSukukApi`. null = handled in UI. */
export const GET_SUKUK_CODES = {
  Manager_ManagerServiceManager_GetSukuk_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetSukuk_02: '', // no data
  Manager_ManagerServiceManager_GetSukuk_03: null, // success
  Manager_ManagerServiceManager_GetSukuk_04: 'Unexpected server exception',
}

/**
 * Fetch a paginated list of Sukuk.
 * @param {Object} params
 * @param {string} [params.Name='']        partial name filter
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]   zero-based page index
 */
export const GetSukukApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_SUKUK,
    {
      Name: params.Name || '',
      PageSize: params.PageSize || 10,
      PageNumber: params.PageNumber || 0,
    },
    config
  )

/** Response codes for `SaveSukukApi`. null = success, handled in UI. */
export const SAVE_SUKUK_CODES = {
  Manager_ManagerServiceManager_SaveSukuk_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveSukuk_02: 'Name is required',
  Manager_ManagerServiceManager_SaveSukuk_03: null, // success
  Manager_ManagerServiceManager_SaveSukuk_04: 'Name already exists',
  Manager_ManagerServiceManager_SaveSukuk_05: 'DB insert/update returned 0 rows',
  Manager_ManagerServiceManager_SaveSukuk_06: 'unexpected server exception',
}

/**
 * Create or update a Sukuk record. Pass `PK_SukukID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_SukukID=0]   0 = create new
 * @param {string} params.Name             required
 */
export const SaveSukukApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_SUKUK,
    {
      PK_SukukID: params.PK_SukukID || 0,
      Name: params.Name || '',
      FK_SukukStatusID: params.FK_SukukStatusID || 0,
    },
    config
  )

/** Response codes for `DeleteSukukApi`. null = success, handled in UI. */
export const DELETE_SUKUK_CODES = {
  Manager_ManagerServiceManager_DeleteSukuk_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_DeleteSukuk_02: 'PK_SukukID is required',
  Manager_ManagerServiceManager_DeleteSukuk_03: null, // success
  Manager_ManagerServiceManager_DeleteSukuk_04: 'Record not found or already deleted',
  Manager_ManagerServiceManager_DeleteSukuk_05: 'Unexpected server exception',
}

/**
 * Delete a Sukuk record by its primary key.
 * @param {Object} params
 * @param {number} params.PK_SukukID   required; must be > 0
 */
export const DeleteSukukApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.DELETE_SUKUK,
    {
      PK_SukukID: params.PK_SukukID || 0,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// CHARITABLE ORGANIZATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetCharitableOrgsApi`. null = handled in UI. */
export const GET_CHARITABLE_ORGS_CODES = {
  Manager_ManagerServiceManager_GetCharitableOrgs_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetCharitableOrgs_02: null, // no data
  Manager_ManagerServiceManager_GetCharitableOrgs_03: null, // success
  Manager_ManagerServiceManager_GetCharitableOrgs_04: 'Unexpected server exception',
}

/**
 * Fetch a paginated list of charitable organizations.
 * @param {Object} params
 * @param {string} [params.Name='']        partial name filter
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]   zero-based page index
 */
export const GetCharitableOrgsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_CHARITABLE_ORGS,
    {
      Name: params.Name || '',
      PageSize: params.PageSize || 10,
      PageNumber: params.PageNumber || 0,
    },
    config
  )

/** Response codes for `SaveCharitableOrgApi`. null = success, handled in UI. */
export const SAVE_CHARITABLE_ORGS_CODES = {
  Manager_ManagerServiceManager_SaveCharitableOrg_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveCharitableOrg_02: 'Name is required',
  Manager_ManagerServiceManager_SaveCharitableOrg_03: null, // success
  Manager_ManagerServiceManager_SaveCharitableOrg_04: 'Name already exists',
  Manager_ManagerServiceManager_SaveCharitableOrg_05: 'DB error',
  Manager_ManagerServiceManager_SaveCharitableOrg_06: 'unexpected server exception',
}

/**
 * Create or update a charitable organization. Pass `PK_CharitableOrganizationsID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_CharitableOrganizationsID=0]   0 = create new
 * @param {string} params.Name                               required
 */
export const SaveCharitableOrgApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_CHARITABLE_ORGS,
    {
      PK_CharitableOrganizationsID: params.PK_CharitableOrganizationsID || 0,
      Name: params.Name || '',
      FK_CharitableOrganizationStatusID: params.FK_CharitableOrganizationStatusID || 0,
    },
    config
  )

/** Response codes for `DeleteCharitableOrgApi`. null = success, handled in UI. */
export const DELETE_CHARITABLE_ORGS_CODES = {
  Manager_ManagerServiceManager_DeleteCharitableOrg_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_DeleteCharitableOrg_02: 'PK_CharitableOrganizationsID is required',
  Manager_ManagerServiceManager_DeleteCharitableOrg_03: null, // success
  Manager_ManagerServiceManager_DeleteCharitableOrg_04: 'Record not found or already deleted',
  Manager_ManagerServiceManager_DeleteCharitableOrg_05: 'Unexpected server exception',
}

/**
 * Delete a charitable organization by its primary key.
 * @param {Object} params
 * @param {number} params.PK_CharitableOrganizationsID   required; must be > 0
 */
export const DeleteCharitableOrgApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.DELETE_CHARITABLE_ORGS,
    {
      PK_CharitableOrganizationsID: params.PK_CharitableOrganizationsID || 0,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// ISLAMIC BANK WINDOWS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetIslamicBankWindowsApi`. null = handled in UI. */
export const GET_ISLAMIC_BANK_WINDOWS_CODES = {
  Manager_ManagerServiceManager_GetIslamicBankWindows_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetIslamicBankWindows_02: null, // no data
  Manager_ManagerServiceManager_GetIslamicBankWindows_03: null, // success
  Manager_ManagerServiceManager_GetIslamicBankWindows_04: 'Unexpected server exception',
}

/**
 * Fetch a paginated list of Islamic bank windows.
 * @param {Object} params
 * @param {string} [params.Name='']        partial name filter
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]   zero-based page index
 */
export const GetIslamicBankWindowsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ISLAMIC_BANK_WINDOWS,
    {
      Name: params.Name || '',
      PageSize: params.PageSize || 10,
      PageNumber: params.PageNumber || 0,
    },
    config
  )

/** Response codes for `SaveIslamicBankWindowApi`. null = success, handled in UI. */
export const SAVE_ISLAMIC_BANK_WINDOW_CODES = {
  Manager_ManagerServiceManager_SaveIslamicBankWindow_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveIslamicBankWindow_02: 'Name is required',
  Manager_ManagerServiceManager_SaveIslamicBankWindow_03: null, // success
  Manager_ManagerServiceManager_SaveIslamicBankWindow_04: 'Name already exists',
  Manager_ManagerServiceManager_SaveIslamicBankWindow_05: 'DB error',
  Manager_ManagerServiceManager_SaveIslamicBankWindow_06: 'unexpected server exception',
}

/**
 * Create or update an Islamic bank window. Pass `PK_IslamicBankWindowsID = 0` to create.
 * @param {Object} params
 * @param {number} [params.PK_IslamicBankWindowsID=0]   0 = create new
 * @param {string} params.Name                          required
 */
export const SaveIslamicBankWindowApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_ISLAMIC_BANK_WINDOW,
    {
      PK_IslamicBankWindowsID: params.PK_IslamicBankWindowsID || 0,
      Name: params.Name || '',
      FK_IslamicBankWindowsStatusID: params.FK_IslamicBankWindowsStatusID || 0,
    },
    config
  )

/** Response codes for `DeleteIslamicBankWindowApi`. null = success, handled in UI. */
export const DELETE_ISLAMIC_BANK_WINDOW_CODES = {
  Manager_ManagerServiceManager_DeleteIslamicBankWindow_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_DeleteIslamicBankWindow_02: 'PK_IslamicBankWindowsID is required',
  Manager_ManagerServiceManager_DeleteIslamicBankWindow_03: null, // success
  Manager_ManagerServiceManager_DeleteIslamicBankWindow_04: 'Record not found or already deleted',
  Manager_ManagerServiceManager_DeleteIslamicBankWindow_05: 'Unexpected server exception',
}

/**
 * Delete an Islamic bank window by its primary key.
 * @param {Object} params
 * @param {number} params.PK_IslamicBankWindowsID   required; must be > 0
 */
export const DeleteIslamicBankWindowApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.DELETE_ISLAMIC_BANK_WINDOW,
    {
      PK_IslamicBankWindowsID: params.PK_IslamicBankWindowsID || 0,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// SUSPENDED COMPANIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `GetSuspendedCompaniesApi`. null = handled in UI. */
export const GET_SUSPENDED_COMPANIES_CODES = {
  Manager_ManagerServiceManager_GetSuspendedCompanies_01: null, // no data
  Manager_ManagerServiceManager_GetSuspendedCompanies_02: null, // success
  Manager_ManagerServiceManager_GetSuspendedCompanies_03: 'Unexpected server exception',
}

/**
 * Fetch a paginated list of suspended companies.
 * @param {Object} params
 * @param {number} [params.FK_CompanyID=0]   filter by company ID; 0 = all
 * @param {number} [params.PageSize=10]
 * @param {number} [params.PageNumber=0]     zero-based page index
 */
export const GetSuspendedCompaniesApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_SUSPENDED_COMPANIES,
    {
      FK_CompanyID: params.FK_CompanyID || 0,
      PageSize: params.PageSize || 10,
      PageNumber: params.PageNumber || 0,
    },
    config
  )

/** Response codes for `SaveSuspendedCompanyApi`. null = success, handled in UI. */
export const SAVE_SUSPENDED_COMPANY_CODES = {
  Manager_ManagerServiceManager_SaveSuspendedCompany_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveSuspendedCompany_02: 'Company is required.',
  Manager_ManagerServiceManager_SaveSuspendedCompany_03: 'From quarter is required.',
  Manager_ManagerServiceManager_SaveSuspendedCompany_04: null, // success
  Manager_ManagerServiceManager_SaveSuspendedCompany_05: 'Duplicate — this company already has a suspension for this quarter range.',
  Manager_ManagerServiceManager_SaveSuspendedCompany_06: 'Failed — unexpected SP result.',
  Manager_ManagerServiceManager_SaveSuspendedCompany_07: 'Unexpected server exception.',
  Manager_ManagerServiceManager_SaveSuspendedCompany_08: 'End quarter cannot be before start quarter.',
  Manager_ManagerServiceManager_SaveSuspendedCompany_09: 'This company is already suspended for an overlapping period.',
}

/**
 * Create or update a company suspension record.
 * @param {Object} params
 * @param {number} params.PK_SuspendedCompanyID  0 = CREATE; >0 = UPDATE
 * @param {number} params.FK_CompanyID            required
 * @param {number} params.FK_FromQuarterID        required; start of suspension range
 * @param {number} params.FK_ToQuarterID          0 = open-ended (still suspended)
 */
export const SaveSuspendedCompanyApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_SUSPENDED_COMPANY,
    {
      PK_SuspendedCompanyID: params.PK_SuspendedCompanyID || 0,
      FK_CompanyID: params.FK_CompanyID || 0,
      FK_FromQuarterID: params.FK_FromQuarterID || 0,
      FK_ToQuarterID: params.FK_ToQuarterID || 0,
    },
    config
  )

/** Response codes for `DeleteSuspendedCompanyApi`. null = success, handled in UI. */
export const DELETE_SUSPENDED_COMPANY_CODES = {
  Manager_ManagerServiceManager_DeleteSuspendedCompany_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_DeleteSuspendedCompany_02: 'Record ID is required.',
  Manager_ManagerServiceManager_DeleteSuspendedCompany_05: null, // success
  Manager_ManagerServiceManager_DeleteSuspendedCompany_06: 'Record not found.',
  Manager_ManagerServiceManager_DeleteSuspendedCompany_07: 'Failed — unexpected SP result.',
  Manager_ManagerServiceManager_DeleteSuspendedCompany_08: 'Unexpected server exception.',
}

/**
 * Delete a company suspension record by its surrogate PK.
 * @param {Object} params
 * @param {number} params.PK_SuspendedCompanyID  required
 */
export const DeleteSuspendedCompanyApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.DELETE_SUSPENDED_COMPANY,
    {
      PK_SuspendedCompanyID: params.PK_SuspendedCompanyID || 0,
    },
    config
  )

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response codes for `getAllManagerNotifications`. null = handled in UI. */
export const GET_ALL_MANAGER_NOTIFICATIONS_CODES = {
  Manager_ManagerServiceManager_GetAllNotifications_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetAllNotifications_02: null, // no notifications
  Manager_ManagerServiceManager_GetAllNotifications_03: null, // success
  Manager_ManagerServiceManager_GetAllNotifications_04: 'Something went wrong, please try again.',
}

/** Fetch all notifications for the current manager. */
export const getAllManagerNotifications = (config = {}) =>
  formPost(Manager_URL, RM.GET_ALL_NOTIFICATIONS, {}, config)

/** Response codes for `markManagerNotificationsAsReadAPI`. null = handled in UI. */
export const MARK_MANAGER_NOTIFICATIONS_AS_READ_CODES = {
  Manager_ManagerServiceManager_MarkNotificationsAsRead_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_MarkNotificationsAsRead_02: null, // success
  Manager_ManagerServiceManager_MarkNotificationsAsRead_03: null,
  Manager_ManagerServiceManager_MarkNotificationsAsRead_04:
    'Something went wrong, please try again.',
}

/**
 * Mark one or more notifications as read.
 * @param {number[]} notificationIDs   array of notification IDs to mark as read
 */
export const markManagerNotificationsAsReadAPI = (notificationIDs = [], config = {}) =>
  formPost(Manager_URL, RM.MARK_NOTIFICATIONS_AS_READ, { notificationIDs }, config)

/** Response codes for `SaveSuspendedCompanyApi`. null = success, handled in UI. */
export const UPDATE_PENDING_APPROVAL_CODES = {
  Manager_ManagerServiceManager_UpdatePendingApproval_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_UpdatePendingApproval_02: 'Approval ID is required',
  Manager_ManagerServiceManager_UpdatePendingApproval_03: 'Status ID is required',
  Manager_ManagerServiceManager_UpdatePendingApproval_04: 'Approved/Updated Successfully', // success
  Manager_ManagerServiceManager_UpdatePendingApproval_05: 'Nothing Updated',
  Manager_ManagerServiceManager_UpdatePendingApproval_06: 'Failed — unexpected exception',
}

/**
 * Create a company suspension record.
 * @param {Object} params
 * @param {Array} params.DataApprovalRequestIDs       required
 * @param {number} params.FK_DataApprovalRequestStatusID   required; start of suspension range
 * @param {string} params.Comments     required; end of suspension range
 */
export const UpdatePendingApprovalApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.UPDATE_PENDING_APPROVAL,
    {
      DataApprovalRequestIDs: params.DataApprovalRequestIDs || [],
      FK_DataApprovalRequestStatusID: params.FK_DataApprovalRequestStatusID || 0,
      Comments: params.Comments || '',
    },
    config
  )

// GET_COMPLIANCE_CRITERIA
/** Response codes for `GetComplianceCriteriaApi`. null = success, handled in UI. */
export const GET_COMPLIANCE_CRITERIA_CODES = {
  Manager_ManagerServiceManager_GetComplianceCriteria_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetComplianceCriteria_02: 'No Record Found',
  Manager_ManagerServiceManager_GetComplianceCriteria_03: null, //success
  Manager_ManagerServiceManager_GetComplianceCriteria_04: 'Failed — unexpected exception', // success
}

export const GetComplianceCriteriaApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_COMPLIANCE_CRITERIA,
    {
      CriteriaName: params.CriteriaName || '',
      Description: params.Description || '',
      FinancialRatioName: params.FinancialRatioName || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

// SET_DEFAULT_COMPLIANCE_CRITERIA
/** Response codes for `GetComplianceCriteriaApi`. null = success, handled in UI. */
export const SET_DEFAULT_COMPLIANCE_CRITERIA_CODES = {
  Manager_ManagerServiceManager_GetComplianceCriteria_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetComplianceCriteria_02: 'ID required',
  Manager_ManagerServiceManager_GetComplianceCriteria_03: null, //success
  Manager_ManagerServiceManager_GetComplianceCriteria_04: 'Failed — unexpected exception', // success
}

export const SetDefaultComplianceCriteriaApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SET_DEFAULT_COMPLIANCE_CRITERIA,
    {
      PK_ComplianceCriteriaID: params.PK_ComplianceCriteriaID || 0,
    },
    config
  )

// GET_COMPLIANCE_CRITERIA_BY_ID
/** Response codes for `GetComplianceCriteriaApi`. null = success, handled in UI. */
export const GET_COMPLIANCE_CRITERIA_BY_ID_CODES = {
  Manager_ManagerServiceManager_GetComplianceCriteriaByID_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetComplianceCriteriaByID_02: 'ID Required',
  Manager_ManagerServiceManager_GetComplianceCriteriaByID_03: 'ID not found',
  Manager_ManagerServiceManager_GetComplianceCriteriaByID_04: null, // success
  Manager_ManagerServiceManager_GetComplianceCriteriaByID_05: 'Failed — unexpected exception', // Failed
}

export const GetComplianceCriteriaByIDApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_COMPLIANCE_CRITERIA_BY_ID,
    {
      PK_ComplianceCriteriaID: params.PK_ComplianceCriteriaID || 0,
    },
    config
  )

// VITE_RM_CHECK_COMPLIANCE_CRITERIA_NAME
/** Response codes for `CheckFinancialRatioName`. null = handled in UI. */
export const CHECK_COMPLIANCE_CRITERIA_NAME_CODES = {
  Manager_ManagerServiceManager_CheckComplianceCriteriaName_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_CheckComplianceCriteriaName_02: 'Name Required',
  Manager_ManagerServiceManager_CheckComplianceCriteriaName_03: null,
  Manager_ManagerServiceManager_CheckComplianceCriteriaName_04: 'Exception',
}

export const CheckComplianceCriteriaNameApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.CHECK_COMPLIANCE_CRITERIA_NAME,
    {
      CriteriaName: params.CriteriaName || '',
    },
    config
  )

// VITE_RM_GET_ALL_ACTIVE_FINANCIAL_RATIOS
/** Response codes for `CheckFinancialRatioName`. null = handled in UI. */
export const GET_ALL_ACTIVE_FINANCIAL_RATIOS_CODES = {
  Manager_ManagerServiceManager_GetAllActiveFinancialRatios_01: 'No active financial ratio found',
  Manager_ManagerServiceManager_GetAllActiveFinancialRatios_02: null,
  Manager_ManagerServiceManager_GetAllActiveFinancialRatios_03: 'Unexpected exception',
}

export const GetAllActiveFinancialRatiosApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_ALL_ACTIVE_FINANCIAL_RATIOS,
    {
      Name: params.Name || '',
    },
    config
  )

// SAVE_COMPLIANCE_CRITERIA
export const SAVE_COMPLIANCE_CRITERIA_CODES = {
  Manager_ManagerServiceManager_SaveComplianceCriteria_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveComplianceCriteria_02: 'Validation failed.',
  Manager_ManagerServiceManager_SaveComplianceCriteria_03: null, // Success
  Manager_ManagerServiceManager_SaveComplianceCriteria_04: 'An unexpected error occurred.',
}

export const SaveComplianceCriteriaApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_COMPLIANCE_CRITERIA,
    {
      PK_ComplianceCriteriaID: params.PK_ComplianceCriteriaID || 0,
      CriteriaName: params.CriteriaName || '',
      Description: params.Description || '',
      FK_ComplianceCriteriaStatusID: params.FK_ComplianceCriteriaStatusID || 0,
      Ratios: (params.Ratios || []).map((r) => ({
        FK_FinancialRatiosID: r.FK_FinancialRatiosID || 0,
        ThresholdValue: r.ThresholdValue ?? 0,
        IsMaxValidationApplied: r.IsMaxValidationApplied ?? 0,
        ThresholdUnit: r.ThresholdUnit || '%',
        Sequence: r.Sequence || 0,
      })),
    },
    config
  )
