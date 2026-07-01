/**
 * src/routes/RoleRoute.jsx
 * =========================
 * Checks if the logged-in user has one of the required roleIDs.
 * If not → redirects them to their own dashboard (not /login).
 *
 * Role ID mapping (normal builds):
 *   1 → Admin       → /admin/users
 *   2 → Manager     → /manager/pending-approvals
 *   3 → Data Entry  → /data-entry/financial-data
 *   4 → View Only   → /view-only/financial-data
 *
 * UAT (HIDE_WIP_FLOWS=true): only Data Entry home swaps to the first visible
 * menu item (Manager/View-Only homes are never WIP-gated):
 *   3 → /data-entry/market-cap
 * ROLE_HOME is also used by LoginPage for the post-login redirect — single
 * source of truth, keep in sync with router.jsx WIP_HOME constants.
 *
 * Props:
 *   allowedRoleIds  {number[]}  — e.g. [1] for Admin-only routes
 */

import { Navigate, Outlet } from 'react-router-dom'
import { HIDE_WIP_FLOWS } from '../utils/featureFlags'

export const ROLE_HOME = {
  1: '/admin/users',
  2: HIDE_WIP_FLOWS ? '/manager/markets' : '/manager/pending-approvals',
  3: HIDE_WIP_FLOWS ? '/data-entry/market-cap' : '/data-entry/financial-data',
  4: '/view-only/financial-data',
}

const getUserRoles = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user_roles') || '[]')
  } catch {
    return []
  }
}

const RoleRoute = ({ allowedRoleIds = [] }) => {
  const roles   = getUserRoles()
  const hasRole = roles.some((r) => allowedRoleIds.includes(r.roleID))

  if (hasRole) return <Outlet />

  // Redirect to the user's own home — not login
  const userRoleId = roles[0]?.roleID
  const home       = ROLE_HOME[userRoleId] || '/login'
  return <Navigate to={home} replace />
}

export default RoleRoute
