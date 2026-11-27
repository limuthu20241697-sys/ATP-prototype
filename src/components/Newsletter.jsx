/* PART 5 (Ravini Nethra) · WAITLIST SIGN-UP. The email form. When it is sent it swaps to a thank-you line. Nothing is sent anywhere. */
import { useState } from 'react';
import Icon, { Star } from './Icon.jsx';
import { InfoButton } from './InfoModal.jsx';
import CursorLight from './CursorLight.jsx';

export default function Newsletter() {
  const [done, setDone] = useState(false);

  return (
    <section className="newsletter" id="join" aria-labelledby="newsTitle" data-cursor-light>
      <div className="stars stars-soft" aria-hidden="true" />
      <div className="wrap newsletter-in">
        <div>
          <Star className="news-star" />
          <h2 id="newsTitle">The night is <em>waiting.</em></h2>
          <p>A little less scrolling. A lot more going out. The best nights, straight to your inbox.</p>
        </div>
        <form className="news-form" data-form="newsletter" onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
          {done ? (
            <p className="done-line"><Icon name="check" />You’re subscribed in this demo. See you out there.</p>
          ) : (
            <>
              <label className="field">Email address
                <input className="control" name="email" type="email" placeholder="Your email address" autoComplete="email" spellCheck="false" required />
              </label>
              <button className="btn btn-primary" type="submit" data-magnetic>Count Me In</button>
              <p className="news-privacy">By signing up you agree to our <InfoButton topic="Privacy Notice">Privacy Notice</InfoButton>.</p>
            </>
          )}
        </form>
      </div>
      <CursorLight />
    </section>
  );
}
