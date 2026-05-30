import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getRestaurants, getVisits, getReviews } from '../lib/storage'

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function MapView() {
  const restaurants = useMemo(() => getRestaurants().filter(r => r.lat && r.lng), [])
  const visits = useMemo(() => getVisits(), [])
  const reviews = useMemo(() => getReviews(), [])

  const enriched = useMemo(() => restaurants.map(r => {
    const rVisits = visits.filter(v => v.restaurant_id === r.id)
    const rReviews = reviews.filter(rv => rVisits.some(v => v.id === rv.visit_id))
    const avg = rReviews.length ? rReviews.reduce((s, x) => s + x.overall_rating, 0) / rReviews.length : null
    return { ...r, avg, visitCount: rVisits.length }
  }), [restaurants, visits, reviews])

  const center: [number, number] = enriched.length
    ? [enriched.reduce((s, r) => s + r.lat, 0) / enriched.length, enriched.reduce((s, r) => s + r.lng, 0) / enriched.length]
    : [40.7128, -74.006]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-['Playfair_Display'] text-3xl font-bold text-stone-800 mb-6">Map</h1>
      <div className="rounded-2xl overflow-hidden shadow-sm border border-amber-50" style={{ height: '600px' }}>
        <MapContainer center={center} zoom={enriched.length ? 13 : 12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {enriched.map(r => (
            <Marker key={r.id} position={[r.lat, r.lng]}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold text-stone-800">{r.name}</div>
                  <div className="text-stone-500 text-xs">{r.cuisine} · {'$'.repeat(r.price_range)}</div>
                  {r.avg && <div className="text-amber-600 text-xs mt-1">{'⭐'.repeat(Math.round(r.avg))} ({r.avg.toFixed(1)})</div>}
                  <div className="text-stone-400 text-xs">{r.visitCount} visit{r.visitCount !== 1 ? 's' : ''}</div>
                  <Link to={`/restaurants/${r.id}`} className="text-amber-600 hover:underline text-xs block mt-1">View →</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {enriched.length === 0 && (
        <p className="text-center text-stone-400 mt-4 text-sm">No restaurants with location data yet. Add some visits to see them on the map!</p>
      )}
    </div>
  )
}
