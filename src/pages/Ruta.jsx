import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { hoy } from '../lib/calc'

const MI_CASA = 'Avenida Pumacahua 1835'

export default function Ruta() {
  const n = useTable('negocios'), m = useTable('maquinas'), r = useTable('revisiones')
  const [soloPendientes, setSoloPendientes] = useState(false)

  const maquinasMap = useMemo(() => new Map(m.rows.map((x) => [x.id, x])), [m.rows])

  // Obtener la fecha más reciente de revisión de cada negocio
  const ultimaRevisionMap = useMemo(() => {
    const map = new Map()
    r.rows.forEach((rv) => {
      const prev = map.get(rv.negocio_id)
      if (!prev || rv.fecha.localeCompare(prev.fecha) > 0) {
        map.set(rv.negocio_id, rv)
      }
    })
    return map
  }, [r.rows])

  // Ordenar lista de paradas por prioridad (mayor tiempo sin revisar primero)
  const paradas = useMemo(() => {
    const hoyDate = new Date(hoy())

    return n.rows
      .map((neg) => {
        const maq = maquinasMap.get(neg.maquina_id)
        const ult = ultimaRevisionMap.get(neg.id)
        let dias = null
        let urgente = true

        if (ult?.fecha) {
          const diff = hoyDate - new Date(ult.fecha)
          dias = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
          urgente = dias >= 7
        }

        return {
          ...neg,
          maquina: maq,
          ultFecha: ult?.fecha,
          diasSinRevisar: dias,
          urgente,
        }
      })
      .sort((a, b) => {
        const dA = a.diasSinRevisar ?? 9999
        const dB = b.diasSinRevisar ?? 9999
        return dB - dA
      })
  }, [n.rows, maquinasMap, ultimaRevisionMap])

  const paradasVisibles = soloPendientes ? paradas.filter((p) => p.urgente) : paradas
  const paradasConDireccion = paradasVisibles.filter((p) => p.direccion && p.direccion.trim().length > 0)

  // Generador de URL optimizada para Google Maps con paradas múltiples desde Mi Casa
  const urlRutaCompleta = useMemo(() => {
    if (!paradasConDireccion.length) return null

    const direcciones = paradasConDireccion.map((p) => p.direccion.trim())

    if (direcciones.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        MI_CASA
      )}&destination=${encodeURIComponent(direcciones[0])}&travelmode=driving`
    }

    const destinoFinal = direcciones[direcciones.length - 1]
    const paradasIntermedias = direcciones.slice(0, direcciones.length - 1)

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      MI_CASA
    )}&destination=${encodeURIComponent(destinoFinal)}&waypoints=${encodeURIComponent(
      paradasIntermedias.join('|')
    )}&travelmode=driving`
  }, [paradasConDireccion])

  const pendientesCount = paradas.filter((p) => p.urgente).length

  return (
    <Page
      title="Ruta de visitas"
      actions={
        urlRutaCompleta ? (
          <a
            href={urlRutaCompleta}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-maps-main"
            title="Abre Google Maps con todas las paradas en orden comenzando en tu casa"
          >
            🗺️ Iniciar Ruta en Google Maps ({paradasConDireccion.length} paradas)
          </a>
        ) : null
      }
    >
      <Err e={n.error || m.error || r.error} />

      {/* Tarjeta de punto de partida oficial */}
      <div className="card route-start-card">
        <div className="route-start-info">
          <div className="route-icon">🏠</div>
          <div>
            <b>Punto de Partida de tu Ruta:</b>
            <div className="route-address">{MI_CASA} (Tu casa)</div>
            <small>Todas las rutas se calculan saliendo desde este punto hacia los negocios asignados.</small>
          </div>
        </div>
        {urlRutaCompleta && (
          <a
            href={urlRutaCompleta}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            🗺️ Abrir ruta completa en Maps
          </a>
        )}
      </div>

      <div className="grid">
        <Stat label="Total negocios en ruta" value={n.rows.length} />
        <Stat label="Máquinas activas" value={m.rows.filter((x) => x.estado === 'instalada').length} />
        <div className={`stat ${pendientesCount > 0 ? 'hot' : ''}`}>
          <span>Pendientes de revisión</span>
          <b>{pendientesCount}</b>
          <small>{pendientesCount > 0 ? 'Más de 7 días o sin revisión' : 'Todo al día esta semana'}</small>
        </div>
      </div>

      <div className="card">
        <div className="card-header-flex">
          <h3>Itinerario sugerido de visitas</h3>
          <div className="filter-group">
            <button
              type="button"
              className={!soloPendientes ? 'active-filter' : 'alt'}
              onClick={() => setSoloPendientes(false)}
            >
              Todos ({n.rows.length})
            </button>
            <button
              type="button"
              className={soloPendientes ? 'active-filter' : 'alt'}
              onClick={() => setSoloPendientes(true)}
            >
              Solo pendientes ({pendientesCount})
            </button>
          </div>
        </div>

        {!paradasVisibles.length ? (
          <p className="empty">
            {soloPendientes
              ? '🎉 ¡Excelente! No tienes visitas pendientes ni atrasadas esta semana.'
              : 'Aún no tienes negocios registrados. Agrégalos en Negocios y dueños.'}
          </p>
        ) : (
          <div className="timeline-container">
            {/* Hito inicial: Casa */}
            <div className="timeline-step start">
              <div className="step-badge">0</div>
              <div className="step-content">
                <div className="step-title">
                  <b>Salida: Mi Casa</b>
                  <span className="pill info">Punto de partida</span>
                </div>
                <div className="step-sub">{MI_CASA}</div>
              </div>
            </div>

            {/* Paradas en orden */}
            {paradasVisibles.map((x, idx) => (
              <div key={x.id} className={`timeline-step ${x.urgente ? 'urgent' : ''}`}>
                <div className="step-badge">{idx + 1}</div>
                <div className="step-content">
                  <div className="step-title">
                    <b>{x.negocio}</b>
                    {x.maquina ? (
                      <span className="pill ok">Máq: {x.maquina.codigo}</span>
                    ) : (
                      <span className="pill warn">Sin máquina</span>
                    )}
                    {x.urgente ? (
                      <span className="pill warn">
                        {x.diasSinRevisar === null ? 'Sin revisión previa' : `Hace ${x.diasSinRevisar} días`}
                      </span>
                    ) : (
                      <span className="pill ok">Al día ({x.diasSinRevisar} d)</span>
                    )}
                  </div>

                  <div className="step-sub">
                    <span>📍 {x.direccion || 'Sin dirección registrada'}</span>
                    <span>👤 Dueño: {x.dueno}</span>
                    {x.telefono && (
                      <a href={`tel:${x.telefono}`} className="tel-link">
                        📞 {x.telefono}
                      </a>
                    )}
                  </div>

                  <div className="step-actions">
                    {x.direccion && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                          MI_CASA
                        )}&destination=${encodeURIComponent(x.direccion)}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn alt"
                        title="Navegar en Google Maps desde tu casa hacia este local"
                      >
                        🚗 Cómo llegar desde casa
                      </a>
                    )}
                    <Link to={`/negocios/${x.id}/revisiones`} className="btn">
                      💰 Registrar revisión
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
