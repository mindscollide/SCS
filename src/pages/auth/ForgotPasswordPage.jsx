/**
 * ForgotPasswordPage.jsx
 * Design: Same left panel as Login. Right panel:
 *  - Al-Hilal logo (top center)
 *  - Bold heading "Enter your email address to reset password" (2 lines, centered)
 *  - Single email input (placeholder "Enter Email Address", envelope icon right)
 *  - "Reset Password" button — slate/disabled when empty, navy when filled
 *  - Footer
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

/* ── Reusable left panel (identical across all auth pages) ── */
export const AuthLeftPanel = () => (
  <div
    className="relative hidden lg:flex w-[65%] flex-col justify-center px-16 overflow-hidden
                  bg-[linear-gradient(135deg,#1a3ab5_0%,#1565c0_35%,#0097a7_70%,#00bfa5_100%)]"
  >
    {/* Concentric arcs — bottom-left */}
    <div
      className="absolute rounded-full border border-white/10 pointer-events-none
                    w-[320px] h-[320px] -bottom-40 -left-40"
    />
    <div
      className="absolute rounded-full border border-white/10 pointer-events-none
                    w-[240px] h-[240px] -bottom-[120px] -left-[120px]"
    />
    <div
      className="absolute rounded-full border border-white/10 pointer-events-none
                    w-[160px] h-[160px] -bottom-20 -left-20"
    />
    <div
      className="absolute rounded-full border border-white/10 pointer-events-none
                    w-[80px] h-[80px] -bottom-10 -left-10"
    />

    {/* Concentric arcs — top-right */}
    <div
      className="absolute rounded-full border border-white/[0.08] pointer-events-none
                    w-[500px] h-[500px] -top-[167px] -right-[167px]"
    />
    <div
      className="absolute rounded-full border border-white/[0.08] pointer-events-none
                    w-[380px] h-[380px] -top-[127px] -right-[127px]"
    />
    <div
      className="absolute rounded-full border border-white/[0.08] pointer-events-none
                    w-[260px] h-[260px] -top-[87px] -right-[87px]"
    />

    {/* Ghost leaf watermark */}
    <div
      className="absolute top-[5%] right-[3%] w-[300px] h-[300px]
                    opacity-10 pointer-events-none"
    >
      <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
        <path
          d="M100 10 C140 10 175 45 175 90 C175 130 150 165 110 175
             C80 182 48 168 32 143 C16 118 16 85 32 62 C52 33 68 10 100 10Z"
          stroke="white"
          strokeWidth="3"
          fill="none"
        />
        <line
          x1="100"
          y1="10"
          x2="100"
          y2="180"
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M100 90 C115 70 145 65 162 78"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>

    {/* Small hollow circle */}
    <div
      className="absolute w-7 h-7 bottom-[28%] left-[7%]
                    border-2 border-white/20 rounded-full pointer-events-none"
    />

    {/* Diagonal line */}
    <svg
      className="absolute bottom-[15%] left-[5%] w-[200px] h-[200px]
                    opacity-20 pointer-events-none"
      viewBox="0 0 200 200"
    >
      <line
        x1="0"
        y1="200"
        x2="200"
        y2="50"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>

    {/* Text */}
    <div className="relative z-10 max-w-lg">
      <h1
        className="text-white font-extrabold leading-tight mb-6
                     text-[3.2rem] tracking-[-0.5px]"
      >
        Shariah Compliance
        <br />
        Solution
      </h1>
      <p className="text-white/80 text-[15px] leading-relaxed">
        Welcome to Sharia Compliance Solution, a robust framework for managing
        &amp; performing Sharia Screening / Compliance &amp; Sharia Advisory
      </p>
    </div>
  </div>
);

/* ── Al-Hilal Logo (reusable) ─────────────────────── */
export const AlHilalLogo = () => (
  <div className="flex flex-col items-center mb-8 select-none">
    <div className="w-[90px] h-[90px] mb-3">
      <svg
        viewBox="0 0 90 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle
          cx="45"
          cy="45"
          r="42"
          stroke="url(#fpRing)"
          strokeWidth="4"
          fill="white"
        />
        <path
          d="M45 18 C58 18 68 30 68 44 C68 56 60 66 48 68 C40 69 32 65 28 58
             C24 51 24 42 28 35 C33 26 39 18 45 18Z"
          fill="url(#fpLeaf)"
        />
        <path
          d="M45 18 L45 70"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M45 44 C50 38 59 36 64 40"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <defs>
          <linearGradient
            id="fpRing"
            x1="0"
            y1="0"
            x2="90"
            y2="90"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#1B3A6B" />
            <stop offset="100%" stopColor="#00B894" />
          </linearGradient>
          <linearGradient
            id="fpLeaf"
            x1="28"
            y1="18"
            x2="68"
            y2="70"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#00B894" />
            <stop offset="100%" stopColor="#007a60" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    <div className="text-[28px] font-extrabold text-[#1B3A6B] leading-none tracking-tight">
      Al-Hilal
    </div>
    <div className="text-[13px] font-semibold text-[#00B894] tracking-widest mt-0.5 uppercase">
      Shariah Advisors
    </div>
  </div>
);

/* ── Page ─────────────────────────────────────────── */
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (sent)
    return (
      <div className="flex min-h-screen font-sans">
        <AuthLeftPanel />
        <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
          <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
            <div className="w-full max-w-[320px] text-center">
              {/* Logo */}
              <AlHilalLogo />

              {/* Open envelope + checkmark icon (navy outlined, matches PSD) */}
              <div className="flex justify-center mb-5">
                <svg
                  width="80"
                  height="70"
                  viewBox="0 0 80 70"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Envelope body */}
                  <rect
                    x="4"
                    y="20"
                    width="72"
                    height="46"
                    rx="4"
                    stroke="#1B3A6B"
                    strokeWidth="3.5"
                    fill="white"
                  />
                  {/* Envelope flap (open — two angled lines from top corners to center-top) */}
                  <path
                    d="M4 20 L40 2 L76 20"
                    stroke="#1B3A6B"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Bottom-left diagonal fold line */}
                  <line
                    x1="4"
                    y1="66"
                    x2="30"
                    y2="42"
                    stroke="#1B3A6B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Bottom-right diagonal fold line */}
                  <line
                    x1="76"
                    y1="66"
                    x2="50"
                    y2="42"
                    stroke="#1B3A6B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Teal checkmark circle */}
                  <circle
                    cx="55"
                    cy="22"
                    r="14"
                    fill="white"
                    stroke="#00B894"
                    strokeWidth="3"
                  />
                  <path
                    d="M48 22 L53 27 L63 17"
                    stroke="#00B894"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-[20px] font-bold text-[#1B3A6B] mb-3">
                Check your Email
              </h2>

              {/* Body */}
              <p className="text-[14px] text-[#4a5568] leading-relaxed">
                You're almost there! We sent an email to
              </p>
              <p className="text-[14px] font-medium text-[#1B5FC1] mt-1">
                {email}
              </p>
            </div>
          </div>
          <p className="text-center text-[12px] text-[#a0aec0] py-4">
            © Copyright 2025. All Rights Reserved.
          </p>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-screen font-sans">
      <AuthLeftPanel />

      {/* RIGHT PANEL */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px]">
            {/* Logo */}
            <AlHilalLogo />

            {/* Heading — bold, centered, 2 lines */}
            <h2
              className="text-[18px] font-bold text-[#1B3A6B] text-center
                           leading-snug mb-6"
            >
              Enter your email address to
              <br />
              reset password
            </h2>

            {/* Email input */}
            <div
              className="flex items-center bg-white rounded-[10px] px-4 py-[11px]
                            border border-[#dde4ee] mb-5
                            focus-within:border-[#00B894]
                            focus-within:shadow-[0_0_0_3px_rgba(0,184,148,0.12)]
                            transition-all"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email Address"
                className="flex-1 bg-transparent border-none outline-none
                           text-[13px] text-[#1B3A6B] placeholder:text-[#a0aec0]"
              />
              <Mail size={17} className="text-[#a0aec0] shrink-0" />
            </div>

            {/* Reset Password button
                — slate/muted when email empty (matches PSD disabled look)
                — navy when valid email entered */}
            <button
              onClick={() => {
                if (isValid) setSent(true);
              }}
              className={`w-full py-[10px] rounded-[10px] text-[14px] font-semibold
                          text-white transition-colors
                          ${
                            isValid
                              ? "bg-[#1B3A6B] hover:bg-[#132e57] cursor-pointer"
                              : "bg-[#8fa3c0] cursor-not-allowed"
                          }`}
            >
              Reset Password
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[12px] text-[#a0aec0] py-4">
          © Copyright 2025. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
