/**
 * src/components/layout/Topbar.jsx
 * ==================================
 * Fixed top navbar — white background, full width, 56px height.
 *
 * Design:
 *  LEFT  → Al-Hilal logo (circle icon + text)
 *  RIGHT → Bell icon with unread badge → Notification list dropdown
 *          User pill (avatar + name) → Change Password | Logout dropdown
 *
 * Font: Open Sans (project-wide font-sans from tailwind config)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { logoutApi, LOGOUT_CODES } from '../../services/auth.service'
import { clearLocalSession } from '../../utils/sessionRestore'
import { getAllNotifications, markNotificationsAsReadAPI } from '../../services/admin.service'
import { getAllManagerNotifications, markManagerNotificationsAsReadAPI } from '../../services/manager.service'
import mqttService from '../../services/mqtt.service'
import { Bell, CheckCircle2 } from 'lucide-react'
import { useSubscribe } from '../../context/MqttContext'
import { createMqttTypeRouter } from '../../utils/mqttRouter'
import { MQTT_TYPE } from '../../hooks/useMqttListener'

import logo from '../../../public/logo-header.png'
import changepassword from '../../../public/cp-icon.png'
import logout from '../../../public/logout-icon.png'

// ── useClickOutside hook ──────────────────────────────────────────────────────
const useClickOutside = (ref, cb) => {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

// ── Al-Hilal Logo ─────────────────────────────────────────────────────────────
const AlHilalLogo = () => (
  <img
    src={logo}
    alt="Al-Hilal Shariah Advisors"
    className="h-[40px] w-auto object-contain select-none"
    draggable={false}
  />
)

const ChangePasswordLogo = () => (
  <img src={changepassword} className="text-[#7b8db0]" alt="changepassword" />
)

const LogoutLogo = () => (
  <img src={logout} className="text-[#7b8db0]" alt="logout" />
)

// ── Helpers ───────────────────────────────────────────────────────────────────
const toRelativeTime = (dateStr) => {
  if (!dateStr || dateStr.length < 8) return ''
  const y  = dateStr.slice(0, 4)
  const mo = dateStr.slice(4, 6)
  const d  = dateStr.slice(6, 8)
  const h  = dateStr.length >= 10 ? dateStr.slice(8, 10)  : '00'
  const mi = dateStr.length >= 12 ? dateStr.slice(10, 12) : '00'
  const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:00`)
  const diff = Math.floor((Date.now() - dt.getTime()) / 1000)
  if (isNaN(diff) || diff < 0) return ''
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const mapNotifications = (raw = []) =>
  raw.map((n) => ({
    id:    n.notificationID ?? n.NotificationID ?? n.PK_NotificationID ?? Math.random(),
    title: n.title ?? n.Title ?? n.NotificationTitle ?? '',
    body:  n.message ?? n.Message ?? n.NotificationMessage ?? n.Body ?? '',
    time:  toRelativeTime(n.createdAt ?? n.CreatedAt ?? n.CreationDateTime ?? ''),
    read:  !!(n.isRead ?? n.IsRead),
  }))

// ── Single notification row ───────────────────────────────────────────────────
const NotifItem = ({ notif }) => (
  <div
    className={`flex items-start gap-3 px-4 py-3 hover:bg-[#f5f8ff] transition-colors cursor-pointer
                border-b border-[#f0f3f8] last:border-0
                ${!notif.read ? 'bg-[#EFF3FF]' : 'bg-white'}`}
  >
    <div className="shrink-0 mt-0.5">
      <CheckCircle2
        size={20}
        className={notif.read ? 'text-[#01C9A4]' : 'text-[#0B39B5]'}
        strokeWidth={1.8}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-[13px] leading-snug ${notif.read ? 'font-medium text-[#041E66]' : 'font-semibold text-[#0B39B5]'}`}>
        {notif.title}
      </p>
      <p className="text-[12px] text-[#7b8db0] mt-0.5 leading-snug">{notif.body}</p>
    </div>
    <span className="text-[11px] text-[#a0aec0] shrink-0 mt-0.5 whitespace-nowrap">
      {notif.time}
    </span>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────────────────────────────────────
const Topbar = () => {
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu]     = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifications, setNotifications]   = useState([])
  const [loadingNotifs, setLoadingNotifs]   = useState(false)

  const userRef    = useRef(null)
  const bellRef    = useRef(null)
  const fetchedRef = useRef(false)

  useClickOutside(userRef, () => setShowUserMenu(false))
  useClickOutside(bellRef, () => setShowNotifPanel(false))

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  const handleOpenNotifPanel = () => {
    const isOpening = !showNotifPanel
    setShowNotifPanel((p) => !p)
    setShowUserMenu(false)

    if (!isOpening) return
    const unreadIDs = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIDs.length === 0) return

    const markFn = roleID === 1 ? markNotificationsAsReadAPI : roleID === 2 ? markManagerNotificationsAsReadAPI : null
    if (markFn) {
      markFn(unreadIDs, { skipLoader: true })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  // Read user + role from sessionStorage
  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem('user_profile_data')) || {} } catch { return {} }
  })()
  const fullName = user.fullName || 'User'

  const roleID = (() => {
    try { return JSON.parse(sessionStorage.getItem('user_roles'))?.[0]?.roleID } catch { return null }
  })()

  // ── Load notifications on mount (Admin + Manager) ─────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return
    if (roleID !== 1 && roleID !== 2) return
    fetchedRef.current = true

    // Login pre-fetched and cached — use instantly, no spinner needed
    const cached = sessionStorage.getItem('cached_notifications')
    if (cached) {
      sessionStorage.removeItem('cached_notifications')
      try { setNotifications(mapNotifications(JSON.parse(cached))) } catch { /* ignore */ }
      return
    }

    // Cache miss (e.g. page refresh) — fetch from API
    ;(async () => {
      setLoadingNotifs(true)
      const res = await (roleID === 1
        ? getAllNotifications({ skipLoader: true })
        : getAllManagerNotifications({ skipLoader: true }))
      setLoadingNotifs(false)
      if (!res.success) return
      const raw = res.data?.responseResult?.notifications ?? res.data?.responseResult?.Notifications ?? []
      setNotifications(mapNotifications(raw))
    })()
  }, [roleID])

  // ── MQTT → prepend real-time notification to panel ────────────────────────
  const mqttTopic = sessionStorage.getItem('user_mqtt_topic') || null

  const prependNotif = useCallback((title, body) => {
    setNotifications((prev) => [
      { id: Date.now(), title, body, time: 'just now', read: false },
      ...prev,
    ])
  }, [])

  const mqttHandler = useCallback(
    createMqttTypeRouter({
      [MQTT_TYPE.NEW_SIGNUP_REQUEST]: (payload) => {
        const n = payload.notification ?? {}
        prependNotif(n.title || 'New Signup Request', n.detail || '')
      },
      [MQTT_TYPE.SIGNUP_REQUEST_APPROVED]: (payload) => {
        const d = payload.data ?? {}
        prependNotif('Signup Request Approved', `Request ${d.RequestID ? `#${d.RequestID} ` : ''}has been approved`)
      },
      [MQTT_TYPE.SIGNUP_REQUEST_DECLINED]: (payload) => {
        const d = payload.data ?? {}
        prependNotif('Signup Request Declined', `Request ${d.RequestID ? `#${d.RequestID} ` : ''}has been declined`)
      },
      [MQTT_TYPE.PENDING_APPROVAL_UPDATED]: (payload) => {
        const d = Array.isArray(payload.data) ? payload.data[0] ?? {} : payload.data ?? {}
        const company = d.companyName ? ` for ${d.companyName}` : ''
        prependNotif('Approval Updated', `Submission${company} status updated`)
      },
    }),
    [prependNotif]
  )

  useSubscribe(mqttTopic, mqttHandler)

  const handleLogout = async () => {
    const result = await logoutApi()
    const code = result.data?.responseResult?.responseMessage

    if (code !== 'ERM_Auth_AuthServiceManager_Logout_01') {
      toast.error(LOGOUT_CODES[code] || 'Logout failed. Please try again.', {
        style: { backgroundColor: '#E74C3C', color: '#ffffff' },
        progressStyle: { backgroundColor: '#ffffff50' },
      })
      return
    }

    mqttService.disconnect()
    clearLocalSession()   // remove multi-tab bootstrap data from localStorage
    sessionStorage.clear()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white
                 flex items-center justify-between pr-5 pl-2 font-sans"
      style={{ height: '56px' }}
    >
      {/* ── Logo ── */}
      <AlHilalLogo />

      {/* ── Right actions ── */}
      <div className="flex items-center gap-3">
        {/* ── Bell + Notification panel ── */}
        <div ref={bellRef} className="relative">
          <button
            onClick={handleOpenNotifPanel}
            className="relative w-9 h-9 flex items-center justify-center rounded-full
                       hover:bg-[#EFF3FF] transition-colors duration-150"
          >
            <Bell size={20} className="text-[#0B39B5]" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span
                className="absolute top-0 left-0 min-w-[16px] h-[16px] px-[3px]
                           bg-[#0B39B5] text-white text-[9px] font-bold
                           rounded-full flex items-center justify-center leading-none"
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown panel */}
          {showNotifPanel && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 w-[340px]
                         bg-white border border-[#e8edf4] rounded-xl z-50
                         animate-slide-down overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgba(11,57,181,0.12)' }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#eef2f7]">
                <span className="text-[15px] font-bold text-[#041E66]">Notification</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-[#0B39B5] hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-[360px] overflow-y-auto">
                {loadingNotifs ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-6 h-6 border-[3px] border-[#0B39B5]/20 border-t-[#0B39B5] rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center text-[13px] text-[#a0aec0]">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => <NotifItem key={n.id} notif={n} />)
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── User pill + dropdown ── */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => {
              setShowUserMenu((p) => !p)
              setShowNotifPanel(false)
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5
                       bg-[#F0F4F8] hover:bg-[#e4eaf2] border border-[#d8e0ea]
                       rounded-full transition-colors duration-150"
          >
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0B39B5] to-[#01C9A4]
                         flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            >
              {fullName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] font-semibold text-[#041E66]">{fullName}</span>
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 w-[190px]
                         bg-white border border-[#e8edf4] rounded-xl z-50
                         animate-slide-down py-1.5"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            >
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  navigate('/change-password')
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] font-medium text-[#041E66] hover:bg-[#EFF3FF]
                           transition-colors duration-100"
              >
                <ChangePasswordLogo />
                Change Password
              </button>
              <div className="h-px bg-[#eef2f7] mx-3 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] font-medium text-[#041E66] hover:bg-red-50 hover:text-[#E74C3C]
                           transition-colors duration-100"
              >
                <LogoutLogo className="text-[#7b8db0]" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
