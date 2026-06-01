import { useState, useRef, useCallback } from 'react'
import { Heart, X, Star, RefreshCw, MapPin, Loader } from 'lucide-react'
import type { NearbyPlace } from '../lib/googlePlaces'
import PriceTag from './PriceTag'

interface Props {
  cards: NearbyPlace[]
  loading: boolean
  onLike: (place: NearbyPlace) => void
  onSkip: (place: NearbyPlace) => void
  onRefresh: () => void
}

const SWIPE_THRESHOLD = 90

export default function DiscoverCards({ cards, loading, onLike, onSkip, onRefresh }: Props) {
  const [index, setIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  const current = cards[index]
  const next = cards[index + 1]

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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (exiting) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setDragging(true)
  }, [exiting])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || exiting) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Lock direction after first significant move
    if (isHorizontal.current === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }
    if (!isHorizontal.current) return
    setDragX(dx)
  }, [dragging, exiting])

  const onTouchEnd = useCallback(() => {
    setDragging(false)
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
      <div className="text-5xl">🍽️</div>
      <p className="font-semibold text-stone-700">You've seen them all!</p>
      <p className="text-stone-400 text-sm">Check back when you're in a new area</p>
      <button onClick={onRefresh} className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
        <RefreshCw size={15} /> Refresh
      </button>
    </div>
  )

  const progress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1)
  const rotation = dragX * 0.08
  const isLiking = dragX > 30
  const isSkipping = dragX < -30

  let cardTransform = `translateX(${dragX}px) rotate(${rotation}deg)`
  if (exiting === 'right') cardTransform = `translateX(120vw) rotate(20deg)`
  if (exiting === 'left') cardTransform = `translateX(-120vw) rotate(-20deg)`

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Card stack */}
      <div className="relative w-full max-w-sm" style={{ height: 420 }}>

        {/* Next card (behind) */}
        {next && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-md"
            style={{ transform: `scale(${0.95 + progress * 0.05})`, transition: 'transform 0.1s', zIndex: 1 }}>
            <CardContent place={next} />
          </div>
        )}

        {/* Current card (top) */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl cursor-grab active:cursor-grabbing"
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
          <CardContent place={current} />

          {/* Like overlay */}
          <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-3xl transition-opacity"
            style={{ opacity: isLiking ? progress : 0, pointerEvents: 'none' }}>
            <div className="border-4 border-white rounded-2xl px-6 py-3 rotate-[-15deg]">
              <span className="text-white text-3xl font-black tracking-wide">WISHLIST ♥</span>
            </div>
          </div>

          {/* Skip overlay */}
          <div className="absolute inset-0 bg-red-400/80 flex items-center justify-center rounded-3xl transition-opacity"
            style={{ opacity: isSkipping ? progress : 0, pointerEvents: 'none' }}>
            <div className="border-4 border-white rounded-2xl px-6 py-3 rotate-[15deg]">
              <span className="text-white text-3xl font-black tracking-wide">SKIP ✕</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-8">
        <button
          onClick={() => !exiting && triggerExit('left')}
          className="w-14 h-14 rounded-full bg-white border-2 border-red-300 flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-red-50"
        >
          <X size={24} className="text-red-400" />
        </button>

        <div className="text-xs text-stone-400 text-center">
          {index + 1} of {cards.length}
        </div>

        <button
          onClick={() => !exiting && triggerExit('right')}
          className="w-14 h-14 rounded-full bg-white border-2 border-green-400 flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-green-50"
        >
          <Heart size={24} className="text-green-500" />
        </button>
      </div>

      <p className="text-xs text-stone-400">Swipe right to wishlist · swipe left to skip</p>
    </div>
  )
}

function CardContent({ place }: { place: NearbyPlace }) {
  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Photo */}
      <div className="flex-1 bg-amber-50 relative overflow-hidden">
        {place.photoUrl ? (
          <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">🍴</div>
        )}
        {/* Rating badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-xl px-2.5 py-1.5 flex items-center gap-1 shadow-sm">
          <Star size={13} className="text-amber-500 fill-amber-500" />
          <span className="font-bold text-stone-800 text-sm">{place.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-['Playfair_Display'] font-bold text-stone-800 text-xl leading-tight">{place.name}</h3>
          <PriceTag level={place.priceLevel} className="text-stone-500 shrink-0 mt-0.5" />
        </div>
        <div className="flex items-center gap-1 text-xs text-stone-400 mt-1">
          <MapPin size={11} />
          <span className="truncate">{place.address}</span>
        </div>
      </div>
    </div>
  )
}
