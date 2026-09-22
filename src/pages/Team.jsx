import { useMemo, useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import { FilterSelect } from '../components/PageHeader'
import { Badge, Button, Field, Modal } from '../components/ui'
import { api } from '../api/client'
import { companiesApi, dealsApi, usersApi } from '../api/endpoints'
import { useToast } from '../hooks/useToast'
import { useCollection } from '../hooks/useCollection'
import { USER_ROLES } from '../constants/enums'
import { formatDate } from '../utils/format'

export default function Team() {
  const users = useCollection(usersApi)
  const companies = useCollection(companiesApi)
  const deals = useCollection(dealsApi)
  const [role, setRole] = useState('')
  const [resetting, setResetting] = useState(null)

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
        <div>
          <strong>{row.name}</strong>
          <small className="cell-sub">{row.email}</small>
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
  ]

  // Only creating takes a password. The stored value is a one-way hash, so there
  // is nothing to show on an edit - and nothing anyone can read back later.
  const createFields = [
    ...fields,
    {
      name: 'password',
      label: 'Temporary password',
      type: 'password',
      required: true,
      span: 'full',
      hint: 'Pass this to the new member. Only its hash is stored, so it cannot be read back — they can change it themselves from Your account.',
      validate: (value) => (value.length < 8 ? 'Password must be at least 8 characters.' : null),
    },
  ]

  // Registering rather than POST /api/Users: that endpoint creates an account
  // with no usable password, which cannot sign in.
  const createMember = async (payload) => {
    await api.post('/Auth/register', {
      name: payload.name,
      email: payload.email,
      userRole: payload.userRole,
      password: payload.password,
    })
  }

  return (
    <>
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
        createFields={createFields}
        onCreate={createMember}
        extraRowActions={(row) => (
          <Button size="sm" onClick={() => setResetting(row)}>
            Reset password
          </Button>
        )}
        filters={<FilterSelect label="Role" value={role} onChange={setRole} options={USER_ROLES} allLabel="All roles" />}
      />

      {resetting && <ResetPasswordDialog member={resetting} onClose={() => setResetting(null)} />}
    </>
  )
}

// Leadership setting a password for someone who has forgotten theirs. It replaces
// the hash outright - the old password is not needed and cannot be recovered.
function ResetPasswordDialog({ member, onClose }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()

  const submit = async (event) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setBusy(true)
    try {
      await api.post(`/Auth/users/${member.id}/reset-password`, { newPassword: password })
      toast.notify(`Password reset for ${member.name}. Pass it on and ask them to change it.`)
      onClose()
    } catch (cause) {
      setError(cause.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Reset password for ${member.name}`}
      subtitle={member.email}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {busy ? 'Resetting…' : 'Reset password'}
          </Button>
        </>
      }
    >
      <form className="account" onSubmit={submit}>
        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <Field label="New password" required hint="At least 8 characters. Only the hash is stored.">
          {(id) => (
            <input
              id={id}
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}
