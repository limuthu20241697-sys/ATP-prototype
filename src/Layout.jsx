/* The frame around every page: the skip link, the nav bar, the page itself, the footer and the pop-up window.
   ScrollManager starts each new page at the top, jumps to #team-style links, and puts you back where you were on Back. */
import { Outlet, useLocation } from 'react-router-dom';
import ScrollManager from './components/ScrollManager.jsx';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import { InfoProvider } from './components/InfoModal.jsx';
import { usePageEffects } from './hooks/usePageEffects.js';

export default function Layout() {
  const { pathname } = useLocation();
  usePageEffects(pathname);

  return (
    <InfoProvider>
      {/* PART 1 (Menula De Pinto) · SKIP LINK. Lets keyboard users jump past the menu. */}
      <a className="skip" href="#main">Skip to main content</a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <ScrollManager />
    </InfoProvider>
  );
}
