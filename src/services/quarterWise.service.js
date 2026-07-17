/**
 * src/services/quarterWise.service.js
 * =====================================
 * Quarter-wise Report — SRS Report #2.
 *
 * The SAME four endpoints exist on BOTH the Manager and DataEntry service
 * (separate role-gated copies backed by shared SPs — verified against
 * `E:\SCS\Api document\API_Reference\03_Manager.md` + `04_DataEntry.md`,
 * 2026-06-19). The report screen is shared between the two roles, so this
 * module dispatches to the correct service URL by the logged-in role; the
 * response-code prefix differs by service but the trailing _NN suffix is
 * identical — success is always `_03`.
 *
 * Step 1 (threshold prefill) is handled by the existing
 * `GetComplianceStandingThresholdsApi` in `complianceStanding.service.js`
 * — the same endpoint and flow.
 *
 * Flow (page-level):
 *  1. GetComplianceStandingThresholds — Search → prefill editable thresholds.
 *  2. GenerateQuarterWiseReport       — Generate Report → multi-quarter matrix.
 *  3. GetQuarterWiseNonCompliantDetail — click Non-Compliant cell → ratio detail modal.
 *  4/5. ExportQuarterWiseReport[Excel] — base64 PDF / XLSX download.
 *
 * Codes (both services): _01 unauth · _02 required fields missing (Generate/Export:
 *  RatioThresholds null/empty since #97; NonCompliantDetail: ComplianceCriteriaID ≤ 0) ·
 *  _03 success · _04 exception. No MQTT (read-only).
 */

import { formPost, Manager_URL, DataEntry_URL } from '../utils/api'

const RM = {
  GENERATE:            import.meta.env.VITE_RM_GENERATE_QUARTER_WISE_REPORT,
  NON_COMPLIANT:       import.meta.env.VITE_RM_GET_QUARTER_WISE_NON_COMPLIANT_DETAIL,
  EXPORT_PDF:          import.meta.env.VITE_RM_EXPORT_QUARTER_WISE_REPORT,
  EXPORT_XLSX:         import.meta.env.VITE_RM_EXPORT_QUARTER_WISE_REPORT_EXCEL,
}

const getRoleId = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user_roles') || '[]')?.[0]?.roleID ?? 2
  } catch {
    return 2
  }
}
const reportUrl = () => (Number(getRoleId()) === 3 ? DataEntry_URL : Manager_URL)

// ── Response-code helpers ──────────────────────────────────────────────────
export const isQuarterWiseSuccess = (rr) =>
  rr?.isExecuted === true && String(rr?.responseMessage || '').endsWith('_03')

export const quarterWiseError = (code = '') => {
  const c = String(code || '')
  if (!c || c.endsWith('_03')) return null
  if (c.endsWith('_02')) return 'Required parameters are missing.'
  if (c.endsWith('_01')) return 'Unauthorized access.'
  return 'Something went wrong, please try again.'
}

// ── Step 2 — generate quarter-wise report ──────────────────────────────────
/**
 * @param {Object} params
 * @param {number[]} [params.CompanyIDs]      empty = all active companies
 * @param {number[]}  params.QuarterIDs       required (at least one)
 * @param {string}   [params.CriteriaName]    display label only — shown in PDF/Excel header
 *   (2026-07-15 #97: ComplianceCriteriaID removed; RatioThresholds is now the sole ratio-set
 *   source; CriteriaName is cosmetic and optional)
 * @param {Array}     params.RatioThresholds  now mandatory (not optional) — must be non-empty;
 *   row: { FK_FinancialRatiosID, ThresholdValue, IsMaxValidationApplied, ThresholdUnit }
 * Response: { Results: [{ CompanyID, Company, Ticker, Sector, QuarterID, Quarter,
 *   Status, IsCarried, IsException, ExceptionReason }] }
 */
export const GenerateQuarterWiseReportApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.GENERATE,
    {
      CompanyIDs: Array.isArray(params.CompanyIDs) ? params.CompanyIDs : [],
      QuarterIDs: Array.isArray(params.QuarterIDs) ? params.QuarterIDs : [],
      CriteriaName: params.CriteriaName || '',
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )

// ── Non-Compliant detail modal ─────────────────────────────────────────────
/**
 * @param {Object} params
 * @param {number} params.CompanyID
 * @param {number} params.QuarterID
 * @param {number} params.ComplianceCriteriaID
 * @param {Array}  params.RatioThresholds  same shape as GenerateQuarterWiseReport
 * Response: { CompanyName, QuarterName, CriteriaName,
 *   Ratios: [{ FinancialRatioID, RatioName, ThresholdValue, ThresholdUnit,
 *              IsMaxValidation, CalculatedValue, Passed }] }
 */
export const GetQuarterWiseNonCompliantDetailApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.NON_COMPLIANT,
    {
      CompanyID: params.CompanyID || 0,
      QuarterID: params.QuarterID || 0,
      ComplianceCriteriaID: params.ComplianceCriteriaID || 0,
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )

// ── Exports (base64 file) ──────────────────────────────────────────────────
// Same request shape as GenerateQuarterWiseReportApi (#97: CriteriaName not ComplianceCriteriaID)
export const ExportQuarterWiseReportApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.EXPORT_PDF,
    {
      CompanyIDs: Array.isArray(params.CompanyIDs) ? params.CompanyIDs : [],
      QuarterIDs: Array.isArray(params.QuarterIDs) ? params.QuarterIDs : [],
      CriteriaName: params.CriteriaName || '',
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )

export const ExportQuarterWiseReportExcelApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.EXPORT_XLSX,
    {
      CompanyIDs: Array.isArray(params.CompanyIDs) ? params.CompanyIDs : [],
      QuarterIDs: Array.isArray(params.QuarterIDs) ? params.QuarterIDs : [],
      CriteriaName: params.CriteriaName || '',
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )
