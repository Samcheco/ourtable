import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutGrid, UtensilsCrossed, Map, Heart, Sparkles, Plus, Wand2, RefreshCw } from 'lucide-react'

const tabs = [
  { to: '/',            label: 'Home',      icon: LayoutGrid },
  { to: '/restaurants', label: 'Eats',      icon: UtensilsCrossed },
  { to: '/foryou',      label: 'For You',   icon: Wand2 },
  { to: '/wishlist',    label: 'Wishlist',  icon: Heart },
  { to: '/map',         label: 'Map',       icon: Map },
]

const desktopTabs = [...tabs, { to: '/wrapped', label: 'Wrapped', icon: Sparkles }]

interface NavbarProps {
  onRefresh?: () => Promise<void>
}

export default function Navbar({ onRefresh }: NavbarProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <>
      {/* ── Desktop top bar ── */}
      <nav className="hidden sm:flex bg-white border-b border-amber-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16 w-full">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <span className="font-['Playfair_Display'] font-bold text-xl text-amber-900">OurTable</span>
          </Link>
          <div className="flex items-center gap-1">
            {desktopTabs.map(({ to, label, icon: Icon }) => (
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

      {/* ── Mobile top header ── */}
      <header className="sm:hidden bg-white border-b border-amber-100 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🍽️</span>
            <span className="font-['Playfair_Display'] font-bold text-lg text-amber-900">OurTable</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="text-stone-400 active:text-amber-600 transition-colors p-1"
              aria-label="Refresh"
            >
              <RefreshCw
                size={18}
                style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
              />
            </button>
            <button
              onClick={() => navigate('/add')}
              className="bg-amber-600 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
              style={{ width: 40, height: 40 }}
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-100"
        style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex" style={{ height: 64 }}>
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 8, paddingBottom: 4 }}
              >
                <Icon
                  size={26}
                  strokeWidth={active ? 2.5 : 1.8}
                  color={active ? '#b45309' : '#a8a29e'}
                />
                <span style={{
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#b45309' : '#a8a29e',
                  lineHeight: 1,
                }}>
                  {label}
                </span>
                {active && (
                  <span style={{
                    position: 'absolute',
                    top: 0,
                    width: 24,
                    height: 3,
                    background: '#d97706',
                    borderRadius: 2,
                  }} />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind tab bar */}
      <div className="sm:hidden" style={{ height: 64 }} aria-hidden="true" />
    </>
  )
}
