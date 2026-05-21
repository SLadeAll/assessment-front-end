import { useState } from 'react'
import axios from 'axios'

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'https://eld-backend-one.vercel.app'}/api`

// Sample route: Nuevo Laredo → Monterrey → Saltillo → Matehuala →
//               San Luis Potosí → Querétaro → Lagos de Moreno → Guadalajara
// Covers ~1 280 km of Federal Highways 85 / 40 / 57 / 80 with varied terrain:
// northern plains, Sierra Madre Oriental ascent, high plateau, and Los Altos de Jalisco.
const SAMPLE_DATA = {
  coordinates: [
    // ── Nuevo Laredo — planicie norteña ──────────────────────
    { lat: 27.476, lon: -99.515, elevation: 218 },
    { lat: 27.280, lon: -99.516, elevation: 226 },
    { lat: 27.100, lon: -99.530, elevation: 240 },
    { lat: 26.870, lon: -99.685, elevation: 292 },
    // ── Corredor Nuevo León — Paso Mamulique ─────────────────
    { lat: 26.500, lon: -100.192, elevation: 352 },
    { lat: 26.300, lon: -100.245, elevation: 515 },
    { lat: 26.150, lon: -100.260, elevation: 725 },
    { lat: 25.960, lon: -100.270, elevation: 598 },
    // ── Monterrey ────────────────────────────────────────────
    { lat: 25.686, lon: -100.316, elevation: 537 },
    // ── Sierra Madre Oriental — ascenso Mty–Saltillo ─────────
    { lat: 25.620, lon: -100.430, elevation: 700 },
    { lat: 25.570, lon: -100.520, elevation: 955 },
    { lat: 25.560, lon: -100.640, elevation: 1205 },
    { lat: 25.530, lon: -100.740, elevation: 1385 },
    { lat: 25.500, lon: -100.870, elevation: 1525 },
    // ── Saltillo ─────────────────────────────────────────────
    { lat: 25.428, lon: -101.003, elevation: 1592 },
    // ── Altiplano — Saltillo → Matehuala ─────────────────────
    { lat: 25.000, lon: -101.100, elevation: 1652 },
    { lat: 24.500, lon: -100.980, elevation: 1822 },
    { lat: 23.660, lon: -100.638, elevation: 1685 },
    // ── San Luis Potosí ──────────────────────────────────────
    { lat: 23.000, lon: -100.720, elevation: 1812 },
    { lat: 22.600, lon: -100.900, elevation: 1860 },
    { lat: 22.149, lon: -100.979, elevation: 1877 },
    // ── Bajío — descenso gradual hacia Querétaro ─────────────
    { lat: 21.700, lon: -100.755, elevation: 1853 },
    { lat: 21.200, lon: -100.558, elevation: 1839 },
    // ── Querétaro ────────────────────────────────────────────
    { lat: 20.593, lon: -100.389, elevation: 1820 },
    // ── Querétaro → Lagos de Moreno ──────────────────────────
    { lat: 20.750, lon: -100.900, elevation: 1786 },
    { lat: 21.000, lon: -101.400, elevation: 1737 },
    { lat: 21.358, lon: -101.933, elevation: 1562 },
    // ── Los Altos de Jalisco → Guadalajara ───────────────────
    { lat: 21.100, lon: -102.300, elevation: 1692 },
    { lat: 20.818, lon: -102.745, elevation: 1757 },
    { lat: 20.720, lon: -103.000, elevation: 1628 },
    { lat: 20.680, lon: -103.200, elevation: 1587 },
    // ── Guadalajara ──────────────────────────────────────────
    { lat: 20.659, lon: -103.350, elevation: 1545 },
  ],
  references: [
    // ── Casetas de cobro ──────────────────────────────────────
    { lat: 27.160, lon: -99.520,  type: 'caseta', name: 'Caseta Colombia Solidaridad' },
    { lat: 26.490, lon: -100.200, type: 'caseta', name: 'Caseta Sabinas Hidalgo' },
    { lat: 25.700, lon: -100.370, type: 'caseta', name: 'Caseta Monterrey Norte' },
    { lat: 25.490, lon: -100.870, type: 'caseta', name: 'Caseta Saltillo Oriente' },
    { lat: 23.650, lon: -100.630, type: 'caseta', name: 'Caseta Matehuala' },
    { lat: 22.210, lon: -100.970, type: 'caseta', name: 'Caseta San Luis Potosí Sur' },
    { lat: 20.720, lon: -100.405, type: 'caseta', name: 'Caseta Querétaro Palmillas' },
    { lat: 21.040, lon: -101.415, type: 'caseta', name: 'Caseta El Gallo' },
    { lat: 20.672, lon: -103.285, type: 'caseta', name: 'Caseta Guadalajara Tonalá' },
    // ── Paraderos ─────────────────────────────────────────────
    { lat: 27.090, lon: -99.528, type: 'paradero', name: 'Paradero Vallecillo' },
    { lat: 26.260, lon: -100.248, type: 'paradero', name: 'Paradero Mamulique' },
    { lat: 25.920, lon: -100.271, type: 'paradero', name: 'Paradero Escobedo' },
    { lat: 25.200, lon: -101.095, type: 'paradero', name: 'Paradero Arteaga' },
    { lat: 24.820, lon: -101.050, type: 'paradero', name: 'Paradero Carneros' },
    { lat: 24.100, lon: -100.890, type: 'paradero', name: 'Paradero Cedral' },
    { lat: 22.900, lon: -100.715, type: 'paradero', name: 'Paradero Villa de Reyes' },
    { lat: 21.650, lon: -100.750, type: 'paradero', name: 'Paradero San Felipe' },
    { lat: 21.365, lon: -101.925, type: 'paradero', name: 'Paradero Lagos de Moreno' },
    { lat: 20.900, lon: -102.400, type: 'paradero', name: 'Paradero Tepatitlán Norte' },
    // ── Gasolineras ───────────────────────────────────────────
    { lat: 27.200, lon: -99.514, type: 'gasolinera', name: 'Pemex Nuevo Laredo Sur' },
    { lat: 26.700, lon: -99.810, type: 'gasolinera', name: 'Pemex Anáhuac' },
    { lat: 26.050, lon: -100.270, type: 'gasolinera', name: 'Pemex Ciénega de Flores' },
    { lat: 25.540, lon: -100.330, type: 'gasolinera', name: 'Pemex Monterrey Tecnológico' },
    { lat: 25.350, lon: -101.050, type: 'gasolinera', name: 'Pemex Saltillo Oriente' },
    { lat: 24.600, lon: -100.985, type: 'gasolinera', name: 'Pemex General Cepeda' },
    { lat: 23.400, lon: -100.680, type: 'gasolinera', name: 'Pemex Charcas' },
    { lat: 22.400, lon: -100.930, type: 'gasolinera', name: 'Pemex Soledad de G.S.' },
    { lat: 21.500, lon: -100.612, type: 'gasolinera', name: 'Pemex San Juan del Río' },
    { lat: 20.980, lon: -101.380, type: 'gasolinera', name: 'Pemex San Diego de la Unión' },
    { lat: 21.280, lon: -102.100, type: 'gasolinera', name: 'Pemex Encarnación de Díaz' },
    { lat: 20.740, lon: -103.080, type: 'gasolinera', name: 'Pemex Tlaquepaque' },
    // ── Rampas de emergencia ──────────────────────────────────
    { lat: 26.200, lon: -100.252, type: 'rampa', name: 'Rampa Paso Mamulique Km 165' },
    { lat: 25.565, lon: -100.605, type: 'rampa', name: 'Rampa Cumbres Monterrey Km 286' },
    { lat: 25.515, lon: -100.755, type: 'rampa', name: 'Rampa Cumbres Monterrey Km 301' },
    { lat: 25.475, lon: -100.840, type: 'rampa', name: 'Rampa Cumbres Monterrey Km 312' },
    { lat: 21.180, lon: -102.280, type: 'rampa', name: 'Rampa Los Altos de Jalisco Km 1118' },
    { lat: 20.850, lon: -102.700, type: 'rampa', name: 'Rampa Tepatitlán Km 1152' },
  ],
}

const TRAZO_STYLE = {
  'Recta':              { bg: '#eff6ff', color: '#1d4ed8' },
  'Recta Ascendente':   { bg: '#f0fdf4', color: '#15803d' },
  'Recta Descendente':  { bg: '#fffbeb', color: '#b45309' },
  'Curva Ascendente':   { bg: '#dcfce7', color: '#166534' },
  'Curva Descendente':  { bg: '#fff7ed', color: '#c2410c' },
}

function TrazoBadge({ trazo }) {
  const s = TRAZO_STYLE[trazo] || { bg: '#f3f4f6', color: '#374151' }
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '3px 10px',
        borderRadius: '99px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {trazo}
    </span>
  )
}

function dmsComponent(decimal, posDir, negDir) {
  const abs = Math.abs(decimal)
  const d = Math.floor(abs)
  const mFloat = (abs - d) * 60
  let m = Math.floor(mFloat)
  let s = Math.round((mFloat - m) * 60)
  if (s === 60) { s = 0; m += 1 }
  const dir = decimal >= 0 ? posDir : negDir
  return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"${dir}`
}

