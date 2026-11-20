import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { calcRevision, hoy, money, sum } from '../lib/calc'

const COSTO_UNITARIO_CHICLE = 90 / 500 // S/ 0.18 por chicle (bolsa de 500 a S/ 90)

export default function Revisiones() {
  const { id } = useParams()
  const n = useTable('negocios'), r = useTable('revisiones'), m = useTable('maquinas')
  const [f, setF] = useState({ fecha: hoy(), recaudo: '', cantidadChicles: '0' })
  const [copiado, setCopiado] = useState(false)
  const [guardadoExitoso, setGuardadoExitoso] = useState(false)

  const neg = n.rows.find((x) => x.id === id)
  const maq = neg ? m.rows.find((x) => x.id === neg.maquina_id) : null

  const rows = useMemo(
    () => r.rows.filter((x) => x.negocio_id === id).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [r.rows, id]
  )

  if (!neg) {
    return (
      <Page title="Revisiones">
        <Err e={n.error} />
        <p className="empty">{n.loading ? 'Cargando información…' : 'Negocio no encontrado.'}</p>
        <Link to="/negocios" className="btn alt">← Volver a locales</Link>
      </Page>
    )
  }

  // Cálculo automático del costo de chicles: cantidad * S/ 0.18
  const cantidadChiclesNum = Math.max(0, parseInt(f.cantidadChicles) || 0)
  const costoChiclesCalculado = Number((cantidadChiclesNum * COSTO_UNITARIO_CHICLE).toFixed(2))

  const calc = calcRevision(neg, f.fecha, Number(f.recaudo) || 0, costoChiclesCalculado)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // Botones táctiles para cantidades típicas de chicles
  const setPresetCantidad = (cant) => {
    setF((prev) => ({ ...prev, cantidadChicles: String(cant) }))
  }

  const guardar = async (e) => {
    e.preventDefault()
    const ok = await r.insert({
      negocio_id: id,
      fecha: f.fecha,
      recaudo: Number(f.recaudo),
      inversion_chicles: costoChiclesCalculado, // Costo calculado automáticamente
      porcentaje_dueno: calc.porcentaje_dueno,
      ganancia: calc.ganancia,
      parte_dueno: calc.parte_dueno,
      ganancia_neta: calc.ganancia_neta,
    })
    if (ok) {
      setGuardadoExitoso(true)
      setF({ fecha: hoy(), recaudo: '', cantidadChicles: '0' })
      setTimeout(() => setGuardadoExitoso(false), 4000)
    }
  }

  const copiarWhatsAppUltima = (item) => {
    const chiclesUnid = Math.round(Number(item.inversion_chicles || 0) / COSTO_UNITARIO_CHICLE)
    const texto = `🍬 *REVISIÓN CHICLERA - ${neg.negocio.toUpperCase()}* 🍬
📅 *Fecha:* ${item.fecha}
👤 *Dueño:* ${neg.dueno}
💰 *Recaudación:* ${money(item.recaudo)}
🍬 *Chicles repuestos:* ${chiclesUnid} unid. (${money(item.inversion_chicles)})
📊 *Ganancia base:* ${money(item.ganancia)}
🏷️ *Tu porcentaje:* ${item.porcentaje_dueno}%

👉 *TU PAGO EN EFECTIVO/TRANSFERENCIA:* *${money(item.parte_dueno)}*
¡Muchas gracias! 🙌`

    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <Page
      title={`Revisión: ${neg.negocio}`}
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link className="btn alt" to="/ruta">
            🗺️ Volver a Ruta
          </Link>
          <Link className="btn alt" to="/negocios">
            Locales
          </Link>
        </div>
      }
    >
      <Err e={r.error} />

      {guardadoExitoso && (
        <div className="pill ok" style={{ padding: '12px 16px', width: '100%', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
          🎉 ¡Revisión registrada con éxito! Los datos ya están actualizados.
        </div>
      )}

      {/* Formulario Principal de Registro Rápido */}
      <div className="card mobile-review-card">
        <div className="card-header-flex">
          <div>
            <h3>📝 Registrar Recaudación Semanal</h3>
            <small className="sub-text">
              {maq ? `Máquina ${maq.codigo}` : 'Sin máquina'} • Mes {calc.mes} del local ({calc.porcentaje_dueno}% para el dueño)
            </small>
          </div>
        </div>

        <form className="mobile-form" onSubmit={guardar}>
          <div className="mobile-form-row">
            <label>
              Fecha de visita
              <input type="date" value={f.fecha} onChange={set('fecha')} required />
            </label>
          </div>

          <div className="mobile-form-row">
            <label className="large-input-label">
              <span>💰 Dinero sacado de la máquina (S/)</span>
              <input
                type="number"
                step="0.10"
                min="0"
                inputMode="decimal"
                placeholder="Ej. 120"
                value={f.recaudo}
                onChange={set('recaudo')}
                className="input-highlight"
                required
                autoFocus
              />
            </label>
          </div>

          {/* Campo de cantidad de chicles con cálculo automático de costo */}
          <div className="mobile-form-row">
            <label>
              <span>🍬 Cantidad de chicles repuestos (unidades)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  value={f.cantidadChicles}
                  onChange={set('cantidadChicles')}
                  style={{ width: '130px', fontWeight: '700', fontSize: '18px' }}
                />
                <div className="chicle-cost-badge">
                  Costo: <b>{money(costoChiclesCalculado)}</b>
                  <small style={{ display: 'block', fontSize: '11px', color: 'var(--mute)' }}>
                    ({cantidadChiclesNum} chicles × S/ 0.18)
                  </small>
                </div>
              </div>
            </label>

            {/* Accesos rápidos táctiles para cantidades típicas */}
            <div className="quick-chip-group">
              <button type="button" className="quick-chip" onClick={() => setPresetCantidad(0)}>
                0 unid. (S/ 0)
              </button>
              <button type="button" className="quick-chip" onClick={() => setPresetCantidad(50)}>
                50 unid. (S/ 9.00)
              </button>
              <button type="button" className="quick-chip" onClick={() => setPresetCantidad(100)}>
                100 unid. (S/ 18.00)
              </button>
              <button type="button" className="quick-chip" onClick={() => setPresetCantidad(150)}>
                150 unid. (S/ 27.00)
              </button>
              <button type="button" className="quick-chip" onClick={() => setPresetCantidad(200)}>
                200 unid. (S/ 36.00)
              </button>
              <button type="button" className="quick-chip" onClick={() => setPresetCantidad(500)}>
                500 unid. (1 bolsa = S/ 90)
              </button>
            </div>
          </div>

          {/* Desglose en vivo de la liquidación */}
          <div className="mobile-preview-box">
            <div className="preview-stat">
              <span>Ganancia base:</span>
              <b>{money(calc.ganancia)}</b>
            </div>
            <div className="preview-stat">
              <span>Comisión ({calc.porcentaje_dueno}%):</span>
              <b style={{ color: 'var(--plum)' }}>{money(calc.parte_dueno)}</b>
            </div>
            <div className="preview-stat hot">
              <span>Mi Ganancia Neta:</span>
              <b>{money(calc.ganancia_neta)}</b>
            </div>
          </div>

          <button type="submit" className="btn btn-save-large">
            💾 Guardar Revisión
          </button>
        </form>
      </div>

      {/* Resumen Histórico del Negocio */}
      <div className="grid">
        <Stat label="Recaudado histórico" value={money(sum(rows, 'recaudo'))} />
        <Stat label="Pagado al dueño" value={money(sum(rows, 'parte_dueno'))} sub={neg.dueno} />
        <div className="stat hot">
          <span>Mi neta en este local</span>
          <b>{money(sum(rows, 'ganancia_neta'))}</b>
          <small>{rows.length} revisiones totales</small>
        </div>
      </div>

      {/* Historial de Revisiones */}
      <div className="card">
        <h3>Historial de Revisiones ({rows.length})</h3>

        {!rows.length ? (
          <p className="empty">Sin revisiones registradas aún en este local.</p>
        ) : (
          <div className="mobile-review-history-list">
            {rows.map((x) => {
              const chiclesUnid = Math.round(Number(x.inversion_chicles || 0) / COSTO_UNITARIO_CHICLE)
              return (
                <div key={x.id} className="mobile-history-card">
                  <div className="history-card-header">
                    <div>
                      <b>📅 {x.fecha}</b>
                      <span className="pill info" style={{ marginLeft: '8px' }}>{x.porcentaje_dueno}% dueño</span>
                    </div>
                    <button
                      type="button"
                      className="del"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => confirm('¿Eliminar esta revisión?') && r.remove(x.id)}
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="history-card-grid">
                    <div>
                      <span className="sub-text">Recaudado</span>
                      <div style={{ fontWeight: '600' }}>{money(x.recaudo)}</div>
                    </div>
                    <div>
                      <span className="sub-text">Chicles</span>
                      <div><b>{chiclesUnid} u.</b> ({money(x.inversion_chicles)})</div>
                    </div>
                    <div>
                      <span className="sub-text">Pago dueño</span>
                      <div style={{ color: 'var(--plum)', fontWeight: '600' }}>{money(x.parte_dueno)}</div>
                    </div>
                    <div>
                      <span className="sub-text">Mi neta</span>
                      <div className="text-ok" style={{ fontWeight: '700' }}>{money(x.ganancia_neta)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                    <button
                      type="button"
                      className="btn alt"
                      style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                      onClick={() => copiarWhatsAppUltima(x)}
                    >
                      {copiado ? '✅ ¡Copiado!' : '📲 Enviar resumen por WhatsApp'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Page>
  )
}
