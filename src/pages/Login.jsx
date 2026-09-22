import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { Button, Field } from '../components/ui'
import { Logo } from '../components/Logo'
import officePhoto from '../assets/login-office.jpg'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Where the user was heading before they were bounced to the login screen.
  const destination = location.state?.from ?? '/'

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (cause) {
      // The API answers with one generic message for every failure, so a wrong
      // email and a wrong password look identical from here.
      setError(cause.message ?? 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      {/* Desktop only - CSS hides this below 900px, so the phone layout is
          unchanged. Edit the two lines of copy below to change the panel text. */}
      <aside className="login__art">
        <img className="login__art-img" src={officePhoto} alt="" />
        <div className="login__art-overlay">
          <p className="login__art-welcome">Welcome back</p>
          <blockquote className="login__art-quote">
            “The deal you close next quarter starts with a follow up someone
            remembered to make this week.”
          </blockquote>
        </div>
      </aside>

      <form className="login__card" onSubmit={onSubmit}>
        <div className="login__brand">
          <Logo className="login__logo" />
        </div>

        <h1 className="login__title">Sign in</h1>
        <p className="login__subtitle">Use the account your manager set up for you.</p>

        {error && (
          <p className="login__error" role="alert">
            {error}
          </p>
        )}

        <Field label="Email" required>
          {(id) => (
            <input
              id={id}
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          )}
        </Field>

        <Field label="Password" required>
          {(id) => (
            <input
              id={id}
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          )}
        </Field>

        <Button variant="primary" className="login__submit" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="login__foot">
          Forgot your password? Ask a leadership user to reset it for you.
        </p>
      </form>
    </div>
  )
}
