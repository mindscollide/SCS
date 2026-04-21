/**
 * src/components/layout/Sidebar.jsx
 * ===================================
 * Fixed left navigation — 210px wide.
 *
 * Exact design rules (from PSD + user description):
 * ──────────────────────────────────────────────────
 * Sidebar bg          : #EFF3FF  (light blue-white)
 * Parent item text    : #041E66  (dark navy)
 * Parent item icon    : #041E66 at 60% opacity
 * Parent item hover   : #0B39B5 at 8% opacity
 *
 * Active PARENT row   : #0B39B5 (dark navy/blue) bg — full width
 *                       white text + white icon
 *
 * Active CHILD item   : #01C9A4 (teal) bg — full width
 *                       white text, font-medium
 *
 * Inactive child text : #041E66 at 75% opacity
 * Inactive child hover: #0B39B5 at 8% opacity
 *
 * Chevron             : right when collapsed, down when expanded
 * Child indent        : 52px left (deeper than parent 16px)
 * No border-radius on active items (full bleed)
 * No footer
 */

import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Users,
  FunctionSquare,
  FileText,
  CheckSquare,
  Settings,
  BarChart2,
  Layers,
  FileBarChart,
  ChevronRight,
  ChevronDown,
  Edit,
  Banknote,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// MENU DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_MENU = [
  {
    label: 'Manage Users',
    icon: Users,
    children: [
      { label: 'View Details', path: '/admin/users' },
      { label: 'User Groups', path: '/admin/user-groups' },
      { label: 'Pending Requests', path: '/admin/pending-requests' },
    ],
  },
  {
    label: 'Formula Builder',
    icon: FunctionSquare,
    path: '/admin/formula-builder',
  },
  {
    label: 'Reports',
    icon: FileText,
    children: [{ label: 'Audit Trail', path: '/admin/audit-trail' }],
  },
]

const MANAGER_MENU = [
  {
    label: 'Pending Approvals',
    icon: CheckSquare,
    path: '/manager/pending-approvals',
  },
  { label: 'Bulk Action', icon: Layers, path: '/manager/bulk-action' },
  {
    label: 'Setups',
    icon: Settings,
    children: [
      { label: 'Markets', path: '/manager/markets' },
      { label: 'Sectors', path: '/manager/sectors' },
      { label: 'Quarters', path: '/manager/quarters' },
      { label: 'Companies', path: '/manager/companies' },
      { label: 'Classifications', path: '/manager/classifications' },
      { label: 'Financial Ratios', path: '/manager/financial-ratios' },
      {
        label: 'Compliance Criteria',
        path: '/manager/compliance-criteria',
      },
    ],
  },
  {
    label: 'Configurations',
    icon: BarChart2,
    children: [
      {
        label: 'Suspended Companies',
        path: '/manager/suspended-companies',
      },
      { label: 'List of Sukuk', path: '/manager/sukuk-list' },
      { label: 'Islamic Banks', path: '/manager/islamic-banks' },
      {
        label: 'Islamic Bank Windows',
        path: '/manager/islamic-bank-windows',
      },
      { label: 'Charitable Orgs', path: '/manager/charitable-orgs' },
    ],
  },
  {
    label: 'Reports',
    icon: FileBarChart,
    children: [
      {
        label: 'Compliance Standing',
        path: '/manager/reports/compliance-standing',
      },
      {
        label: 'Basket Management',
        path: '/manager/reports/basket-management',
      },
      {
        label: 'Quarter Wise Report',
        path: '/manager/reports/quarter-wise',
      },
      {
        label: 'Market Capitalization',
        path: '/manager/reports/market-cap',
      },
      {
        label: 'Company Listing',
        path: '/manager/reports/company-listing',
      },
      { label: 'Sharia Notice', path: '/manager/reports/sharia-notice' },
      {
        label: 'Data Not Received',
        path: '/manager/reports/data-not-received',
      },
      {
        label: 'Quarterly Summary',
        path: '/manager/reports/quarterly-summary',
      },
    ],
  },
]

