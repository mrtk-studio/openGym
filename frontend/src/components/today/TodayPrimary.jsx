import TodayHero from './TodayHero.jsx'
import TodayActiveHero from './TodayActiveHero.jsx'
import TodayRestHero from './TodayRestHero.jsx'
import TodayNewUser from './TodayNewUser.jsx'
import WeekTile from './WeekTile.jsx'
import RecoveryTile from './RecoveryTile.jsx'
import { Button } from '../ui.jsx'
import { t } from '../../lib/i18n.js'

// The state-aware slot at the top of Today: one dedicated presentation per state, each with its
// own energy — New User guided, Planned bold, Active urgent, Rest calm. Presentation only: Home
// decides the state (lib/today-state.js) and hands over what to say; taps go back as callbacks.
//
//   state      { kind, mode, done } from classifyToday
//   name       the open session's name (active)    rescheduled   planned, from a day override
//   planned    { names, count, focus, week, recovery }   the Planned command center
//   active     { start, progress, current, week }        an open session (lib/today-active.js)
//   rest       { next, recovery }                        the next session, and recovery for its muscles
export default function TodayPrimary({ state, planned: plan, active: live, rest, name, rescheduled, onPress, onChoose, onStarter, onBuild, onPlan }) {
  const { kind, mode, done } = state

  if (kind === 'new-user') {
    return <div className="today-primary" data-state="new-user">
      <TodayNewUser onStarter={onStarter} onBuild={onBuild} onFreestyle={onChoose} />
    </div>
  }

  if (kind === 'active') {
    return <div className="today-primary" data-state="active" data-mode={mode}>
      <TodayActiveHero mode={mode} name={name} start={live.start} progress={live.progress} current={live.current} onResume={onPress} />
      <div className="m1-tiles single"><WeekTile done={live.week.done} planned={live.week.planned} /></div>
    </div>
  }

  if (kind === 'planned') {
    return <div className="today-primary" data-state="planned">
      <TodayHero names={plan.names} count={plan.count} focus={plan.focus} rescheduled={rescheduled} done={done} onStart={onPress} />
      <div className="m1-tiles">
        <WeekTile done={plan.week.done} planned={plan.week.planned} />
        <RecoveryTile recovery={plan.recovery} />
      </div>
      <ChooseDoor onChoose={onChoose} />
    </div>
  }

  // rest: no This Week tile (nothing to decide today); the recovery tile only with real history.
  return <div className="today-primary" data-state="rest">
    <TodayRestHero done={done} next={rest.next} onPlan={onPlan} />
    {rest.next && rest.recovery && <div className="m1-tiles single"><RecoveryTile recovery={rest.recovery} /></div>}
    <ChooseDoor onChoose={onChoose} />
  </div>
}

// Train in the tab bar jumps straight into the planned session whenever there is one, so the
// Start screen (a freestyle session, and your other routines) is only reachable on a day with
// nothing planned. The one other way in, "Choose a different workout" on the weigh-in sheet, does
// not exist when the weigh-in is switched off. This is that door, and it starts nothing on its own.
function ChooseDoor({ onChoose }) {
  return <div className="m1-door">
    <Button size="sm" variant="ghost" className="dim" icon="swap" onClick={onChoose}>{t('Choose a different workout')}</Button>
  </div>
}
