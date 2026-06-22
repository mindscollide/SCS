/**
 * pages/manager/IslamicBankWindowsPage.jsx
 * ==========================================
 * Islamic Bank Windows — Manager Configuration page.
 *
 * Behaviour (SRS §10.3):
 *  ▸ Single "Bank Name" field inline add form with Save button
 *  ▸ Table: Name (sortable) | Delete (red trash → ConfirmModal)
 *  ▸ Duplicate names are blocked with an inline error
 *  ▸ Live search filters table rows
 *
 * Delegates all UI & state logic to the reusable SimpleConfigListPage
 * component — this file only provides page-specific config + seed data.
 *
 * TODO: replace INITIAL_WINDOWS with GET /api/manager/islamic-bank-windows
 *       on Save call POST /api/manager/islamic-bank-windows
 *       on Delete call DELETE /api/manager/islamic-bank-windows/:id
 */

import React, { useState, useCallback } from 'react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import {
  GetIslamicBankWindowsApi,
  GET_ISLAMIC_BANK_WINDOWS_CODES,
  SaveIslamicBankWindowApi,
  SAVE_ISLAMIC_BANK_WINDOW_CODES,
  DELETE_ISLAMIC_BANK_WINDOW_CODES,
  DeleteIslamicBankWindowApi,
} from '../../services/manager.service.js'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'

// ── Response-code constants ───────────────────────────────────────────────────
const GET_SUCCESS = 'Manager_ManagerServiceManager_GetIslamicBankWindows_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetIslamicBankWindows_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveIslamicBankWindow_03'
const DELETE_SUCCESS = 'Manager_ManagerServiceManager_DeleteIslamicBankWindow_03'

// ── Page ─────────────────────────────────────────────────────────────────────
const IslamicBankWindowsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0)

  // ── MQTT — refresh list on save/delete ───────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.ISLAMIC_BANK_WINDOW_SAVED]: () => setRefreshKey((k) => k + 1),
      [MQTT_TYPE.ISLAMIC_BANK_WINDOW_DELETED]: () => setRefreshKey((k) => k + 1),
    }),
    []
  )
  useSubscribe(mqttTopic, mqttHandler)

  const onFetch = useCallback(async ({ pageNumber, pageSize, search }) => {
    const result = await GetIslamicBankWindowsApi(
      { Name: search || '', PageSize: pageSize, PageNumber: pageNumber },
      { skipLoader: true }
    )

    if (!result.success) {
      return {
        data: [],
        totalCount: 0,
        errorMsg: result.message || 'Failed to load Charitable Organizations.',
      }
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.islamicBankWindows)
        ? rr.islamicBankWindows.map((o) => ({ id: o.pK_IslamicBankWindowsID, name: o.name || '' }))
        : []
      return { data: rows, totalCount: rr.totalCount ?? rows.length, errorMsg: '' }
    }

    if (code === GET_EMPTY) {
      return { data: [], totalCount: 0, errorMsg: '' }
    }

    return {
      data: [],
      totalCount: 0,
      errorMsg: GET_ISLAMIC_BANK_WINDOWS_CODES[code] || 'Something went wrong, please try again.',
    }
  }, [])

  // ── onSave ────────────────────────────────────────────────────────────────
  const onSave = useCallback(async ({ id, name }) => {
    const result = await SaveIslamicBankWindowApi(
      { pK_IslamicBankWindowsID: id ?? 0, Name: name },
      { skipLoader: true }
    )

    if (!result.success) {
      return { success: false, errorMsg: result.message || 'Failed to save.' }
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === SAVE_SUCCESS) {
      return { success: true, errorMsg: '' }
    }

    // SAVE_DUP (_04) and any other code surfaces inline on the Input via errorMsg
    return {
      success: false,
      errorMsg: SAVE_ISLAMIC_BANK_WINDOW_CODES[code] || 'Something went wrong.',
    }
  }, [])

  // ── onDelete ──────────────────────────────────────────────────────────────
  const onDelete = useCallback(async ({ id }) => {
    const result = await DeleteIslamicBankWindowApi(
      { PK_IslamicBankWindowsID: id },
      { skipLoader: true }
    )

    if (!result.success) {
      return { success: false, errorMsg: result.message || 'Failed to delete.' }
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === DELETE_SUCCESS) {
      return { success: true, errorMsg: '' }
    }

    return {
      success: false,
      errorMsg: DELETE_ISLAMIC_BANK_WINDOW_CODES[code] || 'Something went wrong.',
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SimpleConfigListPage
      title="Islamic Bank Windows"
      fieldLabel="Name"
      fieldPlaceholder="Enter islamic bank name"
      maxLength={100}
      tableColTitle="Name"
      confirmMessage="Are you sure you want to do this action?"
      onFetch={onFetch}
      onSave={onSave}
      onDelete={onDelete}
      refreshKey={refreshKey}
    />
  )
}

export default IslamicBankWindowsPage
