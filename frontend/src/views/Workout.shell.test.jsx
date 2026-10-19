// @vitest-environment happy-dom
// The M1 Cards shell (8B.1): Current Set, Last Time and Next Up are read-only views of the one
// workout model; these pin what they say per kind of set and per kind of session.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { beep, vibrate } from '../lib/sound.js'

vi.mock('../lib/sound.js', () => ({ beep: vi.fn(), chime: vi.fn(), vibrate: vi.fn(), alertBuzz: vi.fn(), unlock: vi.fn() }))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})), appBase: () => '/' }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const clone = v => JSON.parse(JSON.stringify(v))
const BENCH = '1029', SQUAT = '1001', CARDIO = '1160'
const row = (done = false, extra = {}) => ({ w: 60, r: 8, done, ...extra })
const entry = (id, sets, extra = {}) => ({ id, target: { mode: 'reps', reps: 8, weight: 60 }, sets, ...extra })
const sideRow = (l, r) => ({ w: 0, r: 0, done: l && r, sides: { L: { w: 15, r: 8, done: l }, R: { w: 15, r: 8, done: r } } })
const perSide = { mode: 'reps', reps: 8, weight: 15, side: true }
const timedRows = (...done) => done.map(d => ({ sec: 30, w: 0, done: d }))
const pair = (...done) => done.map((d, i) => ({ sec: 30, w: 0, side: i % 2 ? 'R' : 'L', done: d }))


let root, container
function mount(entries, activeExtra = {}, sExtra = {}) {
  const S = clone(DEF); S.sound = true; S.restSec = 90; Object.assign(S, sExtra)
  S.active = { id: 't', d: '2026-09-23', start: Date.now(), routineId: null, name: 'Test', bw: null, cur: 0, entries, ...activeExtra }
  useStore.setState({ S, user: null })
  container = document.createElement('div'); document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Workout /></MemoryRouter>))
}
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null }) })
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove(); root = container = null
  useUI.getState().stopRest(); useUI.getState().stopWork()
  vi.clearAllTimers(); vi.useRealTimers()
})
const tap = el => { expect(el).toBeTruthy(); act(() => el.click()) }
const txt = sel => container.querySelector(sel)?.textContent
const all = sel => [...container.querySelectorAll(sel)]
const past = (id, sets, target = { mode: 'reps' }) => [{ id: 'w1', d: '2026-09-16', start: Date.parse('2026-09-16T18:00:00'), entries: [{ id, target, sets }] }]
const lastRows = () => all('.m1-lt-rows li').map(li => li.textContent)

describe('Current Set strip', () => {
  it('numbers the open set out of the work sets', () => {
    mount([entry(BENCH, [row(true), row(), row()])])
    expect(txt('.m1-cur')).toContain('Current')
    expect(txt('.m1-cur')).toContain('Set 2 / 3')
    expect(container.querySelector('.m1-cur').dataset.kind).toBe('here')
  })
  it('says warm-up for a warm-up row', () => {
    mount([entry(BENCH, [row(false, { phase: 'warmup' }), row(), row()])])
    expect(txt('.m1-cur-val')).toBe('Warm-up')
  })
  it('names the open side of a per-side row', () => {
    mount([entry(BENCH, [sideRow(true, false), sideRow(false, false)], { target: perSide })])
    expect(txt('.m1-cur-val')).toContain('Set 1 / 2')
    expect(txt('.m1-cur-side')).toContain('Right')
  })
  it('a finished marked exercise says so and names where the work is, not a set that is not on the card', () => {
    mount([entry(BENCH, [row(true)]), entry(SQUAT, [row()])])
    const el = container.querySelector('.m1-cur')
    expect(el.dataset.kind).toBe('elsewhere')
    expect(el.textContent).toContain('All sets done')
    expect(el.textContent).toContain('Next: ')
    expect(el.textContent).not.toContain('Set 1')
  })
  it('follows cur but never writes it', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row(), row()])], { cur: 1 })
    expect(txt('.m1-cur-val')).toContain('Set 1 / 2')
    expect(useStore.getState().S.active.cur).toBe(1)
  })
})

