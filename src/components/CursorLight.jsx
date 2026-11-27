/* PART 3 (Limuthu Liyanage) · Cursor light: put <CursorLight /> inside a section and that section gets a soft glow that follows the mouse.
   Only on computers with a mouse, and not at all if the visitor asked for reduced motion. */
import { useEffect, useRef } from 'react';
import { reducedMotion } from '../lib/format.js';

const enabled = () => !reducedMotion.matches && matchMedia('(pointer: fine)').matches;

export default function CursorLight() {
  const glow = useRef(null);

  useEffect(() => {
    const el = glow.current;
    if (!el) return undefined;
    const section = el.parentElement;
    const move = (e) => {
      const box = section.getBoundingClientRect();
      el.style.opacity = '1';
      el.style.transform = `translate(${e.clientX - box.left - 300}px, ${e.clientY - box.top - 300}px)`;
    };
    const leave = () => { el.style.opacity = '0'; };
    section.addEventListener('pointermove', move);
    section.addEventListener('pointerleave', leave);
    return () => { section.removeEventListener('pointermove', move); section.removeEventListener('pointerleave', leave); };
  }, []);

  return enabled() ? <span className="cursor-light" aria-hidden="true" ref={glow} /> : null;
}
