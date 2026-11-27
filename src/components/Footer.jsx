/* ===== PART 1 (Menula De Pinto) · FOOTER. Four columns of links, the photo credits, and the big THE VOID word at the bottom.
   The Contact, FAQ, Privacy and Terms buttons open pop-ups (see InfoModal.jsx). ===== */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { InfoButton } from './InfoModal.jsx';

/* PART 1 (Menula De Pinto) · Photo credits. Open-licence photographs. They show the places and the feel of a night out, not these events. */
const photoCredits = [
  ['Stunning_Night_View_of_Colombo_City_Skyline.jpg', 'Night View of Colombo City Skyline', 'Thilina Alagiyawanna', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  ['DJ_at_an_Electronic_Music_Festival_(Unsplash).jpg', 'DJ at an Electronic Music Festival', 'Lucas Gallone', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'],
  ['Viharamahadevi_Park,_Colombo_-_panoramio.jpg', 'Viharamahadevi Park, Colombo', 'Alexey Komarov', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0'],
  ['Mirissa_beach_Sri_Lanka_(29959458812).jpg', 'Mirissa beach', 'dronepicr', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0'],
  ['Musicians_performing_on_stage_at_a_night_concert_featuring_vibrant_lights_and_energetic_atmosphere.jpg', 'Musicians performing at a night concert', 'Shixart1985', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0'],
  ['Sri_Lanka,_Kandy_lake.jpg', 'Kandy lake', 'Vyacheslav Argenberg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0'],
  ['Pattaya_Music_Festival,_DJ_on_stage_playing_music.jpg', 'Pattaya Music Festival', 'Vyacheslav Argenberg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0'],
  ['GALLE_FORT_AND_LIGHTHOUSE_GALLE_SRI_LANKA_JAN2013_(8510167078).jpg', 'Galle Fort and lighthouse', 'calflier001', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0'],
  ['Live_rock_band_performance_at_outdoor_music_festival_with_vibrant_lights_and_energetic_crowd.jpg', 'Live band at an outdoor music festival', 'Shixart1985', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0'],
];

const home = (hash) => ({ pathname: '/', hash });

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <div className="footer-brand">
          <strong translate="no">Void</strong>
          <p>© 2027 Void</p>
          <p>All rights reserved.</p>
        </div>
        <div className="footer-cols">
          <nav aria-label="Explore">
            <strong>Explore</strong>
            <Link to="/events.html">Events</Link>
            <Link to="/venues.html">Venues</Link>
            <Link to={home('#venue')}>3D Venue View</Link>
          </nav>
          <nav aria-label="Company">
            <strong>Company</strong>
            <Link to={home('#why')}>Why Void</Link>
            <Link to={home('#product')}>How it works</Link>
            <Link to={home('#team')}>Our Team</Link>
          </nav>
          <nav aria-label="Help">
            <strong>Help</strong>
            <InfoButton topic="Contact">Contact</InfoButton>
            <InfoButton topic="FAQ">FAQ</InfoButton>
            <a href="https://www.instagram.com/events.bythevoid/" target="_blank" rel="noopener">Instagram</a>
          </nav>
          <nav aria-label="Legal">
            <strong>Legal</strong>
            <InfoButton topic="Privacy Notice">Privacy</InfoButton>
            <InfoButton topic="Policies">Terms</InfoButton>
            <details className="credits">
              <summary>Photo credits</summary>
              <p>
                {photoCredits.map(([file, title, by, licence, url], i) => (
                  <Fragment key={file}>
                    {i > 0 && '; '}
                    <a href={`https://commons.wikimedia.org/wiki/File:${file}`}>{title}</a> by {by}, <a href={url}>{licence}</a>
                  </Fragment>
                ))}
              </p>
            </details>
          </nav>
        </div>
      </div>
      <p className="footer-word"><img src="/assets/images/the-void.png" alt="" width="1916" height="164" loading="lazy" /></p>
    </footer>
  );
}
