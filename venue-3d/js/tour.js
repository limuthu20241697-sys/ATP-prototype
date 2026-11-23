/* tour.js — the guided-tour UI around the 3D view: stop cards, zone chips, Fly/Walk, Evening/Night,
   the map and the phone joystick. The page sets <body data-setting="sea|venue">. */
(function () {
  var ORDER = ['entrance', 'secYard', 'booth360', 'photobox', 'mirror', 'setTimes', 'pub', 'firepit', 'waterY', 'merch', 'tattoo', 'facepaint', 'signs', 'album',
    'confetti', 'smoke', 'flooring', 'secCorr', 'backPath', 'secMain', 'medicS', 'viparea', 'foh', 'washE', 'stage', 'gold', 'platinum', 'secBack',
    'washN', 'medicN', 'prod', 'tickets', 'emergency'];
  var ZONE = { entrance: 'outside', secYard: 'yard', tickets: 'outside', emergency: 'outside', backPath: 'outside', prod: 'outside',
    confetti: 'festival', smoke: 'festival', flooring: 'festival', secCorr: 'festival' };
  ['booth360', 'photobox', 'mirror', 'setTimes', 'pub', 'firepit', 'waterY', 'merch', 'tattoo', 'facepaint', 'signs', 'album'].forEach(function (k) { ZONE[k] = 'yard'; });

  var stage = document.getElementById('stage'), strip = document.getElementById('strip'), load = document.getElementById('load');
  var setting = document.body.getAttribute('data-setting') || 'sea';
  var api = null, stops = [], cards = [], cur = -1, zone = 'all', extraT;
  var startTime = /night/.test(location.hash) ? 'night' : 'evening';

  function supported() {
    try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }
  function boot() {
    if (typeof THREE === 'undefined' || typeof window.buildVenueWalkthrough !== 'function' || !supported()) {
      load.classList.add('done'); document.getElementById('noWebgl').style.display = 'grid'; return;
    }
    /* let the loading screen paint before the (heavy) build */
    requestAnimationFrame(function () {
      setTimeout(function () {
        api = window.buildVenueWalkthrough(stage, { onPOI: onPOI, setting: setting, time: startTime, onReady: function () { load.classList.add('done'); } });
        if (!api) { load.classList.add('done'); document.getElementById('noWebgl').style.display = 'grid'; return; }
        document.body.setAttribute('data-quality', api.quality);
        wire();
      }, 30);
    });
  }
  var fr = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load("700 20px 'Albert Sans'"), document.fonts.load("600 20px 'Albert Sans'")]) : Promise.resolve();
  Promise.race([fr, new Promise(function (r) { setTimeout(r, 1800); })]).then(boot, boot);

  function pad(n) { return String(n).padStart(2, '0'); }
  function select(i, fly) {
    if (cur >= 0 && cards[cur]) cards[cur].classList.remove('on');
    cur = i;
    if (i < 0) return;
    var c = cards[i]; c.classList.add('on');
    setTimeout(function () { strip.scrollTo({ left: c.offsetLeft - strip.clientWidth / 2 + 170, behavior: 'smooth' }); }, 60);
    if (fly) api.goTo(stops[i].id);
  }
  function onPOI(p) {
    if (!p) return;
    var i = stops.indexOf(p);
    if (i >= 0) { if (i !== cur) select(i, false); return; }
    var ex = document.getElementById('extra');
    ex.textContent = p.name.charAt(0) + p.name.slice(1).toLowerCase();
    var sp = document.createElement('span'); sp.textContent = p.dims; ex.appendChild(sp);
    ex.classList.add('show'); clearTimeout(extraT); extraT = setTimeout(function () { ex.classList.remove('show'); }, 3200);
  }
  function visible() { return stops.filter(function (p) { return zone === 'all' || (ZONE[p.id] || 'festival') === zone; }); }
  function step(d) {
    var v = visible(); if (!v.length) return;
    var i = v.indexOf(stops[cur]);
    i = i < 0 ? 0 : (i + d + v.length) % v.length;
    select(stops.indexOf(v[i]), true);
  }

  function wire() {
    var byId = {}; api.pois.forEach(function (p) { byId[p.id] = p; });
    stops = ORDER.map(function (id) { return byId[id]; }).filter(Boolean);
    stops.forEach(function (p, i) {
      var b = document.createElement('button'); b.className = 'glass card'; b.type = 'button';
      b.innerHTML = '<div class="s"></div><div class="n"></div><div class="d"></div><div class="p"></div>';
      b.querySelector('.s').textContent = 'STOP ' + pad(i + 1);
      b.querySelector('.n').textContent = p.name;
      b.querySelector('.d').textContent = p.dims;
      b.querySelector('.p').textContent = p.desc;
      b.addEventListener('click', function () { select(i, true); });
      cards.push(b); strip.appendChild(b);
    });
    strip.addEventListener('wheel', function (e) {          /* a normal mouse wheel scrolls the cards sideways */
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault(); strip.scrollLeft += e.deltaY;
    }, { passive: false });
    document.querySelectorAll('#chips button').forEach(function (b) {
      b.addEventListener('click', function () {
        zone = b.dataset.z;
        document.querySelectorAll('#chips button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        cards.forEach(function (c, i) { c.style.display = (zone === 'all' || (ZONE[stops[i].id] || 'festival') === zone) ? '' : 'none'; });
        api.setSegment(zone === 'festival' || zone === 'yard' ? zone : 'all');
        select(-1); strip.scrollTo({ left: 0, behavior: 'smooth' });
      });
    });
    window.addEventListener('keydown', function (e) {
      if (api.getMode() === 'walk') return;
      if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1);
    });

    var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0; if (touch) document.body.classList.add('touch');
    var bO = document.getElementById('mOrbit'), bW = document.getElementById('mWalk');
    function setMode(m) {
      api.setMode(m); bO.classList.toggle('on', m === 'orbit'); bW.classList.toggle('on', m === 'walk');
      bO.setAttribute('aria-pressed', String(m === 'orbit')); bW.setAttribute('aria-pressed', String(m === 'walk'));
      document.body.classList.toggle('walk', m === 'walk');
      document.getElementById('hint').textContent = m === 'walk' ? (touch ? 'Joystick to walk · drag to look' : 'WASD to walk · drag to look · Shift to run') : (touch ? 'Drag to turn · pinch to zoom · tap an area' : 'Drag to turn · scroll to zoom · click an area');
      if (cur >= 0) api.goTo(stops[cur].id);
    }
    bO.addEventListener('click', function () { setMode('orbit'); });
    bW.addEventListener('click', function () { setMode('walk'); });
    setMode('orbit');

    var tE = document.getElementById('tEvening'), tN = document.getElementById('tNight');
    function setTime(t) {
      api.setTime(t); tE.classList.toggle('on', t === 'evening'); tN.classList.toggle('on', t === 'night');
      tE.setAttribute('aria-pressed', String(t === 'evening')); tN.setAttribute('aria-pressed', String(t === 'night'));
      history.replaceState(null, '', t === 'night' ? '#night' : '#evening');
    }
    tE.addEventListener('click', function () { setTime('evening'); });
    tN.addEventListener('click', function () { setTime('night'); });
    setTime(startTime);

    /* map */
    var pop = document.getElementById('mapPop'), mb = document.getElementById('mapBtn');
    mb.addEventListener('click', function () { pop.classList.toggle('show'); mb.classList.toggle('on', pop.classList.contains('show')); });
    var cv = document.getElementById('miniCv'), cx = cv.getContext('2d'), md = api.mapData, B = { x1: -36, z1: -45, x2: 42, z2: 58 };
    function sx(x) { return (x - B.x1) / (B.x2 - B.x1) * cv.width; }
    function sz(z) { return (z - B.z1) / (B.z2 - B.z1) * cv.height; }
    function rect(r, f, s) { var x = sx(r[0]), y = sz(r[1]), w = sx(r[2]) - x, h = sz(r[3]) - y; if (f) { cx.fillStyle = f; cx.fillRect(x, y, w, h); } if (s) { cx.strokeStyle = s; cx.lineWidth = 1.5; cx.strokeRect(x, y, w, h); } }
    function draw() {
      if (pop.classList.contains('show')) {
        var st = api.getState();
        cx.clearRect(0, 0, cv.width, cv.height);
        cx.fillStyle = 'rgba(159,216,245,.06)'; cx.fillRect(0, 0, cv.width, cv.height);
        if (md.sea !== null) { cx.fillStyle = 'rgba(47,107,255,.2)'; cx.fillRect(0, 0, Math.max(0, sx(-40)), cv.height); }
        rect(md.festival, 'rgba(47,107,255,.12)', '#2f6bff'); rect(md.yard, 'rgba(62,224,255,.12)', '#3ee0ff'); rect(md.corridor, 'rgba(180,196,206,.2)', null);
        md.paths.forEach(function (p) { rect([p.x1, p.z1, p.x2, p.z2], p.main ? 'rgba(62,224,255,.75)' : 'rgba(47,107,255,.75)', null); });
        md.rects.forEach(function (r) { if ((r.x2 - r.x1) > 0.5 && (r.z2 - r.z1) > 0.5) rect([r.x1, r.z1, r.x2, r.z2], 'rgba(180,196,206,.42)', null); });
        cx.save(); cx.translate(sx(st.x), sz(st.z)); cx.rotate(Math.PI - st.yaw);
        cx.fillStyle = '#3ee0ff'; cx.beginPath(); cx.moveTo(0, -9); cx.lineTo(6, 7); cx.lineTo(0, 3); cx.lineTo(-6, 7); cx.closePath(); cx.fill();
        cx.restore();
      }
      setTimeout(function () { requestAnimationFrame(draw); }, 66);   /* ~15 fps is plenty for the map */
    }
    draw();
    cv.addEventListener('click', function (e) { var r = cv.getBoundingClientRect(); api.focus(B.x1 + (e.clientX - r.left) / r.width * (B.x2 - B.x1), B.z1 + (e.clientY - r.top) / r.height * (B.z2 - B.z1)); });

    /* joystick */
    var joy = document.getElementById('joy'), nub = document.getElementById('joyNub'), jid = null;
    function jset(e) {
      var r = joy.getBoundingClientRect(), t = null;
      for (var i = 0; i < e.touches.length; i++) if (e.touches[i].identifier === jid) t = e.touches[i];
      if (!t) return;
      var dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2), m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      nub.style.transform = 'translate(' + (dx * 34) + 'px,' + (dy * 34) + 'px)'; api.setJoy(dx, -dy);
    }
    joy.addEventListener('touchstart', function (e) { jid = e.changedTouches[0].identifier; jset(e); e.preventDefault(); }, { passive: false });
    joy.addEventListener('touchmove', function (e) { jset(e); e.preventDefault(); }, { passive: false });
    function jend(e) { for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === jid) { jid = null; nub.style.transform = ''; api.setJoy(0, 0); } }
    joy.addEventListener('touchend', jend); joy.addEventListener('touchcancel', jend);
  }
})();
