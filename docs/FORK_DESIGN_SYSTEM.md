# openGym Fork Design System

## 1. Design intent

The fork should feel like a **personal training dashboard with editorial confidence**, not a conventional bodybuilding tracker and not a gamified fitness app.

Visual north star: bold modular mobile interfaces with large rounded surfaces, oversized metrics, asymmetric card composition, near-black foundations, warm light surfaces, and saturated blocks of color.

The design should communicate:

- focused
- personal
- energetic
- intelligent
- tactile
- modern
- visually memorable

It should not feel:

- gamer-like
- neon cyberpunk
- clinical/medical
- corporate SaaS
- dense like a spreadsheet
- like a generic component library
- like a clone of the visual reference

The principle is **bold information, calm structure**.

---

## 2. Product experience principles

### Training first

The app exists to help the user train. During a workout, visual decoration yields to speed, readability, and large touch targets.

### One useful answer per module

Each card should answer one question clearly. Examples:

- What am I training today?
- How ready am I?
- Am I on track this week?
- Did this lift improve?
- What should I do next?

Avoid cards containing several unrelated metrics merely because space is available.

### Data becomes visual objects

Important information should not default to label/value rows. Use scale, proportion, progress fills, blocks, bars, rings, timelines, and strong typography.

### Hierarchy through contrast

Not every card should look equal. Primary modules can be large and saturated. Secondary modules can be compact and quiet. Supporting information should recede.

### Personality without gamification

Progress can feel rewarding through color, motion, scale, milestones, and composition. Avoid coins, XP, trophies everywhere, avatars, artificial levels, or manipulative streak pressure.

---

## 3. Mobile information architecture

Target top-level navigation:

**Today · Plan · Train · Progress · Coach**

Train remains the central action and preserves openGym's existing Start/Resume behavior.

### Today

Daily command center. Shows today's planned training, readiness/recovery context when available, weekly consistency, recent meaningful progress, and relevant Coach insight.

### Plan

Schedule, routines, programming, exercise library, and workout preparation.

### Train

Central action. Starts today's programmed workout when one exists, otherwise opens workout selection. During an active session it becomes Resume.

### Progress

History, statistics, PRs, strength trends, measurements, photos, muscle balance, and recovery/fatigue views.

### Coach

Conversation, explanation, recommendations, detected patterns, and proposed programming changes.

Exercises should not consume a permanent top-level navigation slot. They belong contextually inside Plan and Train.

---

## 4. Color system

The palette should use strong contrast and a limited number of purposeful accents.

### Foundation

- **Ink 950** `#111111` — primary dark background
- **Ink 900** `#181818` — elevated dark surface
- **Ink 800** `#242424` — secondary dark surface
- **Warm 50** `#F5F2EC` — warm light surface
- **White** `#FFFFFF` — maximum contrast/text where needed
- **Graphite** `#3B3A38` — secondary text on light surfaces

Avoid cold blue-gray neutrals as the dominant base.

### Functional accents

- **Action Red** `#F04427` — training, primary action, active workout, high-energy modules
- **Progress Blue** `#4D68E8` — progression, statistics, strength development
- **Recovery Lime** `#B9F24A` — positive readiness/recovery/PR state, used sparingly
- **Clay** `#A94E35` — warm supporting accent, lower-intensity training surfaces
- **Soft Gray** `#A7A7A5` — neutral progress/inactive data

These values are starting tokens, not a requirement to reproduce the reference image exactly. Validate contrast before implementation.

### Color rules

1. One dominant saturated color per major module.
2. Do not make every card colorful.
3. Red means action/training intensity, not generic error.
4. Blue means progress/analysis.
5. Lime is a reward signal and should remain rare.
6. Destructive states require their own accessible treatment and must not rely only on the Action Red token.
7. Charts should normally use one emphasized series plus subdued context rather than rainbow palettes.

---

## 5. Typography

Use the existing dependency-light architecture. Prefer system/native font stacks unless a deliberate product-font decision is made later.

Typography should feel editorial through **scale and spacing**, not decorative typefaces.

### Scale

