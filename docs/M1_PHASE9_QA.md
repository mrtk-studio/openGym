# M1 — Phase 9 hardening record

What was checked before M1 acceptance, what it found, what was fixed, and what is left for a
real device. Nothing here changes the frozen architecture (Today's four states, the five-tab IA,
Cards as the default workout view with `nextOpenSet` driving its Current Action, Focus's own set
pointer, completion semantics, timers, persistence, sync, ordering/swap).

Environment: headless Chromium (Playwright) against `vite preview` of the production build, a guest
profile seeded with real state shapes. Everything below marked *browser* was measured there.
Everything marked *device* needs a phone: Chromium cannot stand in for it.

## Matrix run (browser)

248 automated cases, each audited in-page for horizontal overflow, elements outside the viewport,
children poking out of their panel, text clipped by its own box, bottom-bar/action collisions,
console and page errors, and text contrast (computed colour against the effective background,
large-text threshold applied).

| Axis | Covered |
|---|---|
| Today | new user · planned · planned/no history · planned completed · active live · active editing · active backfill · rest · rest after a freestyle workout · rest/no history · weight off · Check in off · coach queue · rotation (empty) — dark and light, first viewport and full page |
| Cards | reps/load · warm-up · bodyweight · assisted · effort/RIR · per-side Left and Right · timed · timed running · timed L/R pair · cardio · drop set · rest-pause · pyramid · superset · no history · rich history · final set · rest active (and scrolled to the end) · editing · backfill · freestyle (empty) · long name |
| Focus | ordinary · completed · locked · per-side · timed · timed running · cardio · rest active |
| Other views | List, Compact |
| Sizes | 390×844 · 393×852 · 360×800 · 320×568 · 430×932 |
| Locales | de · ru · fr · ar (RTL) · hi, at 390×844 and 320×568, on the key screens |
| Themes | dark and light |

Result after the fixes below: no horizontal overflow, no clipped control, no panel overflow, no
console error and no contrast failure in any of the 248 cases. The one flag left is by design:
Today's Resume button sits under the tab bar on a 568px-tall viewport (the tab bar's own centre
button is the same Resume, with the elapsed clock).

## Complete journeys (browser, real UI)

- **Today Planned → Start workout → Cards → 7 sets of 5 different kinds (ordinary, bodyweight, a
  timed hold started with Start set, cardio) → rest between sets → Next Up navigation → final set →
  "That's the whole workout" prompt → Finish → summary → Today.** Today then read COMPLETED, the
  week tile 1 / 2, recovery 0H for the muscles trained; the workout was saved with 7 sets; no
  console errors.
- **Freestyle:** rest-day Today → Train → Freestyle workout → Add exercise → two sets → finish →
  Today read "Workout completed today." with the freestyle session in history.

## Issues, by severity

**P0 — release blockers:** none found.

**P1 — M1 blockers (fixed)**
- Current Action: a two-digit reps value (10, 12 — i.e. most real sets) pushed the `+` button ~5px
  past the panel. Column split and number size reworked; a panel-overflow check now guards it.

**P2 (fixed)**
- Assisted exercises headed their load "Weight" in the sets grid and Focus; now "Assistance (kg)"
  (stored values untouched).
- Cards' DOM order differed from the visual order (CSS `order`): tags and notes came before Last
  time and the action, the progression line before the grid. The DOM now reads the way the screen
  does, and the `order` rules are gone. Tab order verified: header → Expand → More → Last time
  switch → action steppers → Complete set → grid.
