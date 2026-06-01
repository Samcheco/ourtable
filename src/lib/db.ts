/**
 * db.ts — async data layer
 * Uses Supabase when configured, falls back to localStorage.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import * as local from './storage'
import type { Restaurant, Visit, Review, Photo, WishlistItem } from '../types'

const USE_SUPABASE = isSupabaseConfigured()

// ── Restaurants ──────────────────────────────────────────────────────────────

export async function getRestaurants(): Promise<Restaurant[]> {
  if (!USE_SUPABASE) return local.getRestaurants()
  const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
  return (data || []) as Restaurant[]
}

export async function getRestaurant(id: string): Promise<Restaurant | undefined> {
  if (!USE_SUPABASE) return local.getRestaurant(id)
  const { data } = await supabase.from('restaurants').select('*').eq('id', id).single()
  return data as Restaurant
}

export async function saveRestaurant(r: Omit<Restaurant, 'id' | 'created_at'>): Promise<Restaurant> {
  if (!USE_SUPABASE) return local.saveRestaurant(r)
  const { data } = await supabase.from('restaurants').insert(r).select().single()
  return data as Restaurant
}

export async function updateRestaurant(id: string, updates: Partial<Omit<Restaurant, 'id' | 'created_at'>>): Promise<void> {
  if (!USE_SUPABASE) return
  await supabase.from('restaurants').update(updates).eq('id', id)
}

// ── Visits ───────────────────────────────────────────────────────────────────

export async function getAllVisitsWithDetails(): Promise<Visit[]> {
  if (!USE_SUPABASE) return local.getAllVisitsWithDetails()
  const { data: visits } = await supabase.from('visits').select('*').order('date', { ascending: false })
  if (!visits?.length) return []
  const visitIds = visits.map(v => v.id)
  const [{ data: reviews }, { data: photos }, { data: restaurants }] = await Promise.all([
    supabase.from('reviews').select('*').in('visit_id', visitIds),
    supabase.from('photos').select('*').in('visit_id', visitIds),
    supabase.from('restaurants').select('*'),
  ])
  return visits.map(v => ({
    ...v,
    restaurant: restaurants?.find(r => r.id === v.restaurant_id),
    reviews: reviews?.filter(r => r.visit_id === v.id) || [],
    photos: photos?.filter(p => p.visit_id === v.id) || [],
  })) as Visit[]
}

export async function getVisitsByRestaurant(restaurantId: string): Promise<Visit[]> {
  if (!USE_SUPABASE) return local.getVisitsByRestaurant(restaurantId)
  const { data: visits } = await supabase.from('visits').select('*')
    .eq('restaurant_id', restaurantId).order('date', { ascending: false })
  if (!visits?.length) return []
  const visitIds = visits.map(v => v.id)
  const [{ data: reviews }, { data: photos }] = await Promise.all([
    supabase.from('reviews').select('*').in('visit_id', visitIds),
    supabase.from('photos').select('*').in('visit_id', visitIds),
  ])
  return visits.map(v => ({
    ...v,
    reviews: reviews?.filter(r => r.visit_id === v.id) || [],
    photos: photos?.filter(p => p.visit_id === v.id) || [],
  })) as Visit[]
}

export async function saveVisit(v: Omit<Visit, 'id' | 'created_at' | 'reviews' | 'photos' | 'restaurant'>): Promise<Visit> {
  if (!USE_SUPABASE) return local.saveVisit(v as Parameters<typeof local.saveVisit>[0])
  const { data } = await supabase.from('visits').insert(v).select().single()
  return data as Visit
}

export async function deleteVisit(id: string): Promise<void> {
  if (!USE_SUPABASE) { local.deleteVisit(id); return }
  await supabase.from('visits').delete().eq('id', id)
}

export async function deleteRestaurant(id: string): Promise<void> {
  if (!USE_SUPABASE) return
  await supabase.from('restaurants').delete().eq('id', id)
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export async function saveReview(r: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
  if (!USE_SUPABASE) return local.saveReview(r)
  const { data } = await supabase.from('reviews')
    .upsert(r, { onConflict: 'visit_id,reviewer' }).select().single()
  return data as Review
}

// ── Photos ───────────────────────────────────────────────────────────────────

export async function savePhoto(p: Omit<Photo, 'id' | 'created_at'>): Promise<Photo> {
  if (!USE_SUPABASE) return local.savePhoto(p)
  const { data } = await supabase.from('photos').insert(p).select().single()
  return data as Photo
}

export async function deletePhoto(id: string): Promise<void> {
  if (!USE_SUPABASE) { local.deletePhoto(id); return }
  await supabase.from('photos').delete().eq('id', id)
}

export async function updatePhoto(id: string, updates: Partial<Photo>): Promise<void> {
  if (!USE_SUPABASE) { local.updatePhoto(id, updates); return }
  await supabase.from('photos').update(updates).eq('id', id)
}

export async function getAllPhotos(): Promise<Photo[]> {
  if (!USE_SUPABASE) return local.getPhotos()
  const { data } = await supabase.from('photos').select('*')
  return (data || []) as Photo[]
}

// ── Wishlist ─────────────────────────────────────────────────────────────────

export async function getWishlist(): Promise<WishlistItem[]> {
  if (!USE_SUPABASE) return local.getWishlist()
  const { data } = await supabase.from('wishlist').select('*').order('created_at', { ascending: false })
  return (data || []) as WishlistItem[]
}

export async function saveWishlistItem(item: Omit<WishlistItem, 'id' | 'created_at'>): Promise<WishlistItem> {
  if (!USE_SUPABASE) return local.saveWishlistItem(item)
  const { data } = await supabase.from('wishlist').insert(item).select().single()
  return data as WishlistItem
}

export async function deleteWishlistItem(id: string): Promise<void> {
  if (!USE_SUPABASE) { local.deleteWishlistItem(id); return }
  await supabase.from('wishlist').delete().eq('id', id)
}
