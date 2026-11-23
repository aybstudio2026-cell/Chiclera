import { useMemo, useState } from 'react'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, Stat, formData } from '../components'
import { hoy, money, sum } from '../lib/calc'

const CATEGORIAS_SUGERIDAS = [
  'Chicleras / Peloteras',
  'Máquinas de Peluches / Garra',
  'Vending de Snacks / Bebidas',
  'Vending de Café',
  'Juegos mecánicos infantiles',
  'Nuevo punto de venta',
  'Otro',
]

const ESTADOS = [
  { id: 'idea', label: '💡 Idea inicial', color: 'info' },
  { id: 'evaluando', label: '🔍 Evaluando', color: 'warn' },
  { id: 'aprobada', label: '🚀 Aprobada / En marcha', color: 'ok' },
  { id: 'descartada', label: '❌ Descartada', color: 'muted' },
]

export default function Ideas() {
  const ideas = useTable('ideas_negocio')
  const [ed, setEd] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [orden, setOrden] = useState('puntuacion_desc')

  // Puntuación seleccionada en el formulario (por defecto 8 si es nueva)
  const [puntuacionForm, setPuntuacionForm] = useState(8)

  const abrirEdicion = (item = {}) => {
    setEd(item)
    setPuntuacionForm(item.puntuacion != null ? Number(item.puntuacion) : 8)
  }

  const save = async (e) => {
    const d = formData(e, ['inversion_inicial'])
    d.puntuacion = Number(puntuacionForm)
    d.inversion_inicial = Number(d.inversion_inicial || 0)
    d.estado = d.estado || 'idea'
    d.categoria = d.categoria || 'Otro'

    const ok = await (ed.id ? ideas.update(ed.id, d) : ideas.insert(d))
    if (ok) {
      setEd(null)
    }
  }

  const cambiarEstadoRapido = async (item, nuevoEstado) => {
    await ideas.update(item.id, { estado: nuevoEstado })
  }

  const removeIdea = async (item) => {
    if (confirm(`¿Eliminar la idea "${item.titulo}"?`)) {
      await ideas.remove(item.id)
    }
  }

  // Métricas generales
  const stats = useMemo(() => {
    const rows = ideas.rows
    const total = rows.length
    const inversionTotal = sum(rows, 'inversion_inicial')
    const ideasTop = rows.filter((x) => Number(x.puntuacion) >= 8).length
    const promedio = total > 0
      ? (rows.reduce((acc, x) => acc + (Number(x.puntuacion) || 0), 0) / total).toFixed(1)
      : '0.0'

    return { total, inversionTotal, ideasTop, promedio }
  }, [ideas.rows])

  // Filtrado y ordenamiento
  const ideasFiltradas = useMemo(() => {
    let list = [...ideas.rows]

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(
        (x) =>
          x.titulo.toLowerCase().includes(q) ||
          (x.descripcion && x.descripcion.toLowerCase().includes(q)) ||
          (x.categoria && x.categoria.toLowerCase().includes(q))
      )
    }

    if (filtroEstado !== 'todos') {
      list = list.filter((x) => x.estado === filtroEstado)
    }

    // Orden
    list.sort((a, b) => {
      if (orden === 'puntuacion_desc') return (Number(b.puntuacion) || 0) - (Number(a.puntuacion) || 0)
      if (orden === 'puntuacion_asc') return (Number(a.puntuacion) || 0) - (Number(b.puntuacion) || 0)
      if (orden === 'inversion_asc') return (Number(a.inversion_inicial) || 0) - (Number(b.inversion_inicial) || 0)
      if (orden === 'inversion_desc') return (Number(b.inversion_inicial) || 0) - (Number(a.inversion_inicial) || 0)
      if (orden === 'recientes') return (b.created_at || '').localeCompare(a.created_at || '')
      return 0
    })

    return list
  }, [ideas.rows, busqueda, filtroEstado, orden])

  // Estilo visual del badge de puntuación
  const getBadgeStyle = (score) => {
    const s = Number(score)
    if (s >= 9) return { color: '#047857', bg: '#d1fae5', border: '#10b981', label: '🔥 Excelente' }
    if (s >= 7) return { color: '#0f766e', bg: '#ccfbf1', border: '#14b8a6', label: '✨ Muy buena' }
    if (s >= 5) return { color: '#b45309', bg: '#fef3c7', border: '#f59e0b', label: '⚖️ Promedio' }
    return { color: '#b91c1c', bg: '#fee2e2', border: '#ef4444', label: '⚠️ Riesgosa' }
  }

  return (
    <Page
      title="Ideas de Negocio y Expansión"
      actions={
        <div className="ideas-header-action">
          <button onClick={() => abrirEdicion({})}>
            💡 Nueva Idea de Negocio
          </button>
        </div>
      }
    >
      <Err e={ideas.error} />

      {/* KPI Cards de resumen */}
      <div className="grid">
        <Stat
          label="Total de Ideas"
          value={stats.total}
          sub={`${stats.ideasTop} ideas con puntaje top`}
        />
        <div className="stat hot">
          <span>Inversión Total Estimada</span>
          <b>{money(stats.inversionTotal)}</b>
          <small>en todas las ideas registradas</small>
        </div>
        <Stat
          label="⭐ Puntuación Promedio"
          value={`${stats.promedio} / 10`}
          sub="viabilidad general"
        />
        <Stat
          label="🚀 Ideas Top (8+ pts)"
          value={stats.ideasTop}
          sub="listas para evaluar / ejecutar"
        />
      </div>

      {/* Formulario de creación / edición */}
      {ed && (
        <div className="card ideas-form-wrapper" style={{ border: '2px solid var(--berry)', boxShadow: '0 8px 30px rgba(224, 36, 94, 0.12)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '18px', color: 'var(--plum)' }}>
              {ed.id ? `✏️ Editar Idea: ${ed.titulo}` : '💡 Registrar Nueva Idea de Negocio'}
            </h3>
            <button
              type="button"
              className="alt"
              onClick={() => setEd(null)}
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              ✕ Cerrar
            </button>
          </div>

          <form className="ideas-form-card" key={ed.id || 'new'} onSubmit={save}>
            <label style={{ width: '100%' }}>
              <span>Título de la Idea o Proyecto</span>
              <input
                name="titulo"
                defaultValue={ed.titulo || ''}
                placeholder="Ej. Máquina de peluches en Galería Primavera / Vending de café"
                required
                style={{ width: '100%', fontSize: '16px', fontWeight: '600' }}
              />
            </label>

            <div className="ideas-fields-grid">
              <label>
                <span>Inversión Inicial Estimada (S/)</span>
                <input
                  name="inversion_inicial"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={ed.inversion_inicial ?? 500}
                  placeholder="500"
                  required
                  style={{ width: '100%', fontSize: '16px' }}
                />
              </label>

              <label>
                <span>Categoría</span>
                <select name="categoria" defaultValue={ed.categoria || 'Chicleras / Peloteras'} style={{ width: '100%', fontSize: '15px' }}>
                  {CATEGORIAS_SUGERIDAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Estado actual</span>
                <select name="estado" defaultValue={ed.estado || 'idea'} style={{ width: '100%', fontSize: '15px' }}>
                  {ESTADOS.map((st) => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Selector de Puntuación de 1 a 10 interactivo */}
            <div className="ideas-score-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--plum)' }}>
                  Puntuación de Viabilidad (1 al 10):
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '800',
                  color: getBadgeStyle(puntuacionForm).color,
                  background: getBadgeStyle(puntuacionForm).bg,
                  padding: '4px 14px',
                  borderRadius: '12px',
                  border: `1.5px solid ${getBadgeStyle(puntuacionForm).border}`,
                }}>
                  ⭐ {puntuacionForm} / 10 • {getBadgeStyle(puntuacionForm).label}
                </span>
              </div>

              {/* Botones de número del 1 al 10 */}
              <div className="score-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = puntuacionForm === num
                  const style = getBadgeStyle(num)
                  return (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setPuntuacionForm(num)}
                      style={{
                        borderRadius: '10px',
                        border: isSelected ? `2.5px solid ${style.border}` : '1.5px solid var(--line)',
                        background: isSelected ? style.bg : '#fff',
                        color: isSelected ? style.color : 'var(--ink)',
                        fontWeight: isSelected ? '800' : '600',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 3px 8px rgba(0,0,0,0.12)' : 'none',
                        transform: isSelected ? 'scale(1.04)' : 'none',
                        padding: 0,
                      }}
                    >
                      {num}
                    </button>
                  )
                })}
              </div>
            </div>

            <label style={{ width: '100%' }}>
              <span>Descripción y detalles de la idea</span>
              <textarea
                name="descripcion"
                rows="4"
                defaultValue={ed.descripcion || ''}
                placeholder="Explica de qué trata la idea, ubicación tentativa, proveedores, costos estimados, margen esperado, contactos, etc."
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--line)', fontSize: '15px', resize: 'vertical' }}
              />
            </label>

            <div className="ideas-form-actions">
              <button type="button" className="alt" onClick={() => setEd(null)}>
                Cancelar
              </button>
              <button type="submit" style={{ fontWeight: '700' }}>
                💾 Guardar Idea
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="card ideas-filters-card" style={{ padding: '14px', marginBottom: '16px' }}>
        <div className="ideas-filters-row">
          <div className="ideas-filters-search">
            <input
              type="search"
              placeholder="🔍 Buscar por título, categoría o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="ideas-filters-selects">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              {ESTADOS.map((st) => (
                <option key={st.id} value={st.id}>{st.label}</option>
              ))}
            </select>

            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            >
              <option value="puntuacion_desc">⭐ Mayor puntuación (10 a 1)</option>
              <option value="puntuacion_asc">⭐ Menor puntuación</option>
              <option value="inversion_asc">💰 Menor inversión</option>
              <option value="inversion_desc">💰 Mayor inversión</option>
              <option value="recientes">🕒 Más recientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Ideas en Tarjetas */}
      {!ideasFiltradas.length ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '36px 16px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '8px' }}>💡</span>
            <h3>No hay ideas de negocio registradas todavía</h3>
            <p className="sub-text" style={{ maxWidth: '480px', margin: '0 auto 16px' }}>
              Apunta aquí tus planes de expansión (nuevas máquinas, productos, locales tentativos) para no perder ninguna oportunidad.
            </p>
            <button onClick={() => abrirEdicion({})}>
              ➕ Registrar mi primera idea
            </button>
          </div>
        </div>
      ) : (
        <div className="ideas-cards-grid">
          {ideasFiltradas.map((item) => {
            const badge = getBadgeStyle(item.puntuacion)
            const estadoObj = ESTADOS.find((s) => s.id === item.estado) || ESTADOS[0]

            return (
              <div
                key={item.id}
                className="idea-card"
                style={{
                  borderTop: `4px solid ${badge.border}`,
                }}
              >
                <div>
                  {/* Cabecera de la tarjeta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="pill info" style={{ fontSize: '11px', marginBottom: '6px', display: 'inline-block' }}>
                        {item.categoria || 'Negocio'}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--plum)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                        {item.titulo}
                      </h3>
                    </div>

                    {/* Insignia de puntuación 1 al 10 */}
                    <div
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        border: `1.5px solid ${badge.border}`,
                        padding: '4px 10px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '14px',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                      title={`Puntuación de viabilidad: ${item.puntuacion}/10`}
                    >
                      ⭐ {item.puntuacion}/10
                    </div>
                  </div>

                  {/* Estado y barra de puntuación */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 12px' }}>
                    <span className={`pill ${estadoObj.color === 'ok' ? 'ok' : estadoObj.color === 'warn' ? 'warn' : 'info'}`} style={{ fontSize: '11.5px' }}>
                      {estadoObj.label}
                    </span>
                    <div className="bar" style={{ flex: 1, height: '8px' }}>
                      <i style={{ width: `${(Number(item.puntuacion || 0) / 10) * 100}%`, background: badge.border }} />
                    </div>
                  </div>

                  {/* Tarjeta de Inversión Inicial */}
                  <div style={{
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--mute)' }}>Inversión requerida:</span>
                    <b style={{ fontSize: '16px', color: 'var(--ink)' }}>{money(item.inversion_inicial)}</b>
                  </div>

                  {/* Descripción */}
                  {item.descripcion ? (
                    <p style={{
                      fontSize: '13.5px',
                      color: 'var(--ink)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                      marginBottom: '16px',
                    }}>
                      {item.descripcion}
                    </p>
                  ) : (
                    <p className="sub-text" style={{ fontStyle: 'italic', marginBottom: '16px', fontSize: '13px' }}>
                      Sin descripción detallada.
                    </p>
                  )}
                </div>

                {/* Acciones al pie de la tarjeta */}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: 'auto' }}>
                  {/* Selector rápido de estado */}
                  <div className="idea-quick-chips">
                    {item.estado !== 'aprobada' && (
                      <button
                        type="button"
                        className="idea-quick-chip"
                        onClick={() => cambiarEstadoRapido(item, 'aprobada')}
                        title="Marcar como aprobada para ejecución"
                      >
                        ✅ Aprobar
                      </button>
                    )}
                    {item.estado !== 'evaluando' && item.estado !== 'aprobada' && (
                      <button
                        type="button"
                        className="idea-quick-chip"
                        onClick={() => cambiarEstadoRapido(item, 'evaluando')}
                        title="Marcar como en evaluación"
                      >
                        🔍 Evaluar
                      </button>
                    )}
                    {item.estado !== 'descartada' && (
                      <button
                        type="button"
                        className="idea-quick-chip"
                        style={{ color: '#991b1b', borderColor: '#fecaca' }}
                        onClick={() => cambiarEstadoRapido(item, 'descartada')}
                        title="Descartar idea"
                      >
                        ❌ Descartar
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <small className="sub-text" style={{ fontSize: '11px' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </small>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="alt" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => abrirEdicion(item)}>
                        ✏️ Editar
                      </button>
                      <button className="del" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => removeIdea(item)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}
