import { useMemo } from 'react'
import { followUpsApi } from '../api/endpoints'
import { useCollection } from '../hooks/useCollection'
import { useAuth } from '../auth/auth-context'
import { daysUntil } from '../utils/format'
import { AlertsCtx } from './alerts-context'

// One follow-ups fetch shared by the whole signed-in app: the sidebar badge,
// the dashboard panel and the Follow-ups page all read from this collection.
// Fetching them separately would let the badge keep counting a follow-up that
// had just been ticked off on the page next to it.
export function AlertsProvider({ children }) {
  const { user } = useAuth()
  const collection = useCollection(followUpsApi)
  const items = collection.items

  // The badge counts only the signed-in user's own work. A rep is already
  // scoped to their own rows by the API; a manager gets the whole team back,
  // and a badge counting other people's follow-ups is a number they cannot
  // act on, so it stops being worth looking at.
  const dueCount = useMemo(() => {
    if (!user) return 0
    return items.filter(
      (row) =>
        !row.completed &&
        row.userId === user.id &&
        // Overdue or due today. The fallback keeps an unparseable date out of
        // the count rather than reporting it as due.
        (daysUntil(row.dueDate) ?? 1) <= 0,
    ).length
  }, [items, user])

  return <AlertsCtx.Provider value={{ collection, dueCount }}>{children}</AlertsCtx.Provider>
}
