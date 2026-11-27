/* PART 2 (Ranuga Fernando) · HERO. The first screen: a glowing star inside a slowly turning portal, the headline, a short line, the search box and the city shortcuts.
   The portal is a photo of a vortex with a star in the middle, with two CSS orbit rings turning around it (see Hero in styles.css).
   Both the search box and the city links open the All events page. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { events } from '../data/events.js';
import CursorLight from './CursorLight.jsx';

/* PART 2 (Ranuga Fernando) · HERO city shortcuts: one link per city that appears in the events list. Clicking one opens the events page filtered to that city. */
const cities = [...new Set(events.map((e) => e.city))];

export default function Hero() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  /* PART 2 (Ranuga Fernando) → PART 4 (Hansadi) · Hero search box: open the events page with what was typed already in its search box.
     (The city links do the same with ?city=.) */
  const search = (e) => {
    e.preventDefault();
    const text = q.trim();
    navigate(text ? `/events.html?q=${encodeURIComponent(text)}` : '/events.html');
  };

  return (
    <section className="hero" id="top" aria-labelledby="heroTitle" data-cursor-light>
      <div className="stars" aria-hidden="true" />
      <p className="giant giant-hero" aria-hidden="true">VOID</p>
      <div className="portal" aria-hidden="true">
        <img className="portal-img" src="/assets/photos/void-portal.webp" alt="" width="540" height="540" />
        <div className="ring ring-a"><i className="node" /></div>
        <div className="ring ring-b" />
      </div>

      <div className="hero-top">
        <p className="hero-pill rise" style={{ '--d': '0ms' }}><i aria-hidden="true" />{events.length} live events · Sri Lanka</p>
        <h1 id="heroTitle" aria-label="Step into the void.">
          <span className="line rise" style={{ '--d': '60ms' }}>Step into <em className="void-word">The V<img className="void-o" src="/assets/photos/void-o.webp" alt="" width="560" height="420" />id.</em></span>
        </h1>
        <p className="sub rise" style={{ '--d': '200ms' }}>Every live night in Sri Lanka, in one place. Walk through the room in 3D before you buy, then book in seconds.</p>
        <form className="hero-search rise" id="heroSearch" role="search" style={{ '--d': '270ms' }} onSubmit={search}>
          <label className="sr-only" htmlFor="heroQ">Search events or venues</label>
          <input id="heroQ" type="search" placeholder="Find your next night…" autoComplete="off" spellCheck="false" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary" type="submit" data-magnetic>Find Events</button>
        </form>
        <p className="hero-cities rise" style={{ '--d': '330ms' }} id="heroCities">
          {cities.map((c) => <Link to={`/events.html?city=${encodeURIComponent(c)}`} key={c}>{c}</Link>)}
        </p>
      </div>

      <div className="hero-foot rise" style={{ '--d': '400ms' }}>
        <span>6.9271° N, 79.8612° E · Colombo</span>
        <a href="#featured">Scroll to descend <span aria-hidden="true">↓</span></a>
      </div>
      <CursorLight />
    </section>
  );
}
