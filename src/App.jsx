import { useState } from 'react'
import axios from 'axios'
import './App.css'
import AuthForm from './components/AuthForm'
import TripForm from './components/TripForm'
import TripMap from './components/TripMap'
import ELDLog from './components/ELDLog'

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMxZDk5OTJjNGM5MDRkMWE5M2ExYzhjZGU0OTljZDhmIiwiaCI6Im11cm11cjY0In0='

const FUEL_INTERVAL_M = 1_609.344 * 1000  // 1 000 miles in metres
const REST_INTERVAL_S = 8 * 3_600          // 8 hours in seconds

// Haversine distance between two [lon, lat] points, returns metres
const haversineDistance = (c1, c2) => {
  const R = 6_371_000
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(c2[1] - c1[1])
  const dLon = toRad(c2[0] - c1[0])
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c1[1])) * Math.cos(toRad(c2[1])) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Walk the route coordinates and place a stop every time a threshold is crossed
const calculateStops = (coordinates, totalDistM, totalDurS) => {
  if (!totalDistM || !totalDurS || coordinates.length < 2) {
    return { fuelStops: [], restStops: [] }
  }
  const avgSpeedMps = totalDistM / totalDurS
  const fuelStops = []
  const restStops = []
  let cumDist = 0
  let nextFuel = FUEL_INTERVAL_M
  let nextRest = REST_INTERVAL_S

  for (let i = 1; i < coordinates.length; i++) {
    cumDist += haversineDistance(coordinates[i - 1], coordinates[i])
    const cumTime = cumDist / avgSpeedMps

    if (cumDist >= nextFuel) {
      fuelStops.push({ coord: coordinates[i], label: `Mile ${Math.round(nextFuel / 1609.344)}` })
      nextFuel += FUEL_INTERVAL_M
    }
    if (cumTime >= nextRest) {
      restStops.push({ coord: coordinates[i], label: `Hour ${Math.round(nextRest / 3600)}` })
      nextRest += REST_INTERVAL_S
    }
  }
  return { fuelStops, restStops }
}

