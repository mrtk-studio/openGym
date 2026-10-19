// @vitest-environment happy-dom
// Owner-review blockers: a past (backfill) workout never starts a live work timer, and the sets
// grid's numeric inputs and ± buttons say which set and column they belong to (EN and FR).
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
import { setLang } from '../lib/i18n.js'

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
const TIMED = { mode: 'time', sec: 30 }
const rows = (e = 0) => useStore.getState().S.active.entries[e].sets
const work = () => useUI.getState().work
const rest = () => useUI.getState().timer
const key = k => act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })) })
const startBtn = () => container.querySelector('.setgo[aria-label="Start set"]')

describe('F1: backfill never starts a live work timer', () => {
  it('live: a timed row still exposes Start set, and it still runs the work timer', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })])
    expect(startBtn()).toBeTruthy()
    tap(startBtn())
    expect(work()).toBeTruthy()
    expect(work().owner.idx).toBe(0)
  })
  it('backfill: no Start set in the grid, and nothing in Cards offers one', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })], { backfill: true })
    expect(startBtn()).toBeNull()
    expect(container.querySelector('.m1-act-go')).toBeNull()
  })
  it('backfill: the timed values stay editable and the row logs by hand, with no work or rest timer', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })], { backfill: true })
    const secs = container.querySelector('.xb-sets input[aria-label^="Seconds"], .xb-sets input[inputmode="numeric"]')
    expect(secs).toBeTruthy()
    tap(all('[role="checkbox"]')[0])
    expect(rows().map(s => s.done)).toEqual([true, false])
    expect(rows()[0].sec).toBe(30)
    expect(work()).toBeNull()
    expect(rest()).toBeNull()
  })
  it('backfill: Space / Enter ticks the next timed row instead of starting a hold', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })], { backfill: true })
    key('Enter')
    expect(rows().map(s => s.done)).toEqual([true, false])
    expect(work()).toBeNull()
    expect(rest()).toBeNull()
  })
  it('live: Enter on a timed row still starts the hold', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })])
    key('Enter')
    expect(work()).toBeTruthy()
    expect(rows().map(s => s.done)).toEqual([false, false])
  })
  it('Focus, backfill: no Start button and no hold — the seconds are a stepper', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })], { backfill: true, workoutView: 'focus' })
    expect(container.querySelector('.focus-timed')).toBeNull()
    expect(container.querySelector('.focus-set button[aria-label="Increase seconds"]')).toBeTruthy()
    expect(work()).toBeNull()
  })
  it('Focus, live: the hold button is still there', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })], { workoutView: 'focus' })
    expect(container.querySelector('.focus-timed')).toBeTruthy()
  })
  it('editing a saved workout is unchanged: no Start set, no timers, rows tick by hand', () => {
    mount([entry(BENCH, timedRows(false, false), { target: TIMED })], { editingWorkoutId: 'saved' })
    expect(startBtn()).toBeNull()
    tap(all('[role="checkbox"]')[0])
    expect(rows()[0].done).toBe(true)
    expect(work()).toBeNull()
    expect(rest()).toBeNull()
  })
})

describe('F3: grid fields and ± buttons say which set and column they are', () => {
  const inputs = () => all('.xb-sets .stp input')
  const labelOf = el => el.getAttribute('aria-label')
  const describedBy = btn => container.querySelector('#' + CSS.escape(btn.getAttribute('aria-describedby')))?.textContent
  afterEach(async () => { await setLang('en') })

  it('English: weight and reps inputs are named by column and set number', () => {
    mount([entry(BENCH, [row(), row()])])
    const names = inputs().map(labelOf)
    expect(names).toEqual(expect.arrayContaining(['Weight (kg), Set 1', 'Reps, Set 1', 'Weight (kg), Set 2', 'Reps, Set 2']))
    expect(names.every(Boolean)).toBe(true)
  })
  it('English: ± keep their Increase/Decrease name and are described by the same column and set', () => {
    mount([entry(BENCH, [row(), row()])])
    const inc = all('.xb-sets button[aria-label="Increase"]')
    const dec = all('.xb-sets button[aria-label="Decrease"]')
    expect(inc.length).toBeGreaterThan(0)
    expect(inc.length).toBe(dec.length)
    expect(inc.map(describedBy)).toEqual(expect.arrayContaining(['Weight (kg), Set 2', 'Reps, Set 2']))
    expect(dec.map(describedBy)).toEqual(expect.arrayContaining(['Weight (kg), Set 1']))
  })
  it('English: an assistance machine says assistance', () => {
    mount([entry(ASSISTED, [row(false, { w: 20 })], { target: { mode: 'reps', reps: 8, weight: 20 } })])
    expect(inputs().map(labelOf)).toContain('Assistance (kg), Set 1')
  })
  it('French: the same names, in French', async () => {
    await setLang('fr')
    mount([entry(BENCH, [row(), row()])])
    const names = inputs().map(labelOf)
    expect(names).toEqual(expect.arrayContaining(['Poids (kg), Série 2', 'Reps, Série 2']))
    expect(names.some(n => /\bSet\b|Weight/.test(n))).toBe(false)
    const inc = all('.xb-sets button[aria-describedby]')
    expect(inc.map(describedBy)).toEqual(expect.arrayContaining(['Poids (kg), Série 1']))
  })
  it('naming the fields changes nothing a person sees or the data', () => {
    mount([entry(BENCH, [row(), row()])])
    const hidden = all('.xb-sets .stp .vh')
    expect(hidden.length).toBeGreaterThan(0)
    tap(all('.xb-sets button[aria-label="Increase"]')[0])
    expect(rows()[0].w).toBeGreaterThan(60)
  })
})

describe('O1: the picker closes once an exercise is added to this workout', () => {
  const EXDB_ID = SQUAT
  const sheets = () => useUI.getState().sheets
  const openPicker = () => {
    tap([...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add exercise'))
    return sheets().at(-1)
  }
  const confirm = () => {
    const top = sheets().at(-1)
    const host = document.createElement('div'); document.body.appendChild(host)
    const r = createRoot(host)
    act(() => r.render(top.render(() => {})))
    const btn = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add to this workout')
    act(() => btn.click())
    act(() => r.unmount()); host.remove()
  }
  it('Add to this workout adds it once and leaves no picker open', () => {
    mount([entry(BENCH, [row()])])
    const picker = openPicker()
    act(() => picker.render(picker.close).props.onPick({ id: EXDB_ID }, false))
    expect(sheets().length).toBe(2)           // the picker, with the config sheet over it
    confirm()
    const ids = useStore.getState().S.active.entries.map(e => e.id)
    expect(ids).toEqual([BENCH, EXDB_ID])
    expect(sheets().filter(s => s.id === picker.id)).toHaveLength(0)
  })
  it('the quick + still adds and keeps the picker open for the next one', () => {
    mount([entry(BENCH, [row()])])
    const picker = openPicker()
    act(() => picker.render(picker.close).props.onPick({ id: EXDB_ID }, true))
    expect(useStore.getState().S.active.entries.map(e => e.id)).toEqual([BENCH, EXDB_ID])
    expect(sheets().filter(s => s.id === picker.id)).toHaveLength(1)
  })
})
