import type { SortDirection } from '@/components/ui/table';
import type { ActiveFilter } from './types';
import { FILTER_ALL } from './types';

export interface UrlTableState {
  filters: ActiveFilter[];
  sortColumn: string | null;
  sortDirection: SortDirection;
  searchTerm: string;
  groupBy: string | null;
}

export interface ParseUrlStateOptions {
  validFilterKeys: string[];
  validSortKeys: string[];
  validGroupKeys: string[];
}

const FILTER_PREFIX = 'filter.';
const SORT_PARAM = 'sort';
const ORDER_PARAM = 'order';
const SEARCH_PARAM = 'q';
const GROUP_PARAM = 'group';

export function parseUrlState(
  searchParams: URLSearchParams,
  options: ParseUrlStateOptions
): Partial<UrlTableState> {
  const state: Partial<UrlTableState> = {};

  const filters: ActiveFilter[] = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith(FILTER_PREFIX)) {
      const filterKey = key.slice(FILTER_PREFIX.length);
      if (options.validFilterKeys.includes(filterKey) && value) {
        filters.push({ key: filterKey, value });
      }
    }
  });
  if (filters.length > 0) {
    state.filters = filters;
  }

  const sortColumn = searchParams.get(SORT_PARAM);
  if (sortColumn && options.validSortKeys.includes(sortColumn)) {
    state.sortColumn = sortColumn;
    const order = searchParams.get(ORDER_PARAM);
    state.sortDirection = order === 'desc' ? 'desc' : 'asc';
  }

  const searchTerm = searchParams.get(SEARCH_PARAM);
  if (searchTerm) {
    state.searchTerm = searchTerm;
  }

  const groupBy = searchParams.get(GROUP_PARAM);
  if (groupBy && options.validGroupKeys.includes(groupBy)) {
    state.groupBy = groupBy;
  }

  return state;
}

export function serializeUrlState(
  state: UrlTableState,
  existingParams: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams();

  existingParams.forEach((value, key) => {
    if (
      !key.startsWith(FILTER_PREFIX) &&
      key !== SORT_PARAM &&
      key !== ORDER_PARAM &&
      key !== SEARCH_PARAM &&
      key !== GROUP_PARAM
    ) {
      params.set(key, value);
    }
  });

  for (const filter of state.filters) {
    if (filter.value && filter.value !== FILTER_ALL) {
      params.set(`${FILTER_PREFIX}${filter.key}`, filter.value);
    }
  }

  if (state.sortColumn) {
    params.set(SORT_PARAM, state.sortColumn);
    if (state.sortDirection === 'desc') {
      params.set(ORDER_PARAM, 'desc');
    }
  }

  if (state.searchTerm) {
    params.set(SEARCH_PARAM, state.searchTerm);
  }

  if (state.groupBy) {
    params.set(GROUP_PARAM, state.groupBy);
  }

  return params;
}
