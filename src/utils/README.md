# utils

Pure utility helpers, shared constants, and infrastructure singletons.

| File | Description |
|---|---|
| `api.js` | Axios instance, `formPost`, URL constants, token refresh interceptor |
| `helpers.js` | Date formatters, regex constants, `formatChipValue` |
| `crypto.js` | AES-GCM encrypt/decrypt for Remember Me credentials |
| `loaderStore.js` | Global spinner pub/sub (reference-counted) |
| `tokenTimer.js` | JWT expiry countdown — start, resume, restart, stop |
| `mqttRouter.js` | `createMqttTypeRouter` — maps MQTT event strings to handler functions |
| `mockData.js` | ⚠️ Temporary seed data — used by pages not yet wired to real APIs |

---

## `api.js`

```js
// URL constants
AUTH_URL      // http://{VITE_BASE_URL}:6002/Auth
Admin_URL     // http://{VITE_BASE_URL}:6001/Admin
Manager_URL   // http://{VITE_BASE_URL}:6004/Manager
DataEntry_URL // http://{VITE_BASE_URL}:6005/DataEntry

// Core call function — all service functions use this
formPost(url, requestMethod, requestData, config?)
// Sends FormData POST with RequestMethod + RequestData (JSON-stringified)
// config.skipLoader = true  → no global spinner
// config.skipAuth   = true  → no _token header (open/public APIs)
// Returns: { success: true, data, status } | { success: false, message, status }

handleRequest(axiosPromise)  // wraps raw axios calls in the same shape
```

**Token refresh interceptor:** on `responseCode 417` → calls `doRefreshToken()` → retries original request once.

---

## `helpers.js`

```js
EMAIL_REGEX       // /^[^\s@]+@[^\s@]+\.[^\s@]+$/
PASSWORD_REGEX    // min 8, max 20, ≥1 upper, ≥1 digit, ≥1 special, no spaces

toAPIDate(date)       // Date → "YYYYMMDDHHMMSS"
toAPIDateOnly(date)   // Date → "YYYYMMDD"
toDisplayDate(date)   // Date → "09 Apr 2026"
formatChipValue(val)  // smart chip label — handles dates + plain strings
isValidEmail(email)   // boolean
isValidPassword(pwd)  // boolean
```

---

## `loaderStore.js`

Reference-counted global spinner — show/hide from any non-React code.

```js
loaderStore.show()          // increment counter → spinner appears
loaderStore.hide()          // decrement counter → spinner disappears when counter = 0
loaderStore.subscribe(fn)   // fn(isVisible: boolean) → returns unsubscribe()
```

Use `loaderStore.show()` + `loaderStore.hide()` in `finally` to hold the spinner across multi-step async sequences. Already applied in `LoginPage.jsx` — holds spinner while pre-fetching notifications after login.

---

## `tokenTimer.js`

```js
startTokenTimer(timeoutSeconds)   // called on login
resumeTokenTimer()                // called in AppLayout.useEffect — restores after F5
restartTokenTimer()               // called after successful token refresh
stopTokenTimer()                  // called on forced logout
isTokenExpiringSoon()             // true if < 60s remaining
```

Stores `token_expiry_time` and `token_timeout_sec` in `sessionStorage` so the timer survives page refresh.

---

## `mqttRouter.js`

```js
import { createMqttTypeRouter } from '../utils/mqttRouter'
import { MQTT_TYPE } from '../hooks/useMqttListener'

const handler = createMqttTypeRouter({
  [MQTT_TYPE.COMPANY_SAVED]: (payload) => { /* update row */ },
  [MQTT_TYPE.SECTOR_SAVED]:  (payload) => { /* update row */ },
  '*': (payload, topic) => console.log('unhandled', topic, payload),
})
// Pass handler to useSubscribe(topic, useCallback(handler, [deps]))
```

Routes `payload.event` string → matching handler function. Unknown events hit `'*'` if provided, otherwise are silently ignored.

---

## `mockData.js` ⚠️ Temporary

Used by pages not yet wired to real APIs. Will be removed as each page is connected.

**Pages still importing from mockData:**
- `ComplianceStandingPage` — mock companies, criteria, results
- `QuarterWiseReportPage` — mock quarters, sectors, companies, criteria
- `MarketCapPage` — mock companies, quarters, market cap values
- `CompanyListingPage` — mock companies, sectors, markets
- `DataNotReceivedPage` — mock quarters, results
- `QuarterlySummaryPage` — mock quarters, summary
- `ShariaNoticePage` — mock quarters, compliant/non-compliant changes
- `BasketManagementPage` — mock basket data
- `ComplianceCriteriaPage` — mock criteria list
- `ManageComplianceCriteriaPage` — mock financial ratios for dropdown
- `PendingApprovalsPage` — mock quarters, companies, ratios for form
- `AddFinancialDataPage` — mock quarters, companies
- `ViewFinancialDataPage` — mock quarters
- `FinancialDataListPage` — mock financial records
- `PendingForApprovalPage` — mock pending records
