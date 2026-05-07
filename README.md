# Trip Planner

A React application for planning trips with route visualization and ELD log generation.

## Features

- Input trip details with autocomplete for locations
- Display route on map using OpenStreetMap
- Generate ELD daily log sheets

## Getting Started

1. Install dependencies: `npm install`
2. Get a free API key from https://openrouteservice.org/
3. Replace `ORS_API_KEY` in `src/App.jsx` with your API key
4. Run the development server: `npm run dev`
5. Open [http://localhost:5173](http://localhost:5173) in your browser.
6. Start typing in location fields for autocomplete suggestions

## APIs Used

- OpenRouteService for geocoding, autocomplete, and routing (free tier - API key required)
- Leaflet with OpenStreetMap for map display
- Leaflet with OpenStreetMap for map display

**Note:** Replace `ORS_API_KEY` in `App.jsx` with your actual OpenRouteService API key. If API fails, a sample US cross-country route will be shown for demo purposes.

## Build

`npm run build`

## Preview

`npm run preview`
