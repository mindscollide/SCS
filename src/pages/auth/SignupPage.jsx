/**
 * pages/auth/SignupPage.jsx
 * ==========================
 * Pixel-matched to the provided design screens.
 *
 * Layout: Left gradient panel | Right white/grey form panel
 *
 * Left panel  → Dark blue-to-teal gradient, radar rings, bold heading + subtitle
 * Right panel → Al-Hilal logo, 6 fields, Back (amber) + Proceed (grey-blue) buttons
 *
 * States:
 *  1. Default        — empty form, Proceed greyed out visually
 *  2. Error          — red border + inline error text per invalid field
 *  3. Dropdown open  — custom role dropdown shows Data Entry / Manager
 *  4. Success        — teal badge checkmark + "Sign-up Request Submitted" + Login btn
 *
 * Mobile field: Pakistan flag 🇵🇰 | +92 | number input (digits only, 10 chars)
 * Role field:   Custom dropdown (not native <select>) — Data Entry default
 */

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Globe, Mail } from "lucide-react";
import Select from "../../components/common/select/Select";
import Input from "../../components/common/Input/Input";
import PhoneInput from "../../components/common/phoneInput/PhoneInput";

const ROLE_OPTIONS = ["Data Entry", "Manager"];

/* ─── Al-Hilal Logo ──────────────────────────────────────────────────────── */
const AlHilalLogo = () => (
  <div className="flex flex-col items-center mb-4">
    <div
      className="w-[88px] h-[88px] rounded-full border-[3px] border-[#1565c0]
                    flex items-center justify-center bg-white relative overflow-hidden"
    >
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#00897b]/10 rounded-b-full" />
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
        <path
          d="M23 7 C23 7 37 14 37 27 C37 35 30.6 40 23 40 C15.4 40 9 35 9 27 C9 14 23 7 23 7Z"
          fill="#00897b"
        />
        <path
          d="M23 12 C23 12 21 23 23 32"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M23 19 C23 19 27 17 30 21"
          stroke="white"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M23 25 C23 25 19 23 16 27"
          stroke="white"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
    <p className="text-[23px] font-extrabold text-[#1565c0] tracking-wide mt-2 leading-none">
      Al-Hilal
    </p>
    <p className="text-[11px] font-semibold text-[#00897b] tracking-[3px] uppercase mt-0.5">
      Shariah Advisors
    </p>
  </div>
);

/* ─── Left gradient panel ─────────────────────────────────────────────────── */
const LeftPanel = () => (
  <div
    className="hidden lg:flex flex-1 relative overflow-hidden flex-col justify-end pb-20 px-14"
    style={{
      background:
        "linear-gradient(150deg, #1a237e 0%, #1565c0 40%, #00897b 100%)",
    }}
  >
    {/* Radar rings — top right */}
    <div className="absolute top-[-100px] right-[-100px] opacity-[0.15]">
      {[360, 280, 200, 130, 70].map((size, i) => (
        <div
          key={i}
          className="absolute border border-white rounded-full"
          style={{
            width: size,
            height: size,
            top: 100 - size / 2,
            right: 100 - size / 2,
          }}
        />
      ))}
    </div>

    {/* Diagonal decorative lines */}
    <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
      <line x1="40%" y1="0%" x2="0%" y2="70%" stroke="white" strokeWidth="1" />
      <line
        x1="60%"
        y1="0%"
        x2="10%"
        y2="80%"
        stroke="white"
        strokeWidth="0.5"
      />
    </svg>

    {/* Small circles */}
    <div className="absolute top-[47%] left-[7%] w-7 h-7 border-[2px] border-purple-300/50 rounded-full" />
    <div className="absolute bottom-[28%] left-[5%] w-4 h-4 border-[2px] border-purple-300/40 rounded-full" />

    {/* Watermark leaf circle — right side */}
    <div className="absolute right-[-60px] top-[15%] w-[380px] h-[380px] border border-white/10 rounded-full" />
    <div className="absolute right-[-20px] top-[22%] w-[260px] h-[260px] opacity-[0.08]">
      <div className="w-full h-full rounded-full bg-white" />
    </div>

    {/* Text */}
    <div className="relative z-10">
      <h1
        className="text-white font-extrabold leading-[1.1] mb-5"
        style={{ fontSize: "clamp(36px, 4vw, 54px)" }}
      >
        Shariah Compliance
        <br />
        Solution
      </h1>
      <p className="text-white/80 text-[15px] leading-relaxed max-w-[480px]">
        Welcome to Shariah Compliance Solution, a robust framework for managing
        &amp; performing Shariah Screening / Compliance &amp; Shariah Advisory
      </p>
    </div>
  </div>
);

