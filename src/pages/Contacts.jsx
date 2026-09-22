import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect } from '../components/PageHeader'
import { companiesApi, contactsApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { useAuth } from '../auth/auth-context'
import { formatDate } from '../utils/format'

export default function Contacts() {
  const { seesEverything } = useAuth()
  const contacts = useCollection(contactsApi)
  const companies = useCollection(companiesApi)
  const [companyFilter, setCompanyFilter] = useState('')

  const companiesById = useMemo(() => indexById(companies.items), [companies.items])
  const companyOptions = useMemo(
    () => companies.items.map((company) => ({ value: company.id, label: company.companyName })),
    [companies.items],
  )

  const rows = useMemo(
    () => (companyFilter ? contacts.items.filter((row) => String(row.companyId) === companyFilter) : contacts.items),
    [companyFilter, contacts.items],
  )

  const nameOf = (id) => companiesById.get(id)?.companyName ?? `Company #${id}`

  const columns = [
    {
      key: 'contactName',
      header: 'Contact',
      render: (row) => (
        <div>
          <strong>{row.contactName}</strong>
          <small className="cell-sub">{row.position || 'No title'}</small>
        </div>
      ),
    },
    {
      key: 'companyId',
      header: 'Company',
      render: (row) => nameOf(row.companyId),
      sortValue: (row) => nameOf(row.companyId),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) =>
        row.email ? (
          <a className="link" href={`mailto:${row.email}`}>
            {row.email}
          </a>
        ) : (
          '—'
        ),
    },
    { key: 'phone', header: 'Phone' },
    {
      key: 'createdAt',
      header: 'Added',
      render: (row) => formatDate(row.createdAt),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ]

  const fields = [
    { name: 'contactName', label: 'Full name', type: 'text', required: true },
    { name: 'position', label: 'Position', type: 'text', placeholder: 'e.g. Head of Ops' },
    {
      name: 'companyId',
      label: 'Company',
      type: 'select',
      valueType: 'number',
      required: true,
      options: companyOptions,
      hint: companyOptions.length ? undefined : 'Create a company first — contacts belong to one.',
    },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', nullable: true },
  ]

  return (
    <CrudPage
      title="Contacts"
      subtitle="The people behind each account."
      entityName="contact"
      collection={contacts}
      rows={rows}
      columns={columns}
      fields={fields}
      labelOf={(row) => row.contactName}
      searchText={(row) => `${row.contactName} ${row.email} ${row.position} ${nameOf(row.companyId)}`}
      initialSort={{ key: 'contactName', direction: 'asc' }}
      canDelete={seesEverything}
      createDisabled={!companies.loading && companyOptions.length === 0}
      createDisabledReason="Create a company first — contacts belong to one."
      filters={
        <FilterSelect
          label="Company"
          value={companyFilter}
          onChange={setCompanyFilter}
          options={companyOptions.map((option) => ({ value: String(option.value), label: option.label }))}
          allLabel="All companies"
        />
      }
    />
  )
}
