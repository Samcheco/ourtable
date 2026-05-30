import { getMonth } from 'date-fns'
import type { WrappedStats, Restaurant } from '../types'
import { getAllVisitsWithDetails, getRestaurants, getPhotos } from './storage'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function computeWrapped(year: number): WrappedStats {
  const allVisits = getAllVisitsWithDetails().filter(v => new Date(v.date).getFullYear() === year)
  const restaurants = getRestaurants()
  const allPhotos = getPhotos()

  const visitedRestaurantIds = new Set(allVisits.map(v => v.restaurant_id))
  const photos = allPhotos.filter(p => allVisits.some(v => v.id === p.visit_id))

  // Ratings per reviewer
  const samReviews = allVisits.flatMap(v => v.reviews?.filter(r => r.reviewer === 'sam') || [])
  const oliviaReviews = allVisits.flatMap(v => v.reviews?.filter(r => r.reviewer === 'olivia') || [])

  const avg = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0

  const samAvgRating = avg(samReviews.map(r => r.overall_rating))
  const oliviaAvgRating = avg(oliviaReviews.map(r => r.overall_rating))

  // Top cuisine
  const cuisineCounts: Record<string, number> = {}
  allVisits.forEach(v => {
    const c = v.restaurant?.cuisine || 'Unknown'
    cuisineCounts[c] = (cuisineCounts[c] || 0) + 1
  })
  const topCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Top occasion
  const occasionCounts: Record<string, number> = {}
  allVisits.forEach(v => {
    if (v.occasion) occasionCounts[v.occasion] = (occasionCounts[v.occasion] || 0) + 1
  })
  const topOccasion = Object.entries(occasionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Busiest month
  const monthCounts: Record<string, number> = {}
  allVisits.forEach(v => {
    const m = getMonth(new Date(v.date))
    const key = MONTH_NAMES[m]
    monthCounts[key] = (monthCounts[key] || 0) + 1
  })
  const busiestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  // Monthly visits (all 12 months)
  const monthlyVisits: Record<string, number> = {}
  MONTH_NAMES.forEach(m => { monthlyVisits[m] = 0 })
  allVisits.forEach(v => {
    const m = MONTH_NAMES[getMonth(new Date(v.date))]
    monthlyVisits[m]++
  })

  // Top restaurants by avg rating
  const restaurantRatings: Record<string, number[]> = {}
  allVisits.forEach(v => {
    const ratings = v.reviews?.map(r => r.overall_rating) || []
    if (ratings.length) {
      if (!restaurantRatings[v.restaurant_id]) restaurantRatings[v.restaurant_id] = []
      restaurantRatings[v.restaurant_id].push(...ratings)
    }
  })
  const topRestaurants = Object.entries(restaurantRatings)
    .map(([id, ratings]) => ({ restaurant: restaurants.find(r => r.id === id)!, avgRating: avg(ratings) }))
    .filter(x => x.restaurant)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5)

  // Hidden gem: price_range 1-2 and high rating
  const hiddenGemEntry = Object.entries(restaurantRatings)
    .map(([id, ratings]) => {
      const r = restaurants.find(x => x.id === id)
      return r ? { restaurant: r, avgRating: avg(ratings) } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && (x.restaurant.price_range || 3) <= 2 && x.avgRating >= 4)
    .sort((a, b) => b.avgRating - a.avgRating)[0]

  // Biggest disagreement
  let biggestDisagreement: { restaurant: Restaurant; diff: number } | null = null
  allVisits.forEach(v => {
    const sam = v.reviews?.find(r => r.reviewer === 'sam')
    const olivia = v.reviews?.find(r => r.reviewer === 'olivia')
    if (sam && olivia && v.restaurant) {
      const diff = Math.abs(sam.overall_rating - olivia.overall_rating)
      if (!biggestDisagreement || diff > biggestDisagreement.diff) {
        biggestDisagreement = { restaurant: v.restaurant, diff }
      }
    }
  })

  // Picks
  const samPicks = samReviews.filter(r => r.is_pick).length
  const oliviaPicks = oliviaReviews.filter(r => r.is_pick).length

  // Would return
  const allReviews = [...samReviews, ...oliviaReviews]
  const wouldReturn = allReviews.filter(r => r.would_return === 'loved' || r.would_return === 'liked').length
  const wouldReturnPct = allReviews.length ? Math.round((wouldReturn / allReviews.length) * 100) : 0

  return {
    year,
    totalVisits: allVisits.length,
    totalRestaurants: visitedRestaurantIds.size,
    totalPhotos: photos.length,
    samAvgRating,
    oliviaAvgRating,
    topCuisine,
    topOccasion,
    busiestMonth,
    topRestaurants,
    hiddenGem: hiddenGemEntry?.restaurant || null,
    biggestDisagreement,
    samPicks,
    oliviaPicks,
    wouldReturnPct,
    monthlyVisits,
    cuisineBreakdown: cuisineCounts,
  }
}
