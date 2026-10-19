// @vitest-environment happy-dom
// What sits under the command center (M1 Phase 6.5): one quiet group of rows, reduced per state.
// Behaviour is unchanged — only what shows where.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { bwSheet, goalSheet, weighInsSheet, calendarSheet } from '../sheets.jsx'
import { todayISO } from '../lib/format.js'
import Home from './Home.jsx'

const nav = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '', weighInsSheet: vi.fn(),
}))

const WD = new Date().getDay()
const routines = [{ id: 'r1', name: 'Push', emoji: null, ex: [{ id: '1029', sets: 3, reps: 8 }] }]
const wk = (d, extra = {}) => ({ id: 'w' + d, d, start: 1, end: 2, routineIds: ['r1'], routineId: 'r1', name: 'Push', entries: [], ...extra })

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  nav.mockClear(); bwSheet.mockClear(); goalSheet.mockClear(); weighInsSheet.mockClear(); calendarSheet.mockClear()
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const setS = (over = {}) => useStore.setState(s => ({
  S: { ...s.S, routines, week: { [WD]: ['r1'] }, dayPlan: {}, workouts: [], bodyweight: [], active: null, queue: null, rotation: null, scheduleMode: null, weighIn: false, ...over },
  user: null,
}))
const mount = () => act(() => root.render(<Home />))
const group = () => host.querySelector('.m1-group')
const button = s => [...host.querySelectorAll('button')].find(b => b.textContent.includes(s))

describe('Today — the supporting group', () => {
  it('is one grouped surface, not a stack of cards', () => {
    setS(); mount()
    expect(host.querySelectorAll('.today-secondary .card')).toHaveLength(0)
    expect(group().querySelector('.m1-g-week')).not.toBeNull()
  })

  it('body weight is a compact row without the chart, and keeps Log, Goal and All weigh-ins', () => {
    setS({ weighIn: undefined, bodyweight: [{ d: '2026-03-01', w: 80, t: 1 }, { d: '2026-03-08', w: 79.4, t: 2 }], targetW: 75 }); mount()
    expect(host.querySelector('.m1-bw-val').textContent).toContain('79.4')
    expect(host.querySelector('.chart, svg.linechart, .m1-bw svg[role="img"]')).toBeNull()
    act(() => { button('Log').click() }); expect(bwSheet).toHaveBeenCalled()
    act(() => { button('75').click() }); expect(goalSheet).toHaveBeenCalled()
    act(() => { button('All weigh-ins').click() }); expect(weighInsSheet).toHaveBeenCalled()
  })

  it('body weight with no weigh-ins is a one-line prompt, and the preference still hides it', () => {
    setS({ weighIn: false }); mount()
    expect(host.querySelector('.m1-bw').textContent).toContain('No weigh-ins yet')
    setS({ showWeightCard: false }); mount()
    expect(host.querySelector('.m1-bw')).toBeNull()
  })
})

describe('Today — the streak row', () => {
  const streak = () => host.querySelector('.m1-streak')

  it('is not there with nothing logged: no streak to show, no calendar to open', () => {
    setS(); mount()
    expect(streak()).toBeNull()
  })

  it('shows the total, opens the calendar, and leaves the week fraction to the tile on Planned', () => {
    setS({ workouts: [wk('2020-01-01')] }); mount()
    expect(host.querySelector('.today').dataset.todayState).toBe('planned')
    expect(streak().textContent).toContain('1 workout total')
    expect(streak().textContent).not.toContain('this week')
    act(() => { streak().click() })
    expect(calendarSheet).toHaveBeenCalled()
  })

  it('keeps the week fraction on a rest day, where no tile carries it', () => {
    setS({ week: { [(WD + 1) % 7]: ['r1'] }, workouts: [wk('2020-01-01')] }); mount()
    expect(host.querySelector('.today').dataset.todayState).toBe('rest')
    expect(streak().textContent).toMatch(/0 \/ 1 this week/)
  })

  it('names a streak when there is one', () => {
    setS({ week: { [(WD + 1) % 7]: ['r1'] }, workouts: [wk(todayISO())] }); mount()
    expect(streak().textContent).toMatch(/1 week streak/)
  })
})

describe('Today — the gym check-in row', () => {
  it('is a single compact row that still goes to /checkin', () => {
    setS(); mount()
    const row = [...host.querySelectorAll('.m1-row')].find(r => r.textContent.includes('Check in'))
    expect(row.textContent).toContain('At the gym')
    act(() => { row.click() })
    expect(nav).toHaveBeenCalledWith('/checkin')
  })
})
