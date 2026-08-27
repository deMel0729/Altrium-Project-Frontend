import { useMemo, useState } from 'react'
import { DataTable } from './DataTable'
import { PageHeader, SearchInput, Toolbar } from './PageHeader'
import { RecordFormModal } from './RecordFormModal'
import { useToast } from '../hooks/useToast'
import { Button, ConfirmDialog, EmptyState, ErrorState } from './ui'

// Wires one collection to the standard list / create / edit / delete workflow.
// Pages supply the columns, the form schema, and any filtering they need.
export function CrudPage({
  title,
  subtitle,
  entityName,
  collection,
  columns,
  fields,
  rows,
  searchText,
  searchPlaceholder,
  filters,
  labelOf = (row) => row.name ?? `#${row.id}`,
  initialSort,
  headerExtras,
  aside,
  createDisabled,
  createDisabledReason,
  // Optional second view (e.g. the deal pipeline board). When `alternateActive`
  // is true this replaces the table but keeps the shared create/edit/delete flow.
  renderAlternate,
  alternateActive,
}) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | record
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const source = rows ?? collection.items

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return source
    return source.filter((row) => (searchText?.(row) ?? labelOf(row)).toLowerCase().includes(needle))
  }, [labelOf, query, searchText, source])

  const save = async (payload) => {
    if (editing === 'new') {
      await collection.create(payload)
      toast.notify(`${capitalize(entityName)} created.`)
    } else {
      await collection.update(editing.id, { ...editing, ...payload })
      toast.notify(`${capitalize(entityName)} updated.`)
    }
    setEditing(null)
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await collection.remove(deleting.id)
      toast.notify(`${capitalize(entityName)} archived.`)
      setDeleting(null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        {headerExtras}
        <Button variant="primary" onClick={() => setEditing('new')} disabled={createDisabled} title={createDisabled ? createDisabledReason : undefined}>
          New {entityName}
        </Button>
      </PageHeader>

      {aside}

      {collection.error ? (
        <ErrorState error={collection.error} onRetry={collection.refresh} />
      ) : alternateActive ? (
        renderAlternate({ rows: visible, edit: setEditing, remove: setDeleting, query, setQuery, filters })
      ) : (
        <section className="panel">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}…`} />
            {filters}
            <span className="toolbar__count">
              {visible.length} of {collection.items.length}
            </span>
          </Toolbar>

          <DataTable
            columns={columns}
            rows={visible}
            loading={collection.loading}
            initialSort={initialSort}
            empty={
              <EmptyState
                title={source.length ? 'No matches' : `No ${title.toLowerCase()} yet`}
                description={
                  source.length
                    ? 'Try a different search term or clear the filters.'
                    : `Create your first ${entityName} to see it listed here.`
                }
                action={
                  !source.length && !createDisabled ? (
                    <Button variant="primary" onClick={() => setEditing('new')}>
                      New {entityName}
                    </Button>
                  ) : null
                }
              />
            }
            rowActions={(row) => (
              <>
                <Button size="sm" onClick={() => setEditing(row)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost-danger" onClick={() => setDeleting(row)}>
                  Delete
                </Button>
              </>
            )}
          />
        </section>
      )}

      {editing && (
        <RecordFormModal
          title={editing === 'new' ? `New ${entityName}` : `Edit ${labelOf(editing)}`}
          subtitle={editing === 'new' ? undefined : `Record #${editing.id}`}
          fields={fields}
          record={editing === 'new' ? null : editing}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete ${entityName}?`}
          message={`"${labelOf(deleting)}" will be archived (the API soft-deletes by clearing is_active), so it disappears from these lists but stays in the database.`}
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1)
