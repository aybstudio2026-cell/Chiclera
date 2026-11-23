import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { money, sum } from '../lib/calc'
import { exportToExcel } from '../lib/exportExcel'

export default function Liquidaciones() {
  const n = useTable('negocios'), r = useTable('revisiones'), m = useTable('maquinas')
  const [selectedNegocio, setSelectedNegocio] = useState('')
  const [reciboActivo, setReciboActivo] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const negociosMap = useMemo(() => new Map(n.rows.map((x) => [x.id, x])), [n.rows])
  const maquinasMap = useMemo(() => new Map(m.rows.map((x) => [x.id, x])), [m.rows])

  // Filtrar revisiones
  const revisionesFiltradas = useMemo(() => {
    let lista = [...r.rows].sort((a, b) => b.fecha.localeCompare(a.fecha))
    if (selectedNegocio) {
      lista = lista.filter((x) => x.negocio_id === selectedNegocio)
    }
    return lista
  }, [r.rows, selectedNegocio])

  // Formato de texto para WhatsApp
  const generarTextoWhatsApp = (rev) => {
    const neg = negociosMap.get(rev.negocio_id)
    const maq = maquinasMap.get(neg?.maquina_id)
    return `🍬 *LIQUIDACIÓN DE MÁQUINA CHICLERA* 🍬
📅 *Fecha:* ${rev.fecha}
🏪 *Local:* ${neg?.negocio || 'Negocio'}
👤 *Titular:* ${neg?.dueno || 'Dueño'}
🎰 *Máquina:* ${maq?.codigo || 'CH001'}

-----------------------------
💰 *Recaudación de la máquina:* ${money(rev.recaudo)}
🍬 *Costo chicles repuestos:* ${money(rev.inversion_chicles)}
📊 *Ganancia base a repartir:* ${money(rev.ganancia)}
🏷️ *Tu porcentaje comisional:* ${rev.porcentaje_dueno}%

👉 *MONTO PAGADO A TU FAVOR:* *${money(rev.parte_dueno)}*
-----------------------------
¡Muchas gracias por la colaboración y por cuidar la máquina! 🙌`
  }

  const limpiarTelefono = (tel) => {
    if (!tel) return ''
    const soloNum = String(tel).replace(/[^0-9]/g, '')
    if (soloNum.length === 9 && soloNum.startsWith('9')) {
      return '51' + soloNum
    }
    return soloNum
  }

  // Enviar mensaje directamente por WhatsApp
  const enviarPorWhatsApp = (rev) => {
    const neg = negociosMap.get(rev.negocio_id)
    const texto = generarTextoWhatsApp(rev)
    let tel = limpiarTelefono(neg?.telefono)
    if (!tel) {
      const ingresado = prompt(
        `El negocio "${neg?.negocio || ''}" no tiene teléfono registrado.\nIngresa el número de WhatsApp (ej. 987654321):`,
        ''
      )
      if (!ingresado) {
        navigator.clipboard.writeText(texto)
        alert('Mensaje copiado al portapapeles para pegarlo directamente en WhatsApp.')
        return
      }
      tel = limpiarTelefono(ingresado)
    }
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  // Copiar mensaje para WhatsApp
  const copiarParaWhatsApp = (rev) => {
    const texto = generarTextoWhatsApp(rev)
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  // Exportar a Excel
  const exportarLiquidacionesExcel = () => {
    const headers = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'negocio', label: 'Negocio', transform: (_, row) => negociosMap.get(row.negocio_id)?.negocio || '—' },
      { key: 'dueno', label: 'Dueño / Titular', transform: (_, row) => negociosMap.get(row.negocio_id)?.dueno || '—' },
      { key: 'telefono', label: 'Teléfono', transform: (_, row) => negociosMap.get(row.negocio_id)?.telefono || '—' },
      { key: 'maquina', label: 'Máquina', transform: (_, row) => maquinasMap.get(negociosMap.get(row.negocio_id)?.maquina_id)?.codigo || '—' },
      { key: 'recaudo', label: 'Recaudado (S/)', transform: (v) => Number(v || 0).toFixed(2) },
      { key: 'inversion_chicles', label: 'Insumos Repuestos (S/)', transform: (v) => Number(v || 0).toFixed(2) },
      { key: 'ganancia', label: 'Ganancia Base (S/)', transform: (v) => Number(v || 0).toFixed(2) },
      { key: 'porcentaje_dueno', label: '% Dueño', transform: (v) => `${v}%` },
      { key: 'parte_dueno', label: 'Pago a Dueño (S/)', transform: (v) => Number(v || 0).toFixed(2) },
      { key: 'ganancia_neta', label: 'Mi Ganancia Neta (S/)', transform: (v) => Number(v || 0).toFixed(2) },
    ]
    exportToExcel({
      filename: selectedNegocio ? `liquidaciones_${negociosMap.get(selectedNegocio)?.negocio || 'local'}` : 'liquidaciones_chiclecontrol',
      headers,
      rows: revisionesFiltradas,
    })
  }

  const totalPagado = sum(r.rows, 'parte_dueno')
  const totalRecaudado = sum(r.rows, 'recaudo')
  const totalRevisiones = r.rows.length

  return (
    <Page
      title="Liquidaciones y Pagos a Dueños"
      actions={
        <button
          type="button"
          className="btn alt"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={exportarLiquidacionesExcel}
          title="Descargar historial de liquidaciones en archivo Excel"
        >
          📥 Exportar a Excel
        </button>
      }
    >
      <Err e={n.error || r.error} />

      {/* Métricas clave de pagos */}
      <div className="grid">
        <Stat label="Total pagado a dueños" value={money(totalPagado)} sub="comisiones transferidas o en efectivo" />
        <Stat label="Total liquidaciones" value={totalRevisiones} sub="revisiones semanales con pago" />
        <Stat label="Comisión promedio" value={money(totalRevisiones > 0 ? totalPagado / totalRevisiones : 0)} sub="por visita y máquina" />
        <div className="stat hot">
          <span>Mi neta acumulada</span>
          <b>{money(sum(r.rows, 'ganancia_neta'))}</b>
          <small>después de pagar comisiones e insumos</small>
        </div>
      </div>

      {/* Modal / Vista de Recibo Detallado */}
      {reciboActivo && (
        <div className="card liquidacion-recibo-card">
          <div className="card-header-flex">
            <h3>🧾 Recibo de Liquidación Semanal</h3>
            <button type="button" className="alt" onClick={() => setReciboActivo(null)}>
              Cerrar recibo ✕
            </button>
          </div>

          <div className="recibo-box">
            <div className="recibo-header">
              <h2>CHICLECONTROL</h2>
              <p>Comprobante referencial de recaudación y pago de comisión</p>
              <div className="pill ok">Liquidación completada</div>
            </div>

            {(() => {
              const neg = negociosMap.get(reciboActivo.negocio_id)
              const maq = maquinasMap.get(neg?.maquina_id)
              return (
                <div className="recibo-body">
                  <div className="recibo-row">
                    <span>Fecha de visita:</span>
                    <b>{reciboActivo.fecha}</b>
                  </div>
                  <div className="recibo-row">
                    <span>Negocio:</span>
                    <b>{neg?.negocio || '—'}</b>
                  </div>
                  <div className="recibo-row">
                    <span>Dueño de local:</span>
                    <b>{neg?.dueno || '—'}</b>
                  </div>
                  <div className="recibo-row">
                    <span>Máquina de serie:</span>
                    <b>{maq?.codigo || '—'}</b>
                  </div>
                  <hr className="recibo-divider" />
                  <div className="recibo-row">
                    <span>Total monedas sacadas (Recaudo):</span>
                    <b>{money(reciboActivo.recaudo)}</b>
                  </div>
                  <div className="recibo-row">
                    <span>(-) Costo chicles repuestos:</span>
                    <span>{money(reciboActivo.inversion_chicles)}</span>
                  </div>
                  <div className="recibo-row subtotal">
                    <span>(=) Ganancia neta repartible:</span>
                    <b>{money(reciboActivo.ganancia)}</b>
                  </div>
                  <div className="recibo-row">
                    <span>% Acordado para el dueño:</span>
                    <b>{reciboActivo.porcentaje_dueno}%</b>
                  </div>
                  <div className="recibo-total-row">
                    <div>
                      <span>MONTO PAGADO AL DUEÑO:</span>
                      <h2>{money(reciboActivo.parte_dueno)}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span>Ganancia operador:</span>
                      <h3 style={{ color: 'var(--teal)' }}>{money(reciboActivo.ganancia_neta)}</h3>
                    </div>
                  </div>
                </div>
              )
            })()}

            <div className="recibo-actions noprint" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                style={{ background: '#25D366', color: '#fff', fontWeight: '700' }}
                onClick={() => enviarPorWhatsApp(reciboActivo)}
              >
                📲 Enviar directo por WhatsApp
              </button>
              <button
                type="button"
                className="btn alt"
                onClick={() => copiarParaWhatsApp(reciboActivo)}
              >
                {copiado ? '✅ ¡Copiado al portapapeles!' : '📋 Copiar texto'}
              </button>
              <button type="button" className="btn alt" onClick={() => window.print()}>
                🖨️ Imprimir ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Liquidaciones */}
      <div className="card">
        <div className="card-header-flex">
          <div>
            <h3>Historial de Pagos y Comisiones</h3>
            <small className="sub-text">Cada pago corresponde a una revisión semanal realizada en local</small>
          </div>
          <div>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              Filtrar por negocio:
              <select
                value={selectedNegocio}
                onChange={(e) => setSelectedNegocio(e.target.value)}
              >
                <option value="">Todos los negocios ({n.rows.length})</option>
                {n.rows.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.negocio} — {x.dueno}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {!revisionesFiltradas.length ? (
          <p className="empty">No hay liquidaciones registradas para el filtro seleccionado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Negocio</th>
                <th>Dueño</th>
                <th className="n">Recaudado</th>
                <th className="n">% Dueño</th>
                <th className="n">Comisión Pagada</th>
                <th className="n">Mi Ganancia</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {revisionesFiltradas.map((x) => {
                const neg = negociosMap.get(x.negocio_id)
                return (
                  <tr key={x.id}>
                    <td>{x.fecha}</td>
                    <td><b>{neg?.negocio || '—'}</b></td>
                    <td>{neg?.dueno || '—'}</td>
                    <td className="n">{money(x.recaudo)}</td>
                    <td className="n">{x.porcentaje_dueno}%</td>
                    <td className="n" style={{ color: 'var(--plum)', fontWeight: '700' }}>
                      {money(x.parte_dueno)}
                    </td>
                    <td className="n text-ok">
                      <b>{money(x.ganancia_neta)}</b>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn"
                          style={{
                            background: '#25D366',
                            color: '#fff',
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            border: 'none',
                          }}
                          onClick={() => enviarPorWhatsApp(x)}
                          title="Enviar liquidación directamente por WhatsApp al dueño"
                        >
                          📲 WhatsApp
                        </button>
                        <button
                          type="button"
                          className="btn alt"
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          onClick={() => {
                            setReciboActivo(x)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          title="Ver detalle del ticket de liquidación"
                        >
                          🧾 Recibo
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
