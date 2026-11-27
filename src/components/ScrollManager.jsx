/* Where the page should be scrolled after moving between pages, so it feels like the old one-file-per-page site:
   - a new page opens at the very top,
   - a link to a section (like "Our Team" from the events page) lands right on that section,
   - and Back / Forward put you where you were.
   Jumps between pages are instant; a link to a section on the same page glides there (the site's smooth scrolling). */
import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const positions = new Map(); /* scroll position of every page visited this session, by history entry */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; /* the browser leaves Back / Forward scrolling to us */

export default function ScrollManager() {
  const location = useLocation();
  const type = useNavigationType();
  const lastPath = useRef(null);

  /* Keep a note of how far down this page has been scrolled. */
  useLayoutEffect(() => {
    const save = () => positions.set(location.key, scrollY);
    addEventListener('scroll', save, { passive: true });
    return () => removeEventListener('scroll', save);
  }, [location.key]);

  useLayoutEffect(() => {
    const samePage = lastPath.current === location.pathname;
    lastPath.current = location.pathname;

    if (type === 'POP' && positions.has(location.key)) {
      scrollTo({ top: positions.get(location.key), behavior: 'instant' });
      return;
    }
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      target.scrollIntoView({ behavior: samePage ? 'smooth' : 'instant' });
      return;
    }
    if (!samePage || type === 'PUSH') scrollTo({ top: 0, behavior: 'instant' });
  }, [location.key, location.pathname, location.hash, type]);

  return null;
}
