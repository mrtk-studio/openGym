import { t } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'

// What comes after this exercise: the next unit in the session's order, the same one Next goes to.
// A superset is named as what it is — its members together — not as one exercise. Tapping it is
// Next (the caller's navigateUnit), nothing else; the final unit has no Next Up.
//
//   names   [{ text, cls }] — the next unit's exercise names, with their casing class
//   superset   it holds more than one
export default function WorkoutNextUp({ names, superset, onGo }) {
  if (!names?.length) return null
  return <button type="button" className="m1-next-up" onClick={onGo} aria-label={t('Up next') + ': ' + names.map(n => n.text).join(' + ')}>
    <span className="m1-nu-body">
      <span className="m1-kicker">{t('Up next')}{superset && <> · {t('Superset')}</>}</span>
      {superset
        ? <ul className="m1-nu-names">{names.map((n, i) => <li key={i} className={n.cls}>{n.text}</li>)}</ul>
        : <span className={'m1-nu-name ' + names[0].cls}>{names[0].text}</span>}
    </span>
    <Icon name="chevronRight" />
  </button>
}
