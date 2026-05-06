/**
 * src/services/manager.service.js
 * =================================
 * All Manager-related API calls.
 */

import { formPost, Manager_URL } from '../utils/api'

// ─── Request Methods ──────────────────────────────────────────────────────────
const RM = {
  GET_PENDING_APPROVALS: import.meta.env.VITE_RM_GET_PENDING_APPROVALS,
  GET_PENDING_APPROVAL_DETAILS: import.meta.env.VITE_RM_GET_PENDING_APPROVAL_DETAILS,
  GET_SECTORS: import.meta.env.VITE_RM_GET_SECTORS,
  SAVE_SECTORS: import.meta.env.VITE_RM_SAVE_SECTORS,
}

// ─── Response Codes ───────────────────────────────────────────────────────────

export const GET_PENDING_APPROVALS_CODES = {
  Manager_ManagerServiceManager_GetPendingApprovals_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetPendingApprovals_02: null, // no records — handled in UI
  Manager_ManagerServiceManager_GetPendingApprovals_03: null, // success
  Manager_ManagerServiceManager_GetPendingApprovals_04: 'Something went wrong, please try again',
}

export const GET_PENDING_APPROVAL_DETAILS_CODES = {
  Manager_ManagerServiceManager_GetPendingApprovalDetails_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_02: 'Approval request ID is required.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_03: 'Approval request not found.',
  Manager_ManagerServiceManager_GetPendingApprovalDetails_04: null, // success — handled in UI
  Manager_ManagerServiceManager_GetPendingApprovalDetails_05:
    'Something went wrong, please try again.',
}

export const GET_SECTORS_CODES = {
  Manager_ManagerServiceManager_GetSectors_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_GetSectors_02: 'No sectors found',
  Manager_ManagerServiceManager_GetSectors_03: null,
  Manager_ManagerServiceManager_GetSectors_04: 'Something went wrong, please try again',
}
export const SAVE_SECTORS_CODES = {
  Manager_ManagerServiceManager_SaveSector_01: 'Unauthorized access.',
  Manager_ManagerServiceManager_SaveSector_02: 'SectorName is required',
  Manager_ManagerServiceManager_SaveSector_03:
    'SectorName invalid — alphabets only, max 50 characters',
  Manager_ManagerServiceManager_SaveSector_04: null,
  Manager_ManagerServiceManager_SaveSector_05: 'Duplicate — SectorName already exists',
  Manager_ManagerServiceManager_SaveSector_06: 'Failed to save, please try again',
  Manager_ManagerServiceManager_SaveSector_07: 'Something went wrong, please try again',
}
// ─── API Calls ────────────────────────────────────────────────────────────────

export const getPendingRequestsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_PENDING_APPROVALS,
    {
      FK_CompanyID: params.FK_CompanyID || 0,
      FK_QuarterID: params.FK_QuarterID || 0,
      FK_StatusID: params.FK_StatusID || 0,
      DateFrom: params.DateFrom || '',
      DateTo: params.DateTo || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

export const getPendingApprovalDetailsApi = (dataApprovalRequestID, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_PENDING_APPROVAL_DETAILS,
    { DataApprovalRequestID: dataApprovalRequestID },
    config
  )

// VITE_RM_GET_SECTORS

export const getSectorsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.GET_SECTORS,
    {
      SectorName: params.SectorName || '',
      FK_SectorStatusID: params.FK_SectorStatusID || 0,
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

export const saveSectorsApi = (params = {}, config = {}) =>
  formPost(
    Manager_URL,
    RM.SAVE_SECTORS,
    {
      PK_SectorID: params.PK_SectorID ?? 0,
      SectorName: params.SectorName || '',
      FK_SectorStatusID: params.FK_SectorStatusID ?? 0,
    },
    config
  )
