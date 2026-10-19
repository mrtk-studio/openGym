// @vitest-environment happy-dom
// What a set's completion does today, per kind of set and per kind of session — the contract the
// M1 workout presentation (a larger Complete action in Cards and Focus) must delegate to rather
// than reinterpret. Real store, real rest/work timer; only sound is stubbed.
//
// Which control completes what (read from the rows below):
//   an ordinary row, a warm-up, a drop set, a rest-pause row, a pyramid row, cardio, and a timed set
//   ticked by hand          →  the row's check (role="checkbox") → toggle(idx, i)
//   one side of a per-side row   →  that side's check → toggle(idx, i, 'L'|'R'); the row is done
//                                  only when both sides are
//   a timed set (and each row of a timed L/R pair)   →  "Start set" → startTimed: a work timer that
//                                  ticks the set itself when the hold ends; the check stays for a
//                                  hold timed on a watch, and then behaves like an ordinary row
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Workout, { removeActiveExercise } from './Workout.jsx'
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
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear()
  vi.mocked(beep).mockClear(); vi.mocked(vibrate).mockClear()
  useUI.setState({ sheets: [], toastMsg: '', timer: null, work: null })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove(); root = container = null
  useUI.getState().stopRest(); useUI.getState().stopWork()
  vi.clearAllTimers(); vi.useRealTimers()
})

const checks = () => [...container.querySelectorAll('[role="checkbox"]')]
const startSet = () => container.querySelector('button[aria-label="Start set"]')
const tap = el => { expect(el).toBeTruthy(); act(() => el.click()) }
const doneOf = (e = 0) => useStore.getState().S.active.entries[e].sets.map(s => (s.sides ? [s.done, s.sides.L.done, s.sides.R.done] : s.done))
const rest = () => { const t = useUI.getState().timer; return t && { left: t.left, forIdx: t.forIdx, forSet: t.forSet, kind: t.kind } }
const work = () => useUI.getState().work
const sheets = () => useUI.getState().sheets.length
const feedback = () => ({ beep: vi.mocked(beep).mock.calls.length, vibrate: vi.mocked(vibrate).mock.calls.length })

