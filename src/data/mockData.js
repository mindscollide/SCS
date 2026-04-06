/**
 * src/data/mockData.js
 * =====================
 * Central repository for all mock / seed data used across Manager pages.
 * Import from here instead of defining data locally in each page component.
 *
 * TODO — replace each export with a real API call during backend integration:
 *   GET /api/manager/quarters              → REPORT_QUARTER_STRINGS
 *   GET /api/manager/companies             → COMPANIES
 *   GET /api/manager/sectors               → SECTORS
 *   GET /api/manager/compliance-criteria   → CRITERIA_LIST
 *   GET /api/reports/compliance-standing   → MOCK_COMPLIANCE_RESULTS
 *   GET /api/reports/sharia-notice         → MOCK_SHARIA_TO_COMPLIANT / _NON_COMPLIANT
 *   GET /api/reports/data-not-received     → MOCK_DATA_NOT_RECEIVED
 *   GET /api/reports/quarterly-summary     → MOCK_QUARTERLY_SUMMARY
 *   GET /api/reports/market-cap            → MOCK_MARKET_CAP
 *   GET /api/reports/quarter-wise          → MOCK_QUARTER_WISE_RESULTS
 *   GET /api/manager/suspended-companies   → INITIAL_SUSPENDED_COMPANIES
 *
 * Quick import guide:
 *   BasketManagementPage   → CRITERIA_LIST, COMPANIES, SECTORS
 *   ComplianceStandingPage → COMPANIES, CRITERIA_LIST, CRITERIA_RATIOS_BY_NAME, MOCK_COMPLIANCE_RESULTS
 *   CompanyListingPage     → COMPANIES, ANNUAL_REPORTING_OPTIONS, MARKET_OPTIONS,
 *                            REPORTING_FREQUENCY_OPTIONS, COMPANY_STATUS_OPTIONS
 *   DataNotReceivedPage    → REPORT_QUARTER_STRINGS, MOCK_DATA_NOT_RECEIVED
 *   MarketCapPage          → REPORT_QUARTER_OPTIONS, COMPANIES, MOCK_MARKET_CAP
 *   QuarterWiseReportPage  → REPORT_QUARTER_OPTIONS, SECTORS, COMPANIES, CRITERIA_LIST,
 *                            CRITERIA_RATIOS_BY_NAME, MOCK_QUARTER_WISE_RESULTS
 *   QuarterlySummaryPage   → REPORT_QUARTER_STRINGS, MOCK_QUARTERLY_SUMMARY
 *   ShariaNoticePage       → REPORT_QUARTER_STRINGS, MOCK_SHARIA_TO_COMPLIANT, MOCK_SHARIA_TO_NON_COMPLIANT
 *   SuspendedCompaniesPage → SUSPENDED_QUARTER_STRINGS, INVESTMENT_COMPANY_NAMES, INITIAL_SUSPENDED_COMPANIES
 */

// ─────────────────────────────────────────────────────────────────────────────
// QUARTERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard quarter strings in "Month - Year" format, newest-first.
 * Used as Select options in Sharia Notice, Data Not Received, Quarterly Summary.
 */
export const REPORT_QUARTER_STRINGS = [
  'December - 2025',
  'September - 2025',
  'June - 2025',
  'March - 2025',
  'December - 2024',
  'September - 2024',
  'June - 2024',
  'March - 2024',
  'December - 2023',
  'September - 2023',
]

/**
 * Same quarters as {label, value} objects — used in MultiSelect dropdowns
 * (Basket Management, Market Cap, Quarter Wise Report).
 */
export const REPORT_QUARTER_OPTIONS = REPORT_QUARTER_STRINGS.map((q) => ({
  label: q,
  value: q,
}))

/**
 * Quarters in "Month Year" format (no dash) — used exclusively by
 * Suspended Companies page where the SRS shows this alternate format.
 * Newest-first; index 0 = most recent (used for chronological sort/validation).
 */
