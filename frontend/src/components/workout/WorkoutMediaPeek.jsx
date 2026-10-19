import { useState } from 'react'
import { t } from '../../lib/i18n.js'
import Icon from '../Icon.jsx'
import Media from '../Media.jsx'

// An exercise's animation in Cards, as a short strip instead of the full-height block: it takes
// a fraction of the screen, so the sets are in reach without scrolling past a demo you have seen.
// Expand brings the full-size media back, Minimize puts the strip back. Whether it is open is this
// card's own business and is not remembered — the Animations setting (Full / Small / Off) is the
// preference, and Small and Off never come through here.
export default function WorkoutMediaPeek({ ex }) {
  const [open, setOpen] = useState(false)
  return <div className={'m1-media' + (open ? ' open' : '')}>
    <Media ex={ex} />
    <button type="button" className="giftoggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
      <Icon name={open ? 'minimize' : 'expand'} />{open ? t('Minimize') : t('Expand')}
    </button>
  </div>
}
