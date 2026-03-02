import { useContext } from 'react';
import {
  FilterableTableContext,
  type FilterableTableContextValue,
} from './FilterableTableContext';

export function useFilterableTable<T>(): FilterableTableContextValue<T> {
  const context = useContext(FilterableTableContext);
  if (!context) {
    throw new Error(
      'useFilterableTable must be used within a FilterableTableProvider'
    );
  }
  return context as FilterableTableContextValue<T>;
}
