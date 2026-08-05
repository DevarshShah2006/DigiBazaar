import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './RouteMap.css'

const FALLBACK_COORD = { lat: 23.0125, lon: 72.5575 }

const normalizePoint = (p) => {
  if (!p) return null
  const lat = Number(p?.lat ?? p?.latitude)
  const lon = Number(p?.lon ?? p?.long ?? p?.longitude ?? p?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat, lon }
}

const buildMarker = (icon, color) =>
  L.divIcon({
    className: 'route-map-marker',
    html: `<span style="--marker-color:${color || '#0891b2'}">${icon || '📍'}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  })

async function fetchRoute(origin, destination) {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson&steps=false&annotations=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Route request failed')
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found')
  }
  const route = data.routes[0]
  return {
    coordinates: route.geometry.coordinates,
    distanceKm: route.distance / 1000,
    durationMin: Math.round(route.duration / 60),
  }
}

function RouteMap({ origin, destination, rider, height = 320, showSummary = true, className = '' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const routeLayerRef = useRef(null)
  const originMarkerRef = useRef(null)
  const destinationMarkerRef = useRef(null)
  const riderMarkerRef = useRef(null)
  const [routeMeta, setRouteMeta] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  const from = normalizePoint(origin)
  const to = normalizePoint(destination)
  const riderPos = normalizePoint(rider)

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [from?.lat ?? FALLBACK_COORD.lat, from?.lon ?? FALLBACK_COORD.lon],
      zoom: 13,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    mapRef.current = map
    routeLayerRef.current = L.polyline([], { color: '#0891b2', weight: 5, opacity: 0.9 }).addTo(map)

    const a = from ?? to ?? FALLBACK_COORD
    originMarkerRef.current = L.marker([a.lat, a.lon], {
      icon: buildMarker(origin?.icon || '🛒', origin?.color),
    }).addTo(map)
    originMarkerRef.current.bindPopup(String(origin?.label || 'Shop'))

    destinationMarkerRef.current = L.marker([a.lat, a.lon], {
      icon: buildMarker(destination?.icon || '🏠', destination?.color),
    }).addTo(map)
    destinationMarkerRef.current.bindPopup(String(destination?.label || 'Home'))

    riderMarkerRef.current = L.marker([a.lat, a.lon], {
      icon: buildMarker('🛵', '#6366f1'),
    }).addTo(map)
    riderMarkerRef.current.bindPopup('Rider (You)')

    map.setView([a.lat, a.lon], 13)

    return () => {
      map.remove()
      mapRef.current = null
      routeLayerRef.current = null
      originMarkerRef.current = null
      destinationMarkerRef.current = null
      riderMarkerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fromLat = from?.lat
  const fromLon = from?.lon
  const toLat = to?.lat
  const toLon = to?.lon
  const riderLat = riderPos?.lat
  const riderLon = riderPos?.lon

  // Update markers + route whenever coordinates change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const a = from ?? FALLBACK_COORD
    const b = to ?? a

    if (originMarkerRef.current) {
      originMarkerRef.current.setLatLng([a.lat, a.lon])
      originMarkerRef.current.setIcon(buildMarker(origin?.icon || '🛒', origin?.color))
      originMarkerRef.current.setPopupContent(String(origin?.label || 'Shop'))
    }

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setLatLng([b.lat, b.lon])
      destinationMarkerRef.current.setIcon(buildMarker(destination?.icon || '🏠', destination?.color))
      destinationMarkerRef.current.setPopupContent(String(destination?.label || 'Home'))
    }

    if (riderMarkerRef.current) {
      if (riderPos) {
        riderMarkerRef.current.setLatLng([riderLat, riderLon])
        riderMarkerRef.current.setPopupContent('Rider (You)')
        if (!map.hasLayer(riderMarkerRef.current)) riderMarkerRef.current.addTo(map)
      } else if (map.hasLayer(riderMarkerRef.current)) {
        map.removeLayer(riderMarkerRef.current)
      }
    }

    // Fit bounds of the two points
    const bounds = L.latLngBounds([[a.lat, a.lon], [b.lat, b.lon]])
    if (riderPos) bounds.extend([riderLat, riderLon])

    // Reset route state
    setRouteMeta(null)
    if (routeLayerRef.current) routeLayerRef.current.setLatLngs([])

    if (a === b) {
      map.fitBounds(bounds, { padding: [40, 40] })
      return
    }

    let cancelled = false
    setRouteLoading(true)

    fetchRoute(a, b)
      .then((route) => {
        if (cancelled || !routeLayerRef.current) return
        routeLayerRef.current.setLatLngs(route.coordinates.map(([lon, lat]) => [lat, lon]))
        const routeBounds = L.latLngBounds(route.coordinates.map(([lon, lat]) => [lat, lon]))
        if (riderPos) routeBounds.extend([riderLat, riderLon])
        map.fitBounds(routeBounds, { padding: [40, 40] })
        setRouteMeta({ distanceKm: route.distanceKm, durationMin: route.durationMin })
      })
      .catch(() => {
        if (cancelled) return
        // Straight-line fallback so the map still shows the connection
        if (routeLayerRef.current) {
          routeLayerRef.current.setLatLngs([[a.lat, a.lon], [b.lat, b.lon]])
          routeLayerRef.current.setStyle({ color: '#0891b2', weight: 3, dashArray: '8,8' })
        }
        map.fitBounds(bounds, { padding: [40, 40] })
        setRouteMeta({ distanceKm: null, durationMin: null })
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLat, fromLon, toLat, toLon, riderLat, riderLon])

  return (
    <div className={`route-map-wrap ${className}`}>
      <div ref={containerRef} className="route-map-canvas" style={{ height }} />
      {showSummary && (from || to) && (
        <div className="route-map-summary">
          {routeLoading ? (
            <span className="route-map-summary-muted">Calculating route…</span>
          ) : routeMeta?.distanceKm != null ? (
            <span>
              <strong>{(routeMeta.distanceKm).toFixed(1)} km</strong> · approx{' '}
              <strong>{routeMeta.durationMin} min</strong> delivery route
            </span>
          ) : (
            <span className="route-map-summary-muted">
              {origin?.label || 'Shop'} → {destination?.label || 'Home'} (route unavailable)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default RouteMap
