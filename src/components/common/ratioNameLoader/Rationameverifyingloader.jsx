/**
 * src/components/common/RatioNameVerifyingLoader/RatioNameVerifyingLoader.jsx
 * ============================================================================
 * Inline "verifying uniqueness" indicator for the Financial Ratio Name field.
 *
 * Usage in ManageFinancialRatioPage — replace the old nameRightIcon spinner:
 *
 *   import RatioNameVerifyingLoader from '../../components/common/RatioNameVerifyingLoader/RatioNameVerifyingLoader'
 *
 *   {nameStatus === 'checking' && <RatioNameVerifyingLoader />}
 *
 * The component renders a green pill anchored below/beside the Name input.
 * It contains three bouncing dots on the left and the verification message on the right.
 * No external dependencies beyond React and Tailwind (same stack as the page).
 */

import React from 'react'

// ── Bounce-dot sub-component ──────────────────────────────────────────────────
// Pure CSS animation defined inline so the component is self-contained and
// doesn't require any changes to tailwind.config.js.
const Dot = ({ delay }) => (
  <span
    style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      //   borderRadius: '50%',
      backgroundColor: '#ffffff',
      animation: 'ratioVerifyBounce 1s ease-in-out infinite',
      animationDelay: delay,
    }}
  />
)

// ── Main component ────────────────────────────────────────────────────────────
const RatioNameVerifyingLoader = ({
  message = 'System is verifying that the ratio name is unique',
}) => (
  <>
    {/* Keyframe injection — rendered once, ignored by the DOM on repeat mounts */}
    <style>{`
      @keyframes ratioVerifyBounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.7; }
        40%            { transform: translateY(-5px); opacity: 1; }
      }
    `}</style>

    {/*
      Pill container
      ─────────────
      • Absolute positioning so it overlays without shifting surrounding layout.
        The parent Input wrapper already uses position: relative in most
        design-system implementations; if it doesn't, wrap the Input + this
        component in a `relative` div.
      • z-50 keeps it above other form fields.
      • top-full + mt-1 places it just below the input's bottom edge.
      • left-0 anchors it to the input's left edge (mirrors screenshot).
      • max-w-[340px] keeps the text on one line for typical messages.
    */}
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      style={{
        position: 'absolute',
        top: '100%',
        left: 150,
        marginTop: 13,
        zIndex: 50,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#2cbd40', // green-500 — matches screenshot
        borderRadius: 10,
        padding: 15,
        paddingLeft: 20,
        paddingRight: 20,
        boxShadow: '0 4px 12px rgba(34,197,94,0.35)',
        maxWidth: 360,
        whiteSpace: 'nowrap',
        opacity: 0.95,
      }}
    >
      <div>
        {/* Three bouncing dots */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: 10,
            flexShrink: 0,
          }}
        >
          <Dot delay="0s" />
          <Dot delay="0.18s" />
          <Dot delay="0.36s" />
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: '#ffffff',
            letterSpacing: '0.01em',
            lineHeight: 1.3,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  </>
)

export default RatioNameVerifyingLoader

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO WIRE IT INTO ManageFinancialRatioPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Import the component:
//
//      import RatioNameVerifyingLoader from '../../components/common/RatioNameVerifyingLoader/RatioNameVerifyingLoader'
//
// 2. Replace the nameRightIcon IIFE with a simpler version (the dot spinner in
//    the right-icon slot is no longer needed):
//
//      const nameRightIcon = (() => {
//        // 'checking' state is now handled by the pill below — no icon needed
//        if (nameStatus === 'ok')
//          return (
//            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#01C9A4]">
//              <Check size={12} className="text-white" />
//            </span>
//          )
//        if (nameStatus === 'taken') return <X size={16} className="text-red-400" />
//        return null
//      })()
//
// 3. Wrap the Financial Ratio Name <Input> in a relative container and render
//    the loader just below it:
//
//      <div className="relative">
//        <Input
//          label="Financial Ratio Name"
//          required
//          maxLength={100}
//          showCount
//          placeholder="e.g. Debt to Total Assets"
//          value={form.name}
//          onChange={(v) => { ... }}
//          onBlur={checkNameUnique}
//          error={!!errors.name}
//          errorMessage={errors.name}
//          rightIcon={nameRightIcon}
//        />
//        {nameStatus === 'checking' && <RatioNameVerifyingLoader />}
//      </div>
//
// That's it — the green pill appears automatically while the API call is in
// flight and disappears the moment nameStatus transitions to 'ok' or 'taken'.
// ─────────────────────────────────────────────────────────────────────────────
