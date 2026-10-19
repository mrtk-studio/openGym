import Icon from '../Icon.jsx'
import TodayHero from './TodayHero.jsx'
import WeekTile from './WeekTile.jsx'
import RecoveryTile from './RecoveryTile.jsx'
import { Button } from '../ui.jsx'
import { t } from '../../lib/i18n.js'
import { tappable } from '../../lib/use-sheet-keyboard.js'

// The state-aware slot at the top of Today. Today's one-row card is what Home has always shown
// here, now one per state, so Phase 4 and 5 can swap the Planned and Active renderings for the
// command-center hero without touching Home. Presentation only: Home decides the state
// (lib/today-state.js) and hands over what to say; taps go back to it as callbacks.
//
//   state      { kind, mode, done } from classifyToday
//   name       the open session's name, for the active row
//   rescheduled / next   the extra words under or after the title, already decided by Home
//   planned    for a planned day, what the M1 command center shows: { names, count, focus, week,
//              recovery } — all derived by Home from the effective routines and the log
//
// Planned has its M1 command center; the other states still use the legacy row until their own phase.
export default function TodayPrimary({ state, planned: plan, name, doneName, rescheduled, next, nextDay, onPress, onChoose, onStarter, onBuild }) {
  const { kind, mode, done } = state
  const active = kind === 'active', editing = active && mode === 'editing'

  if (kind === 'new-user') {
    return <div className="today-primary" data-state="new-user">
      <div className="card">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}>
          <span className="lrow-i"><Icon name="calendar" /></span>
          <div className="big" style={{ fontSize: 22 }}>{t('Welcome!')}</div>
        </div>
        <div className="muted small" style={{ marginBottom: 12 }}>{t('Set up your weekly routine to get going, or grab a ready-made starter plan.')}</div>
        <Button variant="primary" icon="clipboard" onClick={onStarter}>{t('Load starter plan')}</Button>
        <div style={{ height: 8 }} /><Button onClick={onBuild}>{t('Build my own plan')}</Button>
      </div>
      <ChooseDoor onChoose={onChoose} />
    </div>
  }

  if (kind === 'planned') {
    return <div className="today-primary" data-state="planned">
      <TodayHero names={plan.names} count={plan.count} focus={plan.focus} rescheduled={rescheduled} done={done} onStart={onPress} />
      <div className="m1-tiles">
        <WeekTile done={plan.week.done} planned={plan.week.planned} />
        <RecoveryTile recovery={plan.recovery} />
      </div>
      <ChooseDoor onChoose={onChoose} demoted />
    </div>
  }

  const title = active ? (editing ? name : t('{0} (in progress)', name))
    : done ? (doneName ? t('{0} (done)', doneName) : t('Workout done'))
    : t('Rest day')

  return <div className="today-primary" data-state={kind} data-mode={mode || undefined}>
    <div className="card">
      {/* Once today's session is logged the row stops asking for it. The week strip already
          knew (its dot goes 'done'); this row did not, so a finished day kept showing the
          routine name behind a green Start tag and read as still outstanding (issue #4).
          An in-progress session still wins — that one is happening right now. Tapping the
          row keeps working, so a second session in one day is a tap away, just not urged. */}
      <div className="today-row" {...tappable(onPress)}>
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i" style={{ background: active ? 'var(--orange)' : 'var(--surface-3)' }}>
            <Icon name={active ? (editing ? 'pencil' : 'play') : done ? 'checkCircle' : 'moon'}
              style={done && !active ? { color: 'var(--green)' } : undefined} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="lbl2">{t('Today')}</div>
            <div className="ttl">{title}{rescheduled ? ' · ' + t('rescheduled') : ''}</div>
            {next && !done && <div className="ss">{t('Next session: {0}, {1}', t(nextDay), next.routine.name)}</div>}
          </div>
        </div>
        {active ? <span className="tag" style={{ color: 'var(--orange)', background: 'color-mix(in srgb,var(--orange) 16%,transparent)' }}>{editing ? t('Edit') : t('Resume')}</span>
          : done ? <span className="tag" style={{ color: 'var(--green)', background: 'color-mix(in srgb,var(--green) 16%,transparent)' }}>{t('Done')}</span>
          : <Icon name="plus" className="chev" />}
      </div>
      {!active && <ChooseDoor onChoose={onChoose} />}
    </div>
  </div>
}

// The row above starts today's plan in one tap, and so does Train in the tab bar — which is the
// whole problem when you want something else. Both jump straight into the planned session
// whenever there is one, so the Start screen (a freestyle session, and your other routines) is
// only reachable on a day with nothing planned. The one other way in, "Choose a different
// workout" on the weigh-in sheet, does not exist when the weigh-in is switched off. This is that
// door, and it starts nothing on its own.
function ChooseDoor({ onChoose, demoted }) {
  return <div className={demoted ? 'm1-door' : undefined} style={demoted ? undefined : { display: 'flex', justifyContent: 'center', marginTop: 4 }}>
    <Button size="sm" variant="ghost" className="dim" icon="swap" onClick={onChoose}>{t('Choose a different workout')}</Button>
  </div>
}
