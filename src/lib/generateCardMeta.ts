/**
 * Generates card metadata for non-curated places.
 * Makes every card feel complete — vibe, why go, known for, good for,
 * drawbacks, signals, confidence — using available Google Places data.
 *
 * The goal: feel like a smart friend who checked a place out, not like
 * a Yelp listing. Be specific where we can, honest where we can't.
 */

import { inferCuisine } from './googlePlaces'

export interface GeneratedMeta {
  vibe: string[]
  whyGo: string
  knownFor: string
  goodFor: string[]
  drawbacks: string[]
  signals: string[]
  confidence: 'high' | 'medium' | 'low'
}

// Cuisine → what the place is typically known for
const CUISINE_KNOWN_FOR: Record<string, string> = {
  Japanese: 'Omakase, sushi, or ramen — check which one they specialize in',
  Sushi: 'Omakase counter or à la carte sushi',
  Ramen: 'Broth-forward ramen bowls, often with house noodles',
  Korean: 'KBBQ or traditional home-style cooking',
  'Korean BBQ': 'Tableside grilling, banchan spread',
  Italian: 'House-made pasta, wood-fired dishes',
  Pizza: 'Specialty pies — check if Neapolitan, NY-style, or Detroit',
  Mexican: 'Regional Mexican cooking — look past the usual suspects',
  Chinese: 'Regional Chinese — worth checking which province',
  Sichuan: 'Mala spice, bold flavors, chili oil everything',
  'Dim Sum': 'Weekend dim sum service, cart or order-off-menu',
  Thai: 'Expect heat — order off the Thai-language section if there is one',
  Vietnamese: 'Pho, bánh mì, or regional specialties',
  French: 'Classic technique, charcuterie, wine list',
  Mediterranean: 'Mezze, wood-fired proteins, dips',
  'Middle Eastern': 'Mezze, flatbreads, braised meats',
  Indian: 'Regional curries and breads — check north vs. south',
  Seafood: 'Fresh catch, raw bar, or whole fish',
  Steakhouse: 'Dry-aged beef, classic sides',
  American: 'Market-driven cooking or a strong burger program',
  Californian: 'Seasonal, produce-forward, usually a good natural wine list',
  Café: 'Coffee, pastries, light bites',
  Bakery: 'Fresh-baked bread, pastries, morning staples',
  Bar: 'Cocktail program with a serious food menu',
  Peruvian: 'Ceviche, leche de tigre, causa — and pisco',
  'Southeast Asian': 'Complex spice blends, rice dishes, noodle soups',
  'Latin American': 'Bold flavors, grilled meats, fresh salsas',
  Taiwanese: 'Beef noodle soup, scallion pancakes, bubble tea',
  Filipino: 'Lechon, kare-kare, sinigang — rich braised dishes',
  Spanish: 'Tapas, jamón, serious sherry and wine list',
  Brazilian: 'Churrasco, rice and beans, tropical flavors',
  Ethiopian: 'Injera-based sharing platters, spiced stews',
  Georgian: 'Khinkali dumplings, khachapuri cheese bread',
  'Soul Food': 'Fried chicken, collard greens, mac and cheese',
  BBQ: 'Smoked meats — brisket, ribs, pulled pork',
}

// Types → vibe inferences
function inferVibe(types: string[], priceLevel: number, rating: number, reviewCount: number): string[] {
  const vibes: string[] = []
  const t = new Set(types)

  if (priceLevel >= 4) vibes.push('Special occasion')
  else if (priceLevel === 3) vibes.push('Date night worthy')
  else if (priceLevel <= 2 && rating >= 4.3) vibes.push('Neighborhood gem')

  if (t.has('bar') || t.has('night_club')) vibes.push('Cocktail bar')
  if (t.has('cafe') || t.has('coffee_shop')) vibes.push('Daytime café')
  if (t.has('bakery')) vibes.push('Bakery & pastries')

  if (reviewCount >= 1000 && reviewCount <= 3000 && rating >= 4.3) vibes.push('Local favorite')
  if (reviewCount < 500 && rating >= 4.4) vibes.push('Hidden gem')
  if (priceLevel <= 2 && rating >= 4.5) vibes.push('Punches above its price')

  // Fallback
  if (vibes.length === 0) {
    if (priceLevel <= 2) vibes.push('Casual')
    else vibes.push('Sit-down dining')
  }

  return vibes.slice(0, 3)
}

