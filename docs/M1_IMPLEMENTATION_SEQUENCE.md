# M1 Controlled Implementation Sequence

## Objective

Implement the frozen Today + Navigation visual direction without destabilizing openGym's workout engine, persistence, sync, scheduling, or mobile behavior.

Work in small, reviewable phases. Do not combine all M1 changes into one redesign commit.

## Phase 0 — Baseline

Before editing UI:

- read `CLAUDE.md`
- read `docs/FORK_ARCHITECTURE.md`
- read `docs/FORK_DESIGN_SYSTEM.md`
- read `docs/M1_IMPLEMENTATION_SPEC.md`
- read `docs/LOVABLE_TRANSLATION_MAP.md`
- inspect current Home, TabBar, workout view, relevant CSS, Icon, UI primitives, history helpers, rotation/queue logic, and tests
- run the existing relevant test suite
- run/build the frontend
- record any pre-existing failures before changing code

Do not begin implementation if the baseline is already failing without first documenting the failure.

## Phase 1 — Semantic visual tokens

Implement the frozen visual foundation in the existing CSS architecture.

Add semantic tokens for:

- canvas
- elevated dark surfaces
- warm contrast surface
- action red
- progress blue
- recovery lime
- clay/supporting accent
- muted data/text
- hero/standard/compact radii
- page/card spacing

Requirements:

- preserve existing theme mechanics
- dark flagship
- light-mode equivalents
- no Tailwind
- no shadcn
- no new CSS framework
- no domain behavior changes

Verify existing screens do not become unusable from token changes.

## Phase 2 — Bottom navigation

Refactor visual/navigation composition to:

`Today · Plan · Train · Progress · Coach`

Preserve existing Start/Resume logic in `TabBar.jsx`.

Required behavioral cases:

- no active workout
- planned workout available
- active live workout away from workout screen
- workout screen open
- saved workout editing
- backfill/non-live workout
- connection trouble

Library route/functionality remains available outside primary tabs.

Add/update navigation tests before moving on.

## Phase 3 — Today shell and state model

Refactor Home presentation without deleting its existing behavior.

Create a clear presentation-level state decision for:

- new user
- active live workout
- planned workout
- rest day
- completed-today edge cases
- existing rotation/queue cases

Do not duplicate scheduling logic. Reuse current helpers.

Keep secondary existing Home capabilities reachable even if their presentation moves below the main command-center content.

## Phase 4 — Planned Today

Implement:

- editorial header
- Training Hero
- real session/routine name
- muscle/focus summary when safely available
- real exercise count
- duration only if honestly derivable
- Start Workout
- weekly completion tile
- workout-history-derived Recovery Context tile

Do not hard-code prototype fixture values.

Validate multiple routines scheduled on one day.

## Phase 5 — Active Today

Implement transformed Active Hero using existing `S.active` state.

Required:

- elapsed live time
- workout/session name
- exercise completion
- current exercise
- current set
- Resume Workout

Do not create a second timer or active-session reducer.

Validate saved-workout editing and backfill do not masquerade as a live session.

## Phase 6 — Rest Day and New User

### Rest Day

Use existing `nextTrainingDay` behavior where applicable.

Show:

- Recover state
- next session when known
- recent progress only when real data exists
- optional existing Coach context

### New User

Use existing starter-plan/planning flows.

Show the three-step orientation without fake metrics.

Verify empty routines, rotation-without-routines, and guest/account states.

## Phase 7 — Deeper Today summaries

Add only after the command center is stable.

Candidates:

- one Progress summary
- volume change
- streak/consistency
- one Coach insight

Rules:

- reuse existing helpers where possible
- put non-trivial new derivations in tested `lib` helpers
- omit a card when its real data is unavailable
- Today remains a summary, not a duplicate Stats page

## Phase 8 — Workout visual treatment

Do this last because it has the highest behavioral risk.

First inventory the existing workout view and tests.

Then translate the frozen hierarchy:

- current exercise
- Last Time context
- current set
- load/reps controls
- Complete Set
- rest
- next exercise

Preserve every supported workout mode and active-state behavior.

Do not copy the Lovable prototype's local reducer/timer.

Add regression tests for any behavior-facing changes.

## Phase 9 — Light mode, accessibility, native/mobile QA

Validate:

- light-mode art direction
- 320–430px phone widths
- safe-area behavior
- iOS/Capacitor system-bar behavior
- keyboard/numeric input behavior
- 44px practical critical touch targets
- reduced motion
- focus visibility
- long translated labels
- French and English
- no bottom-nav overlap
- active workout wake-lock/full-screen behavior remains intact

## Phase 10 — M1 verification

Run full relevant tests and build.

Manual scenarios:

1. brand-new user
2. planned single-routine day
3. planned multi-routine day
4. rest day
5. active workout
6. leave workout and Resume from Today
7. Resume from nav
8. finish today's workout
9. rotation schedule
10. planner/Coach queue
11. saved-workout editing
12. backfill
13. dark mode
14. light mode
15. connection trouble indicator
16. French labels

## Commit discipline

Prefer one logical commit per phase or cohesive sub-phase.

Examples:

- `style: add M1 semantic visual tokens`
- `feat: align primary navigation with M1 IA`
- `feat: add planned Today command center`
- `feat: add active Today session state`
- `feat: add rest and new-user Today states`
- `feat: add Today progress summaries`
- `style: translate workout execution to M1 hierarchy`
- `test: cover M1 Today and navigation states`

## Stop conditions

Stop and document before proceeding if implementation appears to require:

- persistence migration
- sync protocol change
- auth change
- exercise ID/schema change
- workout-history reinterpretation
- replacing the active workout model
- replacing existing progression logic
- mandatory health/wearable integration
- a new state-management framework

Those are outside M1 and require a separate architectural decision.
