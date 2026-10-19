import Icon from '../Icon.jsx'
import { t } from '../../lib/i18n.js'
import { exCount, fmtDate, DAYN } from '../../lib/format.js'
import { MUSCLE_NAME } from '../../lib/muscles.js'

// Rest Day: calm and spacious — an M1 surface, not Action Red, with the lime kept to the "when"
// chip and the done mark. It answers "what should I know before my next workout?", so the
// next session is its one piece of information. Presentation only: the next session is
// nextTrainingDay's, resolved by Home.
//
//   done   a workout is already logged today (a freestyle session on a rest day)
//   next   { when, names, count, focus } | null — null is a week with nothing in it
//   onPlan opens Plan, for a week with nothing in it
export default function TodayRestHero({ done, next, onPlan }) {
  const whenText = !next ? '' : next.when.key === 'tomorrow' ? t('Tomorrow')
    : next.when.key === 'weekday' ? t(DAYN[next.when.weekday]) : fmtDate(next.when.iso, true)
  const names = next?.names || []
  const joined = names.join(' + ')
  const focusText = (next?.focus || []).map(m => t(MUSCLE_NAME[m] || m)).join(' · ')

  return <section className="m1-rest" aria-label={t('Rest day')}>
    <div className="m1-kicker m1-rest-kicker"><i aria-hidden="true" />{t('Rest day')}</div>
    <h2 className="m1-rest-title">{t('Recover.')}</h2>
    <p className="m1-rest-line">
      {done ? <><Icon name="checkCircle" />{t('Workout completed today.')}</>
        : next ? t('Recovery is part of the plan.') : t('Nothing scheduled yet.')}
    </p>
    {next ? <div className="m1-next">
      <div className="m1-next-top"><span className="m1-kicker">{t('Next')}</span><span className="m1-when">{whenText}</span></div>
      {names.length > 1 && joined.length > 22
        ? <ul className="m1-next-names">{names.map((n, i) => <li key={i}>{n}</li>)}</ul>
        : <div className="m1-next-name">{joined}</div>}
      <div className="m1-next-meta">{focusText && <span>{focusText}</span>}<span>{exCount(next.count)}</span></div>
    </div> : <button className="m1-rest-plan" onClick={onPlan}><Icon name="calendar" /><span>{t('Set up in Plan')}</span></button>}
  </section>
}
