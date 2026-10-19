// Characterization of the seams the M1 workout presentation (Cards and Focus) will read.
// Nothing here is new behaviour: each block pins what the app does today, so a redesign that
// consumes these helpers cannot quietly reinterpret them.
//
//   1. the current set  — nextOpenSet (lib/workout-keys.js) vs currentPosition (lib/today-active.js)
//   2. previous performance — what lastEntryFor / bestSetFor / setLabel make of each exercise kind
//   3. the next exercise — there is no helper; it is the next navigation unit (what Next does),
//      and the next *unfinished* unit (what finishing a unit does). Pinned from their parts.
import { describe, expect, it } from 'vitest'
import { nextOpenSet } from './workout-keys.js'
import { currentPosition } from './today-active.js'
import { setLabel, lastEntryFor, supersetUnits, unitOf } from './history.js'
import { bestSetFor } from './exercise-history.js'
import { nextUnfinishedUnit } from './supersetFlow.js'
import { moveActiveWorkoutUnit } from './active-workout-order.js'
import { swapActiveExercise } from './active-exercise-swap.js'

const BENCH = '1029', SQUAT = '1001', ROW = '1013', BW = '1000', ASSISTED = '1027', CARDIO = '1160'
const row = (done = false, extra = {}) => ({ w: 60, r: 8, done, ...extra })
const entry = (id, sets, extra = {}) => ({ id, sets, ...extra })
const side = (l, r) => ({ w: 0, r: 0, done: l && r, sides: { L: { w: 15, r: 8, done: l }, R: { w: 15, r: 8, done: r } } })

describe('the current set — nextOpenSet is the presentation source', () => {
  it('is the first open row of the marked exercise', () => {
    const e = [entry(BENCH, [row(true), row(true), row(false), row(false)])]
    expect(nextOpenSet(e, 0)).toEqual({ idx: 0, i: 2, current: true })
  })

  it('is not fooled by completed rows before an open one, or by an open row left behind a later tick', () => {
    // set 2 ticked, set 1 left open: the open one is still the set to do
    expect(nextOpenSet([entry(BENCH, [row(false), row(true), row(false)])], 0)).toEqual({ idx: 0, i: 0, current: true })
  })

  it('treats a warm-up row as a row to do, ahead of the work sets', () => {
    const e = [entry(BENCH, [row(false, { phase: 'warmup' }), row(false), row(false)])]
    expect(nextOpenSet(e, 0)).toEqual({ idx: 0, i: 0, current: true })
    const afterWarm = [entry(BENCH, [row(true, { phase: 'warmup' }), row(false), row(false)])]
    expect(nextOpenSet(afterWarm, 0)).toEqual({ idx: 0, i: 1, current: true })
  })

  it('names the side to tick on a per-side row, left first, and the right once the left is done', () => {
    expect(nextOpenSet([entry(BENCH, [side(false, false)])], 0)).toEqual({ idx: 0, i: 0, side: 'L', current: true })
    expect(nextOpenSet([entry(BENCH, [side(true, false)])], 0)).toEqual({ idx: 0, i: 0, side: 'R', current: true })
  })

  it('reads a timed L/R pair as two rows: the L row first, then the R row', () => {
    const e = [entry(BENCH, [row(false, { side: 'L', sec: 30 }), row(false, { side: 'R', sec: 30 }), row(false, { side: 'L', sec: 30 }), row(false, { side: 'R', sec: 30 })])]
    expect(nextOpenSet(e, 0)).toEqual({ idx: 0, i: 0, current: true })
    e[0].sets[0].done = true
    expect(nextOpenSet(e, 0)).toEqual({ idx: 0, i: 1, current: true })
  })

  it('a drop-set or rest-pause row is one row, however many drops or bursts ride on it', () => {
    const e = [entry(BENCH, [row(true), row(false, { type: 'dropset', drops: [{ w: 40, r: 6 }, { w: 30, r: 6 }] }), row(false, { type: 'restpause', clusters: [{ r: 3, restSec: 15 }] })])]
    expect(nextOpenSet(e, 0)).toEqual({ idx: 0, i: 1, current: true })
  })

  it('moves to the next exercise with work left once the marked one is finished — and says it is not the marked one', () => {
    const e = [entry(BENCH, [row(true), row(true)]), entry(SQUAT, [row(false)])]
    expect(nextOpenSet(e, 0)).toEqual({ idx: 1, i: 0, current: false })
  })

  it('wraps round to an exercise skipped earlier', () => {
    const e = [entry(BENCH, [row(false)]), entry(SQUAT, [row(true)]), entry(ROW, [row(true)])]
    expect(nextOpenSet(e, 2)).toEqual({ idx: 0, i: 0, current: false })
  })

  it('is null when the whole session is ticked', () => {
    expect(nextOpenSet([entry(BENCH, [row(true)]), entry(SQUAT, [row(true)])], 0)).toBeNull()
    expect(nextOpenSet([], 0)).toBeNull()
  })

  it('in a superset it starts from the member whose turn it is, then the rest of its group', () => {
    const e = [entry(BENCH, [row(true), row(false)], { sg: 's' }), entry(SQUAT, [row(false), row(false)], { sg: 's' })]
    expect(nextOpenSet(e, 1)).toEqual({ idx: 1, i: 0, current: true })
    expect(nextOpenSet(e, 0)).toEqual({ idx: 0, i: 1, current: true })
  })

  it('agrees with Today’s currentPosition on the marked exercise’s open row, and is wider where it differs', () => {
    const e = [entry(BENCH, [row(true), row(false), row(false)])]
    expect(nextOpenSet(e, 0).i).toBe(1)
    expect(currentPosition({ cur: 0, entries: e }).set).toEqual({ warmup: false, no: 2, of: 3 })
    // currentPosition stays on the marked exercise; nextOpenSet looks past a finished one
    const done = [entry(BENCH, [row(true)]), entry(SQUAT, [row(false)])]
    expect(currentPosition({ cur: 0, entries: done }).allDone).toBe(true)
    expect(nextOpenSet(done, 0).idx).toBe(1)
  })
})

