// What the planned Today command center says about the session and about recovery — both read
// off data the app already has, never off a score or a sensor.
//
// Nothing here decides what is scheduled: the caller passes the effective routines for today
// (lib/history.js effectiveRoutines), so a combined day, a rotation, a queue and an override
// have already been resolved.
import { loadOfRoutine, loadOfWorkouts, rankOf } from './muscles.js'
import { workoutAt } from './history.js'

// How many muscles the hero names as the session's focus.
export const FOCUS_MAX = 2

// A muscle counts as trained by a workout from this many effective sets (primary = 1 per set,
// supporting muscles a fraction of one, lib/muscles.js) — a single warm-up-free working set on a
// supporting muscle is not "trained".
export const TRAINED_MIN_SETS = 1

/**
 * The size and focus of today's session.
 *   count  exercises across every routine on the day
 *   focus  up to FOCUS_MAX muscle slugs, the most programmed first (effective planned sets via
 *          the same load model the muscle map uses); [] when no exercise carries muscle data
 */
export function sessionSummary(routines, customEx = []) {
  const exercises = Object.fromEntries((customEx || []).map(e => [e.id, e]))
  const load = {}
  let count = 0
  for (const r of routines || []) {
    count += (r.ex || []).length
    for (const [slug, sets] of Object.entries(loadOfRoutine(r, exercises))) load[slug] = (load[slug] || 0) + sets
  }
  return { count, focus: rankOf(load).worked.slice(0, FOCUS_MAX) }
}

/**
 * Hours since one of today's focus muscles was last trained, from logged workouts alone.
 * Returns { muscle, hours } for the first focus muscle (in focus order) that has history, or
 * null when none does — a new user, or a muscle never logged — so the caller shows an honest
 * empty state instead of a number. `hours` counts from the end of that workout (its start when
 * no end was saved) and is never negative.
 *
 * This is elapsed time, not a readiness score and not the fatigue model (lib/recovery.js), whose
 * decayed values are not hours of anything.
 */
export function recoveryContext(workouts, focus, now = Date.now()) {
  if (!focus?.length) return null
  const done = (workouts || [])
    .map(w => ({ w, at: Number.isFinite(w?.end) ? w.end : workoutAt(w) }))
    .filter(x => Number.isFinite(x.at))
    .sort((a, b) => b.at - a.at)
  for (const muscle of focus) {
    const hit = done.find(({ w }) => (loadOfWorkouts([w])[muscle] || 0) >= TRAINED_MIN_SETS)
    if (hit) return { muscle, hours: Math.max(0, Math.floor((now - hit.at) / 3600000)) }
  }
  return null
}

/**
 * How to name the day of the next session on a rest day, from the two dates alone. `named` is
 * false for a rotation-managed pass, which has no weekday of its own (lib/rotation.js): that one
 * is only ever "tomorrow" or a date, never "Wednesday".
 *   { key: 'tomorrow' } | { key: 'weekday', weekday } | { key: 'date', iso }
 */
export function nextWhen(todayIso, nextIso, { named = true } = {}) {
  const days = Math.round((new Date(nextIso + 'T12:00:00') - new Date(todayIso + 'T12:00:00')) / 86400000)
  if (days === 1) return { key: 'tomorrow' }
  return named ? { key: 'weekday', weekday: new Date(nextIso + 'T12:00:00').getDay() } : { key: 'date', iso: nextIso }
}
