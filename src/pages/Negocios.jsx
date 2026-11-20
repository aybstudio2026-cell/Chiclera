import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, formData } from '../components'
import { hoy, mesNegocio, money, pctDueno, sum } from '../lib/calc'

export default function Negocios() {
  const n = useTable('negocios'), m = useTable('maquinas'), r = useTable('revisiones')
  const [ed, setEd] = useState(null)

  const maquinasMap = useMemo(() => new Map(m.rows.map((x) => [x.id, x])), [m.rows])

  const revisionesPorNegocio = useMemo(() => {
    const map = new Map()
    r.rows.forEach((rv) => {
      if (!map.has(rv.negocio_id)) map.set(rv.negocio_id, [])
      map.get(rv.negocio_id).push(rv)
    })
    return map
  }, [r.rows])

  const libres = useMemo(
    () => m.rows.filter((x) => !n.rows.some((y) => y.maquina_id === x.id && y.id !== ed?.id)),
    [m.rows, n.rows, ed]
  )

  const save = async (e) => {
    const d = formData(e)
    const oldMaquinaId = ed?.id ? ed.maquina_id : null
    const newMaquinaId = d.maquina_id || null

    if (await (ed.id ? n.update(ed.id, d) : n.insert(d))) {
      // Si se desasignó o cambió la máquina, liberar la anterior
      if (oldMaquinaId && oldMaquinaId !== newMaquinaId) {
        await m.update(oldMaquinaId, { estado: 'disponible' })
      }
      // Marcar la nueva máquina asignada como instalada
      if (newMaquinaId) {
        await m.update(newMaquinaId, { estado: 'instalada' })
      }
      setEd(null)
    }
  }

  const removeNegocio = async (x) => {
    if (!confirm(`¿Eliminar ${x.negocio} y sus revisiones?`)) return
    if (x.maquina_id) {
      await m.update(x.maquina_id, { estado: 'disponible' })
    }
    await n.remove(x.id)
  }

  return (
    <Page title="Negocios y dueños" actions={<button onClick={() => setEd({})}>Nuevo negocio</button>}>
      <Err e={n.error || m.error} />
      {ed && (
        <div className="card">
          <form className="f" key={ed.id || 'new'} onSubmit={save}>
            <Field label="Negocio" name="negocio" defaultValue={ed.negocio || ''} required />
            <Field label="Dueño" name="dueno" defaultValue={ed.dueno || ''} required />
            <Field label="Teléfono" name="telefono" type="tel" defaultValue={ed.telefono || ''} />
            <Field label="Dirección" name="direccion" defaultValue={ed.direccion || ''} />
            <label>
              Máquina
              <select name="maquina_id" defaultValue={ed.maquina_id || ''}>
                <option value="">Sin máquina</option>
                {libres.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.codigo} ({x.estado})
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Fecha de instalación"
              name="fecha_instalacion"
              type="date"
              defaultValue={ed.fecha_instalacion || hoy()}
              required
            />
            <div className="acts">
              <button>Guardar</button>
              <button type="button" className="alt" onClick={() => setEd(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="card">
        {!n.rows.length ? (
          <p className="empty">Registra el primer negocio donde instalarás una máquina.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Dueño</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Máquina</th>
                <th className="n">% dueño hoy</th>
                <th className="n">Rendimiento</th>
                <th className="n">Mi neta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {n.rows.map((x) => {
                const rv = revisionesPorNegocio.get(x.id) || []
                const maq = maquinasMap.get(x.maquina_id)
                return (
                  <tr key={x.id}>
                    <td><b>{x.negocio}</b></td>
                    <td>{x.dueno}</td>
                    <td>
                      {x.telefono ? (
                        <a href={`tel:${x.telefono}`} className="tel-link">
                          {x.telefono}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{x.direccion || '—'}</td>
                    <td>
                      {maq ? (
                        <span className="pill ok">{maq.codigo}</span>
                      ) : (
                        <span className="pill warn">Sin máquina</span>
                      )}
                    </td>
                    <td className="n">{pctDueno(mesNegocio(x.fecha_instalacion))}%</td>
                    <td className="n">{money(sum(rv, 'recaudo'))}</td>
                    <td className="n">{money(sum(rv, 'ganancia_neta'))}</td>
                    <td className="acts">
                      <Link className="btn" to={`/negocios/${x.id}/revisiones`}>
                        Revisiones
                      </Link>
                      <button className="alt" onClick={() => setEd(x)}>
                        Editar
                      </button>
                      <button className="del" onClick={() => removeNegocio(x)}>
                        Eliminar
                      </button>
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