describe('previous performance — what the reference line can draw on', () => {
  // An exercise as it was logged last week: target (what the session prescribed) and its sets.
  const S = (id, target, sets, d = '2026-03-01') => ({ workouts: [{ id: 'w1', d, start: Date.parse(d + 'T10:00:00'), entries: [{ id, target, sets }] }], logRef: 'last' })
  const sets3 = [{ w: 215, r: 8, done: true }, { w: 220, r: 8, done: true }, { w: 220, r: 7, done: true }]

  it('reps + load: every work set of the last session, one label each — a pure presentation of existing history', () => {
    const h = S(BENCH, { mode: 'reps' }, sets3)
    const last = lastEntryFor(h, BENCH)
    expect(last.d).toBe('2026-03-01')
    expect(last.sets.map(s => setLabel(BENCH, s, last.target))).toEqual(['215×8', '220×8', '220×7'])
  })

  it('leaves warm-ups and unticked rows out of "last time"', () => {
    const h = S(BENCH, { mode: 'reps' }, [{ w: 60, r: 8, done: true, phase: 'warmup' }, { w: 100, r: 5, done: true }, { w: 100, r: 5, done: false }])
    expect(lastEntryFor(h, BENCH).sets).toHaveLength(1)
  })

  it('skips a session that does not count, and a routine’s own history comes first', () => {
    const h = { workouts: [
      { id: 'a', d: '2026-02-01', start: 1, routineIds: ['heavy'], entries: [{ id: BENCH, rid: 'heavy', target: { mode: 'reps' }, sets: [{ w: 140, r: 3, done: true }] }] },
      { id: 'b', d: '2026-02-08', start: 2, routineIds: ['light'], entries: [{ id: BENCH, rid: 'light', target: { mode: 'reps' }, sets: [{ w: 90, r: 10, done: true }] }] },
    ] }
    expect(lastEntryFor(h, BENCH, 'heavy').sets[0].w).toBe(140)
    expect(lastEntryFor(h, BENCH).sets[0].w).toBe(90)
  })

  it('bodyweight: reps, with added load only when there was some', () => {
    const last = lastEntryFor(S(BW, { mode: 'reps', bodyweight: true }, [{ w: 0, r: 12, done: true }, { w: 10, r: 8, done: true }]), BW)
    expect(last.sets.map(s => setLabel(BW, s, last.target))).toEqual(['12', '+10 × 8'])
  })

  it('assisted: the assistance as the load, reps as usual — and "best" means the least help', () => {
    const last = lastEntryFor(S(ASSISTED, { mode: 'reps' }, [{ w: 30, r: 8, done: true }, { w: 20, r: 6, done: true }]), ASSISTED)
    expect(last.sets.map(s => setLabel(ASSISTED, s, last.target))).toEqual(['30×8', '20×6'])
    expect(bestSetFor(S(ASSISTED, { mode: 'reps' }, [{ w: 30, r: 8, done: true }, { w: 20, r: 6, done: true }]), ASSISTED, 'reps').set.w).toBe(20)
  })

  it('timed: durations, with an optional load, and not comparable to rep sets', () => {
    const h = S(BENCH, { mode: 'time' }, [{ sec: 45, w: 0, done: true }, { sec: 60, w: 10, done: true }])
    const last = lastEntryFor(h, BENCH)
    expect(last.sets.map(s => setLabel(BENCH, s, last.target))).toEqual(['0:45', '1:00 · 10'])
    // a rep set of the same exercise is not a hold's best
    expect(bestSetFor(S(BENCH, { mode: 'reps' }, sets3), BENCH, 'time')).toBeNull()
  })

  it('cardio: minutes and speed as one line, not a rep table', () => {
    const h = S(CARDIO, { mode: 'cardio' }, [{ min: 20, speed: 8, done: true }])
    const last = lastEntryFor(h, CARDIO)
    expect(last.sets.map(s => setLabel(CARDIO, s, last.target, 'kmh'))).toEqual(['20 min @ 8 km/h'])
  })

  it('per-side: both sides in one label, "–" for a side that was not done', () => {
    const h = S(BENCH, { mode: 'reps', side: true }, [{ w: 0, r: 0, done: true, sides: { L: { w: 15, r: 8, done: true }, R: { w: 15, r: 7, done: true } } }])
    const last = lastEntryFor(h, BENCH)
    expect(last.sets.map(s => setLabel(BENCH, s, last.target))).toEqual(['L 15×8 · R 15×7'])
    expect(setLabel(BENCH, { w: 0, r: 0, done: false, sides: { L: { w: 15, r: 8, done: true }, R: { w: 15, r: 8, done: false } } }, { mode: 'reps', side: true })).toBe('L 15×8 · R –')
  })

  it('drop sets and rest-pause carry their extras inside the one label', () => {
    expect(setLabel(BENCH, { w: 100, r: 8, done: true, type: 'dropset', drops: [{ w: 80, r: 6 }] }, { mode: 'reps' })).toBe('100×8 ↘ 80×6')
    expect(setLabel(BENCH, { w: 60, r: 10, done: true, type: 'restpause', clusters: [{ r: 4, restSec: 15 }, { r: 2, restSec: 15 }] }, { mode: 'reps' })).toBe('60×4+4+2')
  })

  it('best set is one set across every routine; it does not need per-set history rows', () => {
    const best = bestSetFor(S(BENCH, { mode: 'reps' }, sets3), BENCH, 'reps')
    expect(best).toMatchObject({ d: '2026-03-01', set: { w: 220, r: 8 } })
  })

  it('no history is null on both sources, so a Last Time container must be absent, not empty', () => {
    expect(lastEntryFor({ workouts: [] }, BENCH)).toBeNull()
    expect(bestSetFor({ workouts: [] }, BENCH, 'reps')).toBeNull()
  })

  it('therefore: per-set Last Time rows are presentation of lastEntryFor + setLabel, with no new derivation', () => {
    // The reference line already shows these same labels joined with ", ". One row per label
    // needs no history that is not already returned here; cardio is one row and timed rows are
    // durations, so the layout has to follow the exercise's own mode and not force reps × load.
    const last = lastEntryFor(S(BENCH, { mode: 'reps' }, sets3), BENCH)
    expect(last.sets.map(s => setLabel(BENCH, s, last.target)).join(', ')).toBe('215×8, 220×8, 220×7')
  })
})

