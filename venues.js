/* ===== PART 4 (Hansadi) · VENUES PAGE. One card per venue, built from the events list in shared.js:
   the venue's photo, its city, the events coming up there, and a "Get directions" link that opens the route in Google Maps. ===== */

/* PART 4 (Hansadi) · Group the events by venue, so each venue appears once with all of its dates. */
const venueList = [];
events.forEach((e) => {
  let v = venueList.find((item) => item.venue === e.venue && item.city === e.city);
  if (!v) {
    v = { venue: e.venue, city: e.city, art: e.art, shows: [] };
    venueList.push(v);
  }
  v.shows.push(e);
});

/* PART 4 (Hansadi) · A Google Maps link that shows the route from where the visitor is to the venue. */
const routeLink = (v) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${v.venue}, ${v.city}, Sri Lanka`)}`;

/* PART 4 (Hansadi) · One venue card. */
function venueCard(v) {
  const shows = v.shows.map((e) => `<li><time datetime="${e.date}">${dayMonth.format(toDate(e))}</time> ${esc(e.name)}</li>`).join('');
  return `<article class="venue-card">
    <div class="photo"><img src="${artPath(v)}" alt="" width="1800" height="1200" loading="lazy"></div>
    <div class="venue-card-body">
      <p class="feature-meta">${esc(v.city)}, Sri Lanka</p>
      <h2>${esc(v.venue)}</h2>
      <ul class="venue-shows" aria-label="Coming up at ${esc(v.venue)}">${shows}</ul>
      <div class="venue-actions">
        <a class="btn btn-primary" href="${routeLink(v)}" target="_blank" rel="noopener">Get directions <span class="sr-only">(opens Google Maps)</span></a>
        <a class="btn btn-line" href="events.html?q=${encodeURIComponent(v.venue)}">See events</a>
      </div>
    </div>
  </article>`;
}

$('venueCount').textContent = `${venueList.length} venues / Sri Lanka`;
$('venueGrid').innerHTML = venueList.map(venueCard).join('');
