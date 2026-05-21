import { useState } from 'react'
import axios from 'axios'

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'https://eld-backend-one.vercel.app'}/api`

// Sample route: Mexico City (Periférico Sur) → Cuernavaca via Federal 95D
// Approximates the Tres Cumbres mountain section with realistic elevation changes
const SAMPLE_DATA = {
  coordinates: [
    { lat: 19.2000, lon: -99.1300, elevation: 2210 },
    { lat: 19.1850, lon: -99.1330, elevation: 2220 },
    { lat: 19.1700, lon: -99.1360, elevation: 2230 },
    { lat: 19.1550, lon: -99.1390, elevation: 2245 },
    { lat: 19.1400, lon: -99.1420, elevation: 2260 },
    // Caseta Tlalpan area — start ascending into the mountains
    { lat: 19.1250, lon: -99.1500, elevation: 2360 },
    { lat: 19.1150, lon: -99.1620, elevation: 2490 },
    { lat: 19.1080, lon: -99.1760, elevation: 2640 },
    { lat: 19.1030, lon: -99.1900, elevation: 2780 },
    { lat: 19.1000, lon: -99.2050, elevation: 2900 },
    { lat: 19.0990, lon: -99.2200, elevation: 2990 },
    // Mountain pass — Tres Cumbres area (relatively straight)
    { lat: 19.0980, lon: -99.2350, elevation: 3055 },
    { lat: 19.0970, lon: -99.2500, elevation: 3080 },
    { lat: 19.0960, lon: -99.2650, elevation: 3090 },
    { lat: 19.0950, lon: -99.2780, elevation: 3085 },
    // Start descending toward Cuernavaca — curving sections
    { lat: 19.0880, lon: -99.2900, elevation: 2960 },
    { lat: 19.0780, lon: -99.2980, elevation: 2790 },
    { lat: 19.0650, lon: -99.3030, elevation: 2590 },
    { lat: 19.0500, lon: -99.3050, elevation: 2370 },
    { lat: 19.0350, lon: -99.3040, elevation: 2160 },
    { lat: 19.0200, lon: -99.3000, elevation: 1990 },
    // Approach to Cuernavaca — flatter section
    { lat: 19.0100, lon: -99.2900, elevation: 1910 },
    { lat: 19.0050, lon: -99.2800, elevation: 1878 },
    { lat: 19.0000, lon: -99.2700, elevation: 1858 },
    { lat: 18.9950, lon: -99.2600, elevation: 1845 },
    { lat: 18.9900, lon: -99.2500, elevation: 1838 },
  ],
  references: [
    {
      lat: 19.1220,
      lon: -99.1450,
      type: 'caseta',
      name: 'Caseta Tlalpan',
    },
    {
      lat: 19.1100,
      lon: -99.1580,
      type: 'paradero',
      name: 'Paradero La Pera',
    },
    {
      lat: 19.0380,
      lon: -99.3042,
      type: 'rampa',
      name: 'Rampa Tres Cumbres',
    },
    {
      lat: 19.0060,
      lon: -99.2820,
      type: 'caseta',
      name: 'Caseta Cuernavaca Norte',
    },
  ],
}

const TRAZO_STYLE = {
  Recta: { bg: '#eff6ff', color: '#1d4ed8' },
  'Curva Ascendente': { bg: '#f0fdf4', color: '#15803d' },
  'Curva Descendente': { bg: '#fef9c3', color: '#854d0e' },
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

function CoordCell({ pos }) {
  return (
    <span className="coord-cell">
      {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
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
            Cargar ejemplo (México–Cuernavaca)
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
                  <th style={{ textAlign: 'right', width: '80px' }}>
                    Dist. (km)
                  </th>
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
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {tramo.distancia_km}
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
