// Holds the access token outside React so the api client can reach it without
// importing a component, and so a 401 anywhere can end the session.
//
// Storage choice: sessionStorage. It survives a page refresh (a plain in-memory
// token would sign the user out on every F5) but dies with the tab and is not
// shared between tabs. It is still readable by any script running on the page, so
// the real protection is that the token is short lived — the API issues it for
// eight hours and validates the expiry on every request.

const TOKEN_KEY = 'altrium-token'
const USER_KEY = 'altrium-user'

let listeners = []

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSession(token, user) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Private mode with storage disabled: the session simply will not survive a refresh.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn())
}

// The api client calls this when the API answers 401, so an expired token takes
// the user back to the login screen instead of leaving a half-broken page.
export function onSessionEnded(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}
