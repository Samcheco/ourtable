import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Upload, MapPin, AlertCircle } from 'lucide-react'
import { loadGoogleMaps, attachAutocomplete, isGoogleConfigured } from '../lib/googlePlaces'
import type { PlaceResult } from '../lib/googlePlaces'
import * as db from '../lib/db'
import { useData } from '../lib/DataContext'
import type { Reviewer } from '../types'
import StarRating from '../components/StarRating'
import { useDropzone } from 'react-dropzone'


const CUISINES = [
  'Afghan', 'African', 'American', 'Argentinian', 'Armenian',
  'Brazilian', 'British', 'Burmese', 'Cajun', 'Caribbean',
  'Chinese', 'Colombian', 'Cuban', 'Ethiopian', 'Filipino',
  'French', 'Fusion', 'Georgian', 'German', 'Greek',
  'Hawaiian', 'Indian', 'Indonesian', 'Iranian/Persian', 'Irish',
  'Israeli', 'Italian', 'Jamaican', 'Japanese', 'Korean',
  'Latin American', 'Lebanese', 'Malaysian', 'Mediterranean', 'Mexican',
  'Middle Eastern', 'Moroccan', 'Nepalese', 'Pakistani', 'Peruvian',
  'Pizza', 'Portuguese', 'Russian', 'Seafood', 'Southern/Soul Food',
  'Spanish', 'Sri Lankan', 'Steakhouse', 'Sushi', 'Swedish',
  'Taiwanese', 'Tex-Mex', 'Thai', 'Turkish', 'Ukrainian',
  'Vegan', 'Vegetarian', 'Vietnamese', 'Other',
]

const OCCASIONS = [
  'Anniversary', 'Birthday', 'Business Dinner', 'Casual Lunch',
  'Celebration', 'Date Night', 'Family Dinner', 'Girls Night',
  'Happy Hour', 'Holiday Meal', 'Late Night', 'Networking',
  'Special Occasion', 'Sports Watch', 'Tasting Menu', 'Weekend Brunch',
  'Other',
]

interface ReviewForm {
  overall_rating: number
  food_rating: number
  service_rating: number
  ambiance_rating: number
  value_rating: number
  review_text: string
  would_return: 'loved' | 'liked' | 'indifferent' | 'didnt_like' | 'hated'
  is_pick: boolean
}

const emptyReview = (): ReviewForm => ({
  overall_rating: 0, food_rating: 0, service_rating: 0, ambiance_rating: 0, value_rating: 0,
  review_text: '', would_return: 'liked', is_pick: false,
})

interface PhotoEntry {
  file?: File
  url: string
  caption: string
  is_best_dish: boolean
  uploaded_by: Reviewer
  fromGoogle?: boolean
}

