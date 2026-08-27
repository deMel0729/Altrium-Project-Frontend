import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect } from '../components/PageHeader'
import { Badge } from '../components/ui'
import { companiesApi, dealsApi, engagementsApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { ENGAGEMENT_TYPES } from '../constants/enums'
import { formatDate } from '../utils/format'

export default function Engagements() {
  const engagements = useCollection(engagementsApi)
  const companies = useCollection(companiesApi)
  const deals = useCollection(dealsApi)
  const users = useCollection(usersApi)
  const [type, setType] = useState('')

  const companiesById = useMemo(() => indexById(companies.items), [companies.items])
  const dealsById = useMemo(() => indexById(deals.items), [deals.items])
  const usersById = useMemo(() => indexById(users.items), [users.items])

  const companyName = (id) => companiesById.get(id)?.companyName ?? `Company #${id}`
  const dealName = (id) => dealsById.get(id)?.dealName ?? `Deal #${id}`
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
      key: 'dealId',
      header: 'Deal',
      render: (row) => dealName(row.dealId),
      sortValue: (row) => dealName(row.dealId),
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

  const fields = [
    { name: 'engagementName', label: 'Subject', type: 'text', required: true, span: 'full' },
    { name: 'engagementType', label: 'Type', type: 'select', options: ENGAGEMENT_TYPES, required: true, defaultValue: 'Call' },
    {
      name: 'companyId',
      label: 'Company',
      type: 'select',
      valueType: 'number',
      required: true,
      options: companies.items.map((company) => ({ value: company.id, label: company.companyName })),
    },
    {
      name: 'dealId',
      label: 'Deal',
      type: 'select',
      valueType: 'number',
      required: true,
      options: deals.items.map((deal) => ({ value: deal.id, label: `${deal.dealName} · ${deal.stage}` })),
    },
    {
      name: 'userId',
      label: 'Logged by',
      type: 'select',
      valueType: 'number',
      required: true,
      options: users.items.map((user) => ({ value: user.id, label: user.name })),
    },
    { name: 'engagementDescription', label: 'Notes', type: 'textarea', span: 'full', placeholder: 'What was discussed?' },
    { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true, hint: 'Unchecking archives the engagement.' },
  ]

  return (
    <CrudPage
      title="Engagements"
      subtitle="Calls, meetings, emails and notes logged against a deal."
      entityName="engagement"
      collection={engagements}
      rows={rows}
      columns={columns}
      fields={fields}
      labelOf={(row) => row.engagementName}
      searchText={(row) =>
        `${row.engagementName} ${row.engagementType} ${row.engagementDescription} ${companyName(row.companyId)} ${dealName(row.dealId)}`
      }
      initialSort={{ key: 'createdAt', direction: 'desc' }}
      createDisabled={!engagements.loading && (!deals.items.length || !companies.items.length || !users.items.length)}
      createDisabledReason="Engagements need an existing company, deal and user."
      filters={
        <FilterSelect label="Type" value={type} onChange={setType} options={ENGAGEMENT_TYPES} allLabel="All types" />
      }
    />
  )
}
