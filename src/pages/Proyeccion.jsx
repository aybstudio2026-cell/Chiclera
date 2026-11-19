import { useState } from 'react'
import { Page, Stat } from '../components'
import { COSTO_BOLSA, CHICLES_BOLSA, COSTO_MAQUINA, PRECIO_CHICLE, SEMANAS_MES, money } from '../lib/calc'

const campos = [
  ['maq0', 'Máquinas iniciales'], ['nuevas', 'Máquinas nuevas por mes (con tu dinero)'], ['meses', 'Meses a proyectar'],
  ['ventas', 'Chicles vendidos por máquina por semana'], ['precio', 'Precio por chicle (S/)'], ['costoChicle', 'Costo por chicle (S/)'],
  ['costoMaq', 'Costo por máquina (S/)'], ['dueno', '% promedio para el dueño'], ['reinv', '% de mi ganancia que reinvierto en máquinas'],
]

export default function Proyeccion() {
  const [p, setP] = useState({ maq0: 3, nuevas: 2, meses: 12, ventas: 60, precio: PRECIO_CHICLE, costoChicle: COSTO_BOLSA / CHICLES_BOLSA, costoMaq: COSTO_MAQUINA, dueno: 20, reinv: 50 })
  const v = Object.fromEntries(Object.entries(p).map(([k, x]) => [k, Number(x) || 0]))
  let maq = v.maq0, pool = 0, caja = -v.maq0 * v.costoMaq
  const filas = []
  for (let mes = 1; mes <= Math.min(60, v.meses); mes++) {
    const chicles = maq * v.ventas * SEMANAS_MES
    const ingreso = chicles * v.precio, gan = ingreso - chicles * v.costoChicle
    const dueno = gan * v.dueno / 100, mia = gan - dueno
    pool += mia * v.reinv / 100
    const reinv = Math.floor(pool / v.costoMaq); pool -= reinv * v.costoMaq
    caja += mia - (reinv + v.nuevas) * v.costoMaq
    filas.push({ mes, maq, ingreso, dueno, mia, nuevas: reinv + v.nuevas, caja })
    maq += reinv + v.nuevas
  }
  const ult = filas[filas.length - 1]
  return (
    <Page title="Proyección de inversión">
      <div className="card"><form className="f" onSubmit={(e) => e.preventDefault()}>
        {campos.map(([k, l]) => <label key={k}>{l}<input type="number" step="any" min="0" value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} /></label>)}
      </form></div>
      {ult && <div className="grid">
        <Stat label="Máquinas al final" value={ult.maq + ult.nuevas} />
        <Stat label="Ingreso del último mes" value={money(ult.ingreso)} />
        <Stat label="Mi ganancia del último mes" value={money(ult.mia)} />
        <div className="stat hot"><span>Caja acumulada</span><b>{money(ult.caja)}</b><small>ganancias − todas las máquinas compradas</small></div>
      </div>}
      <div className="card"><table><thead><tr><th>Mes</th><th className="n">Máquinas</th><th className="n">Ingreso</th><th className="n">Dueños</th><th className="n">Mi ganancia</th><th className="n">Máquinas nuevas</th><th className="n">Caja acumulada</th></tr></thead>
        <tbody>{filas.map((f) => <tr key={f.mes}><td>{f.mes}</td><td className="n">{f.maq}</td><td className="n">{money(f.ingreso)}</td><td className="n">{money(f.dueno)}</td>
          <td className="n">{money(f.mia)}</td><td className="n">{f.nuevas}</td><td className="n">{money(f.caja)}</td></tr>)}</tbody></table></div>
      <p className="empty">Estimación simple: usa un % de dueño promedio y {SEMANAS_MES} semanas por mes. Las máquinas nuevas empiezan a vender el mes siguiente.</p>
    </Page>
  )
}
