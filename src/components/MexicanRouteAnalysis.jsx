import { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import RouteAnalysisMap from './RouteAnalysisMap'
import RiskAnalysisPanel from './RiskAnalysisPanel'
import { fetchIndications, DEFAULT_VISIBLE_LAYERS } from '../services/indicationService'
import { FALLBACK_REFERENCES, PREDEFINED_ROUTES } from '../data/routeReferences'

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'https://eld-backend-one.vercel.app'}/api`
const ORS_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMxZDk5OTJjNGM5MDRkMWE5M2ExYzhjZGU0OTljZDhmIiwiaCI6Im11cm11cjY0In0='


const TRAZO_STYLE = {
  'Recta':              { bg: '#eff6ff', color: '#1d4ed8' },
  'Recta Ascendente':   { bg: '#f0fdf4', color: '#15803d' },
  'Recta Descendente':  { bg: '#fffbeb', color: '#b45309' },
  'Curva Ascendente':   { bg: '#dcfce7', color: '#166534' },
  'Curva Descendente':  { bg: '#fff7ed', color: '#c2410c' },
}

const REF_LABEL = { caseta: 'Caseta', paradero: 'Paradero', gasolinera: 'Gasolinera', rampa: 'Rampa', seguimiento: 'Control' }
const REF_BADGE = {
  caseta:      { bg: '#fee2e2', color: '#b91c1c' },
  paradero:    { bg: '#e0f2fe', color: '#0369a1' },
  gasolinera:  { bg: '#fff7ed', color: '#c2410c' },
  rampa:       { bg: '#f3e8ff', color: '#7e22ce' },
  seguimiento: { bg: '#f1f5f9', color: '#475569' },
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

function filterNearbyRefs(routeCoords, maxKm = 25, refs = []) {
  return refs.filter(ref =>
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

function MexicanRouteAnalysis({ token }) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [stops, setStops] = useState([])
  const [originSuggs, setOriginSuggs] = useState([])
  const [destSuggs, setDestSuggs] = useState([])
  const [stopSuggs, setStopSuggs] = useState([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeReady, setRouteReady] = useState(false)
  const [routePreview, setRoutePreview] = useState(null)
  const [routeData, setRouteData] = useState(null)
  const [densePoints, setDensePoints] = useState(null)

  const [tramos, setTramos] = useState(null)
  const [summary, setSummary] = useState(null)
  const [parsedInput, setParsedInput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const [indications, setIndications] = useState([])
  const [indicationsLoading, setIndicationsLoading] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState(DEFAULT_VISIBLE_LAYERS)

  const [allReferences, setAllReferences] = useState(FALLBACK_REFERENCES)

  useEffect(() => {
    axios.get(`${API_BASE}/route-analysis/references/`)
      .then(r => {
        const refs = r.data.references || []
        if (refs.length) setAllReferences(refs)
      })
      .catch(() => {})
  }, [])

  const fullyLoaded = routeReady && !!tramos && !loading && !indicationsLoading

  // Km-by-km route log: place each matched reference at its exact km position
  // along the dense ORS polyline, sorted from origin to destination.
  const bitacora = useMemo(() => {
    if (!densePoints?.length || !parsedInput?.references?.length) return []

    const cumKm = [0]
    for (let i = 1; i < densePoints.length; i++) {
      const p = densePoints[i], q = densePoints[i - 1]
      const dlat = (p.lat - q.lat) * 111
      const dlon = (p.lon - q.lon) * 111 * Math.cos(q.lat * Math.PI / 180)
      cumKm.push(cumKm[i - 1] + Math.sqrt(dlat * dlat + dlon * dlon))
    }

    const findPos = (lat, lon) => {
      let minSq = Infinity, best = 0
      for (let i = 0; i < densePoints.length; i++) {
        const p = densePoints[i]
        const sq = (lat - p.lat) ** 2 + (lon - p.lon) ** 2
        if (sq < minSq) { minSq = sq; best = i }
      }
      return { km: Math.round(cumKm[best]), elev: densePoints[best].elevation ?? 0 }
    }

    return parsedInput.references
      .filter(r => isFinite(r.lat) && isFinite(r.lon))
      .map(ref => ({ ...findPos(ref.lat, ref.lon), type: ref.type, name: ref.name }))
      .sort((a, b) => a.km - b.km)
  }, [densePoints, parsedInput])

  const handleToggleLayer = (type) => {
    setVisibleLayers(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

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

  const runAnalysis = async (data) => {
    setLoading(true)
    setError('')
    setTramos(null)
    setSummary(null)
    setParsedInput(null)

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Token ${token}`

      const response = await axios.post(
        `${API_BASE}/route-analysis/analyze/`,
        data,
        { headers },
      )

      const matchedRefs = response.data.matched_references ?? data.references ?? []

      setTramos(response.data.tramos)
      setSummary({
        total_tramos: response.data.total_tramos,
        distancia_total_km: response.data.distancia_total_km,
      })
      setParsedInput({
        coordinates: data.coordinates || [],
        references: matchedRefs,
      })
      setRoutePreview(prev => prev ? { ...prev, refs: matchedRefs.length } : prev)
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

  const startIndicationExtraction = async (routeCoords) => {
    setIndicationsLoading(true)
    setIndications([])
    try {
      const result = await fetchIndications(routeCoords, API_BASE, token)
      setIndications(result)
    } catch {
      // Non-critical
    } finally {
      setIndicationsLoading(false)
    }
  }

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
    setDensePoints(null)
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
      const previewRefs = filterNearbyRefs(allPoints, 25, allReferences)

      const label = allCities.join(' → ')
      const newRouteData = { coordinates: sampled, references: previewRefs }

      setDensePoints(allPoints)
      setRouteData(newRouteData)
      setRoutePreview({ label, km: distanceKm, points: sampled.length, refs: previewRefs.length })
      setRouteReady(true)

      startIndicationExtraction(sampled)
      runAnalysis(newRouteData)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al obtener la ruta.')
    } finally {
      setRouteLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!routeData) {
      setError('Primero usa "Obtener Ruta" para cargar una ruta.')
      return
    }
    await runAnalysis(routeData)
  }

  const handleExportPdf = async () => {
    if (!routeData) { setError('Primero obtén la ruta antes de exportar.'); return }

    setPdfLoading(true)
    setError('')

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Token ${token}`

      const payload = {
        ...routeData,
        route_label: routePreview?.label || 'Análisis de Ruta',
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

  const applyPredefined = (route) => {
    setOrigin(route.origin)
    setDestination(route.destination)
    setStops(route.stops)
    setStopSuggs(route.stops.map(() => []))
    setRouteReady(false)
    setRoutePreview(null)
    setTramos(null)
    setSummary(null)
    setParsedInput(null)
    setIndications([])
  }

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

  return (
    <div className="app">
      <div className="container">
        <h2>Análisis de Ruta — Territorio Mexicano</h2>
        <p className="route-desc">
          Escribe el origen y el destino. El sistema obtendrá la ruta con elevación,
          extraerá automáticamente las indicaciones viales y generará el desglose
          completo de tramos, topografía y tabla PROCESO.
        </p>

        <div style={{ marginBottom: '18px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rutas frecuentes — clic para autocompletar
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {PREDEFINED_ROUTES.map((route, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyPredefined(route)}
                title={route.description}
                style={{
                  background: '#f5f3ff', color: '#5b21b6',
                  border: '1px solid #ddd6fe', borderRadius: '6px',
                  padding: '5px 11px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff' }}
              >
                {route.label}
              </button>
            ))}
          </div>
        </div>

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

        {routeReady && (
          <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {routePreview && (
              <>
                <span style={{ fontSize: '12px', background: '#f0fdf4', color: '#15803d', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>
                  ✓ {routePreview.km} km
                </span>
                <span style={{ fontSize: '12px', background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>
                  {routePreview.points} puntos muestreados
                </span>
                {routePreview.refs > 0 && (
                  <span style={{ fontSize: '12px', background: '#fef9c3', color: '#854d0e', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>
                    {routePreview.refs} referencias
                  </span>
                )}
              </>
            )}
            {loading ? (
              <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#6b7280', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>
                ⧗ Analizando tramos…
              </span>
            ) : summary ? (
              <span style={{ fontSize: '12px', background: '#f5f3ff', color: '#6d28d9', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>
                ✓ {summary.total_tramos} tramos
              </span>
            ) : null}
            {indicationsLoading ? (
              <span style={{ fontSize: '12px', background: '#f3f4f6', color: '#6b7280', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>
                ⧗ Extrayendo indicaciones…
              </span>
            ) : indications.length > 0 ? (
              <span style={{ fontSize: '12px', background: '#f0fdfa', color: '#0f766e', padding: '3px 10px', borderRadius: '99px', fontWeight: 600 }}>
                ✓ {indications.length} indicaciones
              </span>
            ) : null}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={handleAnalyze} disabled={loading || pdfLoading || !routeData}>
            {loading ? 'Analizando…' : 'Analizar Ruta'}
          </button>
          <button
            type="button" onClick={handleExportPdf}
            disabled={loading || pdfLoading || !routeData}
            style={{
              background: (pdfLoading || !routeData) ? '#9ca3af' : '#dc2626',
              color: '#fff', border: 'none', borderRadius: '6px',
              padding: '8px 18px', fontWeight: 600, fontSize: '14px',
              cursor: (pdfLoading || !routeData) ? 'not-allowed' : 'pointer',
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
              Generando mapas y tabla PROCESO…
            </span>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {routeReady && !fullyLoaded && !error && (
        <div className="container" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              background: '#f5f3ff', color: '#6d28d9',
              padding: '12px 24px', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600,
            }}>
              <span style={{ fontSize: '20px' }}>⧗</span>
              Procesando información completa de la ruta…
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {loading && (
                <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: '99px' }}>
                  Analizando tramos y topografía
                </span>
              )}
              {indicationsLoading && (
                <span style={{ fontSize: '12px', color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: '99px' }}>
                  Extrayendo señales e indicaciones viales
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {fullyLoaded && (
        <>
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

          <div className="container">
            <h2>Mapa de Ruta</h2>
            <RouteAnalysisMap
              tramos={tramos}
              coordinates={parsedInput?.coordinates ?? routeData.coordinates}
              references={parsedInput?.references ?? []}
              densePoints={densePoints}
              indications={indications}
              visibleLayers={visibleLayers}
              onToggleLayer={handleToggleLayer}
              indicationsLoading={false}
            />
          </div>

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
                          <td style={{ verticalAlign: 'top' }}><CoordCell pos={tramo.posicion_inicial} /></td>
                          <td style={{ verticalAlign: 'top' }}><CoordCell pos={tramo.posicion_final} /></td>
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

          {bitacora.length > 0 && (
            <div className="container">
              <h2>Bitácora de Ruta</h2>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: 0, marginBottom: '12px' }}>
                Referencias ordenadas por km desde el origen — casetas, paraderos, gasolineras y rampas
                encontradas a lo largo del recorrido con su elevación aproximada.
              </p>
              <div className="eld-log">
                <table className="log-table tramo-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Km</th>
                      <th style={{ width: '120px' }}>Tipo</th>
                      <th>Referencia</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Altitud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bitacora.map((item, i) => {
                      const s = REF_BADGE[item.type] || { bg: '#f3f4f6', color: '#374151' }
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: '#374151', fontFamily: 'monospace', fontSize: '13px' }}>
                            km {item.km}
                          </td>
                          <td>
                            <span style={{
                              background: s.bg, color: s.color,
                              padding: '2px 9px', borderRadius: '99px',
                              fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                            }}>
                              {REF_LABEL[item.type] || item.type}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px' }}>{item.name}</td>
                          <td style={{ color: '#6b7280', fontSize: '12px', textAlign: 'right' }}>
                            {item.elev} m
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MexicanRouteAnalysis
