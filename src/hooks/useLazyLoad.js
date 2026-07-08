/**
 * src/hooks/useLazyLoad.js
 * ==========================
 * Minimal reusable lazy-load hook for offset-based pagination.
 *
 * Logic (matches all ServiceManager paginated APIs):
 *   • First call  : PageNumber = 0
 *   • Each reload : PageNumber = records already loaded  (data.length / rawFetched)
 *   • Stop        : when data.length >= totalCount  →  hasMore = false
 *
 * The hook owns only:
 *   loadingMore  — true while a load-more fetch is in flight
 *   sentinelRef  — attach to a 1px div at the bottom of the scroll container
 *   scrollRef    — attach to the scroll container (CommonTable's scrollRef prop)
 *
 * totalCount and the data array stay in the component so the component
 * controls the stop condition via the `offset` and `total` props.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *   const [items,      setItems]      = useState([])
 *   const [totalCount, setTotalCount] = useState(0)
 *   const [loadingInitial, setLoadingInitial] = useState(true)
 *
 *   const { sentinelRef, scrollRef, loadingMore, setLoadingMore } = useLazyLoad({
 *     offset:         loadedPages,   // next PageNumber (page-index, not record offset)
 *     total:          Math.ceil(totalCount / PAGE_SIZE),
 *     onLoadMore:     (nextPage) => fetchData(ap, nextPage, true),
 *     initialLoading: loadingInitial, // pass so the observer re-fires after initial load
 *   })
 *
 *   const fetchData = useCallback(async (pageNumber = 0, append = false) => {
 *     if (append) setLoadingMore(true)
 *     const res = await api({ PageNumber: pageNumber, PageSize: 10 })
 *     if (append) setLoadingMore(false)
 *     const rows  = res.data?.rows  || []
 *     const total = res.data?.total ?? 0
 *     setItems(prev => append ? [...prev, ...rows] : rows)
 *     setTotalCount(total)
 *   }, [setLoadingMore])
 *
 *   // In JSX — pass to CommonTable:
 *   <CommonTable
 *     scrollable
 *     scrollRef={scrollRef}
 *     footerSlot={
 *       <>
 *         <div ref={sentinelRef} className="h-px" />
 *         {loadingMore && <Spinner />}
 *         {!loadingMore && items.length >= totalCount && totalCount > 0 && (
 *           <p className="text-center text-[12px] text-slate-400 py-3">All records loaded</p>
 *         )}
 *       </>
 *     }
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useCallback } from 'react'
import useInfiniteScroll from './useInfiniteScroll'

/**
 * @param {object}   options
 * @param {number}   options.offset         — pages already loaded (loadedPages).
 *                                            Passed to onLoadMore as the next PageNumber.
 * @param {number}   options.total          — total page count (Math.ceil(totalCount / PAGE_SIZE)).
 *                                            hasMore = offset < total.
 * @param {Function} options.onLoadMore     — called with (offset) when sentinel enters view.
 *                                            No need for useCallback — the hook always reads
 *                                            the latest version via an internal liveRef.
 * @param {boolean}  [options.initialLoading=false] — when true, treated as "loading" by the
 *                                            observer guard, same as loadingMore. Pass your
 *                                            loadingInitial state here so the observer re-fires
 *                                            after the initial/reset fetch completes and the
 *                                            sentinel is already in the viewport.
 */
const useLazyLoad = ({ offset, total, onLoadMore, initialLoading = false }) => {
  const [loadingMore, setLoadingMore] = useState(false)

  const sentinelRef = useRef(null)
  const scrollRef   = useRef(null)

  // Always-fresh snapshot — the IntersectionObserver callback reads from here
  // so it never holds a stale closure, even if onLoadMore is an inline lambda.
  const liveRef = useRef({})
  liveRef.current = { offset, onLoadMore }

  // hasMore = false as soon as all records are loaded → observer won't fire again
  const hasMore = offset < total

  // Stable trigger — created once; reads live offset + callback from liveRef
  const trigger = useCallback(() => {
    const { offset: o, onLoadMore: fn } = liveRef.current
    fn?.(o)
  }, [])

  useInfiniteScroll({
    sentinelRef,
    scrollRef,
    hasMore,
    // OR in initialLoading so the observer re-fires when the initial/reset fetch ends
    // (loadVersion increments on loading false→true transition in useInfiniteScroll).
    loading: loadingMore || initialLoading,
    onLoadMore: trigger,
  })

  return { sentinelRef, scrollRef, loadingMore, setLoadingMore }
}

export default useLazyLoad
