import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { MapPin, Globe, Phone, ArrowLeft, Plus, Trash2, PenLine } from 'lucide-react'
import * as db from '../lib/db'
import { useData } from '../lib/DataContext'
import { format } from 'date-fns'
import StarRating from '../components/StarRating'
import PriceTag from '../components/PriceTag'
import AddReviewModal from '../components/AddReviewModal'
import type { Restaurant, Visit, Reviewer } from '../types'
import { isReviewSealed, sealedMinsLeft as sealMinsLeft } from '../lib/seal'

export default function RestaurantDetail() {
  const { id } = useParams<{ id: string }>()
  const { refresh } = useData()
  const navigate = useNavigate()
  const [restaurant, setRestaurant] = useState<Restaurant | undefined>()
  const [visits, setVisits] = useState<Visit[]>([])
  const [reviewModal, setReviewModal] = useState<{ visitId: string; reviewer: Reviewer } | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  async function load() {
    const [r, v] = await Promise.all([db.getRestaurant(id!), db.getVisitsByRestaurant(id!)])
    setRestaurant(r)
    setVisits(v)
  }

  useEffect(() => { load() }, [id])

  if (!restaurant) return <div className="text-center py-20 text-stone-400">Loading…</div>

  const allReviews = visits.flatMap(v => v.reviews || [])
  const allPhotos = visits.flatMap(v => v.photos || [])
  const samReviews = allReviews.filter(r => r.reviewer === 'sam')
  const oliviaReviews = allReviews.filter(r => r.reviewer === 'olivia')
  const avg = (arr: typeof allReviews, field: keyof typeof allReviews[0] = 'overall_rating') =>
    arr.length ? (arr.reduce((s, r) => s + (r[field] as number), 0) / arr.length).toFixed(1) : '—'
  const disagreement = samReviews.length && oliviaReviews.length &&
    Math.abs(parseFloat(avg(samReviews)) - parseFloat(avg(oliviaReviews))) >= 2

  const isSealed = isReviewSealed
  const sealedMinsLeft = sealMinsLeft

  async function handleDeleteRestaurant() {
    if (!confirm(`Delete "${restaurant?.name}"? This cannot be undone.`)) return
    await db.deleteRestaurant(id!)
    refresh()
    navigate('/restaurants')
  }

  async function handleDeleteVisit(visitId: string) {
    if (!confirm('Delete this visit and its reviews?')) return
    await db.deleteVisit(visitId)
    await load(); refresh()
  }

  async function handleDeletePhoto(photoId: string) {
    await db.deletePhoto(photoId)
    await load(); refresh()
  }

  async function toggleBestDish(photoId: string, current: boolean) {
    await db.updatePhoto(photoId, { is_best_dish: !current })
    await load(); refresh()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
      <Link to="/restaurants" className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-600 mb-6 text-sm">
        <ArrowLeft size={14} /> Back to restaurants
      </Link>

      <div className="bg-white rounded-2xl p-6 border border-amber-50 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-['Playfair_Display'] text-3xl font-bold text-stone-800">{restaurant.name}</h1>
            <p className="text-stone-500 mt-1">{restaurant.cuisine}</p>
            <div className="flex items-center gap-2 mt-2 text-stone-400 text-sm">
              <MapPin size={14} /><span>{restaurant.address}</span>
              {restaurant.price_range && <PriceTag level={restaurant.price_range} />}
            </div>
            {restaurant.website && <a href={restaurant.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-amber-600 hover:text-amber-700 text-sm"><Globe size={13} /> {restaurant.website}</a>}
            {restaurant.phone && <div className="flex items-center gap-1 mt-1 text-stone-400 text-sm"><Phone size={13} /> {restaurant.phone}</div>}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {visits.some(v => v.reviews?.some(r => r.is_pick && r.reviewer === 'sam')) && <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">⭐ Sam's Pick</span>}
            {visits.some(v => v.reviews?.some(r => r.is_pick && r.reviewer === 'olivia')) && <span className="bg-pink-100 text-pink-700 text-xs px-3 py-1 rounded-full font-medium">⭐ Olivia's Pick</span>}
            <button onClick={handleDeleteRestaurant} className="text-stone-300 hover:text-red-400 transition-colors mt-1" title="Delete restaurant"><Trash2 size={16} /></button>
            {disagreement && <span className="bg-orange-100 text-orange-700 text-xs px-3 py-1 rounded-full font-medium">🤔 Divided Opinion</span>}
          </div>
        </div>

        {allReviews.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-amber-50 min-w-0">
            {([
              { name: 'Sam', emoji: '👨🏻‍🍳', reviews: samReviews, reviewer: 'sam' as const },
              { name: 'Olivia', emoji: '👩🏾‍🍳', reviews: oliviaReviews, reviewer: 'olivia' as const },
            ]).map(({ name, emoji, reviews }) => {
              if (reviews.length === 0) return null
              const latestReview = reviews[reviews.length - 1]
              const sealedTop = isSealed(latestReview, allReviews)
              const minsLeftTop = sealedMinsLeft(latestReview)
              if (sealedTop) return (
                <div key={name} className="flex flex-col items-center justify-center bg-stone-100 rounded-xl p-4 text-center border-2 border-dashed border-stone-200 min-w-0">
                  <span className="text-xl mb-1">🔒</span>
                  <span className="text-sm font-medium text-stone-500">{emoji} {name}</span>
                  <span className="text-xs text-stone-400 mt-1">Sealed · {minsLeftTop}m left</span>
                </div>
              )
              return (
                <div key={name} className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    <span>{emoji}</span><span className="font-semibold text-stone-700">{name}</span>
                    <StarRating value={parseFloat(avg(reviews))} readonly size={13} />
                    <span className="text-stone-500 text-sm">{avg(reviews)}</span>
                  </div>
                  <div className="space-y-1 text-xs text-stone-400">
                    {(['food_rating', 'service_rating', 'ambiance_rating', 'value_rating'] as const).map(field => (
                      <div key={field} className="flex items-center gap-1.5">
                        <span className="w-14 capitalize shrink-0">{field.replace('_rating', '')}</span>
                        <div className="flex-1 bg-amber-50 rounded-full h-1.5 min-w-0">
                          <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${(parseFloat(avg(reviews, field)) / 5) * 100}%` }} />
                        </div>
                        <span className="w-5 text-right shrink-0">{avg(reviews, field)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {allPhotos.length > 0 && (
        <div className="mb-6">
          <h2 className="font-['Playfair_Display'] text-xl font-semibold text-stone-800 mb-3">📸 Photos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allPhotos.map(photo => (
              <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-amber-50">
                <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                {photo.is_best_dish && (
                  <button onClick={() => toggleBestDish(photo.id, photo.is_best_dish)}
                    className="absolute top-1 left-1 bg-amber-500 hover:bg-red-400 text-white text-xs px-1.5 py-0.5 rounded-full transition-colors">
                    ⭐ Best dish ×
                  </button>
                )}
                <button onClick={() => handleDeletePhoto(photo.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={10} />
                </button>
                {photo.caption && <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">{photo.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-['Playfair_Display'] text-xl font-semibold text-stone-800">Visit History</h2>
        <Link to={`/add?restaurant=${id}`} className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors">
          <Plus size={14} /> Add Visit
        </Link>
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-10 text-stone-400 bg-white rounded-2xl border border-amber-50">No visits yet.</div>
      ) : (
        <div className="space-y-4">
          {visits.map(visit => (
            <div key={visit.id} className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-semibold text-stone-700">{format(new Date(visit.date), 'MMMM d, yyyy')}</span>
                  {visit.occasion && <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{visit.occasion}</span>}
                </div>
                <button onClick={() => handleDeleteVisit(visit.id)} className="text-stone-300 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['sam', 'olivia'] as const).map(reviewer => {
                  const review = visit.reviews?.find(r => r.reviewer === reviewer)
                  const emoji = reviewer === 'sam' ? '👨🏻‍🍳' : '👩🏾‍🍳'
                  const name = reviewer === 'sam' ? 'Sam' : 'Olivia'
                  if (!review) return (
                    <button key={reviewer} onClick={() => setReviewModal({ visitId: visit.id, reviewer })}
                      className="border-2 border-dashed border-amber-200 rounded-xl p-4 text-center hover:border-amber-400 hover:bg-amber-50 transition-colors">
                      <span className="text-2xl block mb-1">{emoji}</span>
                      <span className="text-sm text-amber-600 font-medium">{name} hasn't reviewed yet</span>
                      <span className="block text-xs text-stone-400 mt-0.5">Tap to add review</span>
                    </button>
                  )
                  const sealed = isSealed(review, visit.reviews || [])
                  const minsLeft = sealedMinsLeft(review)
                  if (sealed) return (
                    <div key={reviewer} className="bg-stone-100 rounded-xl p-4 text-center border-2 border-dashed border-stone-200">
                      <span className="text-2xl block mb-1">🔒</span>
                      <span className="font-medium text-stone-600">{emoji} {name}'s review</span>
                      <p className="text-xs text-stone-400 mt-1">Sealed for {minsLeft} more min{minsLeft !== 1 ? 's' : ''}</p>
                    </div>
                  )
                  return (
                    <div key={reviewer} className="bg-amber-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-700">{emoji} {name}</span>
                          <StarRating value={review.overall_rating} readonly size={14} />
                          {review.is_pick && <span className="text-xs text-amber-600">★ Pick</span>}
                        </div>
                        <button onClick={() => setReviewModal({ visitId: visit.id, reviewer })} className="text-stone-300 hover:text-amber-500 transition-colors"><PenLine size={13} /></button>
                      </div>
                      {review.review_text && <p className="text-stone-500 text-sm leading-relaxed">"{review.review_text}"</p>}
                      <div className="mt-2 text-xs">
                        {{ loved: <span className="text-green-600">😍 Loved it</span>, liked: <span className="text-green-500">😊 Liked it</span>, indifferent: <span className="text-amber-500">😐 Indifferent</span>, didnt_like: <span className="text-orange-500">😕 Didn't like it</span>, hated: <span className="text-red-500">😤 Hated it</span> }[review.would_return]}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewModal && (
        <AddReviewModal
          visitId={reviewModal.visitId}
          reviewer={reviewModal.reviewer}
          existing={visits.find(v => v.id === reviewModal.visitId)?.reviews?.find(r => r.reviewer === reviewModal.reviewer)}
          onClose={() => setReviewModal(null)}
          onSaved={async () => { await load(); refresh() }}
        />
      )}
    </div>
  )
}
