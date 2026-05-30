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
