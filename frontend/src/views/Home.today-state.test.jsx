// @vitest-environment happy-dom
// Today's state composition (M1 Phase 3): Home hands the facts its domain helpers settled to
// classifyToday and renders the primary slot from the answer. The classifier itself is covered in
// lib/today-state.test.js; here it is the wiring — that each situation lands in the state it
// should, with the words the row has always had, and that the moved modules are still reachable.
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

const routines = [
  { id: 'r1', name: 'Push', emoji: null, ex: [{ id: '0025' }] },
  { id: 'r2', name: 'Core', emoji: null, ex: [{ id: '0025' }] },
]
const WD = new Date().getDay()
const daysFromToday = n => { const d = new Date(todayISO() + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
const loggedToday = (id, name) => ({ id: 'w-' + id, d: todayISO(), start: Date.now() - 7200000, end: Date.now() - 3600000, routineIds: [id], routineId: id, name, entries: [] })

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
  S: { ...s.S, routines, week: { [WD]: ['r1'] }, dayPlan: {}, workouts: [], active: null, queue: null, rotation: null, scheduleMode: null, weighIn: false, ...over },
  user: null,
}))
const mount = () => act(() => root.render(<Home />))
const page = () => host.querySelector('.today')
const state = () => page().dataset.todayState
const mode = () => page().dataset.todayMode
const hero = () => host.querySelector('.m1-hero')
const heroNames = () => [...hero().querySelectorAll('.m1-hero-title, .m1-hero-names li')].map(e => e.textContent)
const heroStatus = () => hero().querySelector('.m1-status').textContent
const cta = () => hero().querySelector('.m1-hero-cta')
const text = el => el.textContent
const buttonByText = s => [...host.querySelectorAll('button')].find(b => b.textContent.includes(s))

describe('Today — the state of the day', () => {
  it('a new user (no routines, nothing open) gets the welcome, not a fake "Rest day"', () => {
    setS({ routines: [], week: {} }); mount()
    expect(state()).toBe('new-user')
    expect(host.querySelector('.m1-rest')).toBeNull()
    expect(host.querySelector('.m1-welcome')).not.toBeNull()
  })

  it('a new user can still reach the freestyle start screen', () => {
    setS({ routines: [], week: {} }); mount()
    act(() => { buttonByText('Train without a plan').click() })
    expect(nav).toHaveBeenCalledWith('/workout')
  })

  it('a planned day names its routine, offers Start, and starts through the combined-session flow', () => {
    setS(); mount()
    expect(state()).toBe('planned')
    expect(heroNames()).toEqual(['Push']); expect(heroStatus()).toBe('Scheduled')
    expect(host.querySelector('.today-row')).toBeNull()
    expect(cta().textContent).toBe('Start workout')
    act(() => { cta().click() })
    expect(startFlow).toHaveBeenCalledWith(['r1'])
  })

  it('several routines on one weekday read as one planned session, started together', () => {
    setS({ week: { [WD]: ['r1', 'r2'] } }); mount()
    expect(state()).toBe('planned')
    expect(heroNames()).toEqual(['Push + Core'])
    act(() => { cta().click() })
    expect(startFlow).toHaveBeenCalledWith(['r1', 'r2'])
  })

  it('a day override reschedules the planned session and says so', () => {
    setS({ week: {}, dayPlan: { [todayISO()]: 'r2' } }); mount()
    expect(state()).toBe('planned')
    expect(heroNames()).toEqual(['Core']); expect(heroStatus()).toBe('Rescheduled')
  })

  it('a rest day says so, names the next session, and today stays assignable from the week strip', () => {
    setS({ week: { [(WD + 2) % 7]: ['r1'] } }); mount()
    expect(state()).toBe('rest')
    expect(host.querySelector('.m1-rest-title').textContent).toBe('Recover.')
    expect(host.querySelector('.m1-next-name').textContent).toBe('Push')
    act(() => { host.querySelector('.wday.today').click() })
    expect(dayOverrideSheet).toHaveBeenCalledWith(todayISO())
    expect(startFlow).not.toHaveBeenCalled()
  })

  it('a rest override on a planned weekday is a rest day', () => {
    setS({ dayPlan: { [todayISO()]: 'rest' } }); mount()
    expect(state()).toBe('rest')
  })
})

describe('Today — an open session', () => {
  const live = (extra = {}) => ({ id: 'a', name: 'Push', start: Date.now() - 600000, cur: 0, entries: [], routineIds: ['r1'], ...extra })

  it('a live session is active/live, "in progress", and Resume goes to the workout', () => {
    setS({ active: live() }); mount()
    expect(state()).toBe('active'); expect(mode()).toBe('live')
    expect(host.querySelector('.m1-hero.m1-active .m1-kicker').textContent).toBe('Workout in progress')
    expect(host.querySelector('.m1-hero-title').textContent).toBe('Push')
    act(() => { host.querySelector('.m1-hero-cta').click() })
    expect(nav).toHaveBeenCalledWith('/workout'); expect(startFlow).not.toHaveBeenCalled()
  })

  it('an open editor on a saved workout is active/editing, not "in progress"', () => {
    setS({ active: live({ editingWorkoutId: 'w1' }) }); mount()
    expect(state()).toBe('active'); expect(mode()).toBe('editing')
    expect(host.querySelector('.m1-hero.quiet')).not.toBeNull()
    expect(host.textContent).not.toContain('Workout in progress')
    expect(host.querySelector('.m1-hero-cta').textContent).toBe('Edit workout')
  })

  it('a backfill is active/backfill, kept apart from a live session', () => {
    setS({ active: live({ backfill: true }) }); mount()
    expect(state()).toBe('active'); expect(mode()).toBe('backfill')
    expect(host.querySelector('.m1-hero.quiet .m1-kicker').textContent).toBe('Log a past workout')
    expect(host.querySelector('.m1-hero-cta').textContent).toBe('Resume')
  })

  it('an open session outranks a new-user profile and hides the freestyle door', () => {
    setS({ routines: [], week: {}, active: live({ routineIds: [] }) }); mount()
    expect(state()).toBe('active')
    expect(buttonByText('Choose a different workout')).toBeUndefined()
  })
})

