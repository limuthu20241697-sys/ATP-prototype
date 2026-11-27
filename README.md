# Void

A website for Void, a platform for finding and booking live events in Sri Lanka.

## What we're using

- React for the pages and components
- React Router to move between pages without reloading
- Vite to run it locally and to build it for the web
- Plain CSS for the styling (`src/styles/`)

## How to run it

You need Node.js (version 18 or newer). The first time, install the packages:

```
npm install
```

Then start it, and open the address it prints (usually `http://localhost:5173`):

```
npm run dev
```

To build the site the way Vercel does, run `npm run build`. The finished site goes into `dist/`, and `npm run preview` serves that folder so you can check it.

## Where things are

| What | File |
| --- | --- |
| Page title, fonts, social-share preview | `index.html` |
| Which page shows for which address | `src/main.jsx` |
| Nav, footer, pop-ups, skip link (Part 1) | `src/Layout.jsx`, `src/components/Nav.jsx`, `Footer.jsx`, `InfoModal.jsx` |
| Hero, Hot right now slider, 3D venue view (Part 2) | `src/components/Hero.jsx`, `HotSlider.jsx`, `VenueView.jsx` |
| Marquee strips, mouse light, magnetic buttons (Part 3) | `src/components/Marquee.jsx`, `CursorLight.jsx`, `src/hooks/usePageEffects.js` |
| Sign-up page (Part 3) | `src/pages/Signup.jsx` |
| Event data, event list and filters, venues (Part 4) | `src/data/events.js`, `src/components/EventList.jsx`, `src/pages/Events.jsx`, `src/pages/Venues.jsx` |
| Why Void, How it works, Team, waitlist, scroll-in effect (Part 5) | `src/pages/Home.jsx`, `src/components/Newsletter.jsx`, `src/hooks/usePageEffects.js` |
| Photos, logo, icons | `public/assets/` |

To add an event, add one line to `src/data/events.js`. It shows up in the Hot right now slider, the event list and the venues page.

The old page addresses still work: `events.html?city=Colombo`, `venues.html` and `signup.html` open the same pages as before.

## Team

Menula De Pinto, Hansadi, Ranuga Fernando, Limuthu Liyanage and Ravini Nethra. Each of us builds one part of the site on our own branch and merges it into `main`. The `PART` notes in the code say whose part each piece is.
