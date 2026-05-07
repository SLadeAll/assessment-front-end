import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Pin markers (start / pickup / dropoff) ────────────────────────────────────
const createPinMarker = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:18px;height:18px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.45);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -20],
  })

// ── Square markers (fuel / rest stops) ───────────────────────────────────────
const createSquareMarker = (bg, letter) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};
      width:22px;height:22px;
      border-radius:5px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:12px;font-family:system-ui,sans-serif;
      line-height:1;
    ">${letter}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  })

const startIcon    = createPinMarker('#22c55e')
const pickupIcon   = createPinMarker('#f59e0b')
const dropoffIcon  = createPinMarker('#ef4444')
const fuelStopIcon = createSquareMarker('#f97316', 'F')
const restStopIcon = createSquareMarker('#0ea5e9', 'R')

// ── Auto-fit helper ───────────────────────────────────────────────────────────
function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] })
    } else if (bounds && bounds.length === 1) {
      map.setView(bounds[0], 13)
    }
  }, [map, bounds])
  return null
}

// ── Coordinate helpers ────────────────────────────────────────────────────────
const toLatLng = (coord) =>
  coord &&
  coord.length === 2 &&
  coord[1] >= -90 && coord[1] <= 90 &&
  coord[0] >= -180 && coord[0] <= 180
    ? [coord[1], coord[0]]
    : null

// ── Component ─────────────────────────────────────────────────────────────────
function TripMap({ route }) {
  const mexicoCenter = [23.6345, -102.5528]

  if (!route || !route.coordinates || route.coordinates.length === 0) {
    return (
      <MapContainer center={mexicoCenter} zoom={5} style={{ height: '450px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={mexicoCenter}><Popup>Mexico</Popup></Marker>
      </MapContainer>
    )
  }

  // ORS returns [lon, lat]; Leaflet needs [lat, lon]
  const latlngs = route.coordinates
    .map(coord => [coord[1], coord[0]])
    .filter(([lat, lng]) => lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)

  const center = latlngs.length > 0 ? latlngs[0] : mexicoCenter

  const startPos   = toLatLng(route.start)
  const pickupPos  = toLatLng(route.pickup)
  const dropoffPos = toLatLng(route.dropoff)

  return (
    <>
      <MapContainer
        key={`route-${route.start}-${route.dropoff}`}
        center={center}
        zoom={7}
        style={{ height: '450px', width: '100%', borderRadius: '10px' }}
      >
        <FitBounds bounds={latlngs} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Route line */}
        <Polyline positions={latlngs} color="#3b82f6" weight={5} opacity={0.85} />

        {/* Waypoint markers */}
        {startPos && (
          <Marker position={startPos} icon={startIcon}>
            <Popup><strong>Current Location</strong></Popup>
          </Marker>
        )}
        {pickupPos && (
          <Marker position={pickupPos} icon={pickupIcon}>
            <Popup><strong>Pickup Location</strong></Popup>
          </Marker>
        )}
        {dropoffPos && (
          <Marker position={dropoffPos} icon={dropoffIcon}>
            <Popup><strong>Dropoff Location</strong></Popup>
          </Marker>
        )}

        {/* Fuel stops — every 1 000 miles */}
        {route.fuelStops?.map((stop, i) => {
          const pos = toLatLng(stop.coord)
          return pos ? (
            <Marker key={`fuel-${i}`} position={pos} icon={fuelStopIcon}>
              <Popup>
                <strong>Fuel Stop {i + 1}</strong><br />
                {stop.label} — refuel required
              </Popup>
            </Marker>
          ) : null
        })}

        {/* Rest stops — every 8 hours */}
        {route.restStops?.map((stop, i) => {
          const pos = toLatLng(stop.coord)
          return pos ? (
            <Marker key={`rest-${i}`} position={pos} icon={restStopIcon}>
              <Popup>
                <strong>Rest Stop {i + 1}</strong><br />
                {stop.label} of driving — mandatory rest
              </Popup>
            </Marker>
          ) : null
        })}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-pin" style={{ background: '#22c55e' }} />
          <span>Start</span>
        </div>
        <div className="legend-item">
          <span className="legend-pin" style={{ background: '#f59e0b' }} />
          <span>Pickup</span>
        </div>
        <div className="legend-item">
          <span className="legend-pin" style={{ background: '#ef4444' }} />
          <span>Dropoff</span>
        </div>
        <div className="legend-item">
          <span className="legend-square" style={{ background: '#f97316' }} />
          <span>Fuel Stop (every 1,000 mi)</span>
        </div>
        <div className="legend-item">
          <span className="legend-square" style={{ background: '#0ea5e9' }} />
          <span>Rest Stop (every 8 hrs)</span>
        </div>
      </div>
    </>
  )
}

export default TripMap
