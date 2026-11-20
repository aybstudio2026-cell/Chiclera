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
    const margenNeto = recaudoTotal > 0 ? (neta / recaudoTotal) * 100 : 0
    const promedioPorRevision = r.rows.length > 0 ? recaudoTotal / r.rows.length : 0

    return {
      inst,
      costoMaq,
      neta,
      recup,
      recaudoTotal,
      inversionChicles,
      parteDueno,
      totalComprado,
      margenNeto,
      promedioPorRevision,
    }
  }, [m.rows, r.rows, c.rows])

  // Últimas revisiones cronológicas
  const ultimas = useMemo(
    () => [...r.rows].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 7),
    [r.rows]
  )

  // Datos para el gráfico de barras (últimas 8 revisiones en orden cronológico)
  const chartData = useMemo(() => {
    const sorted = [...r.rows].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-8)
    return sorted.map((item) => ({
      id: item.id,
      fecha: item.fecha.slice(5), // mm-dd
      fechaCompleta: item.fecha,
      negocio: negociosMap.get(item.negocio_id) || 'Negocio',
      recaudo: Number(item.recaudo) || 0,
      neta: Number(item.ganancia_neta) || 0,
    }))
  }, [r.rows, negociosMap])

  // Ranking de negocios más rentables
  const rankingNegocios = useMemo(() => {
    const agrupado = new Map()
    r.rows.forEach((rv) => {
      const prev = agrupado.get(rv.negocio_id) || { recaudo: 0, neta: 0, count: 0 }
      agrupado.set(rv.negocio_id, {
        recaudo: prev.recaudo + Number(rv.recaudo || 0),
        neta: prev.neta + Number(rv.ganancia_neta || 0),
        count: prev.count + 1,
      })
    })

    const lista = n.rows.map((neg) => {
      const data = agrupado.get(neg.id) || { recaudo: 0, neta: 0, count: 0 }
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

  // Gráfico de Dona: Distribución del dinero recaudado
  const donutData = useMemo(() => {
    const total = stats.recaudoTotal || 1
    const pNeta = (stats.neta / total) * 100
    const pDueno = (stats.parteDueno / total) * 100
    const pChicles = (stats.inversionChicles / total) * 100

    // Cálculo de ángulos SVG (stroke-dasharray para círculo r=40, circunf=251.32)
    const C = 2 * Math.PI * 40
    const dashNeta = (pNeta / 100) * C
    const dashDueno = (pDueno / 100) * C
    const dashChicles = (pChicles / 100) * C

    const offsetNeta = 0
    const offsetDueno = -dashNeta
    const offsetChicles = -(dashNeta + dashDueno)

    return { C, pNeta, pDueno, pChicles, dashNeta, dashDueno, dashChicles, offsetNeta, offsetDueno, offsetChicles }
  }, [stats])

  // Escala para el gráfico de barras
  const maxBarValue = Math.max(10, ...chartData.map((d) => Math.max(d.recaudo, d.neta)))

  return (
    <Page title="Dashboard General">
      <Err e={m.error || n.error || r.error || c.error} />

      {/* Grid de métricas clave */}
      <div className="grid">
        <Stat label="🎰 Máquinas" value={m.rows.length} sub={`${stats.inst} instaladas en negocios`} />
        <Stat label="🏪 Negocios socios" value={n.rows.length} />
        <Stat label="💵 Recaudado total" value={money(stats.recaudoTotal)} sub={`Promedio ${money(stats.promedioPorRevision)} / visita`} />
        <Stat label="🍬 Inversión en chicles" value={money(stats.inversionChicles)} />
        <Stat label="🤝 Pagado a dueños" value={money(stats.parteDueno)} />
        <div className="stat hot">
          <span>🚀 Mi ganancia neta</span>
          <b>{money(stats.neta)}</b>
          <small>{stats.recup.toFixed(1)}% de inversión en máquinas recuperada</small>
        </div>
        <Stat label="📈 Margen neto" value={`${stats.margenNeto.toFixed(1)}%`} sub="de cada S/ 100 recaudados" />
      </div>

      {/* Sección de Gráficos */}
      <div className="dashboard-charts-grid">
        {/* Gráfico 1: Evolución de Revisiones */}
        <div className="card chart-card">
          <div className="card-header-flex">
            <div>
              <h3>📊 Recaudación vs Mi Ganancia Neta</h3>
              <small className="sub-text">Últimas revisiones registradas</small>
            </div>
            <div className="chart-legend">
              <span className="legend-item"><i className="dot recaudo" /> Recaudo</span>
              <span className="legend-item"><i className="dot neta" /> Mi neta</span>
            </div>
          </div>

          {!chartData.length ? (
            <p className="empty">Registra tus primeras revisiones para visualizar la gráfica.</p>
          ) : (
            <div className="svg-chart-wrapper">
              <svg viewBox="0 0 500 210" className="bar-chart-svg">
                {/* Líneas guía de fondo */}
                <line x1="40" y1="30" x2="480" y2="30" stroke="#eee9f6" strokeDasharray="3 3" />
                <line x1="40" y1="95" x2="480" y2="95" stroke="#eee9f6" strokeDasharray="3 3" />
                <line x1="40" y1="160" x2="480" y2="160" stroke="#e4dfee" />

                {/* Etiquetas de escala Y */}
                <text x="35" y="35" textAnchor="end" className="chart-label">{money(maxBarValue)}</text>
                <text x="35" y="100" textAnchor="end" className="chart-label">{money(maxBarValue / 2)}</text>
                <text x="35" y="165" textAnchor="end" className="chart-label">S/ 0</text>

                {/* Barras por revisión */}
                {chartData.map((d, i) => {
                  const step = 420 / chartData.length
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
                      {/* Barra Recaudo */}
                      <rect
                        x={xBase}
                        y={yRecaudo}
                        width="14"
                        height={Math.max(2, hRecaudo)}
                        rx="4"
                        className="bar-recaudo"
                      />
                      {/* Barra Neta */}
                      <rect
                        x={xBase + 16}
                        y={yNeta}
                        width="14"
                        height={Math.max(2, hNeta)}
                        rx="4"
                        className="bar-neta"
                      />
                      {/* Etiqueta X */}
                      <text x={xBase + 15} y="180" textAnchor="middle" className="chart-label-x">
                        {d.fecha}
                      </text>
                    </g>
                  )
                })}
              </svg>

              {/* Tooltip al pasar el cursor */}
              {hoveredBar && (
                <div className="chart-tooltip">
                  <b>{hoveredBar.negocio}</b> ({hoveredBar.fechaCompleta})
                  <div>Recaudo: <b>{money(hoveredBar.recaudo)}</b></div>
                  <div className="text-ok">Mi neta: <b>{money(hoveredBar.neta)}</b></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Gráfico 2: Reparto del Dinero Recaudado */}
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
                  {/* Segmento: Mi neta (Verde/Teal) */}
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
                  {/* Segmento: Dueño (Morado) */}
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
                  {/* Segmento: Inversión en Chicles (Amarillo) */}
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
        {/* Ranking de negocios más rentables */}
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

        {/* Tabla de últimas revisiones */}
        <div className="card">
          <div className="card-header-flex">
            <h3>🕒 Últimas Revisiones</h3>
            <Link to="/negocios" className="text-link">Ver revisiones →</Link>
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