describe('completion by kind of set — the check is the one door for everything but a started hold', () => {
  it('an ordinary work set: done, then the exercise’s rest, with the tick feedback', () => {
    mount([entry(BENCH, [row(), row(), row()])])
    tap(checks()[0])
    expect(doneOf()).toEqual([true, false, false])
    expect(rest()).toEqual({ left: 90, forIdx: 0, forSet: 0, kind: undefined })
    expect(work()).toBeNull()
    expect(feedback()).toEqual({ beep: 1, vibrate: 1 })
  })

  it('a ramp warm-up rests its own shorter rest; the last ramp set, into work, gets the working rest', () => {
    const target = { mode: 'reps', reps: 8, weight: 60, warmupRestSec: 30 }
    mount([entry(BENCH, [row(false, { phase: 'warmup' }), row(false, { phase: 'warmup' }), row(), row()], { target })])
    tap(checks()[0])
    expect(rest()).toMatchObject({ left: 30, forSet: 0 })
    tap(checks()[1])
    expect(rest()).toMatchObject({ left: 90, forSet: 1 })
  })

  it('a drop set is one row: ticking it completes the whole row, and the rest comes after it, not between drops', () => {
    mount([entry(BENCH, [row(false, { type: 'dropset', drops: [{ w: 40, r: 6 }, { w: 30, r: 6 }] }), row()])])
    tap(checks()[0])
    expect(doneOf()[0]).toBe(true)
    expect(rest()).toMatchObject({ left: 90, forSet: 0 })
  })

  it('a rest-pause row is one row too: the bursts’ short rests are part of the row, not of the tick', () => {
    mount([entry(BENCH, [row(false, { type: 'restpause', clusters: [{ r: 3, restSec: 15 }] }), row()])])
    tap(checks()[0])
    expect(doneOf()[0]).toBe(true)
    expect(rest()).toMatchObject({ left: 90, forSet: 0 })
  })

  it('a pyramid row earns its own rest in place of the exercise’s', () => {
    const target = { mode: 'reps', reps: 8, weight: 60, pyramid: [12, 10, 8], pyramidRest: [60, 75, 120] }
    mount([entry(BENCH, [row(), row(), row()], { target })])
    tap(checks()[0])
    expect(rest()).toMatchObject({ left: 60, forSet: 0 })
    tap(checks()[1])
    expect(rest()).toMatchObject({ left: 75, forSet: 1 })
  })

  it('a timed set ticked by hand behaves like an ordinary row — rest, feedback, no work timer', () => {
    mount([entry(BENCH, timedRows(false, false), { target: { mode: 'time', sec: 30 } })])
    expect(startSet()).toBeTruthy()
    tap(checks()[0])
    expect(doneOf()[0]).toBe(true)
    expect(rest()).toMatchObject({ left: 90, forSet: 0 })
    expect(work()).toBeNull()
  })

  it('a timed set STARTED with Start set is not completed by the tap: it starts the work timer, with no rest and no tick feedback', () => {
    mount([entry(BENCH, timedRows(false, false), { target: { mode: 'time', sec: 30 } })])
    tap(startSet())
    expect(doneOf()).toEqual([false, false])
    expect(work()).toMatchObject({ total: 30, label: expect.any(String) })
    expect(work().owner).toMatchObject({ idx: 0, i: 0 })
    expect(rest()).toBeNull()
    expect(feedback()).toEqual({ beep: 0, vibrate: 0 })
  })

  it('cardio ticks like a row: "Cardio logged", and rest only if something is left to do afterwards', () => {
    const cardio = { id: CARDIO, target: { mode: 'cardio', min: 20, speed: 8 }, sets: [{ min: 20, speed: 8, done: false }] }
    mount([cardio, entry(BENCH, [row()])])
    tap(checks()[0])
    expect(doneOf(0)).toEqual([true])
    expect(useUI.getState().toastMsg).toBe('Cardio logged')
    expect(rest()).toMatchObject({ left: 90 })
  })

  it('the closing set of the session rests nothing and opens the finish prompt', () => {
    mount([entry(BENCH, [row()])])
    tap(checks()[0])
    expect(rest()).toBeNull()
    expect(sheets()).toBe(1)
  })

  it('the closing cardio block does the same', () => {
    mount([{ id: CARDIO, target: { mode: 'cardio', min: 20, speed: 8 }, sets: [{ min: 20, speed: 8, done: false }] }])
    tap(checks()[0])
    expect(rest()).toBeNull(); expect(sheets()).toBe(1)
  })
})

describe('completion of a per-side row — two checks, one row', () => {
  it('shows one check per side, and the left tick alone neither completes the row nor rests nor sounds', () => {
    mount([entry(BENCH, [sideRow(false, false), sideRow(false, false)], { target: perSide })])
    expect(checks()).toHaveLength(4)
    tap(checks()[0])
    expect(doneOf()[0]).toEqual([false, true, false])
    expect(rest()).toBeNull()
    expect(feedback()).toEqual({ beep: 0, vibrate: 0 })
  })

  it('a partially completed row stays open; the other side finishes it, and only then the rest and the feedback', () => {
    mount([entry(BENCH, [sideRow(true, false), sideRow(false, false)], { target: perSide })])
    expect(doneOf()[0]).toEqual([false, true, false])
    tap(checks()[1])
    expect(doneOf()[0]).toEqual([true, true, true])
    expect(rest()).toMatchObject({ left: 90, forSet: 0 })
    expect(feedback()).toEqual({ beep: 1, vibrate: 1 })
  })

  it('unticking a side reopens the row', () => {
    mount([entry(BENCH, [sideRow(true, true), sideRow(false, false)], { target: perSide })])
    tap(checks()[0])
    expect(doneOf()[0]).toEqual([false, false, true])
  })
})

describe('completion of a timed L/R pair — two rows that are one set', () => {
  const target = { mode: 'time', sec: 30, side: true }

  it('Start set is on each row and starts that row’s hold', () => {
    mount([entry(BENCH, pair(false, false, false, false), { target })])
    tap(startSet())
    expect(work().owner).toMatchObject({ idx: 0, i: 0 })
    expect(doneOf()).toEqual([false, false, false, false])
  })

  it('ticking the L row by hand starts a short "switch sides" pause, not the set’s rest', () => {
    mount([entry(BENCH, pair(false, false, false, false), { target })])
    tap(checks()[0])
    expect(rest()).toMatchObject({ left: 10, kind: 'switch', forSet: 0 })
  })

  it('ticking the R row, with L done, is the set done: the full rest', () => {
    mount([entry(BENCH, pair(true, false, false, false), { target })])
    tap(checks()[1])
    expect(rest()).toMatchObject({ left: 90, forSet: 1 })
    expect(rest().kind).toBeUndefined()
  })
})

