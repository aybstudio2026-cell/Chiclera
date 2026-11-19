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

export const db = {
  async list(t) {
    if (supabase) return check(await supabase.from(t).select('*').order('created_at'))
    return ls(t)
  },
  async insert(t, row) {
    if (supabase) return check(await supabase.from(t).insert(row).select().single())
    const r = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }
    save(t, [...ls(t), r])
    return r
  },
  async update(t, id, patch) {
    if (supabase) return check(await supabase.from(t).update(patch).eq('id', id).select().single())
    save(t, ls(t).map((r) => (r.id === id ? { ...r, ...patch } : r)))
  },
  async remove(t, id) {
    if (supabase) return check(await supabase.from(t).delete().eq('id', id))
    save(t, ls(t).filter((r) => r.id !== id))
    if (t === 'negocios') save('revisiones', ls('revisiones').filter((r) => r.negocio_id !== id))
    if (t === 'maquinas') save('negocios', ls('negocios').map((n) => (n.maquina_id === id ? { ...n, maquina_id: null } : n)))
  },
}