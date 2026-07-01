/**
 * src/pages/manager/ManagerDashboardPage.jsx
 * ============================================
 * Manager's post-login landing page — purely navigational, no API calls.
 *
 * Displays one section:
 *   Reports (8 cards) — Compliance Standing · Quarter Wise · Basket Management ·
 *   Market Cap · Company Listing · Shariah Notice · Data Not Received · Quarterly Summary.
 *
 * Financial Data browsing is intentionally absent from the Manager Dashboard —
 * that belongs to the View Only role (role 4) at /view-only/financial-data.
 *
 * Route:   /manager/dashboard  (role 2, first entry in MANAGER_MENU)
 * Sidebar: "Dashboard" with LayoutDashboard icon — always visible, not WIP-gated.
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Calendar,
  Layers,
  TrendingUp,
  Building2,
  FileText,
  AlertCircle,
  FileBarChart,
} from 'lucide-react'

// ── Report cards ─────────────────────────────────────────────────────────────

const REPORT_CARDS = [
  {
    label: 'Compliance Standing',
    desc: 'Evaluate company compliance against criteria thresholds.',
    path: '/manager/reports/compliance-standing',
    icon: BarChart2,
    color: '#0B39B5',
    bg: '#EEF2FF',
  },
  {
    label: 'Quarter Wise Report',
    desc: 'Multi-quarter compliance matrix across selected companies.',
    path: '/manager/reports/quarter-wise',
    icon: Calendar,
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    label: 'Basket Management',
    desc: 'Manage and review Shariah-compliant basket compositions.',
    path: '/manager/reports/basket-management',
    icon: Layers,
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    label: 'Market Capitalization',
    desc: 'View and export market cap data across quarters.',
    path: '/manager/reports/market-cap',
    icon: TrendingUp,
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    label: 'Company Listing',
    desc: 'Full listing of companies with compliance status.',
    path: '/manager/reports/company-listing',
    icon: Building2,
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    label: 'Shariah Notice',
    desc: 'Generate Shariah compliance notices for companies.',
    path: '/manager/reports/sharia-notice',
    icon: FileText,
    color: '#DB2777',
    bg: '#FDF2F8',
  },
  {
    label: 'Data Not Received',
    desc: 'Identify companies with missing financial data submissions.',
    path: '/manager/reports/data-not-received',
    icon: AlertCircle,
    color: '#E74C3C',
    bg: '#FEF2F2',
  },
  {
    label: 'Quarterly Summary',
    desc: 'Summarised compliance results across all quarters.',
    path: '/manager/reports/quarterly-summary',
    icon: FileBarChart,
    color: '#01C9A4',
    bg: '#F0FDFA',
  },
]

// ── Reusable card ─────────────────────────────────────────────────────────────

const DashCard = ({ item, onClick }) => {
  const Icon = item.icon
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3
                 cursor-pointer hover:shadow-md hover:border-[#0B39B5]/30
                 transition-all duration-150 group"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: item.bg }}
        >
          <Icon size={22} style={{ color: item.color }} />
        </div>
      </div>
      <div>
        <p className="text-[14px] font-semibold text-[#041E66] leading-snug">{item.label}</p>
        <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
      </div>
      <div className="mt-auto pt-1">
        <span
          className="text-[12px] font-semibold group-hover:underline"
          style={{ color: item.color }}
        >
          Open →
        </span>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

const SectionHeader = ({ title, count }) => (
  <div className="flex items-center gap-3 mb-4">
    <h2 className="text-[17px] font-semibold text-[#041E66]">{title}</h2>
    <span className="text-[11px] font-semibold text-[#0B39B5] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
      {count}
    </span>
    <div className="flex-1 h-px bg-slate-200" />
  </div>
)

// ── Page ──────────────────────────────────────────────────────────────────────

const ManagerDashboardPage = () => {
  const navigate = useNavigate()

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="font-sans">
      {/* ── Page header ── */}
      <div className="bg-[#eff3ff] rounded-xl px-4 py-3 mb-5 border border-slate-200
                      flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">Dashboard</h1>
        <span className="text-[12px] text-slate-400 shrink-0">{today}</span>
      </div>

      {/* ── Reports section ── */}
      <div className="mb-8">
        <SectionHeader title="Reports" count={REPORT_CARDS.length} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {REPORT_CARDS.map((card) => (
            <DashCard key={card.path} item={card} onClick={() => navigate(card.path)} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-slate-400 font-semibold text-xs">
        © Copyright {new Date().getFullYear()}. All Rights Reserved.
      </div>
    </div>
  )
}

export default ManagerDashboardPage
