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
  GET_ALL_GROUPS: import.meta.env.VITE_RM_GET_ALL_GROUPS,
  GET_DATA_ENTRY_USERS: import.meta.env.VITE_RM_GET_DATA_ENTRY_USERS,
  CREATE_GROUP: import.meta.env.VITE_RM_CREATE_GROUP,
  UPDATE_GROUP: import.meta.env.VITE_RM_UPDATE_GROUP,
  DELETE_GROUP: import.meta.env.VITE_RM_DELETE_GROUP,
  // ── Formula Builder ──
  GET_ALL_FORMULAS: import.meta.env.VITE_RM_GET_ALL_FORMULAS,
  GET_FORMULA_BY_ID: import.meta.env.VITE_RM_GET_FORMULA_BY_ID,
  GET_CLASSIFICATIONS_FOR_FORMULA: import.meta.env.VITE_RM_GET_CLASSIFICATIONS_FOR_FORMULA,
  GET_ALL_ACTIVE_CLASSIFICATIONS: import.meta.env.VITE_RM_GET_ALL_ACTIVE_CLASSIFICATIONS,
  CREATE_FORMULA: import.meta.env.VITE_RM_CREATE_FORMULA,
  UPDATE_FORMULA: import.meta.env.VITE_RM_UPDATE_FORMULA,
  // ── Audit Trail ──
  GET_AUDIT_REPORT: import.meta.env.VITE_RM_GET_AUDIT_REPORT,
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
  formPost(
    Admin_URL,
    RM.GET_ALL_SIGNUP_REQUEST,
    {
      UserName: params.UserName || '',
      OrganizationName: params.OrganizationName || '',
      RoleName: params.RoleName || '',
      EmailAddress: params.EmailAddress || '',
      MobileNo: params.MobileNo || '',
      SentOnFrom: params.SentOnFrom || '',
      SentOnTo: params.SentOnTo || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

export const approvePendingRequest = (RegistrationRequestID, Notes) =>
  formPost(Admin_URL, RM.APPROVE_PENDING_REQUEST, { RegistrationRequestID, Notes })

export const declinePendingRequest = (RegistrationRequestID, Notes) =>
  formPost(Admin_URL, RM.DECLINE_PENDING_REQUEST, { RegistrationRequestID, Notes })

export const getViewDetails = (params = {}, config = {}) =>
  formPost(
    Admin_URL,
    RM.GET_VIEW_DETAILS,
    {
      UserName: params.UserName || '',
      OrganizationName: params.OrganizationName || '',
      EmailAddress: params.EmailAddress || '',
      RoleName: params.RoleName || '',
      Status: params.Status || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

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
  formPost(
    Admin_URL,
    RM.GET_ALL_GROUPS,
    {
      UserName: params.UserName || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

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
export const deleteGroup = (data) => formPost(Admin_URL, RM.DELETE_GROUP, { GroupID: data.GroupID })

// ─── Formula Builder ──────────────────────────────────────────────────────────

/**
 * GetAllFormulas response codes
 * Admin_AdminServiceManager_GetAllFormulas_01 — Unauthorized
 * Admin_AdminServiceManager_GetAllFormulas_02 — No formulas found
 * Admin_AdminServiceManager_GetAllFormulas_03 — Success
 * Admin_AdminServiceManager_GetAllFormulas_04 — Unexpected exception
 */
export const GET_ALL_FORMULAS_CODES = {
  Admin_AdminServiceManager_GetAllFormulas_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetAllFormulas_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetAllFormulas_03: null, // success
  Admin_AdminServiceManager_GetAllFormulas_04: 'Something went wrong, please try again.',
}

/**
 * GetFormulaByID response codes
 * Admin_AdminServiceManager_GetFormulaByID_01 — Unauthorized
 * Admin_AdminServiceManager_GetFormulaByID_02 — Formula ID required
 * Admin_AdminServiceManager_GetFormulaByID_03 — Formula not found
 * Admin_AdminServiceManager_GetFormulaByID_04 — Success
 * Admin_AdminServiceManager_GetFormulaByID_05 — Unexpected exception
 */
export const GET_FORMULA_BY_ID_CODES = {
  Admin_AdminServiceManager_GetFormulaByID_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetFormulaByID_02: 'Formula ID is required.',
  Admin_AdminServiceManager_GetFormulaByID_03: 'Formula not found.',
  Admin_AdminServiceManager_GetFormulaByID_04: null, // success
  Admin_AdminServiceManager_GetFormulaByID_05: 'Something went wrong, please try again.',
}

/**
 * GetClassificationsForFormula response codes
 * Admin_AdminServiceManager_GetClassificationsForFormula_01 — Unauthorized
 * Admin_AdminServiceManager_GetClassificationsForFormula_02 — No available classifications
 * Admin_AdminServiceManager_GetClassificationsForFormula_03 — Success
 * Admin_AdminServiceManager_GetClassificationsForFormula_04 — Unexpected exception
 */
export const GET_CLASSIFICATIONS_FOR_FORMULA_CODES = {
  Admin_AdminServiceManager_GetClassificationsForFormula_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetClassificationsForFormula_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetClassificationsForFormula_03: null, // success
  Admin_AdminServiceManager_GetClassificationsForFormula_04:
    'Something went wrong, please try again.',
}

/**
 * GetAllActiveClassifications response codes
 * Admin_AdminServiceManager_GetAllActiveClassifications_01 — Unauthorized
 * Admin_AdminServiceManager_GetAllActiveClassifications_02 — No active classifications
 * Admin_AdminServiceManager_GetAllActiveClassifications_03 — Success
 * Admin_AdminServiceManager_GetAllActiveClassifications_04 — Unexpected exception
 */
export const GET_ALL_ACTIVE_CLASSIFICATIONS_CODES = {
  Admin_AdminServiceManager_GetAllActiveClassifications_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetAllActiveClassifications_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetAllActiveClassifications_03: null, // success
  Admin_AdminServiceManager_GetAllActiveClassifications_04:
    'Something went wrong, please try again.',
}

/**
 * CreateFormula response codes
 * Admin_AdminServiceManager_CreateFormula_01 — Unauthorized
 * Admin_AdminServiceManager_CreateFormula_02 — Classification ID and expression required
 * Admin_AdminServiceManager_CreateFormula_03 — Classification already has a formula
 * Admin_AdminServiceManager_CreateFormula_04 — Insert failed
 * Admin_AdminServiceManager_CreateFormula_05 — Success
 * Admin_AdminServiceManager_CreateFormula_06 — Unexpected exception
 */
export const CREATE_FORMULA_CODES = {
  Admin_AdminServiceManager_CreateFormula_01: 'Unauthorized access.',
  Admin_AdminServiceManager_CreateFormula_02: 'Classification and formula expression are required.',
  Admin_AdminServiceManager_CreateFormula_03: 'This classification already has a formula.',
  Admin_AdminServiceManager_CreateFormula_04: 'Failed to create formula, please try again.',
  Admin_AdminServiceManager_CreateFormula_05: null, // success
  Admin_AdminServiceManager_CreateFormula_06: 'Something went wrong, please try again.',
}

/**
 * UpdateFormula response codes
 * Admin_AdminServiceManager_UpdateFormula_01 — Unauthorized
 * Admin_AdminServiceManager_UpdateFormula_02 — Required fields missing
 * Admin_AdminServiceManager_UpdateFormula_03 — Classification already used by another formula
 * Admin_AdminServiceManager_UpdateFormula_04 — Update failed
 * Admin_AdminServiceManager_UpdateFormula_05 — Success
 * Admin_AdminServiceManager_UpdateFormula_06 — Unexpected exception
 */
export const UPDATE_FORMULA_CODES = {
  Admin_AdminServiceManager_UpdateFormula_01: 'Unauthorized access.',
  Admin_AdminServiceManager_UpdateFormula_02:
    'Formula ID, classification and expression are required.',
  Admin_AdminServiceManager_UpdateFormula_03:
    'This classification is already used by another formula.',
  Admin_AdminServiceManager_UpdateFormula_04: 'Failed to update formula, please try again.',
  Admin_AdminServiceManager_UpdateFormula_05: null, // success
  Admin_AdminServiceManager_UpdateFormula_06: 'Something went wrong, please try again.',
}

/** Fetch paginated list of all formulas */
export const getAllFormulas = (params = {}, config = {}) =>
  formPost(
    Admin_URL,
    RM.GET_ALL_FORMULAS,
    {
      ClassificationName: params.ClassificationName || '',
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )

/** Fetch a single formula by its primary key */
export const getFormulaById = (formulaId, config = {}) =>
  formPost(Admin_URL, RM.GET_FORMULA_BY_ID, { FormulaID: formulaId }, config)

/** Fetch calculated, formula-free classifications for the Add dropdown */
export const getClassificationsForFormula = (config = {}) =>
  formPost(Admin_URL, RM.GET_CLASSIFICATIONS_FOR_FORMULA, {}, config)

/** Fetch all active classifications for the builder operand palette */
export const getAllActiveClassifications = (params = {}, config = {}) =>
  formPost(Admin_URL, RM.GET_ALL_ACTIVE_CLASSIFICATIONS, {}, config)

/** Create a new formula */
export const createFormula = (data) =>
  formPost(Admin_URL, RM.CREATE_FORMULA, {
    FK_ClassificationID: data.FK_ClassificationID,
    FormulaExpression: data.FormulaExpression,
  })

/** Update an existing formula */
export const updateFormula = (data) =>
  formPost(Admin_URL, RM.UPDATE_FORMULA, {
    FormulaID: data.FormulaID,
    FK_ClassificationID: data.FK_ClassificationID,
    FormulaExpression: data.FormulaExpression,
    IsActive: data.IsActive,
  })

// ─── Audit Trail ──────────────────────────────────────────────────────────────

/**
 * GetAuditReport response codes
 * Admin_AdminServiceManager_GetAuditReport_01 — Unauthorized
 * Admin_AdminServiceManager_GetAuditReport_02 — No audit records found
 * Admin_AdminServiceManager_GetAuditReport_03 — Success
 * Admin_AdminServiceManager_GetAuditReport_04 — Unexpected exception
 */
export const GET_AUDIT_REPORT_CODES = {
  Admin_AdminServiceManager_GetAuditReport_01: 'Unauthorized access.',
  Admin_AdminServiceManager_GetAuditReport_02: null, // no records — handled in UI
  Admin_AdminServiceManager_GetAuditReport_03: null, // success
  Admin_AdminServiceManager_GetAuditReport_04: 'Something went wrong, please try again.',
}

/**
 * Fetch paginated audit report with optional filters.
 * @param {object} params
 * @param {string}  params.DateFrom            — yyyyMMdd (empty string = no filter)
 * @param {string}  params.DateTo              — yyyyMMdd (empty string = no filter)
 * @param {number}  params.UserID              — 0 = all users
 * @param {number}  params.FK_AudiTrialActionID — 0 = all actions
 * @param {number}  params.FK_AuditEventsID    — 0 = all events
 * @param {number}  params.PageSize
 * @param {number}  params.PageNumber          — 0-based
 */
export const getAuditReport = (params = {}, config = {}) =>
  formPost(
    Admin_URL,
    RM.GET_AUDIT_REPORT,
    {
      DateFrom: params.DateFrom || '',
      DateTo: params.DateTo || '',
      UserID: params.UserID ?? 0,
      FK_AudiTrialActionID: params.FK_AudiTrialActionID ?? 0,
      FK_AuditEventsID: params.FK_AuditEventsID ?? 0,
      PageSize: params.PageSize ?? 10,
      PageNumber: params.PageNumber ?? 0,
    },
    config
  )
