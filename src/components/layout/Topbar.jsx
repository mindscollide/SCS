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

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Lock, LogOut, CheckCircle2 } from 'lucide-react'

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
  <div className="flex items-center gap-2.5 select-none">
    <div className="relative w-[40px] h-[40px] shrink-0">
      <svg viewBox="0 0 40 40" fill="none" className="w-full h-full">
        <circle cx="20" cy="20" r="19" stroke="url(#logoRing)" strokeWidth="2.5" fill="white" />
        <path
          d="M20 9 C26 9 31 14 31 20 C31 26 26 31 20 31 C20 31 13 27 13 20 C13 13 20 9 20 9Z"
          fill="url(#logoLeaf)"
        />
        <path d="M20 9 L20 31" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        <path
          d="M20 20 C23 16 28 15 31 17"
          stroke="white"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <linearGradient
            id="logoRing"
            x1="0"
            y1="0"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#1B3A6B" />
            <stop offset="1" stopColor="#00B894" />
          </linearGradient>
          <linearGradient
            id="logoLeaf"
            x1="13"
            y1="9"
            x2="31"
            y2="31"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#00B894" />
            <stop offset="1" stopColor="#00967a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    <div className="leading-tight font-sans">
      <div className="text-[17px] font-bold text-[#0B39B5] tracking-tight leading-none">
        Al-Hilal
      </div>
      <div className="text-[10px] font-semibold text-[#01C9A4] tracking-widest uppercase mt-0.5">
        Shariah Advisors
      </div>
    </div>
  </div>
)

// ── Mock notifications ────────────────────────────────────────────────────────
const NOTIFICATIONS = [
  {
    id: 1,
    title: 'Request Approved',
    body: 'Your request has been processed.',
    time: '10 minutes ago',
    read: false,
  },
  {
    id: 2,
    title: 'Request Approved',
    body: 'Your request has been processed.',
    time: '15 minutes ago',
    read: false,
  },
  {
    id: 3,
    title: 'Request Approved',
    body: 'Your request has been processed.',
    time: '18 minutes ago',
    read: false,
  },
  {
    id: 4,
    title: 'Request Approved',
    body: 'Your request has been processed.',
    time: '18 minutes ago',
    read: true,
  },
  {
    id: 5,
    title: 'Request Approved',
    body: 'Your request has been processed.',
    time: '18 minutes ago',
    read: true,
  },
  {
    id: 6,
    title: 'Data Submitted',
    body: 'Financial data sent for approval.',
    time: '1 hour ago',
    read: true,
  },
  {
    id: 7,
    title: 'Report Generated',
    body: 'Quarterly summary is ready.',
    time: '2 hours ago',
    read: true,
  },
]

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
      <p
        className={`text-[13px] leading-snug ${notif.read ? 'font-medium text-[#041E66]' : 'font-semibold text-[#0B39B5]'}`}
      >
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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const userRef = useRef(null)
  const bellRef = useRef(null)

  useClickOutside(userRef, () => setShowUserMenu(false))
  useClickOutside(bellRef, () => setShowNotifPanel(false))

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  // Read user from sessionStorage
  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('user_profile_data')) || {}
    } catch {
      return {}
    }
  })()
  const fullName = user.fullName || 'James Smith'

  const handleLogout = () => {
    sessionStorage.clear()
    navigate('/login')
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white
                 flex items-center justify-between px-5 font-sans"
      style={{ height: '56px' }}
    >
      {/* ── Logo ── */}
      <AlHilalLogo />

      {/* ── Right actions ── */}
      <div className="flex items-center gap-3">
        {/* ── Bell + Notification panel ── */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => {
              setShowNotifPanel((p) => !p)
              setShowUserMenu(false)
            }}
            className="relative w-9 h-9 flex items-center justify-center rounded-full
                       hover:bg-[#EFF3FF] transition-colors duration-150"
          >
            <Bell size={20} className="text-[#0B39B5]" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-[16px] px-[3px]
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
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-[13px] text-[#a0aec0]">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => <NotifItem key={n.id} notif={n} />)
                )}
              </div>

              {/* Panel footer */}
              <div className="px-4 py-2.5 border-t border-[#eef2f7] text-center">
                <button className="text-[12px] font-semibold text-[#0B39B5] hover:underline">
                  View all notifications
                </button>
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
                  navigate('/scs/change-password')
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] font-medium text-[#041E66] hover:bg-[#EFF3FF]
                           transition-colors duration-100"
              >
                <Lock size={15} className="text-[#7b8db0]" />
                Change Password
              </button>
              <div className="h-px bg-[#eef2f7] mx-3 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] font-medium text-[#041E66] hover:bg-red-50 hover:text-[#E74C3C]
                           transition-colors duration-100"
              >
                <LogOut size={15} className="text-[#7b8db0]" />
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