- Display metric: 48–64px, 600–700 weight
- Hero title: 32–40px, 600–700
- Page title: 26–32px, 600–700
- Card metric: 30–42px, 600–700
- Card title: 17–20px, 600
- Body: 15–17px, 400–500
- Label: 12–14px, 500–600
- Micro: 11–12px, 500

Use tabular numerals for rapidly changing workout values where supported.

### Typography rules

- Metrics should often be larger than their labels.
- Do not uppercase long text.
- Small uppercase may be used for compact section labels.
- Avoid excessive bold text inside a single card.
- Use short labels. Prefer `This week` over explanatory sentences.

---

## 6. Grid and spacing

Design phone-first around a flexible 4-column mental grid.

### Page

- Horizontal gutter: 16px
- Compact screen gutter: minimum 12px
- Section gap: 24–32px
- Card gap: 10–12px

### Internal spacing

- Large card: 20–24px
- Standard card: 16–20px
- Compact metric card: 14–16px

Use generous negative space inside important modules. Do not solve density by reducing everything to tiny text.

---

## 7. Shape language

Large radius is part of the identity.

- Hero cards: 28–32px
- Standard cards: 22–26px
- Compact cards: 18–22px
- Buttons: 16–22px or pill where semantically appropriate
- Icon controls: circular

Avoid applying the exact same radius to every element. Nested controls should normally have a smaller radius than their parent surface.

Borders should be rare. Prefer contrast between surfaces. On dark-on-dark modules, use subtle tonal separation before adding visible strokes.

---

## 8. Card families

Do not create one universal dashboard card and reuse it everywhere. Build a small family of purposeful modules.

### Hero Training Card

Used for today's workout.

Contains:

- training title
- muscle/focus summary
- exercise count
- estimated duration when available
- clear Start/Resume action
- optional minimal readiness context

This should be the strongest object on Today.

### Metric Tile

Used for one high-signal number such as weekly workouts, readiness, volume change, or bodyweight trend.

Structure:

- short label
- oversized value
- optional compact delta/context

### Progress Card

Used for a lift or measurable training trend.

Structure:

- exercise/metric name
- current performance
- delta
- visual progress/trend
- optional next target

### Insight Card

Used for Coach or derived observations.

One observation, one explanation, one optional action. Avoid chat-sized paragraphs on Today.

### Chart Card

Charts should be visually dominant rather than trapped inside dense analytics chrome.

Use direct labels where possible. Reduce legends. Emphasize the current or selected value.

### List Card

For routines, history, exercises, or secondary navigation. Use larger rows and clearer grouping than traditional settings tables.

---

## 9. Today screen composition

Today should feel composed, not like a feed of interchangeable widgets.

Recommended initial order:

1. greeting/context header
2. Hero Training Card
3. two-column weekly consistency + readiness row
4. Progress section with one meaningful lift/progression card
5. secondary volume/streak or recovery modules
6. Coach insight when useful

The screen should adapt when data is missing.

### No workout planned

The hero becomes a purposeful planning/start state, not an empty error.

### Active workout

The hero becomes Resume and exposes elapsed/session context.

### Rest day

Today should recognize the rest day and prioritize recovery, recent progress, and next planned session.

### New user

Reduce the number of empty analytics cards. Prioritize creating/choosing a routine and completing the first workout.

---

## 10. Navigation

Bottom navigation remains optimized for thumb reach.

Target:

`Today   Plan   [Train]   Progress   Coach`

### Train control

- visually distinct from passive destinations
- centered
- large enough for confident thumb use
- preserves Start/Resume semantics
- active workout state should be obvious without becoming distracting

Do not turn it into an oversized floating button that obscures content.

Labels remain visible. Icons alone are not sufficient for primary navigation.

---

## 11. Workout execution mode

Workout mode is not a dashboard. It is an operational interface.

Priorities, in order:

1. current exercise
2. current set
3. weight/reps/duration input
4. previous performance
5. complete-set action
6. rest state
7. next exercise/context

### Ergonomic rules

