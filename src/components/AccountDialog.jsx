import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/auth-context'
import { useToast } from '../hooks/useToast'
import { Button, Field, Modal } from './ui'

// "Your account" - the only place a user edits their own record. Two separate
// forms because they are two separate API calls with different rules: details go
// to PUT /Auth/me, while a password change has to prove the current one first.
//
// Role and account status are shown but not editable. Both are set by leadership,
// and the API ignores them here regardless of what the client sends.
export function AccountDialog({ onClose }) {
  const { user, refreshUser, logout } = useAuth()
  const toast = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingDetails, setSavingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState(null)

  const emailChanged = email.trim() !== (user?.email ?? '')

  const saveDetails = async (event) => {
    event.preventDefault()
    setDetailsError(null)
    setSavingDetails(true)
    try {
      await api.put('/Auth/me', { name: name.trim(), email: email.trim() })
      await refreshUser()
      toast.notify('Your details were updated.')
      onClose()
    } catch (error) {
      setDetailsError(error.message)
    } finally {
      setSavingDetails(false)
    }
  }

  const savePassword = async (event) => {
    event.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }

    setSavingPassword(true)
    try {
      await api.post('/Auth/change-password', { currentPassword, newPassword })
      toast.notify('Password changed. Sign in again with your new password.')
      // The old token stays valid until it expires, so signing out is the honest
      // end to a password change rather than leaving a stale session running.
      logout()
    } catch (error) {
      setPasswordError(error.message)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Modal
      title="Your account"
      subtitle={user?.userRole ? `${user.userRole} · set by leadership` : undefined}
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <form className="account" onSubmit={saveDetails}>
        <h3 className="account__heading">Your details</h3>

        {detailsError && (
          <p className="login__error" role="alert">
            {detailsError}
          </p>
        )}

        <Field label="Name" required>
          {(id) => (
            <input
              id={id}
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          )}
        </Field>

        <Field
          label="Email"
          required
          hint={emailChanged ? 'This is also your sign-in address.' : undefined}
        >
          {(id) => (
            <input
              id={id}
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          )}
        </Field>

        <Button variant="primary" type="submit" disabled={savingDetails}>
          {savingDetails ? 'Saving…' : 'Save details'}
        </Button>
      </form>

      <form className="account account--divided" onSubmit={savePassword}>
        <h3 className="account__heading">Change password</h3>

        {passwordError && (
          <p className="login__error" role="alert">
            {passwordError}
          </p>
        )}

        <Field label="Current password" required>
          {(id) => (
            <input
              id={id}
              className="input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          )}
        </Field>

        <Field label="New password" required hint="At least 8 characters.">
          {(id) => (
            <input
              id={id}
              className="input"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          )}
        </Field>

        <Button type="submit" disabled={savingPassword}>
          {savingPassword ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </Modal>
  )
}
