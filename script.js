/* Parts in this file: 1 renderChrome | 2 hero, 3D venue, Out of the dark slider | 3 mouse light and marquee strips. The event list is in events-list.js. See README. */

/* PART 1 (Menula De Pinto) · Build the nav bar and footer (code is in shared.js). */
renderChrome();
/* PART 2 (Ranuga Fernando) · HERO city shortcuts: one link per city that appears in the events list. Clicking one opens the events page filtered to that city. */
const cities = [...new Set(events.map((e) => e.city))];
$('heroCities').innerHTML = cities.map((c) => `<a href="events.html?city=${encodeURIComponent(c)}">${c}</a>`).join('');

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

/* PART 2 (Ranuga Fernando) → PART 4 (Hansadi) · Hero search box: open the events page with what was typed already in its search box.
   (The city links above do the same with ?city=.) */
$('heroSearch').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('heroQ').value.trim();
  location.href = q ? `events.html?q=${encodeURIComponent(q)}` : 'events.html';
});
