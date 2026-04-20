/**
 * src/routes/router.jsx
 * ======================
 * React Router v6 — all page components are lazy-loaded (React.lazy).
 * Suspense boundary in App.jsx (public) + AppLayout.jsx (authenticated).
 *
 * Guards:
 *  PrivateRoute  — redirects to /login if no auth_token in sessionStorage
 *  RoleRoute     — redirects to user's own dashboard if wrong roleID
 *
 * Role IDs:  1 = Admin  |  2 = Manager  |  3 = Data Entry
 *
 * NOTE: AppLayout has NO path — it is a pure layout wrapper.
 *       All authenticated child routes use absolute paths (/admin/..., etc.)
 *       so there is no /scs prefix anywhere.
 */

import React, { lazy } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

// ── Layout / guard components (eager — needed before first render) ─────────────
import AppLayout    from '../components/layout/AppLayout.jsx'
import PrivateRoute from './PrivateRoute.jsx'
import RoleRoute    from './RoleRoute.jsx'

// ── Context providers (lightweight — stay eager) ──────────────────────────────
import { FinancialRatioProvider }     from '../context/FinancialRatioContext.jsx'
import { ComplianceCriteriaProvider } from '../context/ComplianceCriteriaContext.jsx'
import { FinancialDataProvider }      from '../context/FinancialDataContext.jsx'

// ── Lazy helpers ──────────────────────────────────────────────────────────────
const page      = (fn)       => lazy(fn)
const namedPage = (fn, name) => lazy(() => fn().then((m) => ({ default: m[name] })))

// ── Auth pages ────────────────────────────────────────────────────────────────
const LoginPage          = page(() => import('../pages/auth/LoginPage.jsx'))
const SignupPage         = page(() => import('../pages/auth/SignupPage.jsx'))
const ForgotPasswordPage = page(() => import('../pages/auth/ForgotPasswordPage.jsx'))
const ResetPasswordPage  = page(() => import('../pages/auth/ResetPasswordPage.jsx'))
const CreatePasswordPage = namedPage(() => import('../pages/auth/ResetPasswordPage.jsx'), 'CreatePasswordPage')
const MultipleLoginPage  = page(() => import('../pages/auth/MultipleLoginPage.jsx'))
const ChangePasswordPage = page(() => import('../pages/auth/ChangePasswordPage.jsx'))

// ── Admin pages ───────────────────────────────────────────────────────────────
const ManageUsersPage     = page(() => import('../pages/admin/ManageUsersPage.jsx'))
const UserGroupsPage      = page(() => import('../pages/admin/UserGroupsPage.jsx'))
const PendingRequestsPage = page(() => import('../pages/admin/PendingRequestsPage.jsx'))
const FormulaBuilderPage  = page(() => import('../pages/admin/FormulaBuilderPage.jsx'))
const AuditTrailPage      = page(() => import('../pages/admin/AuditTrailPage.jsx'))

// ── Manager pages ─────────────────────────────────────────────────────────────
const PendingApprovalsPage         = page(() => import('../pages/manager/PendingApprovalsPage.jsx'))
const BulkActionPage               = page(() => import('../pages/manager/BulkActionPage.jsx'))
const MarketsPage                  = page(() => import('../pages/manager/MarketsPage.jsx'))
const SectorsPage                  = page(() => import('../pages/manager/SectorsPage.jsx'))
const QuartersPage                 = page(() => import('../pages/manager/QuartersPage.jsx'))
const CompaniesPage                = page(() => import('../pages/manager/CompaniesPage.jsx'))
const ClassificationsPage          = page(() => import('../pages/manager/ClassificationsPage.jsx'))
const FinancialRatiosPage          = page(() => import('../pages/manager/FinancialRatiosPage.jsx'))
const ManageFinancialRatioPage     = page(() => import('../pages/manager/ManageFinancialRatioPage.jsx'))
const ComplianceCriteriaPage       = page(() => import('../pages/manager/ComplianceCriteriaPage.jsx'))
const ManageComplianceCriteriaPage = page(() => import('../pages/manager/ManageComplianceCriteriaPage.jsx'))
const SuspendedCompaniesPage       = page(() => import('../pages/manager/SuspendedCompaniesPage.jsx'))
const SukukListPage                = page(() => import('../pages/manager/SukukListPage.jsx'))
const IslamicBanksPage             = page(() => import('../pages/manager/IslamicBanksPage.jsx'))
const IslamicBankWindowsPage       = page(() => import('../pages/manager/IslamicBankWindowsPage.jsx'))
const CharitableOrgsPage           = page(() => import('../pages/manager/CharitableOrgsPage.jsx'))
const ComplianceStandingPage       = page(() => import('../pages/manager/ComplianceStandingPage.jsx'))
const BasketManagementPage         = page(() => import('../pages/manager/BasketManagementPage.jsx'))
const QuarterWiseReportPage        = page(() => import('../pages/manager/QuarterWiseReportPage.jsx'))
const MarketCapPage                = page(() => import('../pages/manager/MarketCapPage.jsx'))
const CompanyListingPage           = page(() => import('../pages/manager/CompanyListingPage.jsx'))
const ShariaNoticePage             = page(() => import('../pages/manager/ShariaNoticePage.jsx'))
const DataNotReceivedPage          = page(() => import('../pages/manager/DataNotReceivedPage.jsx'))
const QuarterlySummaryPage         = page(() => import('../pages/manager/QuarterlySummaryPage.jsx'))

