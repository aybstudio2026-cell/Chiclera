import { useState } from 'react'

export default function EtiquetasModal({ maquinas = [], negocios = [], onClose, maquinaInicial = null }) {
  const [maquinaSeleccionada, setMaquinaSeleccionada] = useState(maquinaInicial ? maquinaInicial.id : 'todas')
  const [telefonoContacto, setTelefonoContacto] = useState('987654321')
  const [tipoQR, setTipoQR] = useState('soporte') // 'soporte' (clientes/dueño) o 'operador' (gestión interna)

  const negociosPorMaquina = new Map(negocios.map((n) => [n.maquina_id, n]))

  // Filtrar máquinas a imprimir
  const listaMaquinas = maquinaSeleccionada === 'todas'
    ? maquinas
    : maquinas.filter((m) => m.id === maquinaSeleccionada)

  // Obtener contenido del QR
  const getQRData = (m, neg) => {
    if (tipoQR === 'soporte') {
      const telClean = telefonoContacto.replace(/[^0-9]/g, '')
      const waNumber = telClean.length === 9 ? `51${telClean}` : telClean
      const msg = `Hola, me comunico sobre la máquina ${m.codigo}${neg ? ` en ${neg.negocio}` : ''}. `
      return `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`
    } else {
      // QR para el operador: abrir web de control
      return `${window.location.origin}/#/revisiones?codigo=${m.codigo}`
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="etiquetas-modal-backdrop">
      <div className="etiquetas-modal-container">
        {/* Barra superior de control (se oculta al imprimir) */}
        <div className="etiquetas-control-bar noprint">
          <div className="etiquetas-control-left">
            <h3>🏷️ Generador de Etiquetas Adhesivas para Máquinas</h3>
            <p className="sub-text">Imprime stickers con código QR para pegar en tus chicleras y peloteras.</p>
          </div>

          <div className="etiquetas-control-actions">
            <button type="button" className="btn" onClick={handlePrint} style={{ background: '#059669', color: '#fff' }}>
              🖨️ Imprimir Etiquetas ({listaMaquinas.length})
            </button>
            <button type="button" className="btn alt" onClick={onClose}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Opciones de configuración (se oculta al imprimir) */}
        <div className="etiquetas-config-panel noprint">
          <div className="etiquetas-config-grid">
            <label>
              <b>Filtrar máquinas:</b>
              <select
                value={maquinaSeleccionada}
                onChange={(e) => setMaquinaSeleccionada(e.target.value)}
              >
                <option value="todas">Imprimir todas ({maquinas.length} máquinas)</option>
                {maquinas.map((m) => {
                  const neg = negociosPorMaquina.get(m.id)
                  return (
                    <option key={m.id} value={m.id}>
                      {m.codigo} {neg ? `— ${neg.negocio}` : '(Disponible)'}
                    </option>
                  )
                })}
              </select>
            </label>

            <label>
              <b>Teléfono de soporte en la etiqueta:</b>
              <input
                type="text"
                value={telefonoContacto}
                placeholder="Ej. 987654321"
                onChange={(e) => setTelefonoContacto(e.target.value)}
              />
            </label>

            <label>
              <b>Función del Código QR:</b>
              <select value={tipoQR} onChange={(e) => setTipoQR(e.target.value)}>
                <option value="soporte">📞 Soporte WhatsApp (para clientes si se traba una moneda)</option>
                <option value="operador">🔧 Operador (acceso directo a revisión y recarga)</option>
              </select>
            </label>
          </div>
        </div>

        {/* Hoja de impresión con las etiquetas */}
        <div className="etiquetas-sheet-wrapper">
          <div className="etiquetas-print-grid">
            {listaMaquinas.map((m) => {
              const neg = negociosPorMaquina.get(m.id)
              const qrUrl = getQRData(m, neg)
              const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}&margin=4`

              return (
                <div key={m.id} className="etiqueta-sticker">
                  <div className="etiqueta-top-banner">
                    <span className="etiqueta-brand-icon">🍬</span>
                    <div>
                      <div className="etiqueta-brand-name">CHICLECONTROL</div>
                      <div className="etiqueta-brand-sub">MÁQUINA EXPENDEDORA AUTORIZADA</div>
                    </div>
                  </div>

                  <div className="etiqueta-main-content">
                    <div className="etiqueta-code-section">
                      <div className="etiqueta-code-label">CÓDIGO DE SERIE</div>
                      <div className="etiqueta-code-number">{m.codigo}</div>
                      <div className="etiqueta-local-assigned">
                        {neg ? (
                          <>
                            <span className="etiqueta-dot">●</span> <b>{neg.negocio}</b>
                          </>
                        ) : (
                          <span className="sub-text">Unidad de Flota</span>
                        )}
                      </div>
                      <div className="etiqueta-notice">
                        ⚠️ Propiedad exclusiva y patentada. Prohibida su manipulación o traslado no autorizado.
                      </div>
                    </div>

                    <div className="etiqueta-qr-section">
                      <div className="etiqueta-qr-box">
                        <img
                          src={qrImageSrc}
                          alt={`QR ${m.codigo}`}
                          className="etiqueta-qr-img"
                          loading="lazy"
                        />
                      </div>
                      <div className="etiqueta-qr-hint">
                        {tipoQR === 'soporte' ? 'Escanea si se trabó una moneda' : 'Escanea para recarga / auditoría'}
                      </div>
                    </div>
                  </div>

                  <div className="etiqueta-footer">
                    <span>📞 WhatsApp Soporte: <b>{telefonoContacto || '987654321'}</b></span>
                    <span>📍 Trujillo, Perú</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
