// What Today says about a live workout, read off S.active and nothing else.
//
// The marker `cur` is where you were last (Workout moves it, nothing else does), the exercises are
// whatever S.active.entries holds right now — reordered, swapped, added or removed since the start —
// so progress is counted from what each entry has logged, never from an index. There is no
// "skipped" state in the model: an exercise left with sets open is simply not done, and the
// session's flow wraps round to it (supersetFlow nextUnfinishedUnit). That is what is shown.
import { doneUnits, setUnits } from './history.js'
import { isCardio } from './exercises.js'
import { isWarmupRow, setNumberAt } from './workout-model.js'

const unitsOf = entry => {
  const sets = Array.isArray(entry?.sets) ? entry.sets : []
  return { done: sets.reduce((n, s) => n + doneUnits(s), 0), total: sets.reduce((n, s) => n + setUnits(s), 0) }
}

// An exercise is done when every row it holds is ticked (both sides of a per-side row).
const entryDone = entry => { const u = unitsOf(entry); return u.total > 0 && u.done === u.total }

/**
 * Exercises finished out of exercises in the session, and per exercise how far along it is, in the
 * session's own order (0..1), for a segmented bar that stays right through a reorder or a swap.
 * A swap after logging keeps the logged exercise and adds the replacement beside it, so the total
 * grows by one — it counts what will be saved.
 */
export function activeProgress(active) {
  const entries = Array.isArray(active?.entries) ? active.entries : []
  const parts = entries.map(unitsOf)
  return {
    done: entries.filter(entryDone).length,
    total: entries.length,
    fractions: parts.map(u => (u.total ? u.done / u.total : 0)),
    sets: { done: parts.reduce((n, u) => n + u.done, 0), total: parts.reduce((n, u) => n + u.total, 0) },
  }
}

/**
 * The exercise the marker is on, and its next open set. The marker is clamped the way Workout
 * clamps it. `set` is null when the position can't be named reliably:
 *   - every row of the exercise is ticked (`allDone`)
 *   - a cardio block, which is not counted in sets
 * A warm-up row reads as a warm-up (numbered apart from the work sets); a work row as its number
 * out of the work sets, per-side pairs counted as one — both through setNumberAt, as the workout does.
 * Returns null for a session with no exercises yet.
 */
export function currentPosition(active) {
  const entries = Array.isArray(active?.entries) ? active.entries : []
  if (!entries.length) return null
  const index = Number.isInteger(active.cur) ? Math.min(Math.max(active.cur, 0), entries.length - 1) : 0
  const entry = entries[index]
  const sets = Array.isArray(entry?.sets) ? entry.sets : []
  const at = sets.findIndex(s => doneUnits(s) < setUnits(s))
  const base = { index, entry, allDone: sets.length > 0 && at < 0, set: null }
  if (at < 0 || isCardio(entry.id)) return base
  if (isWarmupRow(sets[at])) return { ...base, set: { warmup: true } }
  let last = sets.length - 1
  while (last > at && isWarmupRow(sets[last])) last--
  return { ...base, set: { warmup: false, no: setNumberAt(sets, at), of: setNumberAt(sets, last) } }
}
