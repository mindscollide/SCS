/**
 * Topbar.jsx
 * ===========
 * Fixed top navbar — white background, full width, 56px height.
 *
 * Design rules (from PSD):
 *  LEFT  → Al-Hilal logo: circle green icon (leaf SVG) +
 *           "Al-Hilal" navy bold + "Shariah Advisors" teal small
 *  RIGHT → Bell icon (outline navy) → green notification toast pops top-right
 *          User pill (white rounded bg, avatar circle photo + name text) →
 *          small dropdown: Change Password (lock icon) | Logout (arrow icon)
 *
 * Notification style (from PSD image 02):
 *   Big green card that pops top-right — document+pen icon, white text
 *   "You have received a new Signup request"
 *   This is a toast/popup, NOT a list dropdown.
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Lock, LogOut, X } from "lucide-react";

// ── useClickOutside hook ──────────────────────────────
const useClickOutside = (ref, cb) => {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) cb();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
};

// ── Al-Hilal Logo SVG (circle leaf icon + text) ───────
const AlHilalLogo = () => (
  <div className="flex items-center gap-2 select-none">
    {/* Circle icon */}
    <div className="relative w-[38px] h-[38px] shrink-0">
      {/* Outer ring — teal gradient */}
      <svg viewBox="0 0 38 38" fill="none" className="w-full h-full">
        <circle
          cx="19"
          cy="19"
          r="18"
          stroke="url(#ring)"
          strokeWidth="2.5"
          fill="white"
        />
        {/* Leaf shape */}
        <path
          d="M19 8 C25 8 30 13 30 19 C30 25 25 30 19 30 C19 30 12 26 12 19 C12 12 19 8 19 8Z"
          fill="url(#leaf)"
        />
        <path
          d="M19 8 L19 30"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M19 19 C22 15 27 14 30 16"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <linearGradient
            id="ring"
            x1="0"
            y1="0"
            x2="38"
            y2="38"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#1B3A6B" />
            <stop offset="1" stopColor="#00B894" />
          </linearGradient>
          <linearGradient
            id="leaf"
            x1="12"
            y1="8"
            x2="30"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#00B894" />
            <stop offset="1" stopColor="#00967a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    {/* Text */}
    <div className="leading-tight">
      <div className="text-[17px] font-bold text-navy tracking-tight">
        Al-Hilal
      </div>
      <div className="text-[10px] font-medium text-teal tracking-wide">
        Shariah Advisors
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────────────
const Topbar = () => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifToast, setShowNotifToast] = useState(false);

  const userRef = useRef(null);
  const bellRef = useRef(null);

  useClickOutside(userRef, () => setShowUserMenu(false));
  useClickOutside(bellRef, () => setShowNotifToast(false));

  // Read user from sessionStorage
  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user_profile_data")) || {};
    } catch {
      return {};
    }
  })();
  const fullName = user.fullName || "James Smith";

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#FFFFFF]
           flex items-center justify-between px-5"
      style={{ height: "56px" }}
    >
      {/* ── Logo ── */}
      <AlHilalLogo />

      {/* ── Right actions ── */}
      <div className="flex items-center gap-3">
        {/* Bell icon + notification toast */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => {
              setShowNotifToast((p) => !p);
              setShowUserMenu(false);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full
                       hover:bg-page-bg transition-colors duration-150"
          >
            <Bell size={20} className="text-navy" strokeWidth={1.8} />
          </button>

          {/* Green notification toast (matches PSD image exactly) */}
          {showNotifToast && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 w-[280px]
                         bg-teal rounded-xl shadow-notif z-50 animate-slide-down
                         p-4 flex items-start gap-3"
            >
              {/* Document icon */}
              <div
                className="w-10 h-10 shrink-0 flex items-center justify-center
                              bg-white/20 rounded-lg"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                  className="w-6 h-6"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-4M10 16h4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white text-[13px] font-semibold leading-snug">
                  You have received a new Signup request
                </p>
              </div>
              <button
                onClick={() => setShowNotifToast(false)}
                className="text-white/70 hover:text-white shrink-0 mt-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* User pill + dropdown */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => {
              setShowUserMenu((p) => !p);
              setShowNotifToast(false);
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5
                       bg-[#F0F4F8] hover:bg-[#e4eaf2] border border-[#d8e0ea]
                       rounded-full transition-colors duration-150"
          >
            {/* Avatar circle */}
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-br from-navy to-teal
                            flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            >
              {fullName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] font-medium text-navy">
              {fullName}
            </span>
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 w-[190px]
                         bg-white border border-[#e8edf4] rounded-xl shadow-modal
                         z-50 animate-slide-down py-1.5"
            >
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate("/scs/change-password");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] text-navy hover:bg-page-bg
                           transition-colors duration-100 font-['Inter']"
              >
                <Lock size={15} className="text-navy/60" />
                Change Password
              </button>
              <div className="h-px bg-[#eef2f7] mx-3 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5
                           text-[13px] text-navy hover:bg-red-50 hover:text-danger
                           transition-colors duration-100 font-['Inter']"
              >
                <LogOut size={15} className="text-navy/60" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
