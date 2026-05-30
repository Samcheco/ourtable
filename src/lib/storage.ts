/**
 * localStorage-based data store. Provides the same interface as the Supabase
 * store so the rest of the app is storage-agnostic.  When Supabase is
 * configured, the app uses that instead (see db.ts).
 */
import type { Restaurant, Visit, Review, Photo, WishlistItem } from '../types'

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

function uuid() {
  return crypto.randomUUID()
}

// --- Restaurants ---
export function getRestaurants(): Restaurant[] {
  return load<Restaurant>('restaurants')
}

export function getRestaurant(id: string): Restaurant | undefined {
  return getRestaurants().find(r => r.id === id)
}

export function saveRestaurant(r: Omit<Restaurant, 'id' | 'created_at'>): Restaurant {
  const restaurants = getRestaurants()
  const newR: Restaurant = { ...r, id: uuid(), created_at: new Date().toISOString() }
  save('restaurants', [...restaurants, newR])
  return newR
}

export function updateRestaurant(id: string, updates: Partial<Restaurant>) {
  const restaurants = getRestaurants().map(r => r.id === id ? { ...r, ...updates } : r)
  save('restaurants', restaurants)
}

// --- Visits ---
export function getVisits(): Visit[] {
  return load<Visit>('visits')
}

export function getVisitsByRestaurant(restaurantId: string): Visit[] {
  const visits = getVisits()
  const reviews = getReviews()
  const photos = getPhotos()
  return visits
    .filter(v => v.restaurant_id === restaurantId)
    .map(v => ({
      ...v,
      restaurant: getRestaurant(v.restaurant_id),
      reviews: reviews.filter(r => r.visit_id === v.id),
      photos: photos.filter(p => p.visit_id === v.id),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getAllVisitsWithDetails(): Visit[] {
  const visits = getVisits()
  const reviews = getReviews()
  const photos = getPhotos()
  return visits
    .map(v => ({
      ...v,
      restaurant: getRestaurant(v.restaurant_id),
      reviews: reviews.filter(r => r.visit_id === v.id),
      photos: photos.filter(p => p.visit_id === v.id),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function saveVisit(v: Omit<Visit, 'id' | 'created_at'>): Visit {
  const visits = getVisits()
  const newV: Visit = { ...v, id: uuid(), created_at: new Date().toISOString() }
  save('visits', [...visits, newV])
  return newV
}

export function deleteVisit(id: string) {
  save('visits', getVisits().filter(v => v.id !== id))
  save('reviews', getReviews().filter(r => r.visit_id !== id))
  save('photos', getPhotos().filter(p => p.visit_id !== id))
}

// --- Reviews ---
export function getReviews(): Review[] {
  return load<Review>('reviews')
}

export function saveReview(r: Omit<Review, 'id' | 'created_at'>): Review {
  const reviews = getReviews()
  // Replace if reviewer already has a review for this visit
  const existing = reviews.findIndex(x => x.visit_id === r.visit_id && x.reviewer === r.reviewer)
  const newR: Review = { ...r, id: existing >= 0 ? reviews[existing].id : uuid(), created_at: new Date().toISOString() }
  if (existing >= 0) {
    reviews[existing] = newR
    save('reviews', reviews)
  } else {
    save('reviews', [...reviews, newR])
  }
  return newR
}

// --- Photos ---
export function getPhotos(): Photo[] {
  return load<Photo>('photos')
}

export function savePhoto(p: Omit<Photo, 'id' | 'created_at'>): Photo {
  const photos = getPhotos()
  const newP: Photo = { ...p, id: uuid(), created_at: new Date().toISOString() }
  save('photos', [...photos, newP])
  return newP
}

export function deletePhoto(id: string) {
  save('photos', getPhotos().filter(p => p.id !== id))
}

export function updatePhoto(id: string, updates: Partial<Photo>) {
  save('photos', getPhotos().map(p => p.id === id ? { ...p, ...updates } : p))
}

// --- Wishlist ---
export function getWishlist(): WishlistItem[] {
  return load<WishlistItem>('wishlist')
}

export function saveWishlistItem(item: Omit<WishlistItem, 'id' | 'created_at'>): WishlistItem {
  const wishlist = getWishlist()
  const newItem: WishlistItem = { ...item, id: uuid(), created_at: new Date().toISOString() }
  save('wishlist', [...wishlist, newItem])
  return newItem
}

export function deleteWishlistItem(id: string) {
  save('wishlist', getWishlist().filter(w => w.id !== id))
}
