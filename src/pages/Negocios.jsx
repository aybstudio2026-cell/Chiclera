import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Field, Page, formData } from '../components'
import { hoy, mesNegocio, money, pctDueno, sum } from '../lib/calc'
import MapaPickerModal from '../MapaPickerModal'

// Recuperar coordenadas guardadas en localStorage si no vienen en la BD
const getSavedCoords = (id) => {
  try {
    const raw = localStorage.getItem('coords_' + id)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}

export default function Negocios() {
  const n = useTable('negocios'), m = useTable('maquinas'), r = useTable('revisiones')
  const [ed, setEd] = useState(null)
  const [coordsEd, setCoordsEd] = useState(null) // [lat, lng]
  const [busqueda, setBusqueda] = useState('')

  // Estado para el modal de mapa
  const [modalMapa, setModalMapa] = useState({
    isOpen: false,
    negocioId: null,
    nombre: '',
    direccion: '',
    coords: null,
  })

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

  const negociosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return n.rows
    const q = busqueda.toLowerCase()
    return n.rows.filter(
      (x) =>
        x.negocio.toLowerCase().includes(q) ||
        x.dueno.toLowerCase().includes(q) ||
        (x.direccion && x.direccion.toLowerCase().includes(q))
    )
  }, [n.rows, busqueda])

  const abrirEdicion = (x = {}) => {
    setEd(x)
    if (x.id) {
      const c = x.lat && x.lng ? [Number(x.lat), Number(x.lng)] : getSavedCoords(x.id)
      setCoordsEd(c)
    } else {
      setCoordsEd(null)
    }
  }

  // Abrir modal picker directamente para un negocio de la lista
  const abrirMapaRapido = (x) => {
    const c = x.lat && x.lng ? [Number(x.lat), Number(x.lng)] : getSavedCoords(x.id)
    setModalMapa({
      isOpen: true,
      negocioId: x.id,
      nombre: x.negocio,
      direccion: x.direccion || '',
      coords: c,
    })
  }

  // Abrir modal picker desde el formulario de edición
  const abrirMapaDesdeForm = () => {
    setModalMapa({
      isOpen: true,
      negocioId: ed?.id || null,
      nombre: ed?.negocio || 'Negocio en registro',
      direccion: ed?.direccion || '',
      coords: coordsEd,
    })
  }

  // Confirmar coordenadas desde el modal
  const handleConfirmCoords = async ({ lat, lng }) => {
    const newCoords = [lat, lng]
    if (modalMapa.negocioId) {
      // Guardar inmediatamente para negocio existente
      localStorage.setItem('coords_' + modalMapa.negocioId, JSON.stringify(newCoords))
      try {
        await n.update(modalMapa.negocioId, { lat, lng })
      } catch (e) {}
    }

    // Si estamos editando en el formulario
    if (ed) {
      setCoordsEd(newCoords)
    }
  }

  const save = async (e) => {
    const d = formData(e)
    if (coordsEd) {
      d.lat = coordsEd[0]
      d.lng = coordsEd[1]
    }
    const oldMaquinaId = ed?.id ? ed.maquina_id : null
    const newMaquinaId = d.maquina_id || null

    const res = await (ed.id ? n.update(ed.id, d) : n.insert(d))
    if (res) {
      const savedId = ed.id || (typeof res === 'object' && res.id ? res.id : null)
      if (savedId && coordsEd) {
        localStorage.setItem('coords_' + savedId, JSON.stringify(coordsEd))
      }
      if (oldMaquinaId && oldMaquinaId !== newMaquinaId) {
        await m.update(oldMaquinaId, { estado: 'disponible' })
      }
      if (newMaquinaId) {
        await m.update(newMaquinaId, { estado: 'instalada' })
      }
      setEd(null)
      setCoordsEd(null)
    }
  }

  const removeNegocio = async (x) => {
    if (!confirm(`¿Eliminar ${x.negocio} y sus revisiones?`)) return
    if (x.maquina_id) {
      await m.update(x.maquina_id, { estado: 'disponible' })
    }
    try {
      localStorage.removeItem('coords_' + x.id)
    } catch (e) {}
    await n.remove(x.id)
  }

  return (
    <Page
      title="Negocios y Locales"
      actions={
        <button onClick={() => abrirEdicion({})}>
          ➕ Nuevo negocio
        </button>
      }
    >
      <Err e={n.error || m.error} />

      {/* Modal interactivo de selección de ubicación en el mapa */}
      <MapaPickerModal
        isOpen={modalMapa.isOpen}
        onClose={() => setModalMapa((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmCoords}
        initialCoords={modalMapa.coords}
        titulo={modalMapa.nombre}
        direccionReferencia={modalMapa.direccion}
      />

      {/* Formulario de creación / edición */}
      {ed && (
        <div className="card">
          <h3>{ed.id ? `Editar: ${ed.negocio}` : 'Nuevo local donde colocar máquina'}</h3>
          <form className="f" key={ed.id || 'new'} onSubmit={save}>
            <Field label="Nombre del Negocio / Bodega" name="negocio" defaultValue={ed.negocio || ''} placeholder="Ej. Bodega Don Lucho" required />
            <Field label="Dueño o Encargado" name="dueno" defaultValue={ed.dueno || ''} placeholder="Ej. Luis Morales" required />
            <Field label="Teléfono (para llamar/WhatsApp)" name="telefono" type="tel" defaultValue={ed.telefono || ''} placeholder="987654321" />
            <Field label="Dirección escrita / Referencia" name="direccion" defaultValue={ed.direccion || ''} placeholder="Ej. Calle Los Pinos 234" />

            {/* Selector interactivo de mapa */}
            <div className="location-picker-box">
              <div className="location-picker-info">
                <span className="location-picker-label">Ubicación exacta en mapa (GPS):</span>
                {coordsEd ? (
                  <span className="location-badge ok">
                    📍 Lat: {coordsEd[0].toFixed(5)}, Lng: {coordsEd[1].toFixed(5)}
                  </span>
                ) : (
                  <span className="location-badge warn">
                    ⚠️ Aún no has marcado el punto en el mapa
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-map-pick"
                onClick={abrirMapaDesdeForm}
              >
                🗺️ {coordsEd ? 'Cambiar punto en el mapa' : 'Abrir mapa y marcar ubicación'}
              </button>
            </div>

            <label>
              Máquina asignada
              <select name="maquina_id" defaultValue={ed.maquina_id || ''}>
                <option value="">Sin máquina asignada</option>
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
              <button>Guardar local</button>
              <button type="button" className="alt" onClick={() => { setEd(null); setCoordsEd(null); }}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador rápido para móvil */}
      {n.rows.length > 0 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: '14px' }}>
          <input
            type="search"
            placeholder="🔍 Buscar local por nombre, dueño o calle..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Lista Móvil en Tarjetas Táctiles (visible en teléfonos) */}
      <div className="mobile-negocios-list">
        {!negociosFiltrados.length ? (
          <p className="empty">No se encontraron negocios con ese filtro.</p>
        ) : (
          negociosFiltrados.map((x) => {
            const rv = revisionesPorNegocio.get(x.id) || []
            const maq = maquinasMap.get(x.maquina_id)
            const comisionHoy = pctDueno(mesNegocio(x.fecha_instalacion))
            const recaudoTotal = sum(rv, 'recaudo')
            const miNetaTotal = sum(rv, 'ganancia_neta')
            const savedCoords = (x.lat && x.lng) ? [Number(x.lat), Number(x.lng)] : getSavedCoords(x.id)

            return (
              <div key={x.id} className="mobile-business-card">
                <div className="business-card-top">
                  <div>
                    <h3 className="business-name">{x.negocio}</h3>
                    <div className="business-owner">👤 {x.dueno}</div>
                  </div>
                  <div>
                    {maq ? (
                      <span className="pill ok">Máq: {maq.codigo}</span>
                    ) : (
                      <span className="pill warn">Sin máquina</span>
                    )}
                  </div>
                </div>

                <div className="business-meta">
                  {x.direccion && (
                    <div className="business-meta-row">
                      <span>📍 {x.direccion}</span>
                    </div>
                  )}
                  {x.telefono && (
                    <div className="business-meta-row">
                      <a href={`tel:${x.telefono}`} className="tel-link">
                        📞 Llamar: {x.telefono}
                      </a>
                    </div>
                  )}
                  {/* Estado de ubicación GPS */}
                  <div className="business-meta-row location-row">
                    {savedCoords ? (
                      <span className="pill ok" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        📍 GPS marcado
                      </span>
                    ) : (
                      <span className="pill warn" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        ⚠️ Sin punto GPS
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => abrirMapaRapido(x)}
                    >
                      {savedCoords ? '🗺️ Ajustar en mapa' : '🗺️ Marcar en mapa'}
                    </button>
                  </div>

                  <div className="business-meta-row">
                    <span>Comisión dueño hoy: <b>{comisionHoy}%</b></span>
                    <span>• {rv.length} visitas</span>
                  </div>
                  <div className="business-meta-row" style={{ marginTop: '4px' }}>
                    <span>Recaudado: <b>{money(recaudoTotal)}</b></span>
                    <span>Mi neta: <b className="text-ok">{money(miNetaTotal)}</b></span>
                  </div>
                </div>

                {/* Acciones principales en móvil */}
                <div className="business-card-actions">
                  <Link to={`/negocios/${x.id}/revisiones`} className="btn btn-action-main">
                    💰 Registrar / Ver Revisiones
                  </Link>
                  <div className="business-sub-actions">
                    <button type="button" className="btn alt" onClick={() => abrirEdicion(x)}>
                      ✏️ Editar
                    </button>
                    <button type="button" className="btn del" onClick={() => removeNegocio(x)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Tabla tradicional para pantallas grandes de escritorio */}
      <div className="card desktop-table-card">
        {!negociosFiltrados.length ? (
          <p className="empty">Registra el primer negocio donde instalarás una máquina.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Dueño</th>
                <th>Teléfono</th>
                <th>Dirección & Mapa</th>
                <th>Máquina</th>
                <th className="n">% dueño</th>
                <th className="n">Rendimiento</th>
                <th className="n">Mi neta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {negociosFiltrados.map((x) => {
                const rv = revisionesPorNegocio.get(x.id) || []
                const maq = maquinasMap.get(x.maquina_id)
                const savedCoords = (x.lat && x.lng) ? [Number(x.lat), Number(x.lng)] : getSavedCoords(x.id)

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
                    <td>
                      <div>{x.direccion || '—'}</div>
                      <button
                        type="button"
                        className="btn-map-badge"
                        onClick={() => abrirMapaRapido(x)}
                        title="Hacer clic para marcar o ajustar la ubicación en el mapa"
                      >
                        {savedCoords ? '📍 GPS marcado (editar)' : '⚠️ Marcar en mapa'}
                      </button>
                    </td>
                    <td>
                      {maq ? (
                        <span className="pill ok">{maq.codigo}</span>
                      ) : (
                        <span className="pill warn">Sin máquina</span>
                      )}
                    </td>
                    <td className="n">{pctDueno(mesNegocio(x.fecha_instalacion))}%</td>
                    <td className="n">{money(sum(rv, 'recaudo'))}</td>
                    <td className="n text-ok">{money(sum(rv, 'ganancia_neta'))}</td>
                    <td className="acts">
                      <Link className="btn" to={`/negocios/${x.id}/revisiones`}>
                        Revisiones
                      </Link>
                      <button className="alt" onClick={() => abrirEdicion(x)}>
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
