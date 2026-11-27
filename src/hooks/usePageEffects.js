import { useEffect } from 'react';
import { reducedMotion } from '../lib/format.js';

/* PART 5 (Ravini Nethra) · Scroll-in effect for the section titles and the waitlist. Section entrances: script adds the hidden state, so content is never lost without it.
   Runs again every time a new page opens. */
function initReveal(root) {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    root.querySelectorAll('.giant').forEach((el) => el.classList.add('in'));
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  root.querySelectorAll('.head > div, .venue-in > *, .why-card, .step, .team-card, .newsletter-in > *').forEach((el) => {
    el.classList.add('reveal');
    el.style.setProperty('--i', [...el.parentNode.children].indexOf(el)); /* cards in a row come in one after another */
    io.observe(el);
  });
  root.querySelectorAll('.giant').forEach((el) => io.observe(el)); /* the giant outlined words close up */
  return () => io.disconnect();
}

/* ===== PART 3 (Limuthu Liyanage) · MOTION EXTRAS: buttons that lean towards the mouse, and pausing the endless animations while they are off screen.
   (The soft light that follows the mouse is the CursorLight component.) All of it is skipped if the visitor asked for reduced motion. ===== */
function initMotion(root) {
  if (reducedMotion.matches) return () => {};
  const undo = [];

  if (matchMedia('(pointer: fine)').matches) {
    /* Magnetic buttons: buttons marked data-magnetic move up to 8px towards the mouse. */
    root.querySelectorAll('[data-magnetic]').forEach((btn) => {
      const move = (e) => {
        const box = btn.getBoundingClientRect();
        const x = (e.clientX - box.left - box.width / 2) / box.width;
        const y = (e.clientY - box.top - box.height / 2) / box.height;
        btn.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
      };
      const leave = () => { btn.style.transform = ''; };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerleave', leave);
      undo.push(() => { btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerleave', leave); });
    });
  }

  /* The endless animations (portal, rings, stars, marquee) only run while they are on screen. */
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
    });
    root.querySelectorAll('.portal-img, .ring-a, .ring-b, .marquee-track, .stars, .venue-img').forEach((el) => watcher.observe(el));
    undo.push(() => watcher.disconnect());
  }
  return () => undo.forEach((fn) => fn());
}

/* Switch both on for the page that is showing, and switch them off again when you leave it. */
export function usePageEffects(key) {
  useEffect(() => {
    const root = document.getElementById('root');
    const stopReveal = initReveal(root);
    const stopMotion = initMotion(root);
    return () => { stopReveal(); stopMotion(); };
  }, [key]);
}

/* Each page sets its own browser-tab title and search-engine description when it opens. */
export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
