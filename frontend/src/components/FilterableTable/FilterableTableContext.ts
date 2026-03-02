import { createContext } from 'react';
import type { SortDirection } from '@/components/ui/table';
import type { ColumnConfig, ActiveFilter, GroupedDataItem } from './types';

export interface FilterableTableContextValue<T> {
  columns: ColumnConfig<T>[];
  rawData: T[];
  processedData: T[];
  groupedData: GroupedDataItem<T>[] | null;
  isLoading: boolean;

  getSortDirection: (columnKey: string) => SortDirection;
  handleSort: (columnKey: string) => void;

  currentPage: number;
  pageSize: number;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;

  getGroupPage: (groupKey: string) => number;
  setGroupPage: (groupKey: string, page: number) => void;
  collapsedGroups: Set<string>;
  toggleGroupCollapse: (groupKey: string) => void;

  filters: ActiveFilter[];
  addFilter: (key: string, value: string) => void;
  removeFilter: (key: string) => void;

  searchable: boolean;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchPlaceholder: string;

  groupableColumns: ColumnConfig<T>[];
  selectedGroupColumn: ColumnConfig<T> | null;
  handleGroupByChange: (key: string | null) => void;
  resetFiltersAndGroups: () => void;
  hasActiveFiltersOrGroups: boolean;

  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  getRowKey: (item: T) => string;
  actions?: React.ReactNode;
}

export const FilterableTableContext =
  createContext<FilterableTableContextValue<unknown> | null>(null);
