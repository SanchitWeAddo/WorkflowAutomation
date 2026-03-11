import clsx from 'clsx';
import { ArrowUp, ArrowDown, ArrowUpDown, Inbox } from 'lucide-react';
import Spinner from './Spinner';

export default function Table({
  columns,
  data = [],
  sortBy,
  sortOrder,
  onSort,
  loading = false,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no items to display.',
  className,
  rowKey = 'id',
  onRowClick,
}) {
  const renderSortIcon = (column) => {
    if (!column.sortable) return null;
    if (sortBy !== column.key) {
      return <ArrowUpDown size={14} className="text-gray-300" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} className="text-brand" />
    ) : (
      <ArrowDown size={14} className="text-brand" />
    );
  };

  const handleSort = (column) => {
    if (!column.sortable || !onSort) return;
    const newOrder =
      sortBy === column.key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newOrder);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox size={40} className="text-gray-300 mb-3" />
        <h3 className="text-sm font-medium text-gray-900">{emptyTitle}</h3>
        <p className="mt-1 text-sm text-gray-500">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                  col.className,
                )}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => handleSort(col)}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {renderSortIcon(col)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, rowIdx) => (
            <tr
              key={row[rowKey] ?? rowIdx}
              className={clsx(
                'hover:bg-gray-50/50 transition-colors',
                onRowClick && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx('px-4 py-3 text-gray-700', col.cellClassName)}
                >
                  {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
