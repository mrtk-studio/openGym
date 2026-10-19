// @vitest-environment happy-dom
// The tab bar is fixed on screen and re-renders on every store write — once a second for the
// whole of a rest. Its buttons must survive that: a component declared inside the render body is
// a new function each time, which React reads as a different type and rebuilds from scratch.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TabBar from './TabBar.jsx'
import { useUI } from '../store/useUI.js'
import { DEF, useStore } from '../store/useStore.js'

const nav = vi.fn()
const flags = vi.hoisted(() => ({ path: '/home', mobile: false }))
vi.mock('react-router-dom', () => ({
  useNavigate: () => nav,
  useLocation: () => ({ pathname: flags.path }),
}))
vi.mock('../lib/mobile.js', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, get MOBILE() { return flags.mobile } }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host, root, originalS, originalUser

beforeEach(() => {
  nav.mockClear(); flags.path = '/home'; flags.mobile = false
  const store = useStore.getState()
  originalS = store.S
  originalUser = store.user
  useStore.setState({ S: JSON.parse(JSON.stringify(DEF)), user: { id: 1, name: 'test' } })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useStore.setState({ S: originalS, user: originalUser })
})

const tabs = () => [...host.querySelectorAll('#tabbar button')]

describe('the tab bar across a store write', () => {
  it('keeps the very same buttons instead of rebuilding them every tick', () => {
    act(() => { root.render(<TabBar onStart={() => {}} />) })
    const before = tabs()
    expect(before).toHaveLength(5)

    // What a rest does once a second: S is replaced, so everything reading it re-renders.
    act(() => { useStore.getState().update(s => { s.restSec = 91 }, false) })

    const after = tabs()
    expect(after).toHaveLength(before.length)
    after.forEach((el, i) => expect(el).toBe(before[i]))
  })

  it('still lights the tab for the route it is on, and follows a change of state', () => {
    act(() => { root.render(<TabBar onStart={() => {}} />) })
    expect(tabs()[0].className).toBe('on')
    expect(tabs()[0].getAttribute('aria-current')).toBe('page')
    expect(tabs()[1].className).toBe('')
    expect(tabs()[1].getAttribute('aria-current')).toBeNull()
    expect(tabs()[2].className).toBe('start')

    act(() => { useStore.getState().update(s => { s.active = { id: 'a', entries: [], cur: 0 } }, false) })
    expect(tabs()[2].className).toBe('start rec')
    expect(tabs()[0].className).toBe('on')
  })
})

// Settings → "Show connection status" off (#369, #330): a stuck sync shows as a dot on Home, the
// tab Settings opens from, and the tab's name says it.
describe('the connection dot on Home', () => {
  const home = () => tabs()[0]
  it('is there for a sync problem only while the banner is switched off', () => {
    const original = useStore.getState().sync
    try {
      useStore.setState({ sync: { status: 'error', lastError: { status: 502 }, pending: true } })
      act(() => { root.render(<TabBar onStart={() => {}} />) })
      expect(home().querySelector('.tab-dot')).toBeNull()
      act(() => { useStore.getState().update(s => { s.connStatus = false }, false) })
      expect(home().querySelector('.tab-dot')).not.toBeNull()
      expect(home().getAttribute('aria-label')).toBe('Today, Connection problem')
      act(() => { useStore.setState({ sync: { status: 'ok', lastError: null, pending: false } }) })
      expect(home().querySelector('.tab-dot')).toBeNull()
      expect(home().getAttribute('aria-label')).toBeNull()
    } finally { useStore.setState({ sync: original }) }
  })
})