describe('the next exercise — the next unit in the session’s own order', () => {
  // Next / Prev (Workout.jsx navigateUnit): the first entry of the unit after the current one.
  const nextUnit = (entries, cur) => {
    const units = supersetUnits(entries)
    const at = units.findIndex(u => u.includes(cur))
    return at < 0 ? null : units[at + 1] || null
  }
  const names = (entries, unit) => unit && unit.map(i => entries[i].id)

  it('is the following exercise in order; none after the final one', () => {
    const e = [entry(BENCH, [row()]), entry(SQUAT, [row()]), entry(ROW, [row()])]
    expect(names(e, nextUnit(e, 0))).toEqual([SQUAT])
    expect(nextUnit(e, 2)).toBeNull()
  })

  it('follows a reorder: moving the current exercise down makes the old neighbour the one before, not the next', () => {
    const active = { cur: 0, entries: [entry(BENCH, [row()]), entry(SQUAT, [row()]), entry(ROW, [row()])] }
    moveActiveWorkoutUnit(active, 0, 1)
    expect(active.entries.map(x => x.id)).toEqual([SQUAT, BENCH, ROW])
    expect(active.cur).toBe(1)
    expect(names(active.entries, nextUnit(active.entries, active.cur))).toEqual([ROW])
  })

  it('is the whole next superset as a unit, and from inside a superset it skips the members after', () => {
    const e = [entry(BENCH, [row()]), entry(SQUAT, [row()], { sg: 's' }), entry(ROW, [row()], { sg: 's' }), entry('1006', [row()])]
    expect(names(e, nextUnit(e, 0))).toEqual([SQUAT, ROW])
    expect(names(e, nextUnit(e, 1))).toEqual(['1006'])
    expect(names(e, nextUnit(e, 2))).toEqual(['1006'])
  })

  it('sees a swapped exercise in its place — and, once logged, the replacement beside the original', () => {
    const fresh = { cur: 0, entries: [entry(BENCH, [row()]), entry(SQUAT, [row()])] }
    swapActiveExercise(fresh, 1, { id: ROW, sets: [row()] })
    expect(names(fresh.entries, nextUnit(fresh.entries, 0))).toEqual([ROW])
    const logged = { cur: 0, entries: [entry(BENCH, [row(true)]), entry(SQUAT, [row()])] }
    const r = swapActiveExercise(logged, 0, { id: ROW, sets: [row()] }, { loggedConfirmed: true })
    expect(r).toMatchObject({ inserted: true, index: 1 })
    expect(logged.entries.map(x => x.id)).toEqual([BENCH, ROW, SQUAT])
    expect(logged.cur).toBe(1)
  })

  it('"next to do" is a different question: the next unfinished unit, which wraps and skips done work', () => {
    const e = [entry(BENCH, [row(false)]), entry(SQUAT, [row(true)]), entry(ROW, [row(false)])]
    const units = supersetUnits(e)
    expect(nextUnfinishedUnit(e, units, 0)).toEqual([2])
    expect(nextUnfinishedUnit(e, units, 2)).toEqual([0])
    expect(nextUnfinishedUnit([entry(BENCH, [row(true)]), entry(SQUAT, [row(true)])], supersetUnits([entry(BENCH, [row(true)]), entry(SQUAT, [row(true)])]), 0)).toBeNull()
  })

  it('there is one pointer, S.active.cur: unitOf maps it to its superset, and nothing else holds a position', () => {
    const e = [entry(BENCH, [row()], { sg: 's' }), entry(SQUAT, [row()], { sg: 's' }), entry(ROW, [row()])]
    expect(unitOf(supersetUnits(e), 1)).toEqual([0, 1])
    expect(unitOf(supersetUnits(e), 2)).toEqual([2])
  })
})
