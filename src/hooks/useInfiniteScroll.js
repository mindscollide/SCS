/**
 * src/hooks/useInfiniteScroll.js
 * ================================
 * Reusable IntersectionObserver-based infinite scroll hook.
 *
 * Observes a sentinel element and calls onLoadMore when it scrolls into view,
 * guarded by hasMore and loading so it never double-fires or over-fetches.
 *
 * @param {object}   options
 * @param {Ref}      options.sentinelRef  — ref on the 1px sentinel div placed after the list
 * @param {boolean}  options.hasMore      — true while server still has more records
 * @param {boolean}  options.loading      — true while a page fetch is in progress
 * @param {Function} options.onLoadMore   — stable callback (use useCallback) — called when
 *                                          sentinel enters view and guards pass
 * @param {Ref}      [options.scrollRef]  — optional ref on the scroll container; when provided
 *                                          the observer uses it as root so it fires on container
 *                                          scroll rather than page scroll (required for tables
 *                                          with a fixed-height scrollable body)
 *
 * Usage
 * ─────
 *   const sentinelRef   = useRef(null)
 *   const scrollRef     = useRef(null)
 *   const stateRef      = useRef({})            // keep page / filters fresh
 *   stateRef.current    = { page, applied }
 *
 *   const handleLoadMore = useCallback(() => {
 *     const { page: p, applied: ap } = stateRef.current
 *     setPage(p + 1)
 *     fetchData(ap, p + 1, true)
 *   }, [fetchData])
 *
 *   useInfiniteScroll({
 *     sentinelRef,
 *     scrollRef,                               // pass table's scroll container ref
 *     hasMore: items.length < totalCount,
 *     loading: loadingMore,
 *     onLoadMore: handleLoadMore,
 *   })
 *
 *   // Inside JSX (inside the scroll container):
 *   <div ref={sentinelRef} className="h-px" />
 */

import { useEffect, useRef } from 'react'

const useInfiniteScroll = ({ sentinelRef, hasMore, loading, onLoadMore, scrollRef }) => {
  // Keep a mutable ref so the observer closure always reads the latest values
  // without needing to recreate the observer on every render.
  const stateRef = useRef({ hasMore, loading, onLoadMore })
  stateRef.current = { hasMore, loading, onLoadMore }

  useEffect(() => {
    const sentinel = sentinelRef?.current
    if (!sentinel) return

    // Use the scroll container as root when provided — this makes the observer
    // fire relative to the container's visible area, not the page viewport.
    // Required when the table has its own overflow-auto scroll box.
    const root = scrollRef?.current ?? null

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const { hasMore: hm, loading: ld, onLoadMore: fn } = stateRef.current
        if (ld || !hm) return   // guard: still loading or nothing left
        fn?.()
      },
      { root, threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinelRef, scrollRef]) // refs are stable — observer created once
}

export default useInfiniteScroll
