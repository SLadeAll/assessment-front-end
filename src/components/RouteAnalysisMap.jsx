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

const REF_COLOR  = { caseta: '#ef4444', paradero: '#0ea5e9', gasolinera: '#f97316', rampa: '#8b5cf6', seguimiento: '#475569' }
const REF_LETTER = { caseta: 'C',       paradero: 'P',       gasolinera: 'G',       rampa: 'R',       seguimiento: '' }
const REF_LABEL  = { caseta: 'Caseta',  paradero: 'Paradero', gasolinera: 'Gasolinera', rampa: 'Rampa', seguimiento: 'Punto de control' }

const EMRG_CATS = [
  { key: 'ambulancia',       label: 'Ambulancia / Cruz Roja' },
  { key: 'guardia_caminos',  label: 'Guardia de Caminos' },
  { key: 'guardia_nacional', label: 'Guardia Nacional' },
  { key: 'policia_estatal',  label: 'Policía Estatal' },
]

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
  if (type === 'seguimiento') {
    return L.divIcon({
      className: '',
      html: `<div style="background:${bg};width:9px;height:9px;
        border-radius:50%;border:2px solid rgba(255,255,255,0.85);
        box-shadow:0 1px 4px rgba(0,0,0,0.45);opacity:0.85;
      "></div>`,
      iconSize: [9, 9], iconAnchor: [4, 4], popupAnchor: [0, -7],
    })
  }
  return L.divIcon({
    className: '',
    html: `<div style="background:${bg};color:white;width:22px;height:22px;
      border-radius:6px;border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:12px;font-family:system-ui,sans-serif;line-height:1;
    ">${ltr}</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13],
  })
}

const createKmIcon = (km) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;gap:2px;">
      <div style="width:5px;height:5px;background:rgba(30,30,30,0.85);border-radius:50%;flex-shrink:0;border:1px solid white;"></div>
      <div style="background:rgba(30,30,30,0.75);color:#fff;padding:1px 4px;border-radius:2px;font-size:8px;font-weight:700;font-family:monospace;white-space:nowrap;">km&nbsp;${km}</div>
    </div>`,
    iconSize: [54, 14],
    iconAnchor: [3, 7],
  })

const createIndicationIcon = (type) => {
  const meta = INDICATION_TYPES[type] || { icon: '?', color: '#6b7280' }
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${meta.color};color:white;
      width:14px;height:14px;border-radius:3px;
      border:1.5px solid rgba(255,255,255,0.85);
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:9px;font-family:system-ui,sans-serif;
      line-height:1;opacity:0.9;
    ">${meta.icon}</div>`,
    iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -9],
  })
}

// Snap a reference marker to the nearest point in routePoints.
// Returns [lat, lon, nearestIndex] — callers that only need lat/lon can
// destructure as const [lat, lon] = snapToRoute(...) safely.
function snapToRoute(refLat, refLon, routePoints) {
  if (!routePoints?.length) return [refLat, refLon, -1]
  let minSq = Infinity, bestIdx = 0, bestLat = refLat, bestLon = refLon
  for (let i = 0; i < routePoints.length; i++) {
    const p = routePoints[i]
    const sq = (refLat - p.lat) ** 2 + (refLon - p.lon) ** 2
    if (sq < minSq) { minSq = sq; bestIdx = i; bestLat = p.lat; bestLon = p.lon }
  }
  return [bestLat, bestLon, bestIdx]
}

function FitBounds({ positions }) {
  const map = useMap()
  useEffect(() => {
    if (positions?.length > 1) map.fitBounds(positions, { padding: [40, 40] })
  }, [map, positions])
  return null
}

