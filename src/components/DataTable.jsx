import { useMemo, useState } from 'react'
import { EmptyState, Spinner } from './ui'

// A column is { key, header, render?, sortValue?, align?, width? }.
// `render` draws the cell; `sortValue` (or the raw field) drives sorting.
export function DataTable({
  columns,
  rows,
  loading,
  empty,
  rowActions,
  onRowClick,
  initialSort,
}) {
  const [sort, setSort] = useState(initialSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column) return rows
    const valueOf = column.sortValue ?? ((row) => row[column.key])
    const direction = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const left = valueOf(a)
      const right = valueOf(b)
      if (left === right) return 0
      if (left === null || left === undefined) return 1
      if (right === null || right === undefined) return -1
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction
    })
  }, [columns, rows, sort])

  const toggleSort = (key) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  if (loading) return <Spinner />
  if (!rows.length) return empty ?? <EmptyState title="Nothing here yet" />

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key
              return (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={column.align === 'right' ? 'is-right' : undefined}
                  aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {column.sortable === false ? (
                    column.header
                  ) : (
                    <button type="button" className="th-sort" onClick={() => toggleSort(column.key)}>
                      {column.header}
                      <span className={`th-sort__arrow${active ? ' is-active' : ''}`} aria-hidden="true">
                        {active && sort.direction === 'desc' ? '▾' : '▴'}
                      </span>
                    </button>
                  )}
                </th>
              )
            })}
            {rowActions && <th className="is-right col-actions">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.id}
              className={onRowClick ? 'is-clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'right' ? 'is-right' : undefined}>
                  {column.render ? column.render(row) : formatCell(row[column.key])}
                </td>
              ))}
              {rowActions && (
                <td className="is-right col-actions" onClick={(event) => event.stopPropagation()}>
                  <div className="row-actions">{rowActions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value
}
