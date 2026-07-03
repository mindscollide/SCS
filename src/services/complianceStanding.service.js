/**
 * src/services/complianceStanding.service.js
 * ============================================
 * Compliance Standing report — SRS Report #1.
 *
 * The SAME four endpoints exist on BOTH the Manager and the DataEntry service
 * (separate role-gated copies backed by shared SPs — verified against
 * `E:\SCS\Api document\API_Reference\03_Manager.md` + `04_DataEntry.md`,
 * 2026-06-16). The report screen is shared between the two roles, so this
 * module dispatches to the correct service URL by the logged-in role and the
 * response-code prefix differs only by service — hence the suffix-based code
 * helpers below (success is always `_03`).
 *
 * Flow:
 *  1. GetComplianceStandingThresholds         — load a criteria's editable thresholds (prefill).
 *  2. GenerateComplianceStanding              — run the report.
 *  3/4. ExportComplianceStanding[Excel]       — base64 PDF / XLSX download.
 *  5. GetComplianceStandingNonCompliantDetail — per-ratio breakdown for a Non-Compliant cell
 *     (added 2026-07-03; reuses sp_GetQuarterWiseNonCompliantDetail on the backend).
 *
 * Criteria: the report screen LOCKS the compliance criteria to the system
 * default (disabled field, both roles), so every call here carries the default
 * ComplianceCriteriaID. (No criteria-list call is made — the Manager list API
 * is intentionally unused, and the DataEntry service has none anyway.)
 *
 * Request notes:
 *  - CompanyIDs []     → empty = all active companies (server default).
 *  - RatioThresholds []→ empty = criteria's stored thresholds (per-field fallback).
 *  - RatioThresholds row shape (Steps 2–5): { FK_FinancialRatiosID, ThresholdValue,
 *    IsMaxValidationApplied (1/0), ThresholdUnit ('%'|'#'|'Ratio') }.
 *
 * Codes (both services): _01 unauth · _02 required field missing ·
 *  _03 success · _04 exception. No MQTT (read-only).
 */

import { formPost, Manager_URL, DataEntry_URL } from '../utils/api'

// Request methods — identical names on both services (each posts to its own URL).
const RM = {
  GET_THRESHOLDS:       import.meta.env.VITE_RM_GET_COMPLIANCE_STANDING_THRESHOLDS,
  GENERATE:             import.meta.env.VITE_RM_GENERATE_COMPLIANCE_STANDING,
  EXPORT_PDF:           import.meta.env.VITE_RM_EXPORT_COMPLIANCE_STANDING,
  EXPORT_XLSX:          import.meta.env.VITE_RM_EXPORT_COMPLIANCE_STANDING_EXCEL,
  NON_COMPLIANT_DETAIL: import.meta.env.VITE_RM_GET_COMPLIANCE_STANDING_NON_COMPLIANT_DETAIL,
}

// Role 2 = Manager, 3 = DataEntry. The report screen is shared; the caller's
// role decides which service copy to hit.
const getRoleId = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user_roles') || '[]')?.[0]?.roleID ?? 2
  } catch {
    return 2
  }
}
const reportUrl = () => (Number(getRoleId()) === 3 ? DataEntry_URL : Manager_URL)

// ── Response-code helpers ──────────────────────────────────────────────────
// Prefix differs by service (Manager_… vs DataEntry_…) but the trailing _NN is
// identical, so match on the suffix instead of maintaining two code maps.
/** true when the call executed and returned the shared success code (_03). */
export const isComplianceStandingSuccess = (rr) =>
  rr?.isExecuted === true && String(rr?.responseMessage || '').endsWith('_03')

/** Error text for a non-success code (null when it IS success / no code). */
export const complianceStandingError = (code = '') => {
  const c = String(code || '')
  if (!c || c.endsWith('_03')) return null
  if (c.endsWith('_02')) return 'Compliance criteria is required.'
  if (c.endsWith('_01')) return 'Unauthorized access.'
  return 'Something went wrong, please try again.'
}

