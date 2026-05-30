import { useState, useRef } from 'react'
import { Search, Plus, Trash2, Shuffle, MapPin } from 'lucide-react'
import { useData } from '../lib/DataContext'
import * as db from '../lib/db'
import { searchRestaurants, formatAddress } from '../lib/nominatim'
import type { NominatimResult, Reviewer } from '../types'
import PriceTag from '../components/PriceTag'

const CUISINES = ['Italian', 'Japanese', 'Mexican', 'American', 'Chinese', 'Indian', 'Thai', 'French', 'Mediterranean', 'Korean', 'Other']

export default function Wishlist() {
  const { wishlist, refresh } = useData()
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null!)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [cuisine, setCuisine] = useState('Italian')
  const [priceRange, setPriceRange] = useState(2)
  const [notes, setNotes] = useState('')
  const [addedBy, setAddedBy] = useState<Reviewer>('sam')
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [filterBy, setFilterBy] = useState<'all' | 'sam' | 'olivia'>('all')

  function handleSearch(q: string) {
    setQuery(q)
    clearTimeout(searchTimeout.current)
    if (!q.trim()) { setResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      const res = await searchRestaurants(q)
      setResults(res)
    }, 400)
  }

  function selectPlace(place: NominatimResult) {
    setName(place.display_name.split(',')[0])
    setAddress(formatAddress(place))
    setResults([])
    setQuery('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await db.saveWishlistItem({ name, address, cuisine, price_range: priceRange as 1|2|3|4, notes, added_by: addedBy })
    await refresh()
    setName(''); setAddress(''); setNotes(''); setShowForm(false)
  }

  async function handleDelete(id: string) {
    await db.deleteWishlistItem(id)
    await refresh()
  }

  function pickRandom() {
    const list = wishlist.filter(w => filterBy === 'all' || w.added_by === filterBy)
    if (!list.length) return
    const pick = list[Math.floor(Math.random() * list.length)]
    setHighlighted(pick.id)
    setTimeout(() => setHighlighted(null), 3000)
  }

  const filtered = wishlist.filter(w => filterBy === 'all' || w.added_by === filterBy)

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Playfair_Display'] text-3xl font-bold text-stone-800">Wish List 💫</h1>
        <div className="flex gap-2">
          <button onClick={pickRandom} className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Shuffle size={15} /> Pick for us
          </button>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Add place
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {(['all', 'sam', 'olivia'] as const).map(f => (
          <button key={f} onClick={() => setFilterBy(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${filterBy === f ? 'bg-amber-600 text-white' : 'bg-white text-stone-500 hover:bg-amber-50 border border-amber-100'}`}>
            {f === 'all' ? 'All' : f === 'sam' ? '👨🏻‍🍳 Sam' : '👩🏾‍🍳 Olivia'}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm mb-6 space-y-3">
          <h2 className="font-semibold text-stone-700">Add a place</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Search to auto-fill..."
              className="w-full pl-9 pr-3 py-3 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-amber-400" />
            {results.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                {results.map(r => (
                  <button key={r.place_id} type="button" onClick={() => selectPlace(r)} className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-stone-100 last:border-0">
                    <div className="font-medium text-stone-700 text-sm">{r.display_name.split(',')[0]}</div>
                    <div className="text-stone-400 text-xs">{formatAddress(r)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-stone-500 block mb-1">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-3 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
            <div><label className="text-xs text-stone-500 block mb-1">Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
            <div><label className="text-xs text-stone-500 block mb-1">Cuisine</label>
              <select value={cuisine} onChange={e => setCuisine(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-amber-400">
                {CUISINES.map(c => <option key={c}>{c}</option>)}
              </select></div>
            <div><label className="text-xs text-stone-500 block mb-1">Price</label>
              <div className="flex gap-1">{[1,2,3,4].map(p => (
                <button key={p} type="button" onClick={() => setPriceRange(p)} className={`flex-1 py-2 rounded-lg border text-sm ${priceRange === p ? 'bg-amber-600 border-amber-600 text-white' : 'border-stone-200 text-stone-600'}`}>{'$'.repeat(p)}</button>
              ))}</div></div>
            <div className="col-span-2"><label className="text-xs text-stone-500 block mb-1">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why you want to try it..."
                className="w-full px-3 py-3 rounded-xl border border-stone-200 text-base focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>
            <div><label className="text-xs text-stone-500 block mb-1">Added by</label>
              <div className="flex gap-2">{(['sam', 'olivia'] as Reviewer[]).map(r => (
                <button key={r} type="button" onClick={() => setAddedBy(r)} className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${addedBy === r ? 'bg-amber-600 text-white' : 'bg-amber-50 text-stone-600'}`}>
                  {r === 'sam' ? '👨🏻‍🍳 Sam' : '👩🏾‍🍳 Olivia'}
                </button>
              ))}</div></div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">Add to list</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-stone-500 px-4 py-2 text-sm hover:text-stone-700">Cancel</button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-stone-400"><div className="text-5xl mb-4">🌟</div><p>Nothing on the list yet!</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl p-4 border shadow-sm transition-all ${highlighted === item.id ? 'border-amber-400 shadow-amber-200 shadow-lg scale-[1.01]' : 'border-amber-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-stone-800">{item.name}</h3>
                    {highlighted === item.id && <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">✨ Tonight's pick!</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                    {item.address && <span className="flex items-center gap-0.5"><MapPin size={10} />{item.address.split(',').slice(0,2).join(',')}</span>}
                    <span>{item.cuisine}</span>
                    {item.price_range && <PriceTag level={item.price_range} />}
                    <span className={item.added_by === 'sam' ? 'text-blue-400' : 'text-pink-400'}>
                      {item.added_by === 'sam' ? '👨🏻‍🍳 Sam' : '👩🏾‍🍳 Olivia'}
                    </span>
                  </div>
                  {item.notes && <p className="text-stone-500 text-sm mt-1 italic">"{item.notes}"</p>}
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-stone-300 hover:text-red-400 transition-colors shrink-0"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
