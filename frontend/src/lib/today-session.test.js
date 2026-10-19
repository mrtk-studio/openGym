import { describe, expect, it } from 'vitest'
import { sessionSummary, recoveryContext, nextWhen } from './today-session.js'
import { musclesOf } from './muscles.js'
import { EXIDX } from './exercises.js'

// Real catalogue ids: the first exercise whose strongest muscle is the one wanted.
const idFor = slug => Object.keys(EXIDX).find(id => {
  const m = musclesOf(EXIDX[id]); return m[slug] === 1 && Object.values(m).filter(v => v === 1).length === 1
})
const CHEST = idFor('chest'), QUAD = idFor('quadriceps'), BICEP = idFor('biceps')
const ex = (id, sets = 3) => ({ id, sets, reps: 8 })
const done = (id, n = 3) => ({ id, sets: Array.from({ length: n }, () => ({ done: true, w: 50, r: 8 })) })
const H = 3600000
const NOW = Date.parse('2026-03-10T12:00:00Z')

describe('sessionSummary', () => {
  it('counts exercises across every routine on the day', () => {
    const rs = [{ id: 'a', ex: [ex(CHEST), ex(CHEST)] }, { id: 'b', ex: [ex(QUAD)] }]
    expect(sessionSummary(rs).count).toBe(3)
  })
  it('names the most programmed muscles first, at most two', () => {
    const rs = [{ id: 'a', ex: [ex(CHEST, 5), ex(QUAD, 3), ex(BICEP, 1)] }]
    expect(sessionSummary(rs).focus).toEqual(['chest', 'quadriceps'])
  })
  it('adds the load of combined routines before ranking', () => {
    const rs = [{ id: 'a', ex: [ex(CHEST, 3), ex(QUAD, 4)] }, { id: 'b', ex: [ex(CHEST, 3)] }]
    expect(sessionSummary(rs).focus[0]).toBe('chest')
  })
  it('is empty, not guessed, for no routines or no muscle data', () => {
    expect(sessionSummary([])).toEqual({ count: 0, focus: [] })
    expect(sessionSummary([{ id: 'a', ex: [] }])).toEqual({ count: 0, focus: [] })
  })
})

describe('recoveryContext', () => {
  const w = (id, endsAgoH, n) => ({ d: '2026-03-07', start: NOW - (endsAgoH + 1) * H, end: NOW - endsAgoH * H, entries: [done(id, n)] })

  it('is the hours since the focus muscle was last trained, counted from the workout end', () => {
    expect(recoveryContext([w(CHEST, 72)], ['chest'], NOW)).toEqual({ muscle: 'chest', hours: 72 })
  })
  it('uses the most recent workout that trained it', () => {
    expect(recoveryContext([w(CHEST, 200), w(CHEST, 30), w(QUAD, 5)], ['chest'], NOW)).toEqual({ muscle: 'chest', hours: 30 })
  })
  it('falls to the next focus muscle when the first was never logged', () => {
    expect(recoveryContext([w(QUAD, 48)], ['chest', 'quadriceps'], NOW)).toEqual({ muscle: 'quadriceps', hours: 48 })
  })
  it('ignores sets that were not ticked off and workouts too light to count', () => {
    const planned = { d: '2026-03-08', start: NOW - 10 * H, entries: [{ id: CHEST, sets: [{ done: false }, { done: false }] }] }
    expect(recoveryContext([planned], ['chest'], NOW)).toBeNull()
  })
  it('falls back to the start, then the day, when a workout has no end', () => {
    expect(recoveryContext([{ d: '2026-03-09', start: NOW - 24 * H, entries: [done(CHEST)] }], ['chest'], NOW)).toEqual({ muscle: 'chest', hours: 24 })
    expect(recoveryContext([{ d: '2026-03-09', entries: [done(CHEST)] }], ['chest'], NOW).hours).toBeGreaterThanOrEqual(0)
  })
  it('is null with no history, no focus, or none of the focus ever trained', () => {
    expect(recoveryContext([], ['chest'], NOW)).toBeNull()
    expect(recoveryContext([w(CHEST, 5)], [], NOW)).toBeNull()
    expect(recoveryContext([w(QUAD, 5)], ['chest'], NOW)).toBeNull()
  })
  it('never goes negative for a workout dated after now', () => {
    expect(recoveryContext([w(CHEST, -5)], ['chest'], NOW).hours).toBe(0)
  })
})

describe('nextWhen', () => {
  it('is tomorrow for the next day, however the plan is kept', () => {
    expect(nextWhen('2026-03-10', '2026-03-11')).toEqual({ key: 'tomorrow' })
    expect(nextWhen('2026-03-10', '2026-03-11', { named: false })).toEqual({ key: 'tomorrow' })
  })
  it('names the weekday further out', () => {
    expect(nextWhen('2026-03-10', '2026-03-13')).toEqual({ key: 'weekday', weekday: 5 })
  })
  it('gives a date, never a weekday, for a rotation pass', () => {
    expect(nextWhen('2026-03-10', '2026-03-13', { named: false })).toEqual({ key: 'date', iso: '2026-03-13' })
  })
  it('crosses a month and a daylight-saving change', () => {
    expect(nextWhen('2026-03-28', '2026-03-29')).toEqual({ key: 'tomorrow' })
    expect(nextWhen('2026-03-31', '2026-04-01')).toEqual({ key: 'tomorrow' })
  })
})
