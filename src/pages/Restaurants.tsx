import { useMemo, useState } from 'react'
import { Search, Shuffle } from 'lucide-react'
import { getRestaurants, getVisits, getReviews, getPhotos } from '../lib/storage'
import RestaurantCard from '../components/RestaurantCard'

const CUISINES = ['All', 'Italian', 'Japanese', 'Mexican', 'American', 'Chinese', 'Indian', 'Thai', 'French', 'Mediterranean', 'Korean', 'Other']
const SORT_OPTIONS = ['Most Recent', 'Highest Rated', 'Most Visited', 'Price: Low', 'Price: High']

export default function Restaurants() {
  const [search, setSearch] = useState('')
  const [cuisine, setCuisine] = useState('All')
  const [sort, setSort] = useState('Most Recent')
  const [priceFilter, setPriceFilter] = useState<number | null>(null)

  const restaurants = useMemo(() => getRestaurants(), [])
  const visits = useMemo(() => getVisits(), [])
  const reviews = useMemo(() => getReviews(), [])
  const photos = useMemo(() => getPhotos(), [])

  const enriched = useMemo(() => {
    return restaurants.map(r => {
      const rVisits = visits.filter(v => v.restaurant_id === r.id)
      const rReviews = reviews.filter(rv => rVisits.some(v => v.id === rv.visit_id))
      const rPhotos = photos.filter(p => rVisits.some(v => v.id === p.visit_id))
      const avgRating = rReviews.length ? rReviews.reduce((s, x) => s + x.overall_rating, 0) / rReviews.length : 0
      const lastVisit = rVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      return { restaurant: r, reviews: rReviews, photos: rPhotos, visitCount: rVisits.length, avgRating, lastVisit }
    })
  }, [restaurants, visits, reviews, photos])

  const filtered = useMemo(() => {
    let list = enriched
    if (search) list = list.filter(({ restaurant: r }) => r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine.toLowerCase().includes(search.toLowerCase()))
    if (cuisine !== 'All') list = list.filter(({ restaurant: r }) => r.cuisine === cuisine)
    if (priceFilter) list = list.filter(({ restaurant: r }) => r.price_range === priceFilter)
    switch (sort) {
      case 'Highest Rated': list = [...list].sort((a, b) => b.avgRating - a.avgRating); break
      case 'Most Visited': list = [...list].sort((a, b) => b.visitCount - a.visitCount); break
      case 'Price: Low': list = [...list].sort((a, b) => a.restaurant.price_range - b.restaurant.price_range); break
      case 'Price: High': list = [...list].sort((a, b) => b.restaurant.price_range - a.restaurant.price_range); break
      default: list = [...list].sort((a, b) => {
        const aDate = a.lastVisit ? new Date(a.lastVisit.date).getTime() : 0
        const bDate = b.lastVisit ? new Date(b.lastVisit.date).getTime() : 0
        return bDate - aDate
      })
    }
    return list
  }, [enriched, search, cuisine, priceFilter, sort])

  function pickRandom() {
    if (!filtered.length) return
    const pick = filtered[Math.floor(Math.random() * filtered.length)]
    window.location.href = `/restaurants/${pick.restaurant.id}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-stone-800">Restaurants</h1>
        <button onClick={pickRandom} className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Shuffle size={15} /> Random Pick
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-amber-50 shadow-sm mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search restaurants..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <select value={cuisine} onChange={e => setCuisine(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
          {CUISINES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
          {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>
        <div className="flex gap-1">
          {[null, 1, 2, 3, 4].map(p => (
            <button
              key={p ?? 'all'}
              onClick={() => setPriceFilter(p)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${priceFilter === p ? 'bg-amber-600 border-amber-600 text-white' : 'border-stone-200 text-stone-600 hover:border-amber-400'}`}
            >
              {p === null ? 'All $' : '$'.repeat(p)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-5xl mb-4">🔍</div>
          <p>No restaurants found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(({ restaurant, reviews, photos, visitCount }) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} reviews={reviews} photos={photos} visitCount={visitCount} />
          ))}
        </div>
      )}
    </div>
  )
}
