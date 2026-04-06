/**
 * src/routes/router.jsx
 * ======================
 * Centralised React Router v6 configuration — single createBrowserRouter export.
 *
 * @description
 * All routes for the SCS app are defined here. Role-specific context providers
 * (FinancialDataProvider, FinancialRatioProvider, ComplianceCriteriaProvider)
 * are mounted at the route level via wrapper components so their scope is
 * limited to their respective route subtrees.
 *
 * Notes:
 *  - / redirects to /login
 *  - /scs wraps all authenticated pages in AppLayout (Topbar + Sidebar + Outlet)
 *  - ChangePasswordPage is under /scs/change-password and is role-agnostic
 */
import React from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import AppLayout from '../components/layout/AppLayout.jsx'

// Auth
import LoginPage from '../pages/auth/LoginPage.jsx'
import SignupPage from '../pages/auth/SignupPage.jsx'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage.jsx'
import ResetPasswordPage, { CreatePasswordPage } from '../pages/auth/ResetPasswordPage.jsx'
import MultipleLoginPage from '../pages/auth/MultipleLoginPage.jsx'

// Admin
import ManageUsersPage from '../pages/admin/ManageUsersPage.jsx'
import UserGroupsPage from '../pages/admin/UserGroupsPage.jsx'
import PendingRequestsPage from '../pages/admin/PendingRequestsPage.jsx'
import FormulaBuilderPage from '../pages/admin/FormulaBuilderPage.jsx'
import AuditTrailPage from '../pages/admin/AuditTrailPage.jsx'

// Manager
import PendingApprovalsPage from '../pages/manager/PendingApprovalsPage.jsx'
import BulkActionPage from '../pages/manager/BulkActionPage.jsx'
import MarketsPage from '../pages/manager/MarketsPage.jsx'
import SectorsPage from '../pages/manager/SectorsPage.jsx'
import QuartersPage from '../pages/manager/QuartersPage.jsx'
import CompaniesPage from '../pages/manager/CompaniesPage.jsx'
import ClassificationsPage from '../pages/manager/ClassificationsPage.jsx'
import FinancialRatiosPage from '../pages/manager/FinancialRatiosPage.jsx'
import ManageFinancialRatioPage from '../pages/manager/ManageFinancialRatioPage.jsx'
import { FinancialRatioProvider } from '../context/FinancialRatioContext.jsx'
import ComplianceCriteriaPage from '../pages/manager/ComplianceCriteriaPage.jsx'
import ManageComplianceCriteriaPage from '../pages/manager/ManageComplianceCriteriaPage.jsx'
import { ComplianceCriteriaProvider } from '../context/ComplianceCriteriaContext.jsx'
import SuspendedCompaniesPage from '../pages/manager/SuspendedCompaniesPage.jsx'
import SukukListPage from '../pages/manager/SukukListPage.jsx'
import IslamicBanksPage from '../pages/manager/IslamicBanksPage.jsx'
import IslamicBankWindowsPage from '../pages/manager/IslamicBankWindowsPage.jsx'
import CharitableOrgsPage from '../pages/manager/CharitableOrgsPage.jsx'
import ComplianceStandingPage from '../pages/manager/ComplianceStandingPage.jsx'
import BasketManagementPage from '../pages/manager/BasketManagementPage.jsx'
import QuarterWiseReportPage from '../pages/manager/QuarterWiseReportPage.jsx'
import MarketCapPage from '../pages/manager/MarketCapPage.jsx'
import CompanyListingPage from '../pages/manager/CompanyListingPage.jsx'
import ShariaNoticePage from '../pages/manager/ShariaNoticePage.jsx'
import DataNotReceivedPage from '../pages/manager/DataNotReceivedPage.jsx'
import QuarterlySummaryPage from '../pages/manager/QuarterlySummaryPage.jsx'

// Data Entry
import FinancialDataListPage from '../pages/dataentry/FinancialDataListPage.jsx'
import AddFinancialDataPage from '../pages/dataentry/AddFinancialDataPage.jsx'
import ViewFinancialDataPage from '../pages/dataentry/ViewFinancialDataPage.jsx'
import PendingForApprovalPage from '../pages/dataentry/PendingForApprovalPage.jsx'
import MarketCapEntryPage from '../pages/dataentry/MarketCapEntryPage.jsx'
import { FinancialDataProvider } from '../context/FinancialDataContext.jsx'