function App() {
  const [route, setRoute] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || '')
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('authUser')
    return saved ? JSON.parse(saved) : null
  })

  const isAuthenticated = Boolean(token)

  const handleAuthSuccess = ({ token: authToken, user: authUser }) => {
    setToken(authToken)
    setUser(authUser)
    localStorage.setItem('authToken', authToken)
    localStorage.setItem('authUser', JSON.stringify(authUser))
  }

  const handleLogout = () => {
    setToken('')
    setUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
  }

  const geocodeLocation = async (location) => {
    try {
      console.log('Geocoding location:', location)
      const response = await axios.get(`https://api.openrouteservice.org/geocode/search`, {
        params: {
          api_key: ORS_API_KEY,
          text: location,
          size: 1
        }
      })
      console.log('Geocode response data:', response.data)
      console.log('Geocode response structure:', {
        hasData: !!response.data,
        hasFeatures: !!response.data?.features,
        featuresType: typeof response.data?.features,
        featuresLength: response.data?.features?.length
      })
      
      if (!response.data) {
        throw new Error('No response data from geocoding API')
      }
      
      if (!response.data.features || !Array.isArray(response.data.features)) {
        console.warn('Features is not an array or is missing:', response.data.features)
        throw new Error(`Location not found: ${location}`)
      }
      
      if (response.data.features.length === 0) {
        throw new Error(`Location not found: ${location}`)
      }
      
      const coords = response.data.features[0].geometry?.coordinates
      if (!coords) {
        throw new Error(`No coordinates found for location: ${location}`)
      }
      console.log('Geocoded coordinates:', coords)
      return coords
    } catch (err) {
      console.error('Geocoding error:', err)
      console.error('Error response:', err.response?.data)
      throw new Error(`Geocoding failed for ${location}: ${err.message}`, { cause: err })
    }
  }

  const getRoute = async (waypoints) => {
    try {
      console.log('Requesting route for waypoints:', waypoints) // Debug log
      
      // Ensure coordinates are in [lon, lat] format
      const formattedWaypoints = waypoints.map(coord => {
        console.log('Processing coordinate:', coord)
        return [parseFloat(coord[0]), parseFloat(coord[1])]
      })
      console.log('Formatted waypoints:', formattedWaypoints)
      
      const response = await axios.post(
        `https://api.openrouteservice.org/v2/directions/driving-car/geojson?api_key=${ORS_API_KEY}`,
        { coordinates: formattedWaypoints },
        { headers: { 'Content-Type': 'application/json' } }
      )

      return response.data
    } catch (err) {
      console.error('Route API error status:', err.response?.status)
      console.error('Route API error data:', err.response?.data)
      console.error('Route API error message:', err.message)
      throw new Error(`Routing failed: ${err.message}`, { cause: err })
    }
  }

  const generateFallbackRoute = (start, pickup, dropoff) => {
    // Generate a simple synthetic route connecting the three points
    // This creates straight lines between waypoints as a fallback
    console.log('Generating fallback route')
    return [start, pickup, dropoff]
  }

  const generateLogs = (feature, tripData) => {
    const { currentLocation, pickupLocation, dropoffLocation } = tripData
    const segments = feature?.properties?.segments || []

    const toMiles = m => m / 1609.344
    const toHours = s => s / 3600

    const leg1Miles = toMiles(segments[0]?.distance || 0)
    const leg1Hours = toHours(segments[0]?.duration || 0)
    const leg2Miles = toMiles(segments[1]?.distance || 0)
    const leg2Hours = toHours(segments[1]?.duration || 0)

    // Format clock minutes → "HH:MM" or "Day N HH:MM" for multi-day trips
    const fmt = (totalMins) => {
      const day = Math.floor(totalMins / 1440) + 1
      const h = String(Math.floor(totalMins / 60) % 24).padStart(2, '0')
      const m = String(Math.round(totalMins % 60)).padStart(2, '0')
      return day > 1 ? `Day ${day} ${h}:${m}` : `${h}:${m}`
    }

    const logs = []
    let clock = 6 * 60 // trip starts at 06:00

    // Append driving rows, splitting every 8 h with a mandatory 10-h rest
    const addDriveLegs = (fromLabel, miles, hours) => {
      let timeLeft = hours
      let distLeft = miles
      let first = true
      while (timeLeft > 0.01) {
        const chunk = Math.min(timeLeft, 8)
        const distChunk = distLeft * (chunk / timeLeft)
        logs.push({
          time: fmt(clock),
          location: first ? fromLabel : 'Rest Area',
          status: 'Driving',
          miles: distChunk.toFixed(1),
          hours: chunk.toFixed(1),
        })
        clock += chunk * 60
        timeLeft -= chunk
        distLeft -= distChunk
        first = false
        if (timeLeft > 0.01) {
          logs.push({ time: fmt(clock), location: 'Rest Area', status: 'Off Duty', miles: '0', hours: '10.0' })
          clock += 10 * 60
        }
      }
    }

    // 1. Pre-trip inspection
    logs.push({ time: fmt(clock), location: currentLocation, status: 'On Duty Not Driving', miles: '0', hours: '0.5' })
    clock += 30

    // 2. Drive to pickup
    addDriveLegs(currentLocation, leg1Miles, leg1Hours)

    // 3. Loading at pickup
    logs.push({ time: fmt(clock), location: pickupLocation, status: 'On Duty Not Driving', miles: '0', hours: '1.5' })
    clock += 90

    // 4. Drive to dropoff
    addDriveLegs(pickupLocation, leg2Miles, leg2Hours)

    // 5. Unloading at dropoff
    logs.push({ time: fmt(clock), location: dropoffLocation, status: 'On Duty Not Driving', miles: '0', hours: '1.0' })
    clock += 60

    // 6. End of duty
    logs.push({ time: fmt(clock), location: dropoffLocation, status: 'Off Duty', miles: '0', hours: '0' })

    return logs
  }

  const planTrip = async (tripData) => {
    const { currentLocation, pickupLocation, dropoffLocation, currentCycleUsed } = tripData
    setLoading(true)
    setError('')
    setRoute(null)
    setLogs([])

    console.log('Planning trip for:', { currentLocation, pickupLocation, dropoffLocation }) // Debug log

    try {
      const [startCoords, pickupCoords, dropoffCoords] = await Promise.all([
        geocodeLocation(currentLocation),
        geocodeLocation(pickupLocation),
        geocodeLocation(dropoffLocation)
      ])

      console.log('Geocoded coordinates:', { startCoords, pickupCoords, dropoffCoords }) // Debug log

      if (!startCoords || !pickupCoords || !dropoffCoords) {
        throw new Error('Failed to geocode one or more locations')
      }

      const routeData = await getRoute([startCoords, pickupCoords, dropoffCoords])

      let coordinates = []

      // /geojson endpoint returns a GeoJSON FeatureCollection:
      // { type: "FeatureCollection", features: [{ geometry: { coordinates: [[lon,lat],...] } }] }
      const feature = routeData?.features?.[0]
      if (feature?.geometry?.coordinates?.length > 0) {
        coordinates = feature.geometry.coordinates
      } else {
        coordinates = generateFallbackRoute(startCoords, pickupCoords, dropoffCoords)
      }

      if (!coordinates || coordinates.length === 0) {
        throw new Error('No valid route coordinates available')
      }

      const summary = feature?.properties?.summary
      const { fuelStops, restStops } = calculateStops(
        coordinates,
        summary?.distance,
        summary?.duration
      )

      const routeObj = {
        coordinates,
        start: startCoords,
        pickup: pickupCoords,
        dropoff: dropoffCoords,
        fuelStops,
        restStops,
      }
      
      console.log('Setting route object with', coordinates.length, 'coordinates') // Debug log
      console.log('Route object:', routeObj) // Debug log
      setRoute(routeObj)
      console.log('Route has been set') // Debug log

      setLogs(generateLogs(feature, { currentLocation, pickupLocation, dropoffLocation, currentCycleUsed }))
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred'
      console.error('Trip planning error:', err)
      console.error('Error details:', {
        message: err.message,
        apiError: err.response?.data,
        cause: err.cause
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <h1>Trip Planner</h1>
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      </div>
    )
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <h1 className="navbar-brand">Trip Planner</h1>
          <div className="navbar-right">
            {user && (
              <span className="navbar-user">
                {user.username || user.email}
              </span>
            )}
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="app">
        <div className="container">
          <h2>Plan a Trip</h2>
          <TripForm onPlanTrip={planTrip} loading={loading} setError={setError} />
        </div>

        {error && <div className="error">{error}</div>}

        {route && (
          <div className="container">
            <h2>Route Map</h2>
            <TripMap route={route} />
          </div>
        )}

        {logs.length > 0 && (
          <div className="container">
            <h2>ELD Logs</h2>
            <ELDLog logs={logs} />
          </div>
        )}
      </div>
    </>
  )
}

export default App
