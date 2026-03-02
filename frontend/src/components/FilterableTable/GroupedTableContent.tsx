import { ChevronDown, ChevronRight } from 'lucide-react';
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
import { TruncatedCell } from '@/components/ui/TruncatedCell';
import { TablePagination } from './TablePagination';
import { useFilterableTable } from './useFilterableTable';

export function GroupedTableContent<T>() {
  const {
    groupedData,
    columns,
    collapsedGroups,
    toggleGroupCollapse,
    pageSize,
    getGroupPage,
    setGroupPage,
    handlePageSizeChange,
    getSortDirection,
    handleSort,
    onRowClick,
    rowClassName,
    getRowKey,
  } = useFilterableTable<T>();

  if (!groupedData) return null;

  return (
    <div className="space-y-4">
      {groupedData.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        const currentPage = getGroupPage(group.key);
        const totalItems = group.items.length;
        const totalPages = Math.ceil(totalItems / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const paginatedItems = group.items.slice(
          startIndex,
          startIndex + pageSize
        );

        return (
          <div key={group.key}>
            <div className="rounded-lg overflow-hidden bg-card border border-border">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent cursor-pointer transition-colors"
                onClick={() => toggleGroupCollapse(group.key)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
                {group.renderHeader ? (
                  group.renderHeader(group.key)
                ) : (
                  <span className="font-semibold text-lg">{group.label}</span>
                )}
              </button>
              {!isCollapsed && (
                <div className="overflow-x-auto">
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
                            <TableHead
                              key={column.key}
                              className={column.width}
                            >
                              {column.header}
                            </TableHead>
                          )
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.map((item) => (
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
                                  tooltipContent={column.getTooltipContent?.(
                                    item
                                  )}
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
              )}
            </div>
            {!isCollapsed && totalItems > pageSize && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={(page) => setGroupPage(group.key, page)}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
