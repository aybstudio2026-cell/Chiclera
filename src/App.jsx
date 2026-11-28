import { Suspense, lazy, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { usingSupabase } from './lib/db'
import { useTable } from './hooks/useTable'
import { hoy } from './lib/calc'
import logoChiclera from './assets/chiclera.svg'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Maquinas = lazy(() => import('./pages/Maquinas'))
const Negocios = lazy(() => import('./pages/Negocios'))
const Revisiones = lazy(() => import('./pages/Revisiones'))
const Compras = lazy(() => import('./pages/Compras'))
const Inventario = lazy(() => import('./pages/Inventario'))
const Liquidaciones = lazy(() => import('./pages/Liquidaciones'))
const Mantenimiento = lazy(() => import('./pages/Mantenimiento'))
const Proyeccion = lazy(() => import('./pages/Proyeccion'))
const Ruta = lazy(() => import('./pages/Ruta'))
const Contrato = lazy(() => import('./pages/Contrato'))
const Ideas = lazy(() => import('./pages/Ideas'))

// Menú móvil rápido
const navMobile = [
  { to: '/ruta', label: 'Ruta', icon: '🗺️' },
  { to: '/negocios', label: 'Locales', icon: '🏪' },
  { to: '/', label: 'Inicio', icon: '📊' },
  { to: '/inventario', label: 'Stock', icon: '📦' },
]

export default function App() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const location = useLocation()

  // Datos para badge de alertas de máquinas pendientes (#3)
  const n = useTable('negocios')
  const r = useTable('revisiones')

  const pendientesCount = useMemo(() => {
    const hoyDate = new Date(hoy())
    const ultimaRevPorNeg = new Map()
    r.rows.forEach((rv) => {
      const prev = ultimaRevPorNeg.get(rv.negocio_id)
      if (!prev || rv.fecha.localeCompare(prev) > 0) ultimaRevPorNeg.set(rv.negocio_id, rv.fecha)
    })
    return n.rows.filter((neg) => {
      const ult = ultimaRevPorNeg.get(neg.id)
      if (!ult) return true // nunca revisado
      const dias = Math.floor((hoyDate - new Date(ult)) / (1000 * 60 * 60 * 24))
      return dias >= 7
    }).length
  }, [n.rows, r.rows])

  return (
    <div className="shell">
      {/* Barra superior solo visible en celulares */}
      <header className="mobile-top-bar">
        <div className="mobile-brand">
          <img src={logoChiclera} alt="ChicleControl" className="app-logo-icon" />
          <b>ChicleControl</b>
        </div>
        <div className="mobile-status">
          <span className="pill info" style={{ fontSize: '11px', padding: '2px 8px' }}>
            {usingSupabase ? '🟢 En línea' : '🟡 Local'}
          </span>
        </div>
      </header>

      {/* Menú lateral estructurado por secciones para escritorio */}
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <img src={logoChiclera} alt="ChicleControl" className="app-logo-icon desktop" />
          <h2>ChicleControl</h2>
        </div>

        <div className="nav-group">
          <div className="nav-section-title">VENTAS Y RUTA</div>
          <nav>
            <NavLink to="/" end>📊 Dashboard</NavLink>
            <NavLink to="/ruta" style={{ position: 'relative' }}>
              🗺️ Ruta de visitas
              {pendientesCount > 0 && (
                <span className="nav-badge">{pendientesCount}</span>
              )}
            </NavLink>
            <NavLink to="/negocios">🏪 Negocios y dueños</NavLink>
            <NavLink to="/liquidaciones">🧾 Liquidaciones a dueños</NavLink>
            <NavLink to="/contrato">📄 Contratos</NavLink>
          </nav>
        </div>

        <div className="nav-group">
          <div className="nav-section-title">GASTOS E INVENTARIO</div>
          <nav>
            <NavLink to="/compras">💸 Registro de gastos</NavLink>
            <NavLink to="/inventario">📦 Stock de chicles</NavLink>
            <NavLink to="/maquinas">🎰 Máquinas</NavLink>
            <NavLink to="/mantenimiento">🔧 Mantenimiento</NavLink>
            <NavLink to="/proyeccion">📈 Proyección financiera</NavLink>
            <NavLink to="/ideas">💡 Ideas de negocio</NavLink>
          </nav>
        </div>

        <p className="mode">
          {usingSupabase ? '🟢 Conectado a Supabase' : '🟡 Modo local: datos en navegador'}
        </p>
      </aside>

      {/* Contenido principal */}
      <main>
        <Suspense fallback={<div className="loading-state">Cargando...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/maquinas" element={<Maquinas />} />
            <Route path="/negocios" element={<Negocios />} />
            <Route path="/negocios/:id/revisiones" element={<Revisiones />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/liquidaciones" element={<Liquidaciones />} />
            <Route path="/mantenimiento" element={<Mantenimiento />} />
            <Route path="/proyeccion" element={<Proyeccion />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/ruta" element={<Ruta />} />
            <Route path="/contrato" element={<Contrato />} />
          </Routes>
        </Suspense>
      </main>

      {/* Barra de Navegación Inferior Horizontal para Móviles */}
      <div className="mobile-bottom-nav">
        {navMobile.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setMenuAbierto(false)}
          >
            <span className="bottom-nav-icon">
              {item.icon}
              {item.to === '/ruta' && pendientesCount > 0 && (
                <span className="nav-badge-mobile">{pendientesCount}</span>
              )}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          className={`bottom-nav-item ${menuAbierto ? 'active' : ''}`}
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          <span className="bottom-nav-icon">☰</span>
          <span className="bottom-nav-label">Más</span>
        </button>
      </div>

      {/* Modal / Menú Desplegable 'Más' para móvil estructurado */}
      {menuAbierto && (
        <div className="mobile-drawer-overlay" onClick={() => setMenuAbierto(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <b>Menú del Sistema</b>
              <button type="button" className="drawer-close" onClick={() => setMenuAbierto(false)}>
                ✕
              </button>
            </div>

            <div className="drawer-section-title">VENTAS Y GESTIÓN</div>
            <div className="drawer-links">
              <NavLink to="/liquidaciones" onClick={() => setMenuAbierto(false)}>
                🧾 Liquidaciones a Dueños
              </NavLink>
              <NavLink to="/contrato" onClick={() => setMenuAbierto(false)}>
                📄 Contratos de Instalación
              </NavLink>
            </div>

            <div className="drawer-section-title" style={{ marginTop: '14px' }}>GASTOS Y CONTROL</div>
            <div className="drawer-links">
              <NavLink to="/compras" onClick={() => setMenuAbierto(false)}>
                💸 Registro de Gastos
              </NavLink>
              <NavLink to="/maquinas" onClick={() => setMenuAbierto(false)}>
                🎰 Catálogo de Máquinas
              </NavLink>
              <NavLink to="/mantenimiento" onClick={() => setMenuAbierto(false)}>
                🔧 Mantenimiento Técnico
              </NavLink>
              <NavLink to="/proyeccion" onClick={() => setMenuAbierto(false)}>
                📈 Proyección de Crecimiento
              </NavLink>
              <NavLink to="/ideas" onClick={() => setMenuAbierto(false)}>
                💡 Ideas de Negocio
              </NavLink>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