describe('the three session kinds — what completion keeps and drops', () => {
  it('live: rest, tick feedback, and the finish prompt on the closing set', () => {
    mount([entry(BENCH, [row(), row()])])
    tap(checks()[0])
    expect(rest()).not.toBeNull(); expect(feedback().beep).toBe(1)
  })

  it('editing a saved workout: the tick records and nothing else — no rest, no sound or buzz, no finish prompt, no cardio toast', () => {
    mount([entry(BENCH, [row()])], { editingWorkoutId: 'saved' })
    tap(checks()[0])
    expect(doneOf()).toEqual([true])
    expect(rest()).toBeNull(); expect(work()).toBeNull()
    expect(feedback()).toEqual({ beep: 0, vibrate: 0 })
    expect(sheets()).toBe(0)
    expect(useUI.getState().toastMsg).toBe('')
  })

  it('editing in Focus: Complete set only ticks — closing an exercise does not hand the marker on', () => {
    mount([entry(BENCH, [row(), row()]), entry(SQUAT, [row()])], { editingWorkoutId: 'saved', workoutView: 'focus' })
    tap(container.querySelector('button[aria-label="Complete set"]'))
    tap(container.querySelector('button[aria-label="Complete set"]'))
    expect(doneOf()).toEqual([true, true])
    expect(useStore.getState().S.active.cur).toBe(0)
  })

  it('editing has no Start set on a timed row: the hold cannot be started, only ticked', () => {
    mount([entry(BENCH, timedRows(false), { target: { mode: 'time', sec: 30 } })], { editingWorkoutId: 'saved' })
    expect(startSet()).toBeNull()
  })

  it('backfill: no rest timer, but the tick still sounds', () => {
    mount([entry(BENCH, [row(), row()])], { backfill: true })
    tap(checks()[0])
    expect(rest()).toBeNull()
    expect(feedback()).toEqual({ beep: 1, vibrate: 1 })
  })

  it('backfill: the closing set still opens the finish prompt, with no rest', () => {
    mount([entry(BENCH, [row()])], { backfill: true })
    tap(checks()[0])
    expect(sheets()).toBe(1)
    expect(rest()).toBeNull()
  })
})

describe('the header and menus per session kind — what a presentation must render without changing', () => {
  const header = () => container.querySelector('.whdr-bar')
  const label = b => b.getAttribute('aria-label')

  it('live: Minimize and Finish, with the running clock and the set count', () => {
    mount([entry(BENCH, [row(), row()])])
    expect(header().querySelector('button[aria-label="Minimize"]')).toBeTruthy()
    expect(header().querySelector('.whdr-finish').textContent).toBe('Finish')
    expect(header().querySelector('.whdr-mid .sub').textContent).toMatch(/^\d+:\d{2} · 0\/2 sets$/)
  })

  it('editing: Close editor and Save, with the date instead of a clock, and the editing line', () => {
    mount([entry(BENCH, [row(), row()])], { editingWorkoutId: 'saved', d: '2026-03-01' })
    expect(header().querySelector('button[aria-label="Close editor"]')).toBeTruthy()
    expect(header().querySelector('button[aria-label="Minimize"]')).toBeNull()
    expect(header().querySelector('.whdr-finish').textContent).toBe('Save')
    expect(header().querySelector('.whdr-mid .sub').textContent).not.toMatch(/^\d+:\d{2}/)
    expect(container.textContent).toContain('Editing a saved workout')
  })

  it('backfill: Minimize and Finish, the date instead of a clock, and the no-timers line', () => {
    mount([entry(BENCH, [row(), row()])], { backfill: true, d: '2026-03-01' })
    expect(header().querySelector('button[aria-label="Minimize"]')).toBeTruthy()
    expect(header().querySelector('.whdr-finish').textContent).toBe('Finish')
    expect(header().querySelector('.whdr-mid .sub').textContent).not.toMatch(/^\d+:\d{2}/)
    expect(container.textContent).toContain('Logging a past workout, so no rest timers.')
  })
})