// Shared / Change Password (inside app)
import ChangePasswordPage from '../pages/auth/ChangePasswordPage.jsx'

const router = createBrowserRouter([
  // ── Public auth routes ──
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/create-password', element: <CreatePasswordPage /> },
  { path: '/multiple-login', element: <MultipleLoginPage /> },

  // ── Authenticated routes ──
  {
    path: '/scs',
    element: <AppLayout />,
    children: [
      // Shared
      { path: 'change-password', element: <ChangePasswordPage /> },

      // Admin
      { path: 'admin/users', element: <ManageUsersPage /> },
      { path: 'admin/user-groups', element: <UserGroupsPage /> },
      { path: 'admin/pending-requests', element: <PendingRequestsPage /> },
      { path: 'admin/formula-builder', element: <FormulaBuilderPage /> },
      { path: 'admin/audit-trail', element: <AuditTrailPage /> },

      // Manager
      { path: 'manager/pending-approvals', element: <PendingApprovalsPage /> },
      { path: 'manager/bulk-action', element: <BulkActionPage /> },
      { path: 'manager/markets', element: <MarketsPage /> },
      { path: 'manager/sectors', element: <SectorsPage /> },
      { path: 'manager/quarters', element: <QuartersPage /> },
      { path: 'manager/companies', element: <CompaniesPage /> },
      { path: 'manager/classifications', element: <ClassificationsPage /> },
      // Financial Ratios — nested under shared FinancialRatioProvider
      {
        path: 'manager/financial-ratios',
        element: (
          <FinancialRatioProvider>
            <Outlet />
          </FinancialRatioProvider>
        ),
        children: [
          { index: true, element: <FinancialRatiosPage /> },
          { path: 'manage', element: <ManageFinancialRatioPage /> },
        ],
      },
      // Compliance Criteria — nested under shared ComplianceCriteriaProvider
      {
        path: 'manager/compliance-criteria',
        element: (
          <ComplianceCriteriaProvider>
            <Outlet />
          </ComplianceCriteriaProvider>
        ),
        children: [
          { index: true, element: <ComplianceCriteriaPage /> },
          { path: 'manage', element: <ManageComplianceCriteriaPage /> },
        ],
      },
      {
        path: 'manager/suspended-companies',
        element: <SuspendedCompaniesPage />,
      },
      { path: 'manager/sukuk-list', element: <SukukListPage /> },
      { path: 'manager/islamic-banks', element: <IslamicBanksPage /> },
      {
        path: 'manager/islamic-bank-windows',
        element: <IslamicBankWindowsPage />,
      },
      { path: 'manager/charitable-orgs', element: <CharitableOrgsPage /> },
      {
        path: 'manager/reports/compliance-standing',
        element: <ComplianceStandingPage />,
      },
      {
        path: 'manager/reports/basket-management',
        element: <BasketManagementPage />,
      },
      {
        path: 'manager/reports/quarter-wise',
        element: <QuarterWiseReportPage />,
      },
      { path: 'manager/reports/market-cap', element: <MarketCapPage /> },
      {
        path: 'manager/reports/company-listing',
        element: <CompanyListingPage />,
      },
      { path: 'manager/reports/sharia-notice', element: <ShariaNoticePage /> },
      {
        path: 'manager/reports/data-not-received',
        element: <DataNotReceivedPage />,
      },
      {
        path: 'manager/reports/quarterly-summary',
        element: <QuarterlySummaryPage />,
      },

      // Data Entry — nested under shared FinancialDataProvider
      {
        path: 'data-entry',
        element: (
          <FinancialDataProvider>
            <Outlet />
          </FinancialDataProvider>
        ),
        children: [
          { path: 'financial-data', element: <FinancialDataListPage /> },
          { path: 'financial-data/add', element: <AddFinancialDataPage /> },
          { path: 'financial-data/view/:id', element: <ViewFinancialDataPage /> },
          { path: 'pending-approval', element: <PendingForApprovalPage /> },
          { path: 'market-cap', element: <MarketCapEntryPage /> },
          {
            path: 'reports/compliance-standing',
            element: <ComplianceStandingPage />,
          },
        ],
      },
    ],
  },
])

export default router
