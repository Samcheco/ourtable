import { useState, useRef, useCallback, useEffect } from 'react'
import { Heart, X, Star, MapPin, Loader, ChevronLeft, ChevronRight, Globe, RotateCcw, Compass, Map } from 'lucide-react'
import type { NearbyPlace, PlaceDetails } from '../lib/googlePlaces'
import { getPlaceDetails, inferCuisine } from '../lib/googlePlaces'
import PriceTag from './PriceTag'

export interface EmptyAction {
  label: string
  description: string
  icon: 'expand' | 'resurface' | 'reset' | 'map'
  onPress: () => void
}

interface Props {
  cards: NearbyPlace[]
  loading: boolean
  loadingMore: boolean
  loadingLabel?: string
  emptyActions?: EmptyAction[]
  onLike: (place: NearbyPlace) => void
  onSkip: (place: NearbyPlace) => void
  onRunningLow: () => void
}

const SWIPE_THRESHOLD = 90

const SIGNAL_STYLE: Record<string, string> = {
  'Michelin': 'bg-red-100 text-red-700',
  'Michelin Bib Gourmand': 'bg-red-100 text-red-700',
  'James Beard Winner': 'bg-amber-100 text-amber-800',
  'James Beard Nominated': 'bg-amber-50 text-amber-700',
  'Infatuation': 'bg-pink-100 text-pink-700',
  'Eater LA': 'bg-orange-100 text-orange-700',
  'LA Times': 'bg-blue-100 text-blue-700',
  'LA institution': 'bg-stone-100 text-stone-600',
  'Local institution': 'bg-stone-100 text-stone-600',
  'Local favorite': 'bg-stone-100 text-stone-600',
}

