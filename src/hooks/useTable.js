import { useCallback, useEffect, useState } from 'react'
import { db, getCachedTable, subscribeTable } from '../lib/db'

export function useTable(table) {
  const cached = getCachedTable(table)
  const [rows, setRows] = useState(cached || [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  const load = useCallback(async (force = false) => {
    try {
      const data = await db.list(table, force)
      setRows(data)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [table])

  useEffect(() => {
    load()
    const unsubscribe = subscribeTable(table, () => {
      load(true)
    })
    return unsubscribe
  }, [load, table])

  const act = (fn) => async (...args) => {
    try {
      const res = await fn(table, ...args)
      await load(true)
      return res || true
    } catch (e) {
      setError(e.message)
      return false
    }
  }

  return { rows, loading, error, refresh: () => load(true), insert: act(db.insert), update: act(db.update), remove: act(db.remove) }
}
