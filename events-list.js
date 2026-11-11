/* ===== PART 4 (Hansadi) · EVENT LIST (filters and cards). Used by two pages:
   index.html shows only the first 6 matches (data-limit="6" on #grid) with a "More Events" button,
   and events.html shows every match. ===== */
const form = $('filters');
const filterKeys = ['q', 'date', 'city', 'genre', 'price', 'sort'];
const LIMIT = Number($('grid').dataset.limit) || Infinity; /* how many cards this page may show */
const monthShort = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });

/* PART 4 (Hansadi) · One event card: photo, date badge, status chip, name, place, genre and price. */
function eventCard(e) {
  const d = toDate(e);
  return `<article class="event"${e.status === 'Sold out' ? ' data-soldout' : ''}>
    <div class="photo">
      <img src="${artPath(e)}" alt="" width="1800" height="1200" loading="lazy">
      <time class="event-when" datetime="${e.date}" aria-label="${fullDate.format(d)}"><b>${d.getUTCDate()}</b><span>${monthShort.format(d)}</span></time>
      <span class="event-chip" data-state="${e.status}">${e.status}</span>
    </div>
    <div class="event-body">
      <h3><a href="${eventHref()}">${e.name}</a></h3>
      <span class="event-place">${e.venue}, ${e.city}</span>
      <div class="event-buy"><span class="event-genre">${e.genre}</span><span class="event-price">From ${money(e.price)}</span></div>
    </div>
  </article>`;
}

/* PART 4 (Hansadi) · Work out which events match the filters, sort them, draw the cards, update the counts, and keep the filters in the address bar. */
function renderGrid() {
  const q = $('q').value.trim().toLowerCase();
  const date = $('date').value;
  const city = $('city').value;
  const genre = $('genre').value;
  const price = Number($('price').value);
  const list = events.filter((e) => (!date || e.date.startsWith(date))
    && (!city || e.city === city)
    && (!genre || e.genre === genre)
    && (!price || e.price <= price)
    && (!q || `${e.name} ${e.venue} ${e.city}`.toLowerCase().includes(q)));
  if ($('sort').value === 'price') list.sort((a, b) => a.price - b.price);

  $('grid').innerHTML = list.slice(0, LIMIT).map(eventCard).join('');
  $('grid').hidden = list.length === 0;
  $('empty').hidden = list.length !== 0;
  $('resultCount').textContent = `${list.length} ${list.length === 1 ? 'event' : 'events'} / Sri Lanka`;

  /* The chosen filters go into the address bar, so the page can be shared or reloaded as it is. */
  const params = new URLSearchParams();
  filterKeys.forEach((key) => {
    const value = $(key).value.trim();
    if (value && !(key === 'sort' && value === 'date')) params.set(key, value);
  });
  const query = params.toString() ? `?${params}` : '';
  history.replaceState(null, '', `${location.pathname}${query}${location.hash}`);

  /* Home page only: if there are more matches than the limit, show the "More Events" button.
     It opens events.html and carries the same filters along. */
  if ($('moreWrap')) {
    $('moreWrap').hidden = list.length <= LIMIT;
    $('moreCount').textContent = `Showing ${Math.min(LIMIT, list.length)} of ${list.length}`;
    $('more').href = `events.html${query}`;
  }
}

/* Start with any filters that are already in the address bar. */
const initial = new URLSearchParams(location.search);
filterKeys.forEach((key) => {
  if (initial.has(key)) $(key).value = initial.get(key);
});
form.addEventListener('input', renderGrid);
form.addEventListener('submit', (e) => e.preventDefault());
$('reset').addEventListener('click', () => {
  form.reset();
  renderGrid();
  $('q').focus();
});
renderGrid();
