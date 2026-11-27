/* ===== PART 3 (Limuthu Liyanage) · SIGN-UP PAGE. Two halves: a picture side with the tagline on the left, the form on the right.
   The form checks itself and shows a "You're in" message. This is a prototype, so nothing is sent anywhere and no password is saved. ===== */
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from '../components/Icon.jsx';
import { InfoButton } from '../components/InfoModal.jsx';
import { usePageMeta } from '../hooks/usePageEffects.js';

const order = ['suName', 'suEmail', 'suPassword', 'suPassword2', 'suTerms'];

/* PART 3 (Limuthu Liyanage) · Check every box. Returns a message for each box ('' when it is fine). */
function checkForm(f) {
  const name = f.suName.value.trim();
  const email = f.suEmail.value.trim();
  const password = f.suPassword.value;
  const again = f.suPassword2.value;
  return {
    suName: name.length >= 2 ? '' : 'Please enter your name.',
    suEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Please enter a valid email address.',
    suPassword: password.length >= 8 ? '' : 'Use at least 8 characters.',
    suPassword2: again && again === password ? '' : 'The two passwords do not match.',
    suTerms: f.suTerms.checked ? '' : 'Please agree to the Privacy Notice.',
  };
}

/* PART 3 (Limuthu Liyanage) · A password box with a Show / Hide button. */
function Password({ id, name, label, invalid }) {
  const [shown, setShown] = useState(false);
  return (
    <label className="field" htmlFor={id}>{label}
      <span className="password">
        <input className="control" id={id} name={name} type={shown ? 'text' : 'password'} autoComplete="new-password" aria-describedby={`${id}Error`} aria-invalid={invalid} />
        <button type="button" aria-pressed={shown} aria-label="Show password" onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Show'}</button>
      </span>
    </label>
  );
}

export default function Signup() {
  usePageMeta('Sign up · Void', 'Sign up to Void and be first to hear when tickets open for live events in Sri Lanka.');
  const form = useRef(null);
  const [errors, setErrors] = useState(null); /* null until the first try to submit */
  const [firstName, setFirstName] = useState('');

  /* aria-invalid is only set once the form has been checked. */
  const invalid = (id) => (errors ? Boolean(errors[id]) : undefined);
  const errorNote = (id) => <p className="field-error" id={`${id}Error`} aria-live="polite">{errors?.[id] || ''}</p>;

  /* PART 3 (Limuthu Liyanage) · On submit: check the form, then swap it for a thank-you message. */
  const submit = (e) => {
    e.preventDefault();
    const found = checkForm(form.current.elements);
    setErrors(found);
    const first = order.find((id) => found[id]);
    if (first) { form.current.elements[first].focus(); return; }
    setFirstName(form.current.elements.suName.value.trim().split(' ')[0]);
  };

  /* Once someone has tried to submit, re-check each box as they fix it. */
  const recheck = () => {
    if (errors && Object.values(errors).some(Boolean)) setErrors(checkForm(form.current.elements));
  };

  return (
    <section className="signup" aria-labelledby="signupTitle">
      <div className="signup-art" aria-hidden="true">
        <div className="stars" />
        <img src="/assets/photos/void-portal.webp" alt="" width="540" height="540" />
        <p>Great nights.<br /><em>Better together.</em></p>
      </div>

      <div className="signup-panel" id="signupPanel">
        {firstName ? (
          <div className="signup-done" role="status">
            <Star className="news-star" />
            <h2>You're in, {firstName}.</h2>
            <p>We'll email you when tickets open. This is a prototype, so nothing was sent.</p>
            <Link className="btn btn-primary" to={{ pathname: '/', hash: '#events' }}>Browse events</Link>
          </div>
        ) : (
          <>
            <p className="eyebrow">Join Void</p>
            <h1 id="signupTitle">Create your <em>account</em></h1>
            <p className="signup-sub">Be first to hear when tickets open, and keep every pass in one place.</p>

            <form className="signup-form" id="signupForm" noValidate ref={form} onSubmit={submit} onInput={recheck} onChange={recheck}>
              <label className="field" htmlFor="suName">Full name
                <input className="control" id="suName" name="name" type="text" autoComplete="name" aria-describedby="suNameError" aria-invalid={invalid('suName')} />
              </label>
              {errorNote('suName')}

              <label className="field" htmlFor="suEmail">Email address
                <input className="control" id="suEmail" name="email" type="email" autoComplete="email" spellCheck="false" aria-describedby="suEmailError" aria-invalid={invalid('suEmail')} />
              </label>
              {errorNote('suEmail')}

              <Password id="suPassword" name="password" label="Password" invalid={invalid('suPassword')} />
              {errorNote('suPassword')}

              <Password id="suPassword2" name="password2" label="Confirm password" invalid={invalid('suPassword2')} />
              {errorNote('suPassword2')}

              <label className="field" htmlFor="suCity">Your city
                <select className="control" id="suCity" name="city">
                  <option>Colombo</option><option>Kandy</option><option>Galle</option><option>Mirissa</option><option>Somewhere else</option>
                </select>
              </label>

              <fieldset className="signup-likes">
                <legend>What are you into?</legend>
                <label><input type="checkbox" name="genre" value="Electronic" /> Electronic</label>
                <label><input type="checkbox" name="genre" value="Live music" /> Live music</label>
                <label><input type="checkbox" name="genre" value="Jazz" /> Jazz</label>
              </fieldset>

              <label className="check" htmlFor="suTerms"><input type="checkbox" id="suTerms" aria-describedby="suTermsError" aria-invalid={invalid('suTerms')} /><span>I agree to the <InfoButton topic="Privacy Notice">Privacy Notice</InfoButton>.</span></label>
              {errorNote('suTerms')}

              <button className="btn btn-primary btn-wide btn-lg" type="submit">Create Account</button>
              <p className="signup-note">Prototype only: nothing you type leaves your browser.</p>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
