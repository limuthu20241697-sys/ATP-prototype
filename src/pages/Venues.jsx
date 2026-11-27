/* ===== PART 4 (Hansadi) · VENUES PAGE. One card per venue, built from the events list:
   the venue's photo, its city, the events coming up there, and a "Get directions" link that opens the route in Google Maps. ===== */
import { Link } from 'react-router-dom';
import { events } from '../data/events.js';
import { artPath, dayMonth, toDate } from '../lib/format.js';
import { usePageMeta } from '../hooks/usePageEffects.js';

/* PART 4 (Hansadi) · Group the events by venue, so each venue appears once with all of its dates. */
const venueList = [];
events.forEach((e) => {
  let v = venueList.find((item) => item.venue === e.venue && item.city === e.city);
  if (!v) {
    v = { venue: e.venue, city: e.city, art: e.art, shows: [] };
    venueList.push(v);
  }
  v.shows.push(e);
});

/* PART 4 (Hansadi) · A Google Maps link that shows the route from where the visitor is to the venue. */
const routeLink = (v) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${v.venue}, ${v.city}, Sri Lanka`)}`;

/* PART 4 (Hansadi) · One venue card. */
function VenueCard({ v }) {
  return (
    <article className="venue-card">
      <div className="photo"><img src={artPath(v)} alt="" width="1800" height="1200" loading="lazy" /></div>
      <div className="venue-card-body">
        <p className="feature-meta">{v.city}, Sri Lanka</p>
        <h2>{v.venue}</h2>
        <ul className="venue-shows" aria-label={`Coming up at ${v.venue}`}>
          {v.shows.map((e) => <li key={e.name}><time dateTime={e.date}>{dayMonth.format(toDate(e))}</time> {e.name}</li>)}
        </ul>
        <div className="venue-actions">
          <a className="btn btn-primary" href={routeLink(v)} target="_blank" rel="noopener">Get directions <span className="sr-only">(opens Google Maps)</span></a>
          <Link className="btn btn-line" to={`/events.html?q=${encodeURIComponent(v.venue)}`}>See events</Link>
        </div>
      </div>
    </article>
  );
}

export default function Venues() {
  usePageMeta('Venues · Void', 'Every venue on Void, with what is on there and directions to get there.');

  return (
    <section className="discover discover-page" aria-labelledby="venuesTitle">
      <p className="giant giant-bg" aria-hidden="true">VENUES</p>
      <div className="wrap">
        <p className="back"><Link to="/"><span aria-hidden="true">←</span> Back to home</Link></p>
        <div className="head">
          <div>
            <p className="eyebrow">Where it happens</p>
            <h1 id="venuesTitle">Spaces worth <em>showing up for</em></h1>
          </div>
          <p className="result-count" id="venueCount">{venueList.length} venues / Sri Lanka</p>
        </div>
        <div className="venue-grid" id="venueGrid">
          {venueList.map((v) => <VenueCard v={v} key={`${v.venue}, ${v.city}`} />)}
        </div>
      </div>
    </section>
  );
}
