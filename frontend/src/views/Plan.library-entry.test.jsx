// @vitest-environment happy-dom
// Exercises left the tab bar (M1); Plan's header is the way to the library, and it stays a plain
// route change.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Plan from './Plan.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const nav = vi.fn()
const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({
    S: state.S,
    user: null,
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
  })
  return state
})
vi.mock('../store/useStore.js', () => {
  const useStore = selector => (selector ? selector(mocks.snapshot()) : mocks.snapshot())
  useStore.getState = mocks.snapshot
  return { useStore, DEF: { reminder: { time: '17:30' } }, hasData: () => false }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => nav }))
vi.mock('../lib/mobile.js', () => ({ MOBILE: false, isAndroid: () => Promise.resolve(false), shareExport: vi.fn(), syncReminder: vi.fn() }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), dayAssignSheet: vi.fn(),
}))

let host, root
beforeEach(() => {
  nav.mockClear()
  mocks.S = { unit: 'kg', workouts: [], exWeights: {}, week: {}, dayPlan: {}, routines: [] }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('Plan — the way to the exercise library', () => {
  it('has an Exercises button in the header that opens /library', () => {
    act(() => { root.render(<Plan />) })
    const b = host.querySelector('.hdr button[aria-label="Exercises"]')
    expect(b).toBeTruthy()
    act(() => { b.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(nav).toHaveBeenCalledWith('/library')
  })
})
