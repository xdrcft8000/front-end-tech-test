import { useMemo, useCallback } from 'react';
import { ListFilter, ChevronDown, X, Search, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useFilterableTable } from './useFilterableTable';
import type { ActiveFilter, ColumnConfig } from './types';
import { FILTER_ALL } from './types';

export function TableControls<T>() {
  const {
    filters,
    columns,
    rawData,
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
    actions,
  } = useFilterableTable<T>();

  const filterableColumns = useMemo(
    () => columns.filter((col) => col.filterConfig),
    [columns]
  );

  const availableFilterColumns = useMemo(
    () =>
      filterableColumns.filter(
        (col) =>
          !col.filterConfig?.defaultLabel &&
          !filters.some((f) => f.key === col.key)
      ),
    [filterableColumns, filters]
  );

  const optionsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const column of filterableColumns) {
      if (column.filterConfig) {
        map.set(column.key, column.filterConfig.getOptions(rawData));
      }
    }
    return map;
  }, [rawData, filterableColumns]);

  const getFilterOptions = useCallback(
    (key: string) => optionsMap.get(key) ?? [],
    [optionsMap]
  );

  const getColumnConfig = useCallback(
    (key: string): ColumnConfig<T> | undefined =>
      columns.find((col) => col.key === key),
    [columns]
  );

  const getFilterDisplayValue = useCallback(
    (filter: ActiveFilter): string => {
      const column = getColumnConfig(filter.key);
      if (filter.value === FILTER_ALL && column?.filterConfig?.defaultLabel) {
        return column.filterConfig.defaultLabel;
      }
      if (column?.filterConfig?.formatValue) {
        return column.filterConfig.formatValue(filter.value);
      }
      if (column?.filterConfig?.type === 'boolean') {
        return filter.value === 'true' ? 'Yes' : 'No';
      }
      return filter.value;
    },
    [getColumnConfig]
  );

  const getFilterOptionLabel = useCallback(
    (key: string, value: string): React.ReactNode => {
      const column = getColumnConfig(key);
      if (column?.filterConfig?.formatOptionLabel) {
        return column.filterConfig.formatOptionLabel(value);
      }
      if (column?.filterConfig?.type === 'boolean') {
        return value === 'true' ? 'Yes' : 'No';
      }
      return value;
    },
    [getColumnConfig]
  );

  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter) => {
          const column = getColumnConfig(filter.key);
          const isDefaultFilter = !!column?.filterConfig?.defaultLabel;
          return (
            <div key={filter.key} className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-1.5 h-8',
                      !isDefaultFilter && 'rounded-r-none border-r-0'
                    )}
                  >
                    {column?.filterConfig?.icon}
                    {filter.value !== FILTER_ALL && (
                      <span className="text-muted-foreground">
                        {column?.filterConfig?.label}:
                      </span>
                    )}
                    {getFilterDisplayValue(filter)}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {isDefaultFilter && (
                    <DropdownMenuItem
                      onClick={() => addFilter(filter.key, FILTER_ALL)}
                    >
                      {column?.filterConfig?.defaultLabel}
                    </DropdownMenuItem>
                  )}
                  {getFilterOptions(filter.key).map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => addFilter(filter.key, option)}
                    >
                      {getFilterOptionLabel(filter.key, option)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {!isDefaultFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 rounded-l-none"
                  onClick={() => removeFilter(filter.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}

        {availableFilterColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8">
                <ListFilter className="h-4 w-4" />
                Add filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {availableFilterColumns.map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  className="gap-2"
                  onClick={() => {
                    const options = getFilterOptions(col.key);
                    if (options.length > 0) {
                      addFilter(col.key, options[0]);
                    }
                  }}
                >
                  {col.filterConfig?.icon}
                  {col.filterConfig?.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {hasActiveFiltersOrGroups && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-8"
            onClick={resetFiltersAndGroups}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {searchable &&
          (isSearchOpen ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9 pr-9"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 h-9 w-9 -translate-y-1/2 hover:bg-transparent"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchTerm('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              Find
            </Button>
          ))}
        {groupableColumns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                {selectedGroupColumn ? (
                  <>
                    Group:
                    <span className="font-normal">
                      {selectedGroupColumn.header}
                    </span>
                  </>
                ) : (
                  'Group'
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="absolute right-0">
              <DropdownMenuItem onClick={() => handleGroupByChange(null)}>
                None
              </DropdownMenuItem>
              {groupableColumns.map((col) => (
                <DropdownMenuItem
                  key={col.key}
                  onClick={() => handleGroupByChange(col.key)}
                >
                  {col.header}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {actions}
      </div>
    </div>
  );
}
