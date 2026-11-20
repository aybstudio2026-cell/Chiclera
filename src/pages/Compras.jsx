import { useState } from 'react'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, formData } from '../components'
import { CHICLES_BOLSA, COSTO_BOLSA, COSTO_MAQUINA, hoy, money } from '../lib/calc'

const nextCode = (rows) => 'CH' + String(Math.max(0, ...rows.map((r) => parseInt(r.codigo.slice(2)) || 0)) + 1).padStart(3, '0')

export default function Compras() {
  const c = useTable('compras'), m = useTable('maquinas'), n = useTable('negocios'), r = useTable('revisiones')
  const [tipo, setTipo] = useState('maquina')

  const save = async (e) => {
    const d = formData(e, ['cantidad', 'costo_unit'])
    const total = d.cantidad * d.costo_unit
    if (tipo === 'maquina') {
      const ok = await m.insert({ codigo: d.codigo, costo: total, estado: 'disponible', fecha_compra: d.fecha })
      if (!ok) return
    }
    await c.insert({
      tipo,
      codigo: tipo === 'maquina' ? d.codigo : null,
      cantidad: d.cantidad,
      costo_total: total,
      fecha: d.fecha,
      notas: d.notas,
    })
    e.target.reset()
  }

  const nombre = (id) => n.rows.find((x) => x.id === id)?.negocio || '—'

  return (
    <Page title="Registro de Compras">
      <Err e={c.error || m.error} />

      {/* Formulario de Compra directo sin KPIs arriba */}
      <div className="card">
        <h3>🛒 Registrar Nueva Compra</h3>
        <form className="f" key={tipo} onSubmit={save}>
          <label>
            Tipo de Adquisición
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="maquina">Máquina Chiclera nueva (S/ 310)</option>
              <option value="chicles">Lote de Chicles (Bolsa de {CHICLES_BOLSA} unid. a S/ 90)</option>
            </select>
          </label>
          {tipo === 'maquina' && (
            <Field label="Código de serie" name="codigo" defaultValue={nextCode(m.rows)} pattern="CH[0-9]{3,}" required />
          )}
          <Field
            label={tipo === 'maquina' ? 'Cantidad (1 por código)' : 'Cantidad de bolsas'}
            name="cantidad"
            type="number"
            min="1"
            defaultValue="1"
            readOnly={tipo === 'maquina'}
            required
          />
          <Field
            label="Costo unitario (S/)"
            name="costo_unit"
            type="number"
            step="0.01"
            defaultValue={tipo === 'maquina' ? COSTO_MAQUINA : COSTO_BOLSA}
            required
          />
          <Field label="Fecha de compra" name="fecha" type="date" defaultValue={hoy()} required />
          <Field label="Notas o proveedor" name="notas" placeholder="Ej. Mercado Central, garantía, etc." />
          <button>Guardar compra</button>
        </form>
      </div>

      <div className="card">
        <h3>📋 Historial de Compras de Máquinas e Insumos</h3>
        {!c.rows.length ? (
          <p className="empty">Sin compras registradas aún.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Detalle</th>
                <th className="n">Cantidad</th>
                <th className="n">Total Invertido</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...c.rows].reverse().map((x) => (
                <tr key={x.id}>
                  <td>{x.fecha}</td>
                  <td>
                    <span className={`pill ${x.tipo === 'maquina' ? 'ok' : 'info'}`}>
                      {x.tipo === 'maquina' ? '🎰 Máquina' : '🍬 Chicles'}
                    </span>
                  </td>
                  <td><b>{x.codigo || `${x.cantidad * CHICLES_BOLSA} chicles (${x.cantidad} bolsas)`}</b></td>
                  <td className="n">{x.cantidad}</td>
                  <td className="n"><b>{money(x.costo_total)}</b></td>
                  <td>{x.notas || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="del"
                      onClick={() => confirm('¿Eliminar compra? (no borra la máquina asociada)') && c.remove(x.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>🕒 Revisiones y Reposiciones Semanales en Ruta</h3>
        {!r.rows.length ? (
          <p className="empty">Sin revisiones registradas todavía.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Negocio</th>
                <th className="n">Recaudo</th>
                <th className="n">Chicles Repuestos</th>
                <th className="n">Mi Ganancia Neta</th>
              </tr>
            </thead>
            <tbody>
              {[...r.rows]
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((x) => (
                  <tr key={x.id}>
                    <td>{x.fecha}</td>
                    <td><b>{nombre(x.negocio_id)}</b></td>
                    <td className="n">{money(x.recaudo)}</td>
                    <td className="n">{money(x.inversion_chicles)}</td>
                    <td className="n text-ok"><b>{money(x.ganancia_neta)}</b></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
