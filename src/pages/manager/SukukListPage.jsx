/**
 * pages/manager/SukukListPage.jsx
 */

import React, { useState, useCallback } from 'react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import {
  GetSukukApi,
  GET_SUKUK_CODES,
  SaveSukukApi,
  SAVE_SUKUK_CODES,
  DeleteSukukApi,
  DELETE_SUKUK_CODES,
} from '../../services/manager.service.js'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'

// ── Response-code constants ───────────────────────────────────────────────────
const GET_SUCCESS = 'Manager_ManagerServiceManager_GetSukuk_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetSukuk_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveSukuk_03'
const DELETE_SUCCESS = 'Manager_ManagerServiceManager_DeleteSukuk_03'

const ALPHANUMERIC = /^(?! )[a-zA-Z0-9\s.,\-()]*$/

// ─────────────────────────────────────────────────────────────────────────────

const SukukListPage = () => {
  const [refreshKey, setRefreshKey] = useState(0)

  // ── MQTT — refresh list on save ───────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.SUKUK_SAVED]: () => setRefreshKey((k) => k + 1),
    }),
    []
  )
  useSubscribe(mqttTopic, mqttHandler)

  // ── onFetch ───────────────────────────────────────────────────────────────
  // SimpleConfigListPage passes { pageNumber, pageSize, search } — use all three.
  // Must return { data: [{id, name}], totalCount: number, errorMsg: string }
  const onFetch = useCallback(async ({ pageNumber, pageSize, search }) => {
    const result = await GetSukukApi(
      { Name: search || '', PageSize: pageSize, PageNumber: pageNumber },
      { skipLoader: true }
    )

    if (!result.success) {
      return { data: [], totalCount: 0, errorMsg: result.message || 'Failed to load Sukuk list.' }
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.sukuk)
        ? rr.sukuk.map((s) => ({ id: s.pK_SukukID, name: s.name || '' }))
        : []
      // totalCount tells SimpleConfigListPage how many pages remain
      return { data: rows, totalCount: rr.totalCount ?? rows.length, errorMsg: '' }
    }

    if (code === GET_EMPTY) {
      return { data: [], totalCount: 0, errorMsg: '' }
    }

    return { data: [], totalCount: 0, errorMsg: GET_SUKUK_CODES[code] || 'Something went wrong.' }
  }, [])

  // ── onSave ────────────────────────────────────────────────────────────────
  const onSave = useCallback(async ({ id, name }) => {
    const result = await SaveSukukApi({ PK_SukukID: id ?? 0, Name: name }, { skipLoader: true })

    if (!result.success) {
      return { success: false, errorMsg: result.message || 'Failed to save.' }
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === SAVE_SUCCESS) {
      return { success: true, errorMsg: '' }
    }

    // SAVE_DUP and any other code surfaces inline on the Input via errorMsg
    return { success: false, errorMsg: SAVE_SUKUK_CODES[code] || 'Something went wrong.' }
  }, [])

  // ── onDelete ──────────────────────────────────────────────────────────────
  const onDelete = useCallback(async ({ id }) => {
    const result = await DeleteSukukApi({ PK_SukukID: id }, { skipLoader: true })

    if (!result.success) {
      return { success: false, errorMsg: result.message || 'Failed to delete.' }
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === DELETE_SUCCESS) {
      return { success: true, errorMsg: '' }
    }

    return { success: false, errorMsg: DELETE_SUKUK_CODES[code] || 'Something went wrong.' }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SimpleConfigListPage
      title="Approved List of Sukuk"
      fieldLabel="Name"
      fieldPlaceholder="Enter sukuk name"
      maxLength={100}
      tableColTitle="Name"
      confirmMessage="Are you sure you want to do this action?"
      onFetch={onFetch}
      onSave={onSave}
      onDelete={onDelete}
      inputRegex={ALPHANUMERIC}
      refreshKey={refreshKey}
    />
  )
}

export default SukukListPage
