/**
 * src/components/common/searchFilter/SearchFilter.jsx
 * =====================================================
 * Combined search bar and collapsible filter panel.
 *
 * @description
 * Renders a main search input and an optional filter icon button that opens a
 * dropdown panel with dynamically configured fields (input, select, date, daterange).
 * All 'select' type fields are rendered using SearchableSelect (not a native <select>).
 *
 * Props:
 *  @prop {string}   placeholder       - Placeholder for the main search input
 *  @prop {string}   mainSearch        - Controlled value for the main search input
 *  @prop {Function} setMainSearch     - Setter for mainSearch
 *  @prop {string}   [mainSearchKey]   - When set, mirroring mainSearch into filters[mainSearchKey]
 *                                       when the filter panel is opened
 *  @prop {Object}   filters           - Controlled filter values keyed by field key.
 *                                       For daterange fields, value must be { start: Date|null, end: Date|null }
 *  @prop {Function} setFilters        - Setter for filters object
 *  @prop {Array}    fields            - Field definitions. Each field object:
 *                                         {
 *                                           key:          string,
 *                                           label:        string,
 *                                           type:         'input' | 'select' | 'date' | 'daterange',
 *                                           // for type='input':
 *                                           placeholder?: string,
 *                                           regex?:       RegExp,   // blocks non-matching keystrokes
 *                                           maxLength?:   number,   // default 50
 *                                           validate?:    (value) => string|null,  // null = valid
 *                                           // for type='select':
 *                                           options?:     string[] | {label,value}[] | object[],
 *                                           optionLabel?: string,   // key to use as label when options
 *                                           optionValue?: string,   // are arbitrary objects (e.g. {id,name})
 *                                           // for type='daterange':
 *                                           placeholder?: string,
 *                                         }
 *                                       SearchFilter normalises select options to {label,value}[] before
 *                                       passing to SearchableSelect:
 *                                         string  → { label: s, value: s }
 *                                         object  → { label: opt[optionLabel||'label'],
 *                                                     value: opt[optionValue||'value'] }
 *  @prop {boolean}  showFilterPanel   - Show the filter icon and panel (default: true)
 *  @prop {Function} onSearch          - Called when Search button or Enter key is pressed
 *  @prop {Function} onReset           - Called when Reset/Clear button is pressed
 *  @prop {Function} [onFilterClose]   - Called when filter panel closes without a search action
 *  @prop {string}   [inputWidth]      - Tailwind width class for the main search input
 *                                       (default: 'min-w-[220px]')
 *
 * Notes:
 *  - When showFilterPanel=false only the main search input is rendered
 *  - Outside-click detection uses composedPath() instead of contains(e.target) so that
 *    clicking a SearchableSelect option (which removes the <li> from the DOM synchronously
 *    via React 18's event flush) does not accidentally close the filter panel
 *  - 'select' fields use SearchableSelect — onChange receives the raw option value
 *    (string if options are string[], otherwise the optionValue field's type)
 *  - 'date' fields use the custom DatePicker component (no external libraries)
 *  - 'daterange' fields use the custom DateRangePicker component (no external libraries)
 */
import React, { useState, useRef, useEffect } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import DatePicker from '../datePicker/DatePicker'
import DateRangePicker from '../datePicker/DateRangePicker'
import SearchableSelect from '../select/SearchableSelect'

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
  inputWidth = 'min-w-[220px]',
}) => {
  const [showFilter, setShowFilter] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const filterRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Use composedPath() instead of contains(e.target) — when a SearchableSelect
      // option is clicked, React flushes setOpen(false) synchronously and removes
      // the <li> from the DOM before this document listener runs. contains() then
      // returns false (element gone) and wrongly closes the filter panel.
      // composedPath() captures the full event path at dispatch time, before any
      // DOM mutation, so it correctly identifies clicks inside the panel.
      const path = e.composedPath ? e.composedPath() : []
      if (filterRef.current && !path.includes(filterRef.current)) {
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
        className={`
          flex items-center bg-white border border-[#dde4ee] rounded-[8px]
          px-3 py-[8px] gap-2
          ${inputWidth}
          focus-within:border-[#01C9A4]
          focus-within:shadow-[0_0_0_3px_rgba(1,201,164,0.12)]
          transition-all duration-150
        `}
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
                    <SearchableSelect
                      value={filters[field.key]}
                      onChange={(v) => handleFieldChange(field.key, v)}
                      options={(field.options || []).map((opt) => {
                        if (typeof opt === 'string') return { label: opt, value: opt }
                        // Support custom optionLabel / optionValue keys (e.g. {id, name} objects)
                        const lk = field.optionLabel || 'label'
                        const vk = field.optionValue || 'value'
                        return { label: opt[lk], value: opt[vk] }
                      })}
                      placeholder={`Select ${field.label}`}
                    />
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
