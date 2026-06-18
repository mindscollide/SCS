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

import { useEffect, useRef, useState } from 'react'

// const useInfiniteScroll = ({ sentinelRef, hasMore, loading, onLoadMore, scrollRef }) => {
//   const stateRef = useRef({ hasMore, loading, onLoadMore })
//   stateRef.current = { hasMore, loading, onLoadMore }

//   useEffect(() => {
//     const sentinel = sentinelRef?.current
//     if (!sentinel) return

//     const root = scrollRef?.current ?? null

//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         if (!entry.isIntersecting) return
//         const { hasMore: hm, loading: ld, onLoadMore: fn } = stateRef.current
//         if (ld || !hm) return
//         fn?.()
//       },
//       {
//         root,
//         threshold: 0, // fire as soon as 1px is visible
//         rootMargin: '0px 0px 120px 0px', // trigger 120px before sentinel enters view
//       }
//     )

//     observer.observe(sentinel)
//     return () => observer.disconnect()
//   }, [sentinelRef, scrollRef])

//   // ── Re-observe after each load completes ─────────────────────────────────
//   // When loading flips from true → false, the sentinel may still be visible
//   // but the observer won't re-fire (it only fires on *entry*). We disconnect
//   // and reconnect to force a fresh intersection check.
//   useEffect(() => {
//     if (loading) return // only act when loading ends
//     const sentinel = sentinelRef?.current
//     if (!sentinel) return
//     const root = scrollRef?.current ?? null

//     const observer = new IntersectionObserver(
//       ([entry]) => {
//         if (!entry.isIntersecting) return
//         const { hasMore: hm, loading: ld, onLoadMore: fn } = stateRef.current
//         if (ld || !hm) return
//         fn?.()
//       },
//       { root, threshold: 0, rootMargin: '0px 0px 120px 0px' }
//     )

//     observer.observe(sentinel)
//     return () => observer.disconnect()
//   }, [loading, sentinelRef, scrollRef])
// }
const useInfiniteScroll = ({ sentinelRef, hasMore, loading, onLoadMore, scrollRef }) => {
  const stateRef = useRef({ hasMore, loading, onLoadMore })
  stateRef.current = { hasMore, loading, onLoadMore }

  // Track completed loads to force re-observe
  const [loadVersion, setLoadVersion] = useState(0)

  useEffect(() => {
    if (!loading) {
      setLoadVersion((v) => v + 1) // trigger re-observe when load finishes
    }
  }, [loading])

  useEffect(() => {
    const sentinel = sentinelRef?.current
    if (!sentinel) return

    const root = scrollRef?.current ?? null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const { hasMore: hm, loading: ld, onLoadMore: fn } = stateRef.current
        if (ld || !hm) return
        fn?.()
      },
      { root, threshold: 0, rootMargin: '0px 0px 120px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinelRef, scrollRef, loadVersion]) // re-observe after each load completes
}
export default useInfiniteScroll