// ── Step 1 — prefill thresholds ─────────────────────────────────────────────
/**
 * @param {Object} params
 * @param {number}   params.ComplianceCriteriaID  required (> 0)
 * @param {number[]} [params.CompanyIDs]          carried to Step 2; does not affect thresholds
 * Response (`responseResult`): { RatioThresholds: [{ PK_CriteriaRatioMappingID,
 *  FK_FinancialRatiosID, FinancialRatioName, ThresholdValue, IsMaxValidationApplied,
 *  ThresholdUnit, Sequence }], isExecuted, responseMessage }
 */
export const GetComplianceStandingThresholdsApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.GET_THRESHOLDS,
    {
      ComplianceCriteriaID: params.ComplianceCriteriaID || 0,
      CompanyIDs: Array.isArray(params.CompanyIDs) ? params.CompanyIDs : [],
    },
    config
  )

// ── Step 2 — generate report ────────────────────────────────────────────────
/**
 * @param {Object} params
 * @param {number[]} [params.CompanyIDs]          empty = all active companies
 * @param {number}   params.ComplianceCriteriaID  required (> 0)
 * @param {Array}    [params.RatioThresholds]     empty = criteria's stored thresholds;
 *   row: { FK_FinancialRatiosID, ThresholdValue, IsMaxValidationApplied, ThresholdUnit }
 * Response (`responseResult`): { Results: [{ CompanyID, Company, Sector, QuarterID, Quarter,
 *  Status, IsCarried, IsException, ExceptionReason }], isExecuted, responseMessage }
 *  Status ∈ Compliant | Non-Compliant | Suspended | Data Not Available.
 *  CompanyID/QuarterID added 2026-07-03 — pass to GetComplianceStandingNonCompliantDetailApi
 *  on a "Non-Compliant" click. QuarterID=0 when Quarter is also "" (no approved data row).
 */
export const GenerateComplianceStandingApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.GENERATE,
    {
      CompanyIDs: Array.isArray(params.CompanyIDs) ? params.CompanyIDs : [],
      ComplianceCriteriaID: params.ComplianceCriteriaID || 0,
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )

// ── Step 3/4 — exports (base64 file) ────────────────────────────────────────
// Same inputs as Generate. Response: { FileContent (base64), FileName, ContentType }.
export const ExportComplianceStandingApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.EXPORT_PDF,
    {
      CompanyIDs: Array.isArray(params.CompanyIDs) ? params.CompanyIDs : [],
      ComplianceCriteriaID: params.ComplianceCriteriaID || 0,
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )

export const ExportComplianceStandingExcelApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.EXPORT_XLSX,
    {
      CompanyIDs: Array.isArray(params.CompanyIDs) ? params.CompanyIDs : [],
      ComplianceCriteriaID: params.ComplianceCriteriaID || 0,
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )

// ── Step 5 — Non-Compliant per-ratio breakdown ───────────────────────────────
/**
 * Called when the user clicks a "Non-Compliant" status cell in the results table.
 * Reuses sp_GetQuarterWiseNonCompliantDetail on the backend (added 2026-07-03).
 *
 * @param {Object} params
 * @param {number}   params.CompanyID            required
 * @param {number}   params.QuarterID            required
 * @param {number}   params.ComplianceCriteriaID required
 * @param {Array}    params.RatioThresholds       same payload as Generate/Export
 * Response (`responseResult`): { companyName, quarterName, criteriaName,
 *   ratios: [{ ratioName, thresholdValue, thresholdUnit, isMaxValidation,
 *              calculatedValue (nullable), passed }] }
 */
export const GetComplianceStandingNonCompliantDetailApi = (params = {}, config = {}) =>
  formPost(
    reportUrl(),
    RM.NON_COMPLIANT_DETAIL,
    {
      CompanyID: params.CompanyID || 0,
      QuarterID: params.QuarterID || 0,
      ComplianceCriteriaID: params.ComplianceCriteriaID || 0,
      RatioThresholds: Array.isArray(params.RatioThresholds) ? params.RatioThresholds : [],
    },
    config
  )
