// @vitest-environment happy-dom
// The M1 Cards Current Action (8B.2): the open set's values and its one forward move. It is a
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
const ASSISTED = '0015', PULLUP = '3293'
const sideSet = (l, r) => sideRow(l, r)
const tap = el => { expect(el).toBeTruthy(); act(() => el.click()) }
const txt = sel => container.querySelector(sel)?.textContent
const all = sel => [...container.querySelectorAll(sel)]
const go = () => container.querySelector('.m1-act-go')
const act1 = () => container.querySelector('.m1-act')
const sheets = () => useUI.getState().sheets.length
const rest = () => { const t = useUI.getState().timer; return t && { left: t.left, forSet: t.forSet } }
const work = () => useUI.getState().work
const rows = (e = 0) => useStore.getState().S.active.entries[e].sets
const doneOf = (e = 0) => rows(e).map(s => (s.sides ? [s.done, s.sides.L.done, s.sides.R.done] : s.done))
const stepper = label => container.querySelector('.m1-act button[aria-label="' + label + '"]')
const fv = i => all('.m1-act-fv')[i]?.textContent

describe('ordinary sets', () => {
  it('shows the open row’s load and reps and one big Complete set', () => {
    mount([entry(BENCH, [row(true), row(), row()])])
    expect(go().textContent).toBe('Complete set')
    expect(fv(0)).toBe('60'); expect(fv(1)).toBe('8')
    expect(all('.m1-act-fl').map(n => n.textContent)).toEqual(['Weight (kg)', 'Reps'])
  })

  it('delegates to the check’s toggle: the row is done, the exercise’s rest starts, with the tick feedback', () => {
    mount([entry(BENCH, [row(), row(), row()])])
    tap(go())
    expect(doneOf()).toEqual([true, false, false])
    expect(rest()).toEqual({ left: 90, forSet: 0 })
    expect(vi.mocked(beep).mock.calls.length).toBe(1)
  })

  it('moves forward and never becomes an Undo: the next tap completes the next set, the first stays done', () => {
    mount([entry(BENCH, [row(), row(), row()])])
    tap(go())
    expect(txt('.m1-cur-val')).toContain('Set 2 / 3')
    expect(go().textContent).toBe('Complete set')
    tap(go())
    expect(doneOf()).toEqual([true, true, false])
    tap(go()); expect(doneOf()).toEqual([true, true, true])
  })

  it('the grid keeps the way back: unticking a done set there makes it the open one again', () => {
    mount([entry(BENCH, [row(), row()])])
    tap(go())
    tap(all('[role="checkbox"]')[0])
    expect(doneOf()).toEqual([false, false])
    expect(txt('.m1-cur-val')).toContain('Set 1 / 2')
  })

  it('its steppers edit the same row the grid shows — one value, two views', () => {
    mount([entry(BENCH, [row(), row()])])
    tap(stepper('Increase: Reps'))
    expect(rows()[0].r).toBe(9)
    expect(fv(1)).toBe('9')
    expect(container.querySelector('.setrow .stp.r input').value).toBe('9')
    tap(stepper('Decrease: Weight (kg)'))
    expect(rows()[0].w).toBeLessThan(60)
    expect(fv(0)).toBe(String(rows()[0].w))
  })

  it('steppers switched off in the profile: the values show, with no steppers', () => {
    mount([entry(BENCH, [row()])], {}, { wc: { steppers: false } })
    expect(all('.m1-act-b')).toHaveLength(0)
    expect(fv(0)).toBe('60')
  })

  it('a warm-up is a warm-up, completed the same way', () => {
    mount([entry(BENCH, [row(false, { phase: 'warmup' }), row(), row()])])
    expect(txt('.m1-cur-val')).toBe('Warm-up')
    tap(go())
    expect(doneOf()).toEqual([true, false, false])
    expect(txt('.m1-cur-val')).toContain('Set 1 / 2')
  })

  it('a bodyweight exercise names the load as added weight', () => {
    mount([entry(PULLUP, [row(false, { w: 0 }), row(false, { w: 0 })], { target: { mode: 'reps', reps: 8, weight: 0 } })])
    expect(all('.m1-act-fl')[0].textContent).toMatch(/^Added/)
    expect(fv(0)).toBe('0')
  })

  it('an assistance machine names the load as assistance, not as added weight', () => {
    mount([entry(ASSISTED, [row(false, { w: 20 })], { target: { mode: 'reps', reps: 8, weight: 20 } })])
    expect(all('.m1-act-fl')[0].textContent).toMatch(/^Assistance/)
    expect(fv(0)).toBe('20')
  })

  it('a pyramid row is an ordinary row to act on, and earns its own rest', () => {
    const target = { mode: 'reps', reps: 8, weight: 60, pyramid: [12, 10, 8], pyramidRest: [60, 75, 120] }
    mount([entry(BENCH, [row(), row(), row()], { target })])
    tap(go())
    expect(rest()).toMatchObject({ left: 60, forSet: 0 })
  })
})

