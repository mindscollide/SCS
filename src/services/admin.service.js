/**
 * src/services/admin.service.js
 * ================================
 * All Admin-related API calls.
 * Request methods are read from .env (VITE_RM_*).
 */

import { formPost, Admin_URL } from '../utils/api'

// ─── Request Methods ──────────────────────────────────────────────────────────
const RM = {
  GET_VIEW_DETAILS: import.meta.env.VITE_RM_GET_VIEW_DETAILS,
  EDIT_USER_DETAILS: import.meta.env.VITE_RM_EDIT_USER_DETAILS,
  GET_ALL_SIGNUP_REQUEST: import.meta.env.VITE_RM_GET_ALL_SIGNUP_REQUEST,
  APPROVE_PENDING_REQUEST: import.meta.env.VITE_RM_APPROVE_PENDING_REQUEST,
  DECLINE_PENDING_REQUEST: import.meta.env.VITE_RM_DECLINE_PENDING_REQUEST,
  // ── User Groups ──
  GET_ALL_GROUPS:       import.meta.env.VITE_RM_GET_ALL_GROUPS,
  GET_DATA_ENTRY_USERS: import.meta.env.VITE_RM_GET_DATA_ENTRY_USERS,
  CREATE_GROUP:         import.meta.env.VITE_RM_CREATE_GROUP,
  UPDATE_GROUP:         import.meta.env.VITE_RM_UPDATE_GROUP,
  DELETE_GROUP:         import.meta.env.VITE_RM_DELETE_GROUP,
}

// ─── Response codes ───────────────────────────────────────────────────────────

/**
 * GetViewDetails response codes
 * Admin_AdminServiceManager_GetViewDetails_01 — Logged-in user is not Admin
 * Admin_AdminServiceManager_GetViewDetails_02 — No users found
 * Admin_AdminServiceManager_GetViewDetails_03 — Users fetched successfully
 * Admin_AdminServiceManager_GetViewDetails_04 — Unexpected exception
 */
export const GET_VIEW_DETAILS_CODES = {
  Admin_AdminServiceManager_GetViewDetails_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetViewDetails_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetViewDetails_03: null, // success
  Admin_AdminServiceManager_GetViewDetails_04: 'Something went wrong. Please try again.',
}

/**
 * Fetch paginated + filtered user list.
 * @param {object} params
 * @param {string}  params.UserName
 * @param {string}  params.OrganizationName
 * @param {string}  params.EmailAddress
 * @param {string}  params.RoleName
 * @param {string}  params.Status
 * @param {number}  params.PageSize
 * @param {number}  params.PageNumber   — 0-based
 */
export const EDIT_USER_DETAILS_CODES = {
  Admin_AdminServiceManager_EditUserDetails_01: 'Unauthorized access.',
  Admin_AdminServiceManager_EditUserDetails_02: 'All fields are required.',
  Admin_AdminServiceManager_EditUserDetails_03: null, // success
  Admin_AdminServiceManager_EditUserDetails_04: 'Email ID already in use.',
  Admin_AdminServiceManager_EditUserDetails_05: 'Update failed, please try again.',
  Admin_AdminServiceManager_EditUserDetails_06: 'Something went wrong, please try again.',
}

export const editUserDetails = (data) => formPost(Admin_URL, RM.EDIT_USER_DETAILS, data)

// ─── Signup Requests ──────────────────────────────────────────────────────────

export const GET_ALL_SIGNUP_REQUEST_CODES = {
  Admin_AdminServiceManager_GetAllSignupRequest_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetAllSignupRequest_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetAllSignupRequest_03: null, // success
  Admin_AdminServiceManager_GetAllSignupRequest_04: 'Something went wrong, please try again.',
}

export const APPROVE_PENDING_REQUEST_CODES = {
  Admin_AdminServiceManager_ApprovePendingRequest_01: 'Unauthorized access.',
  Admin_AdminServiceManager_ApprovePendingRequest_02:
    'Registration Request ID and Notes are required.',
  Admin_AdminServiceManager_ApprovePendingRequest_03: null, // success
  Admin_AdminServiceManager_ApprovePendingRequest_04: 'Approval failed, please try again.',
  Admin_AdminServiceManager_ApprovePendingRequest_05: 'Something went wrong, please try again.',
}

export const DECLINE_PENDING_REQUEST_CODES = {
  Admin_AdminServiceManager_DeclinePendingRequest_01: 'Unauthorized access.',
  Admin_AdminServiceManager_DeclinePendingRequest_02:
    'Registration Request ID and Notes are required.',
  Admin_AdminServiceManager_DeclinePendingRequest_03: null, // success
  Admin_AdminServiceManager_DeclinePendingRequest_04: 'Decline failed, please try again.',
  Admin_AdminServiceManager_DeclinePendingRequest_05: 'Something went wrong, please try again.',
}

export const getAllSignupRequests = (params = {}, config = {}) =>
  formPost(Admin_URL, RM.GET_ALL_SIGNUP_REQUEST, {
    UserName: params.UserName || '',
    OrganizationName: params.OrganizationName || '',
    RoleName: params.RoleName || '',
    EmailAddress: params.EmailAddress || '',
    MobileNo: params.MobileNo || '',
    SentOnFrom: params.SentOnFrom || null,
    SentOnTo: params.SentOnTo || null,
    PageSize: params.PageSize ?? 10,
    PageNumber: params.PageNumber ?? 0,
  }, config)

export const approvePendingRequest = (RegistrationRequestID, Notes) =>
  formPost(Admin_URL, RM.APPROVE_PENDING_REQUEST, { RegistrationRequestID, Notes })

