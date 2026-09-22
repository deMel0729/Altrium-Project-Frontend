import { createContext, useContext } from 'react'

// Split from the provider for the same reason the auth context is: a module
// that exports a component as well as a hook makes react-refresh throw its
// state away on every edit.
export const AlertsCtx = createContext(null)

export function useAlerts() {
  const value = useContext(AlertsCtx)
  if (!value) throw new Error('useAlerts must be used inside <AlertsProvider>.')
  return value
}
