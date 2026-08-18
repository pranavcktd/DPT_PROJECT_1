"use client";

import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 100, "All"] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/**
 * Client-side pagination over an already-fetched array (this app's list
 * pages fetch everything server-side and filter/search in the browser - see
 * SearchInput usage - so pagination slots into that same pattern rather than
 * adding page/limit query params). `page` is clamped to the valid range, so
 * a shrinking result set (e.g. from a search) never strands the user on an
 * empty page.
 */
export function usePagination<T>(items: T[], defaultPageSize: PageSize = 10) {
  const [pageSize, setPageSizeState] = useState<PageSize>(defaultPageSize);
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const effectivePageSize = pageSize === "All" ? Math.max(totalItems, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    if (pageSize === "All") return items;
    const start = (currentPage - 1) * effectivePageSize;
    return items.slice(start, start + effectivePageSize);
  }, [items, currentPage, effectivePageSize, pageSize]);

  function setPageSize(next: PageSize) {
    setPageSizeState(next);
    setPage(1);
  }

  return {
    pageItems,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    effectivePageSize,
  };
}
