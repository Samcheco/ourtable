import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Restaurant, Visit, Photo, WishlistItem } from '../types'
import * as db from './db'

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

  return (
    <DataCtx.Provider value={{ restaurants, visits, photos, wishlist, loading, refresh: load }}>
      {children}
    </DataCtx.Provider>
  )
}

export function useData() { return useContext(DataCtx) }
