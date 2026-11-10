import React from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => React.ReactNode
  className?: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
  striped?: boolean
  hoverable?: boolean
  className?: string
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado',
  loading = false,
  striped = true,
  hoverable = true,
  className = '',
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width, textAlign: col.align }}>
                  <div className="skeleton" style={{ height: '16px', width: '80%', borderRadius: 'var(--radius-sm)' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>
                    <div className="skeleton" style={{ height: '14px', width: '60%', borderRadius: 'var(--radius-sm)' }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p style={{ color: 'var(--color-text-secondary)' }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`table-container ${className}`}>
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                style={{ width: col.width, textAlign: col.align }}
                className={col.className}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              className={striped && index % 2 === 1 ? 'bg-[var(--color-bg-subtle)]' : ''}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  style={{ textAlign: col.align }}
                  className={col.className}
                >
                  {col.render ? col.render(row, index) : String((row as any)[col.key] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Pagination
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showPageSize?: boolean
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  totalItems?: number
}

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageSize = false,
  pageSize = 10,
  onPageSizeChange,
  totalItems,
}: PaginationProps) => {
  if (totalPages <= 1) return null

  const pages = React.useMemo(() => {
    const result: (number | string)[] = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    for (let i = start; i <= end; i++) {
      result.push(i)
    }
    return result
  }, [currentPage, totalPages])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {totalItems !== undefined && (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalItems)} de {totalItems}
          </span>
        )}
        {showPageSize && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="input-field select-field"
            style={{ width: 'auto', padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-sm)' }}
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size} por página</option>
            ))}
          </select>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="btn btn-ghost btn-sm"
          aria-label="Primeira página"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="11 17 6 12 11 7" />
            <polyline points="18 17 13 12 18 7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-ghost btn-sm"
          aria-label="Página anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {pages.map((page, i) => {
          if (page === '...') {
            return <span key={`ellipsis-${i}`} style={{ padding: 'var(--space-2)', color: 'var(--color-text-muted)' }}>…</span>
          }
          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`btn btn-${page === currentPage ? 'primary' : 'ghost'} btn-sm`}
              style={{ minWidth: '36px' }}
              aria-label={`Página ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-ghost btn-sm"
          aria-label="Próxima página"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="btn btn-ghost btn-sm"
          aria-label="Última página"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="13 17 18 12 13 7" />
            <polyline points="6 17 11 12 6 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}