export const CHICLES_BOLSA = 500
export const COSTO_BOLSA = 90
export const COSTO_MAQUINA = 310
export const PRECIO_CHICLE = 1
export const SEMANAS_MES = 4.33
export const COSTO_UNITARIO_CHICLE = COSTO_BOLSA / CHICLES_BOLSA // S/ 0.18 por chicle

export const money = (n) => 'S/ ' + (Number(n) || 0).toFixed(2)
export const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)

// Fecha actual exacta en hora local de Lima, Perú (America/Lima UTC-5)
export const hoy = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch (e) {
    const d = new Date(date)
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().slice(0, 10)
  }
}

// Mes del negocio (1, 2, 3...) contado desde la instalación, en bloques de 30 días
export const mesNegocio = (instalacion, fecha = hoy()) =>
  Math.max(1, Math.floor((new Date(fecha) - new Date(instalacion)) / 864e5 / 30) + 1)

// 1er mes 10%, 2do 15%, 3ro en adelante 20%
export const pctDueno = (mes) => (mes <= 1 ? 10 : mes === 2 ? 15 : 20)

export function calcRevision(negocio, fecha, recaudo, inversion) {
  const mes = mesNegocio(negocio.fecha_instalacion, fecha)
  const porcentaje_dueno = pctDueno(mes)
  const ganancia = recaudo - inversion
  const parte_dueno = Math.max(0, ganancia) * porcentaje_dueno / 100
  return { mes, porcentaje_dueno, ganancia, parte_dueno, ganancia_neta: ganancia - parte_dueno }
}
