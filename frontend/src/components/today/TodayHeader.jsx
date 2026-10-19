import Icon from '../Icon.jsx'
import { t } from '../../lib/i18n.js'

// The top of Today: the date as a small label, the greeting as the title, Settings on the right.
// Props only — the connection dot, the names and the navigation come from Home.
export default function TodayHeader({ title, dateLabel, trouble, onSettings }) {
  return <div className="hdr today-hdr">
    <div>
      <div className="today-date">{dateLabel}</div>
      <h1>{title}</h1>
    </div>
    <button className="iconbtn" onClick={onSettings} aria-label={trouble ? t('Settings') + ', ' + t('Connection problem') : t('Settings')}>
      <Icon name="gear" />{trouble && <span className="tab-dot" aria-hidden="true" />}
    </button>
  </div>
}
