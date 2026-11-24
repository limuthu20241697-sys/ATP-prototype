/* Parts in this file: 1 renderChrome | 2 hero, 3D venue, Out of the dark slider | 3 mouse light and marquee strips. The event list is in events-list.js. See README. */

/* PART 1 (Menula De Pinto) · Build the nav bar and footer (code is in shared.js). */
renderChrome();
/* PART 3 (Limuthu Liyanage) · Switch on the mouse light, the magnetic buttons and the off-screen pause (code is in shared.js). */
initMotion();

/* PART 2 (Ranuga Fernando) · HERO city shortcuts: one link per city that appears in the events list. Clicking one opens the events page filtered to that city. */
const cities = [...new Set(events.map((e) => e.city))];
$('heroCities').innerHTML = cities.map((c) => `<a href="events.html?city=${encodeURIComponent(c)}">${c}</a>`).join('');

/* PART 3 (Limuthu Liyanage) · Marquee strips: every genre and city from the events list. The group is written four times so the loop has no gap. */
const marqueeWords = [...new Set(events.flatMap((e) => [e.genre, e.city]))];
const marqueeStyles = [(w) => w, (w) => `<em>${w}</em>`, (w) => `<b class="out">${w}</b>`]; /* solid, serif italic, outlined */
const marqueeGroup = `<span>${marqueeWords.map((word, i) => `${marqueeStyles[i % 3](word)}<i>✦</i>`).join('')}</span>`;
document.querySelectorAll('.marquee-track').forEach((track) => { track.innerHTML = marqueeGroup.repeat(4); });

/* PART 2 (Ranuga Fernando) · 3D venue view: the Fly / Walk / Orbit buttons. Clicking one slides the white pill to it,
   moves the venue picture for that camera angle (CSS reads data-mode), and swaps the line of text underneath. */
const venueText = {
  fly: 'Fly mode gives you the whole venue from above.',
  walk: 'Walk mode puts you on the floor, at eye level.',
  orbit: 'Orbit mode turns the venue slowly so you see every side.',
};
$('venueToggle').addEventListener('click', (e) => {
  const chosen = e.target.closest('[data-mode]');
  if (!chosen) return;
  const buttons = [...$('venueToggle').querySelectorAll('[data-mode]')];
  buttons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn === chosen)));
  $('venueToggle').style.setProperty('--at', buttons.indexOf(chosen));
  $('venueScene').dataset.mode = chosen.dataset.mode;
  $('venueMode').textContent = venueText[chosen.dataset.mode];
});

/* ===== PART 2 (Ranuga Fernando) · OUT OF THE DARK (the Hot right now slider) ===== */
/* Hot right now: the current event on the left, cards for the events still to come on the right.
   The first card is the next event. When it is time, that card opens up into the full-screen photo,
   the other cards slide along one place, and the event that was on show joins the end of the row. */
const hotList = events.filter((e) => e.status !== 'Sold out' && e.status !== 'Registering interest');
const hotBox = document.querySelector('.hot');
const hotRail = $('hotRail');
const hotTrack = $('hotTrack');
const hotImages = hotBox.querySelectorAll('.hot-img');
const hotOpen = hotBox.querySelector('.hot-open');
const phone = matchMedia('(max-width: 900px)');
const canHover = matchMedia('(hover: hover)').matches;
const HOT_MS = 1000; /* how long each event stays on screen (1 second) before the next card opens; the opening itself takes 0.7 seconds */
let hotAt = 0;
let hotTimer;
let hotBusy = false; /* true while a card is opening */
let hotCards = [];
let hotDrag = null; /* set while the visitor is dragging */
let hotMoved = false;

