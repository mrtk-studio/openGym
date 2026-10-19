// "Last time" (or the best set), the sets it was made of, as compact rows under the exercise. The
// head is the reference line's own button — the switch between last time and best set, with its
// text and accessible name — drawn as a caption; the rows are the same sets it lists, one per row.
// Nothing here reads history: the caller passes the labels the reference line already formats
// (history.js setLabel over lastEntryFor / bestSetFor).
//
//   head   the reference-line button node            rows    the set labels, in order
//   single the sets read as one line, not a table (cardio)
const spaced = label => label.replace(/(\S)×(\S)/g, '$1 × $2')

export default function WorkoutLastTime({ head, rows, single, dirOf }) {
  if (!head) return null
  return <div className="m1-lt">
    {head}
    {rows.length > 0 && (single
      ? <div className="m1-lt-one" aria-hidden="true"><bdi dir={dirOf(rows[0])}>{spaced(rows.join(', '))}</bdi></div>
      : <ol className={'m1-lt-rows' + (rows.length > 4 ? ' cols' : '')} aria-hidden="true">
        {rows.map((l, i) => <li key={i}><span className="m1-lt-n">{i + 1}</span><bdi dir={dirOf(l)}>{spaced(l)}</bdi></li>)}
      </ol>)}
  </div>
}
