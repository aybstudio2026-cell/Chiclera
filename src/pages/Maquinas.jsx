import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, formData } from '../components'
import { COSTO_MAQUINA, hoy, money, sum } from '../lib/calc'

export default function Maquinas() {
  const m = useTable('maquinas'), n = useTable('negocios'), r = useTable('revisiones')
  const [ed, setEd] = useState(null)

  const negociosPorMaquina = useMemo(
    () => new Map(n.rows.map((neg) => [neg.maquina_id, neg])),
    [n.rows]
  )

  const revisionesPorNegocio = useMemo(() => {
    const map = new Map()
    r.rows.forEach((rv) => {
      if (!map.has(rv.negocio_id)) map.set(rv.negocio_id, [])
      map.get(rv.negocio_id).push(rv)
    })
    return map
  }, [r.rows])

  // ROI global resumen
  const roiGlobal = useMemo(() => {
    const totalInvertido = sum(m.rows, 'costo')
    const totalNeta = m.rows.reduce((acc, x) => {
      const neg = negociosPorMaquina.get(x.id)
      const rv = neg ? (revisionesPorNegocio.get(neg.id) || []) : []
      return acc + sum(rv, 'ganancia_neta')
    }, 0)
    return {
      totalInvertido,
      totalNeta,
      pct: totalInvertido > 0 ? Math.max(0, Math.min(100, (totalNeta / totalInvertido) * 100)) : 0,
    }
  }, [m.rows, negociosPorMaquina, revisionesPorNegocio])

  const save = async (e) => {
    const d = formData(e, ['costo'])
    if (await (ed.id ? m.update(ed.id, d) : m.insert(d))) setEd(null)
  }

  return (
    <Page
      title="Máquinas"
      actions={
        <Link to="/compras" className="btn alt" title="Las máquinas se crean automáticamente al registrar su compra">
          🛒 Adquirir máquina en Compras
        </Link>
      }
    >
      <Err e={m.error} />

      {/* Resumen ROI global de toda la flota */}
      {m.rows.length > 0 && (
        <div className="card roi-global-card">
          <div className="roi-global-header">
            <div>
              <h3 className="roi-global-title">🎯 ROI de tu Flota de Máquinas</h3>
              <small className="sub-text">¿Cuánto has recuperado de lo invertido en máquinas?</small>
            </div>
            <div className="roi-global-pct" style={{ color: roiGlobal.pct >= 100 ? '#10b981' : roiGlobal.pct >= 50 ? '#f59e0b' : '#e0245e' }}>
              {roiGlobal.pct.toFixed(1)}%
            </div>
          </div>
          <div className="roi-global-stats">
            <div className="roi-stat-item">
              <span>💸 Total invertido en máquinas</span>
              <b>{money(roiGlobal.totalInvertido)}</b>
            </div>
            <div className="roi-stat-item">
              <span>✅ Total recuperado (mi ganancia neta)</span>
              <b className="text-ok">{money(roiGlobal.totalNeta)}</b>
            </div>
            <div className="roi-stat-item">
              <span>⏳ Falta por recuperar</span>
              <b style={{ color: '#e0245e' }}>{money(Math.max(0, roiGlobal.totalInvertido - roiGlobal.totalNeta))}</b>
            </div>
          </div>
          <div className="bar" style={{ marginTop: '12px', height: '10px' }}>
            <i style={{
              width: `${roiGlobal.pct}%`,
              background: roiGlobal.pct >= 100 ? '#10b981' : roiGlobal.pct >= 50 ? '#f59e0b' : '#e0245e',
              transition: 'width 0.5s ease',
            }} />
          </div>
          {roiGlobal.pct >= 100 && (
            <div className="roi-paid-badge">🎉 ¡Flota completamente pagada! Todo lo que generas es ganancia pura.</div>
          )}
        </div>
      )}

      {ed && (
        <div className="card">
          <h3>Editar máquina: {ed.codigo}</h3>
          <form className="f" key={ed.id} onSubmit={save}>
            <Field label="Código de serie" name="codigo" defaultValue={ed.codigo} pattern="CH[0-9]{3,}" required />
            <Field label="Costo (S/)" name="costo" type="number" step="0.01" defaultValue={ed.costo ?? COSTO_MAQUINA} required />
            <label>
              Estado
              <select name="estado" defaultValue={ed.estado || 'disponible'}>
                <option value="disponible">Disponible</option>
                <option value="instalada">Instalada</option>
                <option value="mantenimiento">Mantenimiento</option>
              </select>
            </label>
            <Field label="Fecha de compra" name="fecha_compra" type="date" defaultValue={ed.fecha_compra || hoy()} />
            <Field label="Notas" name="notas" defaultValue={ed.notas || ''} />
            <div className="acts">
              <button>Guardar cambios</button>
              <button type="button" className="alt" onClick={() => setEd(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {!m.rows.length ? (
          <div className="empty-box">
            <p className="empty">Todavía no registraste máquinas en tu inventario.</p>
            <p className="sub-text">Las máquinas se dan de alta automáticamente cuando registras su compra para mantener la contabilidad exacta.</p>
            <Link to="/compras" className="btn">
              ➕ Registrar primera máquina en Compras
            </Link>
          </div>
        ) : (
          <>
            {/* Cards por máquina con ROI individual */}
            <div className="maquinas-roi-grid">
              {m.rows.map((x) => {
                const neg = negociosPorMaquina.get(x.id)
                const rv = neg ? (revisionesPorNegocio.get(neg.id) || []) : []
                const neta = sum(rv, 'ganancia_neta')
                const recaudo = sum(rv, 'recaudo')
                const costo = x.costo || COSTO_MAQUINA
                const pct = Math.max(0, Math.min(100, (neta / costo) * 100))
                const faltaRecuperar = Math.max(0, costo - neta)

                // Estimar semanas restantes para recuperar la inversión
                const promSemanaNeta = rv.length > 0 ? neta / rv.length : 0
                const semanasRestantes = promSemanaNeta > 0
                  ? Math.ceil(faltaRecuperar / promSemanaNeta)
                  : null

                return (
                  <div key={x.id} className={`maquina-roi-card ${pct >= 100 ? 'paid-off' : ''}`}>
                    {/* Header */}
                    <div className="mroi-header">
                      <div>
                        <div className="mroi-codigo">{x.codigo}</div>
                        <span className={`pill ${x.estado === 'instalada' ? 'ok' : x.estado === 'disponible' ? 'info' : 'warn'}`}>
                          {x.estado}
                        </span>
                      </div>
                      <div className="mroi-pct-circle" style={{
                        borderColor: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#e0245e',
                        color: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#e0245e',
                      }}>
                        {pct.toFixed(0)}%
                      </div>
                    </div>

                    {/* Negocio donde está instalada */}
                    <div className="mroi-negocio">
                      {neg ? (
                        <Link to={`/negocios/${neg.id}/revisiones`} className="text-link">
                          📍 {neg.negocio}
                        </Link>
                      ) : (
                        <span className="sub-text">Sin negocio asignado</span>
                      )}
                    </div>

                    {/* Métricas de recuperación */}
                    <div className="mroi-stats">
                      <div className="mroi-stat">
                        <span>Costo máquina</span>
                        <b>{money(costo)}</b>
                      </div>
                      <div className="mroi-stat">
                        <span>Recaudado</span>
                        <b>{money(recaudo)}</b>
                      </div>
                      <div className="mroi-stat">
                        <span>Mi ganancia neta</span>
                        <b className="text-ok">{money(neta)}</b>
                      </div>
                      <div className="mroi-stat">
                        <span>Falta recuperar</span>
                        <b style={{ color: faltaRecuperar > 0 ? '#e0245e' : '#10b981' }}>
                          {faltaRecuperar > 0 ? money(faltaRecuperar) : '¡Pagada! 🎉'}
                        </b>
                      </div>
                    </div>

                    {/* Barra de progreso ROI */}
                    <div className="mroi-bar-wrapper">
                      <div className="bar" style={{ height: '8px' }}>
                        <i style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#e0245e',
                        }} />
                      </div>
                    </div>

                    {/* Estimación temporal */}
                    {faltaRecuperar > 0 && semanasRestantes && (
                      <div className="mroi-eta">
                        ⏱ Se pagará sola en ~{semanasRestantes} {semanasRestantes === 1 ? 'semana más' : 'semanas más'}
                      </div>
                    )}
                    {pct >= 100 && (
                      <div className="mroi-eta paid">🏆 ¡Inversión 100% recuperada!</div>
                    )}

                    <div className="mroi-actions">
                      <button className="btn alt" style={{ fontSize: '12px' }} onClick={() => setEd(x)}>✏️ Editar</button>
                      <button className="btn del" style={{ fontSize: '12px' }} onClick={() => confirm(`¿Eliminar ${x.codigo}?`) && m.remove(x.id)}>Eliminar</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Page>
  )
}