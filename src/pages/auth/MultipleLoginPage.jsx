/**
 * MultipleLoginPage.jsx
 * ======================
 * Shown when backend detects the user is already logged in
 * from another browser/device (single-session enforcement).
 *
 * Design (PSD 14):
 *  - Full white page, no sidebar/topbar
 *  - Al-Hilal logo top-left
 *  - Center: yellow warning triangle + blue magnifier SVG illustration
 *  - Navy bold title "Multiple Logins Detected"
 *  - Body text explaining the situation
 *  - "here" = blue underline link → /login
 *  - Timestamp grey, centered bottom
 */
import React from 'react'
import { Link } from 'react-router-dom'

const MultipleLoginPage = () => (
  <div className="min-h-screen bg-white flex flex-col font-['Inter']">
    {/* Logo top-left */}
    <div className="p-5 flex items-center gap-2">
      <div className="w-9 h-9 rounded-full border-2 border-teal flex items-center
                      justify-center text-teal font-bold text-sm">H</div>
      <div>
        <div className="text-[15px] font-bold text-navy leading-tight">Al-Hilal</div>
        <div className="text-[10px] text-teal">Shariah Advisors</div>
      </div>
    </div>

    {/* Center content */}
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      {/* Illustration */}
      <div className="relative w-36 h-36 mb-6">
        {/* Yellow triangle */}
        <svg viewBox="0 0 140 130" className="w-full h-full">
          <polygon points="70,10 130,120 10,120"
            fill="none" stroke="#F5A623" strokeWidth="6" strokeLinejoin="round"/>
          <text x="70" y="105" textAnchor="middle"
            fontSize="52" fontWeight="bold" fill="#1B3A6B">!</text>
          {/* Blue magnifier */}
          <circle cx="105" cy="100" r="20" fill="none" stroke="#1B5FC1" strokeWidth="5"/>
          <line x1="119" y1="114" x2="132" y2="127"
            stroke="#1B5FC1" strokeWidth="5" strokeLinecap="round"/>
        </svg>
      </div>

      <h1 className="text-[22px] font-bold text-navy mb-4">
        Multiple Logins Detected
      </h1>
      <p className="text-[14px] text-gray-600 max-w-md leading-relaxed mb-2">
        You have logged in at another browser or device. Multiple logins at{' '}
        <strong className="text-navy">SCS</strong> portal are not allowed.
      </p>
      <p className="text-[14px] text-gray-600">
        You have been logged out. Please click{' '}
        <Link to="/login" className="text-blue font-medium underline">here</Link>
        {' '}to login again.
      </p>
      <p className="text-[12px] text-gray-400 mt-6">
        {new Date().toLocaleString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  </div>
)

export default MultipleLoginPage
