import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../hooks/useTable'
import { Err, Page } from '../components'
import { hoy } from '../lib/calc'
import MapaPickerModal from '../MapaPickerModal'

const MI_CASA_DIRECCION = 'Avenida Pumacahua 1835, El Porvenir, Trujillo'
const MI_CASA_COORDS_DEF = [-8.0863, -79.0018] // Cuadra 18 de Pumacahua, El Porvenir

// Obtener coordenadas guardadas en localStorage o aproximadas por zona de Trujillo
const getSavedCoords = (id, fallback) => {
  try {
    const raw = localStorage.getItem('coords_' + id)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return fallback
}

// Distancia Haversine en km entre dos puntos [lat, lng]
const haversineKm = ([lat1, lng1], [lat2, lng2]) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Algoritmo Nearest Neighbor (vecino más cercano) para optimizar el orden de visitas.
// Parte desde 'inicio' y en cada paso elige la parada no visitada más cercana.
const nearestNeighborSort = (inicio, paradas) => {
  if (!paradas.length) return []
  const restantes = [...paradas]
  const ordenadas = []
  let posActual = inicio

  while (restantes.length) {
    let menorDist = Infinity
    let nearestIdx = 0
    restantes.forEach((p, i) => {
      const d = haversineKm(posActual, p.coords)
      if (d < menorDist) {
        menorDist = d
        nearestIdx = i
      }
    })
    const siguiente = restantes.splice(nearestIdx, 1)[0]
    ordenadas.push({ ...siguiente, distanciaDesdeAnterior: menorDist })
    posActual = siguiente.coords
  }
  return ordenadas
}

export default function Ruta() {
  const n = useTable('negocios'), m = useTable('maquinas'), r = useTable('revisiones')
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef(new Map())
  const [mensajeUbicacion, setMensajeUbicacion] = useState('')
  const [coordsCasa, setCoordsCasa] = useState(() => getSavedCoords('casa', MI_CASA_COORDS_DEF))

  // Estado para el modal de fijar ubicación
  const [modalAjuste, setModalAjuste] = useState({
    isOpen: false,
    negocioId: null,
    nombre: '',
    direccion: '',
    coords: null,
  })

  const maquinasMap = useMemo(() => new Map(m.rows.map((x) => [x.id, x])), [m.rows])

  const ultimaRevisionMap = useMemo(() => {
    const map = new Map()
    r.rows.forEach((rv) => {
      const prev = map.get(rv.negocio_id)
      if (!prev || rv.fecha.localeCompare(prev.fecha) > 0) {
        map.set(rv.negocio_id, rv)
      }
    })
    return map
  }, [r.rows])

  // Paradas con sus coordenadas reales o guardadas
  const paradas = useMemo(() => {
    const hoyDate = new Date(hoy())

    // 1. Enriquecer cada negocio con datos calculados
    const enriquecidas = n.rows.map((neg, idx) => {
      const maq = maquinasMap.get(neg.maquina_id)
      const ult = ultimaRevisionMap.get(neg.id)
      let dias = null
      let urgente = true

      if (ult?.fecha) {
        const diff = hoyDate - new Date(ult.fecha)
        dias = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
        urgente = dias >= 7
      }

      const fallback = [
        -8.0863 - (idx + 1) * 0.007,
        -79.0018 - (idx + 1) * 0.006,
      ]
      const hasCustomCoords = Boolean((neg.lat && neg.lng) || localStorage.getItem('coords_' + neg.id))
      const coords = getSavedCoords(neg.id, neg.lat && neg.lng ? [Number(neg.lat), Number(neg.lng)] : fallback)

      return {
        ...neg,
        maquina: maq,
        ultFecha: ult?.fecha,
        diasSinRevisar: dias,
        urgente,
        coords,
        hasCustomCoords,
      }
    })

    // 2. Ordenar por Nearest Neighbor (vecino más cercano) desde mi casa
    return nearestNeighborSort(coordsCasa, enriquecidas)
  }, [n.rows, maquinasMap, ultimaRevisionMap, coordsCasa])

  // Guardar nueva ubicación al arrastrar el pin o desde el modal
  const guardarCoordenadas = async (id, lat, lng, nombre) => {
    const coords = [Number(lat.toFixed(6)), Number(lng.toFixed(6))]
    localStorage.setItem('coords_' + id, JSON.stringify(coords))
    setMensajeUbicacion(`📍 Ubicación de "${nombre}" guardada con éxito.`)
    setTimeout(() => setMensajeUbicacion(''), 3500)

    // Intentar actualizar también en base de datos si la columna existe
    if (id !== 'casa') {
      try {
        await n.update(id, { lat: coords[0], lng: coords[1] })
      } catch (e) {}
    }
  }

  // Abrir modal picker desde la parada
  const abrirAjusteModal = (p) => {
    setModalAjuste({
      isOpen: true,
      negocioId: p.id,
      nombre: p.negocio,
      direccion: p.direccion || '',
      coords: p.coords,
    })
  }

  // Abrir modal picker para fijar el punto de partida (mi casa)
  const abrirModalCasa = () => {
    setModalAjuste({
      isOpen: true,
      negocioId: 'casa',
      nombre: '🏠 Mi Casa (Punto de partida)',
      direccion: 'Avenida Pumacahua 1835',
      coords: coordsCasa,
    })
  }

  const handleConfirmModal = async ({ lat, lng }) => {
    if (!modalAjuste.negocioId) return
    if (modalAjuste.negocioId === 'casa') {
      // Guardar casa y actualizar estado para re-calcular ruta
      const coords = [Number(lat.toFixed(6)), Number(lng.toFixed(6))]
      localStorage.setItem('coords_casa', JSON.stringify(coords))
      setCoordsCasa(coords)
      setMensajeUbicacion('🏠 Punto de partida actualizado con éxito.')
      setTimeout(() => setMensajeUbicacion(''), 3500)
    } else {
      await guardarCoordenadas(modalAjuste.negocioId, lat, lng, modalAjuste.nombre)
    }
  }

  // Enlace turn-by-turn para Google Maps
  const urlRutaGoogleMaps = useMemo(() => {
    if (!paradas.length) return null
    const origenStr = `${coordsCasa[0]},${coordsCasa[1]}`

    if (paradas.length === 1) {
      const destinoStr = `${paradas[0].coords[0]},${paradas[0].coords[1]}`
      return `https://www.google.com/maps/dir/?api=1&origin=${origenStr}&destination=${destinoStr}&travelmode=driving`
    }

    const destinoFinal = `${paradas[paradas.length - 1].coords[0]},${paradas[paradas.length - 1].coords[1]}`
    const waypoints = paradas.slice(0, paradas.length - 1).map((p) => `${p.coords[0]},${p.coords[1]}`).join('|')

    return `https://www.google.com/maps/dir/?api=1&origin=${origenStr}&destination=${destinoFinal}&waypoints=${encodeURIComponent(
      waypoints
    )}&travelmode=driving`
  }, [paradas, coordsCasa])

  // Inicializar Mapa Leaflet Interactivo
  useEffect(() => {
    if (!mapContainerRef.current || typeof window.L === 'undefined') return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const L = window.L

    const map = L.map(mapContainerRef.current, {
      center: coordsCasa,
      zoom: 14,
      zoomControl: true,
    })
    mapInstanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    const puntosRuta = [coordsCasa]

    // 1. Marcador Casa (punto de partida)
    const homeIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div class="map-home-pin" title="Punto de partida"><span>🏠</span></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })

    const markerCasa = L.marker(coordsCasa, {
      icon: homeIcon,
      draggable: true,
    }).addTo(map)

    markerCasa.bindPopup(`
      <div class="map-popup">
        <b>🏠 Mi Casa (Punto de Partida)</b><br/>
        ${MI_CASA_DIRECCION}<br/>
        <small style="color:#666;">Arrastra si deseas cambiar el punto exacto de partida.</small>
      </div>
    `)

    markerCasa.on('dragend', (e) => {
      const pos = e.target.getLatLng()
      setCoordsCasa([pos.lat, pos.lng])
      guardarCoordenadas('casa', pos.lat, pos.lng, 'Mi Casa')
    })

    // 2. Marcadores de Máquinas Chicleras
    markersRef.current.clear()

    paradas.forEach((p, idx) => {
      puntosRuta.push(p.coords)

      const chicleraIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="map-chiclera-pin ${p.urgente ? 'urgent-pin' : ''}">
            <span class="chiclera-icon">🍬</span>
            <span class="chiclera-badge">${idx + 1}</span>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      })

      const marker = L.marker(p.coords, {
        icon: chicleraIcon,
        draggable: true,
      }).addTo(map)

      marker.bindPopup(`
        <div class="map-popup">
          <b>Parada ${idx + 1}: ${p.negocio}</b><br/>
          <span>👤 ${p.dueno}</span><br/>
          <span>🎰 Máq: ${p.maquina ? p.maquina.codigo : 'Sin asignar'}</span><br/>
          <small style="color:#666;">📍 ${p.direccion || 'Sin dirección'}</small><br/>
          <span style="font-weight:600; color:${p.urgente ? '#e0245e' : '#0f9d58'};">
            ${p.diasSinRevisar === null ? '⚠️ Sin visitas previas' : `Última visita: hace ${p.diasSinRevisar} días`}
          </span><br/>
          <a href="https://www.google.com/maps/dir/?api=1&origin=${coordsCasa[0]},${coordsCasa[1]}&destination=${p.coords[0]},${p.coords[1]}&travelmode=driving" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:6px; font-weight:bold; color:#1a73e8;">
            🚗 Cómo llegar en Maps ↗
          </a>
        </div>
      `)

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng()
        guardarCoordenadas(p.id, pos.lat, pos.lng, p.negocio)
      })

      markersRef.current.set(p.id, marker)
    })

    // 3. Trazar la ruta real por calles usando OSRM (Open Source Routing Machine)
    //    OSRM es gratuito, sin API key, y devuelve la geometría exacta de calles.
    if (puntosRuta.length > 1) {
      // Fitbounds provisional mientras carga la ruta real
      const boundsProvisional = L.latLngBounds(puntosRuta)
      map.fitBounds(boundsProvisional, { padding: [50, 50] })

      // Coordenadas en formato lng,lat para OSRM (lon primero)
      const coordsOsrm = puntosRuta.map(([lat, lng]) => `${lng},${lat}`).join(';')

      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/${coordsOsrm}` +
        `?overview=full&geometries=geojson&steps=false`

      // Trazar la ruta real de calles
      fetch(osrmUrl)
        .then((r) => r.json())
        .then((data) => {
          if (!mapInstanceRef.current) return
          if (!data.routes || !data.routes[0]) {
            // Fallback: línea recta si OSRM no responde
            const fallback = L.polyline(puntosRuta, {
              color: '#e0245e',
              weight: 4,
              opacity: 0.75,
              dashArray: '8, 8',
            }).addTo(mapInstanceRef.current)
            mapInstanceRef.current.fitBounds(fallback.getBounds(), { padding: [50, 50] })
            return
          }
          // Coordenadas GeoJSON vienen en [lng, lat], convertir a [lat, lng] para Leaflet
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
          const rutaLine = L.polyline(coords, {
            color: '#e0245e',
            weight: 5,
            opacity: 0.9,
          }).addTo(mapInstanceRef.current)
          mapInstanceRef.current.fitBounds(rutaLine.getBounds(), { padding: [50, 50] })
        })
        .catch(() => {
          // Fallback silencioso: dibuja línea recta
          if (!mapInstanceRef.current) return
          L.polyline(puntosRuta, {
            color: '#e0245e',
            weight: 4,
            opacity: 0.7,
            dashArray: '8, 8',
          }).addTo(mapInstanceRef.current)
        })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [paradas, coordsCasa])

  return (
    <Page
      title="Ruta de Visitas"
      actions={
        urlRutaGoogleMaps ? (
          <a
            href={urlRutaGoogleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-maps-main"
            title="Abre la ruta multi-parada en Google Maps"
          >
            🗺️ Iniciar Ruta en Google Maps ({paradas.length} paradas)
          </a>
        ) : null
      }
    >
      <Err e={n.error || m.error || r.error} />

      {/* Modal interactivo de ajuste de ubicación */}
      <MapaPickerModal
        isOpen={modalAjuste.isOpen}
        onClose={() => setModalAjuste((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmModal}
        initialCoords={modalAjuste.coords}
        titulo={modalAjuste.nombre}
        direccionReferencia={modalAjuste.direccion}
      />

      {/* Notificación de guardado de pin */}
      {mensajeUbicacion && (
        <div className="pill ok" style={{ width: '100%', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', textAlign: 'center' }}>
          {mensajeUbicacion}
        </div>
      )}

      {/* MAPA INTERACTIVO CON PINS DE MÁQUINAS CHICLERAS */}
      <div className="card" style={{ padding: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <div>
            <b>🗺️ Mapa de Ruta: Trujillo y El Porvenir</b>
            <small className="sub-text" style={{ display: 'block' }}>
              💡 <b>Tip:</b> Puedes <b>arrastrar cualquier pin 🍬 directamente en el mapa</b> para moverlo a la tienda, o tocar "Ajustar en mapa" abajo.
            </small>
          </div>
          {urlRutaGoogleMaps && (
            <a href={urlRutaGoogleMaps} target="_blank" rel="noopener noreferrer" className="btn alt" style={{ fontSize: '12px', padding: '6px 12px' }}>
              Abrir en Google Maps ↗
            </a>
          )}
        </div>

        <div
          id="mapa-chiclera"
          ref={mapContainerRef}
          style={{ width: '100%', height: '400px', borderRadius: '12px', zIndex: 1 }}
        />
      </div>

      {/* LISTA SIMPLIFICADA DE PARADAS */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0 }}>Itinerario optimizado ({paradas.length} locales)</h3>
          <span className="pill info" style={{ fontSize: '11px' }}>📐 Ruta por distancia más corta</span>
        </div>

        {!paradas.length ? (
          <p className="empty">No tienes negocios registrados todavía. Agrégalos en Negocios y dueños.</p>
        ) : (
          <div className="timeline-container">
            {/* Parada 0: Salida Casa */}
            <div className="timeline-step start">
              <div className="step-badge">0</div>
              <div className="step-content">
                <div className="step-title">
                  <b>Salida: Mi Casa</b>
                  <span className="pill info">Punto de partida</span>
                </div>
                <div className="step-sub">
                  <span>📍 {MI_CASA_DIRECCION}</span>
                </div>
                <div className="step-actions" style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn alt"
                    onClick={abrirModalCasa}
                    title="Marcar exactamente dónde está tu casa en el mapa"
                  >
                    🏠 Cambiar mi punto de partida
                  </button>
                </div>
              </div>
            </div>

            {/* Paradas en locales */}
            {paradas.map((x, idx) => {
              const gmapsSingle = `https://www.google.com/maps/dir/?api=1&origin=${coordsCasa[0]},${coordsCasa[1]}&destination=${x.coords[0]},${x.coords[1]}&travelmode=driving`
              const distKm = x.distanciaDesdeAnterior
              const distLabel = distKm != null
                ? distKm < 1
                  ? `~${Math.round(distKm * 1000)} m`
                  : `~${distKm.toFixed(1)} km`
                : null
              return (
                <div key={x.id} className={`timeline-step ${x.urgente ? 'urgent' : ''}`}>
                  <div className="step-badge">{idx + 1}</div>
                  <div className="step-content">
                    <div className="step-title">
                      <b>{x.negocio}</b>
                      {x.maquina ? (
                        <span className="pill ok">Máq: {x.maquina.codigo}</span>
                      ) : (
                        <span className="pill warn">Sin máquina</span>
                      )}
                      {distLabel && (
                        <span className="pill info" style={{ fontSize: '10px' }}>📏 {distLabel} desde anterior</span>
                      )}
                      {x.hasCustomCoords ? (
                        <span className="pill ok" style={{ fontSize: '10px' }}>📍 GPS fijado</span>
                      ) : (
                        <span className="pill warn" style={{ fontSize: '10px' }}>⚠️ Ubicación estimada</span>
                      )}
                      {x.urgente ? (
                        <span className="pill warn">
                          {x.diasSinRevisar === null ? 'Sin revisión previa' : `Hace ${x.diasSinRevisar} días`}
                        </span>
                      ) : (
                        <span className="pill ok">Al día ({x.diasSinRevisar} d)</span>
                      )}
                    </div>

                    <div className="step-sub">
                      <span>📍 {x.direccion || 'Sin dirección registrada'}</span>
                      <span>👤 Dueño: {x.dueno}</span>
                      {x.telefono && (
                        <a href={`tel:${x.telefono}`} className="tel-link">
                          📞 {x.telefono}
                        </a>
                      )}
                    </div>

                    <div className="step-actions">
                      <a
                        href={gmapsSingle}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn alt"
                        title="Navegar con GPS hacia este punto exacto"
                      >
                        🚗 Cómo llegar (GPS)
                      </a>
                      <button
                        type="button"
                        className="btn alt"
                        onClick={() => abrirAjusteModal(x)}
                        title="Fijar o cambiar la ubicación exacta de esta tienda en el mapa"
                      >
                        📍 Ajustar punto en mapa
                      </button>
                      <Link to={`/negocios/${x.id}/revisiones`} className="btn">
                        💰 Registrar revisión
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Page>
  )
}
