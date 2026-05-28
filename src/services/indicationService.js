/**
 * Indication extraction service.
 *
 * Provides type metadata for rendering, a default visible-layers set,
 * and the fetch helper that calls the backend extract-indications endpoint.
 */

export const INDICATION_TYPES = {
  traffic_signal:  { label: 'Semáforos',              icon: 'S', color: '#ef4444' },
  stop_sign:       { label: 'Señales de Alto',         icon: 'A', color: '#dc2626' },
  speed_bump:      { label: 'Topes / Reductores',      icon: 'T', color: '#f97316' },
  level_crossing:  { label: 'Cruces Ferroviarios',     icon: 'F', color: '#8b5cf6' },
  fuel_station:    { label: 'Gasolineras',             icon: 'G', color: '#f59e0b' },
  rest_area:       { label: 'Áreas de Descanso',        icon: 'D', color: '#0ea5e9' },
  toll:            { label: 'Casetas de Cobro',        icon: 'C', color: '#ef4444' },
  construction:    { label: 'Zonas de Obra',           icon: 'O', color: '#f97316' },
  speed_limit:     { label: 'Límites de Velocidad',    icon: 'V', color: '#6b7280' },
  landmark:        { label: 'Referencias Viales',      icon: 'R', color: '#10b981' },
}

// Layer types shown by default when a route is first loaded
export const DEFAULT_VISIBLE_LAYERS = new Set([
  'traffic_signal',
  'stop_sign',
  'speed_bump',
  'level_crossing',
  'fuel_station',
  'rest_area',
  'toll',
  'construction',
])

/**
 * Call the backend to extract road indications for the given route.
 *
 * @param {Array<{lat:number, lon:number, elevation?:number}>} coordinates
 * @param {string} apiBase  Base URL, e.g. "https://eld-backend.vercel.app/api"
 * @param {string} [token]  Optional auth token
 * @returns {Promise<Array<{lat, lon, type, label, metadata?}>>}
 */
export async function fetchIndications(coordinates, apiBase, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Token ${token}`

  const response = await fetch(`${apiBase}/route-analysis/extract-indications/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ coordinates }),
  })

  if (!response.ok) {
    throw new Error(`Indication extraction failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.indications || []
}

/**
 * Count indications by type — used for layer-control badge display.
 * @param {Array} indications
 * @returns {Object<string, number>}
 */
export function countByType(indications) {
  return (indications || []).reduce((acc, ind) => {
    acc[ind.type] = (acc[ind.type] || 0) + 1
    return acc
  }, {})
}
