/**
 * src/routes/RoleRoute.jsx
 * =========================
 * Checks if the logged-in user has one of the required roleIDs.
 * If not → redirects them to their own dashboard (not /login).
 *
 * Role ID mapping:
 *   1 → Admin       → /scs/admin/users
 *   2 → Manager     → /scs/manager/pending-approvals
 *   3 → Data Entry  → /scs/data-entry/financial-data
 *
 * Props:
 *   allowedRoleIds  {number[]}  — e.g. [1] for Admin-only routes
 */

import { Navigate, Outlet } from 'react-router-dom'

export const ROLE_HOME = {
  1: '/scs/admin/users',
  2: '/scs/manager/pending-approvals',
  3: '/scs/data-entry/financial-data',
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
