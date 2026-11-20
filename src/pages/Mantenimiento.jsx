import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, Stat, formData } from '../components'
import { hoy, money, sum } from '../lib/calc'

const TIPOS_MANTENIMIENTO = [
  'Limpieza profunda y desinfección',
  'Desatoro de monedero (moneda trabada)',
  'Cambio de cerradura / llaves',
  'Reemplazo de globo de acrílico',
  'Ajuste o cambio de resortes y engranajes',
  'Pintura o renovación de base',
  'Otro',
]

export default function Mantenimiento() {
  const mant = useTable('mantenimientos')
  const m = useTable('maquinas')
  const n = useTable('negocios')
  const [nuevo, setNuevo] = useState(false)

  const maquinasMap = useMemo(() => new Map(m.rows.map((x) => [x.id, x])), [m.rows])
  const negociosPorMaquina = useMemo(() => new Map(n.rows.map((neg) => [neg.maquina_id, neg])), [n.rows])

  const maquinasEnTaller = m.rows.filter((x) => x.estado === 'mantenimiento')
  const costoTotalReparaciones = sum(mant.rows, 'costo')

  const save = async (e) => {
    const d = formData(e, ['costo'])
    const ok = await mant.insert({
      maquina_id: d.maquina_id,
      tipo: d.tipo,
      fecha: d.fecha,
      costo: d.costo || 0,
      notas: d.notas,
      resuelto: d.estado_maquina !== 'mantenimiento',
    })

    if (ok) {
      // Actualizar estado de la máquina según lo seleccionado
      if (d.estado_maquina) {
        await m.update(d.maquina_id, { estado: d.estado_maquina })
      }
      setNuevo(false)
    }
  }

  return (
    <Page
      title="Mantenimiento y Control Técnico"
      actions={
        <button onClick={() => setNuevo(!nuevo)}>
          {nuevo ? 'Cerrar formulario' : '🔧 Registrar mantenimiento o avería'}
        </button>
      }
    >
      <Err e={mant.error || m.error} />

      {/* Alerta de máquinas en taller */}
      {maquinasEnTaller.length > 0 && (
        <div className="err" style={{ background: '#fef2f2', color: '#991b1b', borderLeftColor: '#ef4444' }}>
          <b>⚠️ Máquinas en mantenimiento técnico ({maquinasEnTaller.length}):</b>{' '}
          {maquinasEnTaller.map((x) => x.codigo).join(', ')}. Recuerda darles de alta cuando estén listas para volver a instalarse.
        </div>
      )}

      {/* Métricas clave */}
      <div className="grid">
        <Stat label="Total mantenimientos" value={mant.rows.length} sub="intervenciones técnicas" />
        <Stat label="Costo acumulado" value={money(costoTotalReparaciones)} sub="en repuestos y arreglos" />
        <div className={`stat ${maquinasEnTaller.length > 0 ? 'hot' : ''}`}>
          <span>Máquinas en mantenimiento</span>
          <b>{maquinasEnTaller.length}</b>
          <small>{maquinasEnTaller.length > 0 ? 'Requieren reparación' : 'Todas operativas'}</small>
        </div>
        <Stat label="Máquinas operativas" value={m.rows.filter((x) => x.estado !== 'mantenimiento').length} sub="en local o listas" />
      </div>

      {/* Formulario de Registro */}
      {nuevo && (
        <div className="card">
          <h3>Registrar Intervención Técnica o Avería</h3>
          <form className="f" onSubmit={save}>
            <label>
              Máquina intervenida
              <select name="maquina_id" required defaultValue="">
                <option value="">Selecciona la máquina...</option>
                {m.rows.map((x) => {
                  const neg = negociosPorMaquina.get(x.id)
                  return (
                    <option key={x.id} value={x.id}>
                      {x.codigo} ({x.estado}) {neg ? `— En: ${neg.negocio}` : '— En almacén'}
                    </option>
                  )
                })}
              </select>
            </label>

            <label>
              Tipo de trabajo
              <select name="tipo" required defaultValue={TIPOS_MANTENIMIENTO[0]}>
                {TIPOS_MANTENIMIENTO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <Field label="Fecha" name="fecha" type="date" defaultValue={hoy()} required />
            <Field label="Costo de repuestos / arreglo (S/)" name="costo" type="number" step="0.01" defaultValue="0" />

            <label>
              Estado posterior de la máquina
              <select name="estado_maquina" defaultValue="disponible" required>
                <option value="disponible">Lista en almacén (Disponible)</option>
                <option value="instalada">Operativa en local (Instalada)</option>
                <option value="mantenimiento">Aún en taller (Mantenimiento)</option>
              </select>
            </label>

            <Field label="Diagnóstico o detalle de reparación" name="notas" placeholder="Ej. Se retiró moneda doblada de 1 sol" />

            <div className="acts">
              <button>Guardar reporte</button>
              <button type="button" className="alt" onClick={() => setNuevo(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial de Mantenimientos */}
      <div className="card">
        <div className="card-header-flex">
          <h3>Historial de Reparaciones y Limpiezas</h3>
          <Link to="/maquinas" className="text-link">Ver catálogo de máquinas →</Link>
        </div>

        {!mant.rows.length ? (
          <p className="empty">No hay registros de averías o mantenimientos. ¡Tus máquinas están funcionando al 100%!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Máquina</th>
                <th>Tipo de intervención</th>
                <th className="n">Costo</th>
                <th>Ubicación</th>
                <th>Detalle / Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...mant.rows].reverse().map((x) => {
                const maq = maquinasMap.get(x.maquina_id)
                const neg = maq ? negociosPorMaquina.get(maq.id) : null
                return (
                  <tr key={x.id}>
                    <td>{x.fecha}</td>
                    <td><b>{maq?.codigo || '—'}</b></td>
                    <td>
                      <span className="pill info">{x.tipo}</span>
                    </td>
                    <td className="n">{money(x.costo)}</td>
                    <td>{neg ? neg.negocio : 'Almacén (casa)'}</td>
                    <td>{x.notas || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="del"
                        onClick={() => confirm('¿Eliminar registro de mantenimiento?') && mant.remove(x.id)}
                      >
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
