/**
 * src/utils/dropdownCache.js
 * ===========================
 * Event-driven localStorage cache for open dropdown (lookup) APIs.
 *
 * Why localStorage, not sessionStorage?
 * ──────────────────────────────────────
 * sessionStorage is per-tab — a new tab opened via right-click would have
 * an empty cache and re-fetch every dropdown on mount. localStorage is
 * shared across all tabs in the same browser, so a new tab inherits the
 * cache populated by the first tab for free.
 *
 * Why no TTL (time-to-live)?
 * ──────────────────────────
 * Each cached dataset is invalidated exactly when the underlying data
 * changes — via the MQTT events already wired in useMqttListener.js.
 * There is no need to guess an expiry time; the cache is always accurate.
 *
 *  MQTT event           → cache key invalidated
 *  ─────────────────────────────────────────────
 *  quarter_saved        → DD_KEYS.QUARTERS
 *  company_saved        → DD_KEYS.COMPANY_NAMES + DD_KEYS.COMPANY_TICKERS
 *  sector_saved         → DD_KEYS.SECTORS
 *  market_saved         → DD_KEYS.MARKETS
 *  classification_saved → DD_KEYS.CLASSIFICATIONS
 *  financial_ratio_saved→ DD_KEYS.FINANCIAL_RATIOS
 *
 * ReportingMonths and ReportingFrequency have no MQTT event — they are
 * system-fixed lists (Jan–Dec; Yearly/Half-Yearly/Quarterly) that never
 * change at runtime. They are cached permanently for the browser session.
 *
 * Cache lifetime:
 *  - Populated on the first page mount that needs a given list.
 *  - Invalidated when the matching MQTT event fires (any tab).
 *  - Cleared on logout (clearLocalSession → clearAll) and on login
 *    (LoginPage mount → clearAll) to prevent stale data across sessions.
 */

/** localStorage keys for all cached dropdown lists */
export const DD_KEYS = {
  QUARTERS:             'dd_quarters',
  COMPANY_NAMES:        'dd_company_names',
  COMPANY_TICKERS:      'dd_company_tickers',
  SECTORS:              'dd_sectors',
  MARKETS:              'dd_markets',
  REPORTING_MONTHS:     'dd_reporting_months',
  REPORTING_FREQUENCY:  'dd_reporting_frequency',
  CLASSIFICATIONS:      'dd_classifications',
  FINANCIAL_RATIOS:     'dd_financial_ratios',
}

export const dropdownCache = {
  /**
   * Read a cached API result.
   * Returns the stored result object, or null if not cached.
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  /**
   * Store an API result in the cache.
   * Silently skips if localStorage is full.
   */
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      /* localStorage quota exceeded — skip caching, app still works */
    }
  },

  /**
   * Remove one cache entry.
   * Call this when the matching MQTT event fires so the next
   * page mount fetches fresh data from the API.
   */
  invalidate(key) {
    localStorage.removeItem(key)
  },

  /**
   * Remove ALL dropdown cache entries.
   * Called on login and logout so each new session starts clean.
   */
  clearAll() {
    Object.values(DD_KEYS).forEach((k) => localStorage.removeItem(k))
  },
}
