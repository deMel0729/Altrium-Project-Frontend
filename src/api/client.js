import { clearSession, getToken } from '../auth/session'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const UNREACHABLE =
  'Could not reach the CRM API. Start the backend (dotnet run in Altrium_Project_Backend) and try again.'

// The dev proxy answers with a bare gateway error when the backend is not
// listening, so those codes mean "offline", not "the request was rejected".
const isUnreachable = (status) => status === 0 || status === 502 || status === 503 || status === 504

// ASP.NET returns validation failures as a bare string, a ProblemDetails object,
// or a ModelState dictionary. Flatten whichever shape arrived into one message.
function messageFrom(body, status) {
  if (isUnreachable(status)) return UNREACHABLE
  if (!body) return `Request failed (${status})`
  if (typeof body === 'string') return body
  if (body.errors && typeof body.errors === 'object') {
    const flat = Object.values(body.errors).flat().filter(Boolean)
    if (flat.length) return flat.join(' ')
  }
  return body.title || body.detail || `Request failed (${status})`
}

// Every call carries the signed token. The API re-derives the caller from it, so
// the client never sends a user id to say who it is.
function buildHeaders(hasBody) {
  const headers = { Accept: 'application/json' }
  if (hasBody) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function request(path, { method = 'GET', body, signal, anonymous = false } = {}) {
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: buildHeaders(body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    if (cause.name === 'AbortError') throw cause
    throw new ApiError(UNREACHABLE, 0, null)
  }

  // An expired or rejected token ends the session everywhere at once. Login
  // failures are excluded: a wrong password should show an error, not sign out.
  if (response.status === 401 && !anonymous) {
    clearSession()
    throw new ApiError('Your session has expired. Please sign in again.', 401, null)
  }

  if (response.status === 403) {
    throw new ApiError('Your role does not allow that action.', 403, null)
  }

  if (response.status === 204) return null

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    throw new ApiError(messageFrom(payload, response.status), response.status, payload)
  }
  return payload
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}

// Every controller exposes the same five actions, so one factory covers them all.
export function createResource(route) {
  return {
    route,
    list: (options) => api.get(`/${route}`, options),
    get: (id) => api.get(`/${route}/${id}`),
    create: (payload) => api.post(`/${route}`, payload),
    update: (id, payload) => api.put(`/${route}/${id}`, { ...payload, id: Number(id) }),
    remove: (id) => api.delete(`/${route}/${id}`),
  }
}