// v1.3.11 icon sweep: one icon per concept. Every tab carries its name under the icon, Start is a
// play button whether or not a session runs. M1: Today · Plan · Train · Progress · Coach.
describe('the tab icons and labels', () => {
  const icon = el => el.querySelector('svg')?.getAttribute('data-icon')
  const label = el => el.querySelector('span:last-child').textContent
  it('labels every tab and uses one icon per concept', () => {
    act(() => { root.render(<TabBar onStart={() => {}} />) })
    expect(tabs().map(icon)).toEqual(['house', 'calendar', 'play', 'chart', 'sparkles'])
    expect(tabs().map(label)).toEqual(['Today', 'Plan', 'Train', 'Progress', 'Coach'])

    act(() => { useStore.getState().update(s => { s.active = { id: 'a', entries: [], cur: 0 } }, false) })
    expect(icon(tabs()[2])).toBe('play')
    expect(label(tabs()[2])).toBe('Resume')
  })

  it('shows a minimized session’s running time, still named Resume', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 9, 5, 18, 0, 0))
      act(() => { useStore.getState().update(s => { s.active = { id: 'a', entries: [], cur: 0, start: Date.now() - 754_000 } }, false) })
      act(() => { root.render(<TabBar onStart={() => {}} />) })
      const start = tabs()[2]
      expect(label(start)).toBe('12:34')
      expect(start.getAttribute('aria-label')).toBe('Resume')
      act(() => { vi.advanceTimersByTime(2000) })
      expect(label(start)).toBe('12:36')
      expect(tabs()[2]).toBe(start)   // the same button, only its text ticks

      // a past workout being edited has no clock running
      act(() => { useStore.getState().update(s => { s.active.editingWorkoutId = 'w1' }, false) })
      expect(label(tabs()[2])).toBe('Edit workout')
    } finally { vi.useRealTimers() }
  })
})

const click = el => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
const labelOf = el => el.querySelector('span:last-child').textContent
const lit = () => tabs().map((b, i) => b.className.split(' ').includes('on') ? i : -1).filter(i => i >= 0)
const render = () => act(() => { root.render(<TabBar onStart={onStart} />) })
const onStart = vi.fn()
const planned = (over = {}) => useStore.getState().update(s => {
  s.routines = [{ id: 'r1', name: 'Push', emoji: null, ex: [{ id: '0025' }] }]
  s.week = { 0: ['r1'], 1: ['r1'], 2: ['r1'], 3: ['r1'], 4: ['r1'], 5: ['r1'], 6: ['r1'] }
  Object.assign(s, over)
}, false)

describe('destinations', () => {
  it('Today, Plan and Progress go to /home, /plan and /stats', () => {
    render()
    click(tabs()[0]); click(tabs()[1]); click(tabs()[3])
    expect(nav.mock.calls.map(c => c[0])).toEqual(['/home', '/plan', '/stats'])
  })
})

describe('Train keeps the Start / Resume behaviour', () => {
  beforeEach(() => onStart.mockClear())

  it('starts the planned (combined) session when today has one', () => {
    planned(); render()
    click(tabs()[2])
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStart.mock.calls[0][0]).toEqual(['r1'])
    expect(nav).not.toHaveBeenCalled()
  })

  it('opens the workout picker when nothing is planned', () => {
    render()
    click(tabs()[2])
    expect(onStart).not.toHaveBeenCalled()
    expect(nav).toHaveBeenCalledWith('/workout')
  })

  it('opens the picker rather than an empty session when the planned routine has no exercises', () => {
    planned(); useStore.getState().update(s => { s.routines[0].ex = [] }, false); render()
    click(tabs()[2])
    expect(onStart).not.toHaveBeenCalled()
    expect(nav).toHaveBeenCalledWith('/workout')
  })

  it('resumes a live session away from the workout screen, with its clock as the label', () => {
    planned({ active: { id: 'a', entries: [], cur: 0, start: Date.now() - 60_000 } }); render()
    expect(tabs()[2].className).toBe('start rec')
    expect(tabs()[2].getAttribute('aria-label')).toBe('Resume')
    click(tabs()[2])
    expect(onStart).not.toHaveBeenCalled()
    expect(nav).toHaveBeenCalledWith('/workout')
  })

  it('reads Workout and stays lit on the workout screen, with no competing Resume', () => {
    flags.path = '/workout'
    planned({ active: { id: 'a', entries: [], cur: 0, start: Date.now() - 60_000 } }); render()
    expect(tabs()[2].className).toBe('start rec on')
    expect(labelOf(tabs()[2])).toBe('Workout')
    expect(tabs()[2].getAttribute('aria-label')).toBeNull()
  })

  it('reads Edit workout for a saved workout, with no clock', () => {
    planned({ active: { id: 'a', entries: [], cur: 0, start: Date.now() - 60_000, editingWorkoutId: 'w1' } }); render()
    expect(labelOf(tabs()[2])).toBe('Edit workout')
    expect(tabs()[2].getAttribute('aria-label')).toBeNull()
  })

  it('reads Resume, not a clock, for a backfill or a session that never started', () => {
    planned({ active: { id: 'a', entries: [], cur: 0, backfill: true, start: Date.now() - 60_000 } }); render()
    expect(labelOf(tabs()[2])).toBe('Resume')
    expect(tabs()[2].getAttribute('aria-label')).toBeNull()
    act(() => { useStore.getState().update(s => { s.active = { id: 'a', entries: [], cur: 0, start: 0 } }, false) })
    expect(labelOf(tabs()[2])).toBe('Resume')
  })
})

