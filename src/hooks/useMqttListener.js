/**
 * src/hooks/useMqttListener.js
 * =============================
 * Central MQTT message listener for the SCS application.
 *
 * Mounted once inside <MqttProvider> in AppLayout — never unmounts during
 * a session, so no message is ever missed regardless of which page is active.
 *
 * Message routing
 * ───────────────
 * All messages arrive on the user's shared topic: "SCS_{userID}"
 * (e.g. "SCS_1"). Every browser tab for the same user subscribes to this
 * same topic, so a single backend publish reaches all of them simultaneously.
 * The topic is stored in sessionStorage under "user_mqtt_topic" by AppLayout.
 *
 * Each payload carries an `event` field that maps to one of the MQTT_TYPE
 * constants below. Unknown events are logged to the console (not silently dropped).
 *
 * force_logout — multi-tab aware
 * ────────────────────────────────
 * When a user logs in from a different browser/device, the backend publishes
 * `force_logout` with `data.newDeviceId`. The handler compares this against
 * `localStorage.scs_device_id` (shared across all tabs in the same browser).
 * - Match    → this IS a tab in the same browser as the new login → skip logout
 * - No match → this is a different browser/device → force logout + redirect
 * This allows the same user to open multiple tabs within one browser freely
 * while still kicking out genuinely different browser/device sessions.
 *
 * Central handler responsibilities
 * ──────────────────────────────────
 * Each handler in this file may do two things:
 *  1. Invalidate the matching dropdown cache entry (dropdownCache.invalidate)
 *     so the next page that needs that dropdown fetches fresh data from the API.
 *  2. Page-level handlers (registered via useSubscribe in each page component)
 *     handle list refresh / row-level updates for the currently visible page.
 * Central handlers only run cache invalidation — they never touch page state.
 *
 * Adding a new message type
 * ──────────────────────────
 * 1. Add the constant to MQTT_TYPE.
 * 2. Add a case to the router object inside useMqttListener.
 * 3. If the event affects a dropdown list, add dropdownCache.invalidate(DD_KEYS.XXX).
 *
 * Broker payload shape
 * ─────────────────────
 * {
 *   event:   string   — one of MQTT_TYPE values (required)
 *   data:    object   — event-specific fields (see each handler)
 *   message: string   — human-readable description (optional)
 * }
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSubscribe } from '../context/MqttContext'
import { createMqttTypeRouter } from '../utils/mqttRouter'
import mqttService from '../services/mqtt.service'
import { logoutApi } from '../services/auth.service'
import { clearLocalSession, LS_KEYS } from '../utils/sessionRestore'
import { dropdownCache, DD_KEYS } from '../utils/dropdownCache'
import { setDefaultCriteria } from '../utils/defaultCriteria'
import { usePendingCount } from '../context/PendingCountContext'

// ─────────────────────────────────────────────────────────────────────────────
// MQTT EVENT CONSTANTS
// Keep in sync with the backend broker payload `event` values.
// ─────────────────────────────────────────────────────────────────────────────

export const MQTT_TYPE = {
  // ── Auth → Admin ──────────────────────────────────────────────────────────
  /** Admin receives: a new user submitted a signup request */
  NEW_SIGNUP_REQUEST: 'user_registration_submitted',

  // ── Admin → Admin ─────────────────────────────────────────────────────────
  /** Admin receives: a signup request was approved */
  SIGNUP_REQUEST_APPROVED: 'signup_request_approved',

  /** Admin receives: a signup request was declined */
  SIGNUP_REQUEST_DECLINED: 'signup_request_declined',

  /** Admin receives: a user's details were edited — silent list refresh */
  USER_DETAILS_UPDATED: 'user_details_updated',

  /** Admin receives: a new group was created — silent list refresh */
  GROUP_CREATED: 'group_created',

  /** Admin receives: a group was updated — silent list refresh */
  GROUP_UPDATED: 'group_updated',

  /** Admin receives: a group was deleted — silent list refresh */
  GROUP_DELETED: 'group_deleted',

  /** Admin receives: a new formula was created — silent list refresh */
  FORMULA_CREATED: 'formula_created',

  /** Admin receives: a formula was updated — silent list refresh */
  FORMULA_UPDATED: 'formula_updated',

  // ── Manager → Manager ─────────────────────────────────────────────────────
  /** Manager receives: a pending approval was approved/declined — silent list refresh */
  PENDING_APPROVAL_UPDATED: 'pending_approval_updated',

  // ── Manager → Data Entry ──────────────────────────────────────────────────
  /** DataEntry receives: a Manager approved/declined one of their submissions.
   *  `notification` = populated bell text (Topbar prepends it; title is
   *  "Data Approval Request Approved/Declined", detail names the ticker or
   *  the record count). `data[n]` = each actioned row (dataApprovalRequestID,
   *  fK_CompanyID, companyName, ticker, fK_QuarterID, quarterName,
   *  fK_DataApprovalRequestStatusID, status). FinancialDataListPage updates
   *  the matching row's status; PendingForApprovalPage silently refetches. */
  DATA_SUBMISSION_STATUS_UPDATED: 'data_submission_status_updated',

  // ── DataEntry → DataEntry (group members) ─────────────────────────────────
  /** DataEntry receives: a group member saved financial data. Fires on both
   *  SaveFinancialData (draft save) and SaveAndSubmitFinancialData (submit).
   *  Silent refetch handled in FinancialDataListPage + PendingForApprovalPage. */
  FINANCIAL_DATA_SAVED: 'financial_data_saved',

  // ── Data Entry → Manager ──────────────────────────────────────────────────
  /** Manager receives: a DataEntry user submitted financial data for approval.
   *  `notification` = populated bell text (Topbar prepends it) · `data[0]` =
   *  { pkFinancialDataID, pkDataApprovalRequestID, fkCompanyID, companyName,
   *    fkQuarterID, quarterName, fkSubmittedBy, submittedByName }.
   *  List refetch handled in PendingApprovalsPage + BulkActionPage. */
  FINANCIAL_DATA_SUBMITTED: 'financial_data_submitted',

  /** Manager receives: market cap data saved */
  MARKET_CAP_SAVED: 'market_cap_saved',

  /** Manager receives: market cap data deleted */
  MARKET_CAP_DELETED: 'market_cap_deleted',

  /** Manager receives: market cap data uploaded */
  MARKET_CAP_UPLOADED: 'market_cap_uploaded',

  // ── Manager configuration saves ───────────────────────────────────────────
  /** Manager receives: a market was saved (add or edit) */
  MARKET_SAVED: 'market_saved',

  /** Manager receives: a sector was saved (add or edit) */
  SECTOR_SAVED: 'sector_saved',

  /** Manager receives: a quarter was saved (add or edit) */
  QUARTER_SAVED: 'quarter_saved',

  /** Manager receives: a classification was saved (add or edit) */
  CLASSIFICATION_SAVED: 'classification_saved',

  /** Manager receives: a financial ratio was saved (add or edit) */
  FINANCIAL_RATIO_SAVED: 'financial_ratio_saved',

  /** Manager receives: a company was saved (add or edit) */
  COMPANY_SAVED: 'company_saved',

  /** Manager receives: a sukuk was saved (add or edit) */
  SUKUK_SAVED: 'sukuk_saved',

  /** Manager receives: a sukuk was deleted */
  SUKUK_DELETED: 'sukuk_deleted',

  /** Manager receives: an Islamic bank was saved (add or edit) */
  ISLAMIC_BANK_SAVED: 'islamic_bank_saved',

  /** Manager receives: an Islamic bank was deleted */
  ISLAMIC_BANK_DELETED: 'islamic_bank_deleted',

  /** Manager receives: an Islamic bank window was saved (add or edit) */
  ISLAMIC_BANK_WINDOW_SAVED: 'islamic_bank_window_saved',

  /** Manager receives: an Islamic bank window was deleted */
  ISLAMIC_BANK_WINDOW_DELETED: 'islamic_bank_window_deleted',

  /** Manager receives: a charitable org was saved (add or edit) */
  CHARITABLE_ORG_SAVED: 'charitable_org_saved',

  /** Manager receives: a charitable org was deleted */
  CHARITABLE_ORG_DELETED: 'charitable_org_deleted',

  /** Manager receives: compliance criteria was saved (add or edit) */
  COMPLIANCE_CRITERIA_SAVED: 'compliance_criteria_saved',

  /** Manager receives: the default compliance criteria was changed */
  COMPLIANCE_CRITERIA_DEFAULT_UPDATED: 'compliance_criteria_default_updated',

  /** Manager receives: a suspended company was saved */
  SUSPENDED_COMPANY_SAVED: 'suspended_company_saved',

  /** Manager receives: a suspended company was deleted */
  SUSPENDED_COMPANY_DELETED: 'suspended_company_deleted',

  // ── Session control ───────────────────────────────────────────────────────
  /** Any role: another device logged in with this account */
  FORCE_LOGOUT: 'force_logout',
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

