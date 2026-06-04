/**
 * src/utils/defaultCriteria.js
 * =============================
 * Single source of truth for the system **Default Compliance Criteria**.
 *
 * Why localStorage?
 * ─────────────────
 * The default criteria must be visible across every tab in the browser (e.g. a
 * DataEntry officer's "Default Compliance Criteria" field and the Manager's list
 * page). localStorage is shared across tabs, so one write is seen everywhere.
 *
 * Lifecycle:
 *  - Seeded on login from the login response `complianceCriteria` (LoginPage).
 *  - Re-synced whenever the Manager list loads or the default is changed
 *    (ComplianceCriteriaPage → SetDefault success / list refresh).
 *  - Updated app-wide when an MQTT `compliance_criteria_saved` arrives whose
 *    criteria.isDefault is true (useMqttListener).
 *  - Cleared on logout (clearLocalSession).
 *
 * Stored shape (matches login response casing):
 *   [{ pK_ComplianceCriteriaID: number, criteriaName: string }]
 *   (array — usually a single default; [] / null when no default exists)
 */

const KEY = 'scs_compliance_criteria'

/** Read the raw stored default-criteria array. Returns [] when nothing is set. */
export const getDefaultCriteria = () => {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
  } catch {
    return []
  }
}

/** Persist the default-criteria array (pass [] / null to clear the value). */
export const setDefaultCriteria = (data) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data ?? []))
  } catch {
    /* localStorage full / unavailable — ignore */
  }
}

/** Remove the stored default criteria entirely (logout). */
export const clearDefaultCriteria = () => localStorage.removeItem(KEY)

/**
 * Convenience: the default criteria NAME for display (first/only default).
 * Returns '' when there is no default — callers should treat '' as "no default".
 */
export const getDefaultCriteriaName = () => {
  const list = getDefaultCriteria()
  const first = list[0]
  return first?.criteriaName ?? first?.name ?? ''
}