// Build per-tramo polyline positions via nearest-neighbor search in routePts.
// When routePts = densePoints (full ORS geometry), each tramo segment traces
// every bend in the road instead of drawing a straight line.
function buildTramoPositions(tramos, routePts) {
  if (!routePts?.length) {
    return (tramos || []).map(t => [
      [t.posicion_inicial.lat, t.posicion_inicial.lon],
      [t.posicion_final.lat,   t.posicion_final.lon],
    ])
  }
  const nearestIdx = (lat, lon) => {
    let minSq = Infinity, best = 0
    for (let i = 0; i < routePts.length; i++) {
      const p = routePts[i]
      const sq = (lat - p.lat) ** 2 + (lon - p.lon) ** 2
      if (sq < minSq) { minSq = sq; best = i }
    }
    return best
  }
  return (tramos || []).map(t => {
    const si = nearestIdx(t.posicion_inicial.lat, t.posicion_inicial.lon)
    const ei = nearestIdx(t.posicion_final.lat,   t.posicion_final.lon)
    if (si >= ei) return [
      [t.posicion_inicial.lat, t.posicion_inicial.lon],
      [t.posicion_final.lat,   t.posicion_final.lon],
    ]
    return routePts.slice(si, ei + 1).map(p => [p.lat, p.lon])
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
  // All useMemo calls BEFORE the early return — rules of hooks.
  const allPositions = useMemo(() => {
    const pts = densePoints?.length ? densePoints : coordinates
    return (pts || []).map(c => [c.lat, c.lon])
  }, [densePoints, coordinates])

  // Memoised so the O(T * N) nearest-neighbour pass only runs when the
  // route or tramo segmentation actually changes.
  const tramoPositions = useMemo(() => {
    if (!tramos?.length) return []
    const pts = densePoints?.length ? densePoints : coordinates
    return buildTramoPositions(tramos, pts)
  }, [tramos, densePoints, coordinates])

  // Cumulative km array — one entry per densePoint, used by MapClickHandler.
  const { cumKm, totalKm } = useMemo(() => {
    if (!densePoints?.length) return { cumKm: [], totalKm: 0 }
    const cumKm = [0]
    for (let i = 1; i < densePoints.length; i++) {
      const p = densePoints[i], q = densePoints[i - 1]
      const dlat = (p.lat - q.lat) * 111
      const dlon = (p.lon - q.lon) * 111 * Math.cos(q.lat * Math.PI / 180)
      cumKm.push(cumKm[i - 1] + Math.sqrt(dlat * dlat + dlon * dlon))
    }
    return { cumKm, totalKm: cumKm[cumKm.length - 1] }
  }, [densePoints])

  // Maps each tramo's km-start position to its emergency contacts dict.
  const tramoKmRanges = useMemo(() => {
    if (!tramos?.length || !cumKm.length || !densePoints?.length) return []
    return tramos
      .map(t => {
        const [,, idx] = snapToRoute(t.posicion_inicial.lat, t.posicion_inicial.lon, densePoints)
        return {
          kmStart:          idx >= 0 ? cumKm[idx] : 0,
          contacts:         t.emergency_contacts          || null,
          carretera:        t.carretera                   || null,
          kmEnCarretera:    t.km_en_carretera             ?? null,
          kmApprox:         t.km_en_carretera_approx      ?? true,
        }
      })
      .sort((a, b) => a.kmStart - b.kmStart)
  }, [tramos, cumKm, densePoints])

  // One small label every 50 km along the route.
  const kmMarkers = useMemo(() => {
    if (!densePoints?.length) return []
    const marks = []
    let cumKm = 0
    let nextTarget = 50
    for (let i = 1; i < densePoints.length; i++) {
      const p = densePoints[i], q = densePoints[i - 1]
      const dlat = (p.lat - q.lat) * 111
      const dlon = (p.lon - q.lon) * 111 * Math.cos(q.lat * Math.PI / 180)
      cumKm += Math.sqrt(dlat * dlat + dlon * dlon)
      if (cumKm >= nextTarget) {
        marks.push({ lat: p.lat, lon: p.lon, km: Math.round(cumKm) })
        nextTarget += 50
      }
    }
    return marks
  }, [densePoints])

  if (!coordinates?.length) return null

  const inputRefs = (references || []).filter(
    r => r && REF_COLOR[r.type] && isFinite(r.lat) && isFinite(r.lon)
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
          style={{ height: '520px', width: '100%', borderRadius: '10px' }}
        >
          <FitBounds positions={allPositions} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Grey background polyline following actual road geometry */}
          <Polyline positions={allPositions} color="#9ca3af" weight={2} opacity={0.4} />

          {/* Per-tramo coloured polylines — road-following via densePoints */}
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

          {/* Km distance labels every 50 km */}
          {kmMarkers.map(m => (
            <Marker key={`km-${m.km}`} position={[m.lat, m.lon]} icon={createKmIcon(m.km)} />
          ))}

          {/* Tramo-start number markers */}
          {tramos?.map(tramo => (
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

          {/* Reference markers — snapped to the nearest dense-route point.
              Puntos de control (seguimiento) show km from start / to end. */}
          {inputRefs.map((ref, i) => {
            const [lat, lon, nearIdx] = snapToRoute(ref.lat, ref.lon, densePoints)

            if (ref.type === 'seguimiento' && nearIdx >= 0 && cumKm.length) {
              const fromStart = Math.round(cumKm[nearIdx])
              const toEnd     = Math.round(totalKm - cumKm[nearIdx])
              const total     = Math.round(totalKm)

              // Find the tramo that contains this km position (emergency contacts + carretera)
              let contacts = null, carretera = null, kmEnCarretera = null, kmApprox = true
              if (tramoKmRanges.length) {
                contacts      = tramoKmRanges[0].contacts
                carretera     = tramoKmRanges[0].carretera
                kmEnCarretera = tramoKmRanges[0].kmEnCarretera
                kmApprox      = tramoKmRanges[0].kmApprox
                for (const r of tramoKmRanges) {
                  if (r.kmStart <= fromStart) {
                    contacts = r.contacts; carretera = r.carretera
                    kmEnCarretera = r.kmEnCarretera; kmApprox = r.kmApprox
                  } else break
                }
              }

              return (
                <Marker key={`ref-${i}`} position={[lat, lon]} icon={createRefIcon(ref.type)}>
                  <Popup>
                    <div style={{ minWidth: '260px', lineHeight: '1.5' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#0f172a' }}>
                        {ref.name}
                      </div>

                      {/* Carretera + km en la vía */}
                      {carretera && (
                        <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: '#374151' }}>Carretera: </span>
                          <strong style={{ color: '#0f172a' }}>
                            {carretera}
                            {kmEnCarretera !== null && (
                              <span style={{ color: kmApprox ? '#b45309' : '#059669', marginLeft: '6px' }}>
                                · {kmApprox ? '~' : ''}Km {Math.round(kmEnCarretera)}
                              </span>
                            )}
                          </strong>
                        </div>
                      )}

                      {/* km info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#374151' }}>Desde el inicio</span>
                        <strong style={{ color: '#1d4ed8' }}>{fromStart} km</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#374151' }}>Hasta el final</span>
                        <strong style={{ color: '#dc2626' }}>{toEnd} km</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right', marginBottom: '6px' }}>
                        Total ruta: {total} km
                      </div>

                      {/* Emergency contacts */}
                      {contacts && (
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '6px' }}>
                          <div style={{
                            fontSize: '10px', fontWeight: 700, color: '#dc2626',
                            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px',
                          }}>
                            Emergencias — {contacts.estado}
                          </div>
                          {EMRG_CATS.map(({ key, label }) => {
                            const entries = (contacts[key] || []).slice(0, 2)
                            if (!entries.length) return null
                            return (
                              <div key={key} style={{ marginBottom: '5px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', marginBottom: '1px' }}>
                                  {label}
                                </div>
                                {entries.map((e, ei) => (
                                  <div key={ei} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', gap: '8px' }}>
                                    <span style={{ color: '#374151', flex: 1 }}>{e.nombre}</span>
                                    <strong style={{ color: '#1d4ed8', whiteSpace: 'nowrap' }}>{e.telefono}</strong>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            }

            return (
              <Marker key={`ref-${i}`} position={[lat, lon]} icon={createRefIcon(ref.type)}>
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
                  .filter(ind => isFinite(ind.lat) && isFinite(ind.lon))
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
            position: 'absolute', top: '10px', right: '10px',
            zIndex: 9999, pointerEvents: 'all',
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

      <p style={{ fontSize: '11px', color: '#6b7280', margin: '6px 0 4px', textAlign: 'right' }}>
        Haz clic en un <strong>Punto de control</strong> para ver los km desde el inicio y los que faltan
      </p>
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
            {type === 'seguimiento'
              ? <span style={{ display: 'inline-block', width: 9, height: 9, background: color, borderRadius: '50%', flexShrink: 0, opacity: 0.85, border: '2px solid rgba(255,255,255,0.85)' }} />
              : <span className="legend-square" style={{ background: color }} />
            }
            <span>{REF_LABEL[type]}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default RouteAnalysisMap
