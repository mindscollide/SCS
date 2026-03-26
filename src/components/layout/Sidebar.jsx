/**
 * Sidebar.jsx
 * ============
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

import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MENU DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_MENU = [
  {
    label: "Manage Users",
    icon: Users,
    children: [
      { label: "View Details", path: "/scs/admin/users" },
      { label: "User Groups", path: "/scs/admin/user-groups" },
      { label: "Pending Requests", path: "/scs/admin/pending-requests" },
    ],
  },
  {
    label: "Formula Builder",
    icon: FunctionSquare,
    path: "/scs/admin/formula-builder",
  },
  {
    label: "Reports",
    icon: FileText,
    children: [{ label: "Audit Trail", path: "/scs/admin/audit-trail" }],
  },
];

const MANAGER_MENU = [
  {
    label: "Pending Approvals",
    icon: CheckSquare,
    path: "/scs/manager/pending-approvals",
  },
  { label: "Bulk Action", icon: Layers, path: "/scs/manager/bulk-action" },
  {
    label: "Setups",
    icon: Settings,
    children: [
      { label: "Markets", path: "/scs/manager/markets" },
      { label: "Sectors", path: "/scs/manager/sectors" },
      { label: "Quarters", path: "/scs/manager/quarters" },
      { label: "Companies", path: "/scs/manager/companies" },
      { label: "Classifications", path: "/scs/manager/classifications" },
      { label: "Financial Ratios", path: "/scs/manager/financial-ratios" },
      {
        label: "Compliance Criteria",
        path: "/scs/manager/compliance-criteria",
      },
    ],
  },
  {
    label: "Configurations",
    icon: BarChart2,
    children: [
      {
        label: "Suspended Companies",
        path: "/scs/manager/suspended-companies",
      },
      { label: "List of Sukuk", path: "/scs/manager/sukuk-list" },
      { label: "Islamic Banks", path: "/scs/manager/islamic-banks" },
      {
        label: "Islamic Bank Windows",
        path: "/scs/manager/islamic-bank-windows",
      },
      { label: "Charitable Orgs", path: "/scs/manager/charitable-orgs" },
    ],
  },
  {
    label: "Reports",
    icon: FileBarChart,
    children: [
      {
        label: "Compliance Standing",
        path: "/scs/manager/reports/compliance-standing",
      },
      {
        label: "Basket Management",
        path: "/scs/manager/reports/basket-management",
      },
      {
        label: "Quarter Wise Report",
        path: "/scs/manager/reports/quarter-wise",
      },
      {
        label: "Market Capitalization",
        path: "/scs/manager/reports/market-cap",
      },
      {
        label: "Company Listing",
        path: "/scs/manager/reports/company-listing",
      },
      { label: "Sharia Notice", path: "/scs/manager/reports/sharia-notice" },
      {
        label: "Data Not Received",
        path: "/scs/manager/reports/data-not-received",
      },
      {
        label: "Quarterly Summary",
        path: "/scs/manager/reports/quarterly-summary",
      },
    ],
  },
];

const DATA_ENTRY_MENU = [
  {
    label: "Financial Data",
    icon: Edit,
    children: [
      { label: "List", path: "/scs/data-entry/financial-data" },
      { label: "Add", path: "/scs/data-entry/financial-data/add" },
      { label: "Pending Approvals", path: "/scs/data-entry/pending-approval" },
    ],
  },
  {
    label: "Market Capitalization",
    icon: Banknote,
    children: [{ label: "List", path: "/scs/data-entry/market-cap" }],
  },
  {
    label: "Reports",
    icon: FileBarChart,
    children: [
      {
        label: "Compliance Standing",
        path: "/scs/data-entry/reports/compliance-standing",
      },
    ],
  },
];

const MENU_BY_ROLE = {
  admin: ADMIN_MENU,
  manager: MANAGER_MENU,
  "data-entry": DATA_ENTRY_MENU,
};

// ─────────────────────────────────────────────────────────────────────────────
// SidebarItem
// ─────────────────────────────────────────────────────────────────────────────
const SidebarItem = ({ item }) => {
  const location = useLocation();

  // Auto-open parent if a child is currently active
  const childIsActive = item.children?.some(
    (c) => location.pathname === c.path,
  );
  const [open, setOpen] = useState(childIsActive || false);

  // ── GROUP (has children) ──────────────────────────────────────────────────
  if (item.children) {
    const Icon = item.icon;

    // Parent row is highlighted with dark navy when it's expanded + a child is active
    const parentActive = childIsActive;

    return (
      <div>
        {/* Parent header button */}
        <button
          onClick={() => setOpen((p) => !p)}
          className={[
            "w-full flex items-center gap-2.5 px-4 py-[11px]",
            "text-[14px] font-semibold font-['Open_Sans'] transition-colors duration-150",
            parentActive
              ? // Active parent: dark navy bg, white text+icon (as described by user)
                "bg-[#0B39B5] text-white"
              : // Inactive parent: navy text, hover light blue
                "text-[#041E66] hover:bg-[#0B39B5]/8",
          ].join(" ")}
        >
          {Icon && (
            <Icon
              size={16}
              className={`shrink-0 ${parentActive ? "text-white/80" : "text-[#041E66]"}`}
            />
          )}
          <span className="flex-1 text-left">{item.label}</span>
          {open ? (
            <ChevronDown
              size={14}
              className={`shrink-0 ${parentActive ? "text-white/60" : "text-[#041E66]"}`}
            />
          ) : (
            <ChevronRight
              size={14}
              className={`shrink-0 ${parentActive ? "text-white/60" : "text-[#041E66]"}`}
            />
          )}
        </button>

        {/* Sub-menu */}
        <div className={open ? "submenu-open" : "submenu-close"}>
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
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
    );
  }

  // ── LEAF (direct route, no children) ──────────────────────────────────────
  const Icon = item.icon;
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
              className={`shrink-0 ${isActive ? "text-white/80" : "text-[#041E66]"}`}
            />
          )}
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar root
// ─────────────────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const role = sessionStorage.getItem("user_role") || "admin";
  const menu = MENU_BY_ROLE[role] || ADMIN_MENU;

  return (
    <aside
      className="fixed top-[64px] left-2 bottom-2 z-40 flex flex-col overflow-hidden rounded-2xl"
      style={{ width: "210px", backgroundColor: "#EFF3FF" }}
    >
      {/* Navigation */}
      <nav className="flex-1 py-1 overflow-y-auto overflow-x-hidden">
        {menu.map((item, i) => (
          <SidebarItem key={i} item={item} />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
