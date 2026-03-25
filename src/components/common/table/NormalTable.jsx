/**
 * CommonTable.jsx
 * =========================
 * Reusable table component (Ant Design–like behavior, custom UI)
 *
 * PURPOSE
 * -------
 * A flexible table component that:
 * - Renders dynamic columns
 * - Supports optional sorting
 * - Supports custom cell rendering
 * - Handles empty state
 *
 * USAGE
 * -----
 * <CommonTable
 *   columns={columns}
 *   data={data}
 *   sortCol={sortCol}
 *   sortDir={sortDir}
 *   onSort={handleSort}
 * />
 *
 * COLUMN CONFIG
 * -------------
 * Each column object supports:
 *
 * {
 *   key: "fullName",              // maps to row[key]
 *   title: "User Name",           // header label
 *   sortable: true,               // enables sorting click
 *   render: (row) => JSX          // optional custom cell renderer
 * }
 *
 * PROPS
 * -----
 * @param {Array} columns   Column definitions (see above)
 * @param {Array} data      Array of row objects
 * @param {string} sortCol  Currently sorted column key
 * @param {string} sortDir  Sort direction ("asc" | "desc")
 * @param {Function} onSort Callback when column header is clicked
 * @param {string} emptyText Text shown when no data available
 *
 * FEATURES
 * --------
 * ✔ Dynamic columns
 * ✔ Custom render per column
 * ✔ Sortable headers
 * ✔ Empty state UI
 * ✔ Responsive (horizontal scroll)
 *
 * NOTES
 * -----
 * - Sorting logic is handled outside (parent component)
 * - `SortIconTable` must be available/imported
 * - Each row should have a unique `id`
 */

import React from "react";
import { SortIconTable } from "..";

const CommonTable = ({
  columns,
  data,
  sortCol,
  sortDir,
  onSort,
  emptyText = "No Record Found",
  headerBg = "#E0E6F6",
  headerTextColor = "#041E66",
  rowBg = "#ffffff",
  rowHoverBg = "#f8fafc",
}) => {
  return (
    <div className="bg-white rounded-[12px]  overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          {/* ───────────────── Header ───────────────── */}
          <thead>
            <tr
              className="border-b border-[#dde4ee]"
              style={{ backgroundColor: headerBg }}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  style={{ color: headerTextColor }}
                  className={`
        px-4 py-3 text-left text-[12px] font-semibold
        whitespace-nowrap select-none transition-colors
        ${col.sortable ? "cursor-pointer" : ""}
      `}
                >
                  <div className="flex items-center">
                    {/* Column Title */}
                    {col.title}

                    {/* Sort Icon (only if sortable) */}
                    {col.sortable && (
                      <SortIconTable
                        col={col.key}
                        sortCol={sortCol}
                        sortDir={sortDir}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* ───────────────── Body ───────────────── */}
          <tbody>
            {data.length === 0 ? (
              /* Empty State */
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-14 text-[#a0aec0]"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              /* Data Rows */
              data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#eef2f7] transition"
                  style={{ backgroundColor: rowBg }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = rowHoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = rowBg)
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[#041E66]">
                      {/* Custom Render OR Default Value */}
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommonTable;
