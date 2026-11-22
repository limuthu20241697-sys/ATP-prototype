/* Parts in this file: 1 helpers, nav, footer, pop-ups | 3 mouse light and magnetic buttons | 4 the events list | 5 sign-up forms and scroll-in effect. See README. */

/* ===== PART 4 (Hansadi) · EVENT DATA. The one list every section is built from: add an event here and it shows up in the Out of the dark slider and the event list. ===== */
const events = [
  { name: 'Void 2027', date: '2027-02-27', venue: 'Lotus Tower', city: 'Colombo', price: 9000, genre: 'Electronic', status: 'Selling fast', art: 'colombo-night' },
  { name: 'After Hours: Warehouse', date: '2027-03-06', venue: 'Trace Expert City', city: 'Colombo', price: 4500, genre: 'Electronic', status: 'On sale', art: 'dj-booth' },
  { name: 'The Sunday Sessions', date: '2027-03-14', venue: 'Viharamahadevi Park', city: 'Colombo', price: 2500, genre: 'Live music', status: 'On sale', art: 'viharamahadevi-park' },
  { name: 'South Coast Sundown', date: '2027-03-20', venue: 'The Bay', city: 'Mirissa', price: 6000, genre: 'Electronic', status: 'Selling fast', art: 'mirissa' },
  { name: 'Colombo Jazz Collective', date: '2027-03-26', venue: 'Park Street Mews', city: 'Colombo', price: 3500, genre: 'Jazz', status: 'On sale', art: 'live-band' },
  { name: 'Hill Country Unplugged', date: '2027-04-10', venue: 'Lake Club', city: 'Kandy', price: 4000, genre: 'Live music', status: 'Sold out', art: 'kandy-lake' },
  { name: 'Island Frequencies', date: '2027-04-24', venue: 'Havelock City', city: 'Colombo', price: 5000, genre: 'Electronic', status: 'Registering interest', art: 'festival-stage' },
  { name: 'Galle Fort Afterglow', date: '2027-05-08', venue: 'Dutch Hospital', city: 'Galle', price: 5500, genre: 'Live music', status: 'Registering interest', art: 'galle-fort' },
];

/* ===== PART 1 (Menula De Pinto) · SMALL HELPERS used by every part: $ finds an element by id, esc makes text safe, money / date formatters, and the photo path. ===== */
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const moneyFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const money = (n) => `LKR ${moneyFormat.format(Math.round(n))}`;
const toDate = (e) => new Date(`${e.date}T00:00:00Z`);
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const artPath = (e) => `assets/photos/${e.art}.webp`;
/* events.html, venues.html and signup.html are separate pages, so their links to the home page's sections need "index.html" in front. */
const home = document.body.dataset.page ? 'index.html' : '';
/* The booking app is not part of this site, so every event points at the sign-up form. */
const eventHref = () => `${home}#join`;
/* PART 1 (Menula De Pinto) · Icons: small drawings (arrow, tick, close, menu) used on buttons. */
const iconPaths = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 8h16M4 16h16',
  up: 'M12 19V5M6 11l6-6 6 6',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPaths[name]}"/></svg>`;

