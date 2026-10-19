// @vitest-environment happy-dom
// Phase 9 hardening: what the stabilization pass fixed — DOM order that matches the visual order,
// assistance wording on the sets grid. (Earlier phases' tests are untouched.)
// (was: M1 Cards Current Action (8B.2): the open set's values and its one forward move. It is a
// presentation of the one workout model — nextOpenSet decides which row, and every tap is the
// handler the grid's own controls use — so these pin that it delegates, moves on instead of
// undoing, and keeps to what each kind of set and session allows.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { beep, vibrate } from '../lib/sound.js'
import { registerCustom } from '../lib/exercises.js'

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
  registerCustom([])
  if (root) act(() => root.unmount())
  container?.remove(); root = container = null
  useUI.getState().stopRest(); useUI.getState().stopWork()
  vi.clearAllTimers(); vi.useRealTimers()
})
const ASSISTED = '0015'
const tap = el => { expect(el).toBeTruthy(); act(() => el.click()) }
const all = sel => [...container.querySelectorAll(sel)]
const before = (a, b) => !!(container.querySelector(a).compareDocumentPosition(container.querySelector(b)) & Node.DOCUMENT_POSITION_FOLLOWING)
const hist = { workouts: [{ id: 'w', d: '2026-09-16', start: Date.parse('2026-09-16T18:00:00'), entries: [{ id: BENCH, target: { mode: 'reps' }, sets: [{ w: 215, r: 8, done: true }] }] }] }

describe('Cards: the DOM reads in the order the screen does', () => {
  it('name, current set, last time, action, then the sets, then the tags — no CSS order needed', () => {
    mount([entry(BENCH, [row(), row()]), entry(SQUAT, [row()])], {}, hist)
    const chain = ['.xb-name', '.m1-cur', '.m1-lt', '.m1-act', '.xb-sets', '.xb-tags']
    for (let i = 0; i < chain.length - 1; i++) expect(before(chain[i], chain[i + 1]), chain[i] + ' before ' + chain[i + 1]).toBe(true)
  })
  it('Tab meets the controls top to bottom: the action’s buttons before the grid’s, the progression line after it', () => {
    mount([entry(BENCH, [row(), row()])], {}, hist)
    expect(before('.m1-act-go', '.xb-sets')).toBe(true)
    expect(before('.refline', '.m1-act')).toBe(true)
  })
  it('List and Compact keep their old order (tags first)', () => {
    mount([entry(BENCH, [row()])], { workoutView: 'list' })
    expect(container.querySelector('.m1-xb')).toBeNull()
    expect(before('.xb-tags', '.xb-sets')).toBe(true)
  })
})

describe('assistance is not a weight', () => {
  it('the sets grid heads an assistance machine’s load as assistance, in Cards', () => {
    mount([entry(ASSISTED, [row(false, { w: 20 })], { target: { mode: 'reps', reps: 8, weight: 20 } })])
    expect(container.querySelector('.sethead .w-sp').textContent).toBe('Assistance (kg)')
    expect(container.querySelector('.m1-act-fl').textContent).toBe('Assistance (kg)')
  })
  it('and in Focus', () => {
    mount([entry(ASSISTED, [row(false, { w: 20 })], { target: { mode: 'reps', reps: 8, weight: 20 } })], { workoutView: 'focus' })
    expect(container.querySelector('.focus-set .stp-l').textContent).toBe('Assistance (kg)')
  })
  it('an ordinary exercise still says weight, and the stored value is untouched', () => {
    mount([entry(BENCH, [row()])])
    expect(container.querySelector('.sethead .w-sp').textContent).toBe('Weight (kg)')
    tap(container.querySelector('.m1-act button[aria-label="Increase: Weight (kg)"]'))
    expect(useStore.getState().S.active.entries[0].sets[0].w).toBeGreaterThan(60)
  })
})
