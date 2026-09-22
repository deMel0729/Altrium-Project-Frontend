import { useMemo } from 'react'
import { CrudPage } from '../components/CrudPage'
import { Badge } from '../components/ui'
import { companiesApi, usersApi } from '../api/endpoints'
import { indexById, useCollection } from '../hooks/useCollection'
import { ROLES, useAuth } from '../auth/auth-context'
import { formatDate } from '../utils/format'

export default function Companies() {
  // seesEverything is true for managers and leadership - the same split the API uses.
  const { seesEverything, isLeadership, user: me } = useAuth()
  const companies = useCollection(companiesApi)
  const users = useCollection(usersApi, { enabled: seesEverything })

  const usersById = useMemo(() => indexById(users.items), [users.items])
  // A manager assigns work downwards: reps and other managers, never a
  // leadership account. Mirrors what the API enforces.
  const ownerOptions = useMemo(
    () =>
      users.items
        .filter((user) => isLeadership || user.userRole !== ROLES.LEADERSHIP || user.id === me?.id)
        .map((user) => ({ value: user.id, label: `${user.name} · ${user.userRole}` })),
    [users.items, isLeadership, me?.id],
  )

  const columns = [
    {
      key: 'companyName',
      header: 'Company',
      render: (row) => (
        <div>
          <strong>{row.companyName}</strong>
          <small className="cell-sub">{row.email || 'No email'}</small>
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
      render: (row) => usersById.get(row.userId)?.name ?? <Badge>#{row.userId}</Badge>,
      sortValue: (row) => usersById.get(row.userId)?.name ?? '',
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (row) => formatDate(row.createdAt),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ]

  // A rep sees only their own records, so an Owner column carries no
  // information - and the user list it needs is manager-only.
  const visibleColumns = seesEverything ? columns : columns.filter((c) => c.key !== 'userId')
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
  ]

  return (
    <CrudPage
      title="Companies"
      subtitle="Accounts your team sells into."
      entityName="company"
      collection={companies}
      columns={visibleColumns}
      fields={fields}
      labelOf={(row) => row.companyName}
      searchText={(row) => `${row.companyName} ${row.industry} ${row.email} ${row.phone} ${row.website}`}
      initialSort={{ key: 'companyName', direction: 'asc' }}
      canCreate={seesEverything}
      canEdit={seesEverything}
      canDelete={seesEverything}
      createDisabled={!users.loading && ownerOptions.length === 0}
      createDisabledReason="Add a team member first — companies need an owner."
    />
  )
}

const ensureProtocol = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
