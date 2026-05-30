import type { Review, Visit, Restaurant } from '../types'

export interface PreferenceProfile {
  reviewer: 'sam' | 'olivia' | 'both'
  topCuisines: string[]           // ordered by avg rating
  preferredPriceRange: 1|2|3|4   // most common price range in high-rated places
  avgRating: number
  lovesSentiments: string[]       // 'loved', 'liked' from would_return
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

function mode(nums: number[]): number {
  if (!nums.length) return 2
  const counts = nums.reduce((acc, n) => ({ ...acc, [n]: (acc[n] || 0) + 1 }), {} as Record<number, number>)
  return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
}

export function buildProfile(
  reviewer: 'sam' | 'olivia' | 'both',
  reviews: Review[],
  visits: Visit[],
  restaurants: Restaurant[],
): PreferenceProfile {
  const filtered = reviewer === 'both' ? reviews : reviews.filter(r => r.reviewer === reviewer)

  // Map each review to its restaurant
  const withRestaurant = filtered.map(review => {
    const visit = visits.find(v => v.id === review.visit_id)
    const restaurant = restaurants.find(r => r.id === visit?.restaurant_id)
    return { review, restaurant }
  }).filter(x => x.restaurant)

  // Cuisine → avg rating
  const cuisineMap: Record<string, number[]> = {}
  withRestaurant.forEach(({ review, restaurant }) => {
    const c = restaurant!.cuisine
    if (c) {
      if (!cuisineMap[c]) cuisineMap[c] = []
      cuisineMap[c].push(review.overall_rating)
    }
  })

  const topCuisines = Object.entries(cuisineMap)
    .map(([c, ratings]) => ({ c, avg: avg(ratings) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 4)
    .map(x => x.c)

  // Preferred price range from places rated ≥ 4
  const highRatedPrices = withRestaurant
    .filter(({ review }) => review.overall_rating >= 4)
    .map(({ restaurant }) => restaurant!.price_range)
    .filter(Boolean) as number[]

  const preferredPriceRange = mode(highRatedPrices) as 1|2|3|4

  const overallAvg = avg(filtered.map(r => r.overall_rating))

  return {
    reviewer,
    topCuisines,
    preferredPriceRange,
    avgRating: overallAvg,
    lovesSentiments: ['loved', 'liked'],
  }
}

export interface PlaceRecommendation {
  id: string
  name: string
  address: string
  rating?: number
  priceLevel?: number
  photoUrl?: string
  lat: number
  lng: number
  cuisine: string  // the cuisine we searched for
}

export async function fetchRecommendations(
  profile: PreferenceProfile,
  location: { lat: number; lng: number },
  visitedNames: Set<string>,
): Promise<PlaceRecommendation[]> {
  if (!window.google?.maps?.places) return []

  const cuisines = profile.topCuisines.length
    ? profile.topCuisines
    : ['restaurant']

  const results: PlaceRecommendation[] = []

  for (const cuisine of cuisines.slice(0, 3)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { Place } = await (window.google.maps as any).importLibrary('places')
      const { places } = await Place.searchByText({
        textQuery: `${cuisine} restaurant`,
        fields: ['id', 'displayName', 'formattedAddress', 'rating', 'priceLevel', 'photos', 'location'],
        locationBias: { center: location, radius: 8000 },
        maxResultCount: 6,
      })

      for (const place of (places || [])) {
        const name: string = place.displayName || ''
        if (visitedNames.has(name.toLowerCase())) continue
        if (results.find(r => r.id === place.id)) continue

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const photoUrl = place.photos?.[0]?.getURI?.({ maxWidth: 400, maxHeight: 300 }) as string | undefined

        results.push({
          id: place.id || '',
          name,
          address: place.formattedAddress || '',
          rating: place.rating,
          priceLevel: place.priceLevel,
          photoUrl,
          lat: place.location?.lat() ?? 0,
          lng: place.location?.lng() ?? 0,
          cuisine,
        })
      }
    } catch {
      // skip failed cuisine search
    }
  }

  return results
}