// ── Data Entry pages ──────────────────────────────────────────────────────────
const FinancialDataListPage  = page(() => import('../pages/dataentry/FinancialDataListPage.jsx'))
const AddFinancialDataPage   = page(() => import('../pages/dataentry/AddFinancialDataPage.jsx'))
const ViewFinancialDataPage  = page(() => import('../pages/dataentry/ViewFinancialDataPage.jsx'))
const PendingForApprovalPage = page(() => import('../pages/dataentry/PendingForApprovalPage.jsx'))
const MarketCapEntryPage     = page(() => import('../pages/dataentry/MarketCapEntryPage.jsx'))

// ─────────────────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // ── Public routes ─────────────────────────────────────────────────────────
  { path: '/',                element: <Navigate to="/login" replace /> },
  { path: '/login',           element: <LoginPage /> },
  { path: '/signup',          element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password',  element: <ResetPasswordPage /> },
  { path: '/create-password', element: <CreatePasswordPage /> },
  { path: '/multiple-login',  element: <MultipleLoginPage /> },

  // ── Private routes ────────────────────────────────────────────────────────
  {
    element: <PrivateRoute />,
    children: [
      {
        // No `path` — AppLayout is a pure layout wrapper.
        // Children use absolute paths so no prefix is required.
        element: <AppLayout />,
        children: [

          // ── Shared (all roles) ──────────────────────────────────────────
          { path: '/change-password', element: <ChangePasswordPage /> },

          // ── Admin — roleID: 1 ──────────────────────────────────────────
          {
            element: <RoleRoute allowedRoleIds={[1]} />,
            children: [
              { path: '/admin/users',            element: <ManageUsersPage /> },
              { path: '/admin/user-groups',      element: <UserGroupsPage /> },
              { path: '/admin/pending-requests', element: <PendingRequestsPage /> },
              { path: '/admin/formula-builder',  element: <FormulaBuilderPage /> },
              { path: '/admin/audit-trail',      element: <AuditTrailPage /> },
            ],
          },

          // ── Manager — roleID: 2 ────────────────────────────────────────
          {
            element: <RoleRoute allowedRoleIds={[2]} />,
            children: [
              { path: '/manager/pending-approvals',    element: <PendingApprovalsPage /> },
              { path: '/manager/bulk-action',          element: <BulkActionPage /> },
              { path: '/manager/markets',              element: <MarketsPage /> },
              { path: '/manager/sectors',              element: <SectorsPage /> },
              { path: '/manager/quarters',             element: <QuartersPage /> },
              { path: '/manager/companies',            element: <CompaniesPage /> },
              { path: '/manager/classifications',      element: <ClassificationsPage /> },
              { path: '/manager/suspended-companies',  element: <SuspendedCompaniesPage /> },
              { path: '/manager/sukuk-list',           element: <SukukListPage /> },
              { path: '/manager/islamic-banks',        element: <IslamicBanksPage /> },
              { path: '/manager/islamic-bank-windows', element: <IslamicBankWindowsPage /> },
              { path: '/manager/charitable-orgs',      element: <CharitableOrgsPage /> },
              { path: '/manager/reports/compliance-standing', element: <ComplianceStandingPage /> },
              { path: '/manager/reports/basket-management',   element: <BasketManagementPage /> },
              { path: '/manager/reports/quarter-wise',        element: <QuarterWiseReportPage /> },
              { path: '/manager/reports/market-cap',          element: <MarketCapPage /> },
              { path: '/manager/reports/company-listing',     element: <CompanyListingPage /> },
              { path: '/manager/reports/sharia-notice',       element: <ShariaNoticePage /> },
              { path: '/manager/reports/data-not-received',   element: <DataNotReceivedPage /> },
              { path: '/manager/reports/quarterly-summary',   element: <QuarterlySummaryPage /> },
              {
                path: '/manager/financial-ratios',
                element: <FinancialRatioProvider><Outlet /></FinancialRatioProvider>,
                children: [
                  { index: true,    element: <FinancialRatiosPage /> },
                  { path: 'manage', element: <ManageFinancialRatioPage /> },
                ],
              },
              {
                path: '/manager/compliance-criteria',
                element: <ComplianceCriteriaProvider><Outlet /></ComplianceCriteriaProvider>,
                children: [
                  { index: true,    element: <ComplianceCriteriaPage /> },
                  { path: 'manage', element: <ManageComplianceCriteriaPage /> },
                ],
              },
            ],
          },

          // ── Data Entry — roleID: 3 ─────────────────────────────────────
          {
            element: <RoleRoute allowedRoleIds={[3]} />,
            children: [
              {
                path: '/data-entry',
                element: <FinancialDataProvider><Outlet /></FinancialDataProvider>,
                children: [
                  { path: 'financial-data',              element: <FinancialDataListPage /> },
                  { path: 'financial-data/add',          element: <AddFinancialDataPage /> },
                  { path: 'financial-data/view/:id',     element: <ViewFinancialDataPage /> },
                  { path: 'pending-approval',            element: <PendingForApprovalPage /> },
                  { path: 'market-cap',                  element: <MarketCapEntryPage /> },
                  { path: 'reports/compliance-standing', element: <ComplianceStandingPage /> },
                ],
              },
            ],
          },

        ],
      },
    ],
  },
])

export default router
