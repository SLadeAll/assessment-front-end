import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Trazo colours ─────────────────────────────────────────────────────────────
const TRAZO_COLOR = {
  'Recta':             '#3b82f6',
  'Recta Ascendente':  '#22c55e',
  'Recta Descendente': '#f59e0b',
  'Curva Ascendente':  '#16a34a',
  'Curva Descendente': '#f97316',
}

// ── Reference-point colours / letters ────────────────────────────────────────
const REF_COLOR  = { caseta: '#ef4444', paradero: '#0ea5e9', gasolinera: '#f97316', rampa: '#8b5cf6' }
const REF_LETTER = { caseta: 'C',       paradero: 'P',       gasolinera: 'G',       rampa: 'R' }
const REF_LABEL  = { caseta: 'Caseta',  paradero: 'Paradero', gasolinera: 'Gasolinera', rampa: 'Rampa' }

// ── Icon factories ────────────────────────────────────────────────────────────
const createNumberIcon = (num) =>
  L.divIcon({
    className: '',
    html: `<div style="background:#6d28d9;color:white;width:22px;height:22px;
      border-radius:50%;border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.45);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:11px;font-family:system-ui,sans-serif;line-height:1;
    ">${num}</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13],
  })

const createRefIcon = (type) => {
  const bg  = REF_COLOR[type]  || '#6b7280'
  const ltr = REF_LETTER[type] || '?'
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:white;width:18px;height:18px;
      border-radius:4px;border:2px solid white;
      box-shadow:0 2px 4px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:11px;font-family:system-ui,sans-serif;line-height:1;
    ">${ltr}</div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -11],
  })
}

// ── Auto-fit helper ───────────────────────────────────────────────────────────
function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions?.length > 1) map.fitBounds(positions, { padding: [40, 40] })
  }, [map, positions])
  return null
}

// ── Reconstruct the input-coordinate slice belonging to each tramo ────────────
function buildTramoPositions(tramos, coordinates) {
  const EPS = 1e-5
  const idx = (pos) =>
    coordinates.findIndex(
      (c) => Math.abs(c.lat - pos.lat) < EPS && Math.abs(c.lon - pos.lon) < EPS
    )

  return tramos.map((tramo) => {
    const si = idx(tramo.posicion_inicial)
    const ei = idx(tramo.posicion_final)
    if (si === -1 || ei === -1 || si >= ei) {
      return [
        [tramo.posicion_inicial.lat, tramo.posicion_inicial.lon],
        [tramo.posicion_final.lat,   tramo.posicion_final.lon],
      ]
    }
    return coordinates.slice(si, ei + 1).map((c) => [c.lat, c.lon])
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
function RouteAnalysisMap({ tramos, coordinates, references }) {
  if (!tramos?.length || !coordinates?.length) return null

  const allPositions    = coordinates.map((c) => [c.lat, c.lon])
  const tramoPositions  = buildTramoPositions(tramos, coordinates)
  const inputRefs       = (references || []).filter((r) => REF_COLOR[r.type])

  return (
    <>
      <MapContainer
        center={[23.6345, -102.5528]}
        zoom={5}
        style={{ height: '500px', width: '100%', borderRadius: '10px' }}
      >
        <FitBounds positions={allPositions} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Thin background line for the full route */}
        <Polyline positions={allPositions} color="#9ca3af" weight={2} opacity={0.45} />

        {/* Coloured polyline per tramo */}
        {tramos.map((tramo, i) => (
          <Polyline
            key={tramo.numero}
            positions={tramoPositions[i]}
            color={TRAZO_COLOR[tramo.trazo_topografia] || '#6b7280'}
            weight={5}
            opacity={0.9}
          >
            <Popup>
              <strong>Tramo {tramo.numero}</strong><br />
              {tramo.trazo_topografia}
            </Popup>
          </Polyline>
        ))}

        {/* Numbered markers at each tramo start */}
        {tramos.map((tramo) => (
          <Marker
            key={`tn-${tramo.numero}`}
            position={[tramo.posicion_inicial.lat, tramo.posicion_inicial.lon]}
            icon={createNumberIcon(tramo.numero)}
          >
            <Popup>
              <strong>Tramo {tramo.numero}</strong><br />
              {tramo.trazo_topografia}
            </Popup>
          </Marker>
        ))}

        {/* Reference-point markers (only those from the input JSON with lat/lon) */}
        {inputRefs.map((ref, i) => (
          <Marker
            key={`ref-${i}`}
            position={[ref.lat, ref.lon]}
            icon={createRefIcon(ref.type)}
          >
            <Popup>
              <strong>{ref.name}</strong><br />
              <span style={{ textTransform: 'capitalize' }}>{REF_LABEL[ref.type]}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        {Object.entries(TRAZO_COLOR).map(([label, color]) => (
          <div key={label} className="legend-item">
            <span style={{
              display: 'inline-block', width: 24, height: 4,
              background: color, borderRadius: 2, flexShrink: 0,
            }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="legend-square" style={{ background: '#6d28d9' }} />
          <span>Inicio de tramo</span>
        </div>
        {Object.entries(REF_COLOR).map(([type, color]) => (
          <div key={type} className="legend-item">
            <span className="legend-square" style={{ background: color }} />
            <span>{REF_LABEL[type]}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default RouteAnalysisMap
