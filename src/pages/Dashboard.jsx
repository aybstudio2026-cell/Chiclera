import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { money, sum } from '../lib/calc'

export default function Dashboard() {
  const m = useTable('maquinas'), n = useTable('negocios'), r = useTable('revisiones'), c = useTable('compras')
  const inst = m.rows.filter((x) => x.estado === 'instalada').length
  const costoMaq = sum(m.rows, 'costo'), neta = sum(r.rows, 'ganancia_neta')
  const recup = costoMaq ? (neta / costoMaq) * 100 : 0
  const nombre = (id) => n.rows.find((x) => x.id === id)?.negocio || '—'
  const ultimas = [...r.rows].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6)
  return (
    <Page title="Dashboard">
      <Err e={m.error || n.error || r.error || c.error} />
      <div className="grid">
        <Stat label="Máquinas" value={m.rows.length} sub={`${inst} instaladas`} />
        <Stat label="Negocios" value={n.rows.length} />
        <Stat label="Recaudado total" value={money(sum(r.rows, 'recaudo'))} />
        <Stat label="Inversión en chicles" value={money(sum(r.rows, 'inversion_chicles'))} />
        <Stat label="Pagado a dueños" value={money(sum(r.rows, 'parte_dueno'))} />
        <div className="stat hot"><span>Mi ganancia neta</span><b>{money(neta)}</b><small>{recup.toFixed(1)}% de la inversión en máquinas recuperada</small></div>
        <Stat label="Total comprado" value={money(sum(c.rows, 'costo_total'))} sub="máquinas + chicles" />
      </div>
      <div className="card"><h3>Últimas revisiones</h3>
        {!ultimas.length ? <p className="empty">Aún no hay revisiones. Entra a Negocios y dueños y pulsa Revisiones.</p> :
          <table><thead><tr><th>Fecha</th><th>Negocio</th><th className="n">Recaudo</th><th className="n">Dueño</th><th className="n">Mi neta</th></tr></thead>
            <tbody>{ultimas.map((x) => <tr key={x.id}><td>{x.fecha}</td><td>{nombre(x.negocio_id)}</td>
              <td className="n">{money(x.recaudo)}</td><td className="n">{money(x.parte_dueno)}</td><td className="n">{money(x.ganancia_neta)}</td></tr>)}</tbody></table>}
      </div>
    </Page>
  )
}
