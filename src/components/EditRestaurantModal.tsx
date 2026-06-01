import { useState } from 'react'
import { X } from 'lucide-react'
import type { Restaurant } from '../types'
import * as db from '../lib/db'

const CUISINES = [
  'American', 'Chinese', 'French', 'Indian', 'Italian',
  'Japanese', 'Korean', 'Mediterranean', 'Mexican', 'Thai', 'Other',
]

interface Props {
  restaurant: Restaurant
  onClose: () => void
  onSaved: () => void
}

export default function EditRestaurantModal({ restaurant, onClose, onSaved }: Props) {
  const [name, setName] = useState(restaurant.name)
  const [address, setAddress] = useState(restaurant.address)
  const [cuisine, setCuisine] = useState(restaurant.cuisine)
  const [priceRange, setPriceRange] = useState(restaurant.price_range)
  const [phone, setPhone] = useState(restaurant.phone || '')
  const [website, setWebsite] = useState(restaurant.website || '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await db.updateRestaurant(restaurant.id, {
        name,
        address,
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
