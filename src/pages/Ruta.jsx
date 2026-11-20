import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { hoy } from '../lib/calc'

export default function Ruta() {
  const n = useTable('negocios'), m = useTable('maquinas'), r = useTable('revisiones')
  const [soloPendientes, setSoloPendientes] = useState(false)

  const maquinasMap = useMemo(() => new Map(m.rows.map((x) => [x.id, x])), [m.rows])

  // Última revisión por negocio
  const ultimaRevisionPorNegocio = useMemo(() => {
    const map = new Map()
    r.rows.forEach((rv) => {
      const prev = map.get(rv.negocio_id)
      if (!prev || rv.fecha.localeCompare(prev.fecha) > 0) {
        map.set(rv.negocio_id, rv)
      }
    })
    return map
  }, [r.rows])

  // Procesar lista con cálculo de días
  const rutaLista = useMemo(() => {
    const fechaHoy = new Date(hoy())

    return n.rows.map((neg) => {
      const maq = maquinasMap.get(neg.maquina_id)
      const ultRev = ultimaRevisionPorNegocio.get(neg.id)
      let dias = null
      let estadoVisita = 'pendiente' // 'urgente' (>7 dias o sin rev), 'al-dia' (<=7 dias)

      if (ultRev?.fecha) {
        const diffMs = fechaHoy - new Date(ultRev.fecha)
        dias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
        estadoVisita = dias > 7 ? 'urgente' : 'al-dia'
      } else {
        estadoVisita = 'urgente' // Nunca revisada
      }

      return {
        ...neg,
        maquina: maq,
        ultFecha: ultRev?.fecha,
        diasSinRevisar: dias,
        estadoVisita,
      }
    }).sort((a, b) => {
      // Ordenar: primero los que tienen más días sin revisar
      const diasA = a.diasSinRevisar ?? 9999
      const diasB = b.diasSinRevisar ?? 9999
      return diasB - diasA
    })
  }, [n.rows, maquinasMap, ultimaRevisionPorNegocio])

  const listaFiltrada = soloPendientes
    ? rutaLista.filter((x) => x.estadoVisita === 'urgente')
    : rutaLista

  const pendientesCount = rutaLista.filter((x) => x.estadoVisita === 'urgente').length

  return (
    <Page title="Ruta de visitas">
      <Err e={n.error || m.error || r.error} />

      <div className="grid">
        <Stat label="Total negocios" value={n.rows.length} />
        <Stat label="Máquinas instaladas" value={m.rows.filter((x) => x.estado === 'instalada').length} />
        <div className={`stat ${pendientesCount > 0 ? 'hot' : ''}`}>
          <span>Pendientes de visita</span>
          <b>{pendientesCount}</b>
          <small>{pendientesCount > 0 ? 'Más de 7 días o sin revisión' : 'Todas al día esta semana'}</small>
        </div>
      </div>

      <div className="card">
        <div className="card-header-flex">
          <h3>Puntos de visita en orden de prioridad</h3>
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

        {!listaFiltrada.length ? (
          <p className="empty">
            {soloPendientes
              ? '🎉 ¡Excelente! No tienes visitas atrasadas esta semana.'
              : 'No hay negocios registrados en la ruta. Registra uno en Negocios.'}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Negocio</th>
                <th>Máquina</th>
                <th>Dirección</th>
                <th>Dueño y contacto</th>
                <th>Última revisión</th>
                <th>Acciones de ruta</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((x) => (
                <tr key={x.id}>
                  <td>
                    {x.estadoVisita === 'urgente' ? (
                      <span className="pill warn">
                        {x.diasSinRevisar === null ? 'Sin revisión' : `Hace ${x.diasSinRevisar} días`}
                      </span>
                    ) : (
                      <span className="pill ok">Al día (hace {x.diasSinRevisar} d)</span>
                    )}
                  </td>
                  <td><b>{x.negocio}</b></td>
                  <td>
                    {x.maquina ? (
                      <span className="pill ok">{x.maquina.codigo}</span>
                    ) : (
                      <span className="pill warn">Sin máquina</span>
                    )}
                  </td>
                  <td>{x.direccion || '—'}</td>
                  <td>
                    <div>{x.dueno}</div>
                    {x.telefono && (
                      <a href={`tel:${x.telefono}`} className="tel-link">
                        📞 {x.telefono}
                      </a>
                    )}
                  </td>
                  <td>{x.ultFecha || 'Nunca'}</td>
                  <td className="acts">
                    {x.direccion && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          x.direccion + ', ' + x.negocio
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn alt"
                        title="Ver en Google Maps"
                      >
                        📍 Mapa
                      </a>
                    )}
                    <Link to={`/negocios/${x.id}/revisiones`} className="btn">
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
