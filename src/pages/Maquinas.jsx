import { useState } from 'react'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, formData } from '../components'
import { COSTO_MAQUINA, hoy, money, sum } from '../lib/calc'

const nextCode = (rows) => 'CH' + String(Math.max(0, ...rows.map((r) => parseInt(r.codigo.slice(2)) || 0)) + 1).padStart(3, '0')

export default function Maquinas() {
  const m = useTable('maquinas'), n = useTable('negocios'), r = useTable('revisiones')
  const [ed, setEd] = useState(null) // null = cerrado, {} = nuevo, {id..} = editar
  const save = async (e) => {
    const d = formData(e, ['costo'])
    if (await (ed.id ? m.update(ed.id, d) : m.insert(d))) setEd(null)
  }
  return (
    <Page title="Máquinas" actions={<button onClick={() => setEd({})}>Nueva máquina</button>}>
      <Err e={m.error} />
      {ed && <div className="card"><form className="f" key={ed.id || 'new'} onSubmit={save}>
        <Field label="Código de serie" name="codigo" defaultValue={ed.codigo || nextCode(m.rows)} pattern="CH[0-9]{3,}" required />
        <Field label="Costo (S/)" name="costo" type="number" step="0.01" defaultValue={ed.costo ?? COSTO_MAQUINA} required />
        <label>Estado<select name="estado" defaultValue={ed.estado || 'disponible'}>
          <option value="disponible">Disponible</option><option value="instalada">Instalada</option><option value="mantenimiento">Mantenimiento</option></select></label>
        <Field label="Fecha de compra" name="fecha_compra" type="date" defaultValue={ed.fecha_compra || hoy()} />
        <Field label="Notas" name="notas" defaultValue={ed.notas || ''} />
        <div className="acts"><button>Guardar</button><button type="button" className="alt" onClick={() => setEd(null)}>Cancelar</button></div>
      </form></div>}
      <div className="card">
        {!m.rows.length ? <p className="empty">Todavía no registraste máquinas. Pulsa Nueva máquina.</p> :
          <table><thead><tr><th>Código</th><th>Estado</th><th>Negocio</th><th className="n">Costo</th><th className="n">Rendimiento</th><th className="n">Mi neta</th><th>Inversión recuperada</th><th>Acciones</th></tr></thead>
            <tbody>{m.rows.map((x) => {
              const neg = n.rows.find((y) => y.maquina_id === x.id)
              const rv = r.rows.filter((y) => y.negocio_id === neg?.id)
              const neta = sum(rv, 'ganancia_neta'), pct = x.costo ? Math.min(100, (neta / x.costo) * 100) : 0
              return <tr key={x.id}><td><b>{x.codigo}</b></td><td><span className={'pill ' + (x.estado === 'instalada' ? 'ok' : 'warn')}>{x.estado}</span></td>
                <td>{neg?.negocio || '—'}</td><td className="n">{money(x.costo)}</td><td className="n">{money(sum(rv, 'recaudo'))}</td><td className="n">{money(neta)}</td>
                <td><div className="bar"><i style={{ width: pct + '%' }} /></div>{(x.costo ? (neta / x.costo) * 100 : 0).toFixed(0)}%</td>
                <td className="acts"><button className="alt" onClick={() => setEd(x)}>Editar</button>
                  <button className="del" onClick={() => confirm(`¿Eliminar ${x.codigo}?`) && m.remove(x.id)}>Eliminar</button></td></tr>
            })}</tbody></table>}
      </div>
    </Page>
  )
}
