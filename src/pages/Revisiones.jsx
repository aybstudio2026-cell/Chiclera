import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { calcRevision, hoy, money, sum } from '../lib/calc'

export default function Revisiones() {
  const { id } = useParams()
  const n = useTable('negocios'), r = useTable('revisiones')
  const [f, setF] = useState({ fecha: hoy(), recaudo: '', inversion: '' })
  const neg = n.rows.find((x) => x.id === id)
  if (!neg) return <Page title="Revisiones"><Err e={n.error} /><p className="empty">{n.loading ? 'Cargando…' : 'Negocio no encontrado.'}</p><Link to="/negocios">Volver</Link></Page>
  const rows = r.rows.filter((x) => x.negocio_id === id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const calc = calcRevision(neg, f.fecha, Number(f.recaudo) || 0, Number(f.inversion) || 0)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const guardar = async (e) => {
    e.preventDefault()
    const ok = await r.insert({ negocio_id: id, fecha: f.fecha, recaudo: Number(f.recaudo), inversion_chicles: Number(f.inversion) || 0,
      porcentaje_dueno: calc.porcentaje_dueno, ganancia: calc.ganancia, parte_dueno: calc.parte_dueno, ganancia_neta: calc.ganancia_neta })
    if (ok) setF({ fecha: hoy(), recaudo: '', inversion: '' })
  }
  return (
    <Page title={`Revisiones: ${neg.negocio}`} actions={<Link className="btn alt" to="/negocios">Volver a negocios</Link>}>
      <Err e={r.error} />
      <div className="grid">
        <Stat label="Recaudado" value={money(sum(rows, 'recaudo'))} />
        <Stat label="Inversión en chicles" value={money(sum(rows, 'inversion_chicles'))} />
        <Stat label="Ganancia" value={money(sum(rows, 'ganancia'))} />
        <Stat label="Parte del dueño" value={money(sum(rows, 'parte_dueno'))} sub={neg.dueno} />
        <div className="stat hot"><span>Mi ganancia neta</span><b>{money(sum(rows, 'ganancia_neta'))}</b></div>
      </div>
      <div className="card"><h3>Registrar revisión semanal</h3>
        <form className="f" onSubmit={guardar}>
          <label>Fecha<input type="date" value={f.fecha} onChange={set('fecha')} required /></label>
          <label>Dinero recaudado (S/)<input type="number" step="0.01" min="0" value={f.recaudo} onChange={set('recaudo')} required /></label>
          <label>Chicles repuestos (S/)<input type="number" step="0.01" min="0" value={f.inversion} onChange={set('inversion')} /></label>
          <button>Guardar revisión</button>
        </form>
        <div className="preview"><span>Mes {calc.mes} del negocio: dueño {calc.porcentaje_dueno}%</span><span>Ganancia <b>{money(calc.ganancia)}</b></span>
          <span>Dueño <b>{money(calc.parte_dueno)}</b></span><span>Mi neta <b>{money(calc.ganancia_neta)}</b></span></div>
      </div>
      <div className="card">
        {!rows.length ? <p className="empty">Sin revisiones todavía.</p> :
          <table><thead><tr><th>Fecha</th><th className="n">Recaudo</th><th className="n">Chicles</th><th className="n">Ganancia</th><th className="n">% dueño</th><th className="n">Dueño</th><th className="n">Mi neta</th><th></th></tr></thead>
            <tbody>{rows.map((x) => <tr key={x.id}><td>{x.fecha}</td><td className="n">{money(x.recaudo)}</td><td className="n">{money(x.inversion_chicles)}</td>
              <td className="n">{money(x.ganancia)}</td><td className="n">{x.porcentaje_dueno}%</td><td className="n">{money(x.parte_dueno)}</td><td className="n">{money(x.ganancia_neta)}</td>
              <td><button className="del" onClick={() => confirm('¿Eliminar esta revisión?') && r.remove(x.id)}>Eliminar</button></td></tr>)}</tbody></table>}
      </div>
    </Page>
  )
}
