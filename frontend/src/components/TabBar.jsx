import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { effectiveRoutineIds, effectiveRoutines } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { coachTabTarget } from '../lib/coach.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import Icon from './Icon.jsx'
import Elapsed from './Elapsed.jsx'
import { useConnectionTrouble } from './SyncBanner.jsx'

// Module scope, not TabBar's render body. Declared inside it, `Tab` was a new function on every
// render, so React saw a different component type each time and threw the button away and built a
// fresh one — on a bar that is fixed on screen, and once a second for the whole of a rest. The
// state it took with it is the DOM node itself: focus, the :active tint, any in-flight transition.
function Tab({ active, icon, label, onClick, dot }) {
  return (
    <button className={active ? 'on' : ''} onClick={onClick} aria-current={active ? 'page' : undefined} aria-label={dot ? label + ', ' + t('Connection problem') : undefined}>
      <span className="tab-ic"><Icon name={icon} />{dot && <span className="tab-dot" aria-hidden="true" />}</span><span>{label}</span>
    </button>
  )
}

// Which tab a route lights. Progress owns the analysis screens; the exercise library and its
// muscle explorer (browsing, not analysis) have no tab since Exercises left the bar and are
// reached from Plan. /coach hides the bar altogether; setup and intake keep it, lit as Coach.
export const tabOf = cur => (
  cur === 'home' || cur === 'settings' ? 'today'
  : cur === 'plan' ? 'plan'
  : ['stats', 'history', 'structural-balance', 'measurements', 'progress-photos'].includes(cur) ? 'progress'
  : cur === 'coach' ? 'coach'
  : null
)

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const coachMode = useStore(s => s.coachLocal?.mode)
  const isGuest = useStore(s => s.isGuest())
  const toast = useUI(s => s.toast)
  // With the connection banner switched off, a sync problem shows as a dot on Today, the tab
  // Settings lives under (#369, #330).
  const trouble = useConnectionTrouble()
  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const lit = tabOf(cur)

  const running = !!S.active && cur !== 'workout' && !S.active.editingWorkoutId && !S.active.backfill && S.active.start > 0
  const startWorkout = () => {
    if (!S.active) {
      // A weekday can hold several routines; start the combined session if any of them has
      // exercises, otherwise fall through to the picker.
      if (effectiveRoutines(S, todayISO()).some(r => r.ex.length)) { onStart(effectiveRoutineIds(S, todayISO())); return }
    }
    nav('/workout')
  }
  // The Coach stays in the bar whether or not it is on, so the thumb positions never move. An
  // instance that cannot offer it says so instead of leaving a dead button.
  const openCoach = () => {
    const to = coachTabTarget(config, user, { demo: DEMO, mobile: MOBILE, coachMode })
    if (to) nav(to)
    else toast(t('The Coach is not turned on for this server. Ask its admin to enable it.'))
  }

  return (
    <nav id="tabbar">
      <Tab active={lit === 'today'} icon="house" label={t('Today')} dot={trouble} onClick={() => nav('/home')} />
      <Tab active={lit === 'plan'} icon="calendar" label={t('Plan')} onClick={() => nav('/plan')} />
      {/* On the workout screen itself there is nothing to resume, so the button reads as the
          tab it is and stays lit (#29); anywhere else it brings you back to the exercise you
          were on — the marker is kept in S.active.cur and never moves on its own (#21). The
          glyph is always play: start and resume are one concept, and an exercise is a dumbbell.
          A live session you stepped away from shows its running time instead of a word, the
          button still named Resume; a past workout being edited or logged after the fact has no
          clock to run. */}
      <button className={'start' + (S.active ? ' rec' : '') + (S.active && cur === 'workout' ? ' on' : '')} onClick={startWorkout}
        aria-label={running ? t('Resume') : undefined}>
        <span className="cir"><Icon name="play" /></span>
        {running ? <span className="tab-time"><Elapsed start={S.active.start} /></span>
          : <span>{S.active ? (cur === 'workout' ? t('Workout') : S.active.editingWorkoutId ? t('Edit workout') : t('Resume')) : t('Train')}</span>}
      </button>
      <Tab active={lit === 'progress'} icon="chart" label={t('Progress')} onClick={() => nav('/stats')} />
      <Tab active={lit === 'coach'} icon="sparkles" label={t('Coach')} onClick={openCoach} />
    </nav>
  )
}
