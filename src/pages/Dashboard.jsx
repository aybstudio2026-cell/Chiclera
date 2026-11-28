import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { money, sum } from '../lib/calc'

export default function Dashboard() {
  const m = useTable('maquinas'), n = useTable('negocios'), r = useTable('revisiones'), c = useTable('compras')
  const [hoveredBar, setHoveredBar] = useState(null)

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
    const balance = neta - totalComprado // Todo lo que gano menos todo lo que invierto

    return {
      inst,
      neta,
      recup,
      recaudoTotal,
      inversionChicles,
      parteDueno,
      totalComprado,
      balance,
    }
  }, [m.rows, r.rows, c.rows])

  // Últimas revisiones individuales para la tabla
  const ultimas = useMemo(
    () => [...r.rows].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 7),
    [r.rows]
  )

  // AGRUPADO POR DÍA (FECHA) para el gráfico de barras: junta todo lo recaudado en el mismo día
  const chartData = useMemo(() => {
    const porFecha = new Map()
    const sorted = [...r.rows].sort((a, b) => a.fecha.localeCompare(b.fecha))

    sorted.forEach((item) => {
      const fecha = item.fecha
      const prev = porFecha.get(fecha) || { recaudo: 0, neta: 0, count: 0, locales: [] }
      const nombreLocal = negociosMap.get(item.negocio_id) || 'Local'
      porFecha.set(fecha, {
        recaudo: prev.recaudo + (Number(item.recaudo) || 0),
        neta: prev.neta + (Number(item.ganancia_neta) || 0),
        count: prev.count + 1,
        locales: prev.locales.includes(nombreLocal) ? prev.locales : [...prev.locales, nombreLocal],
      })
    })

    return Array.from(porFecha.entries()).slice(-10).map(([fecha, d]) => ({
      id: fecha,
      fecha: fecha.slice(5), // mm-dd para el eje X
      fechaCompleta: fecha,
      recaudo: d.recaudo,
      neta: d.neta,
      count: d.count,
      localesStr: d.locales.join(', '),
    }))
  }, [r.rows, negociosMap])

  // Ranking de negocios más rentables
  const rankingNegocios = useMemo(() => {
    const agrupado = new Map()
    r.rows.forEach((rv) => {
      const prev = agrupado.get(rv.negocio_id) || { recaudo: 0, neta: 0 }
      agrupado.set(rv.negocio_id, {
        recaudo: prev.recaudo + Number(rv.recaudo || 0),
        neta: prev.neta + Number(rv.ganancia_neta || 0),
      })
    })

    const lista = n.rows.map((neg) => {
      const data = agrupado.get(neg.id) || { recaudo: 0, neta: 0 }
      return {
        id: neg.id,
        nombre: neg.negocio,
        dueno: neg.dueno,
        ...data,
      }
    })

    const maxNeta = Math.max(1, ...lista.map((x) => x.neta))
    return {
      lista: lista.sort((a, b) => b.neta - a.neta).slice(0, 5),
      maxNeta,
    }
  }, [n.rows, r.rows])

  // Gráfico de Dona: Distribución del dinero
  const donutData = useMemo(() => {
    const total = stats.recaudoTotal || 1
    const pNeta = (stats.neta / total) * 100
    const pDueno = (stats.parteDueno / total) * 100
    const pChicles = (stats.inversionChicles / total) * 100

    const C = 2 * Math.PI * 40
    const dashNeta = (pNeta / 100) * C
    const dashDueno = (pDueno / 100) * C
    const dashChicles = (pChicles / 100) * C

    const offsetNeta = 0
    const offsetDueno = -dashNeta
    const offsetChicles = -(dashNeta + dashDueno)

    return { C, pNeta, pDueno, pChicles, dashNeta, dashDueno, dashChicles, offsetNeta, offsetDueno, offsetChicles }
  }, [stats])

  const maxBarValue = Math.max(10, ...chartData.map((d) => Math.max(d.recaudo, d.neta)))

  return (
    <Page title="Dashboard General">
      <Err e={m.error || n.error || r.error || c.error} />

      {/* Grid de 4 métricas esenciales limpias en 1 sola fila */}
      <div className="grid dashboard-main-grid">
        <div className={`stat ${stats.balance >= 0 ? 'stat-balance-pos' : 'stat-balance-neg'}`}>
          <span>⚖️ Balance Real (Ganado − Invertido)</span>
          <b className="stat-balance-value">
            {stats.balance >= 0 ? `+${money(stats.balance)}` : `-${money(Math.abs(stats.balance))}`}
          </b>
          <small>
            {stats.balance >= 0
              ? '🎉 ¡Negocio en ganancia neta total!'
              : `Faltan ${money(Math.abs(stats.balance))} para recuperar inversión inicial`}
          </small>
        </div>

        <div className="stat hot">
          <span>🚀 Mi Ganancia Neta</span>
          <b>{money(stats.neta)}</b>
          <small>{stats.recup.toFixed(1)}% de inversión en máquinas recuperada</small>
        </div>

        <Stat
          label="💵 Total Recaudado en Máquinas"
          value={money(stats.recaudoTotal)}
          sub={`${r.rows.length} visitas acumuladas`}
        />

        <Stat
          label="💸 Total Gastos e Inversión"
          value={money(stats.totalComprado)}
          sub={`${c.rows.length} compras y gastos registrados`}
        />
      </div>

      {/* Gráficos Principales */}
      <div className="dashboard-charts-grid">
        {/* Gráfico 1: Evolución de Recaudaciones AGRUPADO POR DÍA */}
        <div className="card chart-card">
          <div className="card-header-flex">
            <div>
              <h3>📊 Recaudación vs Mi Neta (Por Día)</h3>
              <small className="sub-text">Total acumulado por fecha de visitas</small>
            </div>
            <div className="chart-legend">
              <span className="legend-item"><i className="dot recaudo" /> Recaudo día</span>
              <span className="legend-item"><i className="dot neta" /> Mi neta día</span>
            </div>
          </div>

          {!chartData.length ? (
            <p className="empty">Registra tus primeras revisiones para visualizar la gráfica.</p>
          ) : (
            <div className="svg-chart-wrapper">
              <svg viewBox="0 0 500 210" className="bar-chart-svg">
                <line x1="40" y1="30" x2="480" y2="30" stroke="#eee9f6" strokeDasharray="3 3" />
                <line x1="40" y1="95" x2="480" y2="95" stroke="#eee9f6" strokeDasharray="3 3" />
                <line x1="40" y1="160" x2="480" y2="160" stroke="#e4dfee" />

                <text x="35" y="35" textAnchor="end" className="chart-label">{money(maxBarValue)}</text>
                <text x="35" y="100" textAnchor="end" className="chart-label">{money(maxBarValue / 2)}</text>
                <text x="35" y="165" textAnchor="end" className="chart-label">S/ 0</text>

                {chartData.map((d, i) => {
                  const step = 420 / Math.max(1, chartData.length)
                  const xBase = 55 + i * step
                  const hRecaudo = (d.recaudo / maxBarValue) * 130
                  const hNeta = (d.neta / maxBarValue) * 130
                  const yRecaudo = 160 - hRecaudo
                  const yNeta = 160 - hNeta

                  return (
                    <g
                      key={d.id}
                      className="bar-group"
                      onMouseEnter={() => setHoveredBar(d)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      <rect
                        x={xBase}
                        y={yRecaudo}
                        width="16"
                        height={Math.max(2, hRecaudo)}
                        rx="4"
                        className="bar-recaudo"
                      />
                      <rect
                        x={xBase + 18}
                        y={yNeta}
                        width="16"
                        height={Math.max(2, hNeta)}
                        rx="4"
                        className="bar-neta"
                      />
                      <text x={xBase + 17} y="180" textAnchor="middle" className="chart-label-x">
                        {d.fecha}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {hoveredBar && (
                <div className="chart-tooltip">
                  <b>📅 {hoveredBar.fechaCompleta}</b> ({hoveredBar.count} {hoveredBar.count === 1 ? 'visita' : 'visitas'})
                  <div style={{ fontSize: '11px', color: '#cbbfe3', margin: '2px 0' }}>{hoveredBar.localesStr}</div>
                  <div>Recaudo total del día: <b>{money(hoveredBar.recaudo)}</b></div>
                  <div className="text-ok">Mi neta total del día: <b>{money(hoveredBar.neta)}</b></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gráfico 2: Reparto del Dinero */}
        <div className="card chart-card">
          <div className="card-header-flex">
            <div>
              <h3>🍰 Reparto de Cada Sol</h3>
              <small className="sub-text">Distribución porcentual de los ingresos</small>
            </div>
          </div>

          {stats.recaudoTotal === 0 ? (
            <p className="empty">Sin datos de recaudación aún.</p>
          ) : (
            <div className="donut-container">
              <div className="donut-svg-wrapper">
                <svg viewBox="0 0 100 100" className="donut-svg">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f6f4fa" strokeWidth="16" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--teal)"
                    strokeWidth="16"
                    strokeDasharray={`${donutData.dashNeta} ${donutData.C}`}
                    strokeDashoffset={donutData.offsetNeta}
                    className="donut-segment"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--plum)"
                    strokeWidth="16"
                    strokeDasharray={`${donutData.dashDueno} ${donutData.C}`}
                    strokeDashoffset={donutData.offsetDueno}
                    className="donut-segment"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--sun)"
                    strokeWidth="16"
                    strokeDasharray={`${donutData.dashChicles} ${donutData.C}`}
                    strokeDashoffset={donutData.offsetChicles}
                    className="donut-segment"
                  />
                </svg>
                <div className="donut-center-text">
                  <span>Mi margen</span>
                  <b>{donutData.pNeta.toFixed(0)}%</b>
                </div>
              </div>

              <div className="donut-legend-list">
                <div className="donut-legend-row">
                  <span className="dot neta" />
                  <div>
                    <b>Mi Ganancia: {donutData.pNeta.toFixed(1)}%</b>
                    <div>{money(stats.neta)}</div>
                  </div>
                </div>
                <div className="donut-legend-row">
                  <span className="dot dueno" />
                  <div>
                    <b>Dueños de local: {donutData.pDueno.toFixed(1)}%</b>
                    <div>{money(stats.parteDueno)}</div>
                  </div>
                </div>
                <div className="donut-legend-row">
                  <span className="dot chicles" />
                  <div>
                    <b>Insumos/Chicles: {donutData.pChicles.toFixed(1)}%</b>
                    <div>{money(stats.inversionChicles)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sección inferior: Ranking de Negocios y Últimas Revisiones */}
      <div className="dashboard-bottom-grid">
        <div className="card">
          <div className="card-header-flex">
            <h3>🏆 Negocios más Rentables</h3>
            <Link to="/negocios" className="text-link">Ver todos →</Link>
          </div>
          {!rankingNegocios.lista.length ? (
            <p className="empty">Registra negocios para ver el ranking.</p>
          ) : (
            <div className="ranking-list">
              {rankingNegocios.lista.map((b, idx) => {
                const pct = (b.neta / rankingNegocios.maxNeta) * 100
                return (
                  <div key={b.id} className="ranking-row">
                    <div className="ranking-pos">#{idx + 1}</div>
                    <div className="ranking-info">
                      <div className="ranking-header">
                        <b>{b.nombre}</b>
                        <span className="text-ok">{money(b.neta)} neta</span>
                      </div>
                      <div className="ranking-bar-bg">
                        <div className="ranking-bar-fill" style={{ width: `${Math.max(5, pct)}%` }} />
                      </div>
                      <small className="sub-text">Dueño: {b.dueno} • Recaudado total: {money(b.recaudo)}</small>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header-flex">
            <h3>🕒 Últimas Visitas Registradas</h3>
            <Link to="/negocios" className="text-link">Ver todas →</Link>
          </div>
          {!ultimas.length ? (
            <p className="empty">Aún no hay revisiones registradas.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Negocio</th>
                  <th className="n">Recaudo</th>
                  <th className="n">Mi neta</th>
                </tr>
              </thead>
              <tbody>
                {ultimas.map((x) => (
                  <tr key={x.id}>
                    <td>{x.fecha}</td>
                    <td><b>{negociosMap.get(x.negocio_id) || '—'}</b></td>
                    <td className="n">{money(x.recaudo)}</td>
                    <td className="n text-ok"><b>{money(x.ganancia_neta)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Page>
  )
}
