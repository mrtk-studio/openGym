import { describe, expect, it } from 'vitest'
import { currentSetView, nextUnitView } from './workout-current.js'

const BENCH = '1029', SQUAT = '1001', CARDIO = '1160'
const row = (done = false, extra = {}) => ({ w: 60, r: 8, done, ...extra })
const entry = (id, sets, extra = {}) => ({ id, target: { mode: 'reps', reps: 8, weight: 60 }, sets, ...extra })
const sideRow = (l, r) => ({ w: 0, r: 0, done: l && r, sides: { L: { w: 15, r: 8, done: l }, R: { w: 15, r: 8, done: r } } })

describe('currentSetView', () => {
  it('is null for a session with no exercises', () => {
    expect(currentSetView([], 0)).toBeNull()
    expect(currentSetView(undefined, 0)).toBeNull()
  })

  it('numbers work sets out of the work sets', () => {
    const e = [entry(BENCH, [row(true), row(), row()])]
    expect(currentSetView(e, 0)).toMatchObject({ kind: 'here', idx: 0, i: 1, label: { no: 2, of: 3 }, side: null })
  })

  it('calls a warm-up a warm-up, and numbers work sets without counting warm-ups', () => {
    const e = [entry(BENCH, [row(false, { phase: 'warmup' }), row(false, { phase: 'warmup' }), row(), row()])]
    expect(currentSetView(e, 0).label).toEqual({ warmup: true })
    e[0].sets[0].done = e[0].sets[1].done = true
    expect(currentSetView(e, 0).label).toEqual({ no: 1, of: 2 })
  })

  it('names the open side of a per-side row, counting the pair as one set', () => {
    const e = [entry(BENCH, [sideRow(true, true), sideRow(true, false), sideRow(false, false)], { target: { mode: 'reps', reps: 8, weight: 15, side: true } })]
    expect(currentSetView(e, 0)).toMatchObject({ kind: 'here', i: 1, label: { no: 2, of: 3 }, side: 'R' })
  })

  it('a cardio entry reads as cardio, not as a numbered set', () => {
    const e = [entry(CARDIO, [row()], { target: { mode: 'cardio', min: 10 } })]
    expect(currentSetView(e, 0).label).toEqual({ cardio: true })
  })

  it('does not take the pointer from anywhere but cur: a finished marked exercise points elsewhere', () => {
    const e = [entry(BENCH, [row(true), row(true)]), entry(SQUAT, [row(), row()])]
    expect(currentSetView(e, 0)).toMatchObject({ kind: 'elsewhere', idx: 1, i: 0, label: { no: 1, of: 2 } })
    expect(currentSetView(e, 1)).toMatchObject({ kind: 'here', idx: 1, i: 0 })
  })

  it('is done once every row is ticked', () => {
    expect(currentSetView([entry(BENCH, [row(true)])], 0)).toEqual({ kind: 'done' })
  })

  it('does not write anything', () => {
    const e = [entry(BENCH, [row(), row()]), entry(SQUAT, [row()])]
    const before = JSON.stringify(e)
    currentSetView(e, 1); nextUnitView(e, 0)
    expect(JSON.stringify(e)).toBe(before)
  })
})

describe('nextUnitView', () => {
  it('is the next entry in order, and null on the final unit', () => {
    const e = [entry(BENCH, [row()]), entry(SQUAT, [row()])]
    expect(nextUnitView(e, 0)).toEqual({ idxs: [1], superset: false })
    expect(nextUnitView(e, 1)).toBeNull()
  })

  it('a superset is one unit holding its members, whichever member is marked', () => {
    const e = [entry(BENCH, [row()]), entry(SQUAT, [row()], { sg: 'a' }), entry(BENCH, [row()], { sg: 'a' })]
    expect(nextUnitView(e, 0)).toEqual({ idxs: [1, 2], superset: true })
    expect(nextUnitView(e, 2)).toBeNull()
  })

  it('follows the order of the entries as they stand after a reorder', () => {
    const e = [entry(SQUAT, [row()]), entry(BENCH, [row()])]
    expect(nextUnitView(e, 0)).toEqual({ idxs: [1], superset: false })
    e.reverse()
    expect(nextUnitView(e, 0).idxs).toEqual([1])
    expect(e[1].id).toBe(SQUAT)
  })

  it('is null for an empty session', () => {
    expect(nextUnitView([], 0)).toBeNull()
  })
})
