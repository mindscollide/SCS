/**
 * src/pages/manager/IslamicBanksPage.jsx
 * =========================================
 * Thin wrapper — all API logic lives in the adapter functions below.
 * SimpleConfigListPage owns the UI, infinite scroll, sort, search, and delete modal.
 */

import React, { useCallback } from 'react'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'
import {
  GetIslamicBanksApi,
  GET_ISLAMIC_BANKS_CODES,
  SaveIslamicBankApi,
  SAVE_ISLAMIC_BANKS_CODES,
  DeleteIslamicBankApi,
  DELETE_ISLAMIC_BANKS_CODES,
} from '../../services/manager.service.js'

// ── Response-code constants ───────────────────────────────────────────────────
const GET_SUCCESS = 'Manager_ManagerServiceManager_GetIslamicBanks_03'
const GET_EMPTY = 'Manager_ManagerServiceManager_GetIslamicBanks_02'
const SAVE_SUCCESS = 'Manager_ManagerServiceManager_SaveIslamicBank_03'
const SAVE_DUP = 'Manager_ManagerServiceManager_SaveIslamicBank_04'
const DELETE_SUCCESS = 'Manager_ManagerServiceManager_DeleteIslamicBank_03'

const ALPHANUMERIC = /^(?! )[a-zA-Z0-9\s.,\-()]*$/

// ── Row mapper ────────────────────────────────────────────────────────────────
const mapBank = (b) => ({ id: b.pK_IslamicBankID, name: b.name || '' })

// ─────────────────────────────────────────────────────────────────────────────

const IslamicBanksPage = () => {
  // ── onFetch ───────────────────────────────────────────────────────────────
  // Must return { data: [{id, name}], totalCount: number, errorMsg: string }
  // totalCount is what drives SimpleConfigListPage's hasMore check.
  const handleFetch = useCallback(async ({ pageNumber, pageSize, search }) => {
    const result = await GetIslamicBanksApi(
      { Name: search || '', PageSize: pageSize, PageNumber: pageNumber },
      { skipLoader: true }
    )

    // Network / service-level failure
    if (!result.success) {
      return {
        data: [],
        totalCount: 0,
        errorMsg: result.message || 'Failed to load Islamic Banks.',
      }
    }

    const rr = result.data?.responseResult
    const code = rr?.responseMessage

    // ── Success — populate list ──
    if (code === GET_SUCCESS) {
      const rows = Array.isArray(rr.islamicBanks) ? rr.islamicBanks.map(mapBank) : []
      return { data: rows, totalCount: rr.totalCount ?? rows.length, errorMsg: '' }
    }

    // ── Empty result — not an error ──
    if (code === GET_EMPTY) {
      return { data: [], totalCount: 0, errorMsg: '' }
    }

    // ── Any other business-logic code ──
    return {
      data: [],
      totalCount: 0,
      errorMsg: GET_ISLAMIC_BANKS_CODES[code] || 'Something went wrong, please try again.',
    }
  }, [])

  // ── onSave ────────────────────────────────────────────────────────────────
  // Must return { success: bool, errorMsg: string }
  // Duplicate names come back as errorMsg so the Input shows inline error.
  const handleSave = useCallback(async ({ name }) => {
    const result = await SaveIslamicBankApi(
      { PK_IslamicBankID: 0, Name: name },
      { skipLoader: true }
    )

    if (!result.success) {
      return { success: false, errorMsg: result.message || 'Failed to save.' }
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === SAVE_SUCCESS) {
      return { success: true, errorMsg: '' }
    }

    // Duplicate — returned as errorMsg so the Input shows it inline
    if (code === SAVE_DUP) {
      return { success: false, errorMsg: SAVE_ISLAMIC_BANKS_CODES[code] || 'Name already exists.' }
    }

    return { success: false, errorMsg: SAVE_ISLAMIC_BANKS_CODES[code] || 'Something went wrong.' }
  }, [])

  // ── onDelete ──────────────────────────────────────────────────────────────
  // Must return { success: bool, errorMsg: string }
  const handleDelete = useCallback(async ({ id }) => {
    const result = await DeleteIslamicBankApi({ PK_IslamicBankID: id }, { skipLoader: true })

    if (!result.success) {
      return { success: false, errorMsg: result.message || 'Failed to delete.' }
    }

    const code = result.data?.responseResult?.responseMessage

    if (code === DELETE_SUCCESS) {
      return { success: true, errorMsg: '' }
    }

    return {
      success: false,
      errorMsg: DELETE_ISLAMIC_BANKS_CODES[code] || 'Something went wrong.',
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SimpleConfigListPage
      title="Islamic Bank"
      fieldLabel="Bank Name"
      fieldPlaceholder="Enter bank name"
      tableColTitle="Name"
      inputRegex={ALPHANUMERIC}
      onFetch={handleFetch}
      onSave={handleSave}
      onDelete={handleDelete}
    />
  )
}

export default IslamicBanksPage