export const declinePendingRequest = (RegistrationRequestID, Notes) =>
  formPost(Admin_URL, RM.DECLINE_PENDING_REQUEST, { RegistrationRequestID, Notes })

export const getViewDetails = (params = {}, config = {}) =>
  formPost(Admin_URL, RM.GET_VIEW_DETAILS, {
    UserName: params.UserName || '',
    OrganizationName: params.OrganizationName || '',
    EmailAddress: params.EmailAddress || '',
    RoleName: params.RoleName || '',
    Status: params.Status || '',
    PageSize: params.PageSize ?? 10,
    PageNumber: params.PageNumber ?? 0,
  }, config)

// ─── User Groups ──────────────────────────────────────────────────────────────

/**
 * GetAllGroups response codes
 * Admin_AdminServiceManager_GetAllGroups_01 — Unauthorized
 * Admin_AdminServiceManager_GetAllGroups_02 — No records found
 * Admin_AdminServiceManager_GetAllGroups_03 — Success
 * Admin_AdminServiceManager_GetAllGroups_04 — Unexpected exception
 */
export const GET_ALL_GROUPS_CODES = {
  Admin_AdminServiceManager_GetAllGroups_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetAllGroups_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetAllGroups_03: null, // success
  Admin_AdminServiceManager_GetAllGroups_04: 'Something went wrong. Please try again.',
}

/**
 * GetDataEntryUsers response codes
 * Admin_AdminServiceManager_GetDataEntryUsers_01 — Unauthorized
 * Admin_AdminServiceManager_GetDataEntryUsers_02 — No users found
 * Admin_AdminServiceManager_GetDataEntryUsers_03 — Success
 */
export const GET_DATA_ENTRY_USERS_CODES = {
  Admin_AdminServiceManager_GetDataEntryUsers_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetDataEntryUsers_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetDataEntryUsers_03: null, // success
}

/**
 * CreateGroup response codes
 * Admin_AdminServiceManager_CreateGroup_03 — Same users already exist in another group
 * Admin_AdminServiceManager_CreateGroup_04 — Duplicate combination already exists
 * Admin_AdminServiceManager_CreateGroup_05 — Success
 */
export const CREATE_GROUP_CODES = {
  Admin_AdminServiceManager_CreateGroup_03: 'These users are already assigned to a group.',
  Admin_AdminServiceManager_CreateGroup_04: 'This combination of users already exists.',
  Admin_AdminServiceManager_CreateGroup_05: null, // success
}

/**
 * UpdateGroup response codes
 * Admin_AdminServiceManager_UpdateGroup_03 — Same users already exist in another group
 * Admin_AdminServiceManager_UpdateGroup_04 — Duplicate combination already exists
 * Admin_AdminServiceManager_UpdateGroup_05 — Success
 */
export const UPDATE_GROUP_CODES = {
  Admin_AdminServiceManager_UpdateGroup_03: 'These users are already assigned to a group.',
  Admin_AdminServiceManager_UpdateGroup_04: 'This combination of users already exists.',
  Admin_AdminServiceManager_UpdateGroup_05: null, // success
}

/**
 * DeleteGroup response codes
 * Admin_AdminServiceManager_DeleteGroup_01 — Unauthorized
 * Admin_AdminServiceManager_DeleteGroup_02 — Group not found
 * Admin_AdminServiceManager_DeleteGroup_03 — Success
 */
export const DELETE_GROUP_CODES = {
  Admin_AdminServiceManager_DeleteGroup_01: 'Unauthorized access.',
  Admin_AdminServiceManager_DeleteGroup_02: 'Group not found.',
  Admin_AdminServiceManager_DeleteGroup_03: null, // success
}

/**
 * Fetch paginated + filtered user groups.
 * @param {object} params
 * @param {string}  params.UserName   — filter by any user's name (optional)
 * @param {number}  params.PageSize
 * @param {number}  params.PageNumber — 0-based
 */
export const getAllGroups = (params = {}, config = {}) =>
  formPost(Admin_URL, RM.GET_ALL_GROUPS, {
    UserName:   params.UserName   || '',
    PageSize:   params.PageSize   ?? 10,
    PageNumber: params.PageNumber ?? 0,
  }, config)

/** Fetch all Data Entry users available for group assignment. */
export const getDataEntryUsers = (config = {}) =>
  formPost(Admin_URL, RM.GET_DATA_ENTRY_USERS, {}, config)

/**
 * Create a new user group.
 * @param {object} data
 * @param {number} data.User1ID
 * @param {number} data.User2ID
 * @param {number} data.User3ID — pass 0 to omit
 * @param {number} data.User4ID — pass 0 to omit
 */
export const createGroup = (data) =>
  formPost(Admin_URL, RM.CREATE_GROUP, {
    User1ID: data.User1ID,
    User2ID: data.User2ID,
    User3ID: data.User3ID ?? 0,
    User4ID: data.User4ID ?? 0,
  })

/**
 * Update an existing user group.
 * @param {object} data
 * @param {number} data.GroupID
 * @param {number} data.User1ID
 * @param {number} data.User2ID
 * @param {number} data.User3ID — pass 0 to omit
 * @param {number} data.User4ID — pass 0 to omit
 */
export const updateGroup = (data) =>
  formPost(Admin_URL, RM.UPDATE_GROUP, {
    GroupID: data.GroupID,
    User1ID: data.User1ID,
    User2ID: data.User2ID,
    User3ID: data.User3ID ?? 0,
    User4ID: data.User4ID ?? 0,
  })

/**
 * Delete a user group.
 * @param {object} data
 * @param {number} data.GroupID
 */
export const deleteGroup = (data) =>
  formPost(Admin_URL, RM.DELETE_GROUP, { GroupID: data.GroupID })
