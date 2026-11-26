/* ===== PART 1 (Menula De Pinto) · SMALL HELPERS used by every part: money / date formatters, the photo path, and whether the visitor asked for less motion. ===== */
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const moneyFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const money = (n) => `LKR ${moneyFormat.format(Math.round(n))}`;
export const toDate = (e) => new Date(`${e.date}T00:00:00Z`);
export const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fullDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const monthShort = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
export const artPath = (e) => `/assets/photos/${e.art}.webp`;

/* The booking app is not part of this site, so every event points at the sign-up form on the home page. */
export const eventHref = { pathname: '/', hash: '#join' };
