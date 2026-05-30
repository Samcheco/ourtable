import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, UtensilsCrossed, Map, Heart, Sparkles, Plus } from 'lucide-react'

const tabs = [
  { to: '/',            label: 'Home',       icon: LayoutGrid },
  { to: '/restaurants', label: 'Eats',       icon: UtensilsCrossed },
  { to: '/map',         label: 'Map',        icon: Map },
  { to: '/wishlist',    label: 'Wish List',  icon: Heart },
  { to: '/wrapped',     label: 'Wrapped',    icon: Sparkles },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <>
      {/* ── Desktop top bar ─────────────────────────────── */}
      <nav className="hidden sm:flex bg-white border-b border-amber-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16 w-full">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <span className="font-['Playfair_Display'] font-bold text-xl text-amber-900">OurTable</span>
          </Link>
          <div className="flex items-center gap-1">
            {tabs.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to ? 'bg-amber-100 text-amber-800' : 'text-stone-600 hover:bg-amber-50 hover:text-amber-800'
                }`}>
                <Icon size={15} />{label}
              </Link>
            ))}
            <Link to="/add" className="ml-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + Add Visit
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Mobile top header ───────────────────────────── */}
      <header className="sm:hidden bg-white border-b border-amber-100 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <span className="font-['Playfair_Display'] font-bold text-lg text-amber-900">OurTable</span>
          </Link>
          {/* Floating add button — top right on mobile */}
          <button
            onClick={() => navigate('/add')}
            className="bg-amber-600 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ───────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-amber-100 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch h-16 safe-bottom">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 transition-colors ${
                  active ? 'text-amber-700' : 'text-stone-400 active:text-amber-600'
                }`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className={`text-[10px] font-medium ${active ? 'text-amber-700' : 'text-stone-400'}`}>{label}</span>
                {active && <div className="absolute top-0 w-6 h-0.5 bg-amber-500 rounded-full" />}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Mobile bottom padding so content isn't behind tab bar ── */}
      <div className="sm:hidden h-16" aria-hidden="true" />
    </>
  )
}
