// Capa de datos: usa Supabase si hay variables en .env; si no, guarda en localStorage (modo prueba).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Todas las tablas viven en el schema "chiclera" (no en public)
export const supabase = url && key ? createClient(url, key, { db: { schema: 'chiclera' } }) : null
export const usingSupabase = !!supabase

const ls = (t) => JSON.parse(localStorage.getItem('chicle_' + t) || '[]')
const save = (t, rows) => localStorage.setItem('chicle_' + t, JSON.stringify(rows))
const check = ({ data, error }) => { if (error) throw error; return data }

// Caché en memoria y bus de suscripción para sincronizar vistas al instante sin re-peticiones innecesarias
const cache = new Map()
const listeners = new Map()

export const invalidateTable = (...tables) => {
  tables.forEach((t) => {
    cache.delete(t)
    if (listeners.has(t)) {
      listeners.get(t).forEach((cb) => cb())
    }
  })
}

export const subscribeTable = (t, cb) => {
  if (!listeners.has(t)) listeners.set(t, new Set())
  listeners.get(t).add(cb)
  return () => {
    const s = listeners.get(t)
    if (s) s.delete(cb)
  }
}

export const getCachedTable = (t) => cache.get(t)

export const db = {
  async list(t, forceRefresh = false) {
    if (!forceRefresh && cache.has(t)) {
      return cache.get(t)
    }
    let data
    if (supabase) {
      data = check(await supabase.from(t).select('*').order('created_at'))
    } else {
      data = ls(t)
    }
    cache.set(t, data)
    return data
  },
  async insert(t, row) {
    let r
    if (supabase) {
      r = check(await supabase.from(t).insert(row).select().single())
    } else {
      r = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }
      save(t, [...ls(t), r])
    }
    invalidateTable(t)
    return r
  },
  async update(t, id, patch) {
    let r
    if (supabase) {
      r = check(await supabase.from(t).update(patch).eq('id', id).select().single())
    } else {
      save(t, ls(t).map((item) => (item.id === id ? { ...item, ...patch } : item)))
    }
    invalidateTable(t)
    return r
  },
  async remove(t, id) {
    if (supabase) {
      check(await supabase.from(t).delete().eq('id', id))
    } else {
      save(t, ls(t).filter((item) => item.id !== id))
      if (t === 'negocios') save('revisiones', ls('revisiones').filter((r) => r.negocio_id !== id))
      if (t === 'maquinas') save('negocios', ls('negocios').map((n) => (n.maquina_id === id ? { ...n, maquina_id: null } : n)))
    }
    if (t === 'negocios') invalidateTable(t, 'revisiones')
    else if (t === 'maquinas') invalidateTable(t, 'negocios')
    else invalidateTable(t)
  },
}
