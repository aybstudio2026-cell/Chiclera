import { useEffect, useRef, useState } from 'react'

const TRUJILLO_DEF = [-8.0863, -79.0018] // Pumacahua / El Porvenir / Trujillo

export default function MapaPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialCoords,
  titulo = 'Ubicación del Negocio',
  direccionReferencia = '',
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const [coords, setCoords] = useState(() => (initialCoords && initialCoords[0] ? initialCoords : TRUJILLO_DEF))
  const [busqueda, setBusqueda] = useState(direccionReferencia || '')
  const [buscando, setBuscando] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [leafletReady, setLeafletReady] = useState(() => typeof window !== 'undefined' && typeof window.L !== 'undefined')

  // Verificar que el script de Leaflet esté disponible
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof window.L !== 'undefined') {
      setLeafletReady(true)
      return
    }

    const interval = setInterval(() => {
      if (typeof window.L !== 'undefined') {
        setLeafletReady(true)
        clearInterval(interval)
      }
    }, 150)

    return () => clearInterval(interval)
  }, [])

  // Sincronizar coordenadas cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const start = initialCoords && initialCoords[0] && initialCoords[1] ? initialCoords : TRUJILLO_DEF
      setCoords(start)
      setBusqueda(direccionReferencia || '')
    }
  }, [isOpen, initialCoords, direccionReferencia])

  // Inicializar Leaflet cuando el modal se abre y Leaflet está listo
  useEffect(() => {
    if (!isOpen || !leafletReady || !mapContainerRef.current) return

    const L = window.L
    const container = mapContainerRef.current

    // Limpiar instancia previa si existe
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove()
      } catch (e) {}
      mapInstanceRef.current = null
    }

    // Limpiar id interno de Leaflet para prevenir errores de 'already initialized'
    if (container._leaflet_id) {
      delete container._leaflet_id
    }

    const startCenter = coords && coords[0] ? coords : TRUJILLO_DEF

    try {
      const map = L.map(container, {
        center: startCenter,
        zoom: 16,
        zoomControl: true,
      })
      mapInstanceRef.current = map

      // Capa de tiles OpenStreetMap con fallback estándar
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      // Icono dulce chiclera
      const chicleIcon = L.divIcon({
        className: 'custom-picker-pin',
        html: `
          <div class="picker-pin-wrapper">
            <div class="picker-pin-bubble">🍬</div>
            <div class="picker-pin-arrow"></div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
      })

      // Marcador draggable
      const marker = L.marker(startCenter, {
        icon: chicleIcon,
        draggable: true,
      }).addTo(map)
      markerRef.current = marker

      // Al arrastrar el pin
      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng()
        const newCoords = [Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6))]
        setCoords(newCoords)
      })

      // Al hacer clic o tocar en cualquier lugar del mapa
      map.on('click', (e) => {
        const newCoords = [Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]
        marker.setLatLng(newCoords)
        setCoords(newCoords)
      })

      // Redibujar tamaño por si el modal tardó en terminar su animación CSS
      const resizeMap = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }

      resizeMap()
      const t1 = setTimeout(resizeMap, 80)
      const t2 = setTimeout(resizeMap, 250)
      const t3 = setTimeout(resizeMap, 500)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove()
          } catch (e) {}
          mapInstanceRef.current = null
        }
        if (container && container._leaflet_id) {
          delete container._leaflet_id
        }
      }
    } catch (err) {
      console.error('Error al inicializar mapa en modal:', err)
    }
  }, [isOpen, leafletReady])

  // Buscar dirección por texto
  const handleBuscar = async (e) => {
    e?.preventDefault()
    if (!busqueda.trim()) return
    setBuscando(true)
    try {
      const q = encodeURIComponent(`${busqueda.trim()}, Trujillo, Peru`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`)
      const data = await res.json()
      if (data && data.length > 0) {
        const lat = Number(parseFloat(data[0].lat).toFixed(6))
        const lng = Number(parseFloat(data[0].lon).toFixed(6))
        setCoords([lat, lng])
        if (markerRef.current) markerRef.current.setLatLng([lat, lng])
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17)
          mapInstanceRef.current.invalidateSize()
        }
      } else {
        alert(`No se encontró "${busqueda}". Toca directamente en el mapa para ubicar la tienda.`)
      }
    } catch (err) {
      alert('Error en búsqueda. Puedes tocar directamente en el mapa para marcar el punto.')
    } finally {
      setBuscando(false)
    }
  }

  // Obtener GPS del teléfono/navegador
  const handleUsarGps = () => {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalización GPS.')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        setCoords([lat, lng])
        if (markerRef.current) markerRef.current.setLatLng([lat, lng])
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17)
          mapInstanceRef.current.invalidateSize()
        }
        setGpsLoading(false)
      },
      (err) => {
        alert('No se pudo obtener la ubicación GPS actual. Activa el GPS de tu celular y concede permisos.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  if (!isOpen) return null

  return (
    <div className="map-modal-backdrop" onClick={onClose}>
      <div className="map-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="map-modal-header">
          <div>
            <h3 className="map-modal-title">📍 Marcar ubicación en el mapa</h3>
            <p className="map-modal-subtitle">{titulo}</p>
          </div>
          <button type="button" className="map-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Barra de herramientas / buscador / GPS */}
        <div className="map-modal-tools">
          <form className="map-modal-search" onSubmit={handleBuscar}>
            <input
              type="text"
              placeholder="Ej. Delfín Corcuera 267..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <button type="submit" disabled={buscando}>
              {buscando ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </form>
          <button
            type="button"
            className="btn btn-gps"
            onClick={handleUsarGps}
            disabled={gpsLoading}
            title="Usar mi ubicación GPS actual"
          >
            {gpsLoading ? '📡 Leyendo...' : '📱 Mi GPS actual'}
          </button>
        </div>

        {/* Instrucción visual */}
        <div className="map-modal-instruction">
          👉 <b>Toca o haz clic en el mapa</b> exactamente donde está el negocio o arrastra el pin 🍬.
        </div>

        {/* Contenedor del Mapa con altura explícita garantizada */}
        <div className="map-modal-canvas-wrapper" style={{ minHeight: '360px', height: '360px', position: 'relative' }}>
          <div
            id="mapa-modal-canvas"
            ref={mapContainerRef}
            style={{ width: '100%', height: '360px', minHeight: '360px', zIndex: 1 }}
          />
          {!leafletReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8fa', color: '#666', zIndex: 10 }}>
              <span>⏳ Conectando mapa...</span>
            </div>
          )}
        </div>

        {/* Coordenadas actuales y confirmación */}
        <div className="map-modal-footer">
          <div className="map-modal-coords">
            <span>Coordenadas fijadas:</span>
            <code>
              {coords && coords[0] ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : 'Sin fijar'}
            </code>
          </div>
          <div className="map-modal-acts">
            <button type="button" className="btn alt" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-confirm-loc"
              onClick={() => {
                if (coords && coords[0]) {
                  onConfirm({ lat: coords[0], lng: coords[1] })
                }
                onClose()
              }}
            >
              ✅ Confirmar esta ubicación
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
