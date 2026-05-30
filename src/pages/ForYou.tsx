import { useState, useEffect, useMemo } from 'react'
import { MapPin, Star, Navigation, RefreshCw } from 'lucide-react'
import { useData } from '../lib/DataContext'
import { buildProfile, fetchRecommendations } from '../lib/recommendations'
import type { PlaceRecommendation, PreferenceProfile } from '../lib/recommendations'
import { loadGoogleMaps, isGoogleConfigured } from '../lib/googlePlaces'

type Feed = 'both' | 'sam' | 'olivia'

const PRICE_LABELS: Record<number, string> = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }
// Maps Google price levels (0-4) to our labels
const GOOGLE_PRICE: Record<number, string> = { 0: 'Free', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

function PriceLevel({ level }: { level?: number }) {
  if (level == null) return null
  return <span className="text-xs text-stone-400">{GOOGLE_PRICE[level] || ''}</span>
}

function RecommendationCard({ rec }: { rec: PlaceRecommendation }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.name + ' ' + rec.address)}`
  return (
    <a href={mapsUrl} target="_blank" rel="noreferrer" className="block bg-white rounded-2xl overflow-hidden border border-amber-50 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] transition-transform">
      <div className="h-36 bg-amber-50 relative overflow-hidden">
        {rec.photoUrl ? (
          <img src={rec.photoUrl} alt={rec.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🍴</div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full px-2 py-0.5 flex items-center gap-1">
          <Star size={11} className="text-amber-500" fill="#f59e0b" />
          <span className="text-xs font-semibold text-stone-700">{rec.rating?.toFixed(1) ?? '—'}</span>
        </div>
        <div className="absolute bottom-2 left-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full capitalize">
          {rec.cuisine}
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-stone-800 text-sm leading-tight">{rec.name}</h3>
          <PriceLevel level={rec.priceLevel} />
        </div>
        <div className="flex items-center gap-1 mt-1 text-stone-400">
          <MapPin size={11} />
          <span className="text-xs truncate">{rec.address.split(',').slice(0, 2).join(',')}</span>
        </div>
      </div>
    </a>
  )
}

function ProfileSummary({ profile }: { profile: PreferenceProfile }) {
  if (!profile.topCuisines.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {profile.topCuisines.map(c => (
        <span key={c} className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium capitalize">{c}</span>
      ))}
      {profile.preferredPriceRange && (
        <span className="bg-stone-100 text-stone-500 text-xs px-2.5 py-1 rounded-full font-medium">
          Loves {PRICE_LABELS[profile.preferredPriceRange]}
        </span>
      )}
    </div>
  )
}

export default function ForYou() {
  const { visits, restaurants } = useData()
  const reviews = useMemo(() => visits.flatMap(v => v.reviews || []), [visits])
  const visitedNames = useMemo(() => new Set(restaurants.map(r => r.name.toLowerCase())), [restaurants])

  const [feed, setFeed] = useState<Feed>('both')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locError, setLocError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recs, setRecs] = useState<PlaceRecommendation[]>([])
  const [googleReady, setGoogleReady] = useState(false)

  const profiles = useMemo(() => ({
    sam: buildProfile('sam', reviews, visits, restaurants),
    olivia: buildProfile('olivia', reviews, visits, restaurants),
    both: buildProfile('both', reviews, visits, restaurants),
  }), [reviews, visits, restaurants])

  const currentProfile = profiles[feed]

  useEffect(() => {
    if (!isGoogleConfigured()) return
    loadGoogleMaps().then(() => setGoogleReady(true)).catch(console.error)
  }, [])

  function getLocation() {
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocError('Could not get location. Please allow location access.'),
      { timeout: 10000 },
    )
  }

  useEffect(() => { getLocation() }, [])

  useEffect(() => {
    if (!location || !googleReady) return
    load()
  }, [location, googleReady, feed])

  async function load() {
    if (!location) return
    setLoading(true)
    setRecs([])
    const results = await fetchRecommendations(currentProfile, location, visitedNames)
    setRecs(results)
    setLoading(false)
  }

  const noReviewsYet = reviews.length < 3

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-stone-800">For You ✨</h1>
          <p className="text-stone-400 text-sm mt-0.5">Based on your taste, nearby</p>
        </div>
        {location && (
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-amber-600 text-sm font-medium disabled:opacity-40">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 bg-stone-100 rounded-2xl p-1">
        {([
          { key: 'both',   label: '💑 Both' },
          { key: 'sam',    label: '👨🏻‍🍳 Sam' },
          { key: 'olivia', label: '👩🏾‍🍳 Olivia' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setFeed(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${feed === key ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Preference summary */}
      {!noReviewsYet && (
        <div className="bg-amber-50 rounded-2xl p-4 mb-5">
          <p className="text-xs text-stone-500 font-medium mb-1 uppercase tracking-wide">
            {feed === 'both' ? 'What you both love' : `What ${feed === 'sam' ? 'Sam' : 'Olivia'} loves`}
          </p>
          <ProfileSummary profile={currentProfile} />
          {currentProfile.topCuisines.length === 0 && (
            <p className="text-stone-400 text-sm">Not enough reviews yet — add more visits to unlock personalized picks!</p>
          )}
        </div>
      )}

      {noReviewsYet && (
        <div className="bg-amber-50 rounded-2xl p-5 mb-5 text-center">
          <div className="text-3xl mb-2">🍽️</div>
          <p className="text-stone-600 font-medium">Add at least 3 reviews</p>
          <p className="text-stone-400 text-sm mt-1">The more you review, the smarter the recommendations get!</p>
        </div>
      )}

      {/* Location status */}
      {!location && !locError && (
        <div className="flex items-center gap-2 text-stone-400 text-sm mb-5">
          <Navigation size={14} className="animate-pulse" />
          Getting your location…
        </div>
      )}
      {locError && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-5 flex items-center gap-2">
          <MapPin size={14} />
          {locError}
          <button onClick={getLocation} className="underline ml-1">Try again</button>
        </div>
      )}
      {location && !loading && !locError && (
        <div className="flex items-center gap-1.5 text-stone-400 text-xs mb-4">
          <Navigation size={12} className="text-green-500" />
          Using your current location
        </div>
      )}

      {/* Results */}
      {!isGoogleConfigured() && (
        <div className="text-center py-10 text-stone-400">
          <p>Google Places API key required for recommendations.</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-amber-50 shadow-sm animate-pulse">
              <div className="h-36 bg-stone-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-stone-100 rounded w-3/4" />
                <div className="h-2 bg-stone-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && recs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {recs.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
        </div>
      )}

      {!loading && location && googleReady && recs.length === 0 && !noReviewsYet && (
        <div className="text-center py-10 text-stone-400">
          <div className="text-4xl mb-3">🔍</div>
          <p>No new spots found nearby.</p>
          <p className="text-sm mt-1">Try expanding your search area or adding more reviews.</p>
        </div>
      )}
    </div>
  )
}
