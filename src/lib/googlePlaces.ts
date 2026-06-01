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

// Map Google place types → readable cuisine label
const TYPE_TO_CUISINE: Record<string, string> = {
  american_restaurant: 'American', bakery: 'Bakery', bar: 'Bar',
  barbecue_restaurant: 'BBQ', brazilian_restaurant: 'Brazilian',
  breakfast_restaurant: 'Breakfast', brunch_restaurant: 'Brunch',
  cafe: 'Café', chinese_restaurant: 'Chinese', coffee_shop: 'Coffee',
  fast_food_restaurant: 'Fast Food', french_restaurant: 'French',
  greek_restaurant: 'Greek', hamburger_restaurant: 'Burgers',
  indian_restaurant: 'Indian', indonesian_restaurant: 'Indonesian',
  italian_restaurant: 'Italian', japanese_restaurant: 'Japanese',
  korean_restaurant: 'Korean', latin_american_restaurant: 'Latin American',
  lebanese_restaurant: 'Lebanese', mediterranean_restaurant: 'Mediterranean',
  mexican_restaurant: 'Mexican', middle_eastern_restaurant: 'Middle Eastern',
  pizza_restaurant: 'Pizza', ramen_restaurant: 'Ramen',
  sandwich_shop: 'Sandwiches', seafood_restaurant: 'Seafood',
  spanish_restaurant: 'Spanish', sushi_restaurant: 'Sushi',
  steakhouse: 'Steakhouse', thai_restaurant: 'Thai',
  turkish_restaurant: 'Turkish', vegan_restaurant: 'Vegan',
  vietnamese_restaurant: 'Vietnamese',
}

export function inferCuisine(types: string[]): string {
  for (const t of types) {
    if (TYPE_TO_CUISINE[t]) return TYPE_TO_CUISINE[t]
  }
  return 'Restaurant'
}

export interface PlaceDetails {
  photos: string[]
  reviews: { author: string; rating: number; text: string }[]
  openNow?: boolean
  website?: string
  phone?: string
  editorialSummary?: string
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  await loadGoogleMaps()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google
  const div = document.createElement('div')
  const service = new g.maps.places.PlacesService(div)

  return new Promise((resolve) => {
    service.getDetails({
      placeId,
      fields: ['photos', 'reviews', 'opening_hours', 'website', 'formatted_phone_number', 'editorial_summary'],
    }, (place: any, status: string) => {
      if (status !== g.maps.places.PlacesServiceStatus.OK || !place) {
        resolve({ photos: [], reviews: [] }); return
      }
      resolve({
        photos: (place.photos || []).slice(0, 6).map((p: any) =>
          p.getUrl({ maxWidth: 800, maxHeight: 600 })
        ),
        reviews: (place.reviews || []).slice(0, 3).map((r: any) => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
        })),
        openNow: place.opening_hours?.isOpen?.(),
        website: place.website,
        phone: place.formatted_phone_number,
        editorialSummary: place.editorial_summary?.overview,
      })
    })
  })
}

export interface NearbyPlace {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  rating: number
  userRatingsTotal: number
  priceLevel: 1 | 2 | 3 | 4
  photoUrl: string
  photoUrls: string[]
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
    const FOOD_TYPES = new Set(['restaurant', 'food', 'cafe', 'bakery', 'bar', 'meal_takeaway', 'meal_delivery'])
    const EXCLUDE_TYPES = new Set(['lodging', 'hotel', 'motel', 'spa', 'gym', 'store', 'supermarket', 'gas_station', 'shopping_mall', 'department_store', 'clothing_store', 'movie_theater', 'night_club'])

    service.nearbySearch({
      location: { lat, lng },
      radius: 10000,
      type: 'restaurant',
    }, (results: any[], status: string) => {
      if (status !== g.maps.places.PlacesServiceStatus.OK || !results) {
        resolve([]); return
      }
      const places: NearbyPlace[] = results
        .filter((p: any) =>
          p.rating >= 4.0 &&
          p.user_ratings_total >= 100 &&
          p.types?.some((t: string) => FOOD_TYPES.has(t)) &&
          !p.types?.some((t: string) => EXCLUDE_TYPES.has(t))
        )
        .sort((a: any, b: any) => (b.user_ratings_total - a.user_ratings_total))
        .map((p: any) => ({
          placeId: p.place_id,
          name: p.name,
          address: p.vicinity || '',
          lat: p.geometry.location.lat(),
          lng: p.geometry.location.lng(),
          rating: p.rating,
          userRatingsTotal: p.user_ratings_total || 0,
          priceLevel: Math.max(1, Math.min(4, p.price_level || 2)) as 1|2|3|4,
          photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 800, maxHeight: 600 }) || '',
          photoUrls: (p.photos || []).slice(0, 6).map((ph: any) => ph.getUrl({ maxWidth: 800, maxHeight: 600 })),
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
      if (status !== 'OK' || !results?.length) { resolve('Nearby'); return }
      // Search all results for the best city-level component
      const priority = ['locality', 'sublocality_level_1', 'sublocality', 'neighborhood', 'administrative_area_level_2']
      for (const type of priority) {
        for (const result of results) {
          const match = result.address_components?.find((c: any) => c.types.includes(type))
          if (match) { resolve(match.long_name); return }
        }
      }
      resolve('Nearby')
    })
  })
}