describe('effort / RIR', () => {
  it('stays on the row, and the Current Action carries a chip that opens the same picker', () => {
    mount([entry(BENCH, [row(), row()])], {}, { effort: 'rir' })
    expect(container.querySelector('.setrow .effcell')).toBeTruthy()
    const chip = container.querySelector('.m1-act-eff')
    expect(chip.textContent).toBe('RIR')
    tap(chip)
    expect(sheets()).toBe(1)
  })
  it('shows a logged rating on the chip', () => {
    mount([entry(BENCH, [row(false, { rir: 2 }), row()])], {}, { effort: 'rir' })
    expect(txt('.m1-act-eff')).toBe('RIR 2')
  })
  it('no chip when the profile logs no effort', () => {
    mount([entry(BENCH, [row()])])
    expect(container.querySelector('.m1-act-eff')).toBeNull()
  })
})

describe('special rows keep their structure in the grid', () => {
  it('a drop set: the row is summarised, not flattened into steppers, and completes as one row', () => {
    mount([entry(BENCH, [row(false, { type: 'dropset', drops: [{ w: 40, r: 6 }, { w: 30, r: 6 }] }), row()])])
    expect(container.querySelector('.m1-act-st')).toBeNull()
    expect(txt('.m1-act-sum')).toContain('60×8')
    expect(all('.subrow')).toHaveLength(2)
    tap(go())
    expect(doneOf()[0]).toBe(true)
    expect(rest()).toMatchObject({ left: 90, forSet: 0 })
  })
  it('a rest-pause row: the same', () => {
    mount([entry(BENCH, [row(false, { type: 'restpause', clusters: [{ r: 3, restSec: 15 }] }), row()])])
    expect(container.querySelector('.m1-act-st')).toBeNull()
    expect(txt('.m1-act-sum')).toBeTruthy()
    tap(go())
    expect(doneOf()[0]).toBe(true)
  })
})

describe('cardio', () => {
  const cardio = () => ({ id: CARDIO, target: { mode: 'cardio', min: 20, speed: 8 }, sets: [{ min: 20, speed: 8, done: false }] })
  it('talks minutes, not reps or sets, and completes through the same tick', () => {
    mount([cardio(), entry(BENCH, [row()])])
    expect(all('.m1-act-fl').map(n => n.textContent)).toEqual(['Duration (min)'])
    expect(go().textContent).toBe('Complete')
    expect(txt('.m1-cur-val')).toBe('Cardio')
    tap(stepper('Increase: Duration (min)'))
    expect(rows()[0].min).toBe(21)
    tap(go())
    expect(doneOf()).toEqual([true])
    expect(useUI.getState().toastMsg).toBe('Cardio logged')
  })
})

