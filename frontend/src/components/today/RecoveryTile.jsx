import { t } from '../../lib/i18n.js'
import { fmtNum } from '../../lib/format.js'
import { MUSCLE_NAME } from '../../lib/muscles.js'

// Beyond this many hours the number reads better in days.
const DAYS_FROM_H = 100

// Recovery Context: how long since a muscle today's session works was last trained, from logged
// workouts (lib/today-session.js recoveryContext). Elapsed time, never a readiness score. With no
// history for those muscles there is nothing honest to show, so it says so.
//   recovery   { muscle, hours } | null
export default function RecoveryTile({ recovery }) {
  if (!recovery) return <div className="m1-tile m1-tile-recovery is-empty">
    <div className="m1-kicker">{t('Recovery')}</div>
    <div className="m1-tile-title">{t('Fresh start')}</div>
    <div className="m1-tile-note">{t('Log a few sessions and your recovery shows up here.')}</div>
  </div>
  const days = recovery.hours >= DAYS_FROM_H
  return <div className="m1-tile m1-tile-recovery">
    <div className="m1-kicker">{t('Recovery')}</div>
    <div className="m1-tile-title">{t(MUSCLE_NAME[recovery.muscle] || recovery.muscle)}</div>
    <div className="m1-metric">{days ? t('{0}D', fmtNum(Math.floor(recovery.hours / 24))) : t('{0}H', fmtNum(recovery.hours))}</div>
    <div className="m1-tile-label">{days ? t('Days since trained') : t('Hours since trained')}</div>
  </div>
}