const DATA_ENTRY_MENU = [
  {
    label: 'Financial Data',
    icon: Edit,
    basePath: '/data-entry/financial-data',
    children: [
      { label: 'List', path: '/data-entry/financial-data', end: true },
      { label: 'Add', path: '/data-entry/financial-data/add' },
      { label: 'Pending Approvals', path: '/data-entry/pending-approval' },
    ],
  },
  {
    label: 'Market Capitalization',
    icon: Banknote,
    children: [{ label: 'List', path: '/data-entry/market-cap', end: true }],
  },
  {
    label: 'Reports',
    icon: FileBarChart,
    children: [
      {
        label: 'Compliance Standing',
        path: '/data-entry/reports/compliance-standing',
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SidebarItem
// ─────────────────────────────────────────────────────────────────────────────
const SidebarItem = ({ item }) => {
  const location = useLocation()

  // Auto-open parent if a child (or sub-route) is currently active
  const childIsActive = item.basePath
    ? location.pathname.startsWith(item.basePath)
    : item.children?.some((c) =>
        c.end ? location.pathname === c.path : location.pathname.startsWith(c.path)
      )
  const [open, setOpen] = useState(childIsActive || false)

  // ── GROUP (has children) ──────────────────────────────────────────────────
  if (item.children) {
    const Icon = item.icon

    // Parent row is highlighted with dark navy when it's expanded + a child is active
    const parentActive = childIsActive

    return (
      <div>
        {/* Parent header button */}
        <button
          onClick={() => setOpen((p) => !p)}
          className={[
            'w-full flex items-center gap-2.5 px-4 py-[11px]',
            "text-[14px] font-semibold font-['Open_Sans'] transition-colors duration-150",
            parentActive
              ? // Active parent: dark navy bg, white text+icon (as described by user)
                'bg-[#0B39B5] text-white'
              : // Inactive parent: navy text, hover light blue
                'text-[#041E66] hover:bg-[#0B39B5]/8',
          ].join(' ')}
        >
          {Icon && (
            <Icon
              size={16}
              className={`shrink-0 ${parentActive ? 'text-white/80' : 'text-[#041E66]'}`}
            />
          )}
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown
              size={14}
              className={`shrink-0 ${parentActive ? 'text-white/60' : 'text-[#041E66]'}`}
            />
          ) : (
            <ChevronRight
              size={14}
              className={`shrink-0 ${parentActive ? 'text-white/60' : 'text-[#041E66]'}`}
            />
          )}
        </button>

        {/* Sub-menu */}
        <div className={open ? 'submenu-open' : 'submenu-close'}>
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              end={child.end ?? false}
              className={({ isActive }) =>
                isActive
                  ? // Active child: full-width teal, white text
                    "block w-full pl-[52px] pr-4 py-[10px] text-[14px] font-semibold font-['Open_Sans'] no-underline bg-[#01C9A4] text-white transition-colors duration-100"
                  : // Inactive child: navy text, hover light blue
                    "block w-full pl-[52px] pr-4 py-[10px] text-[14px] font-semibold font-['Open_Sans'] no-underline text-[#041E66] hover:bg-[#0B39B5]/8 transition-colors duration-100"
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    )
  }

  // ── LEAF (direct route, no children) ──────────────────────────────────────
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        isActive
          ? "flex items-center gap-2.5 px-4 py-[11px] text-[14px] font-semibold font-['Open_Sans'] no-underline bg-[#0B39B5] text-white transition-colors duration-100"
          : "flex items-center gap-2.5 px-4 py-[11px] text-[14px] font-semibold font-['Open_Sans'] no-underline text-[#041E66] hover:bg-[#0B39B5]/8 transition-colors duration-100"
      }
    >
      {({ isActive }) => (
        <>
          {Icon && (
            <Icon
              size={16}
              className={`shrink-0 ${isActive ? 'text-white/80' : 'text-[#041E66]'}`}
            />
          )}
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar root
// ─────────────────────────────────────────────────────────────────────────────

// roleID → menu (matches RoleRoute.jsx and LoginPage.jsx role IDs)
const MENU_BY_ROLE_ID = {
  1: ADMIN_MENU,
  2: MANAGER_MENU,
  3: DATA_ENTRY_MENU,
}

const getRoleId = () => {
  try {
    const roles = JSON.parse(sessionStorage.getItem('user_roles') || '[]')
    return roles[0]?.roleID ?? 1
  } catch {
    return 1
  }
}

const Sidebar = () => {
  const menu = MENU_BY_ROLE_ID[getRoleId()] || ADMIN_MENU

  return (
    <aside
      className="fixed top-[64px] left-2 bottom-2 z-40 flex flex-col overflow-hidden rounded-2xl"
      style={{ width: '210px', backgroundColor: '#EFF3FF' }}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden">
        {menu.map((item, i) => (
          <SidebarItem key={i} item={item} />
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