export default function AddVisit() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const existingRestaurantId = searchParams.get('restaurant')
  const { restaurants } = useData()
  const existingRestaurant = existingRestaurantId ? restaurants.find(r => r.id === existingRestaurantId) : null

  const autocompleteRef = useRef<HTMLInputElement>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [manualName, setManualName] = useState('')

  const [cuisine, setCuisine] = useState('Italian')
  const [customCuisine, setCustomCuisine] = useState('')
  const [priceRange, setPriceRange] = useState(2)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [occasion, setOccasion] = useState('Date Night')
  const [customOccasion, setCustomOccasion] = useState('')

  const [samReview, setSamReview] = useState<ReviewForm>(emptyReview())
  const [oliviaReview, setOliviaReview] = useState<ReviewForm>(emptyReview())
  const [activeReviewer, setActiveReviewer] = useState<Reviewer>('sam')
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isGoogleConfigured()) return
    loadGoogleMaps()
      .then(() => setGoogleLoaded(true))
      .catch(console.error)
  }, [])

  // Wire up autocomplete once Google is ready
  useEffect(() => {
    if (!googleLoaded || !autocompleteRef.current) return
    const cleanup = attachAutocomplete(autocompleteRef.current, (place) => {
      setSelectedPlace(place)
      setManualName(place.name)
      if (place.photoUrls.length > 0) {
        setPhotos(prev => [
          ...prev.filter(p => !p.fromGoogle),
          ...place.photoUrls.map((url) => ({
            url, caption: '', is_best_dish: false, uploaded_by: 'sam' as Reviewer, fromGoogle: true,
          })),
        ])
      }
    })
    return cleanup
  }, [googleLoaded])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const url = URL.createObjectURL(file)
      setPhotos(prev => [...prev, { file, url, caption: '', is_best_dish: false, uploaded_by: activeReviewer }])
    })
  }, [activeReviewer])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, multiple: true,
  })

  function updateReview(reviewer: Reviewer, updates: Partial<ReviewForm>) {
    if (reviewer === 'sam') setSamReview(r => ({ ...r, ...updates }))
    else setOliviaReview(r => ({ ...r, ...updates }))
  }

  const review = activeReviewer === 'sam' ? samReview : oliviaReview

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const name = existingRestaurant?.name || selectedPlace?.name || manualName
    if (!name) { alert('Please search for or enter a restaurant name.'); return }

    setSubmitting(true)
    try {
      let restaurantId = existingRestaurant?.id
      if (!restaurantId) {
        const saved = await db.saveRestaurant({
          name,
          address: selectedPlace?.address || '',
          lat: selectedPlace?.lat || 0,
          lng: selectedPlace?.lng || 0,
          cuisine: cuisine === 'Other' ? (customCuisine.trim() || 'Other') : cuisine,
          price_range: priceRange as 1 | 2 | 3 | 4,
        })
        restaurantId = saved.id
      }

      const finalOccasion = occasion === 'Other' ? (customOccasion.trim() || 'Other') : occasion
      const visit = await db.saveVisit({ restaurant_id: restaurantId, date, occasion: finalOccasion, notes: '' })

      if (samReview.overall_rating > 0) await db.saveReview({ ...samReview, visit_id: visit.id, reviewer: 'sam' })
      if (oliviaReview.overall_rating > 0) await db.saveReview({ ...oliviaReview, visit_id: visit.id, reviewer: 'olivia' })

      await Promise.all(photos.map(p =>
        db.savePhoto({ visit_id: visit.id, url: p.url, caption: p.caption, is_best_dish: p.is_best_dish, uploaded_by: p.uploaded_by })
      ))

      navigate(`/restaurants/${restaurantId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-8">
      <h1 className="font-['Playfair_Display'] text-3xl font-bold text-stone-800 mb-8">Add a Visit</h1>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Restaurant */}
        {existingRestaurant ? (
          <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm">
            <p className="text-xs text-stone-400 mb-1 uppercase tracking-wide">Restaurant</p>
            <p className="font-semibold text-stone-800 text-lg">{existingRestaurant.name}</p>
            {existingRestaurant.address && (
              <p className="text-stone-400 text-sm flex items-center gap-1 mt-0.5"><MapPin size={11} />{existingRestaurant.address}</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm space-y-4">
            <p className="font-semibold text-stone-700">Restaurant</p>

            {isGoogleConfigured() ? (
              <div>
                <input
                  ref={autocompleteRef}
                  placeholder={googleLoaded ? 'Search for a restaurant…' : 'Loading search…'}
                  disabled={!googleLoaded}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/50 disabled:opacity-50"
                />
                {selectedPlace && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-stone-500 bg-amber-50 rounded-lg px-3 py-2">
                    <MapPin size={13} className="mt-0.5 text-amber-500 shrink-0" />
                    <span>{selectedPlace.address}</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-700">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Add <code>VITE_GOOGLE_PLACES_KEY</code> to your <code>.env</code> file to enable live search.</span>
                </div>
                <input
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="Restaurant name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Cuisine</label>
                <select value={cuisine} onChange={e => setCuisine(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {CUISINES.map(c => <option key={c}>{c}</option>)}
                </select>
                {cuisine === 'Other' && (
                  <input
                    value={customCuisine}
                    onChange={e => setCustomCuisine(e.target.value)}
                    placeholder="Enter cuisine type…"
                    className="mt-2 w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-stone-400 mb-1">Price Range</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(p => (
                    <button key={p} type="button" onClick={() => setPriceRange(p)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${priceRange === p ? 'bg-amber-600 border-amber-600 text-white' : 'border-stone-200 text-stone-500'}`}>
                      {'$'.repeat(p)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visit details */}
        <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm">
          <p className="font-semibold text-stone-700 mb-3">Visit</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Date</label>
              <div className="w-full rounded-xl border border-stone-200 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full px-3 py-3 text-base bg-white focus:outline-none appearance-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Occasion</label>
              <div className="w-full rounded-xl border border-stone-200 overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
                <select value={occasion} onChange={e => setOccasion(e.target.value)}
                  className="w-full px-3 py-3 text-base bg-white focus:outline-none appearance-none">
                  {OCCASIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {occasion === 'Other' && (
                <input
                  value={customOccasion}
                  onChange={e => setCustomOccasion(e.target.value)}
                  placeholder="Describe the occasion…"
                  className="mt-2 w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm">
          <div className="flex gap-2 mb-5">
            {(['sam', 'olivia'] as Reviewer[]).map(r => (
              <button key={r} type="button" onClick={() => setActiveReviewer(r)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeReviewer === r ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-stone-500 hover:bg-amber-100'}`}>
                {r === 'sam' ? '👨🏻‍🍳 Sam' : '👩🏾‍🍳 Olivia'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-xs text-stone-400 mb-2 uppercase tracking-wide">Overall</p>
              <StarRating value={review.overall_rating} onChange={v => updateReview(activeReviewer, { overall_rating: v })} size={36} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {(['food_rating', 'service_rating', 'ambiance_rating', 'value_rating'] as const).map(field => (
                <div key={field}>
                  <p className="text-xs text-stone-400 mb-1 capitalize">{field.replace('_rating', '')}</p>
                  <StarRating value={review[field]} onChange={v => updateReview(activeReviewer, { [field]: v })} size={18} />
                </div>
              ))}
            </div>
            <textarea value={review.review_text} onChange={e => updateReview(activeReviewer, { review_text: e.target.value })}
              rows={2} placeholder={`${activeReviewer === 'sam' ? "Sam's" : "Olivia's"} thoughts…`}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { v: 'loved',      label: '😍 Loved',       active: 'bg-green-500 text-white' },
                  { v: 'liked',      label: '😊 Liked',       active: 'bg-green-400 text-white' },
                  { v: 'indifferent',label: '😐 Indifferent', active: 'bg-amber-400 text-white' },
                  { v: 'didnt_like', label: '😕 Didn\'t Like',active: 'bg-orange-400 text-white' },
                  { v: 'hated',      label: '😤 Hated',       active: 'bg-red-500 text-white' },
                ] as const).map(({ v, label, active }) => (
                  <button key={v} type="button" onClick={() => updateReview(activeReviewer, { would_return: v })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${review.would_return === v ? active : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-sm text-stone-500 cursor-pointer select-none">
                <input type="checkbox" checked={review.is_pick} onChange={e => updateReview(activeReviewer, { is_pick: e.target.checked })} className="w-4 h-4 accent-amber-600" />
                My pick ⭐
              </label>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl p-5 border border-amber-50 shadow-sm">
          <p className="font-semibold text-stone-700 mb-3">Photos</p>
          {photos.filter(p => p.fromGoogle).length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-stone-400 mb-2">From Google</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.filter(p => p.fromGoogle).map((p, i) => (
                  <div key={i} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-amber-50">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotos(ps => ps.filter(x => x.url !== p.url))}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${isDragActive ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-amber-300'}`}>
            <input {...getInputProps()} />
            <Upload size={22} className="mx-auto mb-1.5 text-stone-300" />
            <p className="text-sm text-stone-400">{isDragActive ? 'Drop photos here' : 'Upload your own dish photos'}</p>
          </div>
          {photos.filter(p => !p.fromGoogle).length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.filter(p => !p.fromGoogle).map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt="" className="w-full aspect-square object-cover rounded-xl" />
                  <button type="button" onClick={() => setPhotos(ps => ps.filter(x => x.url !== p.url))}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                    <X size={10} />
                  </button>
                  <label className="flex items-center gap-1 mt-1 text-xs text-stone-500 cursor-pointer">
                    <input type="checkbox" checked={p.is_best_dish}
                      onChange={e => setPhotos(ps => ps.map(x => x.url === p.url ? { ...x, is_best_dish: e.target.checked } : x))}
                      className="accent-amber-600" />
                    Best dish
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-semibold text-lg transition-colors shadow-sm">
          {submitting ? 'Saving…' : 'Save Visit'}
        </button>
      </form>
    </div>
  )
}
