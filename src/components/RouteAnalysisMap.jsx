import { MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup, useMap } from 'react-leaflet'
import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MapLayerControls from './MapLayerControls'
import { INDICATION_TYPES, countByType } from '../services/indicationService'

const TRAZO_COLOR = {
  'Recta':             '#3b82f6',
  'Recta Ascendente':  '#22c55e',
  'Recta Descendente': '#f59e0b',
  'Curva Ascendente':  '#16a34a',
  'Curva Descendente': '#f97316',
}

const REF_COLOR  = { caseta: '#ef4444', paradero: '#0ea5e9', gasolinera: '#f97316', rampa: '#8b5cf6' }
const REF_LETTER = { caseta: 'C',       paradero: 'P',       gasolinera: 'G',       rampa: 'R' }
const REF_LABEL  = { caseta: 'Caseta',  paradero: 'Paradero', gasolinera: 'Gasolinera', rampa: 'Rampa' }

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

const createIndicationIcon = (type) => {
  const meta = INDICATION_TYPES[type] || { icon: '?', color: '#6b7280' }
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${meta.color};
      color:white;
      width:14px;height:14px;
      border-radius:3px;
      border:1.5px solid rgba(255,255,255,0.85);
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:9px;font-family:system-ui,sans-serif;line-height:1;
      opacity:0.9;
    ">${meta.icon}</div>`,
    iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -9],
  })
}

// Returns the [lat, lon] of the nearest point in routePoints to (refLat, refLon).
// Used to snap reference markers (casetas, paraderos, etc.) onto the road line
// rather than displaying them at their static coordinates which may be slightly
// offset from the ORS-routed path.
function snapToRoute(refLat, refLon, routePoints) {
  if (!routePoints?.length) return [refLat, refLon]
  let minSq = Infinity
  let bestLat = refLat
  let bestLon = refLon
  for (const p of routePoints) {
    const dlat = refLat - p.lat
    const dlon = refLon - p.lon
    const sq = dlat * dlat + dlon * dlon
    if (sq < minSq) {
      minSq = sq
      bestLat = p.lat
      bestLon = p.lon
    }
  }
  return [bestLat, bestLon]
}

function FitBounds({ positions }) {
  const map = useMap()
  // Stable positions reference (memoised in parent) — effect only fires on mount
  // or when the route genuinely changes, preventing the re-fit loop that occurred
  // when every render created a new array reference.
  useEffect(() => {
    if (positions?.length > 1) map.fitBounds(positions, { padding: [40, 40] })
  }, [map, positions])
  return null
}

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

function RouteAnalysisMap({
  tramos,
  coordinates,
  references,
  densePoints,
  indications,
  visibleLayers,
  onToggleLayer,
  indicationsLoading,
}) {
  // useMemo BEFORE the early return — rules of hooks require unconditional calls.
  // Memoising allPositions means FitBounds sees a stable reference and its
  // useEffect only fires when the coordinate array itself changes (new route),
  // not on every parent re-render.
  const allPositions = useMemo(
    () => (coordinates || []).map((c) => [c.lat, c.lon]),
    [coordinates],
  )

  if (!coordinates?.length) return null

  const tramoPositions = tramos?.length ? buildTramoPositions(tramos, coordinates) : []

  // Only render refs with a known type and valid finite coordinates
  const inputRefs = (references || []).filter(
    (r) => r && REF_COLOR[r.type] && isFinite(r.lat) && isFinite(r.lon)
  )

  const indicationCounts = countByType(indications)

  const indicationsByType = (indications || []).reduce((acc, ind) => {
    if (!acc[ind.type]) acc[ind.type] = []
    acc[ind.type].push(ind)
    return acc
  }, {})

  const showLayerPanel =
    (indications?.length > 0 || indicationsLoading) && visibleLayers && onToggleLayer

  return (
    <>
      <div style={{ position: 'relative' }}>
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

          {/* Full-route grey polyline */}
          <Polyline positions={allPositions} color="#9ca3af" weight={2} opacity={0.45} />

          {/* Coloured per-tramo polylines */}
          {tramos?.map((tramo, i) => (
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
          {tramos?.map((tramo) => (
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

          {/* Reference markers — snapped to the nearest dense-route point so
              casetas, paraderos, gasolineras and rampas sit exactly on the road */}
          {inputRefs.map((ref, i) => {
            const [lat, lon] = snapToRoute(ref.lat, ref.lon, densePoints)
            return (
              <Marker
                key={`ref-${i}`}
                position={[lat, lon]}
                icon={createRefIcon(ref.type)}
              >
                <Popup>
                  <strong>{ref.name}</strong><br />
                  <span style={{ textTransform: 'capitalize' }}>{REF_LABEL[ref.type]}</span>
                </Popup>
              </Marker>
            )
          })}

          {/* Auto-extracted indication layers, one LayerGroup per type */}
          {Object.entries(indicationsByType).map(([type, items]) =>
            visibleLayers?.has(type) ? (
              <LayerGroup key={type}>
                {items
                  .filter((ind) => isFinite(ind.lat) && isFinite(ind.lon))
                  .map((ind, i) => (
                    <Marker
                      key={`ind-${type}-${i}`}
                      position={[ind.lat, ind.lon]}
                      icon={createIndicationIcon(type)}
                    >
                      <Popup>
                        <strong>{ind.label}</strong><br />
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          {INDICATION_TYPES[type]?.label}
                        </span>
                        {ind.metadata?.maxspeed && (
                          <><br /><span>Límite: {ind.metadata.maxspeed} km/h</span></>
                        )}
                      </Popup>
                    </Marker>
                  ))}
              </LayerGroup>
            ) : null
          )}
        </MapContainer>

        {showLayerPanel && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 9999,
            pointerEvents: 'all',
          }}>
            <MapLayerControls
              visibleLayers={visibleLayers}
              onToggle={onToggleLayer}
              indicationCounts={indicationCounts}
              loading={indicationsLoading}
            />
          </div>
        )}
      </div>

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
