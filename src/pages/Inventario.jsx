import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page, Stat } from '../components'
import { CHICLES_BOLSA, COSTO_BOLSA, money, sum } from '../lib/calc'

const COSTO_POR_CHICLE = COSTO_BOLSA / CHICLES_BOLSA // S/ 0.18 por chicle (bolsa de 500 a S/ 90)

export default function Inventario() {
  const c = useTable('compras'), r = useTable('revisiones'), m = useTable('maquinas')
  const [umbralMinimo, setUmbralMinimo] = useState(2) // 2 bolsas mínimo de seguridad

  const data = useMemo(() => {
    // 1. Total chicles ingresados por compras (considera unidades exactas ej. 515 o bolsas estándar)
    const comprasChicles = c.rows.filter((x) => x.tipo === 'chicles')
    const chiclesComprados = comprasChicles.reduce((acc, x) => {
      if (x.unidades != null && Number(x.unidades) > 0) return acc + Number(x.unidades)
      const cant = Number(x.cantidad) || 0
      return acc + (cant > 50 ? cant : cant * CHICLES_BOLSA)
    }, 0)
    const bolsasCompradas = Number((chiclesComprados / CHICLES_BOLSA).toFixed(1))
    const totalInvertidoChicles = sum(comprasChicles, 'costo_total')

    // 2. Total chicles salidos a máquinas (por revisiones)
    const dineroInvertidoRevisiones = sum(r.rows, 'inversion_chicles')
    const chiclesSalidos = Math.round(dineroInvertidoRevisiones / COSTO_POR_CHICLE)

    // 3. Stock físico en almacén (tu casa)
    const stockChicles = Math.max(0, chiclesComprados - chiclesSalidos)
    const stockBolsas = Number((stockChicles / CHICLES_BOLSA).toFixed(1))
    const valorStock = stockChicles * COSTO_POR_CHICLE

    // 4. Máquinas activas en calle
    const maquinasActivas = m.rows.filter((x) => x.estado === 'instalada').length
    const promedioConsumoPorMaquina = maquinasActivas > 0 && r.rows.length > 0
      ? Math.round(chiclesSalidos / r.rows.length)
      : 60

    const bolsasNecesariasSiguienteRuta = Number(
      ((maquinasActivas * promedioConsumoPorMaquina) / CHICLES_BOLSA).toFixed(1)
    )

    return {
      bolsasCompradas,
      chiclesComprados,
      totalInvertidoChicles,
      chiclesSalidos,
      stockChicles,
      stockBolsas,
      valorStock,
      maquinasActivas,
      promedioConsumoPorMaquina,
      bolsasNecesariasSiguienteRuta,
    }
  }, [c.rows, r.rows, m.rows])

  const estadoStock = data.stockBolsas <= 1
    ? { nivel: 'critico', texto: '🔴 Stock Crítico — ¡Comprar ya!', color: '#ef4444' }
    : data.stockBolsas <= umbralMinimo
    ? { nivel: 'alerta', texto: '🟡 Stock Justo — Comprar pronto', color: '#f59e0b' }
    : { nivel: 'optimo', texto: '🟢 Stock Óptimo', color: '#10b981' }

  // Alerta inteligente: ¿alcanza para la próxima ruta? (#5)
  const chiclesNecesariosRuta = data.maquinasActivas * data.promedioConsumoPorMaquina
  const stockSuficiente = data.stockChicles >= chiclesNecesariosRuta

  return (
    <Page
      title="Stock de Chicles en Almacén"
      actions={
        <Link to="/compras" className="btn" title="Registrar nueva compra de bolsas">
          🛒 Comprar bolsas de chicles
        </Link>
      }
    >
      <Err e={c.error || r.error || m.error} />

      {/* Tarjeta Principal de Almacén Visual */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #faf8ff 100%)', border: '1.5px solid var(--line)' }}>
        <div className="card-header-flex">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🏠</span>
              <h2 style={{ fontSize: '20px', color: 'var(--plum)' }}>Almacén Central: Av. Pumacahua 1835</h2>
            </div>
            <small className="sub-text">Balance físico entre bolsas compradas y chicles colocados en máquinas</small>
          </div>
          <div>
            <span
              className="pill"
              style={{
                background: estadoStock.nivel === 'optimo' ? '#dcfce7' : estadoStock.nivel === 'alerta' ? '#fef3c7' : '#fee2e2',
                color: estadoStock.nivel === 'optimo' ? '#065f46' : estadoStock.nivel === 'alerta' ? '#92400e' : '#991b1b',
                padding: '6px 14px',
                fontSize: '13px',
              }}
            >
              {estadoStock.texto}
            </span>
          </div>
        </div>

        {/* Medidor visual de existencia */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', margin: '18px 0' }}>
          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '16px', borderRadius: '14px', textAlign: 'center' }}>
            <span style={{ color: 'var(--mute)', fontSize: '13px' }}>Bolsas Disponibles</span>
            <div style={{ fontSize: '32px', fontFamily: 'Fredoka, sans-serif', color: 'var(--plum)', margin: '4px 0' }}>
              📦 {data.stockBolsas} <small style={{ fontSize: '16px' }}>bolsas</small>
            </div>
            <small style={{ color: 'var(--mute)' }}>500 chicles por bolsa</small>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '16px', borderRadius: '14px', textAlign: 'center' }}>
            <span style={{ color: 'var(--mute)', fontSize: '13px' }}>Unidades de Chicles</span>
            <div style={{ fontSize: '32px', fontFamily: 'Fredoka, sans-serif', color: 'var(--teal)', margin: '4px 0' }}>
              🍬 {data.stockChicles.toLocaleString()} <small style={{ fontSize: '16px' }}>chicles</small>
            </div>
            <small style={{ color: 'var(--mute)' }}>listos para reponer</small>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--line)', padding: '16px', borderRadius: '14px', textAlign: 'center' }}>
            <span style={{ color: 'var(--mute)', fontSize: '13px' }}>Valor en Dinero del Stock</span>
            <div style={{ fontSize: '32px', fontFamily: 'Fredoka, sans-serif', color: '#047857', margin: '4px 0' }}>
              💵 {money(data.valorStock)}
            </div>
            <small style={{ color: 'var(--mute)' }}>a costo de S/ 0.18 c/u</small>
          </div>
        </div>

        {/* Barra de progreso de inventario */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--mute)', marginBottom: '4px' }}>
            <span>Capacidad de Almacén</span>
            <span>{data.stockChicles} chicles en casa / {data.chiclesComprados || 1} comprados históricos</span>
          </div>
          <div className="bar" style={{ width: '100%', height: '10px' }}>
            <i
              style={{
                width: `${data.chiclesComprados > 0 ? Math.min(100, (data.stockChicles / data.chiclesComprados) * 100) : 0}%`,
                background: estadoStock.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Planificación para la siguiente ruta */}
      <div className="card" style={{ background: '#f8fafc' }}>
        <div className="card-header-flex">
          <div>
            <h3>🚚 Estimación para tu Siguiente Ruta Semanal</h3>
            <small className="sub-text">Cálculo de insumos sugerido antes de salir a cobrar</small>
          </div>
          <Link to="/ruta" className="btn alt" style={{ fontSize: '13px' }}>
            🗺️ Ir a Ruta de Visitas →
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '10px' }}>
          <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ color: 'var(--mute)', fontSize: '12px' }}>Máquinas instaladas en locales</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)' }}>{data.maquinasActivas} máquinas activas</div>
          </div>

          <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ color: 'var(--mute)', fontSize: '12px' }}>Chicles estimados por máquina</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--teal)' }}>~{data.promedioConsumoPorMaquina} chicles / semana</div>
          </div>

          <div style={{ background: '#fff', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ color: 'var(--mute)', fontSize: '12px' }}>Llevar contigo en ruta</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--berry)' }}>
              ~{Math.max(1, Math.ceil(data.bolsasNecesariasSiguienteRuta))} bolsa(s) ({data.maquinasActivas * data.promedioConsumoPorMaquina} chicles)
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Compras de Bolsas */}
      <div className="card">
        <h3>📋 Lotes de Chicles Ingresados al Almacén</h3>
        {!c.rows.filter((x) => x.tipo === 'chicles').length ? (
          <p className="empty">No has registrado compras de chicles todavía. <Link to="/compras">Registra la primera aquí</Link>.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha de Compra</th>
                <th>Concepto</th>
                <th className="n">Bolsas Compradas</th>
                <th className="n">Total Chicles</th>
                <th className="n">Costo Total</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {c.rows
                .filter((x) => x.tipo === 'chicles')
                .reverse()
                .map((x) => (
                  <tr key={x.id}>
                    <td>{x.fecha}</td>
                    <td><b>Lote de chicles</b></td>
                    <td className="n"><b>{x.cantidad} {x.cantidad === 1 ? 'bolsa' : 'bolsas'}</b></td>
                    <td className="n">
                      <b>
                        {((x.unidades != null && Number(x.unidades) > 0)
                          ? Number(x.unidades)
                          : (Number(x.cantidad) > 50 ? Number(x.cantidad) : Number(x.cantidad) * CHICLES_BOLSA)
                        ).toLocaleString()} u.
                      </b>
                    </td>
                    <td className="n text-ok"><b>{money(x.costo_total)}</b></td>
                    <td>{x.notas || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
