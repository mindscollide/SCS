/**
 * pages/manager/CharitableOrgsPage.jsx
 * ========================================
 * Charitable Organizations — Manager Configuration page.
 * Delegates all UI & state logic to SimpleConfigListPage.
 * This file only adapts the API shape to the component's generic contracts.
 */

import React, { useState, useCallback } from 'react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'
import {
  GetCharitableOrgsApi,
  GET_CHARITABLE_ORGS_CODES,
  SaveCharitableOrgApi,
  SAVE_CHARITABLE_ORGS_CODES,
  DeleteCharitableOrgApi,
  DELETE_CHARITABLE_ORGS_CODES,
} from '../../services/manager.service.js'

// ── Response-code constants ───────────────────────────────────────────────────
const GET_SUCCESS = 'Manager_ManagerServiceManager_GetCharitableOrgs_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetCharitableOrgs_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveCharitableOrg_03'
const DELETE_SUCCESS = 'Manager_ManagerServiceManager_DeleteCharitableOrg_03'

// ─────────────────────────────────────────────────────────────────────────────

const CharitableOrgsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0)

  // ── MQTT — refresh list on save ───────────────────────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null
  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.CHARITABLE_ORG_SAVED]: () => setRefreshKey((k) => k + 1),
    }),
    []
  )
  useSubscribe(mqttTopic, mqttHandler)

  // ── onFetch ───────────────────────────────────────────────────────────────
  const onFetch = useCallback(async ({ pageNumber, pageSize, search }) => {
    const result = await GetCharitableOrgsApi(
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
      const rows = Array.isArray(rr.charitableOrgs)
        ? rr.charitableOrgs.map((o) => ({ id: o.pK_CharitableOrganizationsID, name: o.name || '' }))
        : []
      return { data: rows, totalCount: rr.totalCount ?? rows.length, errorMsg: '' }
    }

    if (code === GET_EMPTY) {
      return { data: [], totalCount: 0, errorMsg: '' }
    }

    return {
      data: [],
      totalCount: 0,
      errorMsg: GET_CHARITABLE_ORGS_CODES[code] || 'Something went wrong, please try again.',
    }
  }, [])

  // ── onSave ────────────────────────────────────────────────────────────────
  const onSave = useCallback(async ({ id, name }) => {
    const result = await SaveCharitableOrgApi(
      { PK_CharitableOrganizationsID: id ?? 0, Name: name },
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
    return { success: false, errorMsg: SAVE_CHARITABLE_ORGS_CODES[code] || 'Something went wrong.' }
  }, [])

  // ── onDelete ──────────────────────────────────────────────────────────────
  const onDelete = useCallback(async ({ id }) => {
    const result = await DeleteCharitableOrgApi(
      { PK_CharitableOrganizationsID: id },
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
      errorMsg: DELETE_CHARITABLE_ORGS_CODES[code] || 'Something went wrong.',
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SimpleConfigListPage
      title="Charitable Organizations"
      fieldLabel="Name"
      fieldPlaceholder="Enter organization name"
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

export default CharitableOrgsPage
