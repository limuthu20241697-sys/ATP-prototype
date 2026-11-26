/* ===== PART 2 (Ranuga Fernando) · OUT OF THE DARK (the Hot right now slider) =====
   Hot right now: the current event on the left, cards for the events still to come on the right.
   The first card is the next event. When it is time, that card opens up into the full-screen photo,
   the other cards slide along one place, and the event that was on show joins the end of the row.
   React draws the text and the row of cards; the opening animation and the photo cross-fade move the page directly,
   exactly as before, because they have to happen frame by frame. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { events } from '../data/events.js';
import { artPath, longDate, money, reducedMotion, toDate } from '../lib/format.js';
import Icon from './Icon.jsx';

const hotList = events.filter((e) => e.status !== 'Sold out' && e.status !== 'Registering interest');
const phone = matchMedia('(max-width: 900px)');
const canHover = matchMedia('(hover: hover)').matches;
const HOT_MS = 5000; /* how long each event stays on screen (5 seconds) before the next card opens; the opening itself takes 0.7 seconds */

/* PART 2 (Ranuga Fernando) · Split a name in the middle so the headline can slide in one line at a time. */
function splitName(name) {
  const words = name.split(' ');
  if (words.length < 2) return [name];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

export default function HotSlider() {
  /* at: the event on show. fromOpen: true when it arrived by a card opening. seq: counts every change, so each one draws fresh cards and text. */
  const [view, setView] = useState({ at: 0, fromOpen: false, seq: 0 });

  const box = useRef(null);
  const rail = useRef(null);
  const track = useRef(null);
  const slide = useRef(null);
  const imgA = useRef(null);
  const imgB = useRef(null);
  const open = useRef(null);
  const at = useRef(0);
  const busy = useRef(false); /* true while a card is opening */
  const timer = useRef(0);
  const drag = useRef(null); /* set while the visitor is dragging */
  const moved = useRef(false);
  const mounted = useRef(false);
  const opening = useRef([]);

  const cards = () => [...track.current.children];

  /* How far apart the cards are, and a way to move the row without sliding it. */
  const hotStep = () => {
    const first = cards()[0];
    return first.offsetWidth + (parseFloat(getComputedStyle(track.current).columnGap) || 0);
  };
  const jumpTrack = (x) => {
    const t = track.current;
    t.classList.add('is-dragging');
    t.style.transform = x ? `translateX(${x}px)` : '';
    void t.offsetWidth;
    t.classList.remove('is-dragging');
  };

  /* The functions below call each other, so they live in refs that always hold the latest version. */
  const fn = useRef({});

  /* Wait a while, then show the next event. While the visitor is dragging, a mouse is over the section,
     or someone is using it with the keyboard, it waits another round instead of moving, so it
     always carries on by itself afterwards. */
  fn.current.startHotTimer = () => {
    clearTimeout(timer.current);
    if (reducedMotion.matches) return;
    timer.current = setTimeout(() => {
      const b = box.current;
      if (!b) return;
      if (drag.current || busy.current || (canHover && b.matches(':hover')) || b.matches(':focus-visible') || b.querySelector(':focus-visible')) fn.current.startHotTimer();
      else fn.current.showHot(at.current + 1);
    }, HOT_MS);
  };

  /* Show an event: new text, new background photo, new row of cards. */
  fn.current.applyHot = (target, fromOpen) => {
    at.current = target;
    const e = hotList[target];
    slide.current.classList.remove('is-out');

    const [old, next] = imgA.current.classList.contains('is-on') ? [imgA.current, imgB.current] : [imgB.current, imgA.current];
    next.src = artPath(e);
    if (fromOpen) [old, next].forEach((img) => img.classList.add('no-fade')); /* the opening card already showed this photo */
    next.classList.add('is-on');
    old.classList.remove('is-on');
    if (fromOpen) {
      void next.offsetWidth;
      [old, next].forEach((img) => img.classList.remove('no-fade'));
    }

    jumpTrack(0);
    setView((v) => ({ at: target, fromOpen, seq: v.seq + 1 }));
    fn.current.startHotTimer();
  };

  /* The first card opens up into the full-screen photo, and the other cards slide one place along. */
  fn.current.openNext = (target) => {
    busy.current = true;
    clearTimeout(timer.current);
    const firstCard = cards()[0];
    const first = firstCard.getBoundingClientRect();
    const b = box.current.getBoundingClientRect();
    const from = `inset(${first.top - b.top}px ${b.right - first.right}px ${b.bottom - first.bottom}px ${first.left - b.left}px round 24px)`;

    const layer = open.current;
    const photo = layer.querySelector('img');
    photo.src = artPath(hotList[target]);
    layer.style.visibility = 'visible';
    firstCard.style.opacity = '0';
    slide.current.classList.add('is-out');
    if (!phone.matches) track.current.style.transform = `translateX(${-hotStep()}px)`;

    const grow = layer.animate(
      [{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }],
      { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    /* While the card grows, its photo goes from black and white (how the card looked) to its real colours. */
    const colour = photo.animate(
      [{ filter: 'grayscale(1) contrast(1.12) brightness(.82)' }, { filter: 'grayscale(0) contrast(1) brightness(.82)' }],
      { duration: 700, easing: 'ease-out' },
    );
    opening.current = [grow, colour];
    grow.onfinish = () => {
      if (!mounted.current) return;
      fn.current.applyHot(target, true);
      layer.style.visibility = 'hidden';
      busy.current = false;
    };
  };

  fn.current.showHot = (n) => {
    if (busy.current) return;
    const target = (n + hotList.length) % hotList.length;
    const firstCard = cards()[0].getBoundingClientRect();
    const onScreen = firstCard.right > 0 && firstCard.left < innerWidth;
    const isNext = target === (at.current + 1) % hotList.length;
    if (isNext && onScreen && !reducedMotion.matches) fn.current.openNext(target);
    else fn.current.applyHot(target, false);
  };

  const showHot = useCallback((n) => fn.current.showHot(n), []);

  /* Start on the first event, and stop every timer and animation when the page closes. */
  useEffect(() => {
    mounted.current = true;
    fn.current.applyHot(0, false);
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      opening.current.forEach((a) => a.cancel());
      busy.current = false;
    };
  }, []);

  /* A fresh row of cards always starts scrolled to its beginning. */
  useLayoutEffect(() => { if (rail.current) rail.current.scrollLeft = 0; }, [view.seq]);

  /* Drag with the mouse or swipe with a finger. Dragging left goes forward and dragging right goes back.
     On a phone the row of cards scrolls by itself, so only the rest of the section reacts to swipes. */
  const onPointerDown = (e) => {
    moved.current = false;
    const onPhoneRow = phone.matches && e.target.closest('.hot-rail');
    if (busy.current || onPhoneRow || e.target.closest('.hot-arrows, .hot-cta')) { drag.current = null; return; }
    drag.current = { from: e.clientX };
    clearTimeout(timer.current);
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.from;
      if (Math.abs(dx) <= 6) return;
      moved.current = true;
      if (phone.matches) return;
      track.current.classList.add('is-dragging');
      track.current.style.transform = `translateX(${Math.min(40, dx)}px)`;
    };
    const endDrag = (e) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.from;
      drag.current = null;
      track.current.classList.remove('is-dragging');
      if (!moved.current) { fn.current.startHotTimer(); return; }
      const steps = phone.matches ? (Math.abs(dx) > 50 ? -Math.sign(dx) : 0) : Math.round(-dx / hotStep());
      if (steps === 0) { track.current.style.transform = ''; fn.current.startHotTimer(); return; }
      jumpTrack(0);
      fn.current.showHot(at.current + steps);
    };
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', endDrag);
    addEventListener('pointercancel', endDrag);
    return () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', endDrag);
      removeEventListener('pointercancel', endDrag);
    };
  }, []);

  /* A drag must not also count as a click on the card it ended on. */
  const onClickCapture = (e) => {
    if (!moved.current) return;
    e.stopPropagation();
    e.preventDefault();
    moved.current = false;
  };

  /* Sideways scrolling (a trackpad swipe) steps through the events. Up and down still scrolls the page.
     (Added by hand because the page must be allowed to stop the scroll, which React's onWheel cannot do.) */
  useEffect(() => {
    const b = box.current;
    let total = 0;
    let until = 0;
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (e.timeStamp < until) return;
      total += e.deltaX;
      if (Math.abs(total) < 60) return;
      fn.current.showHot(at.current + Math.sign(total));
      total = 0;
      until = e.timeStamp + 420;
    };
    b.addEventListener('wheel', onWheel, { passive: false });
    return () => b.removeEventListener('wheel', onWheel);
  }, []);

  /* Keyboard: arrow keys, Home and End once the section has focus. */
  const onKeyDown = (e) => {
    const keys = { ArrowLeft: at.current - 1, ArrowRight: at.current + 1, Home: 0, End: hotList.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    showHot(keys[e.key]);
  };

  /* PART 2 (Ranuga Fernando) · The text on the left: city, event name (one line at a time), date, venue and price. */
  const e = hotList[view.at];
  const note = e.status === 'Selling fast' ? 'Selling fast, so grab yours before it goes.' : 'Tickets are on sale now.';

  /* The cards are the events still to come: the next one first, and the event on show at the very end. */
  const count = hotList.length;
  const order = Array.from({ length: count - 1 }, (_, k) => (view.at + 1 + k) % count);

  return (
    <section
      className="hot"
      id="featured"
      tabIndex={0}
      aria-roledescription="carousel"
      aria-labelledby="featuredTitle"
      ref={box}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      onDragStart={(ev) => ev.preventDefault()}
      onKeyDown={onKeyDown}
      onMouseLeave={() => fn.current.startHotTimer()}
    >
      <div className="hot-bg" aria-hidden="true">
        <img className="hot-img is-on" ref={imgA} src="/assets/photos/colombo-night.webp" alt="" width="1800" height="1200" />
        <img className="hot-img" ref={imgB} src="/assets/photos/colombo-night.webp" alt="" width="1800" height="1200" />
      </div>
      <div className="hot-open" aria-hidden="true" ref={open}><img src="/assets/photos/colombo-night.webp" alt="" /></div>
      <div className="hot-wash" aria-hidden="true" />
      <h2 className="sr-only" id="featuredTitle">Hot right now</h2>
      <div className="wrap hot-in">
        <div className="hot-copy">
          <p className="hot-tag" aria-hidden="true">Out of the dark</p>
          <div className="hot-slide" id="hotSlide" ref={slide}>
            <p className="hot-where" key={`where${view.seq}`}>{e.city}, Sri Lanka</p>
            <h3 key={`name${view.seq}`}>
              {splitName(e.name).map((line, i) => (
                <span className="hot-line" key={line}><span style={{ '--d': `${i * 70}ms` }}>{line}</span></span>
              ))}
            </h3>
            <p className="hot-note" key={`note${view.seq}`}>{longDate.format(toDate(e))} at {e.venue}, {e.city}. {note} From {money(e.price)}.</p>
          </div>
        </div>
        <div className="hot-side">
          <div className="hot-rail" id="hotRail" ref={rail}>
            <div
              className="hot-track"
              id="hotTrack"
              ref={track}
              onClick={(ev) => {
                const card = ev.target.closest('[data-pos]');
                if (card) showHot(Number(card.dataset.pos));
              }}
            >
              {order.map((pos, i) => {
                const c = hotList[pos];
                const isNew = !view.fromOpen || i === order.length - 1;
                return (
                  <button className={`hot-card${isNew ? ' is-new' : ''}`} type="button" data-pos={pos} aria-label={`Show ${c.name}`} key={`${view.seq}-${pos}`}>
                    <img src={artPath(c)} alt="" draggable={false} width="600" height="840" loading="lazy" />
                    <span className="hot-card-body"><small>{c.city}</small><strong>{c.name}</strong></span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="hot-arrows">
            <button className="icon-btn" id="hotPrev" type="button" aria-label="Previous event" onClick={() => showHot(at.current - 1)}><Icon name="back" /></button>
            <button className="icon-btn" id="hotNext" type="button" aria-label="Next event" onClick={() => showHot(at.current + 1)}><Icon name="arrow" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
