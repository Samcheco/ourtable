import { useState } from 'react'
import { X } from 'lucide-react'
import type { Reviewer, Review } from '../types'
import { saveReview } from '../lib/db'
import StarRating from './StarRating'

interface Props {
  visitId: string
  reviewer: Reviewer
  existing?: Review
  onClose: () => void
  onSaved: () => void | Promise<void>
}

const SENTIMENTS = [
  { v: 'loved',       label: '😍 Loved',        active: 'bg-green-500 text-white' },
  { v: 'liked',       label: '😊 Liked',         active: 'bg-green-400 text-white' },
  { v: 'indifferent', label: '😐 Indifferent',   active: 'bg-amber-400 text-white' },
  { v: 'didnt_like',  label: "😕 Didn't Like",   active: 'bg-orange-400 text-white' },
  { v: 'hated',       label: '😤 Hated',         active: 'bg-red-500 text-white' },
] as const

export default function AddReviewModal({ visitId, reviewer, existing, onClose, onSaved }: Props) {
  const [overall, setOverall] = useState(existing?.overall_rating ?? 0)
  const [food, setFood] = useState(existing?.food_rating ?? 0)
  const [service, setService] = useState(existing?.service_rating ?? 0)
  const [ambiance, setAmbiance] = useState(existing?.ambiance_rating ?? 0)
  const [value, setValue] = useState(existing?.value_rating ?? 0)
  const [text, setText] = useState(existing?.review_text ?? '')
  const [sentiment, setSentiment] = useState<typeof SENTIMENTS[number]['v']>(existing?.would_return ?? 'liked')
  const [isPick, setIsPick] = useState(existing?.is_pick ?? false)

  async function handleSave() {
    if (overall === 0) { alert('Please add an overall star rating.'); return }
    await saveReview({
      visit_id: visitId,
      reviewer,
      overall_rating: overall,
      food_rating: food,
      service_rating: service,
      ambiance_rating: ambiance,
      value_rating: value,
      review_text: text,
      would_return: sentiment,
      is_pick: isPick,
    })
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-amber-50">
          <h2 className="font-['Playfair_Display'] text-xl font-semibold text-stone-800">
            {existing ? 'Edit' : 'Add'} {reviewer === 'sam' ? "👨🏻‍🍳 Sam's" : "👩🏾‍🍳 Olivia's"} Review
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Overall */}
          <div className="text-center">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Overall</p>
            <StarRating value={overall} onChange={setOverall} size={36} />
          </div>

          {/* Sub-ratings */}
          <div className="grid grid-cols-2 gap-4">
            {([
              ['Food', food, setFood],
              ['Service', service, setService],
              ['Ambiance', ambiance, setAmbiance],
              ['Value', value, setValue],
            ] as const).map(([label, val, setter]) => (
              <div key={label}>
                <p className="text-xs text-stone-400 mb-1">{label}</p>
                <StarRating value={val} onChange={setter} size={18} />
              </div>
            ))}
          </div>

          {/* Text */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder={`${reviewer === 'sam' ? "Sam's" : "Olivia's"} thoughts…`}
            className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />

          {/* Sentiment */}
          <div>
            <p className="text-xs text-stone-400 mb-2">Overall vibe</p>
            <div className="flex gap-1.5 flex-wrap">
              {SENTIMENTS.map(({ v, label, active }) => (
                <button key={v} type="button" onClick={() => setSentiment(v)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${sentiment === v ? active : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Pick */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isPick} onChange={e => setIsPick(e.target.checked)} className="w-4 h-4 accent-amber-600" />
            <span className="text-sm text-stone-600">Mark as my pick ⭐</span>
          </label>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors">
            Save Review
          </button>
        </div>
      </div>
    </div>
  )
}
