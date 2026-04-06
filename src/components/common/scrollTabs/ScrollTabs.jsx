/**
 * ScrollTabs.jsx
 * ===============
 * Horizontally scrollable pill-tab row with left/right arrow navigation.
 * Matches the SCS design system — active tab has a navy border, inactive tabs
 * have a light grey border and hover to navy.
 *
 * Props:
 *  items      {Array}    — [{ id, label }] tab items to display
 *  activeId   {any}      — id of the currently active tab
 *  onTabClick {Function} — called with item.id when a tab is clicked
 *
 * Usage:
 *  import ScrollTabs from "../../components/common/scrollTabs/ScrollTabs";
 *
 *  const [activeTab, setActiveTab] = useState(items[0].id);
 *
 *  <ScrollTabs
 *    items={[
 *      { id: 1, label: "Hilal Compliance Criteria" },
 *      { id: 2, label: "Bilal Compliance Criteria" },
 *      { id: 3, label: "ABC Compliance Criteria" },
 *    ]}
 *    activeId={activeTab}
 *    onTabClick={setActiveTab}
 *  />
 */

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ScrollTabs = ({ items = [], activeId, onTabClick }) => {
  const scrollRef = useRef(null);
  const scroll = (dir) =>
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });

  return (
    <div className="flex items-center gap-2 py-2">
      {/* Left arrow */}
      <button
        onClick={() => scroll(-1)}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full
                   border border-[#dde4ee] hover:border-[#0B39B5] text-[#041E66] transition-colors"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Scrollable tab row */}
      <div
        ref={scrollRef}
        className="flex-1 flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onTabClick(item.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium
            transition-all whitespace-nowrap
            ${
              isActive
                ? "border-2 border-[#01C9A4] text-[#01614F] bg-[#C6F4EB]"
                : "border border-[#E2E8F0] text-[#64748B] bg-white hover:border-[#01C9A4] hover:text-[#01614F] hover:bg-[#ECFDF9]"
            }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll(1)}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full
                   border border-[#dde4ee] hover:border-[#0B39B5] text-[#041E66] transition-colors"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
};

export default ScrollTabs;
