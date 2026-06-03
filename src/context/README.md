# context

React Context providers for cross-component shared state.

| File | Provider | Hook(s) | Scope | Notes |
|---|---|---|---|---|
| `AuthContext.jsx` | `AuthProvider` | `useAuth()` | Entire app | Current user, role, login/logout. Auth state also lives in `sessionStorage` — `PrivateRoute` reads it directly |
| `MqttContext.jsx` | `MqttProvider` | `useMqtt()` `useSubscribe()` `useGlobalMqttListener()` | All authenticated pages | MQTT client state; value injected by `AppLayout` |
| `FinancialDataContext.jsx` | `FinancialDataProvider` | `useFinancialData()` | Data Entry routes | Records, edit target, approval actions |
| `FinancialRatioContext.jsx` | `FinancialRatioProvider` | `useFinancialRatio()` | Financial Ratio manager routes | `ratios`, `setRatios`, `editRatio`, `setEditRatio` — `editRatio=null` = add mode |
| `ComplianceCriteriaContext.jsx` | `ComplianceCriteriaProvider` | `useComplianceCriteria()` | Compliance Criteria manager routes | `criteria`, `setCriteria`, `editCriteria`, `setEditCriteria` |

All providers are mounted in `router.jsx` at route level — not at app root — to limit their scope.

---

## MqttContext hooks

### `useSubscribe(topic, handler)`
Registers a message handler for a specific MQTT topic. Auto-removes on unmount.
Multiple components can subscribe to the same topic independently.
```js
import { useSubscribe } from '../context/MqttContext'
import { createMqttTypeRouter } from '../utils/mqttRouter'
import { MQTT_TYPE } from '../hooks/useMqttListener'

const topic = sessionStorage.getItem('user_mqtt_topic') // 'SCS_{userID}'

useSubscribe(topic, useCallback(
  createMqttTypeRouter({
    [MQTT_TYPE.COMPANY_SAVED]: (payload) => fetchData(),
    [MQTT_TYPE.SECTOR_SAVED]:  (payload) => fetchData(),
  }),
  [fetchData]
))
```
⚠️ **Always wrap handler in `useCallback`** — otherwise it re-registers on every render.

### `useGlobalMqttListener(handler)`
Fires for every message on any topic. Used internally by `MqttListenerSetup`. Pages should prefer `useSubscribe`.

### `useMqtt()`
Low-level access: `{ isConnected, subscribeToTopics, unsubscribeFromTopics, publish, registerHandler, unregisterHandler, addGlobalListener, removeGlobalListener }`

---

## MQTT_TYPE constants (`src/hooks/useMqttListener.js`)

| Constant | Event string | Direction | Handled in |
|---|---|---|---|
| `FORCE_LOGOUT` | `force_logout` | Server → any user | `useMqttListener` (central) ✅ |
| `NEW_SIGNUP_REQUEST` | `user_registration_submitted` | Auth → Admins | `PendingRequestsPage` ✅ |
| `SIGNUP_REQUEST_APPROVED` | `signup_request_approved` | Admin → Admins | `PendingRequestsPage`, `ManageUsersPage` ✅ |
| `SIGNUP_REQUEST_DECLINED` | `signup_request_declined` | Admin → Admins | `PendingRequestsPage` ✅ |
| `USER_DETAILS_UPDATED` | `user_details_updated` | Admin → Admins | `ManageUsersPage` ✅ |
| `GROUP_CREATED` | `group_created` | Admin → Admins | `ManageUsersPage`, `UserGroupsPage` ✅ |
| `GROUP_UPDATED` | `group_updated` | Admin → Admins | `ManageUsersPage`, `UserGroupsPage` ✅ |
| `GROUP_DELETED` | `group_deleted` | Admin → Admins | `ManageUsersPage`, `UserGroupsPage` ✅ |
| `FORMULA_CREATED` | `formula_created` | Admin → Admins | `FormulaBuilderPage` ✅ |
| `FORMULA_UPDATED` | `formula_updated` | Admin → Admins | `FormulaBuilderPage` ✅ |
| `PENDING_APPROVAL_UPDATED` | `pending_approval_updated` | Manager → Managers | `PendingApprovalsPage`, `BulkActionPage` ✅ |
| `DATA_SUBMISSION_STATUS_UPDATED` | `data_submission_status_updated` | Manager → DataEntry user | `FinancialDataListPage`, `PendingForApprovalPage` ❌ **PENDING** |
| `MARKET_SAVED` | `market_saved` | Manager → Managers | `MarketsPage` ✅ |
| `SECTOR_SAVED` | `sector_saved` | Manager → Managers | `SectorsPage` ✅ |
| `QUARTER_SAVED` | `quarter_saved` | Manager → Managers | `QuartersPage` ✅ |
| `CLASSIFICATION_SAVED` | `classification_saved` | Manager → Managers | `ClassificationsPage` ✅ |
| `FINANCIAL_RATIO_SAVED` | `financial_ratio_saved` | Manager → Managers | `FinancialRatiosPage` ❌ **PENDING** |
| `COMPANY_SAVED` | `company_saved` | Manager → Managers | `CompaniesPage` ✅ |
| `SUKUK_SAVED` | `sukuk_saved` | Manager → Managers | `SukukListPage` ✅ |
| `ISLAMIC_BANK_SAVED` | `islamic_bank_saved` | Manager → Managers | `IslamicBanksPage` ✅ |
| `ISLAMIC_BANK_WINDOW_SAVED` | `islamic_bank_window_saved` | Manager → Managers | `IslamicBankWindowsPage` ✅ |
| `CHARITABLE_ORG_SAVED` | `charitable_org_saved` | Manager → Managers | `CharitableOrgsPage` ✅ |
| `COMPLIANCE_CRITERIA_SAVED` | `compliance_criteria_saved` | Manager → Managers | `ComplianceCriteriaPage` ❌ **PENDING** |
| `SUSPENDED_COMPANY_SAVED` | `suspended_company_saved` | Manager → Managers | `SuspendedCompaniesPage` ✅ |
| `SUSPENDED_COMPANY_DELETED` | `suspended_company_deleted` | Manager → Managers | `SuspendedCompaniesPage` ✅ |
| `MARKET_CAP_SAVED` | `market_cap_saved` | DataEntry → Managers | `MarketCapPage` ❌ **PENDING** |
| `MARKET_CAP_DELETED` | `market_cap_deleted` | DataEntry → Managers | `MarketCapPage` ❌ **PENDING** |
| `MARKET_CAP_UPLOADED` | `market_cap_uploaded` | DataEntry → Managers | `MarketCapPage` ❌ **PENDING** |

### Pending MQTT implementations (6)
1. `financial_ratio_saved` → `FinancialRatiosPage` — add/update row using `data[0].pkFinancialRatiosID`
2. `compliance_criteria_saved` → `ComplianceCriteriaPage` — add/update row using `data[0].criteria.pkComplianceCriteriaID`
3. `data_submission_status_updated` → `FinancialDataListPage` + `PendingForApprovalPage` — update row status using `data[n].dataApprovalRequestID`
4. `market_cap_saved` → `MarketCapPage` — add/update row using `data[0].pkMarketCapitalizationID`
5. `market_cap_deleted` → `MarketCapPage` — remove row using `data[0].pkMarketCapitalizationID`
6. `market_cap_uploaded` → `MarketCapPage` — full refresh if `data[0].fkQuarterID` matches current filter
