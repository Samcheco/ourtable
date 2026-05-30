import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DataProvider } from './lib/DataContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Restaurants from './pages/Restaurants'
import RestaurantDetail from './pages/RestaurantDetail'
import AddVisit from './pages/AddVisit'
import MapView from './pages/MapView'
import Wishlist from './pages/Wishlist'
import Wrapped from './pages/Wrapped'
import ForYou from './pages/ForYou'

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
      <div className="min-h-screen bg-[#fdf8f3]">
        <Navbar />
        {/* pb-24 on mobile = 96px clears the 64px tab bar + breathing room */}
        <main className="pb-6 sm:pb-6" style={{ paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom) + 80px))' }}>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/restaurants" element={<Restaurants />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            <Route path="/add" element={<AddVisit />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/wrapped" element={<Wrapped />} />
            <Route path="/foryou" element={<ForYou />} />
          </Routes>
        </main>
      </div>
      </DataProvider>
    </BrowserRouter>
  )
}
