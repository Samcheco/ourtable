import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const THRESHOLD = 70

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to very top
      if (window.scrollY === 0) startY.current = e.touches[0].clientY
      else startY.current = 0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!startY.current) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0 && window.scrollY === 0) {
        setPullY(Math.min(delta * 0.5, THRESHOLD + 20))
      }
    }

    const onTouchEnd = async () => {
      if (pullY >= THRESHOLD && !refreshing) {
        setRefreshing(true)
        setPullY(0)
        await onRefresh()
        setRefreshing(false)
      } else {
        setPullY(0)
      }
      startY.current = 0
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullY, refreshing, onRefresh])

  const progress = Math.min(pullY / THRESHOLD, 1)

  return (
    <div style={{ position: 'relative' }}>
      {/* Pull indicator */}
      <div style={{
        position: 'fixed', top: 56, left: 0, right: 0, zIndex: 40,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: refreshing ? 40 : pullY > 0 ? pullY : 0,
        overflow: 'hidden', transition: pullY > 0 ? 'none' : 'height 0.25s ease',
        background: 'transparent',
        pointerEvents: 'none',
      }}>
        {(pullY > 10 || refreshing) && (
          <div style={{
            background: 'white', borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>
            <RefreshCw
              size={16}
              color="#d97706"
              style={{
                transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              }}
            />
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {children}
    </div>
  )
}
