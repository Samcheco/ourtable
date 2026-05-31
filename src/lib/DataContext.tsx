import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
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

  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedLoad = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => load(), 800)
  }, [load])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const channel = supabase
      .channel('ourtable-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, debouncedLoad)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [debouncedLoad])

  return (
    <DataCtx.Provider value={{ restaurants, visits, photos, wishlist, loading, refresh: load }}>
      {children}
    </DataCtx.Provider>
  )
}

export function useData() { return useContext(DataCtx) }
