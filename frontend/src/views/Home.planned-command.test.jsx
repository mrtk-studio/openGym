// @vitest-environment happy-dom
// The Planned command center (M1 Phase 4): the hero, This Week and Recovery Context, wired to the
// effective routines, weekTally and the workout log. The derivations themselves are covered in
// lib/today-session.test.js; here it is what Home hands the components and what Start calls.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { startFlow, starterPlanSheet, dayOverrideSheet } from '../sheets.jsx'
import { todayISO, isoOf } from '../lib/format.js'
import Home from './Home.jsx'

const nav = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '', weighInsSheet: vi.fn(),
}))

import { EXIDX } from '../lib/exercises.js'
import { musclesOf } from '../lib/muscles.js'

const idFor = slug => Object.keys(EXIDX).find(id => {
  const m = musclesOf(EXIDX[id]); return m[slug] === 1 && Object.values(m).filter(v => v === 1).length === 1
})
const CHEST = idFor('chest'), QUAD = idFor('quadriceps')
const mk = (id, name, n = 2, ex = CHEST) => ({ id, name, emoji: null, ex: Array.from({ length: n }, () => ({ id: ex, sets: 3, reps: 8 })) })
const WD = new Date().getDay()
const H = 3600000

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  nav.mockClear(); startFlow.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const setS = (over = {}) => useStore.setState(s => ({
  S: { ...s.S, routines: [mk('r1', 'Push', 5)], week: { [WD]: ['r1'] }, dayPlan: {}, workouts: [], active: null, queue: null, rotation: null, scheduleMode: null, weighIn: false, ...over },
  user: null,
}))
const mount = () => act(() => root.render(<Home />))
const hero = () => host.querySelector('.m1-hero')
const names = () => [...hero().querySelectorAll('.m1-hero-title, .m1-hero-names li')].map(e => e.textContent)
const meta = () => hero().querySelector('.m1-hero-meta').textContent
const cta = () => hero().querySelector('.m1-hero-cta')
const week = () => host.querySelector('.m1-tile-week')
const rec = () => host.querySelector('.m1-tile-recovery')
const finished = (id, ex, endedAgoH, name = 'Push') => ({
  id: 'w' + endedAgoH, d: todayISO(), start: Date.now() - (endedAgoH + 1) * H, end: Date.now() - endedAgoH * H, routineIds: [id], routineId: id, name,
  entries: [{ id: ex, sets: [{ done: true, w: 50, r: 8 }, { done: true, w: 50, r: 8 }, { done: true, w: 50, r: 8 }] }],
})
// A workout long enough ago that it is not part of this calendar week's tally.
const old = w => ({ ...w, d: '2020-01-01' })