// Focus already has the large Complete action a Cards redesign wants. It is not a second
// completion: it is toggle(), reached through a small wrapper (FocusView complete()) that differs
// from the Cards row in exactly one way — a per-side row is finished on both sides in one tap.
describe('Focus: its Complete set is the same toggle, with a set pointer of its own', () => {
  const focus = { workoutView: 'focus' }
  const completeBtn = () => container.querySelector('button[aria-label="Complete set"]')
  const dots = () => [...container.querySelectorAll('.focus-dots button')]
  const activeDot = () => dots().findIndex(d => d.classList.contains('active'))

  it('starts on the first open set, whatever Cards would show', () => {
    mount([entry(BENCH, [row(true), row(true), row(), row()])], focus)
    expect(activeDot()).toBe(2)
    expect(container.querySelector('[data-testid="focus-set"]').className).not.toContain('complete')
  })

  it('Complete set ticks that set exactly as the Cards check does: done, the exercise’s rest, tick feedback', () => {
    mount([entry(BENCH, [row(), row(), row()])], focus)
    tap(completeBtn())
    expect(doneOf()).toEqual([true, false, false])
    expect(rest()).toEqual({ left: 90, forIdx: 0, forSet: 0, kind: undefined })
    expect(feedback()).toEqual({ beep: 1, vibrate: 1 })
  })

  it('then moves its pointer to the next set of the exercise', () => {
    mount([entry(BENCH, [row(), row(), row()])], focus)
    tap(completeBtn())
    expect(activeDot()).toBe(1)
  })

  it('on the closing set of an exercise it hands the marker to the next unfinished exercise', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])], focus)
    tap(completeBtn())
    expect(useStore.getState().S.active.cur).toBe(1)
  })

  it('a per-side row is finished on BOTH sides by one tap — one beep and one rest, at the end, not per side', () => {
    mount([entry(BENCH, [sideRow(false, false), sideRow(false, false)], { target: perSide })], focus)
    tap(completeBtn())
    expect(doneOf()[0]).toEqual([true, true, true])
    expect(rest()).toMatchObject({ left: 90, forSet: 0 })
    expect(feedback()).toEqual({ beep: 1, vibrate: 1 })
  })

  it('a half-done per-side row only gets the side that is missing', () => {
    mount([entry(BENCH, [sideRow(true, false), sideRow(false, false)], { target: perSide })], focus)
    tap(completeBtn())
    expect(doneOf()[0]).toEqual([true, true, true])
  })

  it('a timed set has a separate Start (the hold) beside Complete set (a hold timed by hand)', () => {
    mount([entry(BENCH, timedRows(false, false), { target: { mode: 'time', sec: 30 } })], focus)
    tap(startSet())
    expect(work()).not.toBeNull(); expect(doneOf()).toEqual([false, false]); expect(rest()).toBeNull()
  })

  it('the same button un-ticks a finished set: it reads Completed, and a second tap reopens it', () => {
    mount([entry(BENCH, [row(), row()])], focus)
    tap(completeBtn())
    act(() => { container.querySelector('.focus-dots button').click() })
    expect(completeBtn().textContent).toBe('Completed')
    tap(completeBtn())
    expect(doneOf()[0]).toBe(false)
  })

  it('a later set can be viewed but is locked for editing; Complete set is not disabled on it (existing behaviour)', () => {
    mount([entry(BENCH, [row(), row(), row()])], focus)
    act(() => { dots()[2].click() })
    expect(container.querySelector('[data-testid="focus-set"]').className).toContain('locked')
    expect(completeBtn().disabled).toBe(false)
  })

  it('shows only the date of last time — no per-set history', () => {
    mount([entry(BENCH, [row()])], focus, { workouts: [{ id: 'w', d: '2026-03-01', start: 1, entries: [{ id: BENCH, target: { mode: 'reps' }, sets: [{ w: 100, r: 5, done: true }] }] }] })
    expect(container.querySelector('.focus-last').textContent).toContain('Last time')
    expect(container.querySelector('.focus-last').textContent).not.toContain('100')
  })
})