describe('timed sets', () => {
  it('say Start set, which starts the work timer and does not complete the set', () => {
    mount([entry(BENCH, timedRows(false, false), { target: { mode: 'time', sec: 30 } }), entry(SQUAT, [row()])])
    expect(go().textContent).toBe('Start set')
    expect(all('.m1-act-fl').map(n => n.textContent)).toEqual(['Seconds'])
    tap(go())
    expect(doneOf()).toEqual([false, false])
    expect(work()).toMatchObject({ total: 30 })
    expect(work().owner).toMatchObject({ idx: 0, i: 0 })
    expect(rest()).toBeNull()
    expect(go().disabled).toBe(true)
  })

  it('the hold finishing completes the row through the normal path and the action moves to the next set', () => {
    mount([entry(BENCH, timedRows(false, false), { target: { mode: 'time', sec: 30 } }), entry(SQUAT, [row()])])
    tap(go())
    act(() => { vi.advanceTimersByTime(31000) })
    expect(doneOf()).toEqual([true, false])
    expect(work()).toBeNull()
    expect(txt('.m1-cur-val')).toContain('Set 2 / 2')
    expect(go().textContent).toBe('Start set')
    expect(go().disabled).toBe(false)
  })

  it('a timed left/right pair: Start set for the left, then the right — one set number', () => {
    mount([entry(BENCH, pair(false, false), { target: { mode: 'time', sec: 30, side: true } }), entry(SQUAT, [row()])])
    expect(txt('.m1-cur-val')).toContain('Set 1 / 1')
    expect(txt('.m1-cur-side')).toContain('Left')
    tap(go())
    act(() => { vi.advanceTimersByTime(31000) })
    expect(doneOf()).toEqual([true, false])
    expect(txt('.m1-cur-side')).toContain('Right')
    expect(go().textContent).toBe('Start set')
    expect(rest()).toMatchObject({ forSet: 0 })
    expect(useUI.getState().timer.kind).toBe('switch')
  })
})

describe('per side: one side at a time, left then right', () => {
  const side = { mode: 'reps', reps: 8, weight: 15, side: true }
  it('Complete left, then Complete right — never both in one tap', () => {
    mount([entry(BENCH, [sideSet(false, false), sideSet(false, false)], { target: side })])
    expect(go().textContent).toBe('Complete left')
    expect(txt('.m1-cur-side')).toContain('Left')
    tap(go())
    expect(doneOf()[0]).toEqual([false, true, false])
    expect(go().textContent).toBe('Complete right')
    expect(txt('.m1-cur-side')).toContain('Right')
    tap(go())
    expect(doneOf()[0]).toEqual([true, true, true])
    expect(go().textContent).toBe('Complete left')
    expect(txt('.m1-cur-val')).toContain('Set 2 / 2')
  })
  it('edits the open side’s own numbers', () => {
    mount([entry(BENCH, [sideSet(true, false)], { target: side })])
    tap(stepper('Increase: Reps'))
    expect(rows()[0].sides.R.r).toBe(9)
    expect(rows()[0].sides.L.r).toBe(8)
  })
})

describe('the closing set and the end of the exercise', () => {
  it('the closing set completes through the same flow: no rest, the finish prompt opens', () => {
    mount([entry(BENCH, [row()])])
    tap(go())
    expect(rest()).toBeNull()
    expect(sheets()).toBe(1)
    expect(act1()).toBeNull()
  })
  it('a finished marked exercise offers no action on its card — the strip says where the work is', () => {
    mount([entry(BENCH, [row(true)]), entry(SQUAT, [row()])])
    expect(act1()).toBeNull()
    expect(container.querySelector('.m1-cur').dataset.kind).toBe('elsewhere')
  })
  it('finishing an exercise leaves no giant Undo behind: no action until the work is back in view', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])])
    tap(go())
    expect(act1()).toBeNull()
    expect(doneOf()).toEqual([true])
    tap(all('button').find(b => b.textContent.trim() === 'Next'))
    expect(go().textContent).toBe('Complete set')
  })
  it('in a superset only the member whose turn it is carries the action', () => {
    mount([entry(BENCH, [row(), row()], { sg: 's' }), entry(SQUAT, [row(), row()], { sg: 's' })])
    expect(all('.m1-act')).toHaveLength(1)
    tap(go())
    expect(all('.m1-act')).toHaveLength(1)
    expect(useStore.getState().S.active.cur).toBe(1)
    expect(txt('.m1-act-fv')).toBeTruthy()
  })
})

