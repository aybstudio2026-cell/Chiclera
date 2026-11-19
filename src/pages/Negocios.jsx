import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, formData } from '../components'
import { hoy, mesNegocio, money, pctDueno, sum } from '../lib/calc'

export default function Negocios() {
  const n = useTable('negocios'), m = useTable('maquinas'), r = useTable('revisiones')
  const [ed, setEd] = useState(null)
  const libres = m.rows.filter((x) => !n.rows.some((y) => y.maquina_id === x.id && y.id !== ed?.id))
  const save = async (e) => {
    const d = formData(e)
    if (await (ed.id ? n.update(ed.id, d) : n.insert(d))) {
      if (d.maquina_id) await m.update(d.maquina_id, { estado: 'instalada' })
      setEd(null)
    }
  }
  return (
    <Page title="Negocios y dueños" actions={<button onClick={() => setEd({})}>Nuevo negocio</button>}>
      <Err e={n.error || m.error} />
      {ed && <div className="card"><form className="f" key={ed.id || 'new'} onSubmit={save}>
        <Field label="Negocio" name="negocio" defaultValue={ed.negocio || ''} required />
        <Field label="Dueño" name="dueno" defaultValue={ed.dueno || ''} required />
        <Field label="Teléfono" name="telefono" type="tel" defaultValue={ed.telefono || ''} />
        <Field label="Dirección" name="direccion" defaultValue={ed.direccion || ''} />
        <label>Máquina<select name="maquina_id" defaultValue={ed.maquina_id || ''}><option value="">Sin máquina</option>
          {libres.map((x) => <option key={x.id} value={x.id}>{x.codigo}</option>)}</select></label>
        <Field label="Fecha de instalación" name="fecha_instalacion" type="date" defaultValue={ed.fecha_instalacion || hoy()} required />
        <div className="acts"><button>Guardar</button><button type="button" className="alt" onClick={() => setEd(null)}>Cancelar</button></div>
      </form></div>}
      <div className="card">
        {!n.rows.length ? <p className="empty">Registra el primer negocio donde instalarás una máquina.</p> :
          <table><thead><tr><th>Negocio</th><th>Dueño</th><th>Teléfono</th><th>Dirección</th><th>Máquina</th><th className="n">% dueño hoy</th><th className="n">Rendimiento</th><th className="n">Mi neta</th><th>Acciones</th></tr></thead>
            <tbody>{n.rows.map((x) => {
              const rv = r.rows.filter((y) => y.negocio_id === x.id)
              return <tr key={x.id}><td><b>{x.negocio}</b></td><td>{x.dueno}</td><td>{x.telefono || '—'}</td><td>{x.direccion || '—'}</td>
                <td>{m.rows.find((y) => y.id === x.maquina_id)?.codigo || '—'}</td>
                <td className="n">{pctDueno(mesNegocio(x.fecha_instalacion))}%</td>
                <td className="n">{money(sum(rv, 'recaudo'))}</td><td className="n">{money(sum(rv, 'ganancia_neta'))}</td>
                <td className="acts"><Link className="btn" to={`/negocios/${x.id}/revisiones`}>Revisiones</Link>
                  <button className="alt" onClick={() => setEd(x)}>Editar</button>
                  <button className="del" onClick={() => confirm(`¿Eliminar ${x.negocio} y sus revisiones?`) && n.remove(x.id)}>Eliminar</button></td></tr>
            })}</tbody></table>}
      </div>
    </Page>
  )
}
