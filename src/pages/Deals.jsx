import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect, SearchInput, Toolbar } from '../components/PageHeader'
import { Badge, Button, Spinner } from '../components/ui'
import { useToast } from '../hooks/useToast'
import { companiesApi, contactsApi, dealsApi, leadsApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { ROLES, useAuth } from '../auth/auth-context'
import { DEAL_STAGES } from '../constants/enums'
import { formatDate, formatMoney, formatMoneyCompact } from '../utils/format'

export default function Deals() {
  const { seesEverything, isLeadership, user: me } = useAuth()
  const deals = useCollection(dealsApi)
  const companies = useCollection(companiesApi)
  const contacts = useCollection(contactsApi)
  const leads = useCollection(leadsApi)
  const users = useCollection(usersApi, { enabled: seesEverything })
  const toast = useToast()

  const [view, setView] = useState('board')
  const [owner, setOwner] = useState('')
  const [dragging, setDragging] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const companiesById = useMemo(() => indexById(companies.items), [companies.items])
  const usersById = useMemo(() => indexById(users.items), [users.items])

  const companyName = (id) => companiesById.get(id)?.companyName ?? `Company #${id}`
  const ownerName = (id) => usersById.get(id)?.name ?? `User #${id}`

  const rows = useMemo(
    () => (owner ? deals.items.filter((deal) => String(deal.userId) === owner) : deals.items),
    [deals.items, owner],
  )

  const moveToStage = async (deal, stage) => {
    if (deal.stage === stage) return
    try {
      await deals.update(deal.id, { ...deal, stage })
      toast.notify(`${deal.dealName} moved to ${stage}.`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const columns = [
    {
      key: 'dealName',
      header: 'Deal',
      render: (row) => (
        <div>
          <strong>{row.dealName}</strong>
          <small className="cell-sub">{companyName(row.companyId)}</small>
        </div>
      ),
    },
    { key: 'stage', header: 'Stage', render: (row) => <Badge>{row.stage}</Badge> },
    {
      key: 'dealValue',
      header: 'Value',
      align: 'right',
      render: (row) => <span className="mono">{formatMoney(row.dealValue)}</span>,
      sortValue: (row) => row.dealValue,
    },
    {
      key: 'expectedCloseDate',
      header: 'Expected close',
      render: (row) => formatDate(row.expectedCloseDate),
      sortValue: (row) => new Date(row.expectedCloseDate).getTime(),
    },
    {
      key: 'userId',
      header: 'Owner',
      render: (row) => ownerName(row.userId),
      sortValue: (row) => ownerName(row.userId),
    },
  ]

  // A rep sees only their own records, so an Owner column carries no
  // information - and the user list it needs is manager-only.
  const visibleColumns = seesEverything ? columns : columns.filter((c) => c.key !== 'userId')
  // Same rule as leads and accounts: a manager cannot hand a deal upwards.
  const assignableUsers = users.items.filter(
    (user) => isLeadership || user.userRole !== ROLES.LEADERSHIP || user.id === me?.id,
  )

  const fields = [
    { name: 'dealName', label: 'Deal name', type: 'text', required: true, span: 'full' },
    {
      name: 'companyId',
      label: 'Company',
      type: 'select',
      valueType: 'number',
      required: true,
      options: companies.items.map((company) => ({ value: company.id, label: company.companyName })),
    },
    {
      name: 'leadId',
      label: 'Originating lead',
      type: 'select',
      valueType: 'number',
      required: true,
      // A deal comes from a lead at the same company, so only those are offered.
      options: (values) =>
        leads.items
          .filter((lead) => String(lead.companyId) === String(values.companyId))
          .map((lead) => ({ value: lead.id, label: `${lead.leadName} · ${lead.status}` })),
      hint: 'Leads at the selected company.',
    },
    {
      name: 'contactId',
      label: 'Contact',
      type: 'select',
      valueType: 'number',
      // Same rule: a contact belongs to one company.
      options: (values) =>
        contacts.items
          .filter((contact) => String(contact.companyId) === String(values.companyId))
          .map((contact) => ({ value: contact.id, label: contact.contactName })),
      placeholder: 'None',
      hint: 'Optional. Lists contacts at the selected company.',
    },
    {
      name: 'userId',
      label: 'Owner',
      type: 'select',
      valueType: 'number',
      required: true,
      options: assignableUsers.map((user) => ({ value: user.id, label: `${user.name} · ${user.userRole}` })),
    },
    { name: 'stage', label: 'Stage', type: 'select', options: DEAL_STAGES, required: true, defaultValue: 'Prospecting' },
    { name: 'dealValue', label: 'Value (USD)', type: 'money', min: 0, required: true, defaultValue: '0' },
    { name: 'expectedCloseDate', label: 'Expected close date', type: 'date', required: true },
  ]

  const ready = companies.items.length && leads.items.length && users.items.length

  return (
    <CrudPage
      title="Deals"
      subtitle="Everything in the pipeline, from first proposal to signature."
      entityName="deal"
      collection={deals}
      rows={rows}
      columns={visibleColumns}
      fields={fields}
      labelOf={(row) => row.dealName}
      searchText={(row) => `${row.dealName} ${row.stage} ${companyName(row.companyId)} ${ownerName(row.userId)}`}
      initialSort={{ key: 'dealValue', direction: 'desc' }}
      canCreate={seesEverything}
      canDelete={seesEverything}
      createDisabled={!deals.loading && !ready}
      createDisabledReason="Deals need an existing company, lead and owner."
      alternateActive={view === 'board'}
      headerExtras={
        <div className="segmented" role="group" aria-label="View">
          <button type="button" className={view === 'board' ? 'is-active' : ''} onClick={() => setView('board')}>
            Board
          </button>
          <button type="button" className={view === 'table' ? 'is-active' : ''} onClick={() => setView('table')}>
            Table
          </button>
        </div>
      }
      filters={seesEverything ? (
        <FilterSelect
          label="Owner"
          value={owner}
          onChange={setOwner}
          options={users.items.map((user) => ({ value: String(user.id), label: user.name }))}
          allLabel="All owners"
        />
      ) : undefined}
      renderAlternate={({ rows: visible, edit, remove, query, setQuery, filters }) => (
        <section className="panel panel--flush">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search deals…" />
            {filters}
            <span className="toolbar__count">{visible.length} deals</span>
          </Toolbar>

          {deals.loading ? (
            <Spinner label="Loading pipeline" />
          ) : (
            <div className="board">
              {DEAL_STAGES.map((stage) => {
                const stageDeals = visible.filter((deal) => deal.stage === stage)
                const total = stageDeals.reduce((sum, deal) => sum + (deal.dealValue || 0), 0)
                return (
                  <div
                    key={stage}
                    className={`board__col${dropTarget === stage ? ' is-drop-target' : ''}`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      setDropTarget(stage)
                    }}
                    onDragLeave={() => setDropTarget((current) => (current === stage ? null : current))}
                    onDrop={(event) => {
                      event.preventDefault()
                      setDropTarget(null)
                      if (dragging) moveToStage(dragging, stage)
                      setDragging(null)
                    }}
                  >
                    <header className="board__head">
                      <Badge>{stage}</Badge>
                      <span className="board__total">
                        {stageDeals.length} · {formatMoneyCompact(total)}
                      </span>
                    </header>

                    <div className="board__cards">
                      {stageDeals.map((deal) => (
                        <article
                          key={deal.id}
                          className={`deal-card${dragging?.id === deal.id ? ' is-dragging' : ''}`}
                          draggable
                          onDragStart={() => setDragging(deal)}
                          onDragEnd={() => {
                            setDragging(null)
                            setDropTarget(null)
                          }}
                        >
                          <h4>{deal.dealName}</h4>
                          <p className="deal-card__company">{companyName(deal.companyId)}</p>
                          <p className="deal-card__value">{formatMoney(deal.dealValue)}</p>
                          <footer>
                            {seesEverything && (
                              <span title={`Owner: ${ownerName(deal.userId)}`}>{ownerName(deal.userId)}</span>
                            )}
                            <span>{formatDate(deal.expectedCloseDate)}</span>
                          </footer>
                          <div className="deal-card__actions">
                            <Button size="sm" onClick={() => edit(deal)}>
                              Edit
                            </Button>
                            {seesEverything && (
                              <Button size="sm" variant="ghost-danger" onClick={() => remove(deal)}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </article>
                      ))}
                      {!stageDeals.length && <p className="board__empty">Drop a deal here</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    />
  )
}
