import { useState, useEffect, useRef } from 'react'
import { X, MapPin, Search } from 'lucide-react'
import type { Restaurant } from '../types'
import * as db from '../lib/db'
import { loadGoogleMaps, attachAutocomplete, isGoogleConfigured } from '../lib/googlePlaces'

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

interface Props {
  restaurant: Restaurant
  onClose: () => void
  onSaved: () => void
}

export default function EditRestaurantModal({ restaurant, onClose, onSaved }: Props) {
  const [name, setName] = useState(restaurant.name)
  const [address, setAddress] = useState(restaurant.address)
  const [lat, setLat] = useState(restaurant.lat)
  const [lng, setLng] = useState(restaurant.lng)
  const [cuisine, setCuisine] = useState(restaurant.cuisine)
  const [priceRange, setPriceRange] = useState(restaurant.price_range)
  const [phone, setPhone] = useState(restaurant.phone || '')
  const [website, setWebsite] = useState(restaurant.website || '')
  const [saving, setSaving] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isGoogleConfigured()) return
    loadGoogleMaps().then(() => setGoogleLoaded(true)).catch(console.error)
  }, [])

  useEffect(() => {
    if (!googleLoaded || !searchRef.current) return
    return attachAutocomplete(searchRef.current, (place) => {
      setName(place.name)
      setAddress(place.address)
      setLat(place.lat)
      setLng(place.lng)
      // Clear the search box so it shows the picked result cleanly
      if (searchRef.current) searchRef.current.value = place.name
    })
  }, [googleLoaded])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await db.updateRestaurant(restaurant.id, {
        name,
        address,
        lat,
        lng,
        cuisine,
        price_range: priceRange,
        phone: phone || undefined,
        website: website || undefined,
      })
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-['Playfair_Display'] text-xl font-bold text-stone-800">Edit Restaurant</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Google search to auto-fill location */}
          {isGoogleConfigured() && (
            <div>
              <label className="block text-xs text-stone-400 mb-1">Search to change location</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  ref={searchRef}
                  defaultValue={restaurant.name}
                  placeholder={googleLoaded ? 'Search for a location…' : 'Loading…'}
                  disabled={!googleLoaded}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </div>
              {address !== restaurant.address && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  <MapPin size={11} className="mt-0.5 shrink-0" />
                  <span>{address}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-stone-400 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Cuisine</label>
            <select value={cuisine} onChange={e => setCuisine(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              {CUISINES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Price Range</label>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map(p => (
                <button key={p} type="button" onClick={() => setPriceRange(p)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${priceRange === p ? 'bg-amber-600 border-amber-600 text-white' : 'border-stone-200 text-stone-500'}`}>
                  {'$'.repeat(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Phone (optional)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Website (optional)</label>
            <input value={website} onChange={e => setWebsite(e.target.value)} type="url"
              placeholder="https://"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white py-3 rounded-2xl font-semibold transition-colors mt-2">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
