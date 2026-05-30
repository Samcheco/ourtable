import { useMemo, useState } from 'react'
import { computeWrapped } from '../lib/wrapped'
import { getVisits } from '../lib/storage'
import { Link } from 'react-router-dom'
import StarRating from '../components/StarRating'

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function StatCard({ emoji, label, value, sub, gradient }: { emoji: string; label: string; value: string | number; sub?: string; gradient?: string }) {
  return (
    <div className={`rounded-2xl p-5 text-center ${gradient || 'bg-white border border-amber-50'} shadow-sm`}>
      <div className="text-3xl mb-1">{emoji}</div>
      <div className={`text-3xl font-bold mb-1 ${gradient ? 'text-white' : 'text-stone-800'}`}>{value}</div>
      <div className={`text-sm font-medium ${gradient ? 'text-white/90' : 'text-stone-600'}`}>{label}</div>
      {sub && <div className={`text-xs mt-1 ${gradient ? 'text-white/70' : 'text-stone-400'}`}>{sub}</div>}
    </div>
  )
}

function isWrappedUnlocked(): boolean {
  const now = new Date()
  // Available Dec 14 – Dec 31 each year
  return now.getMonth() === 11 && now.getDate() >= 14
}

function daysUntilUnlock(): number {
  const now = new Date()
  const unlock = new Date(now.getFullYear(), 11, 14) // Dec 14
  if (now > unlock) return 0
  return Math.ceil((unlock.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function Wrapped() {
  const allVisits = useMemo(() => getVisits(), [])

  if (!isWrappedUnlocked()) {
    const days = daysUntilUnlock()
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="wrapped-gradient rounded-3xl p-10 text-white">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="font-['Playfair_Display'] text-3xl font-bold mb-3">Wrapped is locked</h1>
          <p className="text-white/80 text-lg mb-6">
            Your year in food unlocks on<br />
            <span className="font-bold text-white">December 14th</span>
          </p>
          <div className="bg-white/20 rounded-2xl px-6 py-4 inline-block">
            <div className="text-4xl font-bold">{days}</div>
            <div className="text-white/80 text-sm mt-1">day{days !== 1 ? 's' : ''} to go</div>
          </div>
          <p className="text-white/60 text-xs mt-6">Keep visiting restaurants in the meantime 🍽️</p>
        </div>
      </div>
    )
  }
  const years = useMemo(() => {
    const ys = new Set(allVisits.map(v => new Date(v.date).getFullYear()))
    return Array.from(ys).sort((a, b) => b - a)
  }, [allVisits])

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(years[0] || currentYear)
  const stats = useMemo(() => computeWrapped(year), [year])

  if (stats.totalVisits === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-7xl mb-6">✨</div>
        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-stone-800 mb-3">OurTable Wrapped</h1>
        <p className="text-stone-400 text-lg mb-6">No visits in {year} yet! Start adding restaurants to see your year in food.</p>
        <Link to="/add" className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-medium transition-colors">Add your first visit</Link>
      </div>
    )
  }

  const maxMonthly = Math.max(...Object.values(stats.monthlyVisits))
  const topCuisines = Object.entries(stats.cuisineBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const totalCuisineVisits = topCuisines.reduce((s, [, v]) => s + v, 0)

  const samMore = stats.samAvgRating > stats.oliviaAvgRating
  const diff = Math.abs(stats.samAvgRating - stats.oliviaAvgRating).toFixed(1)
  const generous = samMore ? 'Sam' : 'Olivia'
  const tough = samMore ? 'Olivia' : 'Sam'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="wrapped-gradient rounded-3xl p-8 text-center mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 text-9xl flex items-center justify-center">✨</div>
        <h1 className="font-['Playfair_Display'] text-4xl font-bold text-white mb-2">{year} Wrapped</h1>
        <p className="text-white/80 text-lg">Your year in food, Sam & Olivia 🍽️</p>
        {years.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {years.map(y => (
              <button key={y} onClick={() => setYear(y)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${year === y ? 'bg-white text-purple-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>{y}</button>
            ))}
          </div>
        )}
      </div>

      {/* Big 4 stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard emoji="🍽️" label="Visits" value={stats.totalVisits} />
        <StatCard emoji="🏠" label="Restaurants" value={stats.totalRestaurants} />
        <StatCard emoji="📸" label="Photos" value={stats.totalPhotos} />
        <StatCard emoji="💚" label="Would Return" value={`${stats.wouldReturnPct}%`} />
      </div>

      {/* Reviewer breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-amber-50 shadow-sm mb-6">
        <h2 className="font-['Playfair_Display'] text-xl font-semibold text-stone-800 mb-4">⭐ Who's the Critic?</h2>
        <div className="grid grid-cols-2 gap-6">
          {[
            { name: 'Sam', avg: stats.samAvgRating, picks: stats.samPicks, emoji: '👨🏻‍🍳', color: 'blue' },
            { name: 'Olivia', avg: stats.oliviaAvgRating, picks: stats.oliviaPicks, emoji: '👩🏾‍🍳', color: 'pink' },
          ].map(({ name, avg, picks, emoji }) => (
            <div key={name} className="text-center">
              <div className="text-4xl mb-2">{emoji}</div>
              <div className="font-semibold text-stone-700 text-lg">{name}</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">{avg.toFixed(1)}</div>
              <StarRating value={Math.round(avg)} readonly size={16} />
              <div className="text-xs text-stone-400 mt-1">avg rating</div>
              {picks > 0 && <div className="mt-2 bg-amber-50 rounded-lg px-3 py-1 text-xs text-amber-700 font-medium">★ {picks} restaurant{picks !== 1 ? 's' : ''} picked</div>}
            </div>
          ))}
        </div>
        {stats.samAvgRating !== stats.oliviaAvgRating && (
          <div className="mt-4 pt-4 border-t border-amber-50 text-center text-sm text-stone-500">
            <span className="font-medium text-amber-700">{generous}</span> is the generous one (+{diff} stars higher avg than {tough})
          </div>
        )}
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-2xl p-6 border border-amber-50 shadow-sm mb-6">
        <h2 className="font-['Playfair_Display'] text-xl font-semibold text-stone-800 mb-4">📅 Visits by Month</h2>
        <div className="flex items-end gap-1.5 h-24">
          {MONTH_ORDER.map(month => {
            const count = stats.monthlyVisits[month] || 0
            const height = maxMonthly > 0 ? (count / maxMonthly) * 100 : 0
            const isBusiest = month === stats.busiestMonth
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${isBusiest ? 'bg-amber-500' : 'bg-amber-200'}`}
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${count} visit${count !== 1 ? 's' : ''}`}
                  />
                </div>
                <div className="text-xs text-stone-400">{month}</div>
                {count > 0 && <div className="text-xs font-medium text-stone-600">{count}</div>}
              </div>
            )
          })}
        </div>
        <p className="text-center text-sm text-stone-400 mt-2">
          Busiest month: <span className="font-medium text-amber-600">{stats.busiestMonth}</span> with {stats.monthlyVisits[stats.busiestMonth]} visits
        </p>
      </div>

      {/* Cuisine breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-amber-50 shadow-sm mb-6">
        <h2 className="font-['Playfair_Display'] text-xl font-semibold text-stone-800 mb-4">🌍 Cuisine Breakdown</h2>
        <div className="space-y-3">
          {topCuisines.map(([c, count]) => (
            <div key={c} className="flex items-center gap-3">
              <div className="w-20 text-sm text-stone-600 font-medium">{c}</div>
              <div className="flex-1 bg-amber-50 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 to-orange-400 h-3 rounded-full transition-all" style={{ width: `${(count / totalCuisineVisits) * 100}%` }} />
              </div>
              <div className="w-6 text-right text-sm font-bold text-amber-700">{count}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-stone-400 mt-4">Favorite cuisine: <span className="font-medium text-amber-600">{stats.topCuisine}</span></p>
      </div>

      {/* Top restaurants */}
      {stats.topRestaurants.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-amber-50 shadow-sm mb-6">
          <h2 className="font-['Playfair_Display'] text-xl font-semibold text-stone-800 mb-4">🏆 Top Restaurants</h2>
          <div className="space-y-3">
            {stats.topRestaurants.map(({ restaurant, avgRating }, i) => (
              <Link key={restaurant.id} to={`/restaurants/${restaurant.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-amber-50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-stone-400' : i === 2 ? 'bg-amber-700' : 'bg-stone-200 text-stone-600'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-stone-700">{restaurant.name}</div>
                  <div className="text-xs text-stone-400">{restaurant.cuisine}</div>
                </div>
                <div className="flex items-center gap-1">
                  <StarRating value={Math.round(avgRating)} readonly size={13} />
                  <span className="text-sm font-bold text-amber-600">{avgRating.toFixed(1)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Fun callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {stats.hiddenGem && (
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-5 text-white">
            <div className="text-2xl mb-2">💎</div>
            <div className="font-semibold text-lg">Hidden Gem</div>
            <div className="font-['Playfair_Display'] font-bold text-xl mt-1">{stats.hiddenGem.name}</div>
            <div className="text-white/80 text-sm mt-1">Affordable & amazing</div>
          </div>
        )}
        {stats.biggestDisagreement && (
          <div className="bg-gradient-to-br from-rose-400 to-orange-400 rounded-2xl p-5 text-white">
            <div className="text-2xl mb-2">🤔</div>
            <div className="font-semibold text-lg">Biggest Disagreement</div>
            <div className="font-['Playfair_Display'] font-bold text-xl mt-1">{stats.biggestDisagreement.restaurant.name}</div>
            <div className="text-white/80 text-sm mt-1">{stats.biggestDisagreement.diff} star difference</div>
          </div>
        )}
        <div className="bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl p-5 text-white">
          <div className="text-2xl mb-2">🎉</div>
          <div className="font-semibold text-lg">Favorite Occasion</div>
          <div className="font-['Playfair_Display'] font-bold text-xl mt-1">{stats.topOccasion}</div>
          <div className="text-white/80 text-sm mt-1">Your go-to reason to eat out</div>
        </div>
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white">
          <div className="text-2xl mb-2">📆</div>
          <div className="font-semibold text-lg">Busiest Month</div>
          <div className="font-['Playfair_Display'] font-bold text-xl mt-1">{stats.busiestMonth}</div>
          <div className="text-white/80 text-sm mt-1">{stats.monthlyVisits[stats.busiestMonth]} restaurants visited</div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-stone-400 text-sm">
        <p>Here's to more memories in {year + 1} 🥂</p>
      </div>
    </div>
  )
}
