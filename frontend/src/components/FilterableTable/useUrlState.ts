import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortDirection } from '@/components/ui/table';
import type { ColumnConfig, ActiveFilter } from './types';
import {
  parseUrlState,
  serializeUrlState,
  type UrlTableState,
  type ParseUrlStateOptions,
} from './urlStateUtils';

interface UseUrlStateOptions<T> {
  columns: ColumnConfig<T>[];
  enabled: boolean;
}

interface UseUrlStateResult {
  initialFilters: ActiveFilter[] | undefined;
  initialSortColumn: string | null | undefined;
  initialSortDirection: SortDirection | undefined;
  initialSearchTerm: string | undefined;
  initialGroupBy: string | null | undefined;
  syncToUrl: (state: UrlTableState) => void;
}

export function useUrlState<T>({
  columns,
  enabled,
}: UseUrlStateOptions<T>): UseUrlStateResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSyncDone = useRef(false);

  const parseOptions: ParseUrlStateOptions = useMemo(
    () => ({
      validFilterKeys: columns
        .filter((col) => col.filterConfig)
        .map((col) => col.key),
      validSortKeys: columns
        .filter((col) => col.sortMethod)
        .map((col) => col.key),
      validGroupKeys: columns
        .filter((col) => col.groupConfig)
        .map((col) => col.key),
    }),
    [columns]
  );

  const initialState = useMemo(() => {
    if (!enabled) return {};
    return parseUrlState(searchParams, parseOptions);
  }, [enabled, searchParams, parseOptions]);

  const syncToUrl = useCallback(
    (state: UrlTableState) => {
      if (!enabled) return;

      if (!initialSyncDone.current) {
        initialSyncDone.current = true;
        return;
      }

      const newParams = serializeUrlState(state, searchParams);
      setSearchParams(newParams, { replace: true });
    },
    [enabled, searchParams, setSearchParams]
  );

  return {
    initialFilters: initialState.filters,
    initialSortColumn: initialState.sortColumn,
    initialSortDirection: initialState.sortDirection,
    initialSearchTerm: initialState.searchTerm,
    initialGroupBy: initialState.groupBy,
    syncToUrl,
  };
}
