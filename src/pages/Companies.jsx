import { useMemo } from 'react'
import { CrudPage } from '../components/CrudPage'
import { Badge } from '../components/ui'
import { companiesApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { formatDate, initials } from '../utils/format'

export default function Companies() {
  const companies = useCollection(companiesApi)
  const users = useCollection(usersApi)

  const usersById = useMemo(() => indexById(users.items), [users.items])
  const ownerOptions = useMemo(
    () => users.items.map((user) => ({ value: user.id, label: `${user.name} · ${user.userRole}` })),
    [users.items],
  )

  const columns = [
    {
      key: 'companyName',
      header: 'Company',
      render: (row) => (
        <div className="cell-identity">
          <span className="avatar" aria-hidden="true">
            {initials(row.companyName)}
          </span>
          <div>
            <strong>{row.companyName}</strong>
            <small>{row.email || 'No email'}</small>
          </div>
        </div>
      ),
    },
    { key: 'industry', header: 'Industry' },
    {
      key: 'website',
      header: 'Website',
      render: (row) =>
        row.website ? (
          <a className="link" href={ensureProtocol(row.website)} target="_blank" rel="noreferrer">
            {row.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          '—'
        ),
    },
    { key: 'phone', header: 'Phone' },
    {
      key: 'userId',
      header: 'Owner',
      render: (row) => usersById.get(row.userId)?.name ?? <Badge tone="neutral">#{row.userId}</Badge>,
      sortValue: (row) => usersById.get(row.userId)?.name ?? '',
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (row) => formatDate(row.createdAt),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ]

  const fields = [
    { name: 'companyName', label: 'Company name', type: 'text', required: true, span: 'full' },
    { name: 'industry', label: 'Industry', type: 'text', placeholder: 'e.g. Manufacturing' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'website', label: 'Website', type: 'text', placeholder: 'acme.com' },
    { name: 'address', label: 'Address', type: 'textarea', span: 'full' },
    {
      name: 'userId',
      label: 'Account owner',
      type: 'select',
      valueType: 'number',
      required: true,
      options: ownerOptions,
      hint: ownerOptions.length ? undefined : 'Add a team member first — the API requires a valid user id.',
    },
    { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true, hint: 'Unchecking archives the company.' },
  ]

  return (
    <CrudPage
      title="Companies"
      subtitle="Accounts your team sells into."
      entityName="company"
      collection={companies}
      columns={columns}
      fields={fields}
      labelOf={(row) => row.companyName}
      searchText={(row) => `${row.companyName} ${row.industry} ${row.email} ${row.phone} ${row.website}`}
      initialSort={{ key: 'companyName', direction: 'asc' }}
      createDisabled={!users.loading && ownerOptions.length === 0}
      createDisabledReason="Add a team member first — companies need an owner."
    />
  )
}

const ensureProtocol = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
