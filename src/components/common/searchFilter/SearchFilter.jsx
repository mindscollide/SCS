/**
 * src/components/common/searchFilter/SearchFilter.jsx
 * =====================================================
 * Combined search bar and collapsible filter panel.
 *
 * @description
 * Renders a main search input and an optional filter icon button that opens a
 * dropdown panel with dynamically configured fields (text, select, date, daterange).
 *
 * Props:
 *  @prop {string}   placeholder       - Placeholder for the main search input
 *  @prop {string}   mainSearch        - Controlled value for the main search input
 *  @prop {Function} setMainSearch     - Setter for mainSearch
 *  @prop {Object}   filters           - Controlled filter values keyed by field key.
 *                                       For daterange fields, value must be { start: Date|null, end: Date|null }
 *  @prop {Function} setFilters        - Setter for filters object
 *  @prop {Array}    fields            - Field definitions:
 *                                         [{key, label, type, options?, placeholder?, regex?, maxLength?}]
 *                                       type can be: 'text' | 'select' | 'date' | 'daterange'
 *  @prop {boolean}  showFilterPanel   - Show the filter icon and panel (default: true)
 *  @prop {Function} onSearch          - Called when Search button or Enter key is pressed
 *  @prop {Function} onReset           - Called when Reset button is pressed
 *  @prop {Function} [onFilterClose]   - Called when filter panel closes without action
 *
 * Notes:
 *  - When showFilterPanel=false only the main search input is rendered
 *  - Panel closes on outside click via a mousedown listener
 *  - Date fields use the custom DatePicker component (no external libraries)
 *  - DateRange fields use the custom DateRangePicker component (no external libraries)
 */
import React, { useState, useRef, useEffect } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import DatePicker from '../datePicker/DatePicker'
import DateRangePicker from '../datePicker/DateRangePicker'

const SearchFilter = ({
  placeholder = 'Search...',
  mainSearch,
  setMainSearch,
  mainSearchKey,
  filters,
  setFilters,
  fields = [],
  showFilterPanel = true,
  onSearch,
  onReset,
  onFilterClose,
}) => {
  const [showFilter, setShowFilter] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const filterRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilter(false)
        onFilterClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMainSearch = () => {
    onSearch?.()
    setMainSearch('')
  }

  const toggleFilterPanel = () => {
    setShowFilter((prev) => {
      if (!prev && mainSearchKey && mainSearch) {
        setFilters((p) => ({ ...p, [mainSearchKey]: mainSearch }))
      }
      if (prev) onFilterClose?.()
      return !prev
    })
  }

  const handleFieldChange = (key, value, regex) => {
    if (regex && !regex.test(value) && value !== '') return
    setFilters((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: null }))
  }

  const handleSearch = () => {
    const errors = {}
    fields.forEach((f) => {
      if (f.validate) {
        const msg = f.validate(filters[f.key])
        if (msg) errors[f.key] = msg
      }
    })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    onSearch?.()
    setMainSearch('')
    setShowFilter(false)
  }

  return (
    <div className="flex items-center gap-2" ref={filterRef}>
      {/* Main Search */}
      <div
        className="
          flex items-center bg-white border border-[#dde4ee] rounded-[8px]
          px-3 py-[8px] gap-2 min-w-[220px]
          focus-within:border-[#01C9A4]
          focus-within:shadow-[0_0_0_3px_rgba(1,201,164,0.12)]
          transition-all duration-150
        "
      >
        <Search size={15} className="text-[#a0aec0] shrink-0" />
        <input
          value={mainSearch}
          onChange={(e) => setMainSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleMainSearch()}
          placeholder={placeholder}
          className="
            flex-1 border-none outline-none bg-transparent text-[13px]
            text-[#041E66] placeholder:text-[#a0aec0]
          "
        />
      </div>

      {/* Filter Button */}
      {showFilterPanel && (
        <div className="relative">
          <button
            onClick={toggleFilterPanel}
            className="
              w-9 h-9 flex items-center justify-center rounded-[8px]
              bg-[#0B39B5] text-white hover:bg-[#251a94]
              transition-colors shrink-0
            "
          >
            <SlidersHorizontal size={16} />
          </button>

          {showFilter && (
            <div
              className="
                absolute top-[calc(100%+6px)] right-0 w-[300px] bg-white
                border border-[#dde4ee] rounded-[12px]
                shadow-[0_4px_16px_rgba(0,0,0,0.12)] z-50 p-4 pt-5
              "
            >
              {/* Dynamic Fields */}
              {fields.map((field) => (
                <div key={field.key} className="mb-3">
                  {fieldErrors[field.key] && (
                    <p className="text-[11px] text-[#E74C3C] mb-1">{fieldErrors[field.key]}</p>
                  )}

                  {field.type === 'select' ? (
                    <select
                      value={filters[field.key]}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="
                        w-full px-2.5 py-[7px] rounded-[6px] border border-[#dde4ee]
                        text-[12px] text-[#041E66] outline-none
                        focus:border-[#01C9A4] transition-all bg-white
                      "
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'date' ? (
                    <DatePicker
                      value={filters[field.key] || null}
                      onChange={(d) => handleFieldChange(field.key, d)}
                      placeholder="dd mmm yyyy"
                    />
                  ) : field.type === 'daterange' ? (
                    /* ── Date Range Picker ── */
                    <DateRangePicker
                      value={filters[field.key] || { start: null, end: null }}
                      onChange={(range) => handleFieldChange(field.key, range)}
                      placeholder={field.placeholder || `Select ${field.label} range`}
                      error={fieldErrors[field.key]}
                    />
                  ) : (
                    <input
                      value={filters[field.key]}
                      onChange={(e) => handleFieldChange(field.key, e.target.value, field.regex)}
                      placeholder={field.placeholder || `Search ${field.label}`}
                      maxLength={field.maxLength || 50}
                      className="
                        w-full px-2.5 py-[7px] rounded-[6px] border border-[#dde4ee]
                        text-[12px] text-[#041E66] outline-none
                        focus:border-[#01C9A4] transition-all
                      "
                    />
                  )}
                </div>
              ))}

              {/* Buttons */}
              <div className="flex gap-2 mt-5 justify-end">
                <button
                  onClick={() => {
                    setFieldErrors({})
                    onReset?.()
                    setShowFilter(false)
                  }}
                  className="
                    w-[90px] py-[8px] rounded-[8px] text-[13px] font-semibold
                    text-black bg-[#e0e6f6]  hover:bg-[#cbd0df]
                  "
                >
                  Clear
                </button>
                <button
                  onClick={handleSearch}
                  className="
                    w-[90px] py-[8px] rounded-[8px] text-[13px] font-semibold
                    text-white bg-[#F5A623] hover:bg-[#D98C00]
                  "
                >
                  Search
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchFilter
