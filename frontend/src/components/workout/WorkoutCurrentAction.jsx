import { t } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'

// The set that is up, as one thumb-sized area in Cards: its load and reps (or seconds, minutes) with
// big steppers, an effort chip when the profile logs one, and the one forward action. Everything
// here is handed in by the exercise block — the values come from the row itself and every handler
// is the row's own (the check's toggle, a timed set's Start set) — so this holds no workout state
// and decides nothing. It only moves forward: once the set is done the block hands in the next
// open one, never an Undo; correcting finished work stays on the set grid below.
//
//   fields   [{ key, label, value, dec, inc }]   `dec`/`inc` are absent when the profile has the
//                                                steppers off: the value is then only shown
//   summary  a row that is a drop set / rest-pause: its own label, no steppers — its structure is
//            edited in the grid
//   effort   { label, onOpen }                    the effort picker, as on the row
//   button   { label, icon, onClick, disabled, working }   `working`: a hold is running on this set
export default function WorkoutCurrentAction({ fields = [], summary, effort, button, mode }) {
  return <section className="m1-act" aria-label={t('Current')} data-mode={mode}>
    {summary && <div className="m1-act-sum"><bdi dir="ltr">{summary}</bdi></div>}
    {fields.length > 0 && <div className={'m1-act-vals n' + fields.length}>
      {fields.map(f => <div className="m1-act-f" key={f.key}>
        <span className="m1-act-fl">{f.label}</span>
        <div className="m1-act-st">
          {f.dec && <button type="button" className="m1-act-b" aria-label={t('Decrease') + ': ' + f.label} onClick={f.dec}><Icon name="minus" /></button>}
          <output className={'m1-act-fv' + (String(f.value).length > 4 ? ' long' : '')}>{f.value}</output>
          {f.inc && <button type="button" className="m1-act-b" aria-label={t('Increase') + ': ' + f.label} onClick={f.inc}><Icon name="plus" /></button>}
        </div>
      </div>)}
    </div>}
    {effort && <button type="button" className="m1-act-eff" onClick={effort.onOpen}>{effort.label}</button>}
    <button type="button" className={'m1-act-go' + (button.working ? ' working' : '')} disabled={button.disabled} onClick={button.onClick} data-state={button.working ? 'running' : undefined}>
      {button.icon && <Icon name={button.icon} />}{button.label}
    </button>
  </section>
}