export default function DiscoverCards({ cards, loading, loadingMore, loadingLabel, emptyActions = [], onLike, onSkip, onRunningLow }: Props) {
  const [index, setIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const [detailsCache, setDetailsCache] = useState<Record<string, PlaceDetails>>({})
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const touchInPhoto = useRef(false)
  const hasCalledRunningLow = useRef(false)

  const current = cards[index]
  const next = cards[index + 1]

  useEffect(() => {
    const remaining = cards.length - index
    if (remaining <= 3 && remaining > 0 && !hasCalledRunningLow.current) {
      hasCalledRunningLow.current = true
      onRunningLow()
    }
  }, [index, cards.length])

  useEffect(() => {
    if (cards.length > index + 3) hasCalledRunningLow.current = false
  }, [cards.length])

  useEffect(() => {
    const toFetch = [current, next].filter(Boolean)
    toFetch.forEach(place => {
      if (place && !detailsCache[place.placeId]) {
        getPlaceDetails(place.placeId).then(details => {
          setDetailsCache(prev => ({ ...prev, [place.placeId]: details }))
        })
      }
    })
  }, [index, cards])

  function triggerExit(dir: 'left' | 'right') {
    setExiting(dir)
    setTimeout(() => {
      if (dir === 'right') onLike(cards[index])
      else onSkip(cards[index])
      setIndex(i => i + 1)
      setExiting(null)
      setDragX(0)
    }, 300)
  }

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (exiting) return
    const target = e.target as HTMLElement
    touchInPhoto.current = !!target.closest('[data-photo-area]')
    if (touchInPhoto.current) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setDragging(true)
  }, [exiting])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || exiting || touchInPhoto.current) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (isHorizontal.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }
    if (!isHorizontal.current) return
    setDragX(dx)
  }, [dragging, exiting])

  const onTouchEnd = useCallback(() => {
    setDragging(false)
    touchInPhoto.current = false
    isHorizontal.current = null
    if (Math.abs(dragX) >= SWIPE_THRESHOLD) {
      triggerExit(dragX > 0 ? 'right' : 'left')
    } else {
      setDragX(0)
    }
  }, [dragX])

  const ICON_MAP = {
    expand: <Compass size={18} className="text-amber-600" />,
    resurface: <RotateCcw size={18} className="text-amber-600" />,
    reset: <RotateCcw size={18} className="text-amber-600" />,
    map: <Map size={18} className="text-amber-600" />,
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-stone-400 gap-3">
      <Loader size={32} className="animate-spin text-amber-500" />
      <p className="text-sm">{loadingLabel || 'Finding great restaurants near you…'}</p>
    </div>
  )

  if (!current) return (
    <div className="flex flex-col items-center py-12 text-center gap-5 px-2">
      {loadingMore ? (
        <>
          <Loader size={28} className="animate-spin text-amber-500" />
          <p className="text-stone-400 text-sm">{loadingLabel || 'Finding more places…'}</p>
        </>
      ) : (
        <>
          <div className="text-4xl">🗺️</div>
          <div>
            <p className="font-semibold text-stone-700 mb-1">You've covered the good spots nearby</p>
            <p className="text-stone-400 text-sm">Here are a few ways to keep going:</p>
          </div>
          <div className="w-full space-y-2.5 max-w-sm">
            {emptyActions.map((action, i) => (
              <button key={i} onClick={action.onPress}
                className="w-full flex items-center gap-3 bg-white border border-amber-100 rounded-2xl p-4 text-left hover:bg-amber-50 active:scale-[0.98] transition-all shadow-sm">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                  {ICON_MAP[action.icon]}
                </div>
                <div>
                  <p className="font-medium text-stone-800 text-sm">{action.label}</p>
                  <p className="text-stone-400 text-xs mt-0.5">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  const progress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1)
  const rotation = dragX * 0.06
  const isLiking = dragX > 30
  const isSkipping = dragX < -30

  let cardTransform = `translateX(${dragX}px) rotate(${rotation}deg)`
  if (exiting === 'right') cardTransform = `translateX(120vw) rotate(20deg)`
  if (exiting === 'left') cardTransform = `translateX(-120vw) rotate(-20deg)`

  const cardHeight = Math.min(620, window.innerHeight - 160)

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="relative w-full max-w-sm" style={{ height: cardHeight }}>

        {next && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-md bg-white"
            style={{ transform: `scale(${0.95 + progress * 0.05})`, transition: 'transform 0.1s', zIndex: 1 }}>
            <CardContent place={next} details={detailsCache[next.placeId] || null} />
          </div>
        )}

        <div
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl bg-white"
          style={{
            transform: cardTransform,
            transition: dragging ? 'none' : 'transform 0.3s ease',
            zIndex: 2,
            touchAction: 'pan-y',
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <CardContent key={current.placeId} place={current} details={detailsCache[current.placeId] || null} />

          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-3xl pointer-events-none"
            style={{ opacity: isLiking ? progress : 0 }}>
            <div className="border-4 border-white rounded-2xl px-6 py-3 rotate-[-15deg]">
              <span className="text-white text-3xl font-black tracking-wide">WISHLIST ♥</span>
            </div>
          </div>

          <div className="absolute inset-0 bg-red-400/80 flex items-center justify-center rounded-3xl pointer-events-none"
            style={{ opacity: isSkipping ? progress : 0 }}>
            <div className="border-4 border-white rounded-2xl px-6 py-3 rotate-[15deg]">
              <span className="text-white text-3xl font-black tracking-wide">SKIP ✕</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <button onClick={() => !exiting && triggerExit('left')}
          className="w-14 h-14 rounded-full bg-white border-2 border-red-300 flex items-center justify-center shadow-md active:scale-95 transition-transform">
          <X size={24} className="text-red-400" />
        </button>
        <span className="text-xs text-stone-400">{index + 1} / {cards.length}</span>
        <button onClick={() => !exiting && triggerExit('right')}
          className="w-14 h-14 rounded-full bg-white border-2 border-green-400 flex items-center justify-center shadow-md active:scale-95 transition-transform">
          <Heart size={24} className="text-green-500" />
        </button>
      </div>

      {loadingMore ? (
        <p className="text-xs text-amber-500 flex items-center gap-1">
          <Loader size={10} className="animate-spin" /> {loadingLabel || 'Finding more places…'}
        </p>
      ) : (
        <p className="text-xs text-stone-400">Swipe right to wishlist · swipe left to skip</p>
      )}
    </div>
  )
}

function CardContent({ place, details }: { place: NearbyPlace; details: PlaceDetails | null }) {
  const [photoIndex, setPhotoIndex] = useState(0)

  const allPhotos = details?.photos?.length
    ? details.photos
    : place.photoUrls?.length
      ? place.photoUrls
      : place.photoUrl ? [place.photoUrl] : []

  const cuisine = inferCuisine(place.types)
  const signals = place.signals || []

  function prevPhoto(e: React.MouseEvent) {
    e.stopPropagation()
    setPhotoIndex(i => (i - 1 + allPhotos.length) % allPhotos.length)
  }
  function nextPhoto(e: React.MouseEvent) {
    e.stopPropagation()
    setPhotoIndex(i => (i + 1) % allPhotos.length)
  }

  return (
    <div className="w-full h-full flex flex-col">

      {/* Photo — takes up 55% with gradient overlay containing name */}
      <div className="relative bg-stone-900 shrink-0" style={{ height: '55%' }} data-photo-area="true">
        {allPhotos.length > 0 ? (
          <img key={allPhotos[photoIndex]} src={allPhotos[photoIndex]} alt={place.name}
            className="w-full h-full object-cover opacity-90" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">🍴</div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Top: signal badges + rating */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <div className="flex flex-wrap gap-1">
            {signals.slice(0, 2).map(s => (
              <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-semibold shadow-sm ${SIGNAL_STYLE[s] || 'bg-white/90 text-stone-700'}`}>
                {s}
              </span>
            ))}
          </div>
          <div className="bg-white/95 backdrop-blur rounded-xl px-2.5 py-1 flex items-center gap-1 shadow-sm shrink-0">
            <Star size={11} className="text-amber-500 fill-amber-500" />
            <span className="font-bold text-stone-800 text-sm">{place.rating.toFixed(1)}</span>
            <span className="text-stone-400 text-xs">
              ({place.userRatingsTotal >= 1000
                ? `${(place.userRatingsTotal / 1000).toFixed(1)}k`
                : place.userRatingsTotal})
            </span>
          </div>
        </div>

        {/* Photo nav arrows */}
        {allPhotos.length > 1 && (
          <>
            <button onClick={prevPhoto} data-photo-area="true"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextPhoto} data-photo-area="true"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors">
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Bottom of photo: name, location, tags */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
          <h3 className="font-['Playfair_Display'] font-bold text-white text-2xl leading-tight drop-shadow-sm">{place.name}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-white/80">
              <MapPin size={10} />
              {place.neighborhood || place.address.split(',').slice(0, 2).join(',')}
            </span>
            {cuisine && cuisine !== 'Restaurant' && (
              <span className="bg-white/20 backdrop-blur text-white text-xs px-2 py-0.5 rounded-full">{cuisine}</span>
            )}
            <PriceTag level={place.priceLevel} className="text-white/80" />
            {details?.openNow !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${details.openNow ? 'bg-green-500/90 text-white' : 'bg-white/20 text-white/70'}`}>
                {details.openNow ? 'Open now' : 'Closed'}
              </span>
            )}
          </div>
          {/* Photo dots */}
          {allPhotos.length > 1 && (
            <div className="flex gap-1 mt-2">
              {allPhotos.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIndex ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info — compact scrollable section */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-4 space-y-3">

        {/* Vibe tags */}
        {place.vibe && place.vibe.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {place.vibe.map(v => (
              <span key={v} className="bg-stone-100 text-stone-600 text-xs px-2.5 py-1 rounded-full font-medium">{v}</span>
            ))}
          </div>
        )}

        {/* Why go — every card has this, curated = editorial, non-curated = generated */}
        <div className={`rounded-xl p-3 ${place.isCurated ? 'bg-amber-50' : 'bg-stone-50'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${place.isCurated ? 'text-amber-700' : 'text-stone-500'}`}>
            {place.isCurated ? 'Why go' : 'The case for it'}
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            {/* If details loaded an editorial summary, prefer that over generated */}
            {details?.editorialSummary && !place.isCurated
              ? details.editorialSummary
              : place.whyGo || 'Loading…'}
          </p>
        </div>

        {/* Known for + Good for — always shown */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-stone-50 rounded-xl p-2.5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Known for</p>
            <p className="text-xs text-stone-600 leading-relaxed">{place.knownFor || '—'}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-2.5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Good for</p>
            <p className="text-xs text-stone-600 leading-relaxed">{place.goodFor?.slice(0, 3).join(', ') || '—'}</p>
          </div>
        </div>

        {/* Drawbacks — honest signals, helps you decide */}
        {place.drawbacks && place.drawbacks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {place.drawbacks.map(d => (
              <span key={d} className="bg-orange-50 text-orange-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                <span>⚠️</span> {d}
              </span>
            ))}
          </div>
        )}

        {/* Signal / buzz badges */}
        {signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {signals.map(s => (
              <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIGNAL_STYLE[s] || 'bg-stone-100 text-stone-500'}`}>
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Confidence indicator */}
        {place.confidence && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <div className={`w-1.5 h-1.5 rounded-full ${place.confidence === 'high' ? 'bg-green-400' : 'bg-amber-400'}`} />
            {place.confidence === 'high' ? 'Strong editorial signal' : 'Good local signal'}
          </div>
        )}

        {/* Website */}
        {details?.website && (
          <a href={details.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700">
            <Globe size={11} />
            <span className="truncate">{details.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
          </a>
        )}

        {/* Google reviews */}
        {details?.reviews && details.reviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">What people say</p>
            {details.reviews.slice(0, 2).map((r, i) => (
              <div key={i} className="bg-stone-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-stone-700">{r.author}</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={9} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{r.text}</p>
              </div>
            ))}
          </div>
        )}

        {!details && (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Loader size={12} className="animate-spin" /> Loading details…
          </div>
        )}
      </div>
    </div>
  )
}
