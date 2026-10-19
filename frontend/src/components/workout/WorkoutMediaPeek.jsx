import { useState } from 'react'
import { t } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'
import Media from '../Media.jsx'
import { isCustomEx } from '../../lib/exercises.js'
import { mediaOf } from '../../lib/media-refs.js'

// An exercise's animation in Cards, as a short strip instead of the full-height block: it takes
// a fraction of the screen, so the sets are in reach without scrolling past a demo you have seen.
// Expand brings the full-size media back, Minimize puts the strip back. Whether it is open is this
// card's own business and is not remembered — the Animations setting (Full / Small / Off) is the
// preference, and Small and Off never come through here.
//
// The strip is by type (index.css .m1-media): a catalogue animation or an uploaded still, GIF or
// short clip sits whole in it, never cropped; a long uploaded clip opens up for its controls once
// tapped; an exercise that is only a link is its one-line card, with nothing to expand.
export default function WorkoutMediaPeek({ ex }) {
  const [open, setOpen] = useState(false)
  // A link and nothing else is already a one-line card: no strip to expand.
  if (isCustomEx(ex) && !mediaOf(ex)) return <Media ex={ex} />
  return <div className={'m1-media' + (open ? ' open' : '')}>
    <Media ex={ex} />
    <button type="button" className="giftoggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      <Icon name={open ? 'minimize' : 'expand'} />{open ? t('Minimize') : t('Expand')}
    </button>
  </div>
}
