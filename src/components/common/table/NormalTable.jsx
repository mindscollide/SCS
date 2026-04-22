/**
 * src/components/common/table/NormalTable.jsx
 * =============================================
 * Reusable sortable table with optional drag-and-drop row reordering.
 *
 * PROPS
 * -----
 * columns      {Array}    — Column definitions (see COLUMN CONFIG below)
 * data         {Array}    — Array of row objects (each must have a unique `id`)
 * sortCol      {string}   — Currently sorted column key
 * sortDir      {string}   — "asc" | "desc"
 * onSort       {Function} — Called when a sortable header is clicked
 * emptyText    {string}   — Shown when data is empty (default: "No Record Found")
 * headerBg     {string}   — Header row background color
 * headerTextColor {string}— Header text color
 * rowBg        {string}   — Row background color
 * rowHoverBg   {string}   — Row background on hover
 *
 * draggable    {boolean}  — Enables drag-and-drop row reordering (default: false)
 *                           Prepends a GripVertical handle column automatically.
 * onReorder    {Function} — Called with the new reordered data array after a drop.
 *                           Parent must update its state: onReorder={setItems}
 *
 * scrollable   {boolean}  — When true the table body scrolls inside a fixed-height
 *                           container and the header stays sticky at the top.
 *                           Pair with maxHeight and scrollRef.
 * maxHeight    {string}   — CSS max-height for the scroll container, e.g.
 *                           "calc(100vh - 200px)". Only used when scrollable=true.
 * scrollRef    {Ref}      — Ref attached to the scroll container div. Pass this to
 *                           useInfiniteScroll so the observer fires on container scroll.
 * footerSlot   {ReactNode}— Rendered inside the scroll container after </table>.
 *                           Use for the sentinel div + loading spinner.
 *
 * COLUMN CONFIG
 * -------------
 * {
 *   key:      "fullName",       // maps to row[key] for default render
 *   title:    "User Name",      // header label
 *   sortable: true,             // enables sort click on header
 *   render:   (row) => <JSX /> // optional custom cell renderer
 * }
 *
 * USAGE — basic
 * -------------
 * <CommonTable
 *   columns={columns}
 *   data={data}
 *   sortCol={sortCol}
 *   sortDir={sortDir}
 *   onSort={handleSort}
 * />
 *
 * USAGE — with drag-and-drop
 * --------------------------
 * <CommonTable
 *   draggable
 *   onReorder={setData}
 *   columns={columns}
 *   data={data}
 *   emptyText="No Record Found"
 * />
 */

import React, { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { SortIconTable } from '..'

const CommonTable = ({
  columns,
  data,
  sortCol,
  sortDir,
  onSort,
  emptyText = 'No Record Found',
  headerBg = '#E0E6F6',
  headerTextColor = '#041E66',
  rowBg = '#ffffff',
  rowHoverBg = '#f8fafc',
  draggable = false,
  onReorder,
  // ── Scrollable / sticky-header mode ────────────────────────────────────
  scrollable = false,
  maxHeight,
  scrollRef,
  footerSlot,
}) => {
  // ── Drag state ──────────────────────────────────────────────────────────────
  const [dragIdx, setDragIdx] = useState(null) // index of row being dragged
  const [overIdx, setOverIdx] = useState(null) // index of row being hovered over

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    // Transparent ghost image so the row itself acts as preview
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0)
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (idx !== overIdx) setOverIdx(idx)
  }

  const handleDrop = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    const next = [...data]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(idx, 0, moved)
    onReorder?.(next)
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    // overflow-hidden is removed when scrollable so sticky thead isn't clipped
    <div className={`bg-white rounded-[12px] ${scrollable ? '' : 'overflow-hidden'}`}>
      <div
        ref={scrollRef}
        className={scrollable ? 'overflow-auto' : 'overflow-x-auto'}
        style={scrollable && maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full text-[13px]">
          {/* ── Header ── sticky when scrollable ── */}
          <thead className={scrollable ? 'sticky top-0 z-10' : ''}>
            <tr className="border-b border-[#dde4ee]" style={{ backgroundColor: headerBg }}>
              {/* Drag handle header cell */}
              {draggable && <th className="w-8 px-2 py-3" />}

              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  style={{ color: headerTextColor }}
                  className={`px-4 py-3 text-[12px] font-semibold whitespace-nowrap select-none transition-colors
                    ${col.sortable ? 'cursor-pointer' : ''}
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                  `}
                >
                  <div
                    className={`flex items-center ${
                      col.align === 'center'
                        ? 'justify-center'
                        : col.align === 'right'
                          ? 'justify-end'
                          : 'justify-start'
                    }`}
                  >
                    {col.title}
                    {col.sortable && (
                      <SortIconTable col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (draggable ? 1 : 0)}
                  className="text-center py-14 text-[#a0aec0]"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const isDragging = draggable && dragIdx === idx
                const isOver = draggable && overIdx === idx && dragIdx !== idx

                return (
                  <tr
                    key={row.id}
                    draggable={draggable}
                    onDragStart={draggable ? (e) => handleDragStart(e, idx) : undefined}
                    onDragOver={draggable ? (e) => handleDragOver(e, idx) : undefined}
                    onDrop={draggable ? (e) => handleDrop(e, idx) : undefined}
                    onDragEnd={draggable ? handleDragEnd : undefined}
                    className="border-b border-[#eef2f7] transition-all"
                    style={{
                      backgroundColor: isOver ? '#e8faf6' : rowBg,
                      opacity: isDragging ? 0.4 : 1,
                      borderTop: isOver ? '2px solid #01C9A4' : undefined,
                    }}
                    onMouseEnter={(e) =>
                      !isDragging && (e.currentTarget.style.backgroundColor = rowHoverBg)
                    }
                    onMouseLeave={(e) =>
                      !isDragging &&
                      (e.currentTarget.style.backgroundColor = isOver ? '#e8faf6' : rowBg)
                    }
                  >
                    {/* Drag handle cell */}
                    {draggable && (
                      <td className="w-8 px-2 py-3">
                        <span
                          className="flex items-center justify-center text-[#CBD5E1]
                                     hover:text-[#94a3b8] cursor-grab active:cursor-grabbing
                                     transition-colors"
                          title="Drag to reorder"
                        >
                          <GripVertical size={16} />
                        </span>
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-[#041E66]
                       ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                     `}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* Sentinel div + spinner rendered inside the scroll container
            so the IntersectionObserver fires on container scroll, not page scroll */}
        {footerSlot}
      </div>
    </div>
  )
}

export default CommonTable
