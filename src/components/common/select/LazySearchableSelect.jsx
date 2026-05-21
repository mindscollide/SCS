/**
 * src/components/common/select/LazySearchableSelect.jsx
 * ======================================================
 * Server-driven searchable dropdown with infinite scroll pagination.
 *
 * Unlike SearchableSelect (which filters a pre-loaded list client-side),
 * this component delegates filtering AND pagination to the caller via `fetchFn`.
 *
 * Props:
 *  value            {string|number}  — controlled selected value
 *  onChange         {Function}       — called with (value, fullOption) on selection.
 *                                      fullOption is the full item object returned by fetchFn.
 *                                      Deselect emits onChange('', null).
 *  fetchFn          {Function}       — async (search: string, page: number) =>
 *                                        { items: [{label, value, ...extra}], totalCount: number }
 *  pageSize         {number}         — page size to pass to fetchFn (default: 10)
 *  selectedLabel    {string}         — display label for the currently selected value.
 *                                      Required when the selected item may not be in the
 *                                      currently loaded page (e.g. after page reload).
 *  excludeValues    {Array}          — values to hide from the dropdown list
 *  placeholder      {string}
 *  label            {string}
 *  required         {boolean}
 *  error            {boolean}
 *  errorMessage     {string}
 *  disabled         {boolean}
 *  className        {string}
 *  bgColor          {string}
 *  borderColor      {string}
 *  focusBorderColor {string}
 *  textColor        {string}
 *  arrowColor       {string}
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'

const LazySearchableSelect = ({
  value,
  onChange,
  fetchFn,
  pageSize         = 10,
  selectedLabel    = '',
  excludeValues    = [],
  placeholder      = '-- Select --',
  label            = '',
  required         = false,
  error            = false,
  errorMessage     = '',
  disabled         = false,
  className        = '',
  bgColor          = '#ffffff',
  borderColor      = '#e2e8f0',
  focusBorderColor = '#01C9A4',
  textColor        = '#041E66',
  arrowColor       = '#a0aec0',
}) => {
  const [open,        setOpen]        = useState(false)
  const [query,       setQuery]       = useState('')
  const [options,     setOptions]     = useState([])
  const [totalCount,  setTotalCount]  = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const wrapperRef     = useRef(null)
  const inputRef       = useRef(null)
  const sentinelRef    = useRef(null)
  const queryRef       = useRef('')
  const pageRef        = useRef(0)
  const debounceTimer  = useRef(null)
  const observerRef    = useRef(null)

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (searchText, pageNum, append = false) => {
      if (append) setLoadingMore(true)
      else        setLoading(true)

      try {
        const result = await fetchFn(searchText, pageNum, pageSize)
        const items  = Array.isArray(result?.items) ? result.items : []

        setOptions((prev) => (append ? [...prev, ...items] : items))
        setTotalCount(result?.totalCount ?? 0)
        pageRef.current = pageNum
      } catch {
        // silent — caller may show a toast
      } finally {
        if (append) setLoadingMore(false)
        else        setLoading(false)
      }
    },
    [fetchFn, pageSize]
  )

  // ── Open ────────────────────────────────────────────────────────────────────
  const openDropdown = useCallback(() => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    queryRef.current = ''
    pageRef.current  = 0
    fetchPage('', 0, false)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }, [disabled, fetchPage])

  // ── Search (debounced 300 ms) ────────────────────────────────────────────────
  const handleQueryChange = (val) => {
    setQuery(val)
    queryRef.current = val
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      pageRef.current = 0
      fetchPage(val, 0, false)
    }, 300)
  }

  // ── IntersectionObserver — load more when sentinel is visible ───────────────
  useEffect(() => {
    if (!open || !sentinelRef.current) return

    observerRef.current?.disconnect()
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        setOptions((current) => {
          setTotalCount((total) => {
            const visible = current.filter((o) => !excludeValues.includes(o.value))
            if (visible.length < total && !loadingMore && !loading) {
              const next = pageRef.current + 1
              fetchPage(queryRef.current, next, true)
            }
            return total
          })
          return current
        })
      },
      { root: null, threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    observerRef.current = observer
    return () => observer.disconnect()
  }, [open, loading, loadingMore, excludeValues, fetchPage])

  // ── Outside click ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handleOutside = (e) => {
      const path = e.composedPath ? e.composedPath() : []
      if (wrapperRef.current && !path.includes(wrapperRef.current)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // ── Cleanup debounce on unmount ──────────────────────────────────────────────
  useEffect(() => () => clearTimeout(debounceTimer.current), [])

  // ── Select / Clear ──────────────────────────────────────────────────────────
  const handleSelect = (opt) => {
    onChange(opt.value, opt)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('', null)
    setOpen(false)
    setQuery('')
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const visibleOptions   = options.filter((o) => !excludeValues.includes(o.value))
  const hasMore          = visibleOptions.length < totalCount
  const displayLabel     = selectedLabel || visibleOptions.find((o) => String(o.value) === String(value))?.label || ''
  const baseBorderColor  = error ? '#f87171' : borderColor
  const baseArrowColor   = error ? '#f87171' : arrowColor

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {label && (
        <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className={`relative ${error && errorMessage ? 'pb-4' : ''}`}>
        {/* ── Closed: trigger ── */}
        {!open && (
          <div
            onClick={openDropdown}
            className={`w-full flex items-center justify-between
              px-3 py-[10px] pr-9 rounded-lg text-[13px]
              border outline-none cursor-pointer transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${error ? 'border-red-400 bg-white' : ''}`}
            style={
              error
                ? {}
                : {
                    backgroundColor: bgColor,
                    borderColor: baseBorderColor,
                    color: displayLabel ? textColor : '#a0aec0',
                  }
            }
          >
            <span className="truncate">
              {displayLabel || <span style={{ color: '#a0aec0' }}>{placeholder}</span>}
            </span>
          </div>
        )}

        {/* ── Open: search + list ── */}
        {open && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              placeholder="Search…"
              className={`w-full px-3 py-[10px] pr-9 rounded-lg text-[13px]
                border outline-none transition-all
                ${error ? 'border-red-400 bg-white' : ''}`}
              style={
                error
                  ? { color: textColor }
                  : {
                      backgroundColor: bgColor,
                      borderColor: focusBorderColor,
                      color: textColor,
                    }
              }
            />

            <ul
              className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-slate-200
                         bg-white shadow-lg overflow-y-auto max-h-52 py-1"
              style={{ top: '100%' }}
            >
              {/* Clear selection */}
              {!!value && (
                <li
                  onMouseDown={handleClear}
                  className="px-3 py-2 text-[12px] text-slate-400 italic cursor-pointer
                             hover:bg-slate-50 transition-colors"
                >
                  — Clear selection —
                </li>
              )}

              {/* Loading spinner (first fetch) */}
              {loading && (
                <li className="flex justify-center py-5">
                  <div className="w-4 h-4 border-2 border-[#01C9A4]/30 border-t-[#01C9A4] rounded-full animate-spin" />
                </li>
              )}

              {/* Empty */}
              {!loading && visibleOptions.length === 0 && (
                <li className="px-3 py-2 text-[12px] text-slate-400 italic">No options found</li>
              )}

              {/* Options */}
              {!loading && visibleOptions.map((o) => {
                const isSelected = String(o.value) === String(value)
                return (
                  <li
                    key={o.value}
                    onMouseDown={() => handleSelect(o)}
                    className={`px-3 py-[9px] text-[13px] cursor-pointer transition-colors
                      ${
                        isSelected
                          ? 'bg-[#01C9A4]/10 text-[#01C9A4] font-semibold'
                          : 'text-[#041E66] hover:bg-slate-50'
                      }`}
                  >
                    {o.label}
                  </li>
                )
              })}

              {/* Sentinel — triggers next page load */}
              {!loading && hasMore && <li ref={sentinelRef} className="h-px" />}

              {/* Load-more spinner */}
              {loadingMore && (
                <li className="flex justify-center py-2">
                  <div className="w-4 h-4 border-2 border-[#01C9A4]/30 border-t-[#01C9A4] rounded-full animate-spin" />
                </li>
              )}
            </ul>
          </>
        )}

        {/* Arrow */}
        {!open && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ color: baseArrowColor }}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Error message */}
        {error && errorMessage && (
          <p className="absolute top-full left-0 mt-1 text-[11px] text-red-500 font-medium">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  )
}

export default LazySearchableSelect