- primary set controls belong in the lower reachable portion of the screen
- minimum practical touch target around 44px
- numeric inputs should invoke appropriate keyboards
- minimize modal hopping during set entry
- previous-set information should be visible without navigating away
- suggested values must look like suggestions, not recorded values
- completion feedback should be immediate but restrained
- rest timer must remain legible from a quick glance

During a workout, reduce decorative card variety. Use the design language more quietly so interaction remains predictable.

---

## 12. Progress visualization

Progress should feel visual and understandable before it feels analytical.

Prefer:

- large current value
- direct delta
- compact trend
- PR markers
- target relationship
- selected-period context

Avoid dashboards containing many miniature charts.

One strong chart is preferable to four weak charts.

Existing openGym history, statistics, heatmap, muscle, structural-balance, measurement, and photo capabilities should be recomposed before inventing new analytics.

---

## 13. Motion

Motion should reinforce state changes.

Good uses:

- set completion
- progress fill
- card expansion
- tab transition
- PR confirmation
- workout start/finish
- Coach proposal reveal

Motion should normally be 150–300ms and should respect reduced-motion preferences.

Avoid continuous decorative animation during training.

---

## 14. Icons

Use a consistent icon language already compatible with the project.

- simple
- readable at 20–24px
- mostly outline/monoline
- filled state permitted for active navigation

Do not mix emoji into core UI controls.

---

## 15. Charts

Charts should follow the same visual hierarchy as cards.

- thick enough marks for phone viewing
- minimal grid lines
- direct annotation of important points
- one primary accent
- secondary history in muted neutral
- tooltip/tap state with a large readable value

Never depend solely on color to distinguish states.

---

## 16. Light and dark modes

Dark is the visual flagship, but the design system must remain structurally valid in light mode.

Dark mode:

- near-black canvas
- warm white contrast cards
- saturated red/blue modules

Light mode:

- warm off-white canvas
- true/near black high-contrast modules
- retain saturated accents

Do not simply invert every color.

---

## 17. Accessibility

- WCAG-conscious text contrast
- minimum practical 44px touch targets for critical controls
- visible focus treatment
- text labels for primary navigation
- color never carries meaning alone
- support reduced motion
- scalable text should not destroy workout controls
- charts require textual values/context

---

## 18. Component implementation strategy

Do not import a general-purpose design system to achieve this look.

Create lightweight fork primitives only where repeated patterns justify them, for example:

- `MetricTile`
- `TrainingHero`
- `ProgressCard`
- `InsightCard`
- `SectionHeader`
- `DataBar`

Keep domain calculations outside these components. Components receive already-derived values or use existing selectors/helpers.

Avoid a giant configurable `Card` component with dozens of props.

---

## 19. Lovable usage rules

When this design direction is explored in Lovable:

- provide the visual reference alongside this document
- design mobile first
- prototype Today before the rest of the app
- use realistic workout data
- preserve the five-destination IA
- preserve central Start/Resume behavior
- do not invent backend/data models
- do not redesign authentication, sync, or persistence
- do not add Tailwind/shadcn requirements to production architecture
- treat Lovable output as an approved visual/interaction specification to integrate into openGym

Lovable should show states for planned workout, active workout, rest day, and new user rather than only one perfect populated dashboard.

---

## 20. First design milestone

### M1 — Today + Navigation Foundation

Deliverables:

1. visual tokens
2. bottom navigation
3. Today header
4. Hero Training Card
5. weekly consistency metric
6. readiness/recovery metric using existing data where possible
7. one Progress Card
8. one Coach Insight pattern
9. empty/new-user state
10. active-workout Resume state
11. dark-mode primary design
12. light-mode structural validation

### M1 constraint

M1 must not require a persistence migration, sync change, authentication change, or workout-engine rewrite.

---

## 21. Design review checklist

A design is ready for implementation when:

- the main action is obvious in under two seconds
- the user can understand today's training without scrolling
- important metrics are readable at a glance
- card variety feels intentional rather than random
- the interface remains usable with one hand
- visual energy comes from hierarchy/color, not clutter
- the workout screen is simpler than the dashboard
- empty states remain useful
- the design does not require invented data
- the implementation can reuse existing openGym domain logic
- the result feels like this fork, not like a generic fitness template