describe('Today — completed today', () => {
  it('a covered plan stays a planned day, flagged done, still tappable for a second session', () => {
    setS({ workouts: [loggedToday('r1', 'Push')] }); mount()
    expect(state()).toBe('planned')
    expect(hero().classList.contains('done')).toBe(true); expect(heroStatus()).toBe('Completed')
    expect(cta().textContent).toBe('Start another session'); expect(cta().disabled).toBe(false)
    act(() => { cta().click() })
    expect(startFlow).toHaveBeenCalledWith(['r1'])
  })

  it('a freestyle session on a planned day does not count as covering the plan', () => {
    setS({ workouts: [{ ...loggedToday('x', 'Freestyle'), routineIds: [], routineId: null }] }); mount()
    expect(hero().classList.contains('done')).toBe(false); expect(heroStatus()).toBe('Scheduled')
  })

  it('a workout logged on a rest day reads as done, with its name', () => {
    setS({ week: {}, workouts: [loggedToday('r2', 'Core')] }); mount()
    expect(state()).toBe('rest')
    expect(host.querySelector('.m1-rest-line').textContent).toBe('Workout completed today.')
  })
})

describe('Today — rotation and the coach / planner queue', () => {
  const SINCE = Date.now() - 3 * 86400000
  const queue = (over = {}) => ({ ids: ['r1', 'r2'], since: SINCE, startsOn: daysFromToday(-2), label: 'W1', ...over })

  it('a coach queue puts its next session on today as planned', () => {
    setS({ week: {}, queue: queue() }); mount()
    expect(state()).toBe('planned')
    expect(heroNames()).toEqual(['Push'])
    expect(host.querySelector('.queue')).not.toBeNull()
  })

  it('a queue that has not started yet is a rest day that names the next session', () => {
    setS({ week: {}, queue: queue({ startsOn: daysFromToday(2) }) }); mount()
    expect(state()).toBe('rest')
    expect(host.querySelector('.m1-next-name').textContent).toBe('Push')
  })

  it('a rotation-managed pass never names a weekday on its empty gap', () => {
    setS({ week: {}, queue: queue({ startsOn: daysFromToday(2), rotationId: 'rot' }), rotation: { id: 'rot', sequence: ['r1', 'r2'], label: 'W1' }, scheduleMode: 'rotation' }); mount()
    expect(state()).toBe('rest')
    expect(host.querySelector('.m1-when').textContent).not.toMatch(/day$/)
  })

  it('rotation chosen with nothing built is a rest day with its empty state and a way to Plan', () => {
    setS({ week: {}, queue: null, scheduleMode: 'rotation' }); mount()
    expect(state()).toBe('rest')
    expect(host.querySelector('.week')).toBeNull()
    act(() => { buttonByText('Set up in Plan').click() })
    expect(nav).toHaveBeenCalledWith('/plan')
  })

  it('a chip on the queue row still starts that one routine', () => {
    setS({ week: {}, queue: queue() }); mount()
    act(() => { host.querySelectorAll('.queue .chip')[1].click() })
    expect(startFlow).toHaveBeenCalledWith(['r2'])
  })
})

describe('Today — what moved below the primary slot is still there', () => {
  it('keeps the week strip (with browsing), check-in, body weight and the streak, after the primary slot', () => {
    setS({ weighIn: undefined, workouts: [{ id: 'w', d: '2020-01-01', start: 1, end: 2, routineIds: ['r1'], routineId: 'r1', name: 'Push', entries: [] }] }); mount()
    const order = [...page().children].map(c => c.className)
    expect(order[1]).toContain('today-primary')
    expect(host.querySelectorAll('.today-secondary .week .wday')).toHaveLength(7)
    expect(host.textContent).toContain('Check in')
    expect(host.textContent).toContain('Body weight')
    expect(host.textContent).toMatch(/workouts? total/)
    act(() => { host.querySelector('button[aria-label="Next week"]').click() })
    expect(host.querySelector('.today-secondary .small.muted').textContent).not.toBe('This week')
  })

  it('check-in goes to /checkin and the gear to /settings', () => {
    setS(); mount()
    act(() => { [...host.querySelectorAll('.m1-row')].find(c => c.textContent.includes('Check in')).click() })
    expect(nav).toHaveBeenCalledWith('/checkin')
    act(() => { host.querySelector('.today-hdr .iconbtn').click() })
    expect(nav).toHaveBeenCalledWith('/settings')
  })

  it('a week-strip day still opens its day sheet', () => {
    setS(); mount()
    act(() => { host.querySelector('.wday').click() })
    expect(dayOverrideSheet).toHaveBeenCalled()
  })

  it('puts Today on the M1 canvas while mounted, and only then', () => {
    setS(); mount()
    expect(document.body.classList.contains('today-canvas')).toBe(true)
    act(() => root.unmount())
    expect(document.body.classList.contains('today-canvas')).toBe(false)
    root = createRoot(host)
  })
})
