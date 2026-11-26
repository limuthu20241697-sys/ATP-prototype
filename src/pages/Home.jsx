/* The home page, top to bottom: hero, marquee, Hot right now, the 3D venue view, the event list, a second marquee,
   Why Void, How it works, the team, and the waitlist. */
import Hero from '../components/Hero.jsx';
import Marquee from '../components/Marquee.jsx';
import HotSlider from '../components/HotSlider.jsx';
import VenueView from '../components/VenueView.jsx';
import EventList from '../components/EventList.jsx';
import Newsletter from '../components/Newsletter.jsx';
import { Star } from '../components/Icon.jsx';
import { usePageMeta } from '../hooks/usePageEffects.js';

const team = [
  ['LL', 'Limuthu Liyanage', 'Product Owner'],
  ['RN', 'Ravini Nethra', 'Scrum Master'],
  ['RF', 'Ranuga Fernando', 'Lead Developer'],
  ['MD', 'Menula De Pinto', 'Developer'],
  ['HK', 'Hansadi Kumananayaka', 'QA & Testing / Developer'],
];

export default function Home() {
  usePageMeta('Void · Live events in Sri Lanka, seen in 3D', 'Every live night in Sri Lanka in one place. Walk through the room in 3D before you buy. Find your next night with Void.');

  return (
    <>
      {/* PART 2 (Ranuga Fernando) · HERO */}
      <Hero />

      {/* PART 3 (Limuthu Liyanage) · MARQUEE STRIP */}
      <Marquee />

      {/* PART 2 (Ranuga Fernando) · OUT OF THE DARK (the Hot right now slider) */}
      <HotSlider />

      {/* PART 2 (Ranuga Fernando) · THE 3D VENUE VIEW */}
      <VenueView />

      {/* PART 4 (Hansadi) · EVENT LIST. The filter bar and the grid of event cards. Only the first 6 show here; the "More Events" button opens the All events page with all of them. */}
      <section className="discover" id="events" aria-labelledby="discoverTitle">
        <p className="giant giant-bg" aria-hidden="true">EVENTS</p>
        <div className="wrap">
          <EventList
            limit={6}
            heading={<><p className="eyebrow"><b>02</b> / What's on</p><h2 id="discoverTitle">Find your next <em>experience</em></h2></>}
          />
        </div>
      </section>

      {/* PART 3 (Limuthu Liyanage) · MARQUEE STRIP (second one, same content as the first). */}
      <Marquee />

      {/* PART 5 (Ravini Nethra) · WHY VOID. The problem and our solution, as two cards. */}
      <section className="why" id="why" aria-labelledby="whyTitle">
        <Star className="why-star" />
        <div className="wrap">
          <div className="head">
            <div>
              <p className="eyebrow"><b>03</b> / Why Void</p>
              <h2 id="whyTitle">Nightlife here deserves better than <em>a screenshot</em></h2>
            </div>
          </div>
          <div className="why-grid">
            <article className="why-card">
              <p className="why-tag">The problem</p>
              <p className="why-text">Events get announced across scattered Instagram posts, WhatsApp groups and ticket counters. There's no single place to see what's on, check if a show is still running, or know what the venue actually looks like before you commit.</p>
            </article>
            <article className="why-card why-card-accent">
              <p className="why-tag">What Void does</p>
              <p className="why-text">Void puts every event, venue and ticket in one place, with a real 3D look at the room before you go, and a checkout built for one hand on a phone, not a trip to a kiosk.</p>
            </article>
          </div>
        </div>
      </section>

      {/* PART 5 (Ravini Nethra) · HOW IT WORKS. Three numbered rows, one per key feature. */}
      <section className="product" id="product" aria-labelledby="productTitle">
        <div className="wrap">
          <div className="head">
            <div>
              <p className="eyebrow"><b>04</b> / How it works</p>
              <h2 id="productTitle">Built around three <em>things</em></h2>
            </div>
          </div>
          <ol className="steps">
            <li className="step">
              <span className="step-num" aria-hidden="true">01</span>
              <h3>See it before you're there</h3>
              <p>A 3D preview of every stage and seat, so you know the room before you walk in. No other platform here shows you that.</p>
            </li>
            <li className="step">
              <span className="step-num" aria-hidden="true">02</span>
              <h3>Book without the back-and-forth</h3>
              <p>Full line-up, tiers and gate times on one page, with a checkout that takes seconds.</p>
            </li>
            <li className="step">
              <span className="step-num" aria-hidden="true">03</span>
              <h3>Every ticket, one place</h3>
              <p>QR passes, transfers and refunds live in My Tickets. No digging through your inbox at the gate.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* PART 5 (Ravini Nethra) · TEAM. One card per team member. */}
      <section className="team" id="team" aria-labelledby="teamTitle">
        <p className="giant giant-bg" aria-hidden="true">TEAM</p>
        <div className="wrap">
          <div className="head">
            <div>
              <p className="eyebrow"><b>05</b> / Who's building it</p>
              <h2 id="teamTitle">The team behind <em>Void</em></h2>
            </div>
          </div>
          <div className="team-grid">
            {team.map(([initials, name, role]) => (
              <article className="team-card" key={name}><span className="team-avatar">{initials}</span><h3>{name}</h3><p>{role}</p></article>
            ))}
          </div>
        </div>
      </section>

      {/* PART 5 (Ravini Nethra) · WAITLIST SIGN-UP */}
      <Newsletter />
    </>
  );
}
