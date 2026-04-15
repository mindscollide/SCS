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
  LOGIN:            import.meta.env.VITE_RM_LOGIN,
  LOGOUT:           import.meta.env.VITE_RM_LOGOUT,
  FORGOT_PASSWORD:  import.meta.env.VITE_RM_FORGOT_PASSWORD,
  RESET_PASSWORD: import.meta.env.VITE_RM_RESET_PASSWORD,
  CHANGE_PASSWORD: import.meta.env.VITE_RM_CHANGE_PASSWORD,
  VERIFY_EMAIL: import.meta.env.VITE_RM_VERIFY_EMAIL,
  REQUEST_TO_SIGNUP: import.meta.env.VITE_RM_REQUEST_TO_SIGNUP,
  GET_ALL_USER_ROLES: import.meta.env.VITE_RM_GET_ALL_USER_ROLES,
}

// ─── Response code maps ───────────────────────────────────────────────────────

/**
 * Login response codes
 * ERM_Auth_AuthServiceManager_Login_01 — Success
 * ERM_Auth_AuthServiceManager_Login_02 — Email not found or wrong password
 * ERM_Auth_AuthServiceManager_Login_03 — Account is inactive
 * ERM_Auth_AuthServiceManager_Login_04 — Password not yet created
 * ERM_Auth_AuthServiceManager_Login_05 — Email or password field empty
 * ERM_Auth_AuthServiceManager_Login_06 — Login history insert failed / unexpected error
 */
export const LOGIN_CODES = {
  ERM_Auth_AuthServiceManager_Login_01: null, // success
  ERM_Auth_AuthServiceManager_Login_02: 'Invalid email or password.',
  ERM_Auth_AuthServiceManager_Login_03: 'Your account has been deactivated. Please contact support.',
  ERM_Auth_AuthServiceManager_Login_04: 'Please check your email to set up your password first.',
  ERM_Auth_AuthServiceManager_Login_05: 'Email and password are required.',
  ERM_Auth_AuthServiceManager_Login_06: 'Something went wrong. Please try again.',
}

/**
 * VerifyUserEmail response codes
 * ERMAuth_AuthServiceManager_VerifyUserEmail_01 — Email Empty / Invalid
 * ERMAuth_AuthServiceManager_VerifyUserEmail_02 — Valid Email (available)
 * ERMAuth_AuthServiceManager_VerifyUserEmail_03 — Email Already Exists
 * ERMAuth_AuthServiceManager_VerifyUserEmail_04 — Exception
 */
export const VERIFY_EMAIL_CODES = {
  ERMAuth_AuthServiceManager_VerifyUserEmail_01: { valid: false, msg: 'Email is required.' },
  ERMAuth_AuthServiceManager_VerifyUserEmail_02: { valid: true, msg: null },
  ERMAuth_AuthServiceManager_VerifyUserEmail_03: {
    valid: false,
    msg: 'This email is already registered.',
  },
  ERMAuth_AuthServiceManager_VerifyUserEmail_04: {
    valid: false,
    msg: 'Could not verify email. Please try again.',
  },
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
 * ERMAuth_AuthServiceManager_RequestToSignUp_01 — Email Empty
 * ERMAuth_AuthServiceManager_RequestToSignUp_02 — Email Already Exists
 * ERMAuth_AuthServiceManager_RequestToSignUp_03 — Exception
 * ERMAuth_AuthServiceManager_RequestToSignUp_04 — Mobile Number Already Exists
 * ERMAuth_AuthServiceManager_RequestToSignUp_05 — No Record Saved
 * ERMAuth_AuthServiceManager_RequestToSignUp_06 — Record Saved (success)
 */
export const SIGNUP_CODES = {
  ERMAuth_AuthServiceManager_RequestToSignUp_01: 'Email is required.',
  ERMAuth_AuthServiceManager_RequestToSignUp_02: 'This email is already registered.',
  ERMAuth_AuthServiceManager_RequestToSignUp_03: 'Something went wrong. Please try again.',
  ERMAuth_AuthServiceManager_RequestToSignUp_04: 'This mobile number is already registered.',
  ERMAuth_AuthServiceManager_RequestToSignUp_05: 'Registration failed. Please try again.',
  ERMAuth_AuthServiceManager_RequestToSignUp_06: null, // success
}

// ─── API functions ────────────────────────────────────────────────────────────

export const LOGOUT_CODES = {
  ERM_Auth_AuthServiceManager_Logout_01: null,
  ERM_Auth_AuthServiceManager_Logout_02: 'User ID and Device ID are required.',
  ERM_Auth_AuthServiceManager_Logout_03: 'Logout failed, please try again.',
  ERM_Auth_AuthServiceManager_Logout_04: 'Something went wrong, please try again.',
}

/** Login */
export const loginApi = (data) => formPost(AUTH_URL, RM.LOGIN, data)

/** Logout */
export const logoutApi = () => {
  const profile  = (() => { try { return JSON.parse(sessionStorage.getItem('user_profile_data')) || {} } catch { return {} } })()
  const deviceId = localStorage.getItem('scs_device_id') || ''
  return formPost(AUTH_URL, RM.LOGOUT, {
    UserID:   profile.userID || 0,
    DeviceID: deviceId,
  }, { skipAuth: true })
}

/** Fetch all user roles — called before Signup page loads */
export const getAllUserRoles = () => formPost(Admin_URL, RM.GET_ALL_USER_ROLES, {})

/** Verify if email is available */
export const verifyUserEmail = (email) =>
  formPost(AUTH_URL, RM.VERIFY_EMAIL, { EmailAddress: email })

/** Submit signup request */
export const signupApi = (data) => formPost(AUTH_URL, RM.REQUEST_TO_SIGNUP, data)

/** Forgot password — send reset link (public, no token required) */
export const forgotPasswordApi = (data) => formPost(AUTH_URL, RM.FORGOT_PASSWORD, data, { skipAuth: true })

/** Reset password using token */
export const resetPasswordApi = (data) => formPost(AUTH_URL, RM.RESET_PASSWORD, data)

/** Change password (authenticated user) */
export const changePasswordApi = (data) => formPost(AUTH_URL, RM.CHANGE_PASSWORD, data)