/* PART 1 (Menula De Pinto) · Photo credits shown in the footer. Open-licence photographs. They show the places and the feel of a night out, not these events. */
const commons = (file, title, by, licence, url) => `<a href="https://commons.wikimedia.org/wiki/File:${file}">${title}</a> by ${by}, <a href="${url}">${licence}</a>`;
const photoCredits = [
  commons('Stunning_Night_View_of_Colombo_City_Skyline.jpg', 'Night View of Colombo City Skyline', 'Thilina Alagiyawanna', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
  commons('DJ_at_an_Electronic_Music_Festival_(Unsplash).jpg', 'DJ at an Electronic Music Festival', 'Lucas Gallone', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
  commons('Viharamahadevi_Park,_Colombo_-_panoramio.jpg', 'Viharamahadevi Park, Colombo', 'Alexey Komarov', 'CC BY 3.0', 'https://creativecommons.org/licenses/by/3.0'),
  commons('Mirissa_beach_Sri_Lanka_(29959458812).jpg', 'Mirissa beach', 'dronepicr', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0'),
  commons('Musicians_performing_on_stage_at_a_night_concert_featuring_vibrant_lights_and_energetic_atmosphere.jpg', 'Musicians performing at a night concert', 'Shixart1985', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0'),
  commons('Sri_Lanka,_Kandy_lake.jpg', 'Kandy lake', 'Vyacheslav Argenberg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0'),
  commons('Pattaya_Music_Festival,_DJ_on_stage_playing_music.jpg', 'Pattaya Music Festival', 'Vyacheslav Argenberg', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0'),
  commons('GALLE_FORT_AND_LIGHTHOUSE_GALLE_SRI_LANKA_JAN2013_(8510167078).jpg', 'Galle Fort and lighthouse', 'calflier001', 'CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0'),
  commons('Live_rock_band_performance_at_outdoor_music_festival_with_vibrant_lights_and_energetic_crowd.jpg', 'Live band at an outdoor music festival', 'Shixart1985', 'CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0'),
].join('; ');

/* PART 1 (Menula De Pinto) · Logo: the four-point Void star (assets/images/logo.svg). It sits beside the word VOID in the nav. */
const logoMark = '<img class="logo-mark" src="assets/images/logo.svg" alt="" width="20" height="20">';

/* ===== PART 1 (Menula De Pinto) · NAV BAR + FOOTER. renderChrome() writes both into the page, then switches on the scroll effect and the phone menu button. ===== */
function renderChrome() {
  $('nav').innerHTML = `<header class="nav">
    <a class="logo" href="index.html" aria-label="Void home" translate="no">${logoMark}<span class="logo-word">VOID</span></a>
    <nav class="nav-links" id="navLinks" aria-label="Main">
      <a href="events.html">Events</a>
      <a href="venues.html">Venues</a>
      <a href="${home}#team">Team</a>
    </nav>
    <div class="nav-actions">
      <a class="btn btn-primary btn-sm" href="signup.html">Sign Up</a>
      <button class="icon-btn nav-toggle" id="navToggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks">${icon('menu')}</button>
    </div>
  </header>`;

  $('footer').innerHTML = `<footer class="footer">
    <div class="wrap footer-in">
      <div class="footer-brand">
        <strong translate="no">Void</strong>
        <p>© 2027 Void</p>
        <p>All rights reserved.</p>
      </div>
      <div class="footer-cols">
        <nav aria-label="Explore">
          <strong>Explore</strong>
          <a href="events.html">Events</a>
          <a href="venues.html">Venues</a>
          <a href="${home}#venue">3D Venue View</a>
        </nav>
        <nav aria-label="Company">
          <strong>Company</strong>
          <a href="${home}#why">Why Void</a>
          <a href="${home}#product">How it works</a>
          <a href="${home}#team">Our Team</a>
        </nav>
        <nav aria-label="Help">
          <strong>Help</strong>
          <button type="button" data-info="Contact">Contact</button>
          <button type="button" data-info="FAQ">FAQ</button>
          <a href="https://www.instagram.com/events.bythevoid/" target="_blank" rel="noopener">Instagram</a>
        </nav>
        <nav aria-label="Legal">
          <strong>Legal</strong>
          <button type="button" data-info="Privacy Notice">Privacy</button>
          <button type="button" data-info="Policies">Terms</button>
          <details class="credits"><summary>Photo credits</summary><p>${photoCredits}</p></details>
        </nav>
      </div>
    </div>
    <p class="footer-word"><img src="assets/images/the-void.png" alt="" width="1916" height="164" loading="lazy"></p>
  </footer>`;

  /* The link for the page you are on is shown as a white pill (aria-current also tells screen readers). */
  const here = document.querySelector(`#navLinks a[href="${document.body.dataset.page}.html"]`);
  if (here) here.setAttribute('aria-current', 'page');

  mountOverlays();

  const onScroll = () => document.querySelector('.nav').classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('navToggle').addEventListener('click', () => setMenu(!$('navLinks').classList.contains('open')));
  $('navLinks').addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
}

/* ===== PART 1 (Menula De Pinto) · POP-UP WINDOW AND MESSAGE. openModal() shows a pop-up, closeModal() hides it, toast() shows a short message at the bottom. ===== */
function mountOverlays() {
  document.body.insertAdjacentHTML('beforeend', `
    <dialog class="sheet" id="modal" aria-labelledby="modalTitle">
      <button class="icon-btn sheet-close" type="button" data-action="close-modal" aria-label="Close">${icon('close')}</button>
      <div class="sheet-body"><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="modal-actions" id="modalActions"></div></div>
    </dialog>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`);
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });
  $('modal').addEventListener('close', () => { document.documentElement.style.overflow = ''; });
}

function setMenu(open) {
  $('navLinks').classList.toggle('open', open);
  $('navToggle').setAttribute('aria-expanded', String(open));
  $('navToggle').setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function openModal(title, body, actions = '') {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modalActions').innerHTML = actions;
  if (!$('modal').open) $('modal').showModal();
  document.documentElement.style.overflow = 'hidden';
}
function closeModal() { $('modal').close(); }

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

const infoBodies = {
  About: 'Void connects fans with live experiences across Sri Lanka.',
  Contact: 'Contact the organizer at events.intothevoid@gmail.com. Support hours: Monday to Friday, 09:00 to 17:00, Asia/Colombo.',
  Policies: [
    'Terms: valid ID is required for age-restricted events. Tickets admit the named guest or party. A booking is confirmed after full payment. This prototype does not process real payments.',
    'Refunds: request one from My Tickets. The organizer reviews eligibility. If a split-pay reservation expires unpaid, paid shares are returned and inventory is released.',
  ],
  'Privacy Notice': [
    'What we collect: if you join the list or pre-register, we store your email address. If you book, we store your name, phone number and order details. We never store card numbers.',
    'Why: to send event updates you asked for, issue your tickets, and contact you about a booking. We do not sell your data or share it with advertisers.',
    'Your choices: every email has an unsubscribe link, and you can ask us to see or delete your data at events.intothevoid@gmail.com. This is a prototype, and in this demo nothing you enter leaves your browser.',
  ],
  FAQ: 'Where is my ticket? Open My Tickets. Can I split payment? Yes, each friend receives their own link. What if someone does not pay? The 48-hour reservation expires. Can I explore the venue? Use the venue preview.',
};

/* ===== PART 1 (Menula De Pinto) · BUTTONS AND FORMS. The click listener below opens the Contact / Policies / Privacy / FAQ pop-ups; "forms" says what each form does when it is sent. ===== */
/* Pages add their own handlers to these maps. */
const actions = {
  'close-modal': closeModal,
};
const forms = {
  /* PART 5 (Ravini Nethra) · The waitlist form: swap it for a thank-you line. Nothing is sent anywhere. */
  newsletter(form) {
    form.innerHTML = `<p class="done-line">${icon('check')}You’re subscribed in this demo. See you out there.</p>`;
  },
};

document.addEventListener('click', (e) => {
  const info = e.target.closest('[data-info]');
  if (info) {
    const body = infoBodies[info.dataset.info];
    const html = (Array.isArray(body) ? body : [body]).map((t) => `<p class="muted-p">${t}</p>`).join('');
    openModal(info.dataset.info, html);
    return;
  }
  const trigger = e.target.closest('[data-action]');
  if (trigger && actions[trigger.dataset.action]) actions[trigger.dataset.action](trigger, e);
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form || !forms[form.dataset.form]) return;
  e.preventDefault();
  forms[form.dataset.form](form, Object.fromEntries(new FormData(form).entries()));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('navLinks')?.classList.contains('open')) { setMenu(false); $('navToggle').focus(); }
});

/* PART 5 (Ravini Nethra) · Scroll-in effect for the section titles and the waitlist. Section entrances: script adds the hidden state, so content is never lost without it. */
function initReveal() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.giant').forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.head > div, .venue-in > *, .why-card, .step, .team-card, .newsletter-in > *').forEach((el) => {
    el.classList.add('reveal');
    el.style.setProperty('--i', [...el.parentNode.children].indexOf(el)); /* cards in a row come in one after another */
    io.observe(el);
  });
  document.querySelectorAll('.giant').forEach((el) => io.observe(el)); /* the giant outlined words close up */
}
addEventListener('load', () => initReveal());

