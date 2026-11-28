import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, formData } from '../components'
import { CHICLES_BOLSA, COSTO_BOLSA, COSTO_MAQUINA, hoy, money, sum } from '../lib/calc'
import { exportToExcel } from '../lib/exportExcel'

const TIPOS_GASTO = [
  { id: 'chicles', label: '🍬 Chicles / Insumos de rotación', icon: '🍬', badge: 'info' },
  { id: 'maquina', label: '🎰 Máquina Chiclera nueva', icon: '🎰', badge: 'ok' },
  { id: 'envio', label: '🚚 Flete / Envío de máquina o insumos', icon: '🚚', badge: 'warn' },
  { id: 'accesorio', label: '⛓️ Cadena, candado y seguridad', icon: '⛓️', badge: 'warn' },
  { id: 'repuesto', label: '🔧 Repuesto o arreglo', icon: '🔧', badge: 'muted' },
  { id: 'otro', label: '🧾 Otro gasto operativo', icon: '🧾', badge: 'muted' },
]

const nextCode = (rows) =>
  'CH' + String(Math.max(0, ...rows.map((r) => parseInt(r.codigo?.slice(2)) || 0)) + 1).padStart(3, '0')

export default function Compras() {
  const c = useTable('compras')
  const m = useTable('maquinas')
  const n = useTable('negocios')
  const r = useTable('revisiones')

  const [tipo, setTipo] = useState('chicles')
  const [ed, setEd] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')

  // Campos interactivos para chicles
  const [bolsasInput, setBolsasInput] = useState(1)
  const [chiclesExactos, setChiclesExactos] = useState(CHICLES_BOLSA)
  const [costoTotalChicles, setCostoTotalChicles] = useState(COSTO_BOLSA)

  // Al cambiar bolsas, sugerir chicles estándar y costo
  const handleBolsasChange = (val) => {
    const num = Math.max(1, parseInt(val) || 1)
    setBolsasInput(num)
    setChiclesExactos(num * CHICLES_BOLSA)
    setCostoTotalChicles(num * COSTO_BOLSA)
  }

  // Iniciar edición de un gasto existente
  const abrirEdicion = (item) => {
    setEd(item)
    setTipo(item.tipo)
    if (item.tipo === 'chicles') {
      const bolsas = item.cantidad || 1
      setBolsasInput(bolsas)
      setChiclesExactos(item.unidades != null ? Number(item.unidades) : (item.cantidad > 50 ? item.cantidad : bolsas * CHICLES_BOLSA))
      setCostoTotalChicles(Number(item.costo_total) || bolsas * COSTO_BOLSA)
    }
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  const cancelarEdicion = () => {
    setEd(null)
    setTipo('chicles')
    setBolsasInput(1)
    setChiclesExactos(CHICLES_BOLSA)
    setCostoTotalChicles(COSTO_BOLSA)
  }

  const save = async (e) => {
    e.preventDefault()
    const form = e.target
    const d = new FormData(form)

    const payload = {
      tipo,
      fecha: d.get('fecha') || hoy(),
      notas: d.get('notas') || '',
    }

    if (tipo === 'maquina') {
      const codigo = d.get('codigo')?.trim().toUpperCase()
      const costo = Number(d.get('costo_total')) || COSTO_MAQUINA
      payload.codigo = codigo
      payload.cantidad = 1
      payload.costo_total = costo
      payload.unidades = null

      if (!ed) {
        // Al crear nueva máquina, se da de alta en la tabla de máquinas
        const ok = await m.insert({ codigo, costo, estado: 'disponible', fecha_compra: payload.fecha })
        if (!ok) return
      }
    } else if (tipo === 'chicles') {
      const bolsas = Number(bolsasInput) || 1
      const exactos = Number(chiclesExactos) || bolsas * CHICLES_BOLSA
      const costo = Number(costoTotalChicles) || bolsas * COSTO_BOLSA

      payload.codigo = null
      payload.cantidad = bolsas
      payload.unidades = exactos
      payload.costo_total = costo
    } else {
      // envio, accesorio, repuesto, otro
      const costo = Number(d.get('costo_total')) || 0
      const maquinaSel = d.get('codigo_maquina')
      payload.codigo = maquinaSel && maquinaSel !== 'general' ? maquinaSel : null
      payload.cantidad = 1
      payload.unidades = null
      payload.costo_total = costo
    }

    if (ed?.id) {
      await c.update(ed.id, payload)
      cancelarEdicion()
    } else {
      await c.insert(payload)
      form.reset()
      setBolsasInput(1)
      setChiclesExactos(CHICLES_BOLSA)
      setCostoTotalChicles(COSTO_BOLSA)
    }
  }

  // Métricas de resumen de gastos
  const stats = useMemo(() => {
    const rows = c.rows
    const totalGastos = sum(rows, 'costo_total')
    const gastoMaquinas = sum(rows.filter((x) => x.tipo === 'maquina'), 'costo_total')
    const comprasChicles = rows.filter((x) => x.tipo === 'chicles')
    const gastoChicles = sum(comprasChicles, 'costo_total')
    const totalChiclesComprados = comprasChicles.reduce((acc, x) => {
      if (x.unidades != null && Number(x.unidades) > 0) return acc + Number(x.unidades)
      const cant = Number(x.cantidad) || 0
      return acc + (cant > 50 ? cant : cant * CHICLES_BOLSA)
    }, 0)
    const otrosGastos = sum(rows.filter((x) => !['maquina', 'chicles'].includes(x.tipo)), 'costo_total')

    return { totalGastos, gastoMaquinas, gastoChicles, totalChiclesComprados, otrosGastos }
  }, [c.rows])

  // Lista filtrada
  const gastosFiltrados = useMemo(() => {
    let list = [...c.rows].sort((a, b) => b.fecha.localeCompare(a.fecha))
    if (filtroTipo !== 'todos') {
      list = list.filter((x) => x.tipo === filtroTipo)
    }
    return list
  }, [c.rows, filtroTipo])

  // Exportar historial de gastos a Excel
  const exportarGastosExcel = () => {
    const headers = [
      { key: 'fecha', label: 'Fecha' },
      { key: 'tipo', label: 'Categoría', transform: (v) => TIPOS_GASTO.find((t) => t.id === v)?.label || v },
      { key: 'detalle', label: 'Detalle / Concepto', transform: (_, r) => {
        if (r.tipo === 'chicles') {
          const u = r.unidades || (r.cantidad > 50 ? r.cantidad : r.cantidad * CHICLES_BOLSA)
          return `${u} chicles (${r.cantidad} bolsas)`
        }
        if (r.tipo === 'maquina') return `Máquina ${r.codigo}`
        return r.codigo ? `Para máq. ${r.codigo}` : 'General'
      }},
      { key: 'costo_total', label: 'Total Pagado (S/)', transform: (v) => Number(v || 0).toFixed(2) },
      { key: 'notas', label: 'Notas / Proveedor' },
    ]
    exportToExcel({
      filename: 'registro_gastos_chiclecontrol',
      headers,
      rows: gastosFiltrados,
    })
  }

  const getTipoInfo = (t) => TIPOS_GASTO.find((x) => x.id === t) || { label: t, icon: '🧾', badge: 'info' }

  return (
    <Page
      title="Registro de Gastos"
      actions={
        <button
          type="button"
          className="btn alt"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={exportarGastosExcel}
          title="Descargar reporte de gastos en Excel"
        >
          📥 Exportar a Excel
        </button>
      }
    >
      <Err e={c.error || m.error} />

      {/* Resumen de Inversión y Gastos */}
      <div className="ideas-summary-bar" style={{ marginBottom: '18px' }}>
        <div className="ideas-summary-chip">
          <span>💸 Total Invertido / Gastos:</span>
          <b style={{ color: 'var(--berry)' }}>{money(stats.totalGastos)}</b>
        </div>
        <div className="ideas-summary-chip">
          <span>🎰 En Máquinas:</span>
          <b>{money(stats.gastoMaquinas)}</b>
        </div>
        <div className="ideas-summary-chip">
          <span>🍬 En Chicles:</span>
          <b>{money(stats.gastoChicles)} <small style={{ color: '#059669' }}>({stats.totalChiclesComprados} u.)</small></b>
        </div>
        <div className="ideas-summary-chip">
          <span>🚚 Envíos / Cadenas / Otros:</span>
          <b style={{ color: '#d97706' }}>{money(stats.otrosGastos)}</b>
        </div>
      </div>

      {/* Formulario de Registro o Edición de Gasto */}
      <div className="card" style={{ border: ed ? '2px solid var(--berry)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>
            {ed ? `✏️ Editando Gasto: ${getTipoInfo(ed.tipo).label}` : '💸 Registrar Nuevo Gasto o Compra'}
          </h3>
          {ed && (
            <button type="button" className="btn alt" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={cancelarEdicion}>
              Cancelar edición ✕
            </button>
          )}
        </div>

        <form onSubmit={save} key={ed?.id || 'new'}>
          {/* Selector de categoría de gasto */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <b>Tipo de Gasto:</b>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value)
                  if (e.target.value === 'chicles') {
                    setBolsasInput(1)
                    setChiclesExactos(CHICLES_BOLSA)
                    setCostoTotalChicles(COSTO_BOLSA)
                  }
                }}
                disabled={!!ed}
                style={{ fontSize: '14.5px', padding: '9px 12px' }}
              >
                {TIPOS_GASTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* CAMPOS ESPECÍFICOS SEGÚN EL TIPO */}

          {/* 1. MÁQUINA NUEVA */}
          {tipo === 'maquina' && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <Field
                label="Código de serie"
                name="codigo"
                defaultValue={ed?.codigo || nextCode(m.rows)}
                pattern="CH[0-9]{3,}"
                required
                disabled={!!ed}
                title="Código único de la máquina (ej. CH001, CH002)"
              />
              <Field
                label="Costo de la máquina (S/)"
                name="costo_total"
                type="number"
                step="0.01"
                defaultValue={ed?.costo_total ?? COSTO_MAQUINA}
                required
              />
              <Field label="Fecha de compra" name="fecha" type="date" defaultValue={ed?.fecha || hoy()} required />
            </div>
          )}

          {/* 2. CHICLES / INSUMOS CON CANTIDAD EXACTA EDITABLE */}
          {tipo === 'chicles' && (
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Bolsas compradas:</span>
                  <input
                    type="number"
                    min="1"
                    value={bolsasInput}
                    onChange={(e) => handleBolsasChange(e.target.value)}
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'var(--berry)', fontWeight: '700' }}>
                    🍬 Chicles recibidos (editable):
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={chiclesExactos}
                    onChange={(e) => setChiclesExactos(e.target.value)}
                    placeholder="Ej. 515"
                    required
                    style={{ borderColor: 'var(--berry)', fontWeight: '700', fontSize: '15px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Costo total pagado (S/):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={costoTotalChicles}
                    onChange={(e) => setCostoTotalChicles(e.target.value)}
                    required
                  />
                </label>

                <Field label="Fecha de compra" name="fecha" type="date" defaultValue={ed?.fecha || hoy()} required />
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💡 <b>Tip de inventario:</b> Si la bolsa vino con 515 o 520 chicles en lugar de los 500 estándar, anótalo aquí para que tu conteo de stock sea 100% exacto.</span>
              </div>
            </div>
          )}

          {/* 3. ENVÍOS, CADENAS, REPUESTOS U OTROS GASTOS */}
          {!['maquina', 'chicles'].includes(tipo) && (
            <div style={{ background: '#fdf8f6', padding: '14px', borderRadius: '12px', border: '1px solid #fed7aa', marginBottom: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '10px' }}>
                <Field
                  label="Monto pagado (S/)"
                  name="costo_total"
                  type="number"
                  step="0.01"
                  defaultValue={ed?.costo_total ?? ''}
                  placeholder="Ej. 35.00"
                  required
                />

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>Asignar a máquina (opcional):</span>
                  <select name="codigo_maquina" defaultValue={ed?.codigo || 'general'}>
                    <option value="general">Gasto general (ninguna máquina específica)</option>
                    {m.rows.map((maq) => (
                      <option key={maq.id} value={maq.codigo}>
                        Máquina {maq.codigo}
                      </option>
                    ))}
                  </select>
                </label>

                <Field label="Fecha del gasto" name="fecha" type="date" defaultValue={ed?.fecha || hoy()} required />
              </div>
            </div>
          )}

          {/* Campo de notas / detalle compartido */}
          <div style={{ marginBottom: '14px' }}>
            <Field
              label={tipo === 'chicles' ? 'Notas o proveedor (opcional)' : 'Detalle o concepto del gasto'}
              name="notas"
              defaultValue={ed?.notas || ''}
              placeholder={
                tipo === 'envio'
                  ? 'Ej. Envío de máquina por Shalom desde Lima a Trujillo'
                  : tipo === 'accesorio'
                  ? 'Ej. Cadena acerada 1.5m + Candado Yale 50mm'
                  : tipo === 'repuesto'
                  ? 'Ej. Cambio de cerradura tubular y 2 llaves'
                  : tipo === 'chicles'
                  ? 'Ej. Distribuidora Mayorista, lote con vencimiento 2027'
                  : 'Ej. Pasajes, artículos de limpieza, etc.'
              }
              required={!['maquina', 'chicles'].includes(tipo)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn" style={{ fontWeight: '700' }}>
              {ed ? '💾 Guardar Cambios' : '💸 Registrar Gasto'}
            </button>
            {ed && (
              <button type="button" className="btn alt" onClick={cancelarEdicion}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Historial de Gastos y Compras */}
      <div className="card">
        <div className="card-header-flex" style={{ flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0 }}>📋 Historial de Gastos e Inversiones</h3>
            <small className="sub-text">Máquinas, lotes de chicles, envíos, cadenas y gastos operativos</small>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              Filtrar:
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="todos">Todos los gastos ({c.rows.length})</option>
                {TIPOS_GASTO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {!gastosFiltrados.length ? (
          <p className="empty">No hay gastos registrados para este filtro.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Detalle / Concepto</th>
                <th className="n">Monto Total</th>
                <th>Notas</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map((x) => {
                const info = getTipoInfo(x.tipo)
                return (
                  <tr key={x.id}>
                    <td>{x.fecha}</td>
                    <td>
                      <span className={`pill ${info.badge}`} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {info.icon} {x.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {x.tipo === 'chicles' ? (
                        <>
                          <b>
                            {((x.unidades != null && Number(x.unidades) > 0)
                              ? Number(x.unidades)
                              : (Number(x.cantidad) > 50 ? Number(x.cantidad) : Number(x.cantidad) * CHICLES_BOLSA)
                            ).toLocaleString()} chicles
                          </b>{' '}
                          <small style={{ color: '#64748b' }}>({x.cantidad} bolsas)</small>
                        </>
                      ) : x.tipo === 'maquina' ? (
                        <b>Máquina {x.codigo}</b>
                      ) : (
                        <span>
                          {x.codigo ? <b>[Máq. {x.codigo}] </b> : ''}
                          {x.notas || info.label}
                        </span>
                      )}
                    </td>
                    <td className="n">
                      <b style={{ color: 'var(--berry)' }}>{money(x.costo_total)}</b>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#475569' }}>
                        {x.tipo === 'chicles' || x.tipo === 'maquina' ? (x.notas || '—') : (x.codigo ? `Asignado a ${x.codigo}` : 'General')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn alt"
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          onClick={() => abrirEdicion(x)}
                          title="Editar este gasto o corregir cantidad"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="btn del"
                          style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          onClick={() => confirm(`¿Eliminar este registro de gasto (${money(x.costo_total)})?`) && c.remove(x.id)}
                          title="Eliminar gasto"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Revisiones y Reposiciones en Ruta */}
      <div className="card">
        <h3>🕒 Últimas Reposiciones de Chicles en Ruta</h3>
        <small className="sub-text">Chicles descargados del almacén e introducidos en máquinas durante las visitas</small>
        {!r.rows.length ? (
          <p className="empty">Sin revisiones registradas todavía.</p>
        ) : (
          <table style={{ marginTop: '10px' }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Negocio</th>
                <th className="n">Recaudo Monedas</th>
                <th className="n">Inversión Chicles Repuestos</th>
                <th className="n">Mi Ganancia Neta</th>
              </tr>
            </thead>
            <tbody>
              {[...r.rows]
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .slice(0, 8)
                .map((x) => (
                  <tr key={x.id}>
                    <td>{x.fecha}</td>
                    <td><b>{n.rows.find((neg) => neg.id === x.negocio_id)?.negocio || '—'}</b></td>
                    <td className="n">{money(x.recaudo)}</td>
                    <td className="n">{money(x.inversion_chicles)}</td>
                    <td className="n text-ok"><b>{money(x.ganancia_neta)}</b></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  )
}
