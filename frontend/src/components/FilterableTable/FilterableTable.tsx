import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { SortDirection } from '@/components/ui/table';
import { useTableDataProcessing } from './useTableDataProcessing';
import { TableControls } from './TableControls';
import { SimpleTableContent } from './SimpleTableContent';
import { GroupedTableContent } from './GroupedTableContent';
import { FilterableTableProvider } from './FilterableTableProvider';
import type { FilterableTableContextValue } from './FilterableTableContext';
import type { FilterableTableProps, ActiveFilter } from './types';
import { FILTER_ALL } from './types';
import { useUrlState } from './useUrlState';

export function FilterableTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No data found',
  searchFields = [],
  searchPlaceholder = 'Search...',
  onRowClick,
  rowClassName,
  getRowKey,
  actions,
  pageSize: initialPageSize = 10,
  onGroupChange,
  onVisibleDataChange,
  syncWithUrl = false,
  defaultSortColumnKey,
  defaultSortDirection = 'asc',
  defaultGroupBy,
}: FilterableTableProps<T>) {
  const {
    initialFilters,
    initialSortColumn,
    initialSortDirection,
    initialSearchTerm,
    initialGroupBy,
    syncToUrl,
  } = useUrlState({ columns, enabled: syncWithUrl });

  const [filters, setFilters] = useState<ActiveFilter[]>(initialFilters ?? []);
  const [sortColumn, setSortColumn] = useState<string | null>(
    initialSortColumn ?? defaultSortColumnKey ?? null
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialSortDirection ?? defaultSortDirection
  );
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm ?? '');
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(initialSearchTerm));
  const [groupBy, setGroupBy] = useState<string | null>(
    initialGroupBy ?? defaultGroupBy ?? null
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [groupPages, setGroupPages] = useState<Map<string, number>>(new Map());
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const defaultsInitialized = useRef(false);
  const searchable = searchFields.length > 0;

  const handleGroupByChange = useCallback(
    (key: string | null) => {
      setGroupBy(key);
      setCollapsedGroups(new Set());
      setGroupPages(new Map());
      setCurrentPage(1);
      onGroupChange?.(key);
    },
    [onGroupChange]
  );

  const getGroupPage = useCallback(
    (groupKey: string) => groupPages.get(groupKey) ?? 1,
    [groupPages]
  );

  const setGroupPage = useCallback((groupKey: string, page: number) => {
    setGroupPages((prev) => {
      const next = new Map(prev);
      next.set(groupKey, page);
      return next;
    });
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setCurrentPageSize(size);
    setGroupPages(new Map());
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const groupableColumns = useMemo(
    () => columns.filter((col) => col.groupConfig),
    [columns]
  );

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (defaultsInitialized.current || data.length === 0) return;

    const urlFilterKeys = new Set(initialFilters?.map((f) => f.key) ?? []);

    const defaultFilters: ActiveFilter[] = [];
    for (const col of columns) {
      if (col.filterConfig?.defaultLabel && !urlFilterKeys.has(col.key)) {
        defaultFilters.push({ key: col.key, value: FILTER_ALL });
      }
    }

    if (defaultFilters.length > 0) {
      setFilters((prev) => [...prev, ...defaultFilters]);
    }
    defaultsInitialized.current = true;
  }, [data, columns, initialFilters]);

  useEffect(() => {
    syncToUrl({
      filters,
      sortColumn,
      sortDirection,
      searchTerm,
      groupBy,
    });
  }, [filters, sortColumn, sortDirection, searchTerm, groupBy, syncToUrl]);

  const addFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      const existingIndex = prev.findIndex((f) => f.key === key);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { key, value };
        return updated;
      }
      return [...prev, { key, value }];
    });
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => prev.filter((f) => f.key !== key));
  }, []);

  const resetFiltersAndGroups = useCallback(() => {
    const defaultFilters: ActiveFilter[] = columns
      .filter((col) => col.filterConfig?.defaultLabel)
      .map((col) => ({ key: col.key, value: FILTER_ALL }));
    setFilters(defaultFilters);
    setGroupBy(null);
    setSearchTerm('');
    setIsSearchOpen(false);
    setSortColumn(defaultSortColumnKey ?? null);
    setSortDirection(defaultSortDirection);
    setCurrentPage(1);
    setCollapsedGroups(new Set());
    setGroupPages(new Map());
  }, [columns, defaultSortColumnKey, defaultSortDirection]);

  const hasActiveFiltersOrGroups = useMemo(() => {
    const hasNonDefaultFilters = filters.some((f) => {
      const col = columns.find((c) => c.key === f.key);
      if (col?.filterConfig?.defaultLabel) {
        return f.value !== FILTER_ALL;
      }
      return true;
    });
    return hasNonDefaultFilters || groupBy !== null || searchTerm !== '';
  }, [filters, columns, groupBy, searchTerm]);

  const handleSort = useCallback(
    (columnKey: string) => {
      if (sortColumn === columnKey) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(columnKey);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  const getSortDirection = useCallback(
    (columnKey: string): SortDirection => {
      if (sortColumn !== columnKey) return null;
      return sortDirection;
    },
    [sortColumn, sortDirection]
  );

  const { processedData, groupedData } = useTableDataProcessing({
    data,
    filters,
    sortColumn,
    sortDirection,
    searchTerm,
    columns,
    searchFields,
    groupBy,
  });

  const visibleData = useMemo(
    () =>
      groupedData ? groupedData.flatMap((group) => group.items) : processedData,
    [processedData, groupedData]
  );

  const visibleDataRef = useRef<T[]>([]);
  useEffect(() => {
    if (onVisibleDataChange) {
      const currentKeys = visibleData.map((item) => getRowKey(item)).join(',');
      const prevKeys = visibleDataRef.current
        .map((item) => getRowKey(item))
        .join(',');
      if (currentKeys !== prevKeys) {
        visibleDataRef.current = visibleData;
        onVisibleDataChange(visibleData);
      }
    }
  }, [visibleData, onVisibleDataChange, getRowKey]);

  const selectedGroupColumn = groupBy
    ? (columns.find((col) => col.key === groupBy) ?? null)
    : null;

  const contextValue: FilterableTableContextValue<T> = useMemo(
    () => ({
      columns,
      rawData: data,
      processedData,
      groupedData,
      isLoading,
      getSortDirection,
      handleSort,
      currentPage,
      pageSize: currentPageSize,
      handlePageChange,
      handlePageSizeChange,
      getGroupPage,
      setGroupPage,
      collapsedGroups,
      toggleGroupCollapse,
      filters,
      addFilter,
      removeFilter,
      searchable,
      isSearchOpen,
      setIsSearchOpen,
      searchTerm,
      setSearchTerm,
      searchPlaceholder,
      groupableColumns,
      selectedGroupColumn,
      handleGroupByChange,
      resetFiltersAndGroups,
      hasActiveFiltersOrGroups,
      onRowClick,
      rowClassName,
      getRowKey,
      actions,
    }),
    [
      columns,
      data,
      processedData,
      groupedData,
      isLoading,
      getSortDirection,
      handleSort,
      currentPage,
      currentPageSize,
      handlePageChange,
      handlePageSizeChange,
      getGroupPage,
      setGroupPage,
      collapsedGroups,
      toggleGroupCollapse,
      filters,
      addFilter,
      removeFilter,
      searchable,
      isSearchOpen,
      searchTerm,
      searchPlaceholder,
      groupableColumns,
      selectedGroupColumn,
      handleGroupByChange,
      resetFiltersAndGroups,
      hasActiveFiltersOrGroups,
      onRowClick,
      rowClassName,
      getRowKey,
      actions,
    ]
  );

  return (
    <FilterableTableProvider value={contextValue}>
      <div className="space-y-4">
        <TableControls />

        {!isLoading && processedData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : groupedData ? (
          <GroupedTableContent />
        ) : (
          <SimpleTableContent />
        )}
      </div>
    </FilterableTableProvider>
  );
}
