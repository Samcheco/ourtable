import type { NominatimResult } from '../types'

export async function searchRestaurants(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return []
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '8',
    featuretype: 'amenity',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'en', 'User-Agent': 'OurTable/1.0' },
  })
  if (!res.ok) return []
  const results: NominatimResult[] = await res.json()
  return results
}

export function formatAddress(result: NominatimResult): string {
  const parts = result.display_name.split(', ')
  return parts.slice(0, 4).join(', ')
}
