/**
 * src/context/PendingCountContext.jsx
 * =====================================
 * Provides the pending signup-request count to the Sidebar badge.
 *
 * Mounted inside AppLayout (within MqttProvider) so both the MQTT listener
 * and Sidebar can access the count. Only active for Admin role (roleID 1).
 *
 * Refresh triggers:
 *  - On mount (initial fetch)
 *  - MQTT events: user_registration_submitted, signup_request_approved,
 *    signup_request_declined — called via refreshPendingCount()
 *
 * API: AdminServiceManager.GetPendingRequestsCount → { PendingCount: N }
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  getPendingRequestsCount,
  GET_PENDING_REQUESTS_COUNT_CODES,
} from '../services/admin.service'

const PendingCountContext = createContext({ count: 0, refreshPendingCount: () => {} })

const getRoleId = () => {
  try {
    const roles = JSON.parse(sessionStorage.getItem('user_roles') || '[]')
    return roles[0]?.roleID ?? 0
  } catch {
    return 0
  }
}

export const PendingCountProvider = ({ children }) => {
  const [count, setCount] = useState(0)
  const isAdmin = getRoleId() === 1

  const refreshPendingCount = useCallback(async () => {
    if (!isAdmin) return
    try {
      const result = await getPendingRequestsCount({ skipLoader: true })
      const code = result.data?.responseResult?.responseMessage
      if (
        code === 'Admin_AdminServiceManager_GetPendingRequestsCount_02' ||
        GET_PENDING_REQUESTS_COUNT_CODES[code] === null
      ) {
        setCount(result.data?.responseResult?.pendingCount ?? 0)
      }
    } catch {
      // silent — badge stays at last known value
    }
  }, [isAdmin])

  useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  return (
    <PendingCountContext.Provider value={{ count, refreshPendingCount }}>
      {children}
    </PendingCountContext.Provider>
  )
}

export const usePendingCount = () => useContext(PendingCountContext)
