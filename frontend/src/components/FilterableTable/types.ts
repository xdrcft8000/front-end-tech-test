import type { SortDirection } from '@/components/ui/table';

export type FilterType = 'enum' | 'boolean' | 'array-includes';

export const FILTER_ALL = '__all__';

export interface FilterConfig<T> {
  type: FilterType;
  label: string;
  getOptions: (data: T[]) => string[];
  getValue: (item: T) => string | boolean | string[] | undefined;
  formatValue?: (value: string) => string;
  formatOptionLabel?: (value: string) => React.ReactNode;
  icon?: React.ReactNode;
  defaultLabel?: string;
}

export interface GroupConfig<T> {
  getGroupKey: (item: T) => string;
  getGroupLabel?: (key: string) => string;
  renderGroupHeader?: (key: string) => React.ReactNode;
  sortGroups?: (keyA: string, keyB: string) => number;
}

export interface ColumnConfig<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  filterConfig?: FilterConfig<T>;
  groupConfig?: GroupConfig<T>;
  sortMethod?: (a: T, b: T) => number;
  width?: string;
  className?: string;
  truncate?: boolean;
  getTooltipContent?: (item: T) => React.ReactNode;
}

export interface ActiveFilter {
  key: string;
  value: string;
}

export interface GroupedDataItem<T> {
  key: string;
  label: string;
  renderHeader?: (key: string) => React.ReactNode;
  items: T[];
}

export interface FilterableTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchFields?: ((item: T) => string | undefined)[];
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  getRowKey: (item: T) => string;
  actions?: React.ReactNode;
  pageSize?: number;
  onGroupChange?: (groupKey: string | null) => void;
  onVisibleDataChange?: (data: T[]) => void;
  syncWithUrl?: boolean;
  defaultSortColumnKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  defaultGroupBy?: string;
}

export interface UseTableDataProcessingParams<T> {
  data: T[];
  filters: ActiveFilter[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  searchTerm: string;
  columns: ColumnConfig<T>[];
  searchFields: ((item: T) => string | undefined)[];
  groupBy: string | null;
}

export interface UseTableDataProcessingResult<T> {
  processedData: T[];
  groupedData: GroupedDataItem<T>[] | null;
}
