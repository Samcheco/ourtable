import { Link } from 'react-router-dom'
import { MapPin, Camera } from 'lucide-react'
import StarRating from './StarRating'
import PriceTag from './PriceTag'
import type { Restaurant, Review, Photo } from '../types'
import { visibleReviews } from '../lib/seal'

interface Props {
  restaurant: Restaurant
  reviews: Review[]
  photos: Photo[]
  visitCount: number
}

export default function RestaurantCard({ restaurant, reviews, photos, visitCount }: Props) {
  const visible = visibleReviews(reviews)
  const samReview = visible.filter(r => r.reviewer === 'sam')
  const oliviaReview = visible.filter(r => r.reviewer === 'olivia')
  const samAvg = samReview.length ? samReview.reduce((s, r) => s + r.overall_rating, 0) / samReview.length : null
  const oliviaAvg = oliviaReview.length ? oliviaReview.reduce((s, r) => s + r.overall_rating, 0) / oliviaReview.length : null
  const consensusAvg = [samAvg, oliviaAvg].filter(Boolean) as number[]
  const consensus = consensusAvg.length ? consensusAvg.reduce((a, b) => a + b, 0) / consensusAvg.length : null
  const disagreement = samAvg !== null && oliviaAvg !== null && Math.abs(samAvg - oliviaAvg) >= 2

  const coverPhoto = photos.find(p => p.is_best_dish) || photos[0]

  return (
    <Link to={`/restaurants/${restaurant.id}`} className="block group">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-amber-50">
        <div className="h-40 bg-amber-50 relative overflow-hidden">
          {coverPhoto ? (
            <img src={coverPhoto.url} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🍴</div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {reviews.some(r => r.is_pick && r.reviewer === 'sam') && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Sam's Pick</span>
            )}
            {reviews.some(r => r.is_pick && r.reviewer === 'olivia') && (
              <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">Olivia's Pick</span>
            )}
          </div>
          {disagreement && (
            <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              🤔 Divided!
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-['Playfair_Display'] font-semibold text-stone-800 text-lg leading-tight">{restaurant.name}</h3>
              <p className="text-stone-500 text-sm mt-0.5">{restaurant.cuisine}</p>
            </div>
            <PriceTag level={restaurant.price_range} className="text-stone-500 shrink-0" />
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-stone-400">
            <MapPin size={12} />
            <span className="truncate">{restaurant.address.split(',').slice(0, 2).join(',')}</span>
          </div>
          {consensus !== null && (
            <div className="mt-3 flex items-center justify-between">
              <StarRating value={consensus} readonly size={16} />
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Camera size={11} /> {photos.length}
                <span className="ml-1">· {visitCount} visit{visitCount !== 1 ? 's' : ''}</span>
              </span>
            </div>
          )}
          {(samAvg !== null || oliviaAvg !== null) && (
            <div className="mt-2 flex gap-3 items-center">
              {samAvg !== null && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-400">Sam</span>
                  <StarRating value={samAvg} readonly size={12} />
                </div>
              )}
              {oliviaAvg !== null && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-stone-400">Olivia</span>
                  <StarRating value={oliviaAvg} readonly size={12} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
