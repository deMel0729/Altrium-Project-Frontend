import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect } from '../components/PageHeader'
import { Badge } from '../components/ui'
import { companiesApi, contactsApi, leadsApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { LEAD_STATUSES } from '../constants/enums'
import { formatDate } from '../utils/format'

const SOURCES = ['Website', 'Referral', 'Cold Call', 'Email Campaign', 'Event', 'Partner', 'Inbound']

export default function Leads() {
  const leads = useCollection(leadsApi)
  const companies = useCollection(companiesApi)
  const contacts = useCollection(contactsApi)
  const users = useCollection(usersApi)

  const [status, setStatus] = useState('')
  const [owner, setOwner] = useState('')

  const companiesById = useMemo(() => indexById(companies.items), [companies.items])
  const contactsById = useMemo(() => indexById(contacts.items), [contacts.items])
  const usersById = useMemo(() => indexById(users.items), [users.items])

  const rows = useMemo(
    () =>
      leads.items.filter(
        (row) => (!status || row.status === status) && (!owner || String(row.userId) === owner),
      ),
    [leads.items, owner, status],
  )

  const companyName = (id) => companiesById.get(id)?.companyName ?? `Company #${id}`

  const counts = useMemo(() => {
    const tally = Object.fromEntries(LEAD_STATUSES.map((value) => [value, 0]))
    for (const lead of leads.items) if (tally[lead.status] !== undefined) tally[lead.status] += 1
    return tally
  }, [leads.items])

  const columns = [
    {
      key: 'leadName',
      header: 'Lead',
      render: (row) => (
        <div>
          <strong>{row.leadName}</strong>
          <small className="cell-sub">{companyName(row.companyId)}</small>
        </div>
      ),
    },
    { key: 'source', header: 'Source' },
    { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
    {
      key: 'score',
      header: 'Score',
      render: (row) => (
        <div className="score">
          <span className="score__bar" aria-hidden="true">
            <span className={`score__fill score__fill--${scoreTone(row.score)}`} style={{ width: `${clamp(row.score)}%` }} />
          </span>
          <span className="score__value">{row.score}</span>
        </div>
      ),
    },
    {
      key: 'contactId',
      header: 'Contact',
      render: (row) => (row.contactId ? contactsById.get(row.contactId)?.contactName ?? `#${row.contactId}` : '—'),
      sortValue: (row) => contactsById.get(row.contactId)?.contactName ?? '',
    },
    {
      key: 'userId',
      header: 'Owner',
      render: (row) => usersById.get(row.userId)?.name ?? `#${row.userId}`,
      sortValue: (row) => usersById.get(row.userId)?.name ?? '',
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (row) => formatDate(row.updatedAt),
      sortValue: (row) => new Date(row.updatedAt).getTime(),
    },
  ]

  const fields = [
    { name: 'leadName', label: 'Lead name', type: 'text', required: true, span: 'full' },
    {
      name: 'companyId',
      label: 'Company',
      type: 'select',
      valueType: 'number',
      required: true,
      options: companies.items.map((company) => ({ value: company.id, label: company.companyName })),
    },
    {
      name: 'contactId',
      label: 'Primary contact',
      type: 'select',
      valueType: 'number',
      options: contacts.items.map((contact) => ({
        value: contact.id,
        label: `${contact.contactName} · ${companyName(contact.companyId)}`,
      })),
      placeholder: 'None',
      hint: 'Optional.',
    },
    { name: 'source', label: 'Source', type: 'select', options: SOURCES, required: true },
    { name: 'status', label: 'Status', type: 'select', options: LEAD_STATUSES, required: true, defaultValue: 'New' },
    {
      name: 'score',
      label: 'Score',
      type: 'number',
      min: 0,
      max: 100,
      required: true,
      defaultValue: '50',
      hint: '0 – 100. The API rejects anything outside that range.',
    },
    {
      name: 'userId',
      label: 'Owner',
      type: 'select',
      valueType: 'number',
      required: true,
      options: users.items.map((user) => ({ value: user.id, label: user.name })),
    },
    { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true, hint: 'Unchecking archives the lead.' },
  ]

  return (
    <CrudPage
      title="Leads"
      subtitle="Inbound and outbound interest, scored and triaged."
      entityName="lead"
      collection={leads}
      rows={rows}
      columns={columns}
      fields={fields}
      labelOf={(row) => row.leadName}
      searchText={(row) => `${row.leadName} ${row.source} ${row.status} ${companyName(row.companyId)}`}
      initialSort={{ key: 'score', direction: 'desc' }}
      createDisabled={!companies.loading && !users.loading && (!companies.items.length || !users.items.length)}
      createDisabledReason="Leads need an existing company and owner."
      aside={
        <div className="pill-strip">
          {LEAD_STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              className={`pill${status === value ? ' is-active' : ''}`}
              onClick={() => setStatus(status === value ? '' : value)}
              aria-pressed={status === value}
              aria-label={`${value} leads: ${counts[value]}`}
            >
              <Badge>{value}</Badge>
              <strong>{counts[value]}</strong>
            </button>
          ))}
        </div>
      }
      filters={
        <FilterSelect
          label="Owner"
          value={owner}
          onChange={setOwner}
          options={users.items.map((user) => ({ value: String(user.id), label: user.name }))}
          allLabel="All owners"
        />
      }
    />
  )
}

const clamp = (score) => Math.min(100, Math.max(0, Number(score) || 0))
const scoreTone = (score) => (score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low')
