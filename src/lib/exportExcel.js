/**
 * Utilidad para exportar datos a Excel (.csv con BOM UTF-8)
 * Abre directamente en Microsoft Excel, Google Sheets, LibreOffice, etc.
 * con soporte completo para tildes, ñ, soles (S/) y caracteres especiales.
 */

export function exportToExcel({ filename, headers, rows }) {
  if (!rows || !rows.length) {
    alert('No hay datos para exportar.')
    return
  }

  // Escapar celdas para CSV compatible con Excel
  const formatCell = (val) => {
    if (val === null || val === undefined) return '""'
    let str = String(val).trim()
    // Si contiene comillas, saltos de línea o comas, encerrar entre comillas dobles
    if (str.includes('"') || str.includes('\n') || str.includes(',') || str.includes(';')) {
      str = `"${str.replace(/"/g, '""')}"`
    } else {
      str = `"${str}"`
    }
    return str
  }

  // Cabeceras y filas separadas por coma
  const headerRow = headers.map((h) => formatCell(h.label || h.key || h)).join(';')
  const dataRows = rows.map((row) => {
    return headers
      .map((h) => {
        const key = typeof h === 'object' ? h.key : h
        const val = typeof h.transform === 'function' ? h.transform(row[key], row) : row[key]
        return formatCell(val)
      })
      .join(';')
  })

  // BOM UTF-8 (\uFEFF) para que Excel reconozca tildes y caracteres en español
  // Usamos ';' como separador estándar en Excel en español / Latinoamérica
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  const cleanName = (filename || 'exportacion').replace(/[^a-zA-Z0-9_\-]/g, '_')
  const dateStr = new Date().toISOString().slice(0, 10)
  link.setAttribute('download', `${cleanName}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
