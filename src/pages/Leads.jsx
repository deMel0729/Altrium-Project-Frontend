import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect } from '../components/PageHeader'
import { Badge, Button } from '../components/ui'
import { RecordFormModal } from '../components/RecordFormModal'
import { useToast } from '../hooks/useToast'
import { companiesApi, contactsApi, dealsApi, leadsApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { ROLES, useAuth } from '../auth/auth-context'
import { DEAL_STAGES, LEAD_STATUSES } from '../constants/enums'
import { formatDate } from '../utils/format'

const SOURCES = ['Website', 'Referral', 'Cold Call', 'Email Campaign', 'Event', 'Partner', 'Inbound']

export default function Leads() {
  const { seesEverything, isLeadership, user: me } = useAuth()
  const leads = useCollection(leadsApi)
  const companies = useCollection(companiesApi)
  const contacts = useCollection(contactsApi)
  const users = useCollection(usersApi, { enabled: seesEverything })

  const [status, setStatus] = useState('')
  const [owner, setOwner] = useState('')
  const [converting, setConverting] = useState(null)
  const toast = useToast()

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

  // A rep sees only their own records, so an Owner column carries no
  // information - and the user list it needs is manager-only.
  const visibleColumns = seesEverything ? columns : columns.filter((c) => c.key !== 'userId')
  // A manager assigns work downwards: reps and other managers, never a
  // leadership account. Leadership itself may assign to anyone.
  const assignableUsers = isLeadership
    ? users.items
    : users.items.filter((u) => u.userRole !== ROLES.LEADERSHIP || u.id === me?.id)

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
      // Narrowed to the company chosen above: a contact belongs to one company,
      // so offering the rest invites a lead pointing at the wrong organisation.
      options: (values) =>
        contacts.items
          .filter((contact) => String(contact.companyId) === String(values.companyId))
          .map((contact) => ({ value: contact.id, label: contact.contactName })),
      placeholder: 'None',
      hint: 'Optional. Lists contacts at the selected company.',
    },
    { name: 'source', label: 'Source', type: 'select', options: SOURCES, required: true },
    { name: 'status', label: 'Status', type: 'select', options: LEAD_STATUSES, required: true, defaultValue: 'New' },
    {
      name: 'userId',
      label: 'Owner',
      type: 'select',
      valueType: 'number',
      required: true,
      options: assignableUsers.map((user) => ({ value: user.id, label: `${user.name} · ${user.userRole}` })),
      hint: isLeadership ? undefined : 'Leads can be assigned to reps and managers.',
    },
  ]

  const convertFields = [
    { name: 'dealName', label: 'Deal name', type: 'text', required: true, span: 'full' },
    { name: 'dealValue', label: 'Value (USD)', type: 'money', min: 0, required: true, defaultValue: '0' },
    { name: 'expectedCloseDate', label: 'Expected close date', type: 'date', required: true },
    { name: 'stage', label: 'Stage', type: 'select', options: DEAL_STAGES, required: true, defaultValue: 'Prospecting' },
  ]

  // One button: create the deal from this lead, then mark the lead Qualified so
  // the funnel still counts it and the link between the two stays traceable.
  const convert = async (payload) => {
    const lead = converting
    await dealsApi.create({
      ...payload,
      companyId: lead.companyId,
      contactId: lead.contactId ?? null,
      leadId: lead.id,
      userId: lead.userId,
    })
    if (lead.status !== 'Qualified') {
      await leads.update(lead.id, { ...lead, status: 'Qualified' })
    } else {
      await leads.refresh()
    }
    setConverting(null)
    toast.notify(`${lead.leadName} converted to a deal.`)
  }

  return (
    <>
      <CrudPage
        title="Leads"
        subtitle="Inbound and outbound interest, tracked and triaged."
        entityName="lead"
        collection={leads}
        rows={rows}
        columns={visibleColumns}
        fields={fields}
        labelOf={(row) => row.leadName}
        searchText={(row) => `${row.leadName} ${row.source} ${row.status} ${companyName(row.companyId)}`}
        initialSort={{ key: 'updatedAt', direction: 'desc' }}
        canCreate={seesEverything}
        canDelete={seesEverything}
        extraRowActions={(row) =>
          row.status === 'Lost' ? null : (
            <Button size="sm" onClick={() => setConverting(row)}>
              Convert
            </Button>
          )
        }
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
        filters={seesEverything ? (
          <FilterSelect
            label="Owner"
            value={owner}
            onChange={setOwner}
            options={users.items.map((user) => ({ value: String(user.id), label: user.name }))}
            allLabel="All owners"
          />
        ) : undefined}
      />

      {converting && (
        <RecordFormModal
          title={`Convert "${converting.leadName}" to a deal`}
          subtitle={companyName(converting.companyId)}
          fields={convertFields}
          record={{ dealName: converting.leadName }}
          submitLabel="Create deal"
          onSubmit={convert}
          onClose={() => setConverting(null)}
        />
      )}
    </>
  )
}
