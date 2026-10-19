import { t } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'

// This week's workouts against the plan. The values are Home's weekTally; with nothing planned
// (a week of freestyle sessions) there is no denominator, so the tile shows the count alone.
export default function WeekTile({ done, planned }) {
  const pct = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0
  return <div className="m1-tile m1-tile-week">
    <div className="m1-kicker">{t('This week')}</div>
    <div className="m1-metric">{fmtNum(done)}{planned > 0 && <span className="m1-metric-of"> / {fmtNum(planned)}</span>}</div>
    <div className="m1-tile-label">{t('Workouts')}</div>
    {planned > 0 && <div className="m1-bar" aria-hidden="true"><i style={{ width: pct + '%' }} /></div>}
  </div>
}
