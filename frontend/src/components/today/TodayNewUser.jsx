import { t } from '../../lib/i18n.js'

// The first screen of a new install: no routines yet, nothing open. It answers one question —
// "how do I start?" — so it is guidance, not a dashboard: three steps and one action. The action
// is the starter-plan chooser the old welcome card already opened; building a plan by hand and
// training freestyle stay, as quiet text actions. Presentation only (views/Home.jsx).
export default function TodayNewUser({ onStarter, onBuild, onFreestyle }) {
  const steps = [t('Choose a routine'), t('Choose your training days'), t('Start your first workout')]
  return <section className="m1-welcome" aria-label={t('Welcome')}>
    <div className="m1-kicker">{t('Welcome')}</div>
    <h2 className="m1-welcome-title">{t("Let's build your first week.")}</h2>
    <ol className="m1-steps">
      {steps.map((s, i) => <li key={i}><span className="m1-step-n" aria-hidden="true">{'0' + (i + 1)}</span>{s}</li>)}
    </ol>
    <button className="m1-welcome-cta" onClick={onStarter}>{t('Choose a routine')}</button>
    <div className="m1-welcome-alt">
      <button onClick={onBuild}>{t('Build my own plan')}</button>
      <button onClick={onFreestyle}>{t('Train without a plan')}</button>
    </div>
  </section>
}
