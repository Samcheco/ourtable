import { useState, useEffect, useRef } from 'react'

const CORRECT = '2810' // change this to whatever PIN you want
const STORAGE_KEY = 'ot_auth'
const SESSION_HOURS = 72 // stay logged in for 72 hours

function isUnlocked(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    if (!val) return false
    const { until } = JSON.parse(val)
    return Date.now() < until
  } catch {
    return false
  }
}

function unlock() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    until: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  }))
}

interface Props { children: React.ReactNode }

export default function Passcode({ children }: Props) {
  const [authed, setAuthed] = useState(isUnlocked)
  const [digits, setDigits] = useState<string[]>([])
  const [shake, setShake] = useState(false)
  const [dots, setDots] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authed) setTimeout(() => inputRef.current?.focus(), 100)
  }, [authed])

  useEffect(() => {
    if (digits.length === 4) {
      if (digits.join('') === CORRECT) {
        setDots(true)
        setTimeout(() => {
          unlock()
          setAuthed(true)
        }, 300)
      } else {
        setShake(true)
        setTimeout(() => { setShake(false); setDigits([]) }, 600)
      }
    }
  }, [digits])

  if (authed) return <>{children}</>

  const pad = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-[#fdf8f3] flex flex-col items-center justify-center px-6">
      <div className="text-5xl mb-4">🍽️</div>
      <h1 className="font-['Playfair_Display'] text-2xl font-bold text-amber-900 mb-1">OurTable</h1>
      <p className="text-stone-400 text-sm mb-10">Sam & Olivia's food diary</p>

      {/* Hidden input to capture keyboard on mobile */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        className="absolute opacity-0 w-0 h-0"
        onKeyDown={e => {
          if (e.key >= '0' && e.key <= '9' && digits.length < 4) setDigits(d => [...d, e.key])
          if (e.key === 'Backspace') setDigits(d => d.slice(0, -1))
        }}
      />

      {/* Dots */}
      <div className={`flex gap-4 mb-10 transition-transform ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
            digits.length > i
              ? dots ? 'bg-green-400 border-green-400' : 'bg-amber-600 border-amber-600'
              : 'border-stone-300'
          }`} />
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {pad.map((key, i) => {
          if (key === '') return <div key={i} />
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (key === '⌫') setDigits(d => d.slice(0, -1))
                else if (digits.length < 4) setDigits(d => [...d, key])
                inputRef.current?.focus()
              }}
              className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                key === '⌫'
                  ? 'text-stone-400 bg-transparent text-2xl'
                  : 'bg-white text-stone-700 shadow-sm border border-amber-50 hover:bg-amber-50 active:bg-amber-100'
              }`}
            >
              {key}
            </button>
          )
        })}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
