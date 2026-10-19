# Claude Code Kickoff — M1 Today + Navigation

Use this document as the initial instruction set when starting M1 implementation in Claude Code.

## Mission

Implement the frozen M1 Today + Navigation design direction in the existing openGym fork.

This is a production translation of an approved visual prototype, not a rewrite.

The governing principle is:

> Reproduce the Lovable experience, not the Lovable code.

## Required reading before changes

Read in this order:

1. `CLAUDE.md`
2. `docs/FORK_ARCHITECTURE.md`
3. `docs/FORK_DESIGN_SYSTEM.md`
4. `docs/M1_IMPLEMENTATION_SPEC.md`
5. `docs/LOVABLE_TRANSLATION_MAP.md`
6. `docs/M1_IMPLEMENTATION_SEQUENCE.md`
7. current `frontend/src/views/Home.jsx`
8. current `frontend/src/components/TabBar.jsx`
9. current workout view/components
10. relevant `frontend/src/store`, `frontend/src/lib`, CSS, mobile and test files

## Before coding

1. Inspect the current architecture and identify every existing behavior touched by Home, TabBar and workout presentation.
2. Run the relevant tests and frontend build.
3. Report the baseline state.
4. Produce a short implementation plan mapped to the phases in `M1_IMPLEMENTATION_SEQUENCE.md`.
5. Identify any conflict between the frozen visual design and existing openGym behavior.

Do not begin by replacing Home.jsx wholesale.

## Hard constraints

Do not:

- migrate persistence
- change sync/revision semantics
- replace Zustand
- introduce Tailwind
- introduce shadcn/ui
- add another UI framework
- change authentication
- change exercise IDs/schema
- reinterpret workout history
- replace the workout engine
- replace existing progression calculations
- require Supabase/Postgres
- require health/wearable data
- copy Lovable fixture values into production
- copy Lovable's prototype reducer/timer into production

If any M1 requirement appears to require one of these, stop and explain the conflict before proceeding.

## Architecture ownership

openGym remains authoritative for:

- schedule resolution
- effective routines
- rotation/queue behavior
- active workout
- workout history
- set state
- timers
- progression
- persistence
- sync
- imports/exports
- auth
- native behavior

UI components should consume those truths, not recreate them.

## Existing behaviors that must survive

Pay special attention to:

- several routines on one weekday
- combined-session Start behavior
- rotation mode
- planner/Coach queues
- day overrides/rescheduling
- today's already-completed workout
- saved-workout editing
- backfill/log-after-the-fact
- connection trouble indicator
- guest/account states
- starter-plan flow
- gym check-in access
- full workout special-set functionality
- native mobile behavior

## Implementation order

Follow `docs/M1_IMPLEMENTATION_SEQUENCE.md`.

Start with:

1. baseline
2. semantic visual tokens
3. primary navigation
4. Today shell/state composition
5. Planned Today
6. Active Today
7. Rest/New User
8. deeper summaries
9. workout visual treatment
10. accessibility/light/native QA

Do not start with Workout Mode.

## Visual target

Use `docs/FORK_DESIGN_SYSTEM.md` and `docs/M1_IMPLEMENTATION_SPEC.md` as the production design source of truth.

Key identity:

- near-black flagship canvas
- warm-white contrast surfaces
- Action Red training hero
- Progress Blue
- restrained Recovery Lime
- asymmetric rounded modules
- oversized primary metrics
- compact labeled bottom navigation
- expressive Today dashboard
- calmer operational workout mode

## Data rules

Never invent a metric merely because it exists in the prototype.

Examples:

- no hard-coded 82 readiness
- no required sleep value
- no hard-coded 72h recovery
- no hard-coded 3/4 weekly completion
- no hard-coded PUSH
- no hard-coded 225 lb
- no fake 58-minute duration

Use real state. If data is unavailable, omit or adapt the visual module.

For Recovery Context, use workout-history-derived information by default. Any non-trivial new derivation belongs in a tested domain helper rather than inside a JSX card.

## Testing expectations

Add or update tests for changed behavior, especially:

- navigation destination mapping
- Train/Resume states
- planned vs active vs rest vs new-user Today state
- multiple effective routines
- rotation/queue cases
- saved-workout editing/backfill distinction
- any new derived metric helper

Run the relevant suite after every behavioral phase.

## First response expected from Claude Code

Before editing, return:

1. baseline test/build result
2. files expected to change in Phases 1–3
3. existing helpers/state that will feed each M1 component
4. risks or behavior conflicts discovered
5. proposed first commit boundary

Then proceed only within the approved M1 architecture.