/* ─── Success Screen ──────────────────────────────────────────────────────── */
const SuccessScreen = () => (
  <div className="flex min-h-screen">
    <LeftPanel />
    <div
      className="w-full lg:w-[440px] bg-[#f0f2f5] flex flex-col items-center
                    justify-between px-10 py-10"
    >
      <AlHilalLogo />

      <div className="flex flex-col items-center text-center">
        {/* Teal badge checkmark */}
        <div className="w-[100px] h-[100px] mb-6">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="#00897b"
              strokeWidth="4"
              fill="none"
            />
            <circle cx="50" cy="50" r="38" fill="#00897b" />
            <polyline
              points="28,52 43,67 72,34"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-slate-800 mb-3">
          Sign-up Request Submitted
        </h2>
        <p className="text-[13px] text-slate-500 leading-relaxed max-w-[290px]">
          Your application is now under review. You will receive an email
          notification when your application is reviewed.
        </p>
      </div>

      <div className="w-full">
        <Link to="/login">
          <button
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px]
                       hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #1565c0, #00897b)" }}
          >
            Login
          </button>
        </Link>
        <p className="text-center text-[11px] text-slate-400 mt-5">
          © Copyright 2025. All Rights Reserved.
        </p>
      </div>
    </div>
  </div>
);

/* ─── Main Signup Page ────────────────────────────────────────────────────── */
const SignupPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    org: "",
    email: "",
    mobile: "",
    role: "Data Entry",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First Name is required";
    if (!form.lastName.trim()) e.lastName = "Last Name is required";
    if (!form.org.trim()) e.org = "Organization is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Invalid Email";
    if (!form.mobile.trim()) e.mobile = "Mobile number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  if (submitted) return <SuccessScreen />;

  return (
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* ── Right panel ── */}
      <div
        className="w-full lg:w-[440px] bg-[#f0f2f5] flex flex-col items-center
                      justify-between px-10 py-8 min-h-screen"
      >
        {/* Logo */}
        <AlHilalLogo />

        {/* Fields */}
        <div className="w-full space-y-3">
          {/* First Name */}
          <Input
            value={form.firstName}
            onChange={(v) => set("firstName", v)}
            placeholder="First Name *"
            maxLength={50}
            regex={/^[a-zA-Z\s]*$/}
            error={!!errors.firstName}
            errorMessage={errors.firstName}
            rightIcon={<User size={17} />}
            bgColor="#ffffff"
            borderColor={errors.firstName ? "#ef4444" : "#e2e8f0"}
            textColor="#334155"
          />

          {/* Last Name */}
          <Input
            value={form.lastName}
            onChange={(v) => set("lastName", v)}
            placeholder="Last Name *"
            maxLength={50}
            regex={/^[a-zA-Z\s]*$/}
            error={!!errors.lastName}
            errorMessage={errors.lastName}
            rightIcon={<User size={17} />}
            bgColor="#ffffff"
            borderColor={errors.lastName ? "#ef4444" : "#e2e8f0"}
            textColor="#334155"
          />

          {/* Organization Name */}
          <Input
            value={form.org}
            onChange={(v) => set("org", v)}
            placeholder="Organization Name *"
            maxLength={100}
            error={!!errors.org}
            errorMessage={errors.org}
            rightIcon={<Globe size={17} />}
            bgColor="#ffffff"
            borderColor={errors.org ? "#ef4444" : "#e2e8f0"}
            textColor="#334155"
          />

          {/* Email */}
          <Input
            type="email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="Email Address *"
            maxLength={100}
            regex={/^[^\s]*$/}
            error={!!errors.email}
            errorMessage={errors.email}
            rightIcon={<Mail size={17} />}
            bgColor="#ffffff"
            borderColor={errors.email ? "#ef4444" : "#e2e8f0"}
            textColor="#334155"
          />

          {/* Mobile — Pakistan flag prefix + number input */}
          <PhoneInput
            value={form.mobile}
            onChange={(v) => set("mobile", v)}
            placeholder="Mobile Number *"
            maxLength={10}
            error={!!errors.mobile}
            errorMessage={errors.mobile}
          />

          {/* Role — reusable Select component */}
          <Select
            value={form.role}
            onChange={(v) => set("role", v)}
            options={ROLE_OPTIONS}
            bgColor="#ffffff"
            borderColor="#e2e8f0"
            focusBorderColor="#1565c0"
            textColor="#334155"
          />
        </div>

        {/* Action buttons + footer */}
        <div className="w-full">
          <div className="flex gap-3 mb-5">
            {/* Back — amber */}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex-1 py-3.5 rounded-xl text-white font-bold text-[15px]
                         hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#F5A623" }}
            >
              Back
            </button>

            {/* Proceed — grey-blue (design shows muted colour always) */}
            <button
              type="button"
              onClick={() => {
                if (validate()) setSubmitted(true);
              }}
              className="flex-1 py-3.5 rounded-xl text-white font-bold text-[15px]
                         hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#8B9DC3" }}
            >
              Proceed
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            © Copyright 2025. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
