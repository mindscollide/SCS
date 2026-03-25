/**
 * AppLayout.jsx
 * ==============
 * Shell for all authenticated pages.
 *
 * Structure:
 *  ┌──────────────────────────────────────────────────────┐
 *  │  Topbar  (fixed, h-[56px], z-50, full width)        │
 *  ├────────────┬─────────────────────────────────────────┤
 *  │  Sidebar   │  Content area (ml-[210px], pt-[56px])  │
 *  │  (fixed,   │                                         │
 *  │   210px)   │  <Outlet /> — page renders here         │
 *  │            │                                         │
 *  │            ├─────────────────────────────────────────┤
 *  │            │  Footer                                 │
 *  └────────────┴─────────────────────────────────────────┘
 */

import React from "react";
import { Outlet } from "react-router-dom";
import Topbar from "./Topbar.jsx";
import Sidebar from "./Sidebar.jsx";

const AppLayout = () => (
  <div className="min-h-screen bg-white">
    {/* Fixed topbar */}
    <Topbar />

    {/* Fixed sidebar */}
    <Sidebar />

    {/* Scrollable content — offset left by sidebar, down by topbar */}
    <div
      className="flex flex-col min-h-screen"
      style={{ marginLeft: "220px", paddingTop: "44px" }}
    >
      {/* Page body */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  </div>
);

export default AppLayout;
