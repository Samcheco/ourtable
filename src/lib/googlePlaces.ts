const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_KEY || ''

export function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.google?.maps?.places) { resolve(); return }
    // Script already in DOM, wait for it
    const existing = document.getElementById('gmp-script')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.id = 'gmp-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`
    script.async = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export interface PlaceResult {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  photoUrls: string[]
}

export function attachAutocomplete(
  input: HTMLInputElement,
  onSelect: (place: PlaceResult) => void,
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google
  const ac = new g.maps.places.Autocomplete(input, {
    types: ['establishment'],
    fields: ['place_id', 'name', 'formatted_address', 'geometry', 'photos'],
  })
  const listener = ac.addListener('place_changed', () => {
    const place = ac.getPlace()
    if (!place.geometry?.location) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const photoUrls = (place.photos || []).slice(0, 3).map((p: any) =>
      p.getUrl({ maxWidth: 800, maxHeight: 600 })
    )
    onSelect({
      placeId: place.place_id || '',
      name: place.name || '',
      address: place.formatted_address || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      photoUrls,
    })
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return () => (window as any).google?.maps?.event?.removeListener(listener)
}

export const isGoogleConfigured = () => Boolean(API_KEY)

export interface NearbyPlace {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number
  priceLevel: 1 | 2 | 3 | 4
  photoUrl: string
  types: string[]
}

// Returns well-regarded restaurants near a coordinate, sorted by prominence
export async function searchNearbyRestaurants(lat: number, lng: number): Promise<NearbyPlace[]> {
  await loadGoogleMaps()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google
  const div = document.createElement('div')
  const service = new g.maps.places.PlacesService(div)

  return new Promise((resolve) => {
    service.nearbySearch({
      location: { lat, lng },
      radius: 10000,
      type: 'restaurant',
      rankBy: g.maps.places.RankBy.PROMINENCE,
    }, (results: any[], status: string) => {
      if (status !== g.maps.places.PlacesServiceStatus.OK || !results) {
        resolve([]); return
      }
      const places: NearbyPlace[] = results
        .filter((p: any) => p.rating >= 4.0 && p.user_ratings_total >= 200)
        .map((p: any) => ({
          placeId: p.place_id,
          name: p.name,
          address: p.vicinity || '',
          lat: p.geometry.location.lat(),
          lng: p.geometry.location.lng(),
          rating: p.rating,
          priceLevel: Math.max(1, Math.min(4, p.price_level || 2)) as 1|2|3|4,
          photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 600, maxHeight: 400 }) || '',
          types: p.types || [],
        }))
      resolve(places)
    })
  })
}

// Reverse geocode lat/lng to a human-readable city name
export async function reverseGeocodeCity(lat: number, lng: number): Promise<string> {
  await loadGoogleMaps()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google
  const geocoder = new g.maps.Geocoder()
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status !== 'OK' || !results?.length) { resolve('Unknown City'); return }
      // Find the locality (city) component
      for (const result of results) {
        const locality = result.address_components?.find((c: any) =>
          c.types.includes('locality')
        )
        if (locality) { resolve(locality.long_name); return }
      }
      // Fallback to sublocality or neighborhood
      const fallback = results[0]?.address_components?.find((c: any) =>
        c.types.includes('sublocality') || c.types.includes('neighborhood')
      )
      resolve(fallback?.long_name || 'Unknown City')
    })
  })
}