- Contrast (measured, then fixed at the token level, scoped to the running workout and Today):
  `--m1-action-text` lightened (#FF5E41, ≥ 4.5 on every M1 surface); light `--m1-muted` darkened;
  white-on-Action-Red controls set at 19px bold (WCAG large text; the colour is frozen at 3.78:1);
  hero pills lightened instead of darkened; legacy `--label-2/-3` and accent-as-text roles map onto
  M1 text tokens (`--m1-acc-text`, light-theme darkened accent) inside the M1 screens; media
  toggle scrim; body-weight delta colours; light-theme effort chip text.
- A numeric field had no focus indication (`outline:none`); the stepper now shows a focus ring.
- Touch targets: exercise chips, small text buttons, the swipe hint and the media toggle keep their
  look and get a ~44px tap area (the way `.iconbtn`/`.chk` already do).
- Focus's prescription line was hard-coded English ("8 Reps", "Rest 90s") — localised; and set
  `dir="auto"` so "@ 60 kg" is not reordered in Arabic.
- Big names/titles collided at their tight line-height in Devanagari, Bengali, Thai and Arabic.
- SE-class screens (viewport ≤ 700px tall): the strip, name and last-time rows give a little back.
- First-use swipe hint: one compact line instead of a chunky row (gesture code untouched).

**P3 — deferred (documented, not changed)**
- **Focus: Complete on a locked later set.** Kept as is in M1 (the locked treatment stays visual).
  *Deferred product improvement:* disable Complete (or send the dots to the first open set) while a
  set is locked. It changes completion semantics and an 8A.1 characterization test pins it.
- **Focus timed set shows "Load" 0.** It is the same weight field Cards shows for timed rows, and a
  weighted hold (weighted plank) needs it, so it is not hidden.
- Completed rows are dimmed to 45% on purpose; their text is below AA by design.
- Accent-as-text contrast on the screens M1 has not touched (Plan, Progress, Settings…) in light
  theme: the legacy token is the problem and fixing it app-wide is a design decision.
- Effort chips keep the effort scale's own colour (dark theme ~3.5:1); the scale is the signal.
- The sets grid's own stepper buttons are 32×40 (dense by design); the Current Action's are 44.
- Browser theme-colour meta is `#000` / `#f2f2f7`; the M1 canvas is `#111` / `#F5F2EC`. Only
  visible in a browser's address-bar tint (*device*).
- A translated name plus the English original in parentheses (a Settings choice) makes long names
  wrap to 4–6 lines at 320px.
- Today's Resume CTA is below the fold at 568px tall (see above).

## Accessibility

Accessible names: Current Action steppers are "Decrease: Weight (kg)" etc., the action is a real
button with its text, Last time's rows are `aria-hidden` because the switch button's name carries
the same sets, Next Up is a button named "Up next: …". The set check stays `role="checkbox"`.
Reduced motion: the global rule applies; the hold pulse also opts out. Focus ring: every control
shows one; the numeric field via its stepper. Contrast and targets as above.

## Locales

Newly written strings, **not natively reviewed** — please have a speaker check them:
`Hold in progress` (all 17 locales) and `Assistance ({0})` (all 17). `Complete left` /
`Complete right` reuse the repo's existing "Complete left/right side" wording. pt-BR has its own
"Hold in progress" ("Isometria em andamento"). French "Assistance ({0})" is identical to the
English word, which is correct French. Placeholders verified; no English left in the non-Latin
locales; Russian and German long labels wrap cleanly.

## Mobile / native

*Browser, verified:* viewport-fit=cover and the safe-area variables (the native insets are
simulated through the same `--native-sat/--native-sab` variables the shell sets: header clears the
top inset, tab bar and rest dock clear the bottom inset, the page reserves room for the dock);
numeric inputs use `inputmode="decimal|numeric"`; no horizontal overflow at 320px.

*Requires a real device (not claimed):* status-bar area and icon colour on Android/iOS; the native
keyboard helpers and what the numeric keyboard covers in the sets grid; the viewport guard on iOS
after the keyboard closes; wake lock while a workout runs; hardware/gesture back on the workout
and on Coach; the rest timer / alarm and the end-of-rest buzz with the screen off; Web Push
delivery; installed-PWA standalone display; the first-use swipe hint on a touch screen.

## Media

Verified in the browser with stand-in art: catalogue animation (strip, Expand, Minimize), Full /
Small / Off, no media, link-only card, and the Cards strip's layout for uploaded media (the neutral
tile, since uploads are fetched only for a signed-in account). *Requires a real device with
uploaded files:* an uploaded photo (portrait and landscape) and GIF in the 112px strip and
expanded; a short looping clip autoplaying muted in the strip and pausing off screen; a long clip —
first tap opens its controls (the strip grows to 220px) and plays with sound; a long clip leaving
the screen pauses; the link card plus a file together; the phone app's in-memory clip cache.
