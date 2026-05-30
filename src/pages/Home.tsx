import { Link } from 'react-router-dom'
import { TrendingUp, Camera, Heart, Utensils } from 'lucide-react'
import { useData } from '../lib/DataContext'
import { visibleReviews } from '../lib/seal'
import { format } from 'date-fns'
import StarRating from '../components/StarRating'

export default function Home() {
  const { restaurants, visits, photos } = useData()
  const recentVisits = visits.slice(0, 5)
  const reviews = visits.flatMap(v => visibleReviews(v.reviews || []))
  const samAvg = reviews.filter(r => r.reviewer === 'sam')
  const oliviaAvg = reviews.filter(r => r.reviewer === 'olivia')
  const avgOf = (arr: typeof reviews) => arr.length ? (arr.reduce((s, r) => s + r.overall_rating, 0) / arr.length).toFixed(1) : '—'

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-8">
      <div className="text-center mb-10">
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-amber-900 mb-2">Our Table 🍽️</h1>
        <p className="text-stone-500 text-lg">Sam & Olivia's food diary</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { icon: Utensils, label: 'Restaurants', value: restaurants.length },
          { icon: TrendingUp, label: 'Visits', value: visits.length },
          { icon: Camera, label: 'Photos', value: photos.length },
          { icon: Heart, label: 'Loved or Liked', value: reviews.length ? `${Math.round(reviews.filter(r => r.would_return === 'loved' || r.would_return === 'liked').length / reviews.length * 100)}%` : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl p-4 text-center border border-amber-50 shadow-sm">
            <Icon size={20} className="mx-auto mb-1 text-amber-600" />
            <div className="text-2xl font-bold text-stone-800">{value}</div>
            <div className="text-xs text-stone-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {[
          { name: 'Sam', avg: avgOf(samAvg), color: 'blue', emoji: '👨🏻‍🍳' },
          { name: 'Olivia', avg: avgOf(oliviaAvg), color: 'pink', emoji: '👩🏾‍🍳' },
        ].map(({ name, avg, color, emoji }) => (
          <div key={name} className={`bg-white rounded-2xl p-5 border border-${color}-100 shadow-sm`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{emoji}</span>
              <div>
                <div className="font-semibold text-stone-700">{name}</div>
                <div className="text-stone-400 text-sm">Avg rating: <span className="text-amber-600 font-semibold">{avg} ⭐</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-['Playfair_Display'] text-2xl font-semibold text-stone-800">Recent Visits</h2>
        <Link to="/restaurants" className="text-amber-600 hover:text-amber-700 text-sm font-medium">View all →</Link>
      </div>

      {recentVisits.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <div className="text-6xl mb-4">🍜</div>
          <p className="text-lg mb-2">No visits yet!</p>
          <Link to="/add" className="inline-block bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors">
            Add your first restaurant
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recentVisits.map(visit => {
            const visible = visibleReviews(visit.reviews || [])
            const sam = visible.find(r => r.reviewer === 'sam')
            const olivia = visible.find(r => r.reviewer === 'olivia')
            const photo = visit.photos?.[0]
            return (
              <Link key={visit.id} to={`/restaurants/${visit.restaurant_id}`} className="block">
                <div className="bg-white rounded-2xl p-4 border border-amber-50 shadow-sm hover:shadow-md transition-shadow flex gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-amber-50 shrink-0">
                    {photo ? <img src={photo.url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🍴</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-stone-800 truncate">{visit.restaurant?.name}</h3>
                      <span className="text-xs text-stone-400 shrink-0">{format(new Date(visit.date), 'MMM d, yyyy')}</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{visit.restaurant?.cuisine} · {visit.occasion}</p>
                    <div className="flex gap-4 mt-1.5">
                      {sam && <div className="flex items-center gap-1"><span className="text-xs text-stone-400">Sam</span><StarRating value={sam.overall_rating} readonly size={12} /></div>}
                      {olivia && <div className="flex items-center gap-1"><span className="text-xs text-stone-400">Olivia</span><StarRating value={olivia.overall_rating} readonly size={12} /></div>}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
