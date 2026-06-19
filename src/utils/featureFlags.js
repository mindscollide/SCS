/**
 * src/utils/featureFlags.js
 * ===========================
 * Build-time feature flags read from .env (import.meta.env) — one place to
 * check, so a UAT/demo build can be reshaped without touching feature code.
 *
 * HIDE_WIP_FLOWS — `VITE_HIDE_WIP_FLOWS=true` (UAT builds)
 * Hides the work-in-progress flows end to end. Exactly four files honour it —
 * keep them in sync when the hidden set changes:
 *  • Sidebar.jsx   — drops the menu entries:
 *      Manager:    Pending Approvals · Bulk Action · Reports (whole group)
 *      Data Entry: Financial Data (group incl. List/Add/Pending) · Reports
 *      Admin:      Reports (Audit Trail) — added to UAT scope 2026-06-12
 *  • router.jsx    — the matching routes render <Navigate> to the role's
 *                    landing page instead of the page (typed URLs can't leak).
 *  • RoleRoute.jsx — ROLE_HOME swaps the hidden default homes:
 *      Manager → /manager/markets · Data Entry → /data-entry/market-cap
 *      (LoginPage reuses ROLE_HOME for the post-login redirect).
 *  • Topbar.jsx    — mutes the live bell pop-ins for financial_data_submitted
 *                    and pending_approval_updated (bell itself stays visible;
 *                    persisted notifications from the API are not filtered).
 *
 * Toggle with the env line only — no code changes needed to restore the flows.
 */
export const HIDE_WIP_FLOWS = import.meta.env.VITE_HIDE_WIP_FLOWS === 'true'
