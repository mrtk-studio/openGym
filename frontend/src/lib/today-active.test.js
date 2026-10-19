import { describe, expect, it } from 'vitest'
import { activeProgress, currentPosition } from './today-active.js'
import { EXIDX } from './exercises.js'

const row = (done = false, extra = {}) => ({ w: 50, r: 8, done, ...extra })
const ex = (id, sets, extra = {}) => ({ id, sets, ...extra })
const BENCH = '1029'   // strength

describe('activeProgress', () => {
  it('counts exercises whose every row is ticked', () => {
    const a = { entries: [ex(BENCH, [row(true), row(true)]), ex(BENCH, [row(true), row(false)]), ex(BENCH, [row(false)])] }
    expect(activeProgress(a)).toMatchObject({ done: 1, total: 3 })
    expect(activeProgress(a).fractions).toEqual([1, 0.5, 0])
    expect(activeProgress(a).sets).toEqual({ done: 3, total: 5 })
  })
  it('is by what is logged, not by where the marker is', () => {
    const a = { cur: 0, entries: [ex(BENCH, [row(false)]), ex(BENCH, [row(true)]), ex(BENCH, [row(true)])] }
    expect(activeProgress(a).done).toBe(2)
  })
  it('does not care about order: reordering keeps the count and moves the fractions with the exercises', () => {
    const a = [ex(BENCH, [row(true), row(true)]), ex(BENCH, [row(false), row(false)])]
    const b = [...a].reverse()
    expect(activeProgress({ entries: a }).done).toBe(activeProgress({ entries: b }).done)
    expect(activeProgress({ entries: b }).fractions).toEqual([0, 1])
  })
  it('counts a skipped exercise as not done, and still counts the ones after it', () => {
    const a = { entries: [ex(BENCH, [row(true)]), ex(BENCH, [row(false), row(false)]), ex(BENCH, [row(true)])] }
    expect(activeProgress(a)).toMatchObject({ done: 2, total: 3 })
  })
  it('keeps a logged exercise and adds its replacement when swapped after logging', () => {
    const a = { entries: [ex(BENCH, [row(true)]), ex('1001', [row(false)])] }
    expect(activeProgress(a)).toMatchObject({ done: 1, total: 2 })
  })
  it('counts both sides of a per-side row, so half a row is not done', () => {
    const half = { sides: { L: { done: true }, R: { done: false } } }
    const full = { sides: { L: { done: true }, R: { done: true } } }
    expect(activeProgress({ entries: [ex(BENCH, [half])] })).toMatchObject({ done: 0, total: 1, fractions: [0.5] })
    expect(activeProgress({ entries: [ex(BENCH, [full])] })).toMatchObject({ done: 1, total: 1, fractions: [1] })
  })
  it('is empty for no session or no exercises', () => {
    expect(activeProgress(null)).toMatchObject({ done: 0, total: 0, fractions: [] })
    expect(activeProgress({ entries: [] })).toMatchObject({ done: 0, total: 0 })
  })
})

describe('currentPosition', () => {
  it('names the marker’s exercise and its next open set out of the work sets', () => {
    const a = { cur: 1, entries: [ex(BENCH, [row(true)]), ex('1001', [row(true), row(true), row(false), row(false)])] }
    const p = currentPosition(a)
    expect(p.index).toBe(1); expect(p.entry.id).toBe('1001')
    expect(p.set).toEqual({ warmup: false, no: 3, of: 4 })
  })
  it('reads a warm-up row as a warm-up, not as set 1', () => {
    const a = { cur: 0, entries: [ex(BENCH, [row(false, { phase: 'warmup' }), row(false), row(false)])] }
    expect(currentPosition(a).set).toEqual({ warmup: true })
  })
  it('numbers work sets apart from warm-ups, out of the work sets only', () => {
    const a = { cur: 0, entries: [ex(BENCH, [row(true, { phase: 'warmup' }), row(true), row(false), row(false)])] }
    expect(currentPosition(a).set).toEqual({ warmup: false, no: 2, of: 3 })
  })
  it('a drop set or rest-pause row is one set, however many drops it carries', () => {
    const a = { cur: 0, entries: [ex(BENCH, [row(true), row(false, { type: 'dropset', drops: [{ w: 40, r: 6 }, { w: 30, r: 6 }] })])] }
    expect(currentPosition(a).set).toEqual({ warmup: false, no: 2, of: 2 })
  })
  it('a per-side timed pair counts as one set', () => {
    const a = { cur: 0, entries: [ex(BENCH, [row(true, { side: 'L' }), row(true, { side: 'R' }), row(false, { side: 'L' }), row(false, { side: 'R' })])] }
    expect(currentPosition(a).set).toEqual({ warmup: false, no: 2, of: 2 })
  })
  it('a half-ticked per-side row is still the set in progress', () => {
    const half = { sides: { L: { done: true }, R: { done: false } } }
    expect(currentPosition({ cur: 0, entries: [ex(BENCH, [row(true), half])] }).set).toEqual({ warmup: false, no: 2, of: 2 })
  })
  it('names no set for a cardio block, which is not counted in sets', () => {
    const cardio = Object.keys(EXIDX).find(id => EXIDX[id].bp === 'cardio')
    expect(cardio).toBeTruthy()
    const p = currentPosition({ cur: 0, entries: [ex(cardio, [row(false)])] })
    expect(p.set).toBeNull(); expect(p.allDone).toBe(false)
  })
  it('names no set when the exercise is finished', () => {
    const p = currentPosition({ cur: 0, entries: [ex(BENCH, [row(true), row(true)])] })
    expect(p.allDone).toBe(true); expect(p.set).toBeNull()
  })
  it('clamps a marker that points past the end, after an exercise was removed', () => {
    const a = { cur: 5, entries: [ex(BENCH, [row(false)]), ex('1001', [row(false)])] }
    expect(currentPosition(a).index).toBe(1)
    expect(currentPosition({ cur: undefined, entries: a.entries }).index).toBe(0)
  })
  it('follows the exercise the marker was moved with, not its old index', () => {
    // moveActiveWorkoutUnit re-points cur at the moved exercise
    const a = { cur: 0, entries: [ex('1001', [row(false)]), ex(BENCH, [row(false)])] }
    expect(currentPosition(a).entry.id).toBe('1001')
  })
  it('is null with no exercises', () => {
    expect(currentPosition({ cur: 0, entries: [] })).toBeNull()
    expect(currentPosition(null)).toBeNull()
  })
})
