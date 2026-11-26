/* PART 2 (Ranuga Fernando) · THE 3D VENUE VIEW. A picture of the venue map (assets/images/venue.png).
   The Fly / Walk / Orbit buttons move the picture: Walk zooms in, Orbit turns it slowly.
   Clicking one slides the white pill to it, moves the venue picture for that camera angle (CSS reads data-mode), and swaps the line of text underneath. */
import { useState } from 'react';

const modes = ['fly', 'walk', 'orbit'];
const venueText = {
  fly: 'Fly mode gives you the whole venue from above.',
  walk: 'Walk mode puts you on the floor, at eye level.',
  orbit: 'Orbit mode turns the venue slowly so you see every side.',
};
const label = (m) => m[0].toUpperCase() + m.slice(1);

export default function VenueView() {
  const [mode, setMode] = useState('fly');

  return (
    <section className="venue" id="venue" aria-labelledby="venueTitle">
      <div className="wrap venue-in">
        <div className="venue-scene" id="venueScene" data-mode={mode}>
          <img className="venue-img" id="venueImg" src="/assets/images/venue.png" alt="Venue map seen from above: the main stage at the back, the VIP deck on the right and the entry gate at the front." width="1120" height="1176" />
        </div>
        <div className="venue-copy">
          <p className="eyebrow"><b>01</b> / The 3D venue view</p>
          <h2 id="venueTitle">Reach into the room <em>before you're in it.</em></h2>
          <p className="venue-sub">Every stage, bar and VIP deck, mapped in 3D. Know where you'll stand before the gates open.</p>
          <div className="toggle" id="venueToggle" role="group" aria-label="Camera mode" style={{ '--at': modes.indexOf(mode) }}>
            <span className="toggle-thumb" aria-hidden="true" />
            {modes.map((m) => (
              <button type="button" data-mode={m} aria-pressed={m === mode} key={m} onClick={() => setMode(m)}>{label(m)}</button>
            ))}
          </div>
          <p className="venue-mode" id="venueMode" aria-live="polite">{venueText[mode]}</p>
        </div>
      </div>
    </section>
  );
}