describe('Cards: moving between exercises, and the final one', () => {
  const nextBtn = () => [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Next')
  const prevBtn = () => [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Prev')
  const cur = () => useStore.getState().S.active.cur

  it('Next goes to the next unit in order and is disabled on the final exercise; Prev mirrors it', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()]), entry('1013', [row()])])
    expect(prevBtn().disabled).toBe(true)
    tap(nextBtn()); expect(cur()).toBe(1)
    tap(nextBtn()); expect(cur()).toBe(2)
    expect(nextBtn().disabled).toBe(true)
    tap(prevBtn()); expect(cur()).toBe(1)
  })

  it('from inside a superset, Next leaves the whole superset', () => {
    mount([entry(BENCH, [row()], { sg: 's' }), entry(SQUAT, [row()], { sg: 's' }), entry('1013', [row()])])
    tap(nextBtn())
    expect(cur()).toBe(2)
  })

  it('removing an exercise keeps the one pointer valid: it follows an exercise that moved up, and clamps off the end', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()]), entry('1013', [row()])], { cur: 2 })
    act(() => removeActiveExercise(0))
    expect(cur()).toBe(1)
    expect(useStore.getState().S.active.entries.map(e => e.id)).toEqual([SQUAT, '1013'])
    act(() => removeActiveExercise(1))
    expect(cur()).toBe(0)
  })

  it('removing the marked exercise leaves the marker on whatever slid into its place', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()]), entry('1013', [row()])], { cur: 1 })
    act(() => removeActiveExercise(1))
    expect(cur()).toBe(1)
    expect(useStore.getState().S.active.entries[cur()].id).toBe('1013')
  })
})

// Mark all sets done (backfill only, ticks every row, stamps the top weight, opens the finish prompt)
// and its absence from a live session are already pinned in Workout.test.jsx
// ('mark all sets done while logging a past workout').

// Gesture compatibility. The gesture suites (Workout.swipe, SwipeCards, SwipeRow.*) already pin
// the behaviour; these pin only the DOM relationships a wrapper added by the redesign would
// otherwise put at risk: what lives inside the pager surface, and what each swipe row contains.
describe('the structure the gestures hang on', () => {
  it('Cards: the exercise lives inside the pager’s card, so a horizontal swipe on it turns the card', () => {
    mount([entry(BENCH, [row(), row()]), entry(SQUAT, [row()])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')
    expect(surface).toBeTruthy()
    expect(surface.querySelector('.workout-swipe-card .setrow')).toBeTruthy()
  })

  it('every set row is the front of a swipe row (data-swipe-ignore keeps the pager out of it), with its check inside the row', () => {
    mount([entry(BENCH, [row(), row()])])
    const rows = [...container.querySelectorAll('.setrow')]
    expect(rows).toHaveLength(2)
    rows.forEach(r => {
      expect(r.closest('.swfront')).toBeTruthy()
      expect(r.closest('.swrow')?.hasAttribute('data-swipe-ignore')).toBe(true)
      expect(r.querySelector('[role="checkbox"]')).toBeTruthy()
    })
  })

  it('a timed L/R pair is one swipe row around both of its set rows', () => {
    mount([entry(BENCH, pair(false, false), { target: { mode: 'time', sec: 30, side: true } })])
    expect(container.querySelectorAll('.swrow')).toHaveLength(1)
    expect(container.querySelector('.swrow').querySelectorAll('.setrow')).toHaveLength(2)
  })

  it('Prev and Next are plain buttons outside the pager surface; the exercise chips are a labelled, horizontally scrolling strip', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])])
    const surface = container.querySelector('[data-testid="workout-swipe-surface"]')
    const next = [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Next')
    expect(next).toBeTruthy(); expect(surface.contains(next)).toBe(false)
    const strip = container.querySelector('nav.wchips')
    expect(strip.getAttribute('aria-label')).toBe('Exercises in this workout')
    expect(strip.classList.contains('chips')).toBe(true)
  })

  it('List mode has no pager and no Prev/Next, and keeps its swipe rows', () => {
    mount([entry(BENCH, [row()]), entry(SQUAT, [row()])], { workoutView: 'list' })
    expect(container.querySelector('[data-testid="workout-swipe-surface"]')).toBeNull()
    expect([...container.querySelectorAll('button')].some(b => b.textContent.trim() === 'Next')).toBe(false)
    expect(container.querySelectorAll('.swrow').length).toBe(2)
    expect(container.querySelector('[data-testid="workout-list"]')).toBeTruthy()
  })
})
