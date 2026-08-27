import { useCallback, useEffect, useState } from 'react'

// Loads a list from one CRUD resource and keeps it in sync after writes.
// Every controller soft-deletes and GET /all filters is_active = 1, so a
// refetch after each mutation is the cheapest way to stay truthful.
export function useCollection(resource, { enabled = true } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)

  // Deliberately does not flip `loading` on before awaiting: the first run is
  // driven by an effect, and a synchronous setState there costs a render pass.
  // `refresh` raises the spinner itself for user-triggered reloads.
  const load = useCallback(
    async (signal) => {
      try {
        const data = await resource.list({ signal })
        if (signal?.aborted) return
        setItems(Array.isArray(data) ? data : [])
        setError(null)
      } catch (err) {
        if (err.name === 'AbortError') return
        // A 404 from these controllers means "nothing stored yet", not a failure.
        if (err.status === 404) {
          setItems([])
          setError(null)
        } else {
          setError(err)
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [resource],
  )

  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    // Fetching on mount is the point of this effect; the state it sets lands
    // after the await, and the abort controller covers unmount mid-flight.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(controller.signal)
    return () => controller.abort()
  }, [enabled, load])

  const refresh = useCallback(() => {
    setLoading(true)
    return load()
  }, [load])

  const create = useCallback(
    async (payload) => {
      const created = await resource.create(payload)
      await load()
      return created
    },
    [load, resource],
  )

  const update = useCallback(
    async (id, payload) => {
      const updated = await resource.update(id, payload)
      await load()
      return updated
    },
    [load, resource],
  )

  const remove = useCallback(
    async (id) => {
      await resource.remove(id)
      await load()
    },
    [load, resource],
  )

  return { items, loading, error, refresh, create, update, remove }
}

// Builds an id -> row lookup so tables can show names instead of foreign keys.
export function indexById(items) {
  const map = new Map()
  for (const item of items) map.set(item.id, item)
  return map
}
