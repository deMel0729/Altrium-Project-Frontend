import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect } from '../components/PageHeader'
import { Badge } from '../components/ui'
import { companiesApi, dealsApi, engagementsApi, leadsApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { useAuth } from '../auth/auth-context'
import { ENGAGEMENT_TYPES } from '../constants/enums'
import { formatDate } from '../utils/format'

export default function Engagements() {
  const { seesEverything } = useAuth()
  const engagements = useCollection(engagementsApi)
  const companies = useCollection(companiesApi)
  const deals = useCollection(dealsApi)
  const leads = useCollection(leadsApi)
  const users = useCollection(usersApi, { enabled: seesEverything })
  const [type, setType] = useState('')

  const companiesById = useMemo(() => indexById(companies.items), [companies.items])
  const dealsById = useMemo(() => indexById(deals.items), [deals.items])
  const leadsById = useMemo(() => indexById(leads.items), [leads.items])
  const usersById = useMemo(() => indexById(users.items), [users.items])

  const companyName = (id) => companiesById.get(id)?.companyName ?? `Company #${id}`
  const dealName = (id) => dealsById.get(id)?.dealName ?? `Deal #${id}`
  const leadName = (id) => leadsById.get(id)?.leadName ?? `Lead #${id}`

  // An engagement points at one or the other, so the column shows whichever it is.
  const relatedTo = (row) =>
    row.leadId ? `${leadName(row.leadId)} (lead)` : row.dealId ? `${dealName(row.dealId)} (deal)` : '—'
  const ownerName = (id) => usersById.get(id)?.name ?? `User #${id}`

  const rows = useMemo(
    () => (type ? engagements.items.filter((row) => row.engagementType === type) : engagements.items),
    [engagements.items, type],
  )

  const columns = [
    {
      key: 'engagementName',
      header: 'Engagement',
      render: (row) => (
        <div>
          <strong>{row.engagementName}</strong>
          <small className="cell-sub">{companyName(row.companyId)}</small>
        </div>
      ),
    },
    { key: 'engagementType', header: 'Type', render: (row) => <Badge>{row.engagementType}</Badge> },
    {
      key: 'relatedTo',
      header: 'Related to',
      render: (row) => relatedTo(row),
      sortValue: (row) => relatedTo(row),
    },
    {
      key: 'engagementDescription',
      header: 'Notes',
      render: (row) => <span className="cell-clamp">{row.engagementDescription || '—'}</span>,
      sortable: false,
    },
    {
      key: 'userId',
      header: 'Logged by',
      render: (row) => ownerName(row.userId),
      sortValue: (row) => ownerName(row.userId),
    },
    {
      key: 'createdAt',
      header: 'Logged',
      render: (row) => formatDate(row.createdAt),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ]

  // A rep sees only their own records, so an Owner column carries no
  // information - and the user list it needs is manager-only.
  const visibleColumns = seesEverything ? columns : columns.filter((c) => c.key !== 'userId')
  const fields = [
    { name: 'engagementName', label: 'Subject', type: 'text', required: true, span: 'full' },
    { name: 'engagementType', label: 'Type', type: 'select', options: ENGAGEMENT_TYPES, required: true, defaultValue: 'Call' },
    {
      name: 'leadId',
      label: 'Lead',
      type: 'select',
      valueType: 'number',
      required: true,
      options: leads.items.map((lead) => ({ value: lead.id, label: `${lead.leadName} · ${lead.status}` })),
      hint: 'The conversation you had while working this lead.',
    },
    { name: 'engagementDescription', label: 'Notes', type: 'textarea', span: 'full', placeholder: 'What was discussed?' },
    // Managers may log activity on a rep's behalf; for a rep the API sets the
    // owner from the token, so the field would only ever say their own name.
    ...(seesEverything
      ? [
          {
            name: 'userId',
            label: 'Logged by',
            type: 'select',
            valueType: 'number',
            required: true,
            options: users.items.map((user) => ({ value: user.id, label: user.name })),
          },
        ]
      : []),
  ]

  return (
    <CrudPage
      title="Engagements"
      subtitle="Calls, meetings, emails and notes logged while working a lead."
      entityName="engagement"
      collection={engagements}
      rows={rows}
      columns={visibleColumns}
      fields={fields}
      labelOf={(row) => row.engagementName}
      searchText={(row) =>
        `${row.engagementName} ${row.engagementType} ${row.engagementDescription} ${companyName(row.companyId)} ${relatedTo(row)}`
      }
      initialSort={{ key: 'createdAt', direction: 'desc' }}
      canDelete={seesEverything}
      createDisabled={!engagements.loading && !leads.items.length}
      createDisabledReason="You need a lead before you can log activity against one."
      filters={
        <FilterSelect label="Type" value={type} onChange={setType} options={ENGAGEMENT_TYPES} allLabel="All types" />
      }
    />
  )
}
