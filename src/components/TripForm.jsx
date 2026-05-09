import { useState } from 'react'
import axios from 'axios'

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMxZDk5OTJjNGM5MDRkMWE5M2ExYzhjZGU0OTljZDhmIiwiaCI6Im11cm11cjY0In0=' // Free API key, replace with your own

const CYCLE_MAX = 70

function cycleColor(pct) {
  if (pct > 100) return '#ef4444'
  if (pct >= 86) return '#ef4444'  // 60–70 h used  → red
  if (pct >= 71) return '#f59e0b'  // 50–60 h used  → amber
  return '#22c55e'                  // 0–50 h used   → green
}

function CycleIndicator({ value }) {
  if (value === '' || value === null) return null
  const used = parseFloat(value)
  if (isNaN(used)) return null

  const pct     = Math.min((used / CYCLE_MAX) * 100, 100)
  const color   = cycleColor((used / CYCLE_MAX) * 100)
  const overLimit = used > CYCLE_MAX
  const remaining = Math.max(0, CYCLE_MAX - used)

  return (
    <div className="cycle-indicator">
      <div className="cycle-bar-track">
        <div
          className="cycle-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="cycle-remaining" style={{ color }}>
        {overLimit
          ? `Over the ${CYCLE_MAX}-hr limit — value must be ≤ ${CYCLE_MAX}`
          : `${remaining % 1 === 0 ? remaining : remaining.toFixed(1)} hrs remaining of ${CYCLE_MAX}-hr cycle`}
      </span>
    </div>
  )
}

function TripForm({ onPlanTrip, loading, setError }) {
  const [currentLocation, setCurrentLocation] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [currentCycleUsed, setCurrentCycleUsed] = useState('')
  const [currentSuggestions, setCurrentSuggestions] = useState([])
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [dropoffSuggestions, setDropoffSuggestions] = useState([])

  const getAutocompleteSuggestions = async (query) => {
    if (!query.trim() || query.length < 3) return []
    try {
      const response = await axios.get(`https://api.openrouteservice.org/geocode/autocomplete`, {
        params: {
          api_key: ORS_API_KEY,
          text: query,
          size: 5
        }
      })
      return response.data.features.map(feature => ({
        label: feature.properties.label,
        value: feature.geometry.coordinates
      }))
    } catch (err) {
      console.warn('Autocomplete failed:', err.message)
      return []
    }
  }

  const handleCurrentLocationChange = async (e) => {
    const value = e.target.value
    setCurrentLocation(value)
    const suggestions = await getAutocompleteSuggestions(value)
    if (suggestions.some(s => s.label === value)) {
      setCurrentSuggestions([])
    } else {
      setCurrentSuggestions(suggestions)
    }
  }

  const handlePickupLocationChange = async (e) => {
    const value = e.target.value
    setPickupLocation(value)
    const suggestions = await getAutocompleteSuggestions(value)
    if (suggestions.some(s => s.label === value)) {
      setPickupSuggestions([])
    } else {
      setPickupSuggestions(suggestions)
    }
  }

  const handleDropoffLocationChange = async (e) => {
    const value = e.target.value
    setDropoffLocation(value)
    const suggestions = await getAutocompleteSuggestions(value)
    if (suggestions.some(s => s.label === value)) {
      setDropoffSuggestions([])
    } else {
      setDropoffSuggestions(suggestions)
    }
  }

  const handlePlanTrip = () => {
    if (!currentLocation || !pickupLocation || !dropoffLocation || !currentCycleUsed) {
      setError('Please fill all fields')
      return
    }
    const cycleVal = parseFloat(currentCycleUsed)
    if (isNaN(cycleVal) || cycleVal < 0 || cycleVal > 70) {
      setError('Current Cycle Used must be between 0 and 70 hours')
      return
    }
    setError('')
    onPlanTrip({
      currentLocation,
      pickupLocation,
      dropoffLocation,
      currentCycleUsed: cycleVal
    })
  }

  return (
    <div className="form">
      <div className="form-field">
        <label htmlFor="current-location">Current Location</label>
        <input
          id="current-location"
          type="text"
          placeholder="e.g. Chicago, IL"
          value={currentLocation}
          onChange={handleCurrentLocationChange}
          list="current-suggestions"
        />
        <datalist id="current-suggestions">
          {currentSuggestions.map((suggestion, index) => (
            <option key={index} value={suggestion.label} />
          ))}
        </datalist>
      </div>

      <div className="form-field">
        <label htmlFor="pickup-location">Pickup Location</label>
        <input
          id="pickup-location"
          type="text"
          placeholder="e.g. Indianapolis, IN"
          value={pickupLocation}
          onChange={handlePickupLocationChange}
          list="pickup-suggestions"
        />
        <datalist id="pickup-suggestions">
          {pickupSuggestions.map((suggestion, index) => (
            <option key={index} value={suggestion.label} />
          ))}
        </datalist>
      </div>

      <div className="form-field">
        <label htmlFor="dropoff-location">Dropoff Location</label>
        <input
          id="dropoff-location"
          type="text"
          placeholder="e.g. Columbus, OH"
          value={dropoffLocation}
          onChange={handleDropoffLocationChange}
          list="dropoff-suggestions"
        />
        <datalist id="dropoff-suggestions">
          {dropoffSuggestions.map((suggestion, index) => (
            <option key={index} value={suggestion.label} />
          ))}
        </datalist>
      </div>

      <div className="form-field">
        <label htmlFor="cycle-used">Current Cycle Used (hrs)</label>
        <input
          id="cycle-used"
          type="number"
          placeholder="0 – 70"
          min="0"
          max="70"
          step="0.5"
          value={currentCycleUsed}
          onChange={(e) => setCurrentCycleUsed(e.target.value)}
        />
        <CycleIndicator value={currentCycleUsed} />
      </div>

      <button onClick={handlePlanTrip} disabled={loading} style={{ marginTop: '8px' }}>
        {loading ? 'Planning...' : 'Plan Trip'}
      </button>
    </div>
  )
}

export default TripForm