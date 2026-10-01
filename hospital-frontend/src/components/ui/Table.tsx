import React from 'react';
import { clsx } from 'clsx';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { id?: number | string }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-subtle">
      <table className="w-full text-left text-sm text-slate-700 border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={clsx('px-4 py-3.5', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="px-4 py-4">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr
                key={row.id || rIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={clsx(
                  'transition-colors hover:bg-slate-50/80',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className={clsx('px-4 py-3.5 align-middle', col.className)}>
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                      ? (row[col.accessorKey] as any)
                      : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
