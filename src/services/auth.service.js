/**
 * src/services/auth.service.js
 * ==============================
 * All Auth-related API calls.
 * Request methods are read from .env (VITE_RM_*) for easy config management.
 *
 * Return shape (from handleRequest):
 *   { success: true,  data, status }
 *   { success: false, message, status, errors }
 */

import { formPost, AUTH_URL, Admin_URL } from '../utils/api'

// ─── Request Methods (from .env) ─────────────────────────────────────────────
const RM = {
  LOGIN:              import.meta.env.VITE_RM_LOGIN,
  FORGOT_PASSWORD:    import.meta.env.VITE_RM_FORGOT_PASSWORD,
  RESET_PASSWORD:     import.meta.env.VITE_RM_RESET_PASSWORD,
  CHANGE_PASSWORD:    import.meta.env.VITE_RM_CHANGE_PASSWORD,
  VERIFY_EMAIL:       import.meta.env.VITE_RM_VERIFY_EMAIL,
  REQUEST_TO_SIGNUP:  import.meta.env.VITE_RM_REQUEST_TO_SIGNUP,
  GET_ALL_USER_ROLES: import.meta.env.VITE_RM_GET_ALL_USER_ROLES,
}

// ─── Response code maps ───────────────────────────────────────────────────────

/**
 * VerifyUserEmail response codes
 * ERMAuth_AuthServiceManager_VerifyUserEmail_01 — Email Empty / Invalid
 * ERMAuth_AuthServiceManager_VerifyUserEmail_02 — Valid Email (available)
 * ERMAuth_AuthServiceManager_VerifyUserEmail_03 — Email Already Exists
 * ERMAuth_AuthServiceManager_VerifyUserEmail_04 — Exception
 */
export const VERIFY_EMAIL_CODES = {
  ERMAuth_AuthServiceManager_VerifyUserEmail_01: { valid: false, msg: 'Email is required.' },
  ERMAuth_AuthServiceManager_VerifyUserEmail_02: { valid: true,  msg: null },
  ERMAuth_AuthServiceManager_VerifyUserEmail_03: { valid: false, msg: 'This email is already registered.' },
  ERMAuth_AuthServiceManager_VerifyUserEmail_04: { valid: false, msg: 'Could not verify email. Please try again.' },
}

/**
 * GetAllUserRoles response codes
 * Admin_AdminServiceManager_GetAllUserRoles_01 — No record found
 * Admin_AdminServiceManager_GetAllUserRoles_02 — Record found (success)
 * Admin_AdminServiceManager_GetAllUserRoles_03 — Exception
 */
export const GET_ALL_USER_ROLES_CODES = {
  Admin_AdminServiceManager_GetAllUserRoles_01: 'No roles found.',
  Admin_AdminServiceManager_GetAllUserRoles_02: null, // success
  Admin_AdminServiceManager_GetAllUserRoles_03: 'Something went wrong. Please try again.',
}

/**
 * RequestToSignUp response codes
 * Admin_AdminServiceManager_RequestToSignUp_01 — Email Empty
 * Admin_AdminServiceManager_RequestToSignUp_02 — Email Already Exists
 * Admin_AdminServiceManager_RequestToSignUp_03 — Exception
 * Admin_AdminServiceManager_RequestToSignUp_04 — Mobile Number Already Exists
 * Admin_AdminServiceManager_RequestToSignUp_05 — No Record Saved
 * Admin_AdminServiceManager_RequestToSignUp_06 — Record Saved (success)
 */
export const SIGNUP_CODES = {
  Admin_AdminServiceManager_RequestToSignUp_01: 'Email is required.',
  Admin_AdminServiceManager_RequestToSignUp_02: 'This email is already registered.',
  Admin_AdminServiceManager_RequestToSignUp_03: 'Something went wrong. Please try again.',
  Admin_AdminServiceManager_RequestToSignUp_04: 'This mobile number is already registered.',
  Admin_AdminServiceManager_RequestToSignUp_05: 'Registration failed. Please try again.',
  Admin_AdminServiceManager_RequestToSignUp_06: null, // success
}

// ─── API functions ────────────────────────────────────────────────────────────

/** Login */
export const loginApi = (data) =>
  formPost(AUTH_URL, RM.LOGIN, data)

/** Fetch all user roles — called before Signup page loads */
export const getAllUserRoles = () =>
  formPost(Admin_URL, RM.GET_ALL_USER_ROLES, {})

/** Verify if email is available */
export const verifyUserEmail = (email) =>
  formPost(AUTH_URL, RM.VERIFY_EMAIL, { Email: email })

/** Submit signup request */
export const signupApi = (data) =>
  formPost(Admin_URL, RM.REQUEST_TO_SIGNUP, data)

/** Forgot password — send reset link */
export const forgotPasswordApi = (data) =>
  formPost(AUTH_URL, RM.FORGOT_PASSWORD, data)

/** Reset password using token */
export const resetPasswordApi = (data) =>
  formPost(AUTH_URL, RM.RESET_PASSWORD, data)

/** Change password (authenticated user) */
export const changePasswordApi = (data) =>
  formPost(AUTH_URL, RM.CHANGE_PASSWORD, data)