describe('Last Time block', () => {
  it('lists last time’s sets one per row, with the reference switch as its head', () => {
    mount([entry(BENCH, [row()])], {}, { workouts: past(BENCH, [{ w: 215, r: 8, done: true }, { w: 220, r: 8, done: true }, { w: 220, r: 7, done: true }]) })
    expect(lastRows()).toEqual(['1215 × 8', '2220 × 8', '3220 × 7'])
    expect(container.querySelector('.m1-lt .refline')).toBeTruthy()
  })
  it('is omitted entirely with no history', () => {
    mount([entry(BENCH, [row()])])
    expect(container.querySelector('.m1-lt')).toBeNull()
    expect(container.querySelector('.m1-lt-rows')).toBeNull()
  })
  it('keeps the Last time / Best set switch', () => {
    mount([entry(BENCH, [row()])], {}, { workouts: past(BENCH, [{ w: 100, r: 5, done: true }]) })
    expect(txt('.refline')).toMatch(/^Last time/)
    tap(container.querySelector('.refline'))
    expect(useStore.getState().S.logRef).toBe('best')
    expect(txt('.refline')).toMatch(/^Best set/)
  })
  it('a per-side set reads as one row with both sides', () => {
    mount([entry(BENCH, [sideRow(false, false)], { target: perSide })], {}, { workouts: past(BENCH, [{ w: 0, r: 0, done: true, sides: { L: { w: 15, r: 8, done: true }, R: { w: 15, r: 7, done: true } } }], perSide) })
    expect(lastRows()).toHaveLength(1)
    expect(lastRows()[0]).toMatch(/L.*15.*8.*R.*15.*7/)
  })
  it('a timed exercise reads its holds', () => {
    mount([entry(BENCH, timedRows(false), { target: { mode: 'time', sec: 30 } })], {}, { workouts: past(BENCH, [{ sec: 45, w: 0, done: true }], { mode: 'time' }) })
    expect(lastRows()[0]).toContain('45')
  })
  it('a drop set shows its row as the history labels it', () => {
    mount([entry(BENCH, [row()])], {}, { workouts: past(BENCH, [{ w: 60, r: 8, done: true, type: 'dropset', drops: [{ w: 40, r: 6 }] }]) })
    expect(lastRows()).toHaveLength(1)
    expect(lastRows()[0]).toContain('60')
  })
  it('cardio reads as one line, not a numbered table', () => {
    mount([entry(CARDIO, [row()], { target: { mode: 'cardio', min: 10 } })], {}, { workouts: past(CARDIO, [{ min: 12, dist: 2, done: true }], { mode: 'cardio' }) })
    expect(container.querySelector('.m1-lt-rows')).toBeNull()
    expect(container.querySelector('.m1-lt-one')).toBeTruthy()
  })
})

describe('Next Up', () => {
  const nextBtn = () => all('button').find(b => b.textContent.trim() === 'Next')
  const up = () => container.querySelector('.m1-next-up')
  it('names the next exercise and is Next when tapped', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])])
    expect(up()).toBeTruthy()
    expect(up().textContent).toContain('Up next')
    tap(up())
    expect(useStore.getState().S.active.cur).toBe(1)
  })
  it('is omitted on the final unit', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])], { cur: 1 })
    expect(up()).toBeNull()
    expect(nextBtn().disabled).toBe(true)
  })
  it('names a superset as its members together', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()], { sg: 's' }), entry('1013', [row()], { sg: 's' })])
    expect(up().textContent).toContain('Superset')
    expect(all('.m1-nu-names li')).toHaveLength(2)
    tap(up())
    expect(useStore.getState().S.active.cur).toBe(1)
  })
  it('follows the order after a reorder', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()]), entry('1013', [row()])])
    const first = up().getAttribute('aria-label')
    act(() => {
      const S = clone(useStore.getState().S); S.active.entries.splice(1, 0, S.active.entries.pop())
      useStore.setState({ S })
    })
    expect(up().getAttribute('aria-label')).not.toBe(first)
  })
})

describe('the shell in editing and backfill sessions', () => {
  it('editing a saved workout shows the shell with no live-only language, and Next Up still works', () => {
    mount([entry(BENCH, [row(), row()]), entry(SQUAT, [row()])], { editingWorkoutId: 'saved', d: '2026-03-01' })
    expect(container.querySelector('.m1-xb')).toBeTruthy()
    expect(txt('.m1-cur-val')).toContain('Set 1 / 2')
    tap(container.querySelector('.m1-next-up'))
    expect(useStore.getState().S.active.cur).toBe(1)
    expect(container.textContent).not.toMatch(/Rest timer|Resume/)
  })
  it('backfill shows the same shell', () => {
    mount([entry(BENCH, [row(), row()]), entry(SQUAT, [row()])], { backfill: true })
    expect(container.querySelector('.m1-xb')).toBeTruthy()
    expect(txt('.m1-cur-val')).toContain('Set 1 / 2')
    expect(container.querySelector('.m1-next-up')).toBeTruthy()
  })
})

describe('other views keep their own markup', () => {
  for (const view of ['list', 'compact', 'focus']) {
    it(view + ' has none of the Cards shell', () => {
      mount([entry(BENCH, [row()]), entry(SQUAT, [row()])], { workoutView: view })
      expect(container.querySelector('.m1-xb')).toBeNull()
      expect(container.querySelector('.m1-cur')).toBeNull()
      expect(container.querySelector('.m1-next-up')).toBeNull()
    })
  }
})
