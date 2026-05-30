import type { Review } from '../types'

const SEAL_MS = 20 * 60 * 1000 // 20 minutes

/**
 * A review is sealed if:
 *  - it was submitted less than 20 minutes ago, AND
 *  - the other reviewer hasn't submitted their review for the same visit yet
 */
export function isReviewSealed(review: Review, allVisitReviews: Review[]): boolean {
  const age = Date.now() - new Date(review.created_at).getTime()
  if (age >= SEAL_MS) return false
  const otherReviewer = review.reviewer === 'sam' ? 'olivia' : 'sam'
  const otherHasReviewed = allVisitReviews.some(r => r.reviewer === otherReviewer)
  return !otherHasReviewed
}

export function sealedMinsLeft(review: Review): number {
  const age = Date.now() - new Date(review.created_at).getTime()
  return Math.max(0, Math.ceil((SEAL_MS - age) / 60_000))
}

/** Filter a list of reviews to only those that are visible (not sealed) */
export function visibleReviews(reviews: Review[]): Review[] {
  return reviews.filter(r => !isReviewSealed(r, reviews))
}
