import { useState } from 'react'
import { Page, Stat } from '../components'
import { money } from '../lib/calc'

// Constantes fijas de tu modelo de negocio
const PRECIO_CHICLE = 1.00 // S/ 1.00 por chicle vendido
const COSTO_CHICLE = 90 / 500 // S/ 0.18 por chicle (bolsa de 500 a S/ 90)
const COSTO_MAQUINA = 310.00 // S/ 310 por máquina chiclera
const SEMANAS_MES = 4.33 // Promedio de semanas al mes
const COMISION_DUENO_PROMEDIO = 20 // 20% promedio para los dueños de local

export default function Proyeccion() {
  const [p, setP] = useState({
    maq0: 2, // Máquinas iniciales
    nuevasMes: 1, // Máquinas que compras de tu bolsillo cada mes
    ventasSemana: 60, // Chicles vendidos por máquina por semana
    meses: 12, // Meses a proyectar
    reinv: 50, // % de tu ganancia que reinviertes en más máquinas
  })

  const v = {
    maq0: Number(p.maq0) || 1,
    nuevasMes: Number(p.nuevasMes) || 0,
    ventasSemana: Number(p.ventasSemana) || 10,
    meses: Math.min(60, Math.max(1, Number(p.meses) || 12)),
    reinv: Number(p.reinv) || 0,
  }

  // Simulación mes a mes
  let maq = v.maq0
  let poolReinversion = 0
  let cajaAcumulada = -v.maq0 * COSTO_MAQUINA // Inversión inicial negativa
  const filas = []

  for (let mes = 1; mes <= v.meses; mes++) {
    const chiclesVendidos = maq * v.ventasSemana * SEMANAS_MES
    const ingresoBruto = chiclesVendidos * PRECIO_CHICLE
    const costoChicles = chiclesVendidos * COSTO_CHICLE
    const gananciaBase = ingresoBruto - costoChicles
    const pagoDueno = (gananciaBase * COMISION_DUENO_PROMEDIO) / 100
    const miGanancia = gananciaBase - pagoDueno

    // Reinversión orgánica en máquinas
    poolReinversion += (miGanancia * v.reinv) / 100
    const maqsPorReinversion = Math.floor(poolReinversion / COSTO_MAQUINA)
    poolReinversion -= maqsPorReinversion * COSTO_MAQUINA

    const maqsNuevasTotales = maqsPorReinversion + v.nuevasMes
    cajaAcumulada += miGanancia - maqsNuevasTotales * COSTO_MAQUINA

    filas.push({
      mes,
      maq,
      ingresoBruto,
      pagoDueno,
      miGanancia,
      maqsPorReinversion,
      maqsNuevasTotales,
      cajaAcumulada,
    })

    maq += maqsNuevasTotales
  }

  const ult = filas[filas.length - 1]

  return (
    <Page title="Proyección de Crecimiento del Negocio">
      {/* Caja de constantes fijas del negocio */}
      <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid var(--teal)', padding: '14px 18px' }}>
        <b style={{ color: 'var(--plum)' }}>⚙️ Parámetros Fijos de tu Operación:</b>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '6px', fontSize: '13px', color: 'var(--mute)' }}>
          <span>🍬 Venta al público: <b>S/ 1.00 / chicle</b></span>
          <span>📦 Costo insumo: <b>S/ 0.18 / chicle</b> (bolsa S/ 90)</span>
          <span>🎰 Costo por máquina: <b>S/ 310.00</b></span>
          <span>🤝 Comisión dueño: <b>20% sobre ganancia</b></span>
        </div>
      </div>

      {/* Formulario de Parámetros de Crecimiento */}
      <div className="card">
        <h3>Simula tus Objetivos de Crecimiento</h3>
        <form className="f" onSubmit={(e) => e.preventDefault()}>
          <label>
            Máquinas instaladas hoy
            <input
              type="number"
              min="1"
              value={p.maq0}
              onChange={(e) => setP({ ...p, maq0: e.target.value })}
            />
          </label>

          <label>
            Máquinas nuevas por mes (de tu bolsillo)
            <input
              type="number"
              min="0"
              value={p.nuevasMes}
              onChange={(e) => setP({ ...p, nuevasMes: e.target.value })}
            />
          </label>

          <label>
            Chicles vendidos por máquina a la semana
            <input
              type="number"
              min="10"
              value={p.ventasSemana}
              onChange={(e) => setP({ ...p, ventasSemana: e.target.value })}
            />
          </label>

          <label>
            % de tu ganancia que reinviertes en más máquinas
            <input
              type="number"
              min="0"
              max="100"
              value={p.reinv}
              onChange={(e) => setP({ ...p, reinv: e.target.value })}
            />
          </label>

          <label>
            Tiempo a proyectar (Meses)
            <select value={p.meses} onChange={(e) => setP({ ...p, meses: e.target.value })}>
              <option value="6">6 meses</option>
              <option value="12">12 meses (1 año)</option>
              <option value="18">18 meses (1.5 años)</option>
              <option value="24">24 meses (2 años)</option>
              <option value="36">36 meses (3 años)</option>
            </select>
          </label>
        </form>
      </div>

      {/* Tarjetas de Resultado al Final del Periodo */}
      {ult && (
        <div className="grid">
          <Stat
            label={`Máquinas al mes ${v.meses}`}
            value={ult.maq + ult.maqsNuevasTotales}
            sub={`${v.maq0} iniciales → ${ult.maq + ult.maqsNuevasTotales} finales`}
          />
          <Stat
            label="Recaudación mensual final"
            value={money(ult.ingresoBruto)}
            sub={`en el mes ${v.meses}`}
          />
          <Stat
            label="Tu ganancia neta mensual final"
            value={money(ult.miGanancia)}
            sub="cada mes de forma pasiva"
          />
          <div className="stat hot">
            <span>Caja Neta Acumulada</span>
            <b>{money(ult.cajaAcumulada)}</b>
            <small>ganancias totales − todas las máquinas compradas</small>
          </div>
        </div>
      )}

      {/* Tabla detallada mes a mes */}
      <div className="card">
        <h3>Evolución Financiera Mes a Mes</h3>
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th className="n">Máquinas en Ruta</th>
              <th className="n">Recaudo Bruto</th>
              <th className="n">Pago a Dueños</th>
              <th className="n">Tu Ganancia Neta</th>
              <th className="n">Nuevas Máquinas</th>
              <th className="n">Caja Acumulada</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.mes}>
                <td><b>Mes {f.mes}</b></td>
                <td className="n">{f.maq} máquinas</td>
                <td className="n">{money(f.ingresoBruto)}</td>
                <td className="n">{money(f.pagoDueno)}</td>
                <td className="n text-ok"><b>{money(f.miGanancia)}</b></td>
                <td className="n">
                  {f.maqsNuevasTotales > 0 ? (
                    <span className="pill ok">+{f.maqsNuevasTotales} máq</span>
                  ) : (
                    '0'
                  )}
                </td>
                <td className="n">
                  <b style={{ color: f.cajaAcumulada >= 0 ? '#059669' : '#dc2626' }}>
                    {money(f.cajaAcumulada)}
                  </b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  )
}
