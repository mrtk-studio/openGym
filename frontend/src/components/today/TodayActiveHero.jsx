import Icon from '../Icon.jsx'
import Elapsed from '../Elapsed.jsx'
import { t, exerciseNameFor, exerciseNameClass } from '../../lib/i18n.js'
import { exOr } from '../../lib/exercises.js'

// Beyond this many exercises one segment each gets too thin to read; the bar goes continuous.
const SEGMENTS_MAX = 12

const sizeOf = name => (name.length > 24 ? 'sm' : name.length > 14 ? 'md' : 'lg')

// Today while a session is open (views/Home.jsx, lib/today-active.js). Three presentations:
//   live      the running session — the red command center: clock, name, progress, where you are
//   editing   a saved workout open in the editor      } not live: no clock, no progress language,
//   backfill  a past workout being logged             } a quiet card that takes you back to it
// Presentation only. The clock is the same <Elapsed> the workout header and the tab bar show;
// Resume is Home's onPress, which goes to /workout.
//
//   name       the open session's own name (never today's schedule: another workout may be running)
//   start      its start time (live)     progress   activeProgress()     current   currentPosition()
export default function TodayActiveHero({ mode, name, start, progress, current, onResume }) {
  if (mode === 'editing' || mode === 'backfill') {
    return <section className="m1-hero quiet" aria-label={name}>
      <div className="m1-hero-top"><span className="m1-kicker">{mode === 'editing' ? t('Editing a saved workout') : t('Log a past workout')}</span></div>
      <h2 className={'m1-hero-title ' + sizeOf(name)}>{name}</h2>
      <button className="m1-hero-cta" onClick={onResume}>
        <Icon name={mode === 'editing' ? 'pencil' : 'play'} /><span>{mode === 'editing' ? t('Edit workout') : t('Resume')}</span>
      </button>
    </section>
  }

  const { done, total, fractions } = progress
  const segmented = total > 0 && total <= SEGMENTS_MAX
  const overall = progress.sets.total ? Math.round((progress.sets.done / progress.sets.total) * 100) : 0
  const exDef = current ? exOr(current.entry.id) : null
  const exName = exDef ? exerciseNameFor(exDef) : null
  const set = current?.set
  const setText = set ? (set.warmup ? t('Warm-up') : t('Set {0} / {1}', set.no, set.of)) : current?.allDone ? t('All sets done') : null

  return <section className="m1-hero m1-active" aria-label={t('Workout in progress')}>
    <div className="m1-hero-top">
      <span className="m1-kicker m1-live"><i aria-hidden="true" />{t('Workout in progress')}</span>
    </div>
    {start > 0 && <div className="m1-clock"><Elapsed start={start} /></div>}
    <h2 className={'m1-hero-title ' + sizeOf(name)}>{name}</h2>
    {total > 0 && <>
      <div className="m1-prog-label">{t('{0} / {1} exercises', done, total)}</div>
      {segmented
        ? <div className="m1-seg" aria-hidden="true">{fractions.map((f, i) => <i key={i}><b style={{ width: Math.round(f * 100) + '%' }} /></i>)}</div>
        : <div className="m1-seg" aria-hidden="true"><i><b style={{ width: overall + '%' }} /></i></div>}
    </>}
    {current && <div className="m1-now">
      <span className="m1-kicker">{t('Current')}</span>
      <div className={'m1-now-name ' + exerciseNameClass(exDef)}>{exName}</div>
      {setText && <div className="m1-now-set">{setText}</div>}
    </div>}
    <button className="m1-hero-cta" onClick={onResume}><Icon name="play" /><span>{t('Resume workout')}</span></button>
  </section>
}