/* ===== PART 3 (Limuthu Liyanage) · MOTION EXTRAS for the hero and the waitlist: a soft light that follows the mouse, buttons that lean towards the mouse,
   and pausing the endless animations while they are off screen. All of it is skipped if the visitor asked for reduced motion. ===== */
function initMotion() {
  if (reducedMotion.matches) return;

  if (matchMedia('(pointer: fine)').matches) {
    /* Cursor light: sections marked data-cursor-light get a glow that follows the mouse. */
    document.querySelectorAll('[data-cursor-light]').forEach((section) => {
      const glow = document.createElement('span');
      glow.className = 'cursor-light';
      glow.setAttribute('aria-hidden', 'true');
      section.append(glow);
      section.addEventListener('pointermove', (e) => {
        const box = section.getBoundingClientRect();
        glow.style.opacity = '1';
        glow.style.transform = `translate(${e.clientX - box.left - 300}px, ${e.clientY - box.top - 300}px)`;
      });
      section.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
    });

    /* Magnetic buttons: buttons marked data-magnetic move up to 8px towards the mouse. */
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const box = btn.getBoundingClientRect();
        const x = (e.clientX - box.left - box.width / 2) / box.width;
        const y = (e.clientY - box.top - box.height / 2) / box.height;
        btn.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* The endless animations (portal, rings, stars, marquee) only run while they are on screen. */
  if (!('IntersectionObserver' in window)) return;
  const watcher = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
  });
  document.querySelectorAll('.portal-img, .ring-a, .ring-b, .marquee-track, .stars, .venue-img').forEach((el) => watcher.observe(el));
}
