import { useState } from 'react'
import axios from 'axios'
import RouteAnalysisMap from './RouteAnalysisMap'
import RiskAnalysisPanel from './RiskAnalysisPanel'
import { fetchIndications, DEFAULT_VISIBLE_LAYERS } from '../services/indicationService'

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'https://eld-backend-one.vercel.app'}/api`
const ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMxZDk5OTJjNGM5MDRkMWE5M2ExYzhjZGU0OTljZDhmIiwiaCI6Im11cm11cjY0In0='

// Known reference points along major Mexican federal highways (static database)
const MEXICAN_REFERENCES = [
  { lat: 27.160, lon: -99.520,  type: 'caseta',    name: 'Caseta Colombia Solidaridad' },
  { lat: 26.490, lon: -100.200, type: 'caseta',    name: 'Caseta Sabinas Hidalgo' },
  { lat: 25.700, lon: -100.370, type: 'caseta',    name: 'Caseta Monterrey Norte' },
  { lat: 25.490, lon: -100.870, type: 'caseta',    name: 'Caseta Saltillo Oriente' },
  { lat: 23.650, lon: -100.630, type: 'caseta',    name: 'Caseta Matehuala' },
  { lat: 22.210, lon: -100.970, type: 'caseta',    name: 'Caseta San Luis Potosí Sur' },
  { lat: 20.720, lon: -100.405, type: 'caseta',    name: 'Caseta Querétaro Palmillas' },
  { lat: 21.040, lon: -101.415, type: 'caseta',    name: 'Caseta El Gallo' },
  { lat: 20.672, lon: -103.285, type: 'caseta',    name: 'Caseta Guadalajara Tonalá' },
  { lat: 27.090, lon: -99.528,  type: 'paradero',  name: 'Paradero Vallecillo' },
  { lat: 26.260, lon: -100.248, type: 'paradero',  name: 'Paradero Mamulique' },
  { lat: 25.920, lon: -100.271, type: 'paradero',  name: 'Paradero Escobedo' },
  { lat: 25.200, lon: -101.095, type: 'paradero',  name: 'Paradero Arteaga' },
  { lat: 24.820, lon: -101.050, type: 'paradero',  name: 'Paradero Carneros' },
  { lat: 24.100, lon: -100.890, type: 'paradero',  name: 'Paradero Cedral' },
  { lat: 22.900, lon: -100.715, type: 'paradero',  name: 'Paradero Villa de Reyes' },
  { lat: 21.650, lon: -100.750, type: 'paradero',  name: 'Paradero San Felipe' },
  { lat: 21.365, lon: -101.925, type: 'paradero',  name: 'Paradero Lagos de Moreno' },
  { lat: 20.900, lon: -102.400, type: 'paradero',  name: 'Paradero Tepatitlán Norte' },
  { lat: 27.200, lon: -99.514,  type: 'gasolinera', name: 'Pemex Nuevo Laredo Sur' },
  { lat: 26.700, lon: -99.810,  type: 'gasolinera', name: 'Pemex Anáhuac' },
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
  { lat: 26.200, lon: -100.252, type: 'rampa',      name: 'Rampa Paso Mamulique Km 165' },
  { lat: 25.565, lon: -100.605, type: 'rampa',      name: 'Rampa Cumbres Monterrey Km 286' },
  { lat: 25.515, lon: -100.755, type: 'rampa',      name: 'Rampa Cumbres Monterrey Km 301' },
  { lat: 25.475, lon: -100.840, type: 'rampa',      name: 'Rampa Cumbres Monterrey Km 312' },
  { lat: 21.180, lon: -102.280, type: 'rampa',      name: 'Rampa Los Altos de Jalisco Km 1118' },
  { lat: 20.850, lon: -102.700, type: 'rampa',      name: 'Rampa Tepatitlán Km 1152' },
]

const SAMPLE_JSON = {
  coordinates: [
    { lat: 27.476, lon: -99.515, elevation: 218 },
    { lat: 27.280, lon: -99.516, elevation: 226 },
    { lat: 27.100, lon: -99.530, elevation: 240 },
    { lat: 26.870, lon: -99.685, elevation: 292 },
    { lat: 26.500, lon: -100.192, elevation: 352 },
    { lat: 26.300, lon: -100.245, elevation: 515 },
    { lat: 26.150, lon: -100.260, elevation: 725 },
    { lat: 25.960, lon: -100.270, elevation: 598 },
    { lat: 25.686, lon: -100.316, elevation: 537 },
    { lat: 25.620, lon: -100.430, elevation: 700 },
    { lat: 25.570, lon: -100.520, elevation: 955 },
    { lat: 25.560, lon: -100.640, elevation: 1205 },
    { lat: 25.530, lon: -100.740, elevation: 1385 },
    { lat: 25.500, lon: -100.870, elevation: 1525 },
    { lat: 25.428, lon: -101.003, elevation: 1592 },
    { lat: 25.000, lon: -101.100, elevation: 1652 },
    { lat: 24.500, lon: -100.980, elevation: 1822 },
    { lat: 23.660, lon: -100.638, elevation: 1685 },
    { lat: 23.000, lon: -100.720, elevation: 1812 },
    { lat: 22.600, lon: -100.900, elevation: 1860 },
    { lat: 22.149, lon: -100.979, elevation: 1877 },
    { lat: 21.700, lon: -100.755, elevation: 1853 },
    { lat: 21.200, lon: -100.558, elevation: 1839 },
    { lat: 20.593, lon: -100.389, elevation: 1820 },
    { lat: 20.750, lon: -100.900, elevation: 1786 },
    { lat: 21.000, lon: -101.400, elevation: 1737 },
    { lat: 21.358, lon: -101.933, elevation: 1562 },
    { lat: 21.100, lon: -102.300, elevation: 1692 },
    { lat: 20.818, lon: -102.745, elevation: 1757 },
    { lat: 20.720, lon: -103.000, elevation: 1628 },
    { lat: 20.680, lon: -103.200, elevation: 1587 },
    { lat: 20.659, lon: -103.350, elevation: 1545 },
  ],
  references: MEXICAN_REFERENCES,
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
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
  return <span className="coord-cell">{toDMS(pos.lat, pos.lon)}</span>
}

function filterNearbyRefs(routeCoords, maxKm = 20) {
  return MEXICAN_REFERENCES.filter(ref =>
    routeCoords.some(c => {
      const dlat = (ref.lat - c.lat) * 111
      const dlon = (ref.lon - c.lon) * 111 * Math.cos(c.lat * Math.PI / 180)
      return Math.sqrt(dlat * dlat + dlon * dlon) <= maxKm
    })
  )
}

function downsample(coords, targetKm = 35) {
  if (coords.length < 2) return coords
  const result = [coords[0]]
  let last = coords[0]
  for (const c of coords) {
    const dlat = (c.lat - last.lat) * 111
    const dlon = (c.lon - last.lon) * 111 * Math.cos(last.lat * Math.PI / 180)
    if (Math.sqrt(dlat * dlat + dlon * dlon) >= targetKm) {
      result.push(c)
      last = c
    }
  }
  const end = coords[coords.length - 1]
  if (result[result.length - 1] !== end) result.push(end)
  return result
}

// ── Autocomplete input ────────────────────────────────────────────────────────
function CityInput({ id, label, placeholder, value, onChange, suggestions, onSelect, onClearSuggestions }) {
  return (
    <div className="form-field" style={{ position: 'relative' }}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={() => setTimeout(() => onClearSuggestions?.(), 150)}
        autoComplete="off"
        style={{ width: '100%' }}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 100,
          maxHeight: '180px', overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => onSelect(s)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
function MexicanRouteAnalysis({ token }) {
  // Dynamic form state
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [stops, setStops] = useState([])
  const [originSuggs, setOriginSuggs] = useState([])
  const [destSuggs, setDestSuggs] = useState([])
  const [stopSuggs, setStopSuggs] = useState([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeReady, setRouteReady] = useState(false)
  const [routePreview, setRoutePreview] = useState(null)

  // Route data shared between map and analysis
  const [routeData, setRouteData] = useState(null)

  // Route analysis state
  const [tramos, setTramos] = useState(null)
  const [summary, setSummary] = useState(null)
  const [parsedInput, setParsedInput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [deliveryPct, setDeliveryPct] = useState(50)

  // Auto-extracted indication layers
  const [indications, setIndications] = useState([])
  const [indicationsLoading, setIndicationsLoading] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_VISIBLE_LAYERS)

  // Advanced JSON mode
  const [showJson, setShowJson] = useState(false)
  const [inputJson, setInputJson] = useState('')

  // ── Layer toggle ───────────────────────────────────────────────────────────
  const handleToggleLayer = (type) => {
    setVisibleLayers(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // ── Autocomplete helpers ───────────────────────────────────────────────────
  const fetchSuggestions = async (text) => {
    if (!text || text.length < 3) return []
    try {
      const r = await axios.get('https://api.openrouteservice.org/geocode/autocomplete', {
        params: { api_key: ORS_KEY, text, size: 5 },
      })
      return r.data.features.map(f => ({ label: f.properties.label, coord: f.geometry.coordinates }))
    } catch { return [] }
  }

  const geocodeText = async (text) => {
    const r = await axios.get('https://api.openrouteservice.org/geocode/search', {
      params: { api_key: ORS_KEY, text, size: 1 },
    })
    if (!r.data.features?.length) throw new Error(`Ubicación no encontrada: "${text}"`)
    return r.data.features[0].geometry.coordinates
  }

  // ── Shared route analysis runner ───────────────────────────────────────────
  // Extracted so it can be called automatically after route load AND manually.
  const runAnalysis = async (data, currentDeliveryPct) => {
    setLoading(true)
    setError('')
    setTramos(null)
    setSummary(null)
    setParsedInput(null)

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Token ${token}`

      const coordCount = (data.coordinates || []).length
      const firstDeliveryIdx = Math.max(1, Math.round(coordCount * currentDeliveryPct / 100))

      const payload = {
        ...data,
        vehicle_config: {
          vehicle_type: 'double_trailer',
          first_delivery_coord_index: firstDeliveryIdx,
        },
      }

      const response = await axios.post(`${API_BASE}/route-analysis/analyze/`, payload, { headers })
      setTramos(response.data.tramos)
      setSummary({
        total_tramos: response.data.total_tramos,
        distancia_total_km: response.data.distancia_total_km,
      })
      setParsedInput({
        coordinates: data.coordinates || [],
        references: data.references || [],
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

  // ── Auto-extract indications (runs automatically on route load) ────────────
  const startIndicationExtraction = async (routeCoords) => {
    setIndicationsLoading(true)
    setIndications([])
    try {
      const result = await fetchIndications(routeCoords, API_BASE, token)
      setIndications(result)
    } catch {
      // Indication failures are non-critical — map and analysis still work
    } finally {
      setIndicationsLoading(false)
    }
  }

  // ── Get route from ORS ─────────────────────────────────────────────────────
  const handleGetRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError('Escribe al menos el origen y el destino.')
      return
    }
    setRouteLoading(true)
    setError('')
    setRouteReady(false)
    setRoutePreview(null)
    setRouteData(null)
    setTramos(null)
    setSummary(null)
    setParsedInput(null)
    setIndications([])

    try {
      const allCities = [origin.trim(), ...stops.filter(s => s.trim()), destination.trim()]
      const geocoded = await Promise.all(allCities.map(geocodeText))

      const routeRes = await axios.post(
        `https://api.openrouteservice.org/v2/directions/driving-car/geojson?api_key=${ORS_KEY}`,
        { coordinates: geocoded, elevation: true, instructions: false },
        { headers: { 'Content-Type': 'application/json' } },
      )
      const feature = routeRes.data.features[0]
      const rawCoords = feature.geometry.coordinates
      const distanceKm = Math.round(feature.properties.summary.distance / 1000)

      const allPoints = rawCoords.map(([lon, lat, elevation]) => ({
        lat, lon, elevation: Math.round(elevation || 0),
      }))
      const sampled = downsample(allPoints, 35)
      const refs = filterNearbyRefs(sampled)

      const label = allCities.join(' → ')
      const newRouteData = { coordinates: sampled, references: refs }

      setRouteData(newRouteData)
      setRoutePreview({ label, km: distanceKm, points: sampled.length, refs: refs.length })
      setRouteReady(true)

      // Automatically start indication extraction and route analysis in parallel.
      // Both are fire-and-forget from this function's perspective — they update
      // state independently when they finish.
      startIndicationExtraction(sampled)
      runAnalysis(newRouteData, deliveryPct)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al obtener la ruta.')
    } finally {
      setRouteLoading(false)
    }
  }

  // ── Manual re-analysis (used after changing vehicle config or in JSON mode) ─
  const handleAnalyze = async () => {
    let data
    if (showJson && inputJson.trim()) {
      try { data = JSON.parse(inputJson) }
      catch { setError('JSON inválido. Revisa el formato de los datos de entrada.'); return }
    } else {
      if (!routeData) {
        setError('Primero usa “Obtener Ruta” para cargar una ruta, o activa el modo avanzado JSON.')
        return
      }
      data = routeData
    }
    await runAnalysis(data, deliveryPct)
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    let data
    if (showJson && inputJson.trim()) {
      try { data = JSON.parse(inputJson) }
      catch { setError('JSON inválido. Corrígelo antes de exportar.'); setPdfLoading(false); return }
    } else {
      if (!routeData) { setError('Primero obtén la ruta antes de exportar.'); return }
      data = routeData
    }

    setPdfLoading(true)
    setError('')

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Token ${token}`

      const coordCount = (data.coordinates || []).length
      const firstDeliveryIdx = Math.max(1, Math.round(coordCount * deliveryPct / 100))

      const payload = {
        ...data,
        vehicle_config: { vehicle_type: 'double_trailer', first_delivery_coord_index: firstDeliveryIdx },
        route_label: routePreview?.label || `Ruta ${coordCount} puntos — entrega al ${deliveryPct}%`,
      }

      const response = await axios.post(
        `${API_BASE}/route-analysis/export-pdf/`,
        payload,
        { headers, responseType: 'blob' },
      )

      const disposition = response.headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `analisis_riesgos_${Date.now()}.pdf`

      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Error al generar el PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  // ── Stop management ────────────────────────────────────────────────────────
  const addStop = () => {
    setStops(s => [...s, ''])
    setStopSuggs(s => [...s, []])
    setRouteReady(false); setRoutePreview(null)
  }
  const removeStop = (idx) => {
    setStops(s => s.filter((_, i) => i !== idx))
    setStopSuggs(s => s.filter((_, i) => i !== idx))
    setRouteReady(false); setRoutePreview(null)
  }
  const updateStop = async (idx, value) => {
    const newStops = [...stops]; newStops[idx] = value; setStops(newStops)
    setRouteReady(false); setRoutePreview(null)
    const suggs = await fetchSuggestions(value)
    setStopSuggs(prev => { const n = [...prev]; n[idx] = suggs; return n })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Input card ──────────────────────────────────────────────────── */}
      <div className="container">
        <h2>Análisis de Ruta — Territorio Mexicano</h2>
        <p className="route-desc">
          Escribe el origen y el destino. El sistema obtendrá la ruta con elevación,
          extraerá automáticamente las indicaciones viales (semáforos, topes, casetas,
          gasolineras, etc.) y generará el desglose completo de tramos y tabla PROCESO.
        </p>

        <CityInput
          id="origin" label="Origen"
          placeholder="ej. Nuevo Laredo, Tamaulipas"
          value={origin}
          onChange={async (e) => {
            setOrigin(e.target.value); setRouteReady(false); setRoutePreview(null)
            setOriginSuggs(await fetchSuggestions(e.target.value))
          }}
          suggestions={originSuggs}
          onSelect={(s) => { setOrigin(s.label); setOriginSuggs([]) }}
          onClearSuggestions={() => setOriginSuggs([])}
        />

        {stops.map((stop, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <CityInput
                id={`stop-${idx}`} label={`Parada ${idx + 1}`}
                placeholder="ej. Monterrey, Nuevo León"
                value={stop}
                onChange={e => updateStop(idx, e.target.value)}
                suggestions={stopSuggs[idx] || []}
                onSelect={(s) => {
                  const n = [...stops]; n[idx] = s.label; setStops(n)
                  const ns = [...stopSuggs]; ns[idx] = []; setStopSuggs(ns)
                }}
                onClearSuggestions={() => setStopSuggs(prev => { const n = [...prev]; n[idx] = []; return n })}
              />
            </div>
            <button
              type="button" onClick={() => removeStop(idx)}
              style={{
                background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
                borderRadius: '6px', padding: '8px 12px', cursor: 'pointer',
                fontWeight: 700, fontSize: '14px', height: '38px', alignSelf: 'flex-end',
              }}
            >✕</button>
          </div>
        ))}

        <button
          type="button" onClick={addStop}
          style={{
            background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe',
            borderRadius: '6px', padding: '7px 14px', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', marginTop: '4px', marginBottom: '4px',
          }}
        >+ Agregar parada intermedia</button>

        <CityInput
          id="destination" label="Destino"
          placeholder="ej. Guadalajara, Jalisco"
          value={destination}
          onChange={async (e) => {
            setDestination(e.target.value); setRouteReady(false); setRoutePreview(null)
            setDestSuggs(await fetchSuggestions(e.target.value))
          }}
          suggestions={destSuggs}
          onSelect={(s) => { setDestination(s.label); setDestSuggs([]) }}
          onClearSuggestions={() => setDestSuggs([])}
        />

        {/* Get Route button */}
        <div style={{ marginTop: '16px' }}>
          <button
            type="button" onClick={handleGetRoute}
            disabled={routeLoading}
            style={{
              background: routeLoading ? '#9ca3af' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: '6px',
              padding: '9px 22px', fontWeight: 700, fontSize: '14px',
              cursor: routeLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {routeLoading ? 'Obteniendo ruta…' : 'Obtener Ruta'}
          </button>
        </div>

        {/* Multi-phase status badges */}
        {(routeReady || loading || indicationsLoading) && (
          <div style={{
            marginTop: '14px',
            display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center',
          }}>
            {/* Route */}
            {routePreview && (
              <>
                <span style={{
                  fontSize: '12px', background: '#f0fdf4', color: '#15803d',
                  padding: '3px 10px', borderRadius: '99px', fontWeight: 600,
                }}>
                  ✓ {routePreview.km} km
                </span>
                <span style={{
                  fontSize: '12px', background: '#eff6ff', color: '#1d4ed8',
                  padding: '3px 10px', borderRadius: '99px', fontWeight: 600,
                }}>
                  {routePreview.points} puntos
                </span>
              </>
            )}

            {/* Analysis status */}
            {loading ? (
              <span style={{
                fontSize: '12px', background: '#f3f4f6', color: '#6b7280',
                padding: '3px 10px', borderRadius: '99px', fontWeight: 600,
              }}>
                ⧗ Analizando tramos…
              </span>
            ) : summary ? (
              <span style={{
                fontSize: '12px', background: '#f5f3ff', color: '#6d28d9',
                padding: '3px 10px', borderRadius: '99px', fontWeight: 600,
              }}>
                ✓ {summary.total_tramos} tramos
              </span>
            ) : null}

            {/* Indication extraction status */}
            {indicationsLoading ? (
              <span style={{
                fontSize: '12px', background: '#f3f4f6', color: '#6b7280',
                padding: '3px 10px', borderRadius: '99px', fontWeight: 600,
              }}>
                ⧗ Extrayendo indicaciones…
              </span>
            ) : indications.length > 0 ? (
              <span style={{
                fontSize: '12px', background: '#f0fdfa', color: '#0f766e',
                padding: '3px 10px', borderRadius: '99px', fontWeight: 600,
              }}>
                ✓ {indications.length} indicaciones
              </span>
            ) : null}
          </div>
        )}

        {/* Advanced JSON mode toggle */}
        <div style={{ marginTop: '20px' }}>
          <button
            type="button" onClick={() => setShowJson(v => !v)}
            style={{
              background: 'none', border: 'none', color: '#6b7280',
              fontSize: '12px', cursor: 'pointer', padding: '0',
              textDecoration: 'underline', fontWeight: 500,
            }}
          >
            {showJson ? '▲ Ocultar modo avanzado (JSON)' : '▼ Modo avanzado: ingresar coordenadas JSON'}
          </button>
        </div>

        {showJson && (
          <div style={{ marginTop: '12px' }}>
            <div className="route-input-row">
              <button
                type="button" className="sample-btn"
                onClick={() => {
                  setInputJson(JSON.stringify(SAMPLE_JSON, null, 2))
                  setTramos(null); setSummary(null); setParsedInput(null); setError('')
                  setRouteReady(false); setRoutePreview(null)
                }}
              >
                Cargar ejemplo (Nuevo Laredo – Qro. – Gdl.)
              </button>
            </div>
            <div className="form-field" style={{ marginTop: '10px' }}>
              <label>Datos de Ruta (JSON)</label>
              <textarea
                className="route-input"
                value={inputJson}
                onChange={(e) => { setInputJson(e.target.value); setRouteReady(false) }}
                rows={12}
                spellCheck={false}
              />
            </div>
            <div className="route-schema-hint">
              <strong>Formato:</strong>{' '}
              <code>{'{ "coordinates": [{ "lat", "lon", "elevation"? }], "references": [{ "lat", "lon", "type": "caseta"|"paradero"|"rampa", "name" }] }'}</code>
            </div>
          </div>
        )}

        {/* Vehicle config */}
        <div style={{ marginTop: '20px', padding: '16px', background: '#f8f7ff', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '13px', color: '#6d28d9' }}>
            Configuración del Vehículo — Camión de Doble Remolque
          </p>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#4b5563' }}>
            Sale con <strong>carga completa</strong>. Entrega la mitad en el <strong>primer destino</strong> y continúa con <strong>media carga</strong>.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
              Primera entrega al:
            </label>
            <input
              type="range" min={10} max={90} step={5} value={deliveryPct}
              onChange={e => setDeliveryPct(Number(e.target.value))}
              style={{ flex: 1, minWidth: '140px', accentColor: '#7c3aed' }}
            />
            <span style={{ minWidth: '48px', fontSize: '13px', fontWeight: 700, color: '#7c3aed', textAlign: 'center' }}>
              {deliveryPct}%
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>de la ruta</span>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#9ca3af' }}>
            Los tramos antes del {deliveryPct}% se analizarán con <strong>Carga Completa</strong>;
            los tramos restantes con <strong>Media Carga</strong>.
          </p>
        </div>

        {/* Analyze + Export buttons */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button type="button" onClick={handleAnalyze} disabled={loading || pdfLoading}>
              {loading ? 'Analizando…' : 'Analizar Ruta'}
            </button>
            {routeReady && (
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                Recalcular con configuración de vehículo actual
              </span>
            )}
          </div>
          <button
            type="button" onClick={handleExportPdf}
            disabled={loading || pdfLoading}
            style={{
              background: pdfLoading ? '#9ca3af' : '#dc2626',
              color: '#fff', border: 'none', borderRadius: '6px',
              padding: '8px 18px', fontWeight: 600, fontSize: '14px',
              cursor: pdfLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            {pdfLoading ? 'Generando PDF…' : 'Exportar PDF'}
          </button>
          {pdfLoading && (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              Generando mapas y tabla PROCESO — esto puede tardar unos segundos…
            </span>
          )}
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {error && <div className="error">{error}</div>}

      {/* ── Summary stats ────────────────────────────────────────────────── */}
      {summary && (
        <div className="container">
          <div className="route-summary">
            <div className="summary-stat">
              <span className="summary-value">{summary.total_tramos}</span>
              <span className="summary-label">Tramos</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="summary-value">{summary.distancia_total_km} km</span>
              <span className="summary-label">Distancia Total</span>
            </div>
          </div>
        </div>
      )}

      {/*
        Route map — shown as soon as the route is obtained, BEFORE tramo analysis
        completes.  Tramo colouring is added once analysis returns.
        Indication markers appear on their own LayerGroups with toggle controls.
      */}
      {routeReady && routeData && (
        <div className="container">
          <h2>Mapa de Ruta</h2>
          <RouteAnalysisMap
            tramos={tramos}
            coordinates={parsedInput?.coordinates ?? routeData.coordinates}
            references={parsedInput?.references ?? routeData.references}
            indications={indications}
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
            indicationsLoading={indicationsLoading}
          />
        </div>
      )}

      {/* ── Tramo table ───────────────────────────────────────────────────── */}
      {tramos && tramos.length > 0 && (
        <div className="container">
          <h2>Tabla de Tramos</h2>
          <div className="eld-log">
            <table className="log-table tramo-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '60px' }}>Tramo</th>
                  <th>Posición Inicial</th>
                  <th>Posición Final</th>
                  <th>Trazo / Topografía</th>
                  <th>Referencias</th>
                </tr>
              </thead>
              <tbody>
                {tramos.map((tramo) => (
                  <>
                    <tr key={tramo.numero}>
                      <td style={{ fontWeight: 700, textAlign: 'center', color: '#6d28d9', verticalAlign: 'top' }}>
                        {tramo.numero}
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <CoordCell pos={tramo.posicion_inicial} />
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <CoordCell pos={tramo.posicion_final} />
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <TrazoBadge trazo={tramo.trazo_topografia} />
                        {tramo.risk_analysis && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>
                            {tramo.distancia_km} km
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        <ul className="referencias-list">
                          {tramo.referencias.map((ref, i) => <li key={i}>{ref}</li>)}
                        </ul>
                      </td>
                    </tr>
                    {tramo.risk_analysis && (
                      <tr key={`risk-${tramo.numero}`}>
                        <td colSpan={5} style={{ padding: '0 12px 16px', background: '#fafafa' }}>
                          <RiskAnalysisPanel riskAnalysis={tramo.risk_analysis} />
                        </td>
                      </tr>
                    )}
                  </>
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