describe('editing and backfill', () => {
  it('editing a saved workout keeps to the rows: no Current Action, and the grid still ticks with no side effects', () => {
    mount([entry(BENCH, [row(), row()])], { editingWorkoutId: 'saved' })
    expect(act1()).toBeNull()
    expect(container.querySelector('.m1-cur')).toBeTruthy()
    tap(all('[role="checkbox"]')[0])
    expect(doneOf()).toEqual([true, false])
    expect(rest()).toBeNull(); expect(sheets()).toBe(0)
  })
  it('backfill uses the existing completion: no rest, no live-clock language', () => {
    mount([entry(BENCH, [row(), row()])], { backfill: true })
    tap(go())
    expect(doneOf()).toEqual([true, false])
    expect(rest()).toBeNull()
    expect(container.textContent).not.toMatch(/Resume|Rest timer/)
  })
  it('backfill never offers Start set — a hold would imply a real-time clock — and falls back to the rows', () => {
    mount([entry(BENCH, timedRows(false), { target: { mode: 'time', sec: 30 } })], { backfill: true })
    expect(act1()).toBeNull()
    expect(container.querySelector('.m1-act-go')).toBeNull()
    tap(all('[role="checkbox"]')[0])
    expect(doneOf()).toEqual([true])
  })
})

describe('other views are unchanged', () => {
  for (const view of ['list', 'compact', 'focus']) {
    it(view + ' has no Current Action', () => {
      mount([entry(BENCH, [row()]), entry(SQUAT, [row()])], { workoutView: view })
      expect(act1()).toBeNull()
    })
  }
})

describe('the media strip', () => {
  it('starts compact, expands, and collapses — without touching the profile or the session', () => {
    mount([entry(BENCH, [row()])])
    const box = () => container.querySelector('.m1-media')
    const tog = () => container.querySelector('.m1-media .giftoggle')
    expect(box()).toBeTruthy()
    expect(box().classList.contains('open')).toBe(false)
    expect(tog().textContent).toBe('Expand'); expect(tog().getAttribute('aria-expanded')).toBe('false')
    const before = JSON.stringify(useStore.getState().S)
    tap(tog())
    expect(box().classList.contains('open')).toBe(true)
    expect(tog().textContent).toBe('Minimize'); expect(tog().getAttribute('aria-expanded')).toBe('true')
    tap(tog())
    expect(box().classList.contains('open')).toBe(false)
    expect(JSON.stringify(useStore.getState().S)).toBe(before)
    expect(useStore.getState().S.gifSize).toBe('full')
  })
  it('keeps the full media reachable: the media element is there in both states', () => {
    mount([entry(BENCH, [row()])])
    expect(container.querySelector('.m1-media .exmedia')).toBeTruthy()
    tap(container.querySelector('.m1-media .giftoggle'))
    expect(container.querySelector('.m1-media.open .exmedia')).toBeTruthy()
  })
  it('an exercise with no media has no strip and no toggle', () => {
    mount([entry('c-1', [row()])], {}, { customEx: [{ id: 'c-1', n: 'Cable thing', custom: true, bp: 'chest', eq: 'cable', tg: 'pectorals' }] })
    expect(container.querySelector('.m1-media')).toBeNull()
    expect(container.querySelector('.giftoggle')).toBeNull()
  })
  it('the Animations setting still decides: Small is the thumbnail, Off is nothing', () => {
    mount([entry(BENCH, [row()])], {}, { gifSize: 'mini' })
    expect(container.querySelector('.m1-media')).toBeNull()
    act(() => root.unmount()); container.remove()
    mount([entry(BENCH, [row()])], {}, { gifSize: 'off' })
    expect(container.querySelector('.m1-media')).toBeNull()
    expect(container.querySelector('.exmedia')).toBeNull()
  })
})

describe('one footer', () => {
  it('Next Up, Prev and Next sit in one region and keep their behaviour', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])])
    const nav = container.querySelector('.m1-nav')
    expect(nav.querySelector('.m1-next-up')).toBeTruthy()
    const labels = [...nav.querySelectorAll('button')].map(b => b.textContent.trim())
    expect(labels).toContain('Prev'); expect(labels).toContain('Next')
    tap([...nav.querySelectorAll('button')].find(b => b.textContent.trim() === 'Next'))
    expect(useStore.getState().S.active.cur).toBe(1)
  })
})
