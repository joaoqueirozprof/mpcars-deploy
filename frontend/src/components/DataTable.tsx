import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface Column<T> {
  key: keyof T
  label: string
  width?: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  sortBy?: keyof T
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: keyof T) => void
}

const DataTable = React.forwardRef<HTMLDivElement, DataTableProps<any>>(
  (
    {
      columns,
      data,
      isLoading = false,
      emptyMessage = 'Nenhum dado encontrado',
      onRowClick,
      sortBy,
      sortOrder = 'asc',
      onSort,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="overflow-x-auto rounded-lg border border-neutral-200 bg-white card">
        <table className="w-full text-sm">
          {/* Header */}
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left font-semibold text-neutral-700 ${
                    column.width ? column.width : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && onSort && (
                      <button
                        onClick={() => onSort(column.key)}
                        className="p-1 hover:bg-neutral-200 rounded transition-colors"
                        aria-label={`Sort by ${column.label}`}
                      >
                        {sortBy === column.key ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp size={16} className="text-primary-600" />
                          ) : (
                            <ChevronDown size={16} className="text-primary-600" />
                          )
                        ) : (
                          <div className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-neutral-200 hover:bg-neutral-50">
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="px-6 py-4"
                    >
                      <div className="skeleton h-4 w-24 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                      <svg
                        className="w-6 h-6 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-neutral-600 font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b border-neutral-200 transition-colors duration-200 ${
                    onRowClick
                      ? 'hover:bg-primary-50 cursor-pointer'
                      : 'hover:bg-neutral-50'
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="px-6 py-4 text-neutral-700"
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] !== null && row[column.key] !== undefined
                        ? String(row[column.key])
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }
)

DataTable.displayName = 'DataTable'

export default DataTable
