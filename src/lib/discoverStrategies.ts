/**
 * Discovery strategies — tried in order until enough cards are found.
 * Every strategy goes through the same quality gate (curated scoring,
 * chain filtering, seen-memory filtering).
 */

import { searchNearbyRestaurants, type NearbyPlace } from './googlePlaces'
import { DiscoverMemory } from './discoverMemory'

export type StrategyId =
  | 'nearby_restaurants'
  | 'nearby_cafes_bars'
  | 'expanded_restaurants'
  | 'wider_restaurants'
  | 'resurface_skips'

export interface Strategy {
  id: StrategyId
  label: string
  description: string  // shown in empty state
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'nearby_restaurants',
    label: 'Restaurants nearby',
    description: 'Top restaurants within 10 km',
  },
  {
    id: 'nearby_cafes_bars',
    label: 'Cafés, bars & more',
    description: 'Cafés, wine bars, and bakeries nearby',
  },
  {
    id: 'expanded_restaurants',
    label: 'Wider area',
    description: 'Restaurants within 25 km',
  },
  {
    id: 'wider_restaurants',
    label: 'Broader search',
    description: 'Restaurants within 40 km',
  },
  {
    id: 'resurface_skips',
    label: 'Revisiting older skips',
    description: 'Places you passed on a while back',
  },
]

export const MIN_CARDS_PER_STRATEGY = 5

interface RunStrategyOptions {
  lat: number
  lng: number
  hiddenIds: Set<string>
  wishlistedNames: Set<string>
}

export async function runStrategy(
  id: StrategyId,
  opts: RunStrategyOptions
): Promise<NearbyPlace[]> {
  const { lat, lng, hiddenIds, wishlistedNames } = opts

  if (id === 'resurface_skips') {
    // Pull from memory — no API call needed
    const resurfaceable = DiscoverMemory.getResurfaceable(wishlistedNames)
    return resurfaceable.filter(p => !hiddenIds.has(p.placeId))
  }

  const searchOpts: Parameters<typeof searchNearbyRestaurants>[2] = {}

  switch (id) {
    case 'nearby_restaurants':
      searchOpts.radius = 10000
      searchOpts.placeType = 'restaurant'
      break
    case 'nearby_cafes_bars':
      // Run both cafe and bar searches and merge
      searchOpts.radius = 10000
      searchOpts.placeType = 'cafe'
      break
    case 'expanded_restaurants':
      searchOpts.radius = 25000
      searchOpts.placeType = 'restaurant'
      break
    case 'wider_restaurants':
      searchOpts.radius = 40000
      searchOpts.placeType = 'restaurant'
      break
  }

  let results = await searchNearbyRestaurants(lat, lng, searchOpts)

  // For cafes/bars strategy, also fetch bars and merge+dedupe
  if (id === 'nearby_cafes_bars') {
    const bars = await searchNearbyRestaurants(lat, lng, {
      radius: 10000,
      placeType: 'bar',
      minRating: 4.0,
      minReviews: 100,
    })
    const seen = new Set(results.map(p => p.placeId))
    results = [...results, ...bars.filter(p => !seen.has(p.placeId))]
    // Re-sort by editorial score
    results.sort((a, b) => (b.editorialScore ?? 0) - (a.editorialScore ?? 0))
  }

  return results.filter(p => !hiddenIds.has(p.placeId))
}

export async function forceResurface(wishlistedNames: Set<string>): Promise<NearbyPlace[]> {
  return DiscoverMemory.forceResurfaceAll(wishlistedNames)
}
