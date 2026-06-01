import { useState, useRef, useCallback, useEffect } from 'react'
import { Heart, X, Star, RefreshCw, MapPin, Loader, ChevronLeft, ChevronRight, Globe } from 'lucide-react'
import type { NearbyPlace, PlaceDetails } from '../lib/googlePlaces'
import { getPlaceDetails, inferCuisine } from '../lib/googlePlaces'
import PriceTag from './PriceTag'

interface Props {
  cards: NearbyPlace[]
  loading: boolean
  loadingMore: boolean
  onLike: (place: NearbyPlace) => void
  onSkip: (place: NearbyPlace) => void
  onRefresh: () => void
  onRunningLow: () => void
}

const SWIPE_THRESHOLD = 90

export default function DiscoverCards({ cards, loading, loadingMore, onLike, onSkip, onRefresh, onRunningLow }: Props) {
  const [index, setIndex] = useState(0)
  const hasCalledRunningLow = useRef(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const [detailsCache, setDetailsCache] = useState<Record<string, PlaceDetails>>({})
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)
  const touchInPhoto = useRef(false)

  const current = cards[index]
  const next = cards[index + 1]

  // Fire onRunningLow when 3 cards remain
  useEffect(() => {
    const remaining = cards.length - index
    if (remaining <= 3 && remaining > 0 && !hasCalledRunningLow.current) {
      hasCalledRunningLow.current = true
      onRunningLow()
    }
  }, [index, cards.length])

  // Reset the flag when new cards are appended
  useEffect(() => {
    if (cards.length > index + 3) hasCalledRunningLow.current = false
  }, [cards.length])

  // Pre-fetch details for current + next card
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
    // Don't start card swipe if touch begins on photo area
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 text-stone-400 gap-3">
      <Loader size={32} className="animate-spin text-amber-500" />
      <p className="text-sm">Finding great restaurants near you…</p>
    </div>
  )

  if (!current) return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      {loadingMore ? (
        <>
          <Loader size={32} className="animate-spin text-amber-500" />
          <p className="text-stone-400 text-sm">Finding more restaurants…</p>
        </>
      ) : (
        <>
          <div className="text-5xl">🍽️</div>
          <p className="font-semibold text-stone-700">You've seen them all!</p>
          <p className="text-stone-400 text-sm">Try a wider search or come back when you're somewhere new</p>
          <button onClick={onRefresh} className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw size={15} /> Search wider area
          </button>
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

  const cardHeight = Math.min(600, window.innerHeight - 180)

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="relative w-full max-w-sm" style={{ height: cardHeight }}>

        {/* Next card (behind) */}
        {next && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-md bg-white"
            style={{ transform: `scale(${0.95 + progress * 0.05})`, transition: 'transform 0.1s', zIndex: 1 }}>
            <CardContent place={next} details={detailsCache[next.placeId] || null} />
          </div>
        )}

        {/* Current card */}
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
          <CardContent place={current} details={detailsCache[current.placeId] || null} />

          {/* Like overlay */}
          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-3xl pointer-events-none"
            style={{ opacity: isLiking ? progress : 0 }}>
            <div className="border-4 border-white rounded-2xl px-6 py-3 rotate-[-15deg]">
              <span className="text-white text-3xl font-black tracking-wide">WISHLIST ♥</span>
            </div>
          </div>

          {/* Skip overlay */}
          <div className="absolute inset-0 bg-red-400/80 flex items-center justify-center rounded-3xl pointer-events-none"
            style={{ opacity: isSkipping ? progress : 0 }}>
            <div className="border-4 border-white rounded-2xl px-6 py-3 rotate-[15deg]">
              <span className="text-white text-3xl font-black tracking-wide">SKIP ✕</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
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
        <p className="text-xs text-amber-500 flex items-center gap-1"><Loader size={10} className="animate-spin" /> Finding more places…</p>
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
      : place.photoUrl
        ? [place.photoUrl]
        : []

  const cuisine = inferCuisine(place.types)

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

      {/* Photo area */}
      <div className="relative bg-amber-50 shrink-0" style={{ height: '45%' }} data-photo-area="true">
        {allPhotos.length > 0 ? (
          <img
            key={allPhotos[photoIndex]}
            src={allPhotos[photoIndex]}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">🍴</div>
        )}

        {/* Photo nav arrows */}
        {allPhotos.length > 1 && (
          <>
            <button onClick={prevPhoto} data-photo-area="true"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextPhoto} data-photo-area="true"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-colors">
              <ChevronRight size={18} />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1" data-photo-area="true">
              {allPhotos.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setPhotoIndex(i) }}
                  data-photo-area="true"
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Rating + open badge */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
          <div className="bg-white/95 backdrop-blur rounded-xl px-2.5 py-1 flex items-center gap-1 shadow-sm">
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span className="font-bold text-stone-800 text-sm">{place.rating.toFixed(1)}</span>
            <span className="text-stone-400 text-xs">({place.userRatingsTotal >= 1000 ? `${(place.userRatingsTotal/1000).toFixed(1)}k` : place.userRatingsTotal})</span>
          </div>
          {details?.openNow !== undefined && (
            <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${details.openNow ? 'bg-green-500 text-white' : 'bg-stone-500 text-white'}`}>
              {details.openNow ? 'Open now' : 'Closed'}
            </div>
          )}
        </div>
      </div>

      {/* Info — scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">

        {/* Name + price + cuisine */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-['Playfair_Display'] font-bold text-stone-800 text-xl leading-tight">{place.name}</h3>
            <PriceTag level={place.priceLevel} className="text-stone-500 shrink-0 mt-1" />
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">{cuisine}</span>
            <div className="flex items-center gap-1 text-xs text-stone-400">
              <MapPin size={10} />
              <span className="truncate max-w-[180px]">{place.address}</span>
            </div>
          </div>
        </div>

        {/* Editorial summary */}
        {details?.editorialSummary && (
          <p className="text-stone-600 text-sm leading-relaxed italic">"{details.editorialSummary}"</p>
        )}

        {/* Website */}
        {details?.website && (
          <a href={details.website} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700">
            <Globe size={11} />
            <span className="truncate">{details.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
          </a>
        )}

        {/* Google reviews */}
        {details?.reviews && details.reviews.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">What people say</p>
            {details.reviews.map((r, i) => (
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

        {/* Loading state for details */}
        {!details && (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Loader size={12} className="animate-spin" /> Loading details…
          </div>
        )}
      </div>
    </div>
  )
}
