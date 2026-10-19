# Lovable → openGym Translation Map

## Purpose

This document prevents prototype architecture from leaking into production.

> Lovable owns appearance. openGym owns truth.

The Lovable M1 prototype is a visual/interaction specification. Production implementation must reuse openGym routes, stores, helpers, state semantics, tests, native behavior, and persistence.

## Component map

| Prototype concept | Production target | Data/logic owner | Rule |
| --- | --- | --- | --- |
| Today screen | `frontend/src/views/Home.jsx` | existing Home/store helpers | Recompose existing data before adding new logic |
| Bottom navigation | `frontend/src/components/TabBar.jsx` | React Router + Zustand active state | Preserve Start/Resume semantics |
| TrainingHero | Home presentation component extracted if useful | `effectiveRoutines`, `effectiveRoutineIds`, active state | Presentation only |
| WeekTile | Home presentation | existing `weekTally`, schedule/history | Do not recalculate domain rules in component |
| RecoveryContextTile | new lightweight presentation component | history helper/selector | Workout-history-derived by default |
| ProgressCard | Today summary component | existing workout/exercise history calculations | Link/defer deeper analysis to Stats |
| VolumeTile | Today summary component | existing history | Only show when derivation is reliable |
| StreakTile | Today summary component | existing `streakWeeks` or appropriate existing helper | No duplicate streak formula |
| InsightCard | Today summary component | existing Coach output/data | One concise insight, no new Coach engine |
| ActiveHero | Today presentation | `S.active` + existing active-workout semantics | Never create second active-session state |
| RestHero | Today presentation | `nextTrainingDay` + history | Lower-energy visual state |
| NewUserHero | Today presentation | existing routines/starter-plan/planning flows | No fake analytics |
| Workout execution UI | existing workout view/components | existing workout engine/store | Visual refactor only unless separately approved |
| Last Time rows | workout presentation | existing history | Read only, no new persistence |
| Rest timer | existing timer/workout state | existing engine | Do not replace with prototype timer logic |
| Weight/reps controls | existing set state | existing workout engine | Preserve all special-set semantics |

## Existing Home logic to preserve

`Home.jsx` already contains important product semantics that the new visual composition must retain, including:

- multiple routines on one weekday
- effective routine resolution
- day overrides/rescheduling
- rotation mode
- coach/planner queue behavior
- active saved-workout editing distinction
- today's completed-workout coverage
- next training day
- weekly tally
- bodyweight flows
- connection-trouble indicator
- starter-plan/new-user flow
- gym check-in access

Do not simplify these rules merely because the prototype uses simpler fixture data.

## Existing navigation logic to preserve

`TabBar.jsx` already distinguishes:

- no active workout
- active live workout
- workout currently open
- saved workout being edited
- backfill/non-live workout
- elapsed live session
- combined effective routines for today's Start
- connection trouble

The visual navigation can change to Today / Plan / Train / Progress / Coach, but these behavioral distinctions must survive.

## Data classification

### Existing production data

Safe foundation for M1:

- routines
- effective daily schedule
- active workout
- workout history
- exercise history
- sets/reps/load
- PR/progression data already supported by openGym
- bodyweight/measurements where already available
- Coach data already available

### Derived production data

May be shown when computed from existing helpers or a small tested helper:

- weekly completion
- hours/days since a muscle or exercise was trained
- recent volume change
- consistency/streak
- workout completion percentage

Derived calculations belong in `frontend/src/lib` or existing domain helpers, not in visual components, when they are non-trivial or reused.

### Optional future data

Must not be required by M1:

- sleep
- HRV
- wearable recovery scores
- Apple Health recovery context
- Health Connect recovery context
- synthetic readiness score

UI may be designed to accept these later through an adapter.

## Route translation

Prototype labels map to existing application destinations:

- Today -> `/home`
- Plan -> `/plan`
- Train -> existing start/resume handler
- Progress -> `/stats`
- Coach -> existing Coach route

Exercise Library remains available through contextual entry points and its existing route. Do not delete `/library`.

## Styling translation

Do not copy prototype Tailwind/shadcn classes.

Translate the frozen visual system into the existing openGym CSS/token approach:

1. introduce/adjust semantic CSS variables
2. create narrowly scoped M1 classes
3. reuse existing Icon component
4. reuse existing button primitives where they can meet the visual target without semantic regression
5. avoid inline-style proliferation during the redesign
6. avoid introducing a second CSS architecture

## Prototype behavior that must NOT become production logic

Do not copy:

- fixture workout values
- prototype timer implementation
- prototype set reducer/state
- hard-coded PUSH assumptions
- hard-coded Chest recovery
- hard-coded 72h
- hard-coded 3/4 week
- hard-coded 225 lb progression
- hard-coded 58-minute duration

All visible values must come from real state or be omitted when unavailable.

## Workout translation rule

The frozen Workout Mode prototype establishes hierarchy and ergonomics, not a replacement workout engine.

Before changing workout presentation, inventory all current modes that share the view:

- normal live workout
- editing saved workout
- backfill/log-after-the-fact
- warmups
- supersets
- drop sets
- rest-pause
- pyramids/progression modes
- exercise swaps/reordering
- timers

A visual change is acceptable only if those modes remain functionally intact.

## Review rule

When the prototype and existing openGym behavior disagree:

1. preserve openGym behavior
2. reproduce the visual intent around that behavior
3. add a documented adaptation if needed
4. do not silently remove capability to achieve pixel similarity
