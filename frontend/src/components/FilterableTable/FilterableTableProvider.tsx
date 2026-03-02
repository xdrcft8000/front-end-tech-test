import {
  FilterableTableContext,
  type FilterableTableContextValue,
} from './FilterableTableContext';

export function FilterableTableProvider<T>({
  children,
  value,
}: {
  children: React.ReactNode;
  value: FilterableTableContextValue<T>;
}) {
  return (
    <FilterableTableContext.Provider
      value={value as FilterableTableContextValue<unknown>}
    >
      {children}
    </FilterableTableContext.Provider>
  );
}
