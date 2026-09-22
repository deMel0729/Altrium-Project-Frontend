import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { Badge, Button } from '../components/ui'
import { useToast } from '../hooks/useToast'
import { companiesApi, dealsApi, followUpsApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { useAuth } from '../auth/auth-context'
import { daysUntil, formatDate, relativeDueLabel } from '../utils/format'

const VIEWS = [
  { key: 'open', label: 'Open' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
]

export default function FollowUps() {
  const { seesEverything } = useAuth()
  const followUps = useCollection(followUpsApi)
  const companies = useCollection(companiesApi)
  const deals = useCollection(dealsApi)
  const users = useCollection(usersApi, { enabled: seesEverything })
  const toast = useToast()

  const [view, setView] = useState('open')
  const [toggling, setToggling] = useState(null)

  const companiesById = useMemo(() => indexById(companies.items), [companies.items])
  const dealsById = useMemo(() => indexById(deals.items), [deals.items])
  const usersById = useMemo(() => indexById(users.items), [users.items])

  const companyName = (id) => companiesById.get(id)?.companyName ?? `Company #${id}`
  const ownerName = (id) => usersById.get(id)?.name ?? `User #${id}`

  const rows = useMemo(() => {
    if (view === 'all') return followUps.items
    if (view === 'completed') return followUps.items.filter((row) => row.completed)
    if (view === 'overdue') return followUps.items.filter((row) => !row.completed && (daysUntil(row.dueDate) ?? 0) < 0)
    return followUps.items.filter((row) => !row.completed)
  }, [followUps.items, view])

  const counts = useMemo(
    () => ({
      open: followUps.items.filter((row) => !row.completed).length,
      overdue: followUps.items.filter((row) => !row.completed && (daysUntil(row.dueDate) ?? 0) < 0).length,
      completed: followUps.items.filter((row) => row.completed).length,
      all: followUps.items.length,
    }),
    [followUps.items],
  )

  const toggleCompleted = async (row) => {
    setToggling(row.id)
    try {
      await followUps.update(row.id, { ...row, completed: !row.completed })
      toast.notify(row.completed ? 'Follow-up reopened.' : 'Follow-up completed.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setToggling(null)
    }
  }

  const columns = [
    {
      key: 'completed',
      header: 'Done',
      width: '64px',
      sortable: false,
      render: (row) => (
        <input
          type="checkbox"
          className="checkbox"
          checked={row.completed}
          disabled={toggling === row.id}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleCompleted(row)}
          aria-label={row.completed ? 'Mark as open' : 'Mark as complete'}
        />
      ),
    },
    {
      key: 'note',
      header: 'Follow-up',
      render: (row) => (
        <div>
          <strong className={row.completed ? 'is-done' : undefined}>{row.note || 'Untitled follow-up'}</strong>
          <small className="cell-sub">{companyName(row.companyId)}</small>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due',
      render: (row) => (
        <div>
          {/* The wording carries the urgency - "3 days overdue" says more than a
              red pill, and the list sorts by date anyway. */}
          <Badge>{relativeDueLabel(row.dueDate)}</Badge>
          <small className="cell-sub">{formatDate(row.dueDate)}</small>
        </div>
      ),
      sortValue: (row) => new Date(row.dueDate).getTime(),
    },
    {
      key: 'dealId',
      header: 'Deal',
      render: (row) => dealsById.get(row.dealId)?.dealName ?? `Deal #${row.dealId}`,
      sortValue: (row) => dealsById.get(row.dealId)?.dealName ?? '',
    },
    {
      key: 'userId',
      header: 'Assignee',
      render: (row) => ownerName(row.userId),
      sortValue: (row) => ownerName(row.userId),
    },
  ]

  // A rep sees only their own records, so an Owner column carries no
  // information - and the user list it needs is manager-only.
  const visibleColumns = seesEverything ? columns : columns.filter((c) => c.key !== 'userId')
  // A follow-up needs an open deal and nothing else: the company and lead come
  // from that deal, and the owner comes from the token.
  const openDeals = deals.items.filter((deal) => deal.stage !== 'Lost')

  const fields = [
    { name: 'note', label: 'Note', type: 'textarea', required: true, span: 'full', placeholder: 'What needs to happen next?' },
    { name: 'dueDate', label: 'Due date', type: 'date', required: true },
    {
      name: 'dealId',
      label: 'Deal',
      type: 'select',
      valueType: 'number',
      required: true,
      // Lost deals are left out: there is nothing left to chase, and the API
      // refuses them anyway. Company and lead come from the deal, so they are
      // not asked for here.
      options: openDeals.map((deal) => ({ value: deal.id, label: `${deal.dealName} · ${deal.stage}` })),
      hint: 'The next action on this deal. Lost deals are not listed.',
    },
    // Managers may set a reminder for a rep; for a rep the API takes the owner
    // from the token, so the field would only ever say their own name.
    ...(seesEverything
      ? [
          {
            name: 'userId',
            label: 'Assignee',
            type: 'select',
            valueType: 'number',
            required: true,
            options: users.items.map((user) => ({ value: user.id, label: user.name })),
          },
        ]
      : []),
    { name: 'completed', label: 'Completed', type: 'checkbox', defaultValue: false },
  ]

  return (
    <CrudPage
      title="Follow-ups"
      subtitle="The next action on every open opportunity."
      entityName="follow-up"
      collection={followUps}
      rows={rows}
      columns={visibleColumns}
      fields={fields}
      labelOf={(row) => row.note || `Follow-up #${row.id}`}
      searchText={(row) => `${row.note} ${companyName(row.companyId)} ${ownerName(row.userId)}`}
      initialSort={{ key: 'dueDate', direction: 'asc' }}
      canDelete={seesEverything}
      createDisabled={!followUps.loading && !openDeals.length}
      createDisabledReason="You need an open deal before you can set a follow-up on it."
      aside={
        <div className="pill-strip">
          {VIEWS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pill${view === item.key ? ' is-active' : ''}`}
              onClick={() => setView(item.key)}
              aria-pressed={view === item.key}
              aria-label={`${item.label}: ${counts[item.key]}`}
            >
              <span>{item.label}</span>
              <strong>{counts[item.key]}</strong>
            </button>
          ))}
        </div>
      }
      headerExtras={
        counts.overdue > 0 && view !== 'overdue' ? (
          <Button variant="ghost-danger" onClick={() => setView('overdue')}>
            {counts.overdue} overdue
          </Button>
        ) : null
      }
    />
  )
}