export const SUSPENDED_QUARTER_STRINGS = [
  'December 2025',
  'September 2025',
  'June 2025',
  'March 2025',
  'December 2024',
  'September 2024',
  'June 2024',
  'March 2024',
  'December 2023',
  'September 2023',
  'June 2023',
  'March 2023',
]

// ─────────────────────────────────────────────────────────────────────────────
// SECTORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master sector list.
 * BasketManagementPage uses id for sector-wise filtering.
 * Other pages use name as a display/filter value.
 */
export const SECTORS = [
  { id: 1, name: 'Pharmaceuticals'      },
  { id: 2, name: 'Insurance'            },
  { id: 3, name: 'Cement'               },
  { id: 4, name: 'Oil & Gas'            },
  { id: 5, name: 'Automobile Assembler' },
  { id: 6, name: 'Banking'              },
  { id: 7, name: 'Textile'              },
  { id: 8, name: 'Technology'           },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Master company list — source of truth for all pages.
 *
 * Fields used by each page:
 *  id              → BasketManagementPage  (company MultiSelect value)
 *  name            → all pages
 *  ticker          → MarketCap, CompanyListing, ShariaNotice
 *  sector          → QuarterWise, BasketManagement, CompanyListing
 *  sectorId        → BasketManagementPage  (sector-wise filtering)
 *  market          → CompanyListing
 *  latestQuarter   → BasketManagement, QuarterWise mock results
 *  frequency       → CompanyListing
 *  status          → CompanyListing
 *  exception       → CompanyListing
 *  annualReporting → CompanyListing
 *  nature          → CompanyListing
 */
export const COMPANIES = [
  {
    id: 1,
    name: 'Abbot Laboratories (Pakistan) Limited',
    ticker: 'ABOT',
    sector: 'Pharmaceuticals',
    sectorId: 1,
    market: 'KSE Main Board',
    latestQuarter: 'June - 2024',
    frequency: 'Quarterly',
    status: 'Active',
    exception: false,
    annualReporting: 'December',
    nature: 'Manufacturing',
  },
  {
    id: 2,
    name: 'Adamjee Insurance Company Limited',
    ticker: 'AICL',
    sector: 'Insurance',
    sectorId: 2,
    market: 'KSE Main Board',
    latestQuarter: 'June - 2024',
    frequency: 'Quarterly',
    status: 'Active',
    exception: false,
    annualReporting: 'December',
    nature: 'Financial Service',
  },
  {
    id: 3,
    name: 'Attock Cement (Pakistan) Limited',
    ticker: 'ACPL',
    sector: 'Cement',
    sectorId: 3,
    market: 'KSE Main Board',
    latestQuarter: 'June - 2024',
    frequency: 'Quarterly',
    status: 'Active',
    exception: false,
    annualReporting: 'June',
    nature: 'Manufacturing',
  },
  {
    id: 4,
    name: 'Cnergyico PK Limited',
    ticker: 'CNERGY',
    sector: 'Oil & Gas',
    sectorId: 4,
    market: 'KSE Main Board',
    latestQuarter: 'March - 2024',
    frequency: 'Semi-Annual',
    status: 'Active',
    exception: true,
    annualReporting: 'March',
    nature: 'Exploration',
  },
  {
    id: 5,
    name: 'Indus Motor Company Limited',
    ticker: 'INDU',
    sector: 'Automobile Assembler',
    sectorId: 5,
    market: 'KSE Main Board',
    latestQuarter: 'June - 2024',
    frequency: 'Quarterly',
    status: 'Active',
    exception: false,
    annualReporting: 'June',
    nature: 'Manufacturing',
  },
  {
    id: 6,
    name: 'MCB Bank Limited',
    ticker: 'MCB',
    sector: 'Banking',
    sectorId: 6,
    market: 'KSE Main Board',
    latestQuarter: 'December - 2023',
    frequency: 'Quarterly',
    status: 'Active',
    exception: false,
    annualReporting: 'December',
    nature: 'Financial Service',
  },
  {
    id: 7,
    name: 'Nishat Mills Limited',
    ticker: 'NML',
    sector: 'Textile',
    sectorId: 7,
    market: 'KSE Main Board',
    latestQuarter: 'September - 2023',
    frequency: 'Quarterly',
    status: 'Active',
    exception: false,
    annualReporting: 'June',
    nature: 'Manufacturing',
  },
  {
    id: 8,
    name: 'Pakistan Petroleum Limited',
    ticker: 'PPL',
    sector: 'Oil & Gas',
    sectorId: 4,
    market: 'KSE Main Board',
    latestQuarter: 'June - 2024',
    frequency: 'Quarterly',
    status: 'Active',
    exception: false,
    annualReporting: 'June',
    nature: 'Exploration',
  },
  {
    id: 9,
    name: 'Systems Limited',
    ticker: 'SYS',
    sector: 'Technology',
    sectorId: 8,
    market: 'KSE SME Board',
    latestQuarter: 'December - 2023',
    frequency: 'Annual',
    status: 'Active',
    exception: false,
    annualReporting: 'December',
    nature: 'IT Services',
  },
  {
    id: 10,
    name: 'Pak Suzuki Motor Company Limited',
    ticker: 'PSMC',
    sector: 'Automobile Assembler',
    sectorId: 5,
    market: 'KSE Main Board',
    latestQuarter: 'December - 2023',
    frequency: 'Quarterly',
    status: 'Suspended',
    exception: false,
    annualReporting: 'December',
    nature: 'Manufacturing',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE CRITERIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flat list of all compliance criteria with their financial ratios.
 * NOTE: Must remain a flat array — never nest inside another array.
 *
 * Each item: { id, name, isDefault, ratios: [{id, name, threshold, unit}] }
 */
export const CRITERIA_LIST = [
  {
    id: 1,
    name: 'Hilal Compliance Criteria',
    isDefault: true,
    ratios: [
      { id: 1,  name: 'Debt to Assets',                                    threshold: 32, unit: '%' },
      { id: 2,  name: 'Non Compliant Investment to Total Investment',       threshold: 33, unit: '%' },
      { id: 3,  name: 'Non Compliant Income to Total Income',               threshold: 30, unit: '%' },
      { id: 4,  name: 'Liquid Assets to Total Assets',                      threshold: 41, unit: '%' },
      { id: 5,  name: 'Net Liquid Assets per share',                        threshold: 25, unit: '%' },
    ],
  },
  {
    id: 2,
    name: 'Bilal Compliance Criteria',
    isDefault: false,
    ratios: [
      { id: 1,  name: 'Debt to Assets',                                    threshold: 35, unit: '%' },
      { id: 2,  name: 'Non Compliant Investment to Total Investment',       threshold: 30, unit: '%' },
      { id: 6,  name: 'Short-Term Borrowings to Total Assets',             threshold: 20, unit: '%' },
    ],
  },
  {
    id: 3,
    name: 'ABC Compliance Criteria',
    isDefault: false,
    ratios: [
      { id: 3,  name: 'Non Compliant Income to Total Income',               threshold: 33, unit: '%' },
      { id: 4,  name: 'Liquid Assets to Total Assets',                      threshold: 50, unit: '%' },
    ],
  },
  {
    id: 4,
    name: 'DEF Compliance Criteria',
    isDefault: false,
    ratios: [
      { id: 1,  name: 'Debt to Assets',                                    threshold: 30, unit: '%' },
      { id: 5,  name: 'Net Liquid Assets per share',                        threshold: 20, unit: '%' },
    ],
  },
  {
    id: 5,
    name: 'A to Z Compliance Criteria',
    isDefault: false,
    ratios: [
      { id: 2,  name: 'Non Compliant Investment to Total Investment',       threshold: 40, unit: '%' },
      { id: 3,  name: 'Non Compliant Income to Total Income',               threshold: 35, unit: '%' },
      { id: 7,  name: 'Total Debt to Total Equity',                         threshold: 60, unit: '%' },
    ],
  },
  {
    id: 6,
    name: 'MOC Compliance Criteria',
    isDefault: false,
    ratios: [
      { id: 1,  name: 'Debt to Assets',                                    threshold: 28, unit: '%' },
      { id: 4,  name: 'Liquid Assets to Total Assets',                      threshold: 45, unit: '%' },
      { id: 8,  name: 'Islamic Income to Total Revenue',                    threshold: 95, unit: '%' },
    ],
  },
  {
    id: 7,
    name: 'Global Shariah Standard',
    isDefault: false,
    ratios: [
      { id: 1,  name: 'Debt to Assets',                                    threshold: 30, unit: '%' },
      { id: 9,  name: 'Interest Income to Revenue',                         threshold: 5,  unit: '%' },
      { id: 3,  name: 'Non Compliant Income to Total Income',               threshold: 3,  unit: '%' },
    ],
  },
  {
    id: 8,
    name: 'Equity Compliance Model',
    isDefault: false,
    ratios: [
      { id: 4,  name: 'Liquid Assets to Total Assets',                      threshold: 40, unit: '%' },
      { id: 10, name: 'Cash to Market Cap',                                  threshold: 33, unit: '%' },
      { id: 11, name: 'Receivables Ratio',                                   threshold: 45, unit: '%' },
    ],
  },
  {
    id: 9,
    name: 'Ethical Investment Criteria',
    isDefault: false,
    ratios: [
      { id: 12, name: 'Non-Halal Revenue',                                   threshold: 4,  unit: '%' },
      { id: 8,  name: 'Islamic Income to Total Revenue',                    threshold: 90, unit: '%' },
      { id: 13, name: 'Debt Ratio',                                          threshold: 25, unit: '%' },
    ],
  },
  {
    id: 10,
    name: 'Financial Purity Model',
    isDefault: false,
    ratios: [
      { id: 14, name: 'Cash + Interest Bearing Securities',                  threshold: 30, unit: '%' },
      { id: 15, name: 'Accounts Receivable',                                 threshold: 50, unit: '%' },
      { id: 16, name: 'Debt to Equity',                                      threshold: 35, unit: '%' },
    ],
  },
  {
    id: 11,
    name: 'Halal Growth Index',
    isDefault: false,
    ratios: [
      { id: 17, name: 'Interest Expense Ratio',                              threshold: 6,  unit: '%' },
      { id: 18, name: 'Liquidity Ratio',                                     threshold: 38, unit: '%' },
      { id: 19, name: 'Revenue Purification',                                threshold: 95, unit: '%' },
    ],
  },
  {
    id: 12,
    name: 'Shariah Screening Model A',
    isDefault: false,
    ratios: [
      { id: 20, name: 'Debt to Market Cap',                                  threshold: 28, unit: '%' },
      { id: 21, name: 'Cash Ratio',                                          threshold: 33, unit: '%' },
      { id: 22, name: 'Non-Compliant Activities',                            threshold: 2,  unit: '%' },
    ],
  },
  {
    id: 13,
    name: 'Shariah Screening Model B',
    isDefault: false,
    ratios: [
      { id: 23, name: 'Interest Income',                                     threshold: 4,  unit: '%' },
      { id: 24, name: 'Debt Level',                                          threshold: 27, unit: '%' },
      { id: 25, name: 'Receivables to Assets',                               threshold: 49, unit: '%' },
    ],
  },
  {
    id: 14,
    name: 'Islamic Equity Benchmark',
    isDefault: false,
    ratios: [
      { id: 26, name: 'Cash Holdings',                                       threshold: 35, unit: '%' },
      { id: 27, name: 'Interest-Based Debt',                                 threshold: 30, unit: '%' },
      { id: 28, name: 'Halal Revenue Share',                                 threshold: 92, unit: '%' },
    ],
  },
  {
    id: 15,
    name: 'Clean Finance Criteria',
    isDefault: false,
    ratios: [
      { id: 29, name: 'Non-Permissible Income',                              threshold: 3,  unit: '%' },
      { id: 30, name: 'Debt Ratio',                                          threshold: 29, unit: '%' },
      { id: 31, name: 'Liquidity to Assets',                                 threshold: 42, unit: '%' },
    ],
  },
  {
    id: 16,
    name: 'Sustainable Shariah Index',
    isDefault: false,
    ratios: [
      { id: 32, name: 'Interest Exposure',                                   threshold: 5,  unit: '%' },
      { id: 33, name: 'Debt Coverage',                                       threshold: 26, unit: '%' },
      { id: 34, name: 'Islamic Compliance Score',                            threshold: 93, unit: '%' },
    ],
  },
]

/**
 * Criteria ratios keyed by criteria NAME (string).
 * Used in pages that reference criteria by name (ComplianceStanding, QuarterWise).
 * Each value is [{name, threshold}] — compatible with RatiosPanel component.
 */
export const CRITERIA_RATIOS_BY_NAME = Object.fromEntries(
  CRITERIA_LIST.map((c) => [
    c.name,
    c.ratios.map((r) => ({ name: r.name, threshold: r.threshold })),
  ])
)

// ─────────────────────────────────────────────────────────────────────────────
// SUSPENDED COMPANIES CONFIG DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Investment / management firms used in the Suspended Companies configuration.
 * These are distinct from the listed COMPANIES above.
 */
export const INVESTMENT_COMPANY_NAMES = [
  'Al-Hilal Investments',
  'Investment Facilitation Centre (IFC), Off',
  'NMA NMU Venture Capital Management (Limited)',
  'Overseas Investors Chamber of Commerce & Industry (OICCI)',
  'Pakistan-Kuwait Investment Company (PKIC)',
  'Sannypce',
  'Saif Ventures',
  'Special Investment Facilitation Council (SIFC)',
  'TMT Ventures',
  'Zayn VC',
]

/** Seed rows for Suspended Companies table. Replace with GET /api/manager/suspended-companies */
export const INITIAL_SUSPENDED_COMPANIES = [
  { id: 1, company: 'Investment Facilitation Centre (IFC), Off',     fromQuarter: 'June 2025',      toQuarter: 'September 2025' },
  { id: 2, company: 'Special Investment Facilitation Council (SIFC)', fromQuarter: 'March 2025',     toQuarter: ''               },
  { id: 3, company: 'TMT Ventures',                                   fromQuarter: 'September 2024', toQuarter: 'December 2024'  },
]

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY LISTING FILTER OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const ANNUAL_REPORTING_OPTIONS = [
  { label: 'June',      value: 'June'      },
  { label: 'September', value: 'September' },
  { label: 'December',  value: 'December'  },
  { label: 'March',     value: 'March'     },
]

export const MARKET_OPTIONS = [
  { label: 'KSE Main Board', value: 'KSE Main Board' },
  { label: 'KSE SME Board',  value: 'KSE SME Board'  },
  { label: 'KSE XD Board',   value: 'KSE XD Board'   },
]

export const REPORTING_FREQUENCY_OPTIONS = [
  { label: '-- Select --',  value: ''              },
  { label: 'Annual',        value: 'Annual'        },
  { label: 'Semi-Annual',   value: 'Semi-Annual'   },
  { label: 'Quarterly',     value: 'Quarterly'     },
]

export const COMPANY_STATUS_OPTIONS = [
  { label: '-- Select --', value: ''          },
  { label: 'Active',       value: 'Active'    },
  { label: 'In-Active',    value: 'In-Active' },
  { label: 'Suspended',    value: 'Suspended' },
]

// ─────────────────────────────────────────────────────────────────────────────
// MOCK REPORT RESULTS
// ─────────────────────────────────────────────────────────────────────────────

/** ComplianceStandingPage — mock results for Generate Report */
export const MOCK_COMPLIANCE_RESULTS = [
  { id: 1, company: 'Abbot Laboratories (Pakistan) Limited', quarter: 'June - 2024',      status: 'Compliant'     },
  { id: 2, company: 'Adamjee Insurance Company Limited',     quarter: 'June - 2024',      status: 'Non-Compliant' },
  { id: 3, company: 'Attock Cement (Pakistan) Limited',      quarter: 'June - 2024',      status: 'Compliant'     },
  { id: 4, company: 'Cnergyico PK Limited',                  quarter: 'March - 2024',     status: 'Compliant'     },
  { id: 5, company: 'Indus Motor Company Limited',           quarter: 'June - 2024',      status: 'Non-Compliant' },
]

/** ShariaNoticePage — companies that moved from Non-Compliant to Compliant */
export const MOCK_SHARIA_TO_COMPLIANT = [
  { id: 1, company: 'Abbot Laboratories (Pakistan) Limited', ticker: 'ABOT',    ratio: 'Interest bearing debts / total asset',    threshold: 'Less than 37%' },
  { id: 2, company: 'Adamjee Insurance Company Limited',     ticker: 'AICL',    ratio: 'Non-compliant income to total income',    threshold: 'Less than 5%'  },
]

/** ShariaNoticePage — companies that moved from Compliant to Non-Compliant */
export const MOCK_SHARIA_TO_NON_COMPLIANT = [
  { id: 1, company: 'Attock Cement (Pakistan) Limited',    ticker: 'ACPL',    ratio: 'Illiquid asset to total asset',              threshold: 'Less than 37%'    },
  { id: 2, company: 'Cnergyico PK Limited',                ticker: 'CNERGY',  ratio: 'Non-compliant income to total income',       threshold: 'Less than 33%'    },
  { id: 3, company: 'Pakistan Petroleum Limited',          ticker: 'PPL',     ratio: 'Non-compliant investment to total investment',threshold: 'Less than 25%'    },
  { id: 4, company: 'MCB Bank Limited',                    ticker: 'MCB',     ratio: 'Illiquid asset to total asset',              threshold: 'Greater than 25%' },
  { id: 5, company: 'Nishat Mills Limited',                ticker: 'NML',     ratio: 'Interest bearing debts / total asset',       threshold: 'Less than 30%'    },
]

/** DataNotReceivedPage — companies that have not submitted data */
export const MOCK_DATA_NOT_RECEIVED = [
  { id: 1, ticker: 'AGHA',    company: 'Agha Steel Industries Limited'  },
  { id: 2, ticker: 'BFAGRO',  company: 'Barkav Frioan Agro Limited'     },
  { id: 3, ticker: 'DFML',    company: 'Dewan Farooque Motors'          },
  { id: 4, ticker: 'KEL',     company: 'K-Electric Limited'             },
  { id: 5, ticker: 'OCTOPUS', company: 'Octopus Digital Limited'        },
]

/**
 * QuarterlySummaryPage — section data keyed by selected quarter string.
 * Each value is an array of section rows, newest quarter first.
 */
export const MOCK_QUARTERLY_SUMMARY = {
  'September - 2025': [
    { quarter: 'SEPTEMBER 2025', compliant: 0,   nonCompliant: 0,   suspended: 0,   total: 0   },
    { quarter: 'JUNE 2025',      compliant: 257,  nonCompliant: 104, suspended: 104, total: 525 },
    { quarter: 'MARCH 2025',     compliant: 264,  nonCompliant: 157, suspended: 103, total: 524 },
  ],
  'June - 2025': [
    { quarter: 'JUNE 2025',      compliant: 257,  nonCompliant: 104, suspended: 104, total: 525 },
    { quarter: 'MARCH 2025',     compliant: 264,  nonCompliant: 157, suspended: 103, total: 524 },
  ],
  'March - 2025': [
    { quarter: 'MARCH 2025',     compliant: 264,  nonCompliant: 157, suspended: 103, total: 524 },
    { quarter: 'DECEMBER 2024',  compliant: 251,  nonCompliant: 148, suspended: 99,  total: 498 },
  ],
  'December - 2024': [
    { quarter: 'DECEMBER 2024',  compliant: 251,  nonCompliant: 148, suspended: 99,  total: 498 },
    { quarter: 'SEPTEMBER 2024', compliant: 245,  nonCompliant: 141, suspended: 96,  total: 482 },
  ],
}

/**
 * MarketCapPage — market cap values (PKR Billion) keyed by company name then quarter.
 */
export const MOCK_MARKET_CAP = {
  'Abbot Laboratories (Pakistan) Limited': { 'December - 2025': 65.2, 'September - 2025': 62.1, 'June - 2025': 59.3, 'March - 2025': 57.0, 'December - 2024': 55.8, 'September - 2024': 53.1, 'June - 2024': 58.4, 'March - 2024': 55.1, 'December - 2023': 52.3, 'September - 2023': 49.8 },
  'Adamjee Insurance Company Limited':     { 'December - 2025': 27.4, 'September - 2025': 25.9, 'June - 2025': 24.5, 'March - 2025': 23.2, 'December - 2024': 22.0, 'September - 2024': 21.4, 'June - 2024': 22.7, 'March - 2024': 21.0, 'December - 2023': 19.5, 'September - 2023': 18.3 },
  'Attock Cement (Pakistan) Limited':      { 'December - 2025': 39.1, 'September - 2025': 37.5, 'June - 2025': 36.1, 'March - 2025': 34.8, 'December - 2024': 33.5, 'September - 2024': 33.9, 'June - 2024': 34.6, 'March - 2024': 33.2, 'December - 2023': 31.7, 'September - 2023': 30.0 },
  'Cnergyico PK Limited':                  { 'December - 2025': 19.3, 'September - 2025': 18.1, 'June - 2025': 17.0, 'March - 2025': 16.2, 'December - 2024': 15.4, 'September - 2024': 16.2, 'June - 2024': 15.9, 'March - 2024': 14.8, 'December - 2023': 13.6, 'September - 2023': 12.5 },
  'Indus Motor Company Limited':           { 'December - 2025': 103.5,'September - 2025': 99.1, 'June - 2025': 95.2, 'March - 2025': 92.3, 'December - 2024': 89.7, 'September - 2024': 94.6, 'June - 2024': 91.3, 'March - 2024': 87.5, 'December - 2023': 83.0, 'September - 2023': 78.2 },
  'MCB Bank Limited':                      { 'December - 2025': 162.4,'September - 2025': 155.8,'June - 2025': 150.3,'March - 2025': 145.7,'December - 2024': 141.2,'September - 2024': 148.6,'June - 2024': 143.8,'March - 2024': 138.4,'December - 2023': 132.1,'September - 2023': 125.7 },
  'Nishat Mills Limited':                  { 'December - 2025': 54.3, 'September - 2025': 52.0, 'June - 2025': 50.1, 'March - 2025': 48.5, 'December - 2024': 46.8, 'September - 2024': 48.3, 'June - 2024': 47.2, 'March - 2024': 45.6, 'December - 2023': 43.8, 'September - 2023': 41.5 },
  'Pakistan Petroleum Limited':            { 'December - 2025': 89.2, 'September - 2025': 85.7, 'June - 2025': 82.4, 'March - 2025': 79.6, 'December - 2024': 76.8, 'September - 2024': 80.1, 'June - 2024': 78.5, 'March - 2024': 74.1, 'December - 2023': 70.3, 'September - 2023': 66.8 },
}

/** QuarterWiseReportPage — per-company status results */
export const MOCK_QUARTER_WISE_RESULTS = [
  { id: 1, company: 'Abbot Laboratories (Pakistan) Limited', sector: 'Pharmaceuticals',      quarter: 'June - 2024',      status: 'Compliant'     },
  { id: 2, company: 'Adamjee Insurance Company Limited',     sector: 'Insurance',            quarter: 'June - 2024',      status: 'Non-Compliant' },
  { id: 3, company: 'Attock Cement (Pakistan) Limited',      sector: 'Cement',               quarter: 'June - 2024',      status: 'Compliant'     },
  { id: 4, company: 'Cnergyico PK Limited',                  sector: 'Oil & Gas',            quarter: 'March - 2024',     status: 'Compliant'     },
  { id: 5, company: 'Indus Motor Company Limited',           sector: 'Automobile Assembler', quarter: 'June - 2024',      status: 'Non-Compliant' },
  { id: 6, company: 'MCB Bank Limited',                      sector: 'Banking',              quarter: 'December - 2023',  status: 'Compliant'     },
  { id: 7, company: 'Nishat Mills Limited',                  sector: 'Textile',              quarter: 'September - 2023', status: 'Non-Compliant' },
]
