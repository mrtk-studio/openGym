// @vitest-environment happy-dom
// The two quiet Today states (M1 Phase 6). Rest answers "what should I know before my next
// workout?": the next session as nextTrainingDay resolves it, and how long since its main muscle was
// trained. New User answers "how do I start?": three steps, one action, no dashboard.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { startFlow, starterPlanSheet, dayOverrideSheet } from '../sheets.jsx'
import { todayISO, isoOf, fmtDate } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { musclesOf } from '../lib/muscles.js'
import Home from './Home.jsx'

const nav = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '', weighInsSheet: vi.fn(),
}))

const idFor = slug => Object.keys(EXIDX).find(id => {
  const m = musclesOf(EXIDX[id]); return m[slug] === 1 && Object.values(m).filter(v => v === 1).length === 1
})
const CHEST = idFor('chest'), QUAD = idFor('quadriceps')
const mk = (id, name, n = 2, ex = CHEST) => ({ id, name, emoji: null, ex: Array.from({ length: n }, () => ({ id: ex, sets: 3, reps: 8 })) })
const WD = new Date().getDay()
const wdIn = n => (WD + n) % 7
const daysFromToday = n => { const d = new Date(todayISO() + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
const H = 3600000
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  nav.mockClear(); startFlow.mockClear(); starterPlanSheet.mockClear(); dayOverrideSheet.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const setS = (over = {}) => useStore.setState(s => ({
  S: { ...s.S, routines: [mk('r1', 'Pull', 4)], week: { [wdIn(1)]: ['r1'] }, dayPlan: {}, workouts: [], active: null, queue: null, rotation: null, scheduleMode: null, weighIn: false, ...over },
  user: null,
}))
const mount = () => act(() => root.render(<Home />))
const page = () => host.querySelector('.today')
const rest = () => host.querySelector('.m1-rest')
const when = () => host.querySelector('.m1-when').textContent
const nextNames = () => [...host.querySelectorAll('.m1-next-name, .m1-next-names li')].map(e => e.textContent)
const nextMeta = () => host.querySelector('.m1-next-meta').textContent
const rec = () => host.querySelector('.m1-tile-recovery')
const button = s => [...host.querySelectorAll('button')].find(b => b.textContent.includes(s))
const trained = (ex, agoH) => ({ id: 'w' + agoH, d: '2020-01-01', start: Date.now() - (agoH + 1) * H, end: Date.now() - agoH * H, routineIds: ['x'], routineId: 'x', name: 'Old', entries: [{ id: ex, sets: [1, 2, 3].map(() => ({ done: true, w: 50, r: 8 })) }] })

describe('Rest Today — the next session', () => {
  it('is calm: its own surface with "Recover.", no Action Red hero and no This Week tile', () => {
    setS(); mount()
    expect(page().dataset.todayState).toBe('rest')
    expect(rest().querySelector('.m1-kicker').textContent).toBe('Rest day')
    expect(rest().querySelector('.m1-rest-title').textContent).toBe('Recover.')
    expect(host.querySelector('.m1-hero')).toBeNull()
    expect(host.querySelector('.m1-tile-week')).toBeNull()
  })

  it('says tomorrow for tomorrow’s session, with its name, count and focus', () => {
    setS(); mount()
    expect(when()).toBe('Tomorrow')
    expect(nextNames()).toEqual(['Pull'])
    expect(nextMeta()).toContain('4 exercises'); expect(nextMeta()).toContain('Chest')
  })

  it('names the weekday when the next session is several days away', () => {
    setS({ week: { [wdIn(3)]: ['r1'] } }); mount()
    expect(when()).toBe(WEEKDAYS[wdIn(3)])
  })

  it('combines several routines on the next training day, summing their exercises', () => {
    setS({ routines: [mk('r1', 'Pull', 4), mk('r2', 'Core', 3, QUAD)], week: { [wdIn(1)]: ['r1', 'r2'] } }); mount()
    expect(nextNames()).toEqual(['Pull + Core'])
    expect(nextMeta()).toContain('7 exercises')
  })

  it('gives long names a line each', () => {
    setS({ routines: [mk('r1', 'Upper body hypertrophy', 4), mk('r2', 'Posterior chain', 3, QUAD)], week: { [wdIn(1)]: ['r1', 'r2'] } }); mount()
    expect(host.querySelector('ul.m1-next-names')).not.toBeNull()
    expect(nextNames()).toEqual(['Upper body hypertrophy', 'Posterior chain'])
  })

  it('follows a day override on a later day', () => {
    setS({ week: {}, dayPlan: { [daysFromToday(2)]: 'r1' } }); mount()
    expect(when()).toBe(WEEKDAYS[wdIn(2)])
  })

  it('a rest override on a planned day today is a rest day and still finds the next plan', () => {
    setS({ week: { [WD]: ['r1'], [wdIn(2)]: ['r1'] }, dayPlan: { [todayISO()]: 'rest' } }); mount()
    expect(page().dataset.todayState).toBe('rest')
    expect(when()).toBe(WEEKDAYS[wdIn(2)])
  })

  it('a coach queue that has not started names its first session on the day it starts', () => {
    const SINCE = Date.now() - 86400000
    setS({ week: {}, routines: [mk('r1', 'Pull', 4), mk('r2', 'Legs', 3, QUAD)], queue: { ids: ['r1', 'r2'], since: SINCE, startsOn: daysFromToday(3), label: 'W1' } }); mount()
    expect(page().dataset.todayState).toBe('rest')
    expect(nextNames()).toEqual(['Pull']); expect(when()).toBe(WEEKDAYS[wdIn(3)])
  })

  it('a rotation-managed pass is tomorrow or a date, never a weekday', () => {
    const rot = (startsOn) => ({ queue: { ids: ['r1'], since: Date.now() - 86400000, startsOn, label: 'Rot', rotationId: 'rot', strict: true }, rotation: { id: 'rot', sequence: ['r1'], label: 'Rot' }, scheduleMode: 'rotation', week: {} })
    setS(rot(daysFromToday(1))); mount()
    expect(when()).toBe('Tomorrow')
    setS(rot(daysFromToday(3))); mount()
    expect(when()).toBe(fmtDate(daysFromToday(3), true))
  })

  it('has an intentional no-upcoming state, with a way to Plan and nothing invented', () => {
    setS({ week: {} }); mount()
    expect(page().dataset.todayState).toBe('rest')
    expect(host.querySelector('.m1-next')).toBeNull()
    expect(rest().querySelector('.m1-rest-line').textContent).toBe('Nothing scheduled yet.')
    act(() => { button('Set up in Plan').click() })
    expect(nav).toHaveBeenCalledWith('/plan')
  })

  it('rotation chosen with nothing built has no upcoming session either', () => {
    setS({ week: {}, queue: null, scheduleMode: 'rotation' }); mount()
    expect(host.querySelector('.m1-next')).toBeNull()
  })

  it('keeps the freestyle door, quiet, below', () => {
    setS(); mount()
    act(() => { host.querySelector('.m1-door button').click() })
    expect(nav).toHaveBeenCalledWith('/workout')
  })

  it('keeps the week strip, open, and today in it assignable', () => {
    setS(); mount()
    expect(host.querySelector('details.m1-g-week')).toBeNull()
    expect(host.querySelectorAll('.today-secondary .week .wday')).toHaveLength(7)
    act(() => { host.querySelector('.wday.today').click() })
    expect(dayOverrideSheet).toHaveBeenCalledWith(todayISO())
  })
})

describe('Rest Today — recovery for the next session’s muscles', () => {
  it('shows hours since the next session’s main muscle was last trained', () => {
    setS({ workouts: [trained(CHEST, 72)] }); mount()
    expect(rec().querySelector('.m1-tile-title').textContent).toBe('Chest')
    expect(rec().querySelector('.m1-metric').textContent).toBe('72H')
  })

  it('is about the next session, not about whatever was trained last', () => {
    setS({ workouts: [trained(CHEST, 72), trained(QUAD, 5)] }); mount()
    expect(rec().querySelector('.m1-tile-title').textContent).toBe('Chest')
  })

  it('is left out, with no fresh-start filler, when there is no history for those muscles', () => {
    setS(); mount()
    expect(rec()).toBeNull()
    setS({ workouts: [trained(QUAD, 30)] }); mount()
    expect(rec()).toBeNull()
  })

  it('is left out when there is no upcoming session to relate it to', () => {
    setS({ week: {}, workouts: [trained(CHEST, 72)] }); mount()
    expect(rec()).toBeNull()
  })
})

describe('Rest Today — a workout already done today', () => {
  const freestyle = { id: 'f', d: todayISO(), start: Date.now() - 2 * H, end: Date.now() - H, routineIds: [], routineId: null, name: 'Freestyle', entries: [] }

  it('acknowledges it without turning the day into a planned one', () => {
    setS({ workouts: [freestyle] }); mount()
    expect(page().dataset.todayState).toBe('rest')
    expect(rest().querySelector('.m1-rest-line').textContent).toBe('Workout completed today.')
    expect(rest().querySelector('.m1-rest-line .icn')).not.toBeNull()
    expect(nextNames()).toEqual(['Pull'])
  })

  it('a completed scheduled workout stays the Planned hero, not a rest day', () => {
    setS({ week: { [WD]: ['r1'] }, workouts: [{ ...freestyle, routineIds: ['r1'], routineId: 'r1', name: 'Pull' }] }); mount()
    expect(page().dataset.todayState).toBe('planned')
    expect(host.querySelector('.m1-hero.done')).not.toBeNull()
  })
})

describe('New User Today', () => {
  const setNew = (over = {}) => setS({ routines: [], week: {}, workouts: [], bodyweight: [], ...over })

  it('is the welcome: three steps and one primary action', () => {
    setNew(); mount()
    expect(page().dataset.todayState).toBe('new-user')
    const w = host.querySelector('.m1-welcome')
    expect(w.querySelector('.m1-kicker').textContent).toBe('Welcome')
    expect(w.querySelector('.m1-welcome-title').textContent).toBe("Let's build your first week.")
    expect([...w.querySelectorAll('.m1-steps li')].map(li => li.textContent)).toEqual(['01Choose a routine', '02Choose your training days', '03Start your first workout'])
    expect(w.querySelectorAll('.m1-welcome-cta')).toHaveLength(1)
  })

  it('the primary action opens the existing starter-plan chooser', () => {
    setNew(); mount()
    act(() => { host.querySelector('.m1-welcome-cta').click() })
    expect(host.querySelector('.m1-welcome-cta').textContent).toBe('Choose a routine')
    expect(starterPlanSheet).toHaveBeenCalledTimes(1)
  })

  it('build-your-own goes to Plan and freestyle to the workout picker, both as quiet secondary actions', () => {
    setNew(); mount()
    act(() => { button('Build my own plan').click() })
    expect(nav).toHaveBeenCalledWith('/plan')
    act(() => { button('Train without a plan').click() })
    expect(nav).toHaveBeenCalledWith('/workout')
    expect(host.querySelector('.m1-welcome-alt')).not.toBeNull()
  })

  it('shows no empty analytics: no week, recovery, weight, streak or tiles', () => {
    setNew({ weighIn: undefined }); mount()
    expect(host.querySelector('.m1-tile')).toBeNull()
    expect(host.querySelector('.week')).toBeNull()
    expect(host.textContent).not.toContain('Body weight')
    expect(host.textContent).not.toMatch(/week streak/)
    expect(host.textContent).not.toContain('Recovery')
  })

  it('keeps the gym check-in below the welcome, and drops it with its setting', () => {
    setNew(); mount()
    const w = host.querySelector('.m1-welcome'), c = [...host.querySelectorAll('.m1-row')].find(x => x.textContent.includes('Check in'))
    expect(c).toBeTruthy()
    expect(w.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    setNew({ checkIn: false }); mount()
    expect(host.textContent).not.toContain('Check in')
  })

  it('a freestyle session with no routines is Active, not New User', () => {
    setNew({ active: { id: 'a', name: 'Freestyle', start: Date.now() - 60000, cur: 0, entries: [] } }); mount()
    expect(page().dataset.todayState).toBe('active')
    expect(host.querySelector('.m1-welcome')).toBeNull()
  })

  it('stops being new the moment a routine exists', () => {
    setNew({ routines: [mk('r1', 'Pull', 2)] }); mount()
    expect(page().dataset.todayState).toBe('rest')
    expect(host.querySelector('.m1-welcome')).toBeNull()
  })
})
