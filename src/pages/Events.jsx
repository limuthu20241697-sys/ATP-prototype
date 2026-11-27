/* PART 4 (Hansadi) · ALL EVENTS PAGE. The same filter bar and cards as the home page, but with no limit on how many show. */
import { Link } from 'react-router-dom';
import EventList from '../components/EventList.jsx';
import { usePageMeta } from '../hooks/usePageEffects.js';

export default function Events() {
  usePageMeta('All events · Void', 'Every Void event in Sri Lanka. Filter by date, city, genre and price.');

  return (
    <section className="discover discover-page" id="events" aria-labelledby="discoverTitle">
      <p className="giant giant-bg" aria-hidden="true">EVENTS</p>
      <div className="wrap">
        <p className="back"><Link to={{ pathname: '/', hash: '#events' }}><span aria-hidden="true">←</span> Back to home</Link></p>
        <EventList heading={<><p className="eyebrow">What's on</p><h1 id="discoverTitle">All <em>events</em></h1></>} />
      </div>
    </section>
  );
}