describe('the tab a route lights', () => {
  const at = path => { flags.path = path; render(); return lit() }
  it('Today for home and settings', () => {
    expect(at('/home')).toEqual([0]); expect(at('/settings/coach')).toEqual([0])
  })
  it('Plan for the plan and its routine editor', () => {
    expect(at('/plan')).toEqual([1]); expect(at('/plan/r/x')).toEqual([1])
  })
  it('Progress for stats, history, structural balance, measurements and photos', () => {
    for (const p of ['/stats', '/history', '/structural-balance', '/measurements', '/progress-photos']) expect(at(p), p).toEqual([3])
  })
  it('Coach for its setup and intake screens', () => {
    expect(at('/coach/setup')).toEqual([4]); expect(at('/coach/intake')).toEqual([4])
  })
  it('nothing for the exercise library and muscle explorer, which are browsing, not progress', () => {
    expect(at('/library')).toEqual([]); expect(at('/muscles')).toEqual([])
  })
})

describe('the Coach tab', () => {
  const toasts = vi.fn()
  beforeEach(() => { toasts.mockClear(); useUI.setState({ toast: toasts }) })
  const setup = (config, user = { id: 1, name: 'test' }, coachLocal = null) => useStore.setState({ config, user, coachLocal })

  it('opens the chat when the Coach is available', () => {
    setup({ coach: { enabled: true } }); render()
    click(tabs()[4])
    expect(nav).toHaveBeenCalledWith('/coach'); expect(toasts).not.toHaveBeenCalled()
  })

  it('explains itself instead of hiding or doing nothing when the server has no Coach', () => {
    setup({}); render()
    expect(tabs()).toHaveLength(5)
    click(tabs()[4])
    expect(nav).not.toHaveBeenCalled()
    expect(toasts).toHaveBeenCalledWith('The Coach is not turned on for this server. Ask its admin to enable it.')
  })

  it('also explains for a guest, who has no account for the server Coach', () => {
    setup({ coach: { enabled: true } }, null); localStorage.setItem('gym_guest', '1')
    try { render(); click(tabs()[4]); expect(toasts).toHaveBeenCalled(); expect(nav).not.toHaveBeenCalled() } finally { localStorage.removeItem('gym_guest') }
  })

  it('sends the phone app to its Coach setup when the Coach is not set up', () => {
    flags.mobile = true; setup({}); render()
    click(tabs()[4])
    expect(nav).toHaveBeenCalledWith('/coach/setup'); expect(toasts).not.toHaveBeenCalled()
  })

  it('sends the phone app to the chat once it brought its own key', () => {
    flags.mobile = true; setup({}, { id: 1, name: 'test' }, { mode: 'byok' }); render()
    click(tabs()[4])
    expect(nav).toHaveBeenCalledWith('/coach')
  })
})
