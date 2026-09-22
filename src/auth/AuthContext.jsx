import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { clearSession, getStoredUser, getToken, onSessionEnded, saveSession, saveUser } from './session'
import { AuthCtx, ROLES } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [ready, setReady] = useState(false)

  // The token is the source of truth, not the cached user object. On a refresh we
  // ask the API who we are: if the token expired while the tab was closed, this
  // clears the stale user instead of showing a signed-in shell that 401s.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!getToken()) {
        setUser(null)
        setReady(true)
        return
      }
      try {
        const me = await api.get('/Auth/me')
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [])

  // A 401 raised by any request signs the app out.
  useEffect(() => onSessionEnded(() => setUser(null)), [])

  const login = useCallback(async (email, password) => {
    // anonymous: a bad password must surface as an error on the form, not as a
    // session-expired sign-out.
    const result = await api.post('/Auth/login', { email, password }, { anonymous: true })
    saveSession(result.accessToken, result.user)
    setUser(result.user)
    return result.user
  }, [])

  // Re-reads the signed-in user from the API, e.g. after editing your own
  // details, so the sidebar and role gates reflect the change immediately.
  const refreshUser = useCallback(async () => {
    const me = await api.get('/Auth/me')
    saveUser(me)
    setUser(me)
    return me
  }, [])

  const logout = useCallback(() => {
    // Logging out is a client-side act: the token is discarded. It stays
    // technically valid until it expires, which is why the lifetime is short.
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      logout,
      refreshUser,
      isLeadership: user?.userRole === ROLES.LEADERSHIP,
      seesEverything: Boolean(user?.seesEverything),
    }),
    [user, ready, login, logout, refreshUser],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
