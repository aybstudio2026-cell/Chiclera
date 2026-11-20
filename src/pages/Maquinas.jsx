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
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Estado</th>
                <th>Negocio asignado</th>
                <th className="n">Costo</th>
                <th className="n">Recaudado</th>
                <th className="n">Mi ganancia neta</th>
                <th>Inversión recuperada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {m.rows.map((x) => {
                const neg = negociosPorMaquina.get(x.id)
                const rv = neg ? (revisionesPorNegocio.get(neg.id) || []) : []
                const neta = sum(rv, 'ganancia_neta')
                const pct = x.costo ? Math.min(100, (neta / x.costo) * 100) : 0
                return (
                  <tr key={x.id}>
                    <td><b>{x.codigo}</b></td>
                    <td>
                      <span className={'pill ' + (x.estado === 'instalada' ? 'ok' : x.estado === 'disponible' ? 'info' : 'warn')}>
                        {x.estado}
                      </span>
                    </td>
                    <td>
                      {neg ? (
                        <Link to={`/negocios/${neg.id}/revisiones`} className="text-link">
                          {neg.negocio}
                        </Link>
                      ) : (
                        <span className="pill warn">Sin negocio</span>
                      )}
                    </td>
                    <td className="n">{money(x.costo)}</td>
                    <td className="n">{money(sum(rv, 'recaudo'))}</td>
                    <td className="n text-ok">{money(neta)}</td>
                    <td>
                      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                      {(x.costo ? (neta / x.costo) * 100 : 0).toFixed(0)}%
                    </td>
                    <td className="acts">
                      <button className="alt" onClick={() => setEd(x)}>Editar</button>
                      <button className="del" onClick={() => confirm(`¿Eliminar ${x.codigo}?`) && m.remove(x.id)}>Eliminar</button>
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
