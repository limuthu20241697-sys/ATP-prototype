/* ===== PART 1 (Menula De Pinto) · NAV BAR. The logo, the page links, the Sign Up button and the phone menu button.
   It turns solid once the page has scrolled a little, and the link for the page you are on is shown as a white pill. ===== */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

/* PART 1 (Menula De Pinto) · Logo: the four-point Void star (assets/images/logo.svg). It sits beside the word VOID. */
const logoMark = <img className="logo-mark" src="/assets/images/logo.svg" alt="" width="20" height="20" />;

export default function Nav() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 24);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => removeEventListener('scroll', onScroll);
  }, []);

  /* Escape closes the phone menu and puts focus back on the menu button. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); toggle.current.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  /* aria-current tells screen readers (and the CSS) which page you are on. */
  const current = (path) => (pathname === path ? 'page' : undefined);

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`}>
      <Link className="logo" to="/" aria-label="Void home" translate="no">{logoMark}<span className="logo-word">VOID</span></Link>
      <nav className={`nav-links${open ? ' open' : ''}`} id="navLinks" aria-label="Main" onClick={(e) => { if (e.target.closest('a')) setOpen(false); }}>
        <Link to="/events.html" aria-current={current('/events.html')}>Events</Link>
        <Link to="/venues.html" aria-current={current('/venues.html')}>Venues</Link>
        <Link to={{ pathname: '/', hash: '#team' }}>Team</Link>
      </nav>
      <div className="nav-actions">
        <Link className="btn btn-primary btn-sm" to="/signup.html">Sign Up</Link>
        <button
          className="icon-btn nav-toggle"
          id="navToggle"
          type="button"
          ref={toggle}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="navLinks"
          onClick={() => setOpen(!open)}
        >
          <Icon name="menu" />
        </button>
      </div>
    </header>
  );
}
