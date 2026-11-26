/* ===== PART 4 (Hansadi) · EVENT LIST (filters and cards). Used by two pages:
   the home page shows only the first 6 matches (limit={6}) with a "More Events" button,
   and the All events page shows every match. ===== */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { events } from '../data/events.js';
import { artPath, eventHref, fullDate, money, monthShort, toDate } from '../lib/format.js';

/* The choices in each drop-down. A value in the address bar that is not one of these is ignored. */
const choices = {
  date: [['', 'Any date'], ['2027-02', 'February 2027'], ['2027-03', 'March 2027'], ['2027-04', 'April 2027'], ['2027-05', 'May 2027']],
  city: [['', 'All cities'], ['Colombo', 'Colombo'], ['Mirissa', 'Mirissa'], ['Kandy', 'Kandy'], ['Galle', 'Galle']],
  genre: [['', 'All genres'], ['Electronic', 'Electronic'], ['Live music', 'Live music'], ['Jazz', 'Jazz']],
  price: [['', 'Any price'], ['3000', 'Under LKR 3,000'], ['5000', 'Under LKR 5,000'], ['10000', 'Under LKR 10,000']],
  sort: [['date', 'Soonest first'], ['price', 'Price: low to high']],
};
const defaults = { q: '', date: '', city: '', genre: '', price: '', sort: 'date' };
const filterKeys = Object.keys(defaults);

/* Start with any filters that are already in the address bar. */
function readFilters(search) {
  const params = new URLSearchParams(search);
  const f = { ...defaults };
  filterKeys.forEach((key) => {
    if (!params.has(key)) return;
    const value = params.get(key);
    if (key === 'q' || choices[key].some(([v]) => v === value)) f[key] = value;
  });
  return f;
}

/* PART 4 (Hansadi) · One event card: photo, date badge, status chip, name, place, genre and price. */
function EventCard({ e }) {
  const d = toDate(e);
  return (
    <article className="event" data-soldout={e.status === 'Sold out' ? '' : undefined}>
      <div className="photo">
        <img src={artPath(e)} alt="" width="1800" height="1200" loading="lazy" />
        <time className="event-when" dateTime={e.date} aria-label={fullDate.format(d)}><b>{d.getUTCDate()}</b><span>{monthShort.format(d)}</span></time>
        <span className="event-chip" data-state={e.status}>{e.status}</span>
      </div>
      <div className="event-body">
        <h3><Link to={eventHref}>{e.name}</Link></h3>
        <span className="event-place">{e.venue}, {e.city}</span>
        <div className="event-buy"><span className="event-genre">{e.genre}</span><span className="event-price">From {money(e.price)}</span></div>
      </div>
    </article>
  );
}

function Select({ name, label, value, onChange }) {
  return (
    <label><span>{label}</span>
      <select id={name} name={name} value={value} onChange={(e) => onChange(name, e.target.value)}>
        {choices[name].map(([v, text]) => <option value={v} key={v}>{text}</option>)}
      </select>
    </label>
  );
}

/* PART 4 (Hansadi) · Work out which events match the filters, sort them, draw the cards, update the counts, and keep the filters in the address bar.
   heading is the page's own eyebrow and title; the list draws it beside the live "8 events / Sri Lanka" count. */
export default function EventList({ limit = Infinity, heading }) {
  const location = useLocation();
  const [f, setF] = useState(() => readFilters(location.search));
  const searchBox = useRef(null);
  const set = (key, value) => setF((old) => ({ ...old, [key]: value }));

  const q = f.q.trim().toLowerCase();
  const price = Number(f.price);
  const list = events.filter((e) => (!f.date || e.date.startsWith(f.date))
    && (!f.city || e.city === f.city)
    && (!f.genre || e.genre === f.genre)
    && (!price || e.price <= price)
    && (!q || `${e.name} ${e.venue} ${e.city}`.toLowerCase().includes(q)));
  if (f.sort === 'price') list.sort((a, b) => a.price - b.price);

  /* The chosen filters go into the address bar, so the page can be shared or reloaded as it is. */
  const params = new URLSearchParams();
  filterKeys.forEach((key) => {
    const value = f[key].trim();
    if (value && !(key === 'sort' && value === 'date')) params.set(key, value);
  });
  const query = params.toString() ? `?${params}` : '';
  useEffect(() => {
    history.replaceState(history.state, '', `${location.pathname}${query}${location.hash}`);
  }, [query, location.pathname, location.hash]);

  const reset = () => {
    setF(defaults);
    searchBox.current.focus();
  };

  return (
    <>
      <div className="head">
        <div>{heading}</div>
        <p className="result-count" id="resultCount" aria-live="polite">{list.length} {list.length === 1 ? 'event' : 'events'} / Sri Lanka</p>
      </div>
      <form className="filters" id="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="f-search"><span>Search</span>
          <input id="q" name="q" type="search" placeholder="Find your next night…" autoComplete="off" spellCheck="false" ref={searchBox} value={f.q} onChange={(e) => set('q', e.target.value)} />
        </label>
        <Select name="date" label="Date" value={f.date} onChange={set} />
        <Select name="city" label="City" value={f.city} onChange={set} />
        <Select name="genre" label="Genre" value={f.genre} onChange={set} />
        <Select name="price" label="Price" value={f.price} onChange={set} />
        <Select name="sort" label="Sort" value={f.sort} onChange={set} />
      </form>

      <div className="grid" id="grid" hidden={list.length === 0}>
        {list.slice(0, limit).map((e) => <EventCard e={e} key={e.name} />)}
      </div>
      {/* Home page only: if there are more matches than the limit, show the "More Events" button. It opens the All events page with the same filters. */}
      {limit !== Infinity && (
        <div className="more" id="moreWrap" hidden={list.length <= limit}>
          <p id="moreCount" aria-live="polite">Showing {Math.min(limit, list.length)} of {list.length}</p>
          <Link className="btn btn-line" id="more" to={`/events.html${query}`}>More Events</Link>
        </div>
      )}
      <div className="empty" id="empty" hidden={list.length !== 0}>
        <p>No events match these filters.</p>
        <button className="btn btn-line" id="reset" type="button" onClick={reset}>Reset Filters</button>
      </div>
    </>
  );
}
