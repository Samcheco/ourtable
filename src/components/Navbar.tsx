import { Link, useLocation } from 'react-router-dom'
import { UtensilsCrossed, Map, Heart, Sparkles, LayoutGrid } from 'lucide-react'

const links = [
  { to: '/', label: 'Home', icon: LayoutGrid },
  { to: '/restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/wishlist', label: 'Wish List', icon: Heart },
  { to: '/wrapped', label: 'Wrapped', icon: Sparkles },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-white border-b border-amber-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <span className="font-['Playfair_Display'] font-bold text-xl text-amber-900">OurTable</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === to
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-stone-600 hover:bg-amber-50 hover:text-amber-800'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <Link
            to="/add"
            className="ml-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Add Visit
          </Link>
        </div>
      </div>
    </nav>
  )
}