/* PART 2 (Ranuga Fernando) · Split a name in the middle so the headline can slide in one line at a time. */
function splitName(name) {
  const words = name.split(' ');
  if (words.length < 2) return [name];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

/* How far apart the cards are, and a way to move the row without sliding it. */
const hotStep = () => hotCards[0].offsetWidth + (parseFloat(getComputedStyle(hotTrack).columnGap) || 0);
function jumpTrack(x) {
  hotTrack.classList.add('is-dragging');
  hotTrack.style.transform = x ? `translateX(${x}px)` : '';
  void hotTrack.offsetWidth;
  hotTrack.classList.remove('is-dragging');
}

/* PART 2 (Ranuga Fernando) · Fill in the text on the left: city, event name (one line at a time), date, venue, price and the waitlist button. */
function renderText(e) {
  const note = e.status === 'Selling fast' ? 'Selling fast, so grab yours before it goes.' : 'Tickets are on sale now.';
  $('hotSlide').innerHTML = `
    <p class="hot-where">${e.city}, Sri Lanka</p>
    <h3>${splitName(e.name).map((line, i) => `<span class="hot-line"><span style="--d:${i * 70}ms">${line}</span></span>`).join('')}</h3>
    <p class="hot-note">${longDate.format(toDate(e))} at ${e.venue}, ${e.city}. ${note} From ${money(e.price)}.</p>`;
}

/* The cards are the events still to come: the next one first, and the event on show at the very end. */
function renderRail(onlyLastIsNew) {
  const count = hotList.length;
  const order = Array.from({ length: count - 1 }, (_, k) => (hotAt + 1 + k) % count);
  hotTrack.innerHTML = order.map((pos, i) => {
    const c = hotList[pos];
    const isNew = !onlyLastIsNew || i === order.length - 1;
    return `<button class="hot-card${isNew ? ' is-new' : ''}" type="button" data-pos="${pos}" aria-label="Show ${c.name}">
      <img src="${artPath(c)}" alt="" draggable="false" width="600" height="840" loading="lazy">
      <span class="hot-card-body"><small>${c.city}</small><strong>${c.name}</strong></span>
    </button>`;
  }).join('');
  hotCards = [...hotTrack.children];
  hotRail.scrollLeft = 0;
}

/* Show an event: new text, new background photo, new row of cards. */
function applyHot(target, fromOpen) {
  hotAt = target;
  const e = hotList[target];
  $('hotSlide').classList.remove('is-out');
  renderText(e);

  const [old, next] = hotImages[0].classList.contains('is-on') ? [hotImages[0], hotImages[1]] : [hotImages[1], hotImages[0]];
  next.src = artPath(e);
  if (fromOpen) hotImages.forEach((img) => img.classList.add('no-fade')); /* the opening card already showed this photo */
  next.classList.add('is-on');
  old.classList.remove('is-on');
  if (fromOpen) {
    void next.offsetWidth;
    hotImages.forEach((img) => img.classList.remove('no-fade'));
  }

  jumpTrack(0);
  renderRail(fromOpen);
  startHotTimer();
}

/* The first card opens up into the full-screen photo, and the other cards slide one place along. */
function openNext(target) {
  hotBusy = true;
  clearTimeout(hotTimer);
  const first = hotCards[0].getBoundingClientRect();
  const box = hotBox.getBoundingClientRect();
  const from = `inset(${first.top - box.top}px ${box.right - first.right}px ${box.bottom - first.bottom}px ${first.left - box.left}px round 24px)`;

  hotOpen.querySelector('img').src = artPath(hotList[target]);
  hotOpen.style.visibility = 'visible';
  hotCards[0].style.opacity = '0';
  $('hotSlide').classList.add('is-out');
  if (!phone.matches) hotTrack.style.transform = `translateX(${-hotStep()}px)`;

  const opening = hotOpen.animate(
    [{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }],
    { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
  /* While the card grows, its photo goes from black and white (how the card looked) to its real colours. */
  hotOpen.querySelector('img').animate(
    [{ filter: 'grayscale(1) contrast(1.12) brightness(.82)' }, { filter: 'grayscale(0) contrast(1) brightness(.82)' }],
    { duration: 700, easing: 'ease-out' },
  );
  opening.onfinish = () => {
    applyHot(target, true);
    hotOpen.style.visibility = 'hidden';
    hotBusy = false;
  };
}

function showHot(n) {
  if (hotBusy) return;
  const target = (n + hotList.length) % hotList.length;
  const firstCard = hotCards[0].getBoundingClientRect();
  const onScreen = firstCard.right > 0 && firstCard.left < innerWidth;
  const isNext = target === (hotAt + 1) % hotList.length;
  if (isNext && onScreen && !reducedMotion.matches) openNext(target);
  else applyHot(target, false);
}

/* Wait a while, then show the next event. While the visitor is dragging, a mouse is over the section,
   or someone is using it with the keyboard, it checks again a second later instead of moving, so it
   always carries on by itself afterwards. */
function startHotTimer() {
  clearTimeout(hotTimer);
  if (reducedMotion.matches) return;
  hotTimer = setTimeout(() => {
    if (hotDrag || hotBusy || (canHover && hotBox.matches(':hover')) || hotBox.matches(':focus-visible') || hotBox.querySelector(':focus-visible')) startHotTimer();
    else showHot(hotAt + 1);
  }, HOT_MS);
}

/* PART 2 (Ranuga Fernando) · Controls: the two arrow buttons, leaving the section restarts the timer, and clicking a card shows that event. */
$('hotNext').addEventListener('click', () => showHot(hotAt + 1));
$('hotPrev').addEventListener('click', () => showHot(hotAt - 1));
hotBox.addEventListener('mouseleave', startHotTimer);
hotTrack.addEventListener('click', (e) => {
  const card = e.target.closest('[data-pos]');
  if (card) showHot(Number(card.dataset.pos));
});

/* Drag with the mouse or swipe with a finger. Dragging left goes forward and dragging right goes back.
   On a phone the row of cards scrolls by itself, so only the rest of the section reacts to swipes. */
hotBox.addEventListener('pointerdown', (e) => {
  hotMoved = false;
  const onPhoneRow = phone.matches && e.target.closest('.hot-rail');
  if (hotBusy || onPhoneRow || e.target.closest('.hot-arrows, .hot-cta')) { hotDrag = null; return; }
  hotDrag = { from: e.clientX };
  clearTimeout(hotTimer);
});
addEventListener('pointermove', (e) => {
  if (!hotDrag) return;
  const moved = e.clientX - hotDrag.from;
  if (Math.abs(moved) <= 6) return;
  hotMoved = true;
  if (phone.matches) return;
  hotTrack.classList.add('is-dragging');
  hotTrack.style.transform = `translateX(${Math.min(40, moved)}px)`;
});
function endDrag(e) {
  if (!hotDrag) return;
  const moved = e.clientX - hotDrag.from;
  hotDrag = null;
  hotTrack.classList.remove('is-dragging');
  if (!hotMoved) { startHotTimer(); return; }
  const steps = phone.matches ? (Math.abs(moved) > 50 ? -Math.sign(moved) : 0) : Math.round(-moved / hotStep());
  if (steps === 0) { hotTrack.style.transform = ''; startHotTimer(); return; }
  jumpTrack(0);
  showHot(hotAt + steps);
}
addEventListener('pointerup', endDrag);
addEventListener('pointercancel', endDrag);
/* A drag must not also count as a click on the card it ended on. */
hotBox.addEventListener('click', (e) => {
  if (!hotMoved) return;
  e.stopPropagation();
  e.preventDefault();
  hotMoved = false;
}, true);
hotBox.addEventListener('dragstart', (e) => e.preventDefault());

/* Sideways scrolling (a trackpad swipe) steps through the events. Up and down still scrolls the page. */
let wheelTotal = 0;
let wheelUntil = 0;
hotBox.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  e.preventDefault();
  if (e.timeStamp < wheelUntil) return;
  wheelTotal += e.deltaX;
  if (Math.abs(wheelTotal) < 60) return;
  showHot(hotAt + Math.sign(wheelTotal));
  wheelTotal = 0;
  wheelUntil = e.timeStamp + 420;
}, { passive: false });

/* Keyboard: arrow keys, Home and End once the section has focus. */
hotBox.addEventListener('keydown', (e) => {
  const keys = { ArrowLeft: hotAt - 1, ArrowRight: hotAt + 1, Home: 0, End: hotList.length - 1 };
  if (!(e.key in keys)) return;
  e.preventDefault();
  showHot(keys[e.key]);
});

applyHot(0, false);

/* PART 2 (Ranuga Fernando) → PART 4 (Hansadi) · Hero search box: open the events page with what was typed already in its search box.
   (The city links above do the same with ?city=.) */
$('heroSearch').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('heroQ').value.trim();
  location.href = q ? `events.html?q=${encodeURIComponent(q)}` : 'events.html';
});
