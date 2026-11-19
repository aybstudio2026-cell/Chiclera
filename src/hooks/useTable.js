import { useCallback, useEffect, useState } from 'react'
import { db } from '../lib/db'

export function useTable(table) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { setRows(await db.list(table)); setError('') } catch (e) { setError(e.message) }
    setLoading(false)
  }, [table])
  useEffect(() => { load() }, [load])
  const act = (fn) => async (...args) => {
    try { await fn(table, ...args); await load(); return true } catch (e) { setError(e.message); return false }
  }
  return { rows, loading, error, insert: act(db.insert), update: act(db.update), remove: act(db.remove) }
}
