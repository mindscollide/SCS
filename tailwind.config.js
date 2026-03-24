/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // ─────────────────────────────────────────────────
      // BRAND COLORS  (extracted pixel-by-pixel from PSD)
      // ─────────────────────────────────────────────────
      colors: {
        // Primary navy — sidebar bg, page headings, table header text
        navy: "#0B39B5",
        // Teal/green — active sidebar item, Signup btn, Export btn,
        //              Save & Send btn, Upload btn, Active status text
        teal: "#01C9A4",
        // Yellow — Back btn, Cancel btn, Add btn, Close btn, View Actions badge
        gold: "#F5A623",
        // Blue — Login btn, Generate Report btn, Save (enabled), Approve (bulk)
        blue: "#0B39B5",
        // Slate — disabled buttons
        slate: "#7B8DB0",
        // Danger red — ✕ icon, Decline, In-Active text, error border/text
        danger: "#E74C3C",
        // Orange — Forgot Password link
        orange: "#E67E22",
        // Page background — light blue-grey content area
        "page-bg": "#FFFFFF",
        // Table header row background
        "table-hd": "#EEF2F7",
        // Success green tint — info boxes inside modals
        "info-tint": "#E8FAF4",
        // Auth gradient stops
        "auth-from": "#1a3fb5",
        "auth-to": "#00C9A7",
      },

      // ─────────────────────────────────────────────────
      // FONTS
      // ─────────────────────────────────────────────────
      fontFamily: {
        sans: ["Open Sans", "sans-serif"],
      },

      // ─────────────────────────────────────────────────
      // LAYOUT SIZES
      // ─────────────────────────────────────────────────
      width: { sidebar: "210px" },
      height: { topbar: "56px" },
      minWidth: { sidebar: "210px" },

      // ─────────────────────────────────────────────────
      // SHADOWS
      // ─────────────────────────────────────────────────
      boxShadow: {
        topbar: "0 1px 4px rgba(0,0,0,0.08)",
        card: "0 1px 4px rgba(0,0,0,0.06)",
        modal: "0 8px 32px rgba(0,0,0,0.16)",
        notif: "0 4px 20px rgba(0,0,0,0.15)",
      },

      // ─────────────────────────────────────────────────
      // BORDER RADIUS
      // ─────────────────────────────────────────────────
      borderRadius: {
        card: "12px",
        input: "8px",
        btn: "8px",
        modal: "16px",
      },

      // ─────────────────────────────────────────────────
      // ANIMATIONS
      // ─────────────────────────────────────────────────
      keyframes: {
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "slide-down": "slideDown 0.18s ease",
        "slide-up": "slideUp 0.2s ease",
        "fade-in": "fadeIn 0.15s ease",
      },
    },
  },
  plugins: [],
};
