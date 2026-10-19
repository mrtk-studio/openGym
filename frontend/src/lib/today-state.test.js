import { describe, expect, it } from 'vitest'
import { classifyToday } from './today-state.js'

const base = { active: null, hasRoutines: true, hasPlanToday: true, doneToday: null }

describe('classifyToday', () => {
  it('is a new user with no routines and nothing open', () => {
    expect(classifyToday({ ...base, hasRoutines: false, hasPlanToday: false })).toEqual({ kind: 'new-user', mode: null, done: false })
  })
  it('is planned when the effective routines for today are not empty', () => {
    expect(classifyToday(base)).toEqual({ kind: 'planned', mode: null, done: false })
  })
  it('is a rest day when routines exist but none is on today', () => {
    expect(classifyToday({ ...base, hasPlanToday: false })).toEqual({ kind: 'rest', mode: null, done: false })
  })
  it('is active for a live session, whatever the plan says', () => {
    expect(classifyToday({ ...base, active: { id: 'a', start: 1 } })).toMatchObject({ kind: 'active', mode: 'live' })
    expect(classifyToday({ ...base, hasPlanToday: false, active: { id: 'a', start: 1 } })).toMatchObject({ kind: 'active', mode: 'live' })
  })
  it('is active even with no routines at all (a freestyle session)', () => {
    expect(classifyToday({ ...base, hasRoutines: false, hasPlanToday: false, active: { id: 'a' } })).toMatchObject({ kind: 'active', mode: 'live' })
  })
  it('tells an open editor on a saved workout from a live session', () => {
    expect(classifyToday({ ...base, active: { id: 'a', editingWorkoutId: 'w1', start: 1 } })).toMatchObject({ kind: 'active', mode: 'editing' })
  })
  it('tells a backfill from a live session', () => {
    expect(classifyToday({ ...base, active: { id: 'a', backfill: true, start: 1 } })).toMatchObject({ kind: 'active', mode: 'backfill' })
  })
  it('keeps a covered day as a flag on the state, not a state of its own', () => {
    expect(classifyToday({ ...base, doneToday: { id: 'w' } })).toEqual({ kind: 'planned', mode: null, done: true })
    expect(classifyToday({ ...base, hasPlanToday: false, doneToday: { id: 'w' } })).toEqual({ kind: 'rest', mode: null, done: true })
  })
  it('does not let a done flag outrank an open session', () => {
    expect(classifyToday({ ...base, active: { id: 'a' }, doneToday: { id: 'w' } })).toMatchObject({ kind: 'active', done: true })
  })
})
