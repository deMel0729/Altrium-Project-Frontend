import { createContext, useContext } from 'react'

// The context object, the role names and the hook live here rather than beside
// <AuthProvider> so that file exports a component and nothing else (react-refresh).

export const ROLES = {
  LEADERSHIP: 'LEADERSHIP',
  SALES_MANAGER: 'SALES MANAGER',
  SALES_REP: 'SALES REP',
}

export const AuthCtx = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
