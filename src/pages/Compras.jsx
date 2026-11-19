import { useState } from 'react'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, Stat, formData } from '../components'
import { CHICLES_BOLSA, COSTO_BOLSA, COSTO_MAQUINA, hoy, money, sum } from '../lib/calc'

const nextCode = (rows) => 'CH' + String(Math.max(0, ...rows.map((r) => parseInt(r.codigo.slice(2)) || 0)) + 1).padStart(3, '0')

export default function Compras() {
  const c = useTable('compras'), m = useTable('maquinas'), n = useTable('negocios'), r = useTable('revisiones')
  const [tipo, setTipo] = useState('maquina')
  const save = async (e) => {
    const d = formData(e, ['cantidad', 'costo_unit'])
    const total = d.cantidad * d.costo_unit
    if (tipo === 'maquina') {
      // Una compra de máquina crea también la máquina en el inventario
      const ok = await m.insert({ codigo: d.codigo, costo: total, estado: 'disponible', fecha_compra: d.fecha })
      if (!ok) return
    }
    await c.insert({ tipo, codigo: tipo === 'maquina' ? d.codigo : null, cantidad: d.cantidad, costo_total: total, fecha: d.fecha, notas: d.notas })
    e.target.reset()
  }
  const bolsas = c.rows.filter((x) => x.tipo === 'chicles')
  const nombre = (id) => n.rows.find((x) => x.id === id)?.negocio || '—'
  return (
    <Page title="Compras">
      <Err e={c.error || m.error} />
      <div className="grid">
        <Stat label="Total comprado" value={money(sum(c.rows, 'costo_total'))} />
        <Stat label="Máquinas compradas" value={c.rows.filter((x) => x.tipo === 'maquina').length} />
        <Stat label="Bolsas de chicles" value={sum(bolsas, 'cantidad')} sub={`${sum(bolsas, 'cantidad') * CHICLES_BOLSA} chicles`} />
      </div>
      <div className="card"><h3>Registrar compra</h3>
        <form className="f" key={tipo} onSubmit={save}>
          <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="maquina">Máquina</option><option value="chicles">Bolsa de chicles ({CHICLES_BOLSA} unidades)</option></select></label>
          {tipo === 'maquina' && <Field label="Código de serie" name="codigo" defaultValue={nextCode(m.rows)} pattern="CH[0-9]{3,}" required />}
          <Field label={tipo === 'maquina' ? 'Cantidad (1 por código)' : 'Cantidad de bolsas'} name="cantidad" type="number" min="1" defaultValue="1" readOnly={tipo === 'maquina'} required />
          <Field label="Costo unitario (S/)" name="costo_unit" type="number" step="0.01" defaultValue={tipo === 'maquina' ? COSTO_MAQUINA : COSTO_BOLSA} required />
          <Field label="Fecha" name="fecha" type="date" defaultValue={hoy()} required />
          <Field label="Notas" name="notas" />
          <button>Guardar compra</button>
        </form>
      </div>
      <div className="card"><h3>Historial de compras</h3>
        {!c.rows.length ? <p className="empty">Sin compras registradas.</p> :
          <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th className="n">Cantidad</th><th className="n">Total</th><th></th></tr></thead>
            <tbody>{[...c.rows].reverse().map((x) => <tr key={x.id}><td>{x.fecha}</td><td>{x.tipo}</td><td>{x.codigo || `${x.cantidad * CHICLES_BOLSA} chicles`}</td>
              <td className="n">{x.cantidad}</td><td className="n">{money(x.costo_total)}</td>
              <td><button className="del" onClick={() => confirm('¿Eliminar compra? (no borra la máquina)') && c.remove(x.id)}>Eliminar</button></td></tr>)}</tbody></table>}
      </div>
      <div className="card"><h3>Registros semanales (todas las revisiones)</h3>
        {!r.rows.length ? <p className="empty">Sin revisiones todavía.</p> :
          <table><thead><tr><th>Fecha</th><th>Negocio</th><th className="n">Recaudo</th><th className="n">Chicles repuestos</th><th className="n">Mi neta</th></tr></thead>
            <tbody>{[...r.rows].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((x) => <tr key={x.id}><td>{x.fecha}</td><td>{nombre(x.negocio_id)}</td>
              <td className="n">{money(x.recaudo)}</td><td className="n">{money(x.inversion_chicles)}</td><td className="n">{money(x.ganancia_neta)}</td></tr>)}</tbody></table>}
      </div>
    </Page>
  )
}
