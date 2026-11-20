import { useState } from 'react'
import { Page } from '../components'
import { useTable } from '../hooks/useTable'
import { hoy } from '../lib/calc'

export default function Contrato() {
  const n = useTable('negocios'), m = useTable('maquinas')
  const [d, setD] = useState({
    operador: 'Abraham',
    dniOp: '',
    dueno: '',
    dniDu: '',
    negocio: '',
    direccion: '',
    codigo: '',
    ciudad: 'Trujillo',
    fecha: hoy(),
  })

  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })
  const v = (k, ph) => d[k] || `[${ph}]`

  const onSelectNegocio = (e) => {
    const negId = e.target.value
    if (!negId) return
    const neg = n.rows.find((x) => x.id === negId)
    if (!neg) return
    const maq = m.rows.find((x) => x.id === neg.maquina_id)

    setD((prev) => ({
      ...prev,
      negocio: neg.negocio || '',
      dueno: neg.dueno || '',
      direccion: neg.direccion || '',
      codigo: maq?.codigo || prev.codigo,
      fecha: neg.fecha_instalacion || prev.fecha,
    }))
  }

  const etiquetas = {
    operador: 'Operador',
    dniOp: 'DNI operador',
    dueno: 'Dueño del negocio',
    dniDu: 'DNI dueño',
    negocio: 'Negocio',
    direccion: 'Dirección',
    codigo: 'Código de máquina',
    ciudad: 'Ciudad',
  }

  return (
    <Page
      title="Contrato"
      actions={
        <button className="noprint" onClick={() => window.print()}>
          🖨️ Imprimir o guardar PDF
        </button>
      }
    >
      <div className="card noprint">
        {n.rows.length > 0 && (
          <div className="autocomplete-row">
            <label>
              <b>⚡ Cargar datos desde negocio existente:</b>
              <select onChange={onSelectNegocio} defaultValue="">
                <option value="">Selecciona un negocio para autocompletar...</option>
                {n.rows.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.negocio} — {x.dueno}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <form className="f" onSubmit={(e) => e.preventDefault()}>
          {Object.entries(etiquetas).map(([k, l]) => (
            <label key={k}>
              {l}
              <input value={d[k]} onChange={set(k)} />
            </label>
          ))}
          <label>
            Fecha de firma
            <input type="date" value={d.fecha} onChange={set('fecha')} />
          </label>
        </form>
      </div>

      <article className="contrato">
        <h2>Contrato de instalación y reparto de ganancias de máquina chiclera</h2>
        <p>
          En {d.ciudad}, el {d.fecha}, entre <b>{v('operador', 'operador')}</b> (DNI {v('dniOp', 'DNI')}), en
          adelante EL OPERADOR, y <b>{v('dueno', 'dueño')}</b> (DNI {v('dniDu', 'DNI')}), dueño del negocio{' '}
          <b>{v('negocio', 'negocio')}</b>, ubicado en {v('direccion', 'dirección')}, en adelante EL DUEÑO,
          acuerdan:
        </p>
        <h3>1. Objeto</h3>
        <p>
          EL OPERADOR instalará en el local de EL DUEÑO la máquina chiclera de código <b>{v('codigo', 'código')}</b>,
          que sigue siendo propiedad exclusiva de EL OPERADOR.
        </p>
        <h3>2. Operación</h3>
        <p>
          EL OPERADOR provee la máquina y los chicles, los repone y retira el dinero recaudado. EL DUEÑO ofrece el
          espacio, cuida que la máquina no sea movida ni dañada y avisa de cualquier falla.
        </p>
        <h3>3. Revisiones</h3>
        <p>
          EL OPERADOR visitará el local una vez por semana, registrará lo recaudado y el costo de los chicles
          repuestos, y mostrará el cálculo a EL DUEÑO.
        </p>
        <h3>4. Reparto de ganancias</h3>
        <p>
          La ganancia neta es lo recaudado menos el costo de los chicles repuestos. EL DUEÑO recibe sobre esa
          ganancia neta: <b>10%</b> el primer mes, <b>15%</b> el segundo mes y <b>20%</b> desde el tercer mes en
          adelante. Los meses se cuentan desde la fecha de instalación. El pago se realiza en efectivo o por
          transferencia en cada revisión o en la fecha que ambos acuerden.
        </p>
        <h3>5. Duración y retiro</h3>
        <p>
          El contrato es de duración indefinida. Cualquiera de las partes puede darlo por terminado avisando con 7
          días de anticipación; EL OPERADOR retirará la máquina y liquidará lo pendiente.
        </p>
        <h3>6. Responsabilidades</h3>
        <p>
          EL DUEÑO responde por pérdida o daño causado por mal uso o descuido en su local. EL OPERADOR se encarga del
          mantenimiento normal de la máquina.
        </p>
        <div className="firmas">
          <div>
            {v('operador', 'operador')}
            <br />
            EL OPERADOR
          </div>
          <div>
            {v('dueno', 'dueño')}
            <br />
            EL DUEÑO
          </div>
        </div>
      </article>
      <p className="empty noprint">Modelo referencial. Conviene que un abogado lo revise antes de usarlo.</p>
    </Page>
  )
}
