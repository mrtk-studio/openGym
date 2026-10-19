# Fork Architecture & Customization Contract

## Purpose

This fork turns openGym into a mobile-first personal training system while preserving the upstream project's proven workout engine, offline behavior, sync, import/export compatibility, and native packaging.

The product experience may diverge substantially from upstream. The underlying training and persistence engine should diverge as little as practical.

## Product direction

The primary product surface is mobile. The target top-level experience is:

1. **Today** — today's training, readiness/recovery context, weekly consistency, and useful recent progress.
2. **Train** — fast, one-handed workout execution and resume behavior.
3. **Plan** — routines, schedule, programming, and exercise management.
4. **Progress** — history, strength, measurements, body composition, muscle/recovery views.
5. **Coach** — explain, detect, recommend, and propose changes; user approval remains required before training-plan changes are applied.

The existing application already contains most underlying capabilities. Prefer recomposition and presentation of existing data over new persistence fields.

## Architecture observed at fork baseline

- React 19 + Vite frontend using React Router.
- A single persisted Zustand store in `frontend/src/store/useStore.js`; ephemeral UI state is separated in `useUI.js`.
- Domain/training logic is concentrated in framework-free helpers under `frontend/src/lib`, with colocated tests.
- Existing routes include Home, CheckIn, Plan, RoutineEdit, Workout, Stats, History, Library, Muscles, StructuralBalance, ProgressPhotos, Measurements, Settings, Coach, and Admin.
- `TabBar.jsx` currently exposes Home, Plan, a central Start/Resume action, Stats, and Exercises.
- Active workouts deliberately suppress the normal tab bar and own the full screen.
- Capacitor wraps the same frontend for native Android/iOS. Native-only behavior is gated through the mobile layer.
- Server persistence remains file-based. Client state is local-first and synced when applicable.
- The codebase is intentionally dependency-light.

## Change zones

### GREEN — safe to customize aggressively

These areas define our product identity and may diverge substantially:

- visual design system and CSS
- typography, spacing, surfaces, icon presentation, motion
- page composition and information hierarchy
- dashboard/Today presentation
- navigation labels and presentation
- new presentational components
- progress visualization using existing derived data
- onboarding presentation
- Coach presentation layer
- empty/loading/error-state presentation

Even in GREEN areas, preserve accessibility and existing behavioral contracts.

### YELLOW — change with architectural review and tests

These areas connect presentation to product behavior:

- `frontend/src/store/useStore.js`
- workout execution views
- routine editing
- `App.jsx` routing/shell behavior
- `TabBar.jsx` navigation behavior
- AI Coach request/proposal flows
- exercise catalogue behavior
- notifications and timers
- Capacitor/native integration
- API endpoints
- analytics/recovery/history derivations

Before modifying a YELLOW area: identify the existing contract, reuse existing helpers where possible, and add/update tests for behavioral changes.

### RED — protected core initially

Do not redesign or replace these systems without an explicit architecture decision:

- persistence format and storage architecture
- server/client synchronization protocol
- revision/conflict/adoption behavior
- backup/import/export compatibility
- workout history interpretation
- exercise identifiers and catalogue compatibility
- authentication/passkey behavior
- progression calculations
- 1RM calculations
- workout completion/session reduction
- core recovery calculations
- native durability/backup behavior

A visual requirement is not sufficient reason to modify RED code.

## Lovable boundary

Lovable is a UI/product prototyping environment for this fork, not the architecture owner.

Lovable may propose or generate:

- screens
- visual components
- design tokens
- dashboard modules
- cards/charts
- navigation concepts
- interaction prototypes
- responsive/mobile layouts

Lovable output must not be allowed to independently replace or restructure:

- `frontend/src/store/`
- core `frontend/src/lib/` domain logic
- `api/`
- `mcp/`
- persistence/sync/auth
- migrations
- Capacitor/native configuration

Approved Lovable concepts should be integrated into the existing architecture rather than importing a parallel app architecture.

## Claude Code responsibility

Claude Code is the primary implementation agent. It should:

- understand existing behavior before editing
- integrate approved UI into existing state/domain contracts
- protect RED areas
- minimize upstream conflicts
- preserve dependency-light architecture
- add tests when behavior changes
- avoid broad cleanup/refactors unrelated to the requested feature

## Independent review responsibility

A second coding/review agent should review meaningful changes for:

- unnecessary divergence from upstream
- accidental persistence/schema changes
- duplicated domain logic in React components
- missing tests
- mobile regressions
- accessibility regressions
- dependency creep
- opportunities to reuse existing helpers/components

## Dependency policy

Do not introduce Tailwind, shadcn/ui, a new state manager, a charting framework, or another general UI framework merely to accelerate redesign work.

New dependencies require a concrete capability that is impractical to implement with the existing stack and should be reviewed before installation.

## Data policy

Do not migrate persistence to Supabase/Postgres during the initial customization phase.

New screens should first derive information from existing state. New persisted fields require a clear product need, compatibility analysis, default/migration behavior, import/export consideration, and tests.

## Mobile-first implementation rules

- Design for phone width first, then expand.
- Primary workout actions must be reachable one-handed.
- Workout entry should minimize taps and keyboard transitions.
- Respect iOS/Android safe areas and keyboard behavior.
- Preserve wake-lock, timer, notification, and active-workout behavior.
- Test important workout flows on a real device before considering them complete.
- Offline operation must remain a first-class behavior.

## Upstream strategy

`main` is the clean/stable fork line. `develop` is the integration branch for our product work.

Keep custom features modular and avoid gratuitous file moves so upstream changes remain reviewable. When syncing upstream, merge/rebase into a dedicated sync branch first, run the complete test suite, resolve conflicts deliberately, then integrate into `develop`.

## First implementation sequence

1. Establish this architecture contract and baseline.
2. Define the fork product/design system without changing core behavior.
3. Recompose Home into a mobile-first **Today** experience using existing data.
4. Refine top-level navigation while preserving Start/Resume semantics.
5. Improve workout execution ergonomics without changing workout calculations.
6. Recompose Stats/History/measurements into **Progress**.
7. Refine Coach presentation and context surfacing.
8. Use the fork for real workouts and collect friction before changing storage or core domain behavior.

## Non-goals for the first phase

- Supabase/Postgres migration
- authentication rewrite
- workout engine rewrite
- progression rewrite
- sync rewrite
- wholesale component-library replacement
- new backend framework
- broad TypeScript migration
- commercial re-licensing assumptions

## Definition of safe change

A change is safe when it improves the product experience while preserving existing workout records, calculations, sync/import/export behavior, native durability, offline operation, and the ability to understand upstream diffs.
