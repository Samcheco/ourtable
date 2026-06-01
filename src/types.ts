export type Reviewer = 'sam' | 'olivia'

export interface Restaurant {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  cuisine: string
  price_range: 1 | 2 | 3 | 4
  phone?: string
  website?: string
  description?: string
  created_at: string
}

export interface Visit {
  id: string
  restaurant_id: string
  restaurant?: Restaurant
  date: string
  occasion: string
  notes: string
  created_at: string
  reviews?: Review[]
  photos?: Photo[]
}

export interface Review {
  id: string
  visit_id: string
  reviewer: Reviewer
  overall_rating: number
  food_rating: number
  service_rating: number
  ambiance_rating: number
  value_rating: number
  review_text: string
  would_return: 'loved' | 'liked' | 'indifferent' | 'didnt_like' | 'hated'
  is_pick: boolean
  created_at: string
}

export interface Photo {
  id: string
  visit_id: string
  url: string
  caption: string
  is_best_dish: boolean
  uploaded_by: Reviewer
  created_at: string
}

export interface WishlistItem {
  id: string
  restaurant_id?: string
  name: string
  address?: string
  cuisine?: string
  price_range?: 1 | 2 | 3 | 4
  notes: string
  added_by: Reviewer
  lat?: number
  lng?: number
  city?: string
  photo_url?: string
  created_at: string
}

export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: {
    road?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
    house_number?: string
  }
  type: string
  category: string
}

export interface WrappedStats {
  year: number
  totalVisits: number
  totalRestaurants: number
  totalPhotos: number
  samAvgRating: number
  oliviaAvgRating: number
  topCuisine: string
  topOccasion: string
  busiestMonth: string
  topRestaurants: Array<{ restaurant: Restaurant; avgRating: number }>
  hiddenGem: Restaurant | null
  biggestDisagreement: { restaurant: Restaurant; diff: number } | null
  samPicks: number
  oliviaPicks: number
  wouldReturnPct: number
  monthlyVisits: Record<string, number>
  cuisineBreakdown: Record<string, number>
}
