import { useState } from 'react'
import axios from 'axios'

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjMxZDk5OTJjNGM5MDRkMWE5M2ExYzhjZGU0OTljZDhmIiwiaCI6Im11cm11cjY0In0=' // Free API key, replace with your own

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
    setError('')
    onPlanTrip({
      currentLocation,
      pickupLocation,
      dropoffLocation,
      currentCycleUsed: parseFloat(currentCycleUsed)
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
          placeholder="e.g. 4"
          min="0"
          max="70"
          value={currentCycleUsed}
          onChange={(e) => setCurrentCycleUsed(e.target.value)}
        />
      </div>

      <button onClick={handlePlanTrip} disabled={loading} style={{ marginTop: '8px' }}>
        {loading ? 'Planning...' : 'Plan Trip'}
      </button>
    </div>
  )
}

export default TripForm