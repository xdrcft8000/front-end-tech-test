import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TruncatedCell } from '@/components/ui/TruncatedCell';
import { TablePagination } from './TablePagination';
import { useFilterableTable } from './useFilterableTable';

export function SimpleTableContent<T>() {
  const {
    columns,
    processedData,
    isLoading,
    getSortDirection,
    handleSort,
    onRowClick,
    rowClassName,
    getRowKey,
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
  } = useFilterableTable<T>();

  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <div className="rounded-lg overflow-x-auto bg-card border border-border">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              {columns.map((column) =>
                column.sortMethod ? (
                  <SortableTableHead
                    key={column.key}
                    className={column.width}
                    sortDirection={getSortDirection(column.key)}
                    onSort={() => handleSort(column.key)}
                  >
                    {column.header}
                  </SortableTableHead>
                ) : (
                  <TableHead key={column.key} className={column.width}>
                    {column.header}
                  </TableHead>
                )
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.width}>
                        <Skeleton className="h-10 w-full max-w-[200px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : paginatedData.map((item) => (
                  <TableRow
                    key={getRowKey(item)}
                    className={cn(
                      'bg-card',
                      onRowClick && 'cursor-pointer hover:bg-muted/50',
                      rowClassName?.(item)
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(column.width, column.className)}
                      >
                        {column.truncate ? (
                          <TruncatedCell
                            tooltipContent={column.getTooltipContent?.(item)}
                          >
                            {column.render(item)}
                          </TruncatedCell>
                        ) : (
                          column.render(item)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {!isLoading && totalItems > pageSize && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </>
  );
}
