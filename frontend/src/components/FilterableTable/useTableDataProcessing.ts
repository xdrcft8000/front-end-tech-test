import { useMemo, useCallback } from 'react';
import type {
  UseTableDataProcessingParams,
  UseTableDataProcessingResult,
  ColumnConfig,
  GroupedDataItem,
} from './types';
import { FILTER_ALL } from './types';

export function useTableDataProcessing<T>({
  data,
  filters,
  sortColumn,
  sortDirection,
  searchTerm,
  columns,
  searchFields,
  groupBy,
}: UseTableDataProcessingParams<T>): UseTableDataProcessingResult<T> {
  const getColumnConfig = useCallback(
    (key: string): ColumnConfig<T> | undefined =>
      columns.find((col) => col.key === key),
    [columns]
  );

  const processedData = useMemo(() => {
    let result = data;

    for (const filter of filters) {
      if (filter.value === FILTER_ALL) continue;

      const column = getColumnConfig(filter.key);
      if (!column?.filterConfig) continue;

      result = result.filter((item) => {
        const itemValue = column.filterConfig!.getValue(item);

        switch (column.filterConfig!.type) {
          case 'enum':
            return itemValue === filter.value;
          case 'boolean':
            return String(itemValue) === filter.value;
          case 'array-includes':
            return Array.isArray(itemValue) && itemValue.includes(filter.value);
          default:
            return true;
        }
      });
    }

    if (searchTerm && searchFields.length > 0) {
      const query = searchTerm.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((getField) => {
          const value = getField(item);
          return value?.toLowerCase().includes(query);
        })
      );
    }

    if (sortColumn) {
      const column = getColumnConfig(sortColumn);
      if (column?.sortMethod) {
        result = [...result].sort((a, b) => {
          const comparison = column.sortMethod!(a, b);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [
    data,
    filters,
    searchTerm,
    searchFields,
    sortColumn,
    sortDirection,
    getColumnConfig,
  ]);

  const groupedData = useMemo((): GroupedDataItem<T>[] | null => {
    if (!groupBy) return null;

    const column = getColumnConfig(groupBy);
    if (!column?.groupConfig) return null;

    const groups = new Map<string, T[]>();

    for (const item of processedData) {
      const key = column.groupConfig.getGroupKey(item);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    const sortFn =
      column.groupConfig.sortGroups ??
      ((a: string, b: string) => a.localeCompare(b));

    return Array.from(groups.entries())
      .sort(([keyA], [keyB]) => sortFn(keyA, keyB))
      .map(([key, items]) => ({
        key,
        label: column.groupConfig!.getGroupLabel?.(key) ?? key,
        renderHeader: column.groupConfig!.renderGroupHeader,
        items,
      }));
  }, [groupBy, processedData, getColumnConfig]);

  return { processedData, groupedData };
}
