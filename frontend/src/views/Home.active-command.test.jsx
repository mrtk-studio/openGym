// @vitest-environment happy-dom
// Today while a session is open (M1 Phase 5): the Active command center reads S.active and nothing
// else — its own name, clock, progress and position — and an editor or a backfill is not mistaken
// for a live workout. The derivations are covered in lib/today-active.test.js; here is the wiring.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { startFlow } from '../sheets.jsx'
import { todayISO, isoOf } from '../lib/format.js'
import { exOr } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'
import Home from './Home.jsx'

const nav = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '', weighInsSheet: vi.fn(),
}))

const BENCH = '1029', SQUAT = '1001', ROW = '1013'
const nameOf = id => exerciseNameFor(exOr(id))
const row = (done = false, extra = {}) => ({ w: 50, r: 8, done, ...extra })
const entry = (id, sets) => ({ id, sets })
const routines = [{ id: 'r1', name: 'Push', emoji: null, ex: [{ id: BENCH, sets: 3, reps: 8 }] }, { id: 'r2', name: 'Legs', emoji: null, ex: [{ id: SQUAT, sets: 3, reps: 8 }] }]
const WD = new Date().getDay()
const daysFromToday = n => { const d = new Date(todayISO() + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  nav.mockClear(); startFlow.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const session = (over = {}) => ({
  id: 'a', name: 'Pull day', start: Date.now() - 754000, cur: 0, routineIds: ['r2'],
  entries: [entry(BENCH, [row(true), row(true), row(false), row(false)]), entry(SQUAT, [row(false), row(false)]), entry(ROW, [row(false)])], ...over,
})
const setS = (over = {}) => useStore.setState(s => ({
  S: { ...s.S, routines, week: { [WD]: ['r1'] }, dayPlan: {}, workouts: [], active: session(), queue: null, rotation: null, scheduleMode: null, weighIn: false, ...over },
  user: null,
}))
const mount = () => act(() => root.render(<Home />))
const hero = () => host.querySelector('.m1-hero.m1-active')
const q = sel => hero().querySelector(sel)
const tile = () => host.querySelector('.m1-tile-week')

describe('Active Today — the live command center', () => {
  it('says a workout is in progress, in the M1 hero, and not as the legacy row', () => {
    setS(); mount()
    expect(host.querySelector('.today').dataset.todayState).toBe('active')
    expect(q('.m1-kicker').textContent).toBe('Workout in progress')
    expect(host.querySelector('.today-row')).toBeNull()
  })

  it('names the running session, not today’s scheduled routine', () => {
    setS({ week: { [WD]: ['r1'] } }); mount()
    expect(q('.m1-hero-title').textContent).toBe('Pull day')
    expect(hero().textContent).not.toContain('Push')
  })

  it('shows the session’s running time from its start', () => {
    setS(); mount()
    expect(q('.m1-clock').textContent).toBe('12:34')
  })

  it('leaves the clock out for a session with no start time', () => {
    setS({ active: session({ start: 0 }) }); mount()
    expect(q('.m1-clock')).toBeNull()
  })

  it('shows exercises done over total, from what each exercise has logged', () => {
    setS({ active: session({ entries: [entry(BENCH, [row(true)]), entry(SQUAT, [row(true), row(false)]), entry(ROW, [row(false)]), entry(BENCH, [row(true)])] }) }); mount()
    expect(q('.m1-prog-label').textContent).toBe('2 / 4 exercises')
    const fills = [...hero().querySelectorAll('.m1-seg b')].map(b => b.style.width)
    expect(fills).toEqual(['100%', '50%', '0%', '100%'])
  })

  it('counts a skipped exercise as not done and the ones after it as done', () => {
    setS({ active: session({ cur: 2, entries: [entry(BENCH, [row(true)]), entry(SQUAT, [row(false)]), entry(ROW, [row(true)])] }) }); mount()
    expect(q('.m1-prog-label').textContent).toBe('2 / 3 exercises')
  })

  it('is not thrown by a reorder: the same exercises give the same count, the bar follows them', () => {
    const a = [entry(BENCH, [row(true)]), entry(SQUAT, [row(false), row(false)])]
    setS({ active: session({ cur: 0, entries: a }) }); mount()
    const before = q('.m1-prog-label').textContent
    act(() => { useStore.setState(s => ({ S: { ...s.S, active: session({ cur: 1, entries: [...a].reverse() }) } })) })
    expect(q('.m1-prog-label').textContent).toBe(before)
    expect([...hero().querySelectorAll('.m1-seg b')].map(b => b.style.width)).toEqual(['0%', '100%'])
  })

  it('counts a replacement added beside a logged exercise as one more exercise', () => {
    setS({ active: session({ cur: 1, entries: [entry(BENCH, [row(true)]), entry(SQUAT, [row(false)])] }) }); mount()
    expect(q('.m1-prog-label').textContent).toBe('1 / 2 exercises')
  })

  it('uses one continuous bar once there are too many exercises for segments', () => {
    const many = Array.from({ length: 14 }, (_, i) => entry(BENCH, [row(i < 7)]))
    setS({ active: session({ entries: many }) }); mount()
    expect(q('.m1-prog-label').textContent).toBe('7 / 14 exercises')
    expect(hero().querySelectorAll('.m1-seg i')).toHaveLength(1)
    expect(q('.m1-seg b').style.width).toBe('50%')
  })

  it('names the exercise the marker is on and its next open set out of the work sets', () => {
    setS(); mount()
    expect(q('.m1-now .m1-kicker').textContent).toBe('Current')
    expect(q('.m1-now-name').textContent).toBe(nameOf(BENCH))
    expect(q('.m1-now-set').textContent).toBe('Set 3 / 4')
  })

  it('follows the marker to another exercise', () => {
    setS({ active: session({ cur: 1 }) }); mount()
    expect(q('.m1-now-name').textContent).toBe(nameOf(SQUAT))
    expect(q('.m1-now-set').textContent).toBe('Set 1 / 2')
  })

  it('reads a warm-up as a warm-up and says so when the exercise is finished, rather than inventing a set', () => {
    setS({ active: session({ entries: [entry(BENCH, [row(false, { phase: 'warmup' }), row(false)])] }) }); mount()
    expect(q('.m1-now-set').textContent).toBe('Warm-up')
    act(() => { useStore.setState(s => ({ S: { ...s.S, active: session({ entries: [entry(BENCH, [row(true), row(true)])] }) } })) })
    expect(q('.m1-now-set').textContent).toBe('All sets done')
  })

  it('shows no current block for a session with no exercises yet', () => {
    setS({ active: session({ entries: [] }) }); mount()
    expect(q('.m1-now')).toBeNull()
    expect(q('.m1-prog-label')).toBeNull()
  })

  it('Resume goes to the existing workout route and starts nothing', () => {
    setS(); mount()
    expect(q('.m1-hero-cta').textContent).toBe('Resume workout')
    act(() => { q('.m1-hero-cta').click() })
    expect(nav).toHaveBeenCalledWith('/workout'); expect(startFlow).not.toHaveBeenCalled()
  })

  it('does not offer to choose a different workout while one is running', () => {
    setS(); mount()
    expect([...host.querySelectorAll('button')].some(b => b.textContent.includes('Choose a different workout'))).toBe(false)
  })
})

describe('Active Today — editing and backfill are not live', () => {
  it.each([['editing', { editingWorkoutId: 'w1' }, 'Editing a saved workout', 'Edit workout'], ['backfill', { backfill: true }, 'Log a past workout', 'Resume']])(
    '%s gets the quiet card: no live language, no clock, no progress', (_n, extra, kicker, cta) => {
      setS({ active: session(extra) }); mount()
      const h = host.querySelector('.m1-hero.quiet')
      expect(h.querySelector('.m1-kicker').textContent).toBe(kicker)
      expect(h.querySelector('.m1-hero-title').textContent).toBe('Pull day')
      expect(h.querySelector('.m1-hero-cta').textContent).toBe(cta)
      expect(h.querySelector('.m1-clock')).toBeNull(); expect(h.querySelector('.m1-seg')).toBeNull(); expect(h.querySelector('.m1-live')).toBeNull()
      expect(host.textContent).not.toContain('Workout in progress')
      act(() => { h.querySelector('.m1-hero-cta').click() })
      expect(nav).toHaveBeenCalledWith('/workout')
    })

  it('does not fold the week for them — only a live session does', () => {
    setS({ active: session({ backfill: true }) }); mount()
    expect(host.querySelector('.today-fold')).toBeNull()
  })
})

describe('Active Today — what sits beneath the hero', () => {
  it('keeps This Week, with the same tally Planned shows, and an unfinished workout does not add to it', () => {
    setS({ week: { [WD]: ['r1'], [(WD + 1) % 7]: ['r1'] } }); mount()
    expect(tile().querySelector('.m1-metric').textContent).toBe('0 / 2')
    expect(host.querySelector('.m1-tile-recovery')).toBeNull()
  })

  it('never shows Recovery Context during a live workout, even with history for it', () => {
    const H = 3600000
    setS({ workouts: [{ id: 'w', d: '2020-01-01', start: Date.now() - 80 * H, end: Date.now() - 72 * H, routineIds: ['r1'], routineId: 'r1', name: 'Push', entries: [entry(BENCH, [row(true), row(true), row(true)])] }] }); mount()
    expect(host.querySelector('.m1-tile-recovery')).toBeNull()
    expect(host.textContent).not.toContain('Hours since trained')
  })

  it('folds the legacy week strip under a live session, closed, with its days still there', () => {
    setS(); mount()
    const fold = host.querySelector('details.today-fold')
    expect(fold).not.toBeNull(); expect(fold.open).toBe(false)
    expect(fold.querySelector('summary').textContent).toBe('Week')
    expect(fold.querySelectorAll('.week .wday')).toHaveLength(7)
  })

  it('keeps the check-in, body weight and streak reachable', () => {
    setS({ weighIn: undefined }); mount()
    expect(host.textContent).toContain('Check in'); expect(host.textContent).toContain('Body weight'); expect(host.textContent).toMatch(/week streak/)
  })

  it('leaves the other states’ week strip unfolded', () => {
    setS({ active: null }); mount()
    expect(host.querySelector('.today-fold')).toBeNull()
    expect(host.querySelectorAll('.today-secondary .card .week .wday')).toHaveLength(7)
  })
})

describe('This Week — a coach queue / rotation', () => {
  const SINCE = Date.now() - 3 * 86400000
  const queue = (over = {}) => ({ ids: ['r1', 'r2'], since: SINCE, startsOn: daysFromToday(-2), label: 'W1', ...over })
  const logged = (id, name) => { const start = SINCE + 3600000; return { id: 'w-' + id, d: isoOf(new Date(start)), start, end: start + 3600000, routineIds: [id], routineId: id, name, entries: [] } }
  const metric = () => host.querySelector('.m1-tile-week .m1-metric').textContent

  it('tallies the queue’s sessions on the planned hero’s tile: one done of two', () => {
    setS({ active: null, week: {}, queue: queue(), workouts: [logged('r1', 'Push')] }); mount()
    expect(host.querySelector('.today').dataset.todayState).toBe('planned')
    expect(metric()).toBe('1 / 2')
  })

  it('adds your own weekday routines beside the queue', () => {
    setS({ active: null, week: { [WD]: ['r1'] }, queue: queue({ ids: ['r2'] }) }); mount()
    // r1 on today's weekday is an own day, r2 the queue's one session
    expect(metric()).toBe('0 / 2')
  })

  it('a rotation-managed queue tallies the same way', () => {
    setS({ active: null, week: {}, queue: queue({ rotationId: 'rot' }), rotation: { id: 'rot', sequence: ['r1', 'r2'], label: 'W1' }, scheduleMode: 'rotation', workouts: [logged('r1', 'Push')] }); mount()
    expect(metric()).toBe('1 / 2')
  })

  it('shows the same tally on the Active tile', () => {
    setS({ week: {}, queue: queue(), workouts: [logged('r1', 'Push')] }); mount()
    expect(host.querySelector('.today').dataset.todayState).toBe('active')
    expect(metric()).toBe('1 / 2')
  })
})