const useMqttListener = () => {
  const navigate = useNavigate()
  const { refreshPendingCount } = usePendingCount()

  // Shared topic stored by AppLayout: "SCS_{userID}"
  // Falls back to null — useSubscribe skips registration when topic is null.
  const topic = sessionStorage.getItem('user_mqtt_topic') || null

  const handler = useCallback(
    createMqttTypeRouter({
      // ── user_registration_submitted — refresh pending count badge ─────────
      [MQTT_TYPE.NEW_SIGNUP_REQUEST]: () => { refreshPendingCount() },

      // ── signup_request_approved — refresh pending count badge ─────────────
      [MQTT_TYPE.SIGNUP_REQUEST_APPROVED]: () => { refreshPendingCount() },

      // ── signup_request_declined — refresh pending count badge ─────────────
      [MQTT_TYPE.SIGNUP_REQUEST_DECLINED]: () => { refreshPendingCount() },

      // ── user_details_updated — silent, no toast ───────────────────────────
      [MQTT_TYPE.USER_DETAILS_UPDATED]: () => {},

      // ── group_created — silent ────────────────────────────────────────────
      [MQTT_TYPE.GROUP_CREATED]: () => {},

      // ── group_updated — silent ────────────────────────────────────────────
      [MQTT_TYPE.GROUP_UPDATED]: () => {},

      // ── group_deleted — silent ────────────────────────────────────────────
      [MQTT_TYPE.GROUP_DELETED]: () => {},

      // ── formula_created — silent ──────────────────────────────────────────
      [MQTT_TYPE.FORMULA_CREATED]: () => {},

      // ── formula_updated — silent ──────────────────────────────────────────
      [MQTT_TYPE.FORMULA_UPDATED]: () => {},

      // ── pending_approval_updated — silent ─────────────────────────────────
      [MQTT_TYPE.PENDING_APPROVAL_UPDATED]: () => {},

      // ── data_submission_status_updated — silent here ──────────────────────
      // Bell notification is prepended in Topbar (DataEntry role); list refresh
      // handled in FinancialDataListPage + PendingForApprovalPage. Backend
      // populates notification.title/detail as of 2026-06-11. No dropdown cache
      // affected.
      [MQTT_TYPE.DATA_SUBMISSION_STATUS_UPDATED]: () => {},

      // ── financial_data_saved — silent here ────────────────────────────────
      // Fires on SaveFinancialData and SaveAndSubmitFinancialData; recipients =
      // active DataEntry group members. List refetch handled per-page.
      [MQTT_TYPE.FINANCIAL_DATA_SAVED]: () => {},

      // ── financial_data_submitted — silent here ────────────────────────────
      // Bell notification is prepended in Topbar; pending-list refetch happens
      // in PendingApprovalsPage / BulkActionPage. No dropdown cache affected.
      [MQTT_TYPE.FINANCIAL_DATA_SUBMITTED]: () => {},

      // ── market_cap_saved/deleted/uploaded — silent (handled in MarketCapEntryPage)
      [MQTT_TYPE.MARKET_CAP_SAVED]: () => {},
      [MQTT_TYPE.MARKET_CAP_DELETED]: () => {},
      [MQTT_TYPE.MARKET_CAP_UPLOADED]: () => {},

      // ── manager config saves ──────────────────────────────────────────────
      // Each handler does two things:
      //  1. Invalidates the matching dropdown cache entry in localStorage so
      //     the next page that needs this dropdown fetches fresh data.
      //  2. Page-level handlers (useSubscribe in each page) do the list refresh.
      [MQTT_TYPE.MARKET_SAVED]: () => dropdownCache.invalidate(DD_KEYS.MARKETS),

      [MQTT_TYPE.SECTOR_SAVED]: () => dropdownCache.invalidate(DD_KEYS.SECTORS),

      [MQTT_TYPE.QUARTER_SAVED]: () => dropdownCache.invalidate(DD_KEYS.QUARTERS),

      [MQTT_TYPE.CLASSIFICATION_SAVED]: () => dropdownCache.invalidate(DD_KEYS.CLASSIFICATIONS),

      // financial_ratio_saved — also handled (list refresh) in FinancialRatiosPage
      [MQTT_TYPE.FINANCIAL_RATIO_SAVED]: () => dropdownCache.invalidate(DD_KEYS.FINANCIAL_RATIOS),

      // company_saved — invalidates both company names and tickers dropdowns
      [MQTT_TYPE.COMPANY_SAVED]: () => {
        dropdownCache.invalidate(DD_KEYS.COMPANY_NAMES)
        dropdownCache.invalidate(DD_KEYS.COMPANY_TICKERS)
      },

      [MQTT_TYPE.SUKUK_SAVED]: () => {},
      [MQTT_TYPE.SUKUK_DELETED]: () => {},
      [MQTT_TYPE.ISLAMIC_BANK_SAVED]: () => {},
      [MQTT_TYPE.ISLAMIC_BANK_DELETED]: () => {},
      [MQTT_TYPE.ISLAMIC_BANK_WINDOW_SAVED]: () => {},
      [MQTT_TYPE.ISLAMIC_BANK_WINDOW_DELETED]: () => {},
      [MQTT_TYPE.CHARITABLE_ORG_SAVED]: () => {},
      [MQTT_TYPE.CHARITABLE_ORG_DELETED]: () => {},

      // compliance_criteria_saved — keep the shared default value fresh app-wide.
      // Payload: data[0] = { criteria:{ pkComplianceCriteriaID, criteriaName, isDefault, … }, ratioMappings:[…] }
      // ComplianceCriteriaPage also subscribes (list refresh); this central handler
      // only updates the localStorage default so every tab/role stays in sync.
      [MQTT_TYPE.COMPLIANCE_CRITERIA_SAVED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        const c = d?.criteria
        if (c?.isDefault) {
          const id = c.pK_ComplianceCriteriaID ?? c.pkComplianceCriteriaID
          setDefaultCriteria([{ pK_ComplianceCriteriaID: id, criteriaName: c.criteriaName }])
        }
      },

      // compliance_criteria_default_updated — sync localStorage default app-wide.
      // Payload: data[0] = { criteria:{ pK_ComplianceCriteriaID, criteriaName, isDefault:true, … }, ratioMappings:[…] }
      // ComplianceCriteriaPage also subscribes (state update); this central handler
      // only writes localStorage so every tab/role sees the new default.
      [MQTT_TYPE.COMPLIANCE_CRITERIA_DEFAULT_UPDATED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] : payload.data
        const c = d?.criteria
        if (c) {
          const id = c.pK_ComplianceCriteriaID ?? c.pkComplianceCriteriaID
          setDefaultCriteria([{ pK_ComplianceCriteriaID: id, criteriaName: c.criteriaName }])
        }
      },

      [MQTT_TYPE.SUSPENDED_COMPANY_SAVED]: () => {},
      [MQTT_TYPE.SUSPENDED_COMPANY_DELETED]: () => {},

      // ── force_logout ──────────────────────────────────────────────────────
      // Reads scs_device_id from localStorage (shared across all tabs in the
      // same browser) so same-browser tabs are never kicked out by each other.
      // Only a genuinely different browser/device has a different device ID.
      [MQTT_TYPE.FORCE_LOGOUT]: (payload) => {
        const myDeviceId  = localStorage.getItem(LS_KEYS.DEVICE_ID)
        const newDeviceId = payload.data?.newDeviceId

        if (newDeviceId && newDeviceId === myDeviceId) return

        logoutApi().catch(() => {})
        mqttService.disconnect()
        clearLocalSession()
        sessionStorage.clear()
        navigate('/multiple-login', { replace: true })
      },

      // ── Unknown event ─────────────────────────────────────────────────────
      '*': (payload, topic) => {
        console.warn(`[MQTT] Unhandled event: "${payload?.event}" on topic "${topic}"`, payload)
      },
    }),
    [navigate, refreshPendingCount]
  )

  useSubscribe(topic, handler)
}

// ─────────────────────────────────────────────────────────────────────────────
// NULL-RENDER COMPONENT
// Renders nothing — exists only to call useMqttListener() so the hook has
// access to both MqttContext (useSubscribe) and React Router (useNavigate).
// Placed as the first child of <MqttProvider> in AppLayout, never unmounts.
// ─────────────────────────────────────────────────────────────────────────────

const MqttListenerSetup = () => {
  useMqttListener()
  return null
}

export default MqttListenerSetup
