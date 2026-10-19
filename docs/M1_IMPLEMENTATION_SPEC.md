# M1 Implementation Specification — Today + Navigation

## Status

**M1 visual direction: frozen for implementation.**

The approved Lovable prototype is a visual and interaction reference. It is not production architecture and its code must not be copied wholesale.

Core rule:

> Reproduce the Lovable experience, not the Lovable code.

openGym remains the source of truth for workout state, persistence, sync, calculations, history, scheduling, authentication, imports/exports, and native behavior.

## Scope

M1 changes the mobile presentation of:

1. Today / Home
2. Bottom navigation
3. Planned workout state
4. Active workout state
5. Rest-day state
6. New-user state
7. Supporting Today metrics
8. Workout execution visual treatment
9. Light-mode validation

M1 does **not** introduce a database migration, new persistence model, new sync protocol, new authentication flow, new workout engine, or required health integration.

## Frozen information architecture

Primary mobile navigation:

`TODAY · PLAN · TRAIN · PROGRESS · COACH`

Production mapping:

- Today -> `/home`
- Plan -> `/plan`
- Train -> existing Start/Resume workout behavior
- Progress -> `/stats`
- Coach -> existing Coach destination

Exercise Library becomes contextual/secondary navigation rather than a permanent primary tab. Do not remove its route or functionality.

## Visual foundation

Use `docs/FORK_DESIGN_SYSTEM.md` as the token and visual-language source of truth.

Flagship dark direction:

- near-black canvas
- warm-white contrast surfaces
- Action Red training hero
- Progress Blue analysis/progression
- Recovery Lime used selectively
- large rounded modules
- oversized primary metrics
- asymmetric composition
- minimal visible borders

Do not add Tailwind, shadcn/ui, a second state manager, or a new general-purpose component framework to production.

## Today — Planned

First viewport priority:

1. contextual header/greeting
2. Today's Training hero
3. Start Workout
4. This Week metric
5. Recovery Context metric
6. bottom navigation

Approved hero content model:

- state label: Today's Training
- routine/session name, e.g. PUSH
- muscle/focus summary where available
- exercise count
- estimated duration only if production can derive it honestly; otherwise omit it
- Start Workout
- scheduled/status treatment

The hero must use existing effective-routine logic. A weekday can contain multiple routines, so the production component must support the existing combined-session behavior rather than assuming one routine.

### Weekly metric

Use existing workout/schedule history. The existing `weekTally` behavior is the starting point for done/planned values.

### Recovery Context

Default M1 recovery context must be workout-history-derived, not medical.

Example presentation:

`RECOVERY / CHEST / 72H / SINCE TRAINED`

Do not require sleep, HRV, Apple Health, Health Connect, or a synthetic readiness score for M1. Future health data may replace/enrich this through an adapter later.

## Today — Active

Active Today must look structurally different from Planned.

Required hierarchy:

- WORKOUT IN PROGRESS
- elapsed time
- session/routine name
- completed exercises / total exercises
- segmented or equivalent progress visualization
- CURRENT
- current exercise
- current set / total sets
- Resume Workout

The existing active workout state remains authoritative. Do not create duplicate session state for Today.

The center navigation label becomes Resume while an active live workout exists.

## Today — Rest Day

Rest Day uses lower visual energy than a training day.

Required hierarchy:

- REST DAY
- Recover
- next workout, when the existing scheduling logic can determine it
- recent meaningful progress, when available
- optional Coach context

Do not display a fake training hero or synthetic recovery score.

Use existing `nextTrainingDay` logic rather than recreating scheduling calculations in UI components.

## Today — New User

The dashboard grows with the user's data. Do not render empty analytics.

Required primary flow:

1. Choose a routine
2. Choose training days
3. Start first workout

Primary CTA: Choose a routine / enter existing planning or starter-plan flow.

A small explanation may tell the user that progress information appears after workouts are logged.

Do not fabricate readiness, progress, volume, streaks, or PRs.

## Deeper Today content

Below the first viewport, Today may summarize:

- one meaningful progression card
- volume change if safely derivable
- consistency/streak if safely derivable
- one concise Coach insight

Today must not become a replacement for Progress/Stats.

## Workout execution visual treatment

Workout mode is operational, not dashboard-like.

Priority order:

1. current exercise
2. previous performance
3. current set
4. weight
5. reps/duration
6. Complete Set
7. rest state
8. next exercise

Previous performance should expose useful recent set context using existing history data, for example:

- Set 1: 215 × 8
- Set 2: 220 × 8
- Set 3: 220 × 7

Do not alter the semantics of the existing workout engine, active exercise ordering, set logging, progression logic, timers, supersets, drop sets, rest-pause, pyramids, warmups, workout editing, or backfill behavior merely to match the prototype.

Critical controls should target at least ~44px practical touch size. Numeric controls should remain fast for one-handed use.

## Navigation behavior

Preserve existing Start/Resume semantics from `TabBar.jsx`.

Planned:

- hero: Start Workout
- nav: Train

Active live session away from workout:

- hero: Resume Workout
- nav: Resume, with elapsed context if retained cleanly

On workout screen:

- do not create a competing Resume action
- preserve existing full-screen workout/navigation behavior defined by the app shell

Connection-trouble signaling currently attached to Home/Settings must remain discoverable after the visual navigation change.

## Accessibility

- strong contrast
- visible focus states
- primary navigation labels remain visible
- critical controls ~44px minimum practical target
- color is never the sole signal
- reduced-motion support
- charts/visual metrics retain textual values
- scalable text must not break set-entry controls

## Light mode

Light mode is intentionally art-directed, not a direct inversion.

Use warm off-white canvas with deliberate ink/graphite modules plus saturated Action Red and Progress Blue. Validate all M1 states structurally even though dark mode is the flagship.

## Architecture constraints

### GREEN — presentation work

Safe to change freely within M1:

- layout
- design tokens
- navigation presentation
- card composition
- typography
- spacing
- icon presentation
- visual progress indicators
- Today information hierarchy

### YELLOW — integrate carefully

- `Home.jsx`
- `TabBar.jsx`
- workout view presentation
- Zustand selectors/reads
- history-derived metrics
- Coach presentation
- timers
- mobile/native layout behavior

Add or update tests when behavior-facing code is touched.

### RED — preserve

Do not rewrite for M1:

- persistence
- sync/revision merging
- import/export
- workout-history interpretation
- exercise ID compatibility
- authentication
- migration behavior
- core progression calculations
- active workout semantics

## Acceptance criteria

M1 is complete when:

- Today clearly distinguishes Planned, Active, Rest Day, and New User
- planned Start uses existing effective-routine behavior
- Active uses existing active workout state, with no duplicate session store
- Train/Resume navigation preserves current semantics
- weekly status comes from existing history/schedule logic
- recovery context is history-derived by default
- no health integration is required
- new users see no fabricated analytics
- workout execution remains functionally compatible with all existing workout modes
- dark and light modes remain usable
- mobile controls are thumb-friendly
- no persistence/sync/auth/schema migration is introduced
- existing relevant tests pass
- new tests cover changed state/navigation behavior
- the implementation visually matches the frozen M1 direction without importing Lovable's framework architecture