// Construct a "why go" blurb that doesn't sound like Yelp
function buildWhyGo(
  _name: string,
  cuisine: string,
  rating: number,
  reviewCount: number,
  priceLevel: number,
  editorialSummary?: string,
): string {
  if (editorialSummary && editorialSummary.length > 30 && !editorialSummary.toLowerCase().includes('chain')) {
    return editorialSummary
  }

  // Build a specific, human-sounding blurb from signals
  const ratingStr = rating >= 4.7 ? 'exceptional' : rating >= 4.5 ? 'very strong' : rating >= 4.3 ? 'solid' : 'good'
  const reviewStr = reviewCount >= 2000 ? 'well-established' : reviewCount >= 500 ? 'well-reviewed' : 'locally known'
  const priceStr = priceLevel <= 1 ? 'wallet-friendly' : priceLevel === 2 ? 'reasonably priced' : priceLevel === 3 ? 'mid-range' : 'upscale'

  const openers = [
    `A ${reviewStr} ${cuisine.toLowerCase()} spot with ${ratingStr} Google scores and a ${priceStr} price point.`,
    `${ratingStr.charAt(0).toUpperCase() + ratingStr.slice(1)} ratings, ${reviewStr} reputation, and ${priceStr} for ${cuisine.toLowerCase()}.`,
    `One of the more ${reviewStr} ${cuisine.toLowerCase()} options nearby — ${ratingStr} scores and ${priceStr}.`,
  ]

  const qualifier = priceLevel >= 3
    ? " Worth checking reservations before you go."
    : reviewCount >= 1500
    ? " Popular enough that timing matters on weekends."
    : " Good for a low-key night out."

  return openers[reviewCount % openers.length] + qualifier
}

// What is this place good for?
function buildGoodFor(types: string[], priceLevel: number, rating: number): string[] {
  const goodFor: string[] = []
  const t = new Set(types)

  if (priceLevel >= 3 && rating >= 4.2) goodFor.push('Date night')
  if (priceLevel <= 2) goodFor.push('Casual dinner')
  if (t.has('cafe') || t.has('bakery')) goodFor.push('Weekend brunch')
  if (priceLevel >= 4) goodFor.push('Special occasion')
  if (priceLevel <= 2 && rating >= 4.3) goodFor.push('Regular spot')
  if (t.has('bar')) goodFor.push('Drinks and bites')

  if (goodFor.length === 0) goodFor.push('Casual dining')
  return goodFor.slice(0, 3)
}

// Honest drawbacks — the stuff that helps you decide
function buildDrawbacks(
  rating: number,
  reviewCount: number,
  priceLevel: number,
  types: string[],
): string[] {
  const drawbacks: string[] = []

  if (reviewCount > 3000) drawbacks.push('Very popular — expect waits or crowds')
  if (priceLevel >= 4) drawbacks.push('Pricey — budget for a full night out')
  if (reviewCount < 200) drawbacks.push('Not yet widely reviewed — quality less certain')
  if (rating < 4.2 && reviewCount > 500) drawbacks.push('Mixed reviews at scale')
  if (types.includes('meal_takeaway') && !types.includes('restaurant')) drawbacks.push('More takeout-focused than sit-down')

  return drawbacks.slice(0, 2)
}

// Signals based on Google data quality
function buildSignals(rating: number, reviewCount: number, priceLevel: number): string[] {
  const signals: string[] = []

  if (rating >= 4.6 && reviewCount >= 300) signals.push('Highly rated')
  if (reviewCount >= 1000 && rating >= 4.3) signals.push('Community favorite')
  if (reviewCount < 400 && rating >= 4.4) signals.push('Quietly excellent')
  if (priceLevel >= 3 && rating >= 4.4) signals.push('Worth the splurge')
  if (priceLevel <= 2 && rating >= 4.5) signals.push('Great value')

  return signals
}

export function generateCardMeta(place: {
  rating: number
  userRatingsTotal: number
  priceLevel: number
  types: string[]
  editorialSummary?: string
}): GeneratedMeta {
  const cuisine = inferCuisine(place.types)
  const vibe = inferVibe(place.types, place.priceLevel, place.rating, place.userRatingsTotal)
  const whyGo = buildWhyGo('', cuisine, place.rating, place.userRatingsTotal, place.priceLevel, place.editorialSummary)
  const knownFor = CUISINE_KNOWN_FOR[cuisine] || `${cuisine} cooking — check recent reviews for what to order`
  const goodFor = buildGoodFor(place.types, place.priceLevel, place.rating)
  const drawbacks = buildDrawbacks(place.rating, place.userRatingsTotal, place.priceLevel, place.types)
  const signals = buildSignals(place.rating, place.userRatingsTotal, place.priceLevel)

  const confidence: 'high' | 'medium' | 'low' =
    place.rating >= 4.5 && place.userRatingsTotal >= 400 ? 'medium' :
    place.rating >= 4.3 && place.userRatingsTotal >= 200 ? 'medium' : 'low'

  return { vibe, whyGo, knownFor, goodFor, drawbacks, signals, confidence }
}
