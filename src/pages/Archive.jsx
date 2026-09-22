import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { PageHeader, SearchInput, Toolbar, FilterSelect } from '../components/PageHeader'
import { Badge, Button, EmptyState, ErrorState } from '../components/ui'
import { useToast } from '../hooks/useToast'
import { archiveApi } from '../api/endpoints'
import { formatDateTime } from '../utils/format'

// Deleting anywhere in the CRM is a soft delete: the row stays, with is_active = 0
// and a deleted_at stamp. This screen is the only way back, and it is limited to
// leadership — the API enforces that too, this is just the door.
export default function Archive() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [entity, setEntity] = useState('')
  const [restoring, setRestoring] = useState(null)
  const toast = useToast()

  const load = useCallback(async (signal) => {
    try {
      const data = await archiveApi.list({ signal })
      if (signal?.aborted) return
      setItems(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // Same shape as useCollection: fetching on mount is the point of this effect,
    // the state it sets lands after the await, and abort covers unmount mid-flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const entityOptions = useMemo(() => {
    const seen = new Map()
    for (const item of items) if (!seen.has(item.entity)) seen.set(item.entity, item.label)
    return [...seen].map(([value, label]) => ({ value, label }))
  }, [items])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter(
      (item) =>
        (!entity || item.entity === entity) &&
        (!needle ||
          `${item.name} ${item.label} ${item.ownerName ?? ''}`.toLowerCase().includes(needle)),
    )
  }, [items, entity, query])

  const restore = async (item) => {
    setRestoring(`${item.entity}-${item.id}`)
    try {
      await archiveApi.restore(item.entity, item.id)
      // Drop it locally rather than refetching the whole list.
      setItems((current) => current.filter((row) => !(row.entity === item.entity && row.id === item.id)))
      toast.notify(`${item.label} "${item.name}" restored.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRestoring(null)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Record',
      render: (row) => (
        <div>
          <strong>{row.name || `#${row.id}`}</strong>
          <small className="cell-sub">
            {row.label} #{row.id}
          </small>
        </div>
      ),
    },
    { key: 'label', header: 'Type', render: (row) => <Badge>{row.label}</Badge> },
    { key: 'ownerName', header: 'Owner', render: (row) => row.ownerName ?? '—' },
    {
      key: 'deletedAt',
      header: 'Deleted',
      // Rows archived before deleted_at existed have no timestamp; say so rather
      // than inventing one.
      render: (row) => (row.deletedAt ? formatDateTime(row.deletedAt) : 'Date unknown'),
      sortValue: (row) => (row.deletedAt ? new Date(row.deletedAt).getTime() : 0),
    },
  ]

  if (error) return <ErrorState error={error} onRetry={() => load()} />

  return (
    <>
      <PageHeader
        title="Recently deleted"
        subtitle="Deleted records are kept, not destroyed. Restore one to put it back where it was."
      />

      <section className="panel panel--flush">
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search deleted records…" />
          <FilterSelect
            label="Type"
            value={entity}
            onChange={setEntity}
            options={entityOptions}
            allLabel="All types"
          />
          <span className="toolbar__count">{rows.length} records</span>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          initialSort={{ key: 'deletedAt', direction: 'desc' }}
          empty={
            <EmptyState
              title="Nothing deleted"
              description="Records deleted anywhere in the CRM show up here so they can be restored."
            />
          }
          rowActions={(row) => (
            <Button
              size="sm"
              variant="primary"
              onClick={() => restore(row)}
              disabled={restoring === `${row.entity}-${row.id}`}
            >
              {restoring === `${row.entity}-${row.id}` ? 'Restoring…' : 'Restore'}
            </Button>
          )}
        />
      </section>
    </>
  )
}
