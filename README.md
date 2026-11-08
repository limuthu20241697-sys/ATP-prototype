# Void landing page

A one-page marketing site for Void (formerly Dimensional), a platform for finding and booking live events in Sri Lanka.
It is plain HTML, CSS and JavaScript. There is no build step and no framework.

To run it, serve this folder with any static server, for example `python -m http.server`, and open
`http://localhost:8000`.

## The files

| File | What it does |
|---|---|
| `index.html` | The page. Every section is written out here: hero, hot events, event list, why, features, team, waitlist, footer. |
| `events.html` | A second page that lists every event. The home page shows the first 6 and its "More Events" button opens this page. |
| `styles.css` | The main styling: colours, fonts, layout, buttons, hero, event cards, hot-events slider. |
| `screens.css` | The rest of the styling: footer, sign-up forms, pop-ups, why / features / team sections. |
| `shared.js` | The event data, the nav bar and footer, the pop-ups (Contact, Privacy and so on), and the motion extras (mouse light, magnetic buttons). |
| `script.js` | What the page does: city links, marquee strips, the Out of the dark slider, event filters. |
| `venues.html`, `venues.js` | The venues page: one card per venue with its upcoming events and a "Get directions" link to Google Maps. The nav bar's Venues link opens it. |
| `signup.html`, `signup.js` | The sign-up page and the code that checks its form. The nav bar's Sign Up button opens it. |
| `events-list.js` | The event filters and cards. Both pages use it. |
| `assets/` | `images/` holds the logo, the venue picture and the footer's THE VOID; `photos/` holds the event photos and the hero vortex; plus the favicon and the social preview image. |

## Who built which part

The site is split into five parts. Every comment in the code starts with `PART 1` to `PART 5`, so each person can find their own code.

| Part | What it is | Where the code is | Built by |
|---|---|---|---|
| 1 | Foundation: colours, buttons, nav bar, footer, pop-up windows | `styles.css` (colours, buttons, nav, footer, pop-up), `screens.css` (forms, footer), `shared.js` (`renderChrome`, `openModal`, `toast`) | Menula De Pinto |
| 2 | Hero (portal, black-hole O, search, city links), the 3D venue view (Fly / Walk / Orbit), and the Out of the dark slider (card-opens-into-photo, timer, drag, keyboard) | `index.html` (hero, venue, hot), `styles.css` (Hero, 3D venue view, Out of the dark), `script.js` (cities, venue buttons, `showHot`, `openNext`, drag), hero search | Ranuga Fernando |
| 3 | Marquee strips, the mouse light and magnetic buttons, and the sign-up page | `index.html` (marquee), `styles.css` (Marquee strip), `script.js` (marquee), `shared.js` (`initMotion`), `signup.html`, `signup.js`, `screens.css` (Sign-up page) | Limuthu Liyanage |
| 4 | Event data, event list (filters, cards), the all-events page and the venues page | `index.html` (discover), `styles.css` (Filters, Event list), `shared.js` (`events`), `events-list.js` (`renderGrid`), `events.html`, `venues.html`, `venues.js` | Hansadi |
| 5 | Why, How it works, Team, waitlist sign-up | `index.html` (why, product, team, newsletter), `screens.css` (Marketing), `shared.js` (`forms`, `initReveal`) | Ravini Nethra |

## How the parts work

**Event data.** The list of events is one array at the top of `shared.js`. Every list on the page is
built from it, so adding an event there adds it everywhere.

**Out of the dark** (the Hot right now slider; `script.js`, `showHot`). The current event's name and details on the left, and a row of cards on
the right for the events still to come. The first card is the next event. When it is time, that card opens up into
the full-screen photo, the other cards slide along one place, and the event that was on show joins the end of the
row. It moves on by itself every `HOT_MS`. Visitors can also drag with the mouse or swipe, click a card, use the
arrows or arrow keys, or swipe sideways on a trackpad. The timer waits while the mouse is over the section. If the
visitor has "reduce motion" turned on, nothing moves by itself and the opening effect is skipped.

**3D venue view** (`index.html`, `styles.css` and `script.js`, "3D venue view"). One picture of the venue map, `assets/images/venue.png`.
The Fly, Walk and Orbit buttons only change one attribute (`data-mode`), and the CSS moves the picture: Fly shows all of it, Walk zooms in, Orbit turns it slowly.

**Event filters** (`events-list.js`, `renderGrid`). Typing or choosing a filter re-draws the event cards.
It keeps the events that match the search, date, city, genre and price, then sorts them.

**Sign-up forms.** The sign-up form shows a confirmation, but this is a prototype: nothing is sent or saved anywhere.

## The Void theme

The colours and fonts are defined once, at the top of `styles.css`, and everything else uses those names.

| Name | Colour | Used for |
|---|---|---|
| `--void` | `#000000` | Page background |
| `--surface`, `--surface-2` | `#0a0a0a`, `#141414` | Cards, forms and pop-ups |
| `--ink`, `--ink-2`, `--muted` | `#f2f2f2`, `#c9c9c9`, `#9a9a9a` | Main text, softer text, labels |
| `--light` | `#ffffff` | Main buttons, the star, focus rings |
| `--ember` | `#ff4d3d` | "Sold out" only |

Fonts: Syne for headings, Instrument Serif italic for the last words of a heading, Inter for body text.

Things that repeat down the page: the four-point star logo, the portal in the hero (a vortex photo with two orbit
rings), giant outlined words behind sections, numbered labels like "01 / What's on", marquee strips, and photos that
are black and white until you hover them. Everything that moves stops if the visitor has "reduce motion" turned on.

## Accessibility and SEO

- A "Skip to main content" link, labelled buttons, alt text on photos, and a visible keyboard focus ring.
- The slider can be used with the mouse, touch, keyboard arrows or buttons, and respects "reduce motion".
- Page title, meta description, favicon and a social preview image are set in `index.html`.

## Still to do

- Host on the team's own domain over HTTPS and make the social preview image an absolute URL.
- Connect the waitlist form to a real service, such as Formspree.
- Replace the team roles with the real ones.
- Find the original files, the author and the licence for the hero vortex picture (`assets/photos/void-portal.webp`). It was cut out of the design mock-up, so it is small, and it is not in the photo credits yet.
- Make a new social preview image (`assets/social-preview.png` still shows the old Dimensional design).
