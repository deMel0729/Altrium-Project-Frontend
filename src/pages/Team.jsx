import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect } from '../components/PageHeader'
import { Badge } from '../components/ui'
import { companiesApi, dealsApi, usersApi } from '../api/endpoints'
import { useCollection } from '../hooks/useCollection'
import { USER_ROLES } from '../constants/enums'
import { formatDate, initials } from '../utils/format'

export default function Team() {
  const users = useCollection(usersApi)
  const companies = useCollection(companiesApi)
  const deals = useCollection(dealsApi)
  const [role, setRole] = useState('')

  const workload = useMemo(() => {
    const map = new Map()
    const bump = (id, key) => {
      const entry = map.get(id) ?? { companies: 0, deals: 0 }
      entry[key] += 1
      map.set(id, entry)
    }
    for (const company of companies.items) bump(company.userId, 'companies')
    for (const deal of deals.items) bump(deal.userId, 'deals')
    return map
  }, [companies.items, deals.items])

  const rows = useMemo(
    () => (role ? users.items.filter((user) => user.userRole === role) : users.items),
    [role, users.items],
  )

  const columns = [
    {
      key: 'name',
      header: 'Member',
      render: (row) => (
        <div className="cell-identity">
          <span className="avatar" aria-hidden="true">
            {initials(row.name)}
          </span>
          <div>
            <strong>{row.name}</strong>
            <small>{row.email}</small>
          </div>
        </div>
      ),
    },
    { key: 'userRole', header: 'Role', render: (row) => <Badge>{row.userRole}</Badge> },
    {
      key: 'companies',
      header: 'Accounts',
      align: 'right',
      render: (row) => workload.get(row.id)?.companies ?? 0,
      sortValue: (row) => workload.get(row.id)?.companies ?? 0,
    },
    {
      key: 'deals',
      header: 'Deals',
      align: 'right',
      render: (row) => workload.get(row.id)?.deals ?? 0,
      sortValue: (row) => workload.get(row.id)?.deals ?? 0,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row) => formatDate(row.createdAt),
      sortValue: (row) => new Date(row.createdAt).getTime(),
    },
  ]

  const fields = [
    { name: 'name', label: 'Full name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'userRole', label: 'Role', type: 'select', options: USER_ROLES, required: true, defaultValue: 'SALES REP' },
    {
      name: 'passwordHash',
      label: 'Password hash',
      type: 'password',
      omitWhenEmpty: true,
      span: 'full',
      // The API writes this column verbatim — it does no hashing of its own.
      hint: 'Stored exactly as entered; the API does not hash it. Leave blank to keep the current value.',
    },
    { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true, hint: 'Unchecking archives the member.' },
  ]

  return (
    <CrudPage
      title="Team"
      subtitle="Reps, managers and leadership with access to the pipeline."
      entityName="member"
      collection={users}
      rows={rows}
      columns={columns}
      fields={fields}
      labelOf={(row) => row.name}
      searchText={(row) => `${row.name} ${row.email} ${row.userRole}`}
      initialSort={{ key: 'name', direction: 'asc' }}
      filters={<FilterSelect label="Role" value={role} onChange={setRole} options={USER_ROLES} allLabel="All roles" />}
    />
  )
}
