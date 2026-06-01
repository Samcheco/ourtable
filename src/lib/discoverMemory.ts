/**
 * Discovery memory — tracks what's been seen, liked, or skipped.
 *
 * Currently backed by localStorage. The interface is designed so the
 * implementation can be swapped to Supabase per-user later without
 * changing any call sites.
 *
 * DB-equivalent schema (for future migration):
 *   create table discover_history (
 *     id uuid primary key default gen_random_uuid(),
 *     place_id text not null,
 *     place_name text,
 *     place_snapshot jsonb,   -- enough data to re-show the card
 *     action text check (action in ('liked', 'skipped')),
 *     seen_at timestamptz default now(),
 *     city text
 *   );
 */

import type { NearbyPlace } from './googlePlaces'

export interface DiscoverEntry {
  placeId: string
  placeName: string
  placeSnapshot?: Partial<NearbyPlace>
  action: 'liked' | 'skipped'
  seenAt: number  // unix ms — maps to seen_at timestamptz
  city?: string
}

const STORAGE_KEY = 'ourtable_discover_v1'

// How long before a skipped place can resurface (ms)
export const SKIP_RESURFACE_MS = 45 * 24 * 60 * 60 * 1000  // 45 days

// ── Interface (swap implementation here to move to DB) ─────────────────────

function readAll(): DiscoverEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeAll(entries: DiscoverEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // storage full — prune oldest 20%
    const trimmed = entries.slice(Math.floor(entries.length * 0.2))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  }
}

export const DiscoverMemory = {
  getAll(): DiscoverEntry[] {
    return readAll()
  },

  record(place: NearbyPlace, action: 'liked' | 'skipped', city?: string) {
    const entries = readAll().filter(e => e.placeId !== place.placeId)
    entries.push({
      placeId: place.placeId,
      placeName: place.name,
      placeSnapshot: {
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        userRatingsTotal: place.userRatingsTotal,
        priceLevel: place.priceLevel,
        photoUrl: place.photoUrl,
        photoUrls: place.photoUrls,
        types: place.types,
        neighborhood: place.neighborhood,
        vibe: place.vibe,
        whyGo: place.whyGo,
        knownFor: place.knownFor,
        goodFor: place.goodFor,
        signals: place.signals,
        confidence: place.confidence,
        editorialScore: place.editorialScore,
        isCurated: place.isCurated,
      },
      action,
      seenAt: Date.now(),
      city,
    })
    writeAll(entries)
  },

  // IDs that should be hidden from the deck
  getHiddenIds(wishlistedNames: Set<string>): Set<string> {
    const now = Date.now()
    const hidden = new Set<string>()
    for (const e of readAll()) {
      if (e.action === 'liked') {
        // Liked places stay hidden only if still on the wishlist
        if (wishlistedNames.has(e.placeName.toLowerCase())) {
          hidden.add(e.placeId)
        }
        // If removed from wishlist, let it re-appear naturally
      } else if (e.action === 'skipped') {
        // Skipped places hidden until resurface window passes
        if (now - e.seenAt < SKIP_RESURFACE_MS) {
          hidden.add(e.placeId)
        }
      }
    }
    return hidden
  },

  // Places skipped long enough ago to be resurfaced
  getResurfaceable(wishlistedNames: Set<string>): NearbyPlace[] {
    const now = Date.now()
    return readAll()
      .filter(e =>
        e.action === 'skipped' &&
        now - e.seenAt >= SKIP_RESURFACE_MS &&
        !wishlistedNames.has(e.placeName.toLowerCase()) &&
        e.placeSnapshot
      )
      .sort((a, b) => a.seenAt - b.seenAt) // oldest skips first
      .map(e => e.placeSnapshot as NearbyPlace)
  },

  // Force-resurface all skips regardless of window (manual action)
  forceResurfaceAll(wishlistedNames: Set<string>): NearbyPlace[] {
    return readAll()
      .filter(e =>
        e.action === 'skipped' &&
        !wishlistedNames.has(e.placeName.toLowerCase()) &&
        e.placeSnapshot
      )
      .map(e => e.placeSnapshot as NearbyPlace)
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY)
  },
}
