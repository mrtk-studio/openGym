// What Today is about, as one word, for the presentation layer (views/Home.jsx).
//
// A thin classifier: it decides nothing about the schedule. Home hands it facts the domain
// helpers already settled — whether a session is open (S.active), whether any routine exists,
// whether the effective routines for today (lib/history.js effectiveRoutines, which already
// folds in rotation, a coach queue and day overrides) came out non-empty, and whether today's
// plan is already covered by a logged workout. Nothing here reads the store or the clock, and
// nothing is recomputed: a wrong answer from here means a wrong fact handed in.
//
//   kind  'active'    a session is open
//         'new-user'  no routines yet, nothing open
//         'planned'   the effective routines for today are not empty
//         'rest'      routines exist, none is on today
//   mode  only for 'active': 'editing' a saved workout (S.active.editingWorkoutId), 'backfill'
//         (a workout logged after the fact), or 'live' — every other open session. Only the
//         first two are not a session in progress; the tab bar draws the same line.
//   done  today already has a logged workout covering the plan (or, on a rest day, any workout).
//         A flag, not a state: a planned day that is done is still a planned day, and Home
//         keeps the row tappable for a second session.
export function classifyToday({ active, hasRoutines, hasPlanToday, doneToday }) {
  const done = !!doneToday
  if (active) return { kind: 'active', mode: active.editingWorkoutId ? 'editing' : active.backfill ? 'backfill' : 'live', done }
  if (!hasRoutines) return { kind: 'new-user', mode: null, done }
  return { kind: hasPlanToday ? 'planned' : 'rest', mode: null, done }
}