function toDMS(lat, lon) {
  return `${dmsComponent(lat, 'N', 'S')}-${dmsComponent(lon, 'E', 'O')}`
}

function CoordCell({ pos }) {
  return (
    <span className="coord-cell">
      {toDMS(pos.lat, pos.lon)}
    </span>
  )
}

function MexicanRouteAnalysis({ token }) {
  const [inputJson, setInputJson] = useState(
    JSON.stringify(SAMPLE_DATA, null, 2)
  )
  const [tramos, setTramos] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setLoading(true)
    setError('')
    setTramos(null)
    setSummary(null)

    let parsed
    try {
      parsed = JSON.parse(inputJson)
    } catch {
      setError('JSON inválido. Revisa el formato de los datos de entrada.')
      setLoading(false)
      return
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Token ${token}`

      const response = await axios.post(
        `${API_BASE}/route-analysis/analyze/`,
        parsed,
        { headers }
      )
      setTramos(response.data.tramos)
      setSummary({
        total_tramos: response.data.total_tramos,
        distancia_total_km: response.data.distancia_total_km,
      })
    } catch (err) {
      const errData = err.response?.data
      if (errData && typeof errData === 'object') {
        const msgs = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ')
        setError(msgs)
      } else {
        setError(err.message || 'Error al analizar la ruta.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSample = () => {
    setInputJson(JSON.stringify(SAMPLE_DATA, null, 2))
    setTramos(null)
    setSummary(null)
    setError('')
  }

  return (
    <div className="app">
      {/* ── Input card ─────────────────────────────────────── */}
      <div className="container">
        <h2>Análisis de Ruta — Territorio Mexicano</h2>
        <p className="route-desc">
          Ingresa las coordenadas de la ruta en formato JSON para obtener la
          tabla de tramos segmentados con clasificación de trazo y topografía,
          junto con los puntos de referencia viales detectados.
        </p>

        <div className="route-input-row">
          <button
            type="button"
            className="sample-btn"
            onClick={handleLoadSample}
          >
            Cargar ejemplo (Nuevo Laredo – Qro. – Gdl.)
          </button>
        </div>

        <div className="form-field" style={{ marginTop: '16px' }}>
          <label>Datos de Ruta (JSON)</label>
          <textarea
            className="route-input"
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            rows={14}
            spellCheck={false}
          />
        </div>

        <div className="route-schema-hint">
          <strong>Formato esperado:</strong>{' '}
          <code>
            {'{ "coordinates": [{ "lat", "lon", "elevation"? }], "references": [{ "lat", "lon", "type": "caseta"|"paradero"|"rampa", "name" }] }'}
          </code>
        </div>

        <div style={{ marginTop: '16px' }}>
          <button type="button" onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Analizando…' : 'Analizar Ruta'}
          </button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && <div className="error">{error}</div>}

      {/* ── Summary stats ──────────────────────────────────── */}
      {summary && (
        <div className="container">
          <div className="route-summary">
            <div className="summary-stat">
              <span className="summary-value">{summary.total_tramos}</span>
              <span className="summary-label">Tramos</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="summary-value">
                {summary.distancia_total_km} km
              </span>
              <span className="summary-label">Distancia Total</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tramo table ────────────────────────────────────── */}
      {tramos && tramos.length > 0 && (
        <div className="container">
          <h2>Tabla de Tramos</h2>
          <div className="eld-log">
            <table className="log-table tramo-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '60px' }}>
                    Tramo
                  </th>
                  <th>Posición Inicial</th>
                  <th>Posición Final</th>
                  <th>Trazo / Topografía</th>
                  <th>Referencias</th>
                </tr>
              </thead>
              <tbody>
                {tramos.map((tramo) => (
                  <tr key={tramo.numero}>
                    <td
                      style={{
                        fontWeight: 700,
                        textAlign: 'center',
                        color: '#6d28d9',
                      }}
                    >
                      {tramo.numero}
                    </td>
                    <td>
                      <CoordCell pos={tramo.posicion_inicial} />
                    </td>
                    <td>
                      <CoordCell pos={tramo.posicion_final} />
                    </td>
                    <td>
                      <TrazoBadge trazo={tramo.trazo_topografia} />
                    </td>
                    <td>
                      <ul className="referencias-list">
                        {tramo.referencias.map((ref, i) => (
                          <li key={i}>{ref}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default MexicanRouteAnalysis
