// @vitest-environment happy-dom
// 8B.3 convergence (Focus in the M1 language, the hold-in-progress look, media by type): what is
// new in presentation. The Cards Current Action itself is pinned in Workout.action.test.jsx.
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
const tap = el => { expect(el).toBeTruthy(); act(() => el.click()) }
const txt = sel => container.querySelector(sel)?.textContent
const all = sel => [...container.querySelectorAll(sel)]
const work = () => useUI.getState().work
const rows = (e = 0) => useStore.getState().S.active.entries[e].sets
const focus = { workoutView: 'focus' }
const hist = sets => ({ workouts: [{ id: 'w', d: '2026-09-16', start: Date.parse('2026-09-16T18:00:00'), entries: [{ id: BENCH, target: { mode: 'reps' }, sets }] }] })
const complete = () => container.querySelector('button[aria-label="Complete set"]')

describe('a hold in progress, in Cards', () => {
  const mountTimed = () => mount([entry(BENCH, timedRows(false, false), { target: { mode: 'time', sec: 30 } }), entry(SQUAT, [row()])])
  it('reads as live, not as a dimmed Start: the label says so, the button stays disabled', () => {
    mountTimed()
    const go = () => container.querySelector('.m1-act-go')
    expect(go().classList.contains('working')).toBe(false)
    tap(go())
    expect(work()).not.toBeNull()
    expect(go().textContent).toBe('Hold in progress')
    expect(go().classList.contains('working')).toBe(true)
    expect(go().disabled).toBe(true)
    expect(go().dataset.state).toBe('running')
  })
  it('goes back to Start set on the next set once the hold ends — the timer was never touched', () => {
    mountTimed()
    tap(container.querySelector('.m1-act-go'))
    act(() => { vi.advanceTimersByTime(31000) })
    const go = container.querySelector('.m1-act-go')
    expect(go.textContent).toBe('Start set')
    expect(go.classList.contains('working')).toBe(false)
  })
})

describe('Focus: the last time of this set', () => {
  it('adds the same row from last session next to the date line, in the words the rows use', () => {
    mount([entry(BENCH, [row(), row()])], focus, hist([{ w: 215, r: 8, done: true }, { w: 220, r: 6, done: true }]))
    expect(txt('.focus-ref')).toBe('215 × 8')
    tap(container.querySelector('button[aria-label="Next set"]'))
    expect(txt('.focus-ref')).toBe('220 × 6')
  })
  it('the date line stays the date only', () => {
    mount([entry(BENCH, [row()])], focus, hist([{ w: 215, r: 8, done: true }]))
    expect(txt('.focus-last')).toContain('Last time')
    expect(txt('.focus-last')).not.toContain('215')
  })
  it('a set with no counterpart last time has no reference, and no history has no block', () => {
    mount([entry(BENCH, [row(), row(), row()])], focus, hist([{ w: 215, r: 8, done: true }]))
    tap(container.querySelector('button[aria-label="Next set"]'))
    expect(container.querySelector('.focus-ref')).toBeNull()
    expect(container.querySelector('.focus-last')).toBeTruthy()
    act(() => root.unmount()); container.remove()
    mount([entry(BENCH, [row()])], focus)
    expect(container.querySelector('.focus-lastwrap')).toBeNull()
  })
})

describe('Focus: the state of the primary action', () => {
  const state = () => complete().dataset.state
  it('ready, then done — completion is the same toggle as before', () => {
    mount([entry(BENCH, [row(), row()])], focus)
    expect(state()).toBe('ready'); expect(complete().textContent).toBe('Complete')
    tap(complete())
    expect(rows()[0].done).toBe(true)
  })
  it('a finished set shows Completed as a state', () => {
    mount([entry(BENCH, [row(true), row()])], focus)
    tap(all('.focus-dots button')[0])
    expect(state()).toBe('done'); expect(complete().textContent).toBe('Completed')
  })
  it('a set behind an earlier open one is marked locked, and still ticks as it always did', () => {
    mount([entry(BENCH, [row(), row(), row()])], focus)
    tap(all('.focus-dots button')[2])
    expect(state()).toBe('locked')
    expect(complete().disabled).toBe(false)
    tap(complete())
    expect(rows()[2].done).toBe(true)
  })
  it('a timed set: Start is the action (ready), its manual Complete is quiet; a running hold shows on both', () => {
    mount([entry(BENCH, timedRows(false, false), { target: { mode: 'time', sec: 30 } })], focus)
    const start = () => container.querySelector('.focus-timed .btn')
    expect(start().dataset.state).toBe('ready'); expect(start().textContent).toBe('Start')
    expect(state()).toBe('manual')
    tap(start())
    expect(work()).toMatchObject({ total: 30 })
    expect(start().dataset.state).toBe('running'); expect(start().textContent).toBe('Hold in progress')
    expect(state()).toBe('running')
    expect(rows()[0].done).toBe(false)
  })
  it('Start keeps its accessible name and its enablement', () => {
    mount([entry(BENCH, timedRows(false), { target: { mode: 'time', sec: 30 } })], focus)
    const start = container.querySelector('button[aria-label="Start set"]')
    expect(start.disabled).toBe(false)
  })
})

describe('media by type', () => {
  it('an exercise that is only a link is its card: no strip, nothing to expand', () => {
    const ex = { id: 'c-1', n: 'Cable thing', custom: true, bp: 'chest', eq: 'cable', tg: 'pectorals', url: 'https://www.youtube.com/watch?v=abc' }
    registerCustom([ex])
    mount([entry('c-1', [row()])], {}, { customEx: [ex] })
    expect(container.querySelector('.exlink-card')).toBeTruthy()
    expect(container.querySelector('.m1-media')).toBeNull()
    expect(container.querySelector('.giftoggle')).toBeNull()
  })
  it('an uploaded photo or clip gets the strip, and its Expand', () => {
    const ref = (kind, mime) => ({ kind, mime, hash: 'a'.repeat(64), size: 1000, width: 640, height: 480, ...(kind === 'video' ? { dur: 90, codec: 'avc1' } : {}) })
    for (const [kind, mime] of [['image', 'image/jpeg'], ['video', 'video/mp4']]) {
      const ex = { id: 'c-1', n: 'Mine', custom: true, bp: 'chest', eq: 'cable', tg: 'pectorals', media: ref(kind, mime) }
      registerCustom([ex])
      mount([entry('c-1', [row()])], {}, { customEx: [ex] })
      expect(container.querySelector('.m1-media')).toBeTruthy()
      expect(container.querySelector('.m1-media .giftoggle').textContent).toBe('Expand')
      act(() => root.unmount()); container.remove(); root = container = null
    }
  })
})

describe('Up next and Next', () => {
  it('Next Up is the line above the two nav buttons, Prev first and Next last, all in one region', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])])
    const nav = container.querySelector('.m1-nav')
    const kids = [...nav.children]
    expect(kids[0].classList.contains('m1-next-up')).toBe(true)
    const btns = [...kids[1].querySelectorAll('button')].map(b => b.textContent.trim())
    expect(btns).toEqual(['Prev', 'Next'])
  })
})

describe('translations introduced for Cards', () => {
  it('Hold in progress and the left/right actions exist in every locale, placeholders intact', async () => {
    const packs = import.meta.glob('../locales/*.js', { eager: true })
    for (const [file, mod] of Object.entries(packs)) {
      const d = mod.default
      for (const k of ['Hold in progress', 'Complete left', 'Complete right', 'Assistance ({0})']) expect(d[k], file + ' ' + k).toBeTruthy()
      expect(d['Assistance ({0})'], file).toContain('{0}')
    }
  })
})
