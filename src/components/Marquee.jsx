/* PART 3 (Limuthu Liyanage) · MARQUEE STRIP. Genres and cities scrolling past: every genre and city from the events list.
   The group is written four times so the loop has no gap. Decorative, so screen readers skip it. */
import { Fragment } from 'react';
import { events } from '../data/events.js';

const marqueeWords = [...new Set(events.flatMap((e) => [e.genre, e.city]))];
/* solid, dim and spaced out, outlined */
const marqueeStyles = [(w) => w, (w) => <em>{w}</em>, (w) => <b className="out">{w}</b>];

const group = (copy) => (
  <span key={copy}>
    {marqueeWords.map((word, i) => <Fragment key={word}>{marqueeStyles[i % 3](word)}<i>✦</i></Fragment>)}
  </span>
);

export default function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">{[0, 1, 2, 3].map(group)}</div>
    </div>
  );
}
