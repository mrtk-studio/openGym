// Read-only views of an active workout for the Cards presentation (components/workout/). They
// restate what the workout already knows — the next open row (workout-keys nextOpenSet) and the
// ordered navigation units (history supersetUnits) — and hold no position of their own: the one
// pointer is S.active.cur, and nothing here writes it.
import { nextOpenSet } from './workout-keys.js'
import { supersetUnits, modeOf } from './history.js'
import { isWarmupRow, setNumberAt } from './workout-model.js'

const clampCur = (entries, cur) => (Number.isInteger(cur) ? Math.min(Math.max(cur, 0), entries.length - 1) : 0)

/**
 * What to say about the set that is actionable now.
 *   null                       a session with no exercises yet
 *   { kind: 'done' }           every row of every exercise is ticked
 *   { kind: 'here', idx, i, label, side }
 *                              the open row belongs to the marked exercise (or, in a superset, to
 *                              a member of the marked unit; `idx` says which)
 *   { kind: 'elsewhere', idx, i, label, side }
 *                              the marked exercise is finished and the next open row is in another:
 *                              the screen must not imply it is the one on show
 * `label` is { warmup } | { cardio } | { no, of } — work sets numbered out of the work sets, a
 * timed L/R pair or a per-side row counted as one (setNumberAt, the number the rows wear). `side`
 * is 'L' or 'R' when the open row is one side of a set.
 */
export function currentSetView(entries, cur) {
  if (!Array.isArray(entries) || !entries.length) return null
  const open = nextOpenSet(entries, clampCur(entries, cur))
  if (!open) return { kind: 'done' }
  const entry = entries[open.idx]
  const sets = entry.sets || []
  const row = sets[open.i]
  let label
  if (modeOf({ ...(entry.target || {}), id: entry.id }) === 'cardio') label = { cardio: true }
  else if (isWarmupRow(row)) label = { warmup: true }
  else {
    let last = sets.length - 1
    while (last > open.i && isWarmupRow(sets[last])) last--
    label = { no: setNumberAt(sets, open.i), of: setNumberAt(sets, last) }
  }
  const side = open.side || (row?.side === 'L' || row?.side === 'R' ? row.side : null)
  return { kind: open.current ? 'here' : 'elsewhere', idx: open.idx, i: open.i, label, side }
}

/**
 * The unit after the marked one, in the session's own order — the same one Next goes to
 * (Workout navigateUnit). `idxs` are its entries; more than one is a superset. null on the final
 * unit and for an empty session.
 */
export function nextUnitView(entries, cur) {
  if (!Array.isArray(entries) || !entries.length) return null
  const units = supersetUnits(entries)
  const at = clampCur(entries, cur)
  const ui = units.findIndex(u => u.includes(at))
  const next = ui < 0 ? null : units[ui + 1]
  return next ? { idxs: next, superset: next.length > 1 } : null
}
