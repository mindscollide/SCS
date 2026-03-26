/**
 * LoginPage.jsx
 * Remember Me: saves credentials to localStorage, auto-fills on next visit.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Eye, EyeOff } from "lucide-react";
import Input from "../../components/common/Input/Input";

const DEMO_USERS = {
  "admin@scs.com": {
    role: "admin",
    fullName: "James Smith",
    email: "admin@scs.com",
  },
  "manager@scs.com": {
    role: "manager",
    fullName: "Sara Ahmed",
    email: "manager@scs.com",
  },
  "data@scs.com": {
    role: "data-entry",
    fullName: "Bilal Khan",
    email: "data@scs.com",
  },
};
const DEMO_PWD = "Admin@123";
const ROLE_PATH = {
  admin: "/scs/admin/users",
  manager: "/scs/manager/pending-approvals",
  "data-entry": "/scs/data-entry/financial-data",
};

// Key used to store/read credentials in localStorage
const STORAGE_KEY = "scs_remember";

/* ── Al-Hilal Logo ───────────────────────────────────── */
const AlHilalLogo = () => (
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
          stroke="url(#logoRing)"
          strokeWidth="4"
          fill="white"
        />
        <path
          d="M45 18 C58 18 68 30 68 44 C68 56 60 66 48 68 C40 69 32 65 28 58
             C24 51 24 42 28 35 C33 26 39 18 45 18Z"
          fill="url(#logoLeaf)"
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
            id="logoRing"
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
            id="logoLeaf"
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

/* ── Login Page ──────────────────────────────────────── */
const LoginPage = () => {
  const navigate = useNavigate();

  // On first render, read any saved credentials from localStorage
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  })();

  // Pre-fill fields if credentials were saved previously
  const [userId, setUserId] = useState(saved.userId || "");
  const [pwd, setPwd] = useState(saved.pwd || "");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(!!saved.userId); // check the box if already saved
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    if (!userId || !pwd) {
      setError("Please enter User ID and Password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const user = DEMO_USERS[userId.toLowerCase()];
      if (user && pwd === DEMO_PWD) {
        // Save or clear credentials depending on Remember Me checkbox
        if (remember) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, pwd }));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
        sessionStorage.setItem("auth_token", "mock_" + Date.now());
        sessionStorage.setItem("user_profile_data", JSON.stringify(user));
        sessionStorage.setItem("user_role", user.role);
        navigate(ROLE_PATH[user.role]);
      } else {
        setError("Invalid User ID or Password.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen font-sans">
      {/* LEFT — gradient + decorative elements */}
      <div
        className="relative hidden lg:flex w-[65%] flex-col justify-center px-16 overflow-hidden
                      bg-[linear-gradient(135deg,#1a3ab5_0%,#1565c0_35%,#0097a7_70%,#00bfa5_100%)]"
      >
        <div className="absolute rounded-full border border-white/10 pointer-events-none w-[320px] h-[320px] -bottom-40 -left-40" />
        <div className="absolute rounded-full border border-white/10 pointer-events-none w-[240px] h-[240px] -bottom-[120px] -left-[120px]" />
        <div className="absolute rounded-full border border-white/10 pointer-events-none w-[160px] h-[160px] -bottom-20 -left-20" />
        <div className="absolute rounded-full border border-white/10 pointer-events-none w-[80px] h-[80px] -bottom-10 -left-10" />
        <div className="absolute rounded-full border border-white/[0.08] pointer-events-none w-[500px] h-[500px] -top-[167px] -right-[167px]" />
        <div className="absolute rounded-full border border-white/[0.08] pointer-events-none w-[380px] h-[380px] -top-[127px] -right-[127px]" />
        <div className="absolute rounded-full border border-white/[0.08] pointer-events-none w-[260px] h-[260px] -top-[87px] -right-[87px]" />
        <div className="absolute top-[5%] right-[3%] w-[300px] h-[300px] opacity-10 pointer-events-none">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <path
              d="M100 10 C140 10 175 45 175 90 C175 130 150 165 110 175 C80 182 48 168 32 143 C16 118 16 85 32 62 C52 33 68 10 100 10Z"
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
        <div className="absolute w-7 h-7 bottom-[28%] left-[7%] border-2 border-white/20 rounded-full pointer-events-none" />
        <svg
          className="absolute bottom-[15%] left-[5%] w-[200px] h-[200px] opacity-20 pointer-events-none"
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
        <div className="relative z-10 max-w-lg">
          <h1 className="text-white font-extrabold leading-tight mb-6 text-[3.2rem] tracking-[-0.5px]">
            Shariah Compliance
            <br />
            Solution
          </h1>
          <p className="text-white/80 text-[15px] leading-relaxed">
            Welcome to Sharia Compliance Solution, a robust framework for
            managing &amp; performing Sharia Screening / Compliance &amp; Sharia
            Advisory
          </p>
        </div>
      </div>

      {/* RIGHT — login form */}
      <div className="flex-1 lg:w-[35%] flex flex-col justify-between bg-[#f0f4f8]">
        <div className="flex-1 flex flex-col items-center justify-center px-10 py-10">
          <div className="w-full max-w-[320px]">
            <AlHilalLogo />
            <form onSubmit={handleLogin} className="w-full space-y-3">
              {/* Error */}
              {error && (
                <p className="text-[12px] font-medium text-[#E74C3C]">
                  {error}
                </p>
              )}

              {/* User ID */}
              <Input
                type="text"
                value={userId}
                onChange={(v) => {
                  setUserId(v);
                  setError("");
                }}
                placeholder="User ID"
                error={!!error}
                rightIcon={<User size={17} />}
                bgColor="#ffffff"
                borderColor={error ? "#E74C3C" : "#dde4ee"}
                focusBorderColor="#00B894"
                textColor="#1B3A6B"
              />

              {/* Password */}
              <Input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(v) => {
                  setPwd(v);
                  setError("");
                }}
                placeholder="Password"
                error={!!error}
                rightIcon={showPwd ? <Eye size={17} /> : <EyeOff size={17} />}
                onRightIconClick={() => setShowPwd((p) => !p)}
                bgColor="#ffffff"
                borderColor={error ? "#E74C3C" : "#dde4ee"}
                focusBorderColor="#00B894"
                textColor="#1B3A6B"
              />

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 border border-[#c8d4e0] rounded accent-[#00B894]"
                />
                <span className="text-[13px] text-[#4a5568]">Remember me</span>
              </label>

              {/* Login + Signup */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-[10px] rounded-[10px] text-[14px] font-semibold
                             text-white bg-[#1B3A6B] hover:bg-[#132e57]
                             disabled:opacity-60 transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Login"
                  )}
                </button>
                <Link to="/signup" className="flex-1">
                  <button
                    type="button"
                    className="w-full py-[10px] rounded-[10px] text-[14px] font-semibold
                               text-white bg-[#00B894] hover:bg-[#00a07e] transition-colors"
                  >
                    Signup
                  </button>
                </Link>
              </div>

              {/* Forgot Password */}
              <div className="text-center pt-2">
                <Link
                  to="/forgot-password"
                  className="text-[13px] font-semibold text-[#E67E22] hover:underline"
                >
                  Forgot Password
                </Link>
              </div>
            </form>
          </div>
        </div>
        <p className="text-center text-[12px] text-[#a0aec0] py-4">
          © Copyright 2025. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
