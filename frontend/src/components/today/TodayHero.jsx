import Icon from '../Icon.jsx'
import { t } from '../../lib/i18n.js'
import { exCount } from '../../lib/format.js'
import { MUSCLE_NAME } from '../../lib/muscles.js'

// A joined name up to this long reads as one title; beyond it, each routine gets its own line, so
// nothing needed to understand what is being started is ever cut off.
const JOIN_MAX = 22

// The Planned Today hero. A dedicated M1 surface in the fixed Action Red (not the user's accent).
// Presentation only — the names, count and focus are the effective routines' (views/Home.jsx,
// lib/today-session.js), and Start is whatever Home passes, the combined-session flow.
//
//   names      the routine names on today, in order (one or several)
//   count      exercises across all of them          focus   muscle slugs, may be empty
//   rescheduled / done   the status; done is the quieter variant and still starts another session
export default function TodayHero({ names, count, focus, rescheduled, done, onStart }) {
  const joined = names.join(' + ')
  const stacked = names.length > 1 && joined.length > JOIN_MAX
  const size = joined.length > 24 ? 'sm' : joined.length > 14 ? 'md' : 'lg'
  const status = done ? t('Completed') : rescheduled ? t('Rescheduled') : t('Scheduled')
  const focusText = focus.map(m => t(MUSCLE_NAME[m] || m)).join(' · ')

  return <section className={'m1-hero' + (done ? ' done' : '')} aria-label={t("Today's training")}>
    <div className="m1-hero-top">
      <span className="m1-kicker">{t("Today's training")}</span>
      <span className={'m1-status' + (rescheduled && !done ? ' alt' : '')}>{done && <Icon name="checkCircle" />}{status}</span>
    </div>
    {stacked
      ? <ul className="m1-hero-names">{names.map((n, i) => <li key={i}>{n}</li>)}</ul>
      : <h2 className={'m1-hero-title ' + size}>{joined}</h2>}
    <div className="m1-hero-meta">
      {focusText && <span>{focusText}</span>}
      <span>{exCount(count)}</span>
    </div>
    <button className="m1-hero-cta" onClick={onStart}>
      <Icon name="play" /><span>{done ? t('Start another session') : t('Start workout')}</span>
    </button>
  </section>
}
