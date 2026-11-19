import { NavLink, Route, Routes } from 'react-router-dom'
import { usingSupabase } from './lib/db'
import Dashboard from './pages/Dashboard'
import Maquinas from './pages/Maquinas'
import Negocios from './pages/Negocios'
import Revisiones from './pages/Revisiones'
import Compras from './pages/Compras'
import Proyeccion from './pages/Proyeccion'
import Ruta from './pages/Ruta'
import Contrato from './pages/Contrato'

const nav = [['/', 'Dashboard'], ['/maquinas', 'Máquinas'], ['/negocios', 'Negocios y dueños'],
  ['/compras', 'Compras'], ['/proyeccion', 'Proyección'], ['/ruta', 'Ruta'], ['/contrato', 'Contrato']]

export default function App() {
  return (
    <div className="shell">
      <aside>
        <h2>ChicleControl</h2>
        <nav>{nav.map(([to, t]) => <NavLink key={to} to={to} end={to === '/'}>{t}</NavLink>)}</nav>
        <p className="mode">{usingSupabase ? 'Conectado a Supabase' : 'Modo prueba: datos solo en este navegador'}</p>
      </aside>
      <main>
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
      </main>
    </div>
  )
}
