import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { money, sum } from '../lib/calc'

export default function Dashboard() {
  const m = useTable('maquinas'), n = useTable('negocios'), r = useTable('revisiones'), c = useTable('compras')

  const negociosMap = useMemo(() => new Map(n.rows.map((x) => [x.id, x.negocio])), [n.rows])

  const stats = useMemo(() => {
    const inst = m.rows.filter((x) => x.estado === 'instalada').length
    const costoMaq = sum(m.rows, 'costo')
    const neta = sum(r.rows, 'ganancia_neta')
    const recup = costoMaq > 0 ? (neta / costoMaq) * 100 : 0
    const recaudoTotal = sum(r.rows, 'recaudo')
    const inversionChicles = sum(r.rows, 'inversion_chicles')
    const parteDueno = sum(r.rows, 'parte_dueno')
    const totalComprado = sum(c.rows, 'costo_total')

    return { inst, costoMaq, neta, recup, recaudoTotal, inversionChicles, parteDueno, totalComprado }
  }, [m.rows, r.rows, c.rows])

  const ultimas = useMemo(
    () => [...r.rows].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 7),
    [r.rows]
  )

  return (
    <Page title="Dashboard">
      <Err e={m.error || n.error || r.error || c.error} />
      <div className="grid">
        <Stat label="Máquinas" value={m.rows.length} sub={`${stats.inst} instaladas`} />
        <Stat label="Negocios" value={n.rows.length} />
        <Stat label="Recaudado total" value={money(stats.recaudoTotal)} />
        <Stat label="Inversión en chicles" value={money(stats.inversionChicles)} />
        <Stat label="Pagado a dueños" value={money(stats.parteDueno)} />
        <div className="stat hot">
          <span>Mi ganancia neta</span>
          <b>{money(stats.neta)}</b>
          <small>{stats.recup.toFixed(1)}% de inversión en máquinas recuperada</small>
        </div>
        <Stat label="Total comprado" value={money(stats.totalComprado)} sub="máquinas + insumos" />
      </div>

      <div className="card">
        <div className="card-header-flex">
          <h3>Últimas revisiones</h3>
          <Link to="/negocios" className="text-link">Ver todos los negocios →</Link>
        </div>
        {!ultimas.length ? (
          <p className="empty">Aún no hay revisiones. Entra a Negocios y dueños y pulsa Revisiones para añadir la primera.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Negocio</th>
                <th className="n">Recaudo</th>
                <th className="n">Dueño</th>
                <th className="n">Mi neta</th>
              </tr>
            </thead>
            <tbody>
              {ultimas.map((x) => (
                <tr key={x.id}>
                  <td>{x.fecha}</td>
                  <td><b>{negociosMap.get(x.negocio_id) || '—'}</b></td>
                  <td className="n">{money(x.recaudo)}</td>
                  <td className="n">{money(x.parte_dueno)}</td>
                  <td className="n text-ok">{money(x.ganancia_neta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
