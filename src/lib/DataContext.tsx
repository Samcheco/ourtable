import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Restaurant, Visit, Photo, WishlistItem } from '../types'
import * as db from './db'
import { supabase, isSupabaseConfigured } from './supabase'

interface DataState {
  restaurants: Restaurant[]
  visits: Visit[]
  photos: Photo[]
  wishlist: WishlistItem[]
  loading: boolean
  refresh: () => Promise<void>
}

const DataCtx = createContext<DataState>({
  restaurants: [], visits: [], photos: [], wishlist: [], loading: true,
  refresh: async () => {},
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [r, v, p, w] = await Promise.all([
      db.getRestaurants(),
      db.getAllVisitsWithDetails(),
      db.getAllPhotos(),
      db.getWishlist(),
    ])
    setRestaurants(r)
    setVisits(v)
    setPhotos(p)
    setWishlist(w)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const channel = supabase
      .channel('ourtable-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  return (
    <DataCtx.Provider value={{ restaurants, visits, photos, wishlist, loading, refresh: load }}>
      {children}
    </DataCtx.Provider>
  )
}

export function useData() { return useContext(DataCtx) }
