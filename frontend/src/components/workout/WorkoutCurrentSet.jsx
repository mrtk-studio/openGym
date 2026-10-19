import { t } from '../../lib/i18n.js'

// Which set is actionable now, as a quiet strip under the exercise's name (Cards). Read-only: the
// view comes from lib/workout-current.js currentSetView, i.e. nextOpenSet — never from Focus's own
// pointer, and nothing here writes the workout.
//
//   view   currentSetView(...)   name   the exercise the open row belongs to (resolved by the caller)
// When the marked exercise is finished and the open row is in another one, the strip says the shown
// exercise is done and names where the work is, instead of implying a set that is not on this card.
export default function WorkoutCurrentSet({ view, name }) {
  if (!view) return null
  if (view.kind !== 'here') {
    return <div className="m1-cur done" data-kind={view.kind}>
      <span className="m1-kicker">{t('Done')}</span>
      <span className="m1-cur-val">{t('All sets done')}</span>
      {view.kind === 'elsewhere' && name && <span className="m1-cur-sub">{t('Next: {0}', name)}</span>}
    </div>
  }
  const { label, side } = view
  const text = label.warmup ? t('Warm-up') : label.cardio ? t('Cardio') : t('Set {0} / {1}', label.no, label.of)
  return <div className="m1-cur" data-kind="here">
    <span className="m1-kicker">{t('Current')}</span>
    <span className="m1-cur-val">{text}{side && <span className="m1-cur-side"> · {side === 'L' ? t('Left') : t('Right')}</span>}</span>
  </div>
}
