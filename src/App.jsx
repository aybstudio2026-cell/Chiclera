import { Suspense, lazy } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { usingSupabase } from './lib/db'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Maquinas = lazy(() => import('./pages/Maquinas'))
const Negocios = lazy(() => import('./pages/Negocios'))
const Revisiones = lazy(() => import('./pages/Revisiones'))
const Compras = lazy(() => import('./pages/Compras'))
const Proyeccion = lazy(() => import('./pages/Proyeccion'))
const Ruta = lazy(() => import('./pages/Ruta'))
const Contrato = lazy(() => import('./pages/Contrato'))

const nav = [
  ['/', 'Dashboard'],
  ['/maquinas', 'Máquinas'],
  ['/negocios', 'Negocios y dueños'],
  ['/compras', 'Compras'],
  ['/proyeccion', 'Proyección'],
  ['/ruta', 'Ruta de visitas'],
  ['/contrato', 'Contrato'],
]

export default function App() {
  return (
    <div className="shell">
      <aside>
        <h2>ChicleControl</h2>
        <nav>
          {nav.map(([to, t]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {t}
            </NavLink>
          ))}
        </nav>
        <p className="mode">
          {usingSupabase ? '🟢 Conectado a Supabase' : '🟡 Modo local: datos solo en este navegador'}
        </p>
      </aside>
      <main>
        <Suspense fallback={<div className="loading-state">Cargando vista...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/maquinas" element={<Maquinas />} />
            <Route path="/negocios" element={<Negocios />} />
            <Route path="/negocios/:id/revisiones" element={<Revisiones />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/proyeccion" element={<Proyeccion />} />
            <Route path="/ruta" element={<Ruta />} />
            <Route path="/contrato" element={<Contrato />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