describe('Planned Today — the training hero', () => {
  it('shows the session identity, its exercise count and the muscles it works', () => {
    setS(); mount()
    expect(hero().querySelector('.m1-kicker').textContent).toBe("Today's training")
    expect(names()).toEqual(['Push'])
    expect(meta()).toContain('5 exercises')
    expect(meta()).toContain('Chest')
  })

  it('is the fixed M1 hero, not the legacy row, and says nothing about duration', () => {
    setS(); mount()
    expect(host.querySelector('.today-row')).toBeNull()
    expect(hero().textContent).not.toMatch(/\bmin\b|minutes|duration/i)
  })

  it('sums the exercises of every effective routine and joins short names into one title', () => {
    setS({ routines: [mk('r1', 'Push', 5), mk('r2', 'Core', 3, QUAD)], week: { [WD]: ['r1', 'r2'] } }); mount()
    expect(names()).toEqual(['Push + Core'])
    expect(meta()).toContain('8 exercises')
  })

  it('gives long or numerous names a line each instead of an uncontrolled title', () => {
    setS({ routines: [mk('r1', 'Upper body hypertrophy', 4), mk('r2', 'Posterior chain', 3, QUAD), mk('r3', 'Conditioning', 2)], week: { [WD]: ['r1', 'r2', 'r3'] } }); mount()
    expect(hero().querySelector('ul.m1-hero-names')).not.toBeNull()
    expect(names()).toEqual(['Upper body hypertrophy', 'Posterior chain', 'Conditioning'])
    expect(meta()).toContain('9 exercises')
  })

  it('reads a singular exercise count, and leaves the focus out when no exercise carries muscle data', () => {
    setS({ routines: [{ id: 'r1', name: 'Odd', emoji: null, ex: [{ id: 'not-in-the-catalogue-zz', sets: 3, reps: 8 }] }] }); mount()
    expect(meta()).toContain('1 exercise')
    expect(meta()).not.toContain('exercises')
  })

  it('says Rescheduled for a day override', () => {
    setS({ week: {}, dayPlan: { [todayISO()]: 'r1' } }); mount()
    expect(hero().querySelector('.m1-status').textContent).toBe('Rescheduled')
  })

  it('Start runs the existing combined-session flow with the effective routine ids', () => {
    setS({ routines: [mk('r1', 'Push', 5), mk('r2', 'Core', 3, QUAD)], week: { [WD]: ['r1', 'r2'] } }); mount()
    expect(cta().textContent).toBe('Start workout')
    act(() => { cta().click() })
    expect(startFlow).toHaveBeenCalledTimes(1)
    expect(startFlow).toHaveBeenCalledWith(['r1', 'r2'])
  })

  it('a completed planned day is a quieter hero that can still start another session', () => {
    setS({ workouts: [finished('r1', CHEST, 2)] }); mount()
    expect(hero().classList.contains('done')).toBe(true)
    expect(hero().querySelector('.m1-status').textContent).toBe('Completed')
    expect(cta().textContent).toBe('Start another session'); expect(cta().disabled).toBe(false)
    act(() => { cta().click() })
    expect(startFlow).toHaveBeenCalledWith(['r1'])
  })

  it('keeps "Choose a different workout" below the hero as a secondary action', () => {
    setS(); mount()
    const door = host.querySelector('.m1-door button')
    expect(door.textContent).toContain('Choose a different workout')
    expect(hero().compareDocumentPosition(door) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    act(() => { door.click() })
    expect(nav).toHaveBeenCalledWith('/workout'); expect(startFlow).not.toHaveBeenCalled()
  })
})

describe('Planned Today — This Week', () => {
  const tile = () => [week().querySelector('.m1-metric').textContent, week().querySelector('.m1-tile-label').textContent]

  it('shows done over planned from weekTally', () => {
    setS({ week: { [WD]: ['r1'], [(WD + 1) % 7]: ['r1'], [(WD + 2) % 7]: ['r1'] } }); mount()
    expect(tile()).toEqual(['0 / 3', 'Workouts'])
    expect(week().querySelector('.m1-bar i').style.width).toBe('0%')
  })

  it('counts this week’s logged workouts', () => {
    setS({ week: { [WD]: ['r1'], [(WD + 1) % 7]: ['r1'] }, workouts: [finished('r1', CHEST, 30), finished('r1', CHEST, 52)] }); mount()
    expect(tile()[0]).toBe('2 / 2')
    expect(week().querySelector('.m1-bar i').style.width).toBe('100%')
  })

  it('with nothing planned this week shows the count alone, no denominator and no bar', () => {
    setS({ week: {}, dayPlan: { [todayISO()]: 'r1' } }); mount()
    expect(tile()).toEqual(['0', 'Workouts'])
    expect(week().querySelector('.m1-bar')).toBeNull()
  })
})

describe('Planned Today — Recovery Context', () => {
  it('shows hours since the session’s main muscle was last trained, from the log', () => {
    setS({ workouts: [old(finished('r1', CHEST, 72))] }); mount()
    expect(rec().querySelector('.m1-tile-title').textContent).toBe('Chest')
    expect(rec().querySelector('.m1-metric').textContent).toBe('72H')
    expect(rec().querySelector('.m1-tile-label').textContent).toBe('Hours since trained')
  })

  it('switches to days once the gap is long', () => {
    setS({ workouts: [old(finished('r1', CHEST, 24 * 9))] }); mount()
    expect(rec().querySelector('.m1-metric').textContent).toBe('9D')
    expect(rec().querySelector('.m1-tile-label').textContent).toBe('Days since trained')
  })

  it('has an intentional empty state with no history — no number, no score', () => {
    setS(); mount()
    expect(rec().classList.contains('is-empty')).toBe(true)
    expect(rec().querySelector('.m1-metric')).toBeNull()
    expect(rec().textContent).toContain('Fresh start')
  })

  it('is empty too when history never touched the session’s muscles', () => {
    setS({ workouts: [old(finished('r1', QUAD, 40))] }); mount()
    expect(rec().classList.contains('is-empty')).toBe(true)
  })
})

describe('Planned Today — the rest of Today is still there', () => {
  it('keeps the supporting modules below the command center', () => {
    setS({ workouts: [{ id: 'w', d: '2020-01-01', start: 1, end: 2, routineIds: ['r1'], routineId: 'r1', name: 'Push', entries: [] }] }); mount()
    expect(host.querySelectorAll('.today-secondary .week .wday')).toHaveLength(7)
    expect(host.textContent).toContain('Check in')
    expect(host.textContent).toMatch(/workouts? total/)
  })
})
