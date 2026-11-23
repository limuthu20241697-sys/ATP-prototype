/* port-city.js — We Are Lost · Port City Colombo, Beach Park. The 3D venue walkthrough.

   The site plan (every area, fence, path and collision) comes from the original venue-scene.js.
   The look comes from the venue3d kit (js/v3d): real crowd bodies, palms, box truss, LED screens,
   light beams, haze and the glow + film finish. Around the site: the beach, the sea and the sunset.

   Usage: const api = buildVenueWalkthrough(el, { onPOI, setting: 'sea' | 'venue', time: 'evening' | 'night', onReady })
     api.setMode('orbit' | 'walk'), api.setSegment('all' | 'festival' | 'yard'), api.goTo(id), api.focus(x, z),
     api.setJoy(x, y), api.getState(), api.setTime('evening' | 'night'), api.pois, api.mapData, api.quality
   setting 'venue' drops the beach and the sea (just the site on a lawn).

   Units: 1 unit ≈ 1.5 m (a person is about 1.15 units tall). North is -z (the stage end), the sea is to the
   west (-x), the road is to the east (+x).

   Staying smooth on phones:
     - almost every solid prop is merged into a few big meshes (one draw each), and every sign is drawn
       into one shared texture (one draw for all signs)
     - three quality levels, picked from the screen, the CPU and the memory; phones get fewer people,
       no shadows, colour-only ground textures and a cheaper glow
     - the resolution follows the frame rate: it drops when frames get slow and comes back when they're fast
     - drawing stops when the view is off screen or the tab is hidden */
(function () {
  'use strict';
  const V = window.V3D;

  function buildVenueWalkthrough(container, opts) {
    opts = opts || {};
    if (typeof THREE === 'undefined' || !V || !container) return null;
    const SEA = opts.setting !== 'venue';
    /* how much larger than the plan the venue is drawn. People and the camera stay human-sized,
       so a bigger S makes the grounds feel bigger. All logic stays in plan units; only what is
       rendered scales. */
    const S = 1.55;

    /* ---------- quality level ---------- */
    const mq = (q) => window.matchMedia(q).matches;
    const phone = mq('(max-width: 900px)') || mq('(pointer: coarse)');
    const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
    const forced = (/[?&]q=(low|medium|high)/.exec(location.search) || [])[1];      /* ?q=low to test a level */
    const tier = forced ? ['low', 'medium', 'high'].indexOf(forced) : phone ? (cores <= 4 || mem <= 3 ? 0 : 1) : (cores <= 4 || mem <= 4 ? 1 : 2);
    V.lite = tier < 2;
    V.LOGO = 'WE ARE LOST';
    const Q = [
      { crowd: 240, yard: 40, palms: 22, pr: 1.0, minPr: 0.6, bloom: 0, shadows: false, ledFps: 8, ledW: 256, points: 2, cityR: 700 },
      { crowd: 420, yard: 60, palms: 34, pr: 1.25, minPr: 0.7, bloom: 0.4, shadows: false, ledFps: 12, ledW: 384, points: 3, cityR: 900 },
      { crowd: 760, yard: 90, palms: 48, pr: 1.5, minPr: 0.85, bloom: 0.6, shadows: true, ledFps: 15, ledW: 512, points: 4, cityR: 1100 },
    ][tier];
    const W = () => container.clientWidth || 800, H = () => container.clientHeight || 560;

    /* ---------- renderer, scene, camera ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    const dpr = window.devicePixelRatio || 1;
    let pr = Math.min(dpr, Q.pr);
    renderer.setPixelRatio(pr);
    renderer.setSize(W(), H());
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    container.appendChild(renderer.domElement);
    if (Q.shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    V.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();
    const FAR = SEA ? 5200 : 900;
    const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.5, FAR);
    const world = new THREE.Group(); world.scale.setScalar(S); scene.add(world);
    const L = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    const rnd = V.rng(2027);

    /* ---------- batching: solid props become a few merged meshes ---------- */
    const XF = [new THREE.Matrix4()];
    const tmpM = new THREE.Matrix4(), tq = new THREE.Quaternion(), te = new THREE.Euler(), tv = new THREE.Vector3(), ts3 = new THREE.Vector3();
    const local = (x, y, z, rx, ry, rz, s) => tmpM.compose(tv.set(x || 0, y || 0, z || 0), tq.setFromEuler(te.set(rx || 0, ry || 0, rz || 0)), ts3.setScalar(s || 1));
    /* run fn with a parent transform (like a THREE.Group, but for merged geometry) */
    function grp(x, z, ry, s, fn) { XF.push(XF[XF.length - 1].clone().multiply(local(x, 0, z, 0, ry, 0, s).clone())); fn(); XF.pop(); }
    function makeBatch() { return { pos: [], nor: [], col: [], uv: [], idx: [] }; }
    const BATCH = { solid: makeBatch(), metal: makeBatch(), glow: makeBatch(), sign: makeBatch() };
    const col = new THREE.Color();
    function push(kind, geo, hex, k, x, y, z, rx, ry, rz, uvMap) {
      const m = XF[XF.length - 1].clone().multiply(local(x, y, z, rx, ry, rz, 1));
      geo.applyMatrix4(m);
      const b = BATCH[kind], base = b.pos.length / 3, p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
      col.setHex(hex); const kk = k || 1;
      for (let i = 0; i < p.count; i++) {
        b.pos.push(p.getX(i), p.getY(i), p.getZ(i)); b.nor.push(n.getX(i), n.getY(i), n.getZ(i));
        b.col.push(col.r * kk, col.g * kk, col.b * kk);
        if (uvMap) b.uv.push(uvMap[0] + uv.getX(i) * uvMap[2], uvMap[1] + uv.getY(i) * uvMap[3]); else b.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      }
      if (geo.index) for (let i = 0; i < geo.index.count; i++) b.idx.push(base + geo.index.getX(i));
      else for (let i = 0; i < p.count; i++) b.idx.push(base + i);
      geo.dispose();
    }
    const BOX = (kind, hex, w, h, d, x, y, z, ry, k) => push(kind, new THREE.BoxGeometry(w, h, d), hex, k, x, y, z, 0, ry || 0, 0);
    const CYL = (kind, hex, rt, rb, h, x, y, z, seg, k, rx, rz) => push(kind, new THREE.CylinderGeometry(rt, rb, h, seg || 10, 1), hex, k, x, y, z, rx || 0, 0, rz || 0);
    function flushBatch(kind, mat) {
      const b = BATCH[kind]; if (!b.pos.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.idx); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat); world.add(mesh); return mesh;
    }

    /* ---------- one texture for every sign ---------- */
    const ATLAS = tier === 0 ? 1024 : 2048, RES = tier === 0 ? 40 : 64;
    const acv = document.createElement('canvas'); acv.width = acv.height = ATLAS;
    const actx = acv.getContext('2d');
    let shelfX = 2, shelfY = 2, shelfH = 0;
    const FONT = '"Albert Sans","Segoe UI",system-ui,sans-serif';
    function atlasRect(pw, ph) {
      pw = Math.min(ATLAS - 4, Math.ceil(pw)); ph = Math.ceil(ph);
      if (shelfX + pw + 2 > ATLAS) { shelfX = 2; shelfY += shelfH + 2; shelfH = 0; }
      if (shelfY + ph + 2 > ATLAS) return null;
      const r = [shelfX, shelfY, pw, ph]; shelfX += pw + 2; shelfH = Math.max(shelfH, ph); return r;
    }
    function drawText(r, text, bg, fg, weight) {
      const [x, y, w, h] = r;
      if (bg) { actx.fillStyle = bg; actx.fillRect(x, y, w, h); }
      actx.fillStyle = fg; actx.textAlign = 'center'; actx.textBaseline = 'middle';
      let fs = h * 0.5; actx.font = `${weight || 700} ${fs}px ${FONT}`;
      while (actx.measureText(text).width > w * 0.86 && fs > 5) { fs *= 0.92; actx.font = `${weight || 700} ${fs}px ${FONT}`; }
      actx.fillText(text, x + w / 2, y + h / 2 + fs * 0.05);
    }
    /* a flat sign facing +z (in the current parent transform) */
    function sign(text, w, h, bg, fg, x, y, z, ry, k) {
      const pw = Math.min(512, w * RES), ph = Math.max(14, Math.min(160, h * RES));
      const r = atlasRect(pw, ph); if (!r) return;
      drawText(r, text, bg, fg);
      push('sign', new THREE.PlaneGeometry(w, h), 0xffffff, k || 1, x, y, z, 0, ry || 0, 0, [r[0] / ATLAS, 1 - (r[1] + r[3]) / ATLAS, r[2] / ATLAS, r[3] / ATLAS]);
    }
    /* text painted on the ground */
    function floorText(text, w, h, fg, x, z, rz) {
      const pw = Math.min(768, w * RES), ph = Math.max(14, Math.min(160, h * RES));
      const r = atlasRect(pw, ph); if (!r) return;
      drawText(r, text, null, fg, 800);
      push('sign', new THREE.PlaneGeometry(w, h), 0xffffff, 1, x, 0.14, z, -Math.PI / 2, 0, rz || 0, [r[0] / ATLAS, 1 - (r[1] + r[3]) / ATLAS, r[2] / ATLAS, r[3] / ATLAS]);
    }

    /* ---------- collision registry (from the original plan) ---------- */
    const colRects = [], colCircles = [], colSegs = [];
    function addRect(x1, z1, x2, z2) { colRects.push({ x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2) }); }
    function solidOriented(x, z, w, d, ry) {
      const s = Math.abs(Math.sin(ry)) > 0.5, hw = s ? d / 2 : w / 2, hd = s ? w / 2 : d / 2;
      addRect(x - hw, z - hd, x + hw, z + hd);
    }

    /* ---------- palette: natural materials ---------- */
    const P = {
      fence: 0x22262a, fenceScrim: 0x1b2a26, truss: 0xc9d2d8, deck: 0x1b1d20, tent: 0xf1ede4, tentRoof: 0xeae5da,
      wood: 0x8a6a4a, woodDark: 0x5a4330, cabin: 0xd9d4c9, black: 0x141517, steel: 0x8f979c, red: 0xb8322d,
      gold: 0xc9a54a, platinum: 0xd6dadc, white: 0xf2f2ee, canvas: 0xe9e1cf, rope: 0x9a8f7d,
    };
    /* stall signs: real-looking brand-ish colours, not neon */
    const SIGNS = {
      'WATER': ['#1f6fa8', '#ffffff'], 'JUICE': ['#f08a3c', '#1b1208'], 'FOOD': ['#2f3a2c', '#f2e6c8'], 'BEER': ['#c9962e', '#1a1206'],
      'BAR': ['#151515', '#f2e6c8'], 'RED BULL': ['#14306b', '#f2c94c'], 'KINGSBURY': ['#5b1f2a', '#f2e6c8'], 'HELP DESK': ['#ffffff', '#141517'],
      'PIZZA HUT': ['#b8322d', '#ffffff'], 'M': ['#2c4a6b', '#ffffff'], 'W': ['#6b2c4a', '#ffffff'], 'MERCH': ['#141517', '#ffffff'],
    };
    const signCol = (t) => SIGNS[t] || ['#141517', '#f2f2ee'];

    /* ---------- prop helpers (merged) ---------- */
    function fenceRun(x1, z1, x2, z2, h) {
      h = h || 1.3;
      const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / 2)), ang = Math.atan2(dx, dz);
      for (let i = 0; i <= n; i++) CYL('metal', P.steel, 0.045, 0.045, h, x1 + dx * i / n, h / 2, z1 + dz * i / n, 6);
      /* the scrim panel (event fences wear a dark mesh banner) */
      BOX('solid', P.fenceScrim, 0.04, h * 0.82, len, x1 + dx / 2, h * 0.46, z1 + dz / 2, ang);
      BOX('metal', P.steel, 0.06, 0.05, len, x1 + dx / 2, h * 0.94, z1 + dz / 2, ang);
      if (Math.abs(dx) < 0.01 || Math.abs(dz) < 0.01) addRect(x1 - 0.15, z1 - 0.15, x2 + 0.15, z2 + 0.15);
    }
    function wallRun(x1, z1, x2, z2) {
      const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
      BOX('solid', 0x2a2d30, 0.22, 2.2, len, x1 + dx / 2, 1.1, z1 + dz / 2, Math.atan2(dx, dz));
      addRect(x1 - 0.2, z1 - 0.2, x2 + 0.2, z2 + 0.2);
    }
    /* a market stall: timber counter, white frame tent with a coloured valance, a lit sign */
    function stall(x, z, w, d, h, text, ry, solid) {
      const [bg, fg] = signCol(text);
      grp(x, z, ry || 0, 1, () => {
        BOX('solid', P.wood, w, h * 0.45, d * 0.55, 0, h * 0.225, d * 0.2);
        BOX('solid', P.cabin, w * 0.98, h * 0.95, d * 0.4, 0, h * 0.475, -d * 0.28);
        [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => CYL('metal', P.steel, 0.03, 0.03, h, sx * w * 0.47, h / 2, sz * d * 0.45, 5)));
        push('solid', new THREE.ConeGeometry(Math.max(w, d) * 0.74, h * 0.32, 4, 1), P.tentRoof, 1, 0, h + h * 0.16, 0, 0, Math.PI / 4, 0);
        sign(text, w * 0.94, Math.min(0.55, h * 0.26), bg, fg, 0, h * 0.86, d * 0.47 + 0.02);
      });
      if (solid !== false) solidOriented(x, z, w, d, ry || 0);
    }
    function arch(x, z, span, ry, text) {
      grp(x, z, ry || 0, 1, () => {
        [-1, 1].forEach((s) => BOX('metal', P.truss, 0.3, 3.2, 0.3, s * span / 2, 1.6, 0));
        BOX('metal', P.truss, span + 0.4, 0.34, 0.34, 0, 3.25, 0);
        sign(text, span * 0.88, 0.58, '#141517', '#f2f2ee', 0, 2.72, 0.18);
        sign(text, span * 0.88, 0.58, '#141517', '#f2f2ee', 0, 2.72, -0.18, Math.PI);
        BOX('glow', 0xfff1d6, span * 0.9, 0.05, 0.05, 0, 3.05, 0.2, 0, 2.2);
      });
    }
    const pathRects = [];
    const GROUND = [];       /* textured ground pieces, built after the batches: [material, w, d, x, y, z] */
    function walkSeg(main, w, d, x, z) { GROUND.push(['path', w, d, x, 0.05, z]); pathRects.push({ x1: x - w / 2, z1: z - d / 2, x2: x + w / 2, z2: z + d / 2, main }); }
    function medicTent(x, z, ry, s) {
      grp(x, z, ry || 0, s, () => {
        BOX('solid', P.white, 2.6, 1.4, 2.2, 0, 0.7, 0);
        push('solid', new THREE.CylinderGeometry(1.35, 1.35, 2.7, 3, 1), P.red, 1, 0, 1.72, 0, 0, 0, Math.PI / 2);
        sign('+ MEDIC', 1.8, 0.5, '#b8322d', '#ffffff', 0, 0.85, 1.12);
      });
      solidOriented(x, z, 2.6 * s, 2.2 * s, ry || 0);
    }
    function cabinRoom(x, z, w, h, d, label) {
      BOX('solid', P.cabin, w, h, d, x, h / 2, z);
      BOX('solid', 0x9aa0a4, w + 0.1, 0.12, d + 0.1, x, h + 0.06, z);
      BOX('glow', 0xffd9a0, 0.5, 0.35, 0.04, x - w * 0.3, h * 0.62, z + d / 2 + 0.02, 0, 1.6);
      sign(label, Math.min(w * 0.85, 4.6), 0.6, '#141517', '#f2f2ee', x, h * 0.75, z + d / 2 + 0.03);
    }

    const updaters = [];      /* per-frame animations: fn(ts, dt) */
    const nightOnly = [];     /* objects shown only at night */
    const leds = [];

    /* ================= GROUND ================= */
    /* textured materials for the floors (colour-only on phones) */
    const grass = V.groundMaterial('leafy_grass', 5, { color: 0x9aa58a });
    const grassFar = V.groundMaterial('leafy_grass', 9, { color: 0x86936f });
    const concrete = V.groundMaterial('concrete_pavement', 6, { color: 0xd8d2c6 });
    const pathMat = V.groundMaterial('concrete_pavement', 3, { color: 0xe8e2d6 });
    const asphalt = V.groundMaterial('asphalt_02', 6, { color: 0x8a8a8a });
    const sandMat = sandMaterial();
    const boardMat = boardsMaterial();
    function sandMaterial() {
      const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
      const cx = cv.getContext('2d'), img = cx.createImageData(N, N), r = V.rng(5);
      for (let i = 0; i < N * N; i++) {
        const v = 200 + (r() - 0.5) * 34 + Math.sin(i * 0.013) * 4;
        img.data[i * 4] = v; img.data[i * 4 + 1] = v * 0.93; img.data[i * 4 + 2] = v * 0.78; img.data[i * 4 + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 3, 1 / 3); t.anisotropy = V.maxAniso;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.97, metalness: 0, color: 0xe6d6b6 });
    }
    function boardsMaterial() {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
      const cx = cv.getContext('2d'), r = V.rng(8);
      for (let y = 0; y < 256; y += 16) {
        const v = 120 + Math.floor(r() * 40); cx.fillStyle = `rgb(${v + 20},${v - 8},${v - 40})`; cx.fillRect(0, y, 128, 15);
        cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(0, y + 15, 128, 1); cx.fillRect(Math.floor(r() * 128), y, 1, 15);
      }
      const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 4, 1 / 4); t.anisotropy = V.maxAniso;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, metalness: 0 });
    }
    const groundMats = { grass, grassFar, concrete, path: pathMat, asphalt, sand: sandMat, boards: boardMat };
    /* the site: lawns around, the festival field, the Yard plaza, the boardwalk corridor */
    GROUND.push(['grassFar', SEA ? 150 : 320, SEA ? 170 : 320, SEA ? 0 : 2, -0.03, 4]);
    GROUND.push(['grass', 34.4, 49.2, 0, 0, -11.5]);
    GROUND.push(['concrete', 29, 12, -2.75, 0.012, 29.75]);
    GROUND.push(['boards', 4.1, 10.8, -1.55, 0.03, 18.35]);
    GROUND.push(['concrete', 16, 24, -25.5, 0.012, 46.5]);            /* ticket plaza */
    GROUND.push(['asphalt', 12, 18, 33.2, 0.02, -24]);                /* emergency bay */
    GROUND.push(['asphalt', 9, SEA ? 1400 : 320, 40, 0.014, SEA ? 0 : 4]);  /* the road */
    for (let rd = (SEA ? -300 : -150); rd < (SEA ? 300 : 160); rd += 5) BOX('glow', 0xf2f2ee, 0.18, 0.02, 2.2, 40, 0.03, rd, 0, 0.6);
    /* dashed line in front of the stage */
    for (let dl = -16.6; dl < 16.6; dl += 1.2) BOX('glow', 0xf2f2ee, 0.6, 0.02, 0.12, dl, 0.03, -16, 0, 0.5);

    /* ================= FESTIVAL PERIMETER ================= */
    fenceRun(-17.1, -36, -17.1, 13);
    fenceRun(-17.1, -36, 17.2, -36);
    fenceRun(17.2, -36, 17.2, -22.4); fenceRun(17.2, -19.6, 17.2, 13);
    fenceRun(-17.1, 13, -3.8, 13); fenceRun(0.7, 13, 17.2, 13);
    wallRun(-16.9, -29, -4, -29); wallRun(2.7, -29, 17, -29);
    wallRun(-2.25, -36, -2.25, -31.6); wallRun(-10.05, -36, -10.05, -32.4);

    /* ================= BACK OF HOUSE ================= */
    for (let i = 0; i < 4; i++) {
      stall(-15.6 + i * 1.55, -33.6, 1.45, 2, 2.3, 'M', 0);
      stall(-8.6 + i * 1.55, -33.6, 1.45, 2, 2.3, 'W', 0);
    }
    medicTent(12, -30.6, 0, 0.6);
    stall(-5.75, -27.4, 2.8, 1.6, 2.1, 'KINGSBURY', 0);
    const topRow = ['WATER', 'JUICE', 'FOOD', 'BEER', 'BAR', 'RED BULL'];
    topRow.forEach((s, i) => stall(3.9 + i * 2.2, -27.4, 2, 1.6, 2.0, s, 0));
    /* production storage + truck */
    BOX('solid', 0x3a3f44, 6.2, 2.6, 3.9, -21.2, 1.3, -23.7);
    sign('PRODUCTION STORAGE', 4.6, 0.6, '#141517', '#f2f2ee', -21.2, 1.8, -21.73);
    addRect(-24.3, -25.65, -18.1, -21.75);

    /* ================= STAGE ================= */
    const SX = -2, SZ = -19.5;
    const stage = buildStage();
    function buildStage() {
      const DW = 14, DD = 6, TOP = 1.3, ZB = SZ - 2.6, ZF = SZ + 3.4, HT = 9.2;
      /* deck, stairs, risers */
      BOX('solid', P.deck, DW, TOP, DD, SX, TOP / 2, SZ);
      BOX('solid', 0x2a2c2f, DW + 0.2, 0.08, DD + 0.2, SX, TOP + 0.04, SZ);
      BOX('glow', 0xfff1d6, DW, 0.05, 0.05, SX, TOP + 0.02, SZ + DD / 2 + 0.05, 0, 1.4);
      BOX('solid', P.deck, 3, 0.8, 2, SX - 3.4, 0.4, SZ + 3.6); BOX('solid', P.deck, 3, 0.8, 2, SX + 3.4, 0.4, SZ + 3.6);
      /* DJ booth: wooden front with a lit band */
      BOX('solid', P.woodDark, 3.4, 1.15, 1.3, SX, TOP + 0.58, SZ + 0.7);
      BOX('glow', 0xffe3b0, 3.42, 0.08, 0.04, SX, TOP + 1.05, SZ + 1.36, 0, 2.6);
      BOX('solid', 0x0b0b0c, 2.6, 0.06, 0.8, SX, TOP + 1.17, SZ + 0.6);
      addRect(SX - 7.5, SZ - 2.6, SX + 7.5, SZ + 4.3);

      /* box truss: four towers, a roof grid and a header beam */
      const tk = V.trussKit(world);
      const tx = [SX - DW / 2 - 0.2, SX + DW / 2 + 0.2];
      tx.forEach((x) => { tk.tower(x, ZB, HT); tk.tower(x, ZF, HT); });
      tk.run([tx[0], HT, ZF], [tx[1], HT, ZF], 0.6); tk.run([tx[0], HT, ZB], [tx[1], HT, ZB], 0.6);
      tx.forEach((x) => tk.run([x, HT, ZB], [x, HT, ZF], 0.6));
      tk.run([SX - 3, HT, ZB], [SX - 3, HT, ZF], 0.45); tk.run([SX + 3, HT, ZB], [SX + 3, HT, ZF], 0.45);
      /* speaker towers either side, with hung line arrays */
      [-1, 1].forEach((s) => {
        const x = SX + s * (DW / 2 + 2.6);
        tk.tower(x, SZ + 1.2, 8.4, 0.55);
        for (let i = 0; i < 6; i++) BOX('solid', 0x101112, 1.25, 0.5, 1.1, x, 7.6 - i * 0.52, SZ + 1.9, s * -0.12);
        for (let i = 0; i < 2; i++) BOX('solid', 0x101112, 1.6, 1.1, 1.4, x, 0.55 + i * 1.12, SZ + 1.6);
      });
      tk.finish();

      /* LED screens: the show's artwork (assets/screens), one set per time of day */
      const TL2 = new THREE.TextureLoader();
      const scrTex = (n) => { const t = TL2.load('assets/screens/' + n + '.jpg'); t.encoding = THREE.sRGBEncoding; t.anisotropy = V.maxAniso; return t; };
      const SCR = {
        evening: { main: scrTex('main-evening'), header: scrTex('header-evening'), sideL: scrTex('side-evening-l'), sideR: scrTex('side-evening-r') },
        night: { main: scrTex('main-night'), header: scrTex('header-night'), sideL: scrTex('side-night-l'), sideR: scrTex('side-night-r') },
      };
      const still = (tex) => ({ tex, draw() {}, last: 0 });
      const screens = {
        main: V.ledPanel(world, still(SCR.evening.main), 12, 5.2, SX, TOP + 3.2, ZB + 0.25, 0, 0).children[0].material,
        sides: [-1, 1].map((s) => V.ledPanel(world, still(s < 0 ? SCR.evening.sideL : SCR.evening.sideR), 3.6, 2.2, SX + s * (DW / 2 + 2.6), 4.6, SZ + 2.6, s * -0.12, 0).children[0].material),
        header: V.ledPanel(world, still(SCR.evening.header), 7, 1.6, SX, HT - 1.2, ZF + 0.35, 0, 0.08).children[0].material,
      };

      /* moving heads on the front truss and floor beams */
      const cols = [0xffd08a, 0xffffff, 0xff6a3d, 0x7fd0ff, 0xffffff, 0xffb066, 0x7fd0ff, 0xff6a3d];
      const beams = [];
      cols.forEach((c, i) => beams.push({ x: SX - 6 + i * (12 / 7), y: HT - 0.4, z: ZF, color: c, pitch: 0.5, yaw: 0, swing: 0.35 + (i % 3) * 0.08, len: 22, width: 1.3, speed: 0.8 + (i % 2) * 0.25 }));
      if (tier > 0) [-1, 1].forEach((s) => [0, 1].forEach((j) => beams.push({ x: SX + s * (4 + j * 1.6), y: TOP + 0.3, z: SZ + DD / 2 - 0.3, color: j ? 0xffffff : 0xffc07a, pitch: Math.PI - 0.35, yaw: 0, swing: 0.4, len: 40, width: 1.0, speed: 0.6 })));
      const rig = V.beamRig(world, beams, 0.5);
      /* stage haze, lit from behind */
      const hz = tier > 0 ? V.haze(world, [[SX - 4, 3, SZ - 1, 10, 0xffc69a], [SX + 4, 3.5, SZ - 1, 11, 0x9fc8ff], [SX, 5, SZ + 2, 14, 0xffffff], [SX - 8, 2, SZ + 6, 12, 0xffb066], [SX + 8, 2, SZ + 6, 12, 0x9fc8ff]]) : null;
      return { rig, hz, screens, SCR };
    }

    /* ================= GOLD / PLATINUM PLATFORMS ================= */
    function platform(x, z, ry, nm, deckCol, bg, fg) {
      grp(x, z, ry, 1, () => {
        BOX('solid', P.black, 6.4, 1.0, 2.8, 0, 0.5, 0);
        BOX('metal', deckCol, 6.1, 0.2, 2.5, 0, 1.1, 0);
        for (let i = 0; i <= 4; i++) CYL('metal', P.steel, 0.04, 0.04, 1.0, -3 + i * 1.5, 1.7, -1.25, 6);
        BOX('metal', P.steel, 6.2, 0.06, 0.06, 0, 2.2, -1.25);
        BOX('glow', 0xfff1d6, 6.2, 0.04, 0.04, 0, 1.22, 1.26, 0, 1.6);
        sign(nm, 3.2, 0.6, bg, fg, 0, 0.55, 1.42);
      });
      const c = Math.cos(ry), s = Math.sin(ry);
      colSegs.push({ ax: x - c * 3.1, az: z + s * 3.1, bx: x + c * 3.1, bz: z - s * 3.1, r: 1.5 });
    }
    platform(-11, -20, 0.7, 'GOLD', P.gold, '#c9a54a', '#141517');
    platform(6.75, -20, -0.7, 'PLATINUM', P.platinum, '#d6dadc', '#141517');
    arch(17.2, -21, 2.8, Math.PI / 2, 'SECURITY CHECK');
    [[-23.2, 23.6], [-22.4, 22.6]].forEach((q) => { fenceRun(17.6, q[0], q[1], q[0], 1.0); fenceRun(q[1], q[0], q[1], -17.4, 1.0); });

    /* ================= FESTIVAL FLOOR ================= */
    const sideStalls = ['RED BULL', 'JUICE', 'FOOD', 'BEER', 'BAR', 'WATER', 'KINGSBURY', 'HELP DESK', 'PIZZA HUT'];
    sideStalls.forEach((s, i) => { stall(-15.9, -12.2 + i * 1.45, 1.35, 1.3, 1.9, s, Math.PI / 2); stall(15.9, -12.2 + i * 1.45, 1.35, 1.3, 1.9, s, -Math.PI / 2); });
    /* FOH tent */
    BOX('solid', P.black, 4.6, 0.7, 2.2, -2.5, 0.35, -0.25);
    BOX('solid', 0x2a2d30, 4.2, 1.1, 1.9, -2.5, 1.25, -0.25);
    [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => CYL('metal', P.steel, 0.04, 0.04, 2.6, -2.5 + sx * 2.2, 1.3, -0.25 + sz * 1.0, 5)));
    BOX('solid', P.tent, 4.8, 0.08, 2.4, -2.5, 2.62, -0.25);
    BOX('glow', 0x9fd8ff, 3.6, 0.3, 0.03, -2.5, 1.55, 0.72, 0, 1.4);
    sign('FOH', 2, 0.5, '#141517', '#f2f2ee', -2.5, 2.25, 0.96);
    fenceRun(-5.2, -1.6, 0.2, -1.6, 0.9); fenceRun(-5.2, -1.6, -5.2, 1.1, 0.9); fenceRun(0.2, -1.6, 0.2, 1.1, 0.9);
    addRect(-5.2, -1.6, 0.2, 1.1);
    /* VIP lounge: timber deck, sofas, festoon lights */
    BOX('solid', P.woodDark, 8.4, 0.5, 3.4, -2.3, 0.25, 2.8);
    push('solid', worldBoard(8, 3), 0xffffff, 1, -2.3, 0.51, 2.8, 0, 0, 0);
    for (let sf = 0; sf < 4; sf++) {
      const sx = -5.3 + sf * 2;
      BOX('solid', 0xe9e1cf, 1.5, 0.35, 0.7, sx, 0.68, 3.3); BOX('solid', 0xe9e1cf, 1.5, 0.5, 0.18, sx, 0.93, 3.6);
      BOX('solid', 0x8a5a3a, 0.5, 0.3, 0.5, sx, 0.65, 2.4);
    }
    sign('VIP AREA', 3, 0.5, '#c9a54a', '#141517', -2.3, 0.28, 4.52);
    fenceRun(-6.6, 1.1, -6.6, 4.5, 1.0); fenceRun(2.0, 1.1, 2.0, 4.5, 1.0); fenceRun(-6.6, 4.5, 2.0, 4.5, 1.0);
    addRect(-6.6, 1.1, 2.0, 4.5);
    function worldBoard(w, d) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); return g; }
    /* east washrooms */
    for (let i = 0; i < 4; i++) { stall(16.3, 2.6 + i * 1.12, 1.05, 1.3, 2.1, 'W', -Math.PI / 2); stall(16.3, 7.8 + i * 1.12, 1.05, 1.3, 2.1, 'M', -Math.PI / 2); }
    medicTent(7, 11.3, Math.PI, 0.95);
    stall(-12.6, 11.6, 1.6, 1.2, 1.9, 'WATER', Math.PI);
    arch(-1.55, 13, 4.5, 0, 'SECURITY CHECK');

    /* ================= FLOORING CORRIDOR ================= */
    fenceRun(-3.8, 13, -3.8, 23.75); fenceRun(0.7, 13, 0.7, 19); fenceRun(0.7, 21.2, 0.7, 23.75);
    floorText('FLOORING', 3.4, 0.9, 'rgba(255,248,235,.75)', -1.55, 17.4);
    /* a canopy of festoon lights over the corridor (added with the Yard lights below) */
    BOX('solid', 0x2a2d30, 0.9, 2.4, 2.2, 1.25, 1.2, 20.1);
    sign('SECURITY CHECK', 2, 0.5, '#141517', '#f2f2ee', 1.72, 1.8, 20.1, Math.PI / 2);
    addRect(0.8, 19, 1.7, 21.2);
    function fxMachine(x, nm) {
      BOX('solid', P.black, 0.9, 0.7, 0.9, x, 0.35, 22.9);
      CYL('metal', P.steel, 0.16, 0.2, 0.9, x, 0.95, 22.75, 12, 1, -0.6);
      sign(nm, 1.6, 0.36, '#141517', '#f2f2ee', x, 0.42, 23.36);
      addRect(x - 0.45, 22.45, x + 0.45, 23.35);
    }
    fxMachine(-5, 'CONFETTI'); fxMachine(2.4, 'SMOKE');

    /* ================= THE YARD ================= */
    fenceRun(-17.25, 23.75, -3.8, 23.75); fenceRun(0.7, 23.75, 11.75, 23.75);
    fenceRun(-17.25, 23.75, -17.25, 35.75); fenceRun(-17.25, 35.75, 11.75, 35.75);
    fenceRun(11.75, 23.75, 11.75, 29.6); fenceRun(11.75, 31.9, 11.75, 35.75);
    arch(11.75, 30.75, 2.3, Math.PI / 2, 'SECURITY CHECK');
    /* the round pub: timber bar ring, a canvas roof, a lit sign */
    grp(-1.65, 29.75, 0, 1, () => {
      push('solid', new THREE.CylinderGeometry(2.3, 2.3, 1.15, 40, 1, true), P.wood, 1, 0, 0.58, 0);
      push('solid', new THREE.RingGeometry(1.7, 2.45, 40), 0x3a2a1c, 1, 0, 1.17, 0, -Math.PI / 2, 0, 0);
      CYL('solid', P.woodDark, 0.8, 0.8, 2.4, 0, 1.2, 0, 20);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; CYL('metal', P.steel, 0.05, 0.05, 3.2, Math.cos(a) * 2.2, 1.6, Math.sin(a) * 2.2, 6); }
      push('solid', new THREE.ConeGeometry(3.2, 1.2, 16, 1, true), P.canvas, 1, 0, 3.7, 0);
      push('glow', new THREE.TorusGeometry(2.25, 0.04, 6, 48), 0xffd9a0, 2.4, 0, 1.2, 0, Math.PI / 2, 0, 0);
      sign('PUB', 1.3, 0.48, '#141517', '#f2c94c', 0, 2.65, 0.85);
      sign('PUB', 1.3, 0.48, '#141517', '#f2c94c', 0, 2.65, -0.85, Math.PI);
    });
    colCircles.push({ x: -1.65, z: 29.75, r: 2.5 });
    /* set times banner */
    BOX('metal', P.truss, 0.16, 3, 0.16, -12.6, 1.5, 24.4); BOX('metal', P.truss, 0.16, 3, 0.16, -6.7, 1.5, 24.4);
    sign('SET TIMES', 5.6, 1.6, '#141517', '#f2f2ee', -9.65, 2.0, 24.48);
    addRect(-12.8, 24.2, -6.5, 24.6);
    /* mirror */
    BOX('solid', P.woodDark, 1.4, 2.4, 0.2, 2.15, 1.3, 24.3);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.1), new THREE.MeshStandardMaterial({ color: 0xdfe6e8, metalness: 1, roughness: 0.05 }));
    mirror.position.set(2.15, 1.3, 24.42); world.add(mirror);
    sign('MIRROR', 1.2, 0.3, '#141517', '#f2f2ee', 2.15, 0.15, 24.46);
    addRect(1.35, 24, 2.95, 24.6);
    /* photobox */
    BOX('solid', 0x2f3a3e, 1.8, 2.3, 1.8, 6.4, 1.15, 24.9);
    BOX('glow', 0xffffff, 1.2, 0.8, 0.03, 6.4, 1.5, 25.81, 0, 1.4);
    sign('PHOTOBOX', 1.6, 0.42, '#141517', '#f2f2ee', 6.4, 2.05, 25.82);
    addRect(5.5, 24, 7.3, 25.8);
    /* 360 booth: a platform with a spinning camera arm */
    CYL('solid', P.black, 1.1, 1.2, 0.3, 9.75, 0.15, 26.75, 32);
    push('glow', new THREE.TorusGeometry(1.2, 0.04, 6, 48), 0xfff1d6, 2.2, 9.75, 0.32, 26.75, Math.PI / 2, 0, 0);
    const armPivot = new THREE.Group(); armPivot.position.set(9.75, 0.3, 26.75); world.add(armPivot);
    { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), V.std(0xc9d2d8, { metalness: 0.8, roughness: 0.3 })); arm.position.set(1.1, 0.9, 0); armPivot.add(arm);
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.18), V.std(0x111214)); cam.position.set(1.0, 1.8, 0); armPivot.add(cam); }
    updaters.push((t) => { armPivot.rotation.y = t * 1.6; });
    sign('360 VIDEO BOOTH', 2.4, 0.4, '#141517', '#f2f2ee', 9.75, 0.15, 28.0);
    colCircles.push({ x: 9.75, z: 26.75, r: 1.3 });
    /* west side */
    stall(-16.2, 27.35, 1.8, 1.3, 2.0, 'WATER', Math.PI / 2);
    stall(-16.2, 31.9, 2.2, 1.3, 2.0, 'MERCH', Math.PI / 2);
    /* fire pit: a stone bowl, logs, and a flickering flame */
    CYL('solid', 0x4a4540, 0.9, 0.7, 0.55, -13.85, 0.28, 29.4, 20);
    for (let i = 0; i < 4; i++) CYL('solid', 0x3a2a1c, 0.08, 0.08, 1.0, -13.85, 0.6, 29.4, 6, 1, Math.PI / 2, i * Math.PI / 4);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    flameMat.color.multiplyScalar(2.4);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 12, 1, true), flameMat); flame.position.set(-13.85, 1.1, 29.4); world.add(flame);
    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 10, 1, true), flameMat.clone()); flame2.material.color.setHex(0xffd27a).multiplyScalar(3); flame2.position.set(-13.85, 0.95, 29.4); world.add(flame2);
    sign('FIRE PIT', 1.4, 0.36, '#b8322d', '#ffffff', -13.85, 0.28, 30.31);
    colCircles.push({ x: -13.85, z: 29.4, r: 1.0 });
    function tent(x, nm) {
      grp(x, 34.4, 0, 1, () => {
        for (let i = 0; i < 4; i++) CYL('metal', P.steel, 0.04, 0.04, 2.3, i < 2 ? -1.2 : 1.2, 1.15, i % 2 ? -1.0 : 1.0, 5);
        push('solid', new THREE.ConeGeometry(1.9, 0.9, 4, 1), P.tentRoof, 1, 0, 2.75, 0, 0, Math.PI / 4, 0);
        BOX('solid', P.wood, 2, 0.8, 0.6, 0, 0.4, 0.2);
        sign(nm, 2.2, 0.42, '#141517', '#f2f2ee', 0, 2.05, -1.02, Math.PI);
      });
      addRect(x - 1.25, 33.4, x + 1.25, 35.4);
    }
    tent(-14.15, 'TATTOO'); tent(-8.75, 'FACE PAINTING');
    function backdrop(x, nm, bg, fg) {
      BOX('metal', P.truss, 4.4, 2.8, 0.25, x, 1.4, 35.1);
      sign(nm, 4.1, 2.4, bg, fg, x, 1.45, 34.96, Math.PI);
      addRect(x - 2.2, 34.9, x + 2.2, 35.3);
    }
    backdrop(-0.4, 'WE ARE LOST', '#f2f2ee', '#141517');
    backdrop(6.25, 'ALBUM WALL', '#141517', '#f2c94c');

    /* ================= PATHS ================= */
    walkSeg(false, 20.9, 2, 12.15, 20.1);
    walkSeg(false, 2, 35.4, 21.6, 2.4);
    floorText('BACKSTAGE ENTRANCE', 12, 1.4, 'rgba(20,21,23,.7)', 21.6, 2, Math.PI / 2);
    walkSeg(true, 11.2, 2.2, 17.35, 30.75);
    walkSeg(true, 2.2, 21, 22.95, 41.15);
    floorText('ENTRANCE', 2.0, 0.55, 'rgba(20,21,23,.8)', 22.95, 47.5);          /* reads the right way up as you walk in */
    fenceRun(12, 27.6, 29, 27.6); fenceRun(29, 27.6, 29, 52);
    arch(22.95, 48.5, 5.2, 0, 'WE ARE LOST');

    /* ================= TICKET LANES ================= */
    const lanes = ['VIP', 'ONLINE TIX', 'AT GATE', 'INVITATION', 'PRODUCERS & BACKSTAGE'];
    const laneZ = [38, 42.4, 46.75, 51.1, 55.3];
    lanes.forEach((nm, i) => {
      const c = laneZ[i];
      fenceRun(-31.8, c - 1.3, -19.5, c - 1.3, 1.0); fenceRun(-31.8, c + 1.3, -19.5, c + 1.3, 1.0);
      stall(-32.6, c, 2.4, 1.4, 2.3, nm, Math.PI / 2);
    });

    /* ================= EMERGENCY BAYS ================= */
    const bayZ = [-29.25, -25.75, -22.25, -18.75];
    for (let b = 0; b <= 4; b++) BOX('glow', 0xf2f2ee, 5.6, 0.02, 0.12, 33.2, 0.03, -31 + b * 3.5, 0, 0.6);
    BOX('glow', 0xf2f2ee, 0.12, 0.02, 14, 30.4, 0.03, -24, 0, 0.6);
    function wheels(xs, r, zz) { xs.forEach((x) => [-zz, zz].forEach((z) => CYL('solid', 0x111214, r, r, 0.22, x, r, z, 12, 1, Math.PI / 2))); }
    function ambulance(z) {
      grp(33.2, z, 0, 1, () => {
        BOX('solid', P.white, 3.2, 1.5, 1.6, -0.4, 0.95, 0); BOX('solid', P.white, 1.0, 1.1, 1.5, 1.7, 0.75, 0);
        BOX('solid', P.red, 3.3, 0.22, 1.62, -0.4, 1.0, 0);
        BOX('glow', 0xff3b2e, 0.4, 0.16, 0.4, -0.4, 1.78, 0, 0, 2.2);
        BOX('solid', 0x22343e, 0.04, 0.5, 1.3, 2.2, 1.0, 0);
        sign('AMBULANCE', 2.4, 0.4, '#ffffff', '#b8322d', -0.4, 1.42, 0.81);
        wheels([-1.4, 1.5], 0.3, 0.78);
      });
      addRect(31.1, z - 0.9, 35.3, z + 0.9);
    }
    grp(33.2, bayZ[0], 0, 0.78, () => {
      BOX('solid', P.red, 5.0, 1.7, 2.0, -0.6, 1.05, 0); BOX('solid', P.red, 1.4, 1.3, 1.9, 2.6, 0.85, 0);
      BOX('metal', P.steel, 4.4, 0.16, 0.5, -0.8, 2.1, 0);
      BOX('glow', 0xffd23e, 0.5, 0.2, 0.5, 2.6, 1.6, 0, 0, 2.2);
      sign('FIRE TRUCK', 3, 0.5, '#b8322d', '#ffffff', -0.6, 1.05, 1.02);
      wheels([-2.4, -0.6, 2.4], 0.36, 0.95);
    });
    addRect(30.8, bayZ[0] - 0.9, 35.6, bayZ[0] + 0.9);
    ambulance(bayZ[1]); ambulance(bayZ[2]); ambulance(bayZ[3]);
    [[30.5, -31], [35.9, -31], [30.5, -17], [35.9, -17]].forEach((p) => { CYL('metal', P.steel, 0.09, 0.09, 2.9, p[0], 1.45, p[1], 10); colCircles.push({ x: p[0], z: p[1], r: 0.2 }); });
    BOX('solid', P.white, 6, 0.14, 14.4, 33.2, 2.96, -24); BOX('solid', P.red, 0.16, 0.3, 14.4, 30.2, 2.8, -24);
    sign('EMERGENCY BAY', 6, 0.6, '#ffffff', '#b8322d', 30.1, 2.3, -24, -Math.PI / 2);

    /* ================= AROUND THE SITE ================= */
    /* Behind the stage: a working backstage compound — shipping containers (some stacked),
       production trucks and light masts — so the north end isn't empty lawn. */
    [[-12, -40.5, 0.1, 0xb8503a], [-7.6, -40.9, -0.06, 0x3a6b8a], [-3.2, -40.4, 0.04, 0x6b7a4a],
     [2.4, -40.9, 0, 0x8a8273], [7.0, -40.5, 0.12, 0xb8503a], [11.6, -40.8, -0.08, 0x4a5a6b]].forEach(([x, z, ry, c], i) => {
      BOX('solid', c, 4.0, 1.7, 1.7, x, 0.85, z, ry);
      BOX('solid', 0x2a2d30, 0.1, 1.5, 1.6, x + (i % 2 ? 1.96 : -1.96), 0.85, z, ry);
      if (i % 3 === 0) BOX('solid', 0x7a8491, 4.0, 1.7, 1.7, x, 2.55, z, ry + 0.03);
      addRect(x - 2.2, z - 1.1, x + 2.2, z + 1.1);
    });
    function boxTruck(x, z, ry) {
      grp(x, z, ry, 1, () => {
        BOX('solid', 0xe8e4da, 3.8, 1.7, 1.5, -0.4, 1.15, 0);
        BOX('solid', 0x4a5560, 1.0, 1.25, 1.45, 2.0, 0.92, 0);
        wheels([-1.5, 0.6, 2.0], 0.3, 0.8);
      });
      solidOriented(x, z, 5.4, 1.7, ry);
    }
    boxTruck(-13.5, -44.6, 0.25); boxTruck(-7.2, -45.2, -0.1); boxTruck(14, -44.8, 0.5);
    [[-16.2, -38.6], [15.8, -38.6]].forEach(([x, z]) => {           /* backstage light masts */
      CYL('metal', 0x5d646a, 0.09, 0.12, 6.4, x, 3.2, z, 8);
      BOX('glow', 0xeef2ff, 0.8, 0.22, 0.22, x, 6.3, z, 0, 2.6);
      addRect(x - 0.25, z - 0.25, x + 0.25, z + 0.25);
    });

    /* Parked cars along the far side of the road, and a parking field past the ticket lanes. */
    const CARCOLS = [0x9aa0a6, 0x3a4552, 0x6b2f2a, 0xd8d4c9, 0x2f4a3a, 0x16161a, 0x7a6a4a];
    function car(x, z, ry, i) {
      grp(x, z, ry, 1, () => {
        BOX('solid', CARCOLS[i % CARCOLS.length], 2.7, 0.55, 1.2, 0, 0.5, 0);
        BOX('solid', 0x20262c, 1.5, 0.45, 1.06, -0.15, 0.98, 0);
        wheels([-0.85, 0.95], 0.24, 0.62);
      });
    }
    for (let i = 0, z = -42; z <= 58; z += 6.3, i++) { if (i % 4 === 3) continue; car(44.9, z + rnd() * 1.5, Math.PI / 2 + (rnd() - 0.5) * 0.06, i); }
    for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 5; c2++) {
      if (rnd() > 0.85) continue;
      car(-21.5 - r2 * 4.2, 59.5 + c2 * 3.1, 0.05 + (rnd() - 0.5) * 0.1, r2 * 5 + c2);
    }

    /* Flags outside the Yard's south fence, and bushes breaking up the open lawn. */
    for (let i = 0; i < 7; i++) {
      const fx = -14 + i * 4, fz = 37.2;
      CYL('metal', 0x8a9096, 0.045, 0.045, 3.4, fx, 1.7, fz, 6);
      const fc = i % 2 ? 0x3ee0ff : 0xf2f2ee;
      push('glow', new THREE.PlaneGeometry(1.05, 0.55), fc, 0.9, fx + 0.56, 3.0, fz, 0, 0, 0);
      push('glow', new THREE.PlaneGeometry(1.05, 0.55), fc, 0.7, fx + 0.56, 3.0, fz - 0.015, 0, Math.PI, 0);
    }
    {
      const bush = (x, z, sc) => push('solid', new THREE.IcosahedronGeometry(0.7 * sc, 0), rnd() > 0.5 ? 0x2a4a30 : 0x35583a, 1, x, 0.42 * sc, z, rnd() * 3, rnd() * 3, 0);
      for (let i = 0; i < 14; i++) bush(20 + rnd() * 15, -46 + rnd() * 54, 0.8 + rnd() * 0.9);   /* east lawn, inside the road */
      for (let i = 0; i < 8; i++) bush(-38 + rnd() * 16, -44 + rnd() * 24, 0.8 + rnd() * 0.8);   /* north-west lawn */
      for (let i = 0; i < 8; i++) bush(-37 + rnd() * 10, 24 + rnd() * 32, 0.8 + rnd() * 0.8);    /* by the ticket plaza */
      for (let i = 0; i < 6; i++) bush(2 + rnd() * 16, 46 + rnd() * 14, 0.7 + rnd() * 0.8);      /* south lawn */
    }

    /* ================= STREET LAMPS & FESTOON LIGHTS ================= */
    /* lamps along the road and the entrance walkway: a pole and a glowing head (no real lights: cheap) */
    const lampSpots = [];
    for (let z = -60; z <= 70; z += 13) lampSpots.push([36.4, z]);
    [[24.6, 34], [24.6, 46], [19.4, 32.4], [-20, 40], [-20, 50], [20.8, 38.5], [25.2, 41.5], [20.8, 51], [25.2, 55], [14.5, 29.2]].forEach((p) => lampSpots.push(p));
    lampSpots.forEach(([x, z]) => {
      CYL('metal', 0x5d646a, 0.07, 0.1, 5.2, x, 2.6, z, 8);
      BOX('metal', 0x5d646a, 0.9, 0.08, 0.12, x - 0.4, 5.15, z);
      BOX('glow', 0xffe2b0, 0.36, 0.08, 0.2, x - 0.8, 5.08, z, 0, 3.2);
    });
    /* festoon bulbs: strings over the Yard and the corridor, drawn as glowing points */
    const bulbs = [];
    const festoon = (x1, z1, x2, z2, y, sag, n) => { for (let i = 0; i <= n; i++) { const t = i / n; bulbs.push(x1 + (x2 - x1) * t, y - Math.sin(Math.PI * t) * sag, z1 + (z2 - z1) * t); } };
    for (let i = 0; i < 5; i++) festoon(-17, 24.5 + i * 2.6, 11.5, 24.5 + i * 2.6 + 0.6, 4.2, 0.7, 26);
    for (let i = 0; i < 4; i++) festoon(-3.8, 14 + i * 2.8, 0.7, 14 + i * 2.8, 3.4, 0.25, 6);
    festoon(-6.6, 1.1, 2.0, 1.1, 2.6, 0.3, 10); festoon(-6.6, 4.5, 2.0, 4.5, 2.6, 0.3, 10);
    /* strings zig-zagging over the entrance walkway, so the walk in glows */
    for (let i = 0; i < 6; i++) festoon(i % 2 ? 20.9 : 25.1, 31 + i * 3.6, i % 2 ? 25.1 : 20.9, 34.6 + i * 3.6, 3.5, 0.5, 12);
    festoon(16, 28.6, 29, 29.2, 3.8, 0.6, 16);
    /* poles for the strings */
    for (let i = 0; i < 5; i++) { CYL('metal', 0x5d646a, 0.05, 0.05, 4.4, -17.05, 2.2, 24.5 + i * 2.6, 6); CYL('metal', 0x5d646a, 0.05, 0.05, 4.4, 11.55, 2.2, 25.1 + i * 2.6, 6); }
    const bulbGeo = new THREE.BufferGeometry(); bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(bulbs, 3));
    const bulbMat = new THREE.PointsMaterial({ color: 0xffd59a, size: tier === 0 ? 0.22 : 0.18, transparent: true, depthWrite: false });
    bulbMat.color.multiplyScalar(4);
    const bulbPts = new THREE.Points(bulbGeo, bulbMat); world.add(bulbPts);

    /* ================= PORT CITY AROUND THE SITE ================= */
    let water = null, foam = null, glitter = null, skylineMesh = null;
    const palmSpots = [];
    /* palms along the road and the site edges */
    for (let z = -54; z <= 64; z += 8.5) { palmSpots.push([45, z + rnd() * 3, 0.9 + rnd() * 0.3, 'palm']); if (rnd() > 0.35) palmSpots.push([31.5, z + 4, 0.8 + rnd() * 0.3, 'palm']); }
    [[-24, 30], [-22, 20], [-24, 8], [-23, -4], [-24, -14], [14, 40], [6, 42], [-4, 41], [-12, 42], [-38, 34], [-38, 56], [8, -46], [-12, -44], [22, -44]].forEach(([x, z]) => palmSpots.push([x, z, 0.85 + rnd() * 0.35, 'palm']));
    if (SEA) {
      /* the beach: sand from the site's west edge down to the waterline, a promenade, the sea */
      const shoreX = -66;
      GROUND.push(['sand', 46, 1500, shoreX + 23, -0.02, 0]);
      GROUND.push(['path', 4, 1500, -41, 0.02, 0]);                            /* beach promenade */
      for (let z = -220; z <= 230; z += 11) palmSpots.push([-44.5 + rnd() * 2, z + rnd() * 4, 0.95 + rnd() * 0.4, 'palm']);
      /* Port City land to the north and south, and the land across the road */
      GROUND.push(['grassFar', 360, 1400, 120, -0.06, 0]);       /* Port City land around the site */
      GROUND.push(['grassFar', 1600, 1800, 1050, -0.08, 0]);     /* land to the east, fading into the haze */
      const wm = V.waterMaterial(18);
      wm.mat.color = L(0x155068); wm.mat.roughness = 0.16; wm.mat.envMapIntensity = 1.4;
      water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000, 1, 1), wm.mat);
      water.rotation.x = -Math.PI / 2; water.position.set(shoreX - 4500 + 6, -0.32, 0); water.userData.noCast = true; world.add(water);
      water.material.userData.linear = true;
      updaters.push((t) => wm.animate(t));
      /* the foam line where waves meet the sand */
      const fcv = document.createElement('canvas'); fcv.width = 64; fcv.height = 256;
      const fcx = fcv.getContext('2d'); const fr = V.rng(12);
      for (let y = 0; y < 256; y++) { const a = 0.25 + fr() * 0.5; fcx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; fcx.fillRect(0, y, 10 + fr() * 54, 1); }
      const fTex = new THREE.CanvasTexture(fcv); fTex.wrapT = THREE.RepeatWrapping; fTex.repeat.set(1, 140);
      foam = new THREE.Mesh(new THREE.PlaneGeometry(5, 1500), new THREE.MeshBasicMaterial({ map: fTex, transparent: true, depthWrite: false, opacity: 0.8 }));
      foam.rotation.x = -Math.PI / 2; foam.position.set(shoreX + 0.5, -0.12, 0); world.add(foam);
      updaters.push((t) => { foam.position.x = shoreX + 0.5 + Math.sin(t * 0.5) * 1.2; fTex.offset.y = t * 0.02; foam.material.opacity = 0.55 + Math.sin(t * 0.5 + 1) * 0.2; });
      /* the sun's reflection on the water: a soft stripe toward the sun, faked with one additive plane */
      const gcv = document.createElement('canvas'); gcv.width = 64; gcv.height = 256;
      const gcx = gcv.getContext('2d'), gr = gcx.createLinearGradient(0, 0, 64, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      gcx.fillStyle = gr; gcx.fillRect(0, 0, 64, 256);
      const gr2 = V.rng(4); gcx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 900; i++) { gcx.fillStyle = `rgba(0,0,0,${(0.4 + gr2() * 0.6).toFixed(2)})`; gcx.fillRect(gr2() * 64, gr2() * 256, 2 + gr2() * 8, 1); }
      const glTex = new THREE.CanvasTexture(gcv);
      glitter = new THREE.Mesh(new THREE.PlaneGeometry(60, 1800), new THREE.MeshBasicMaterial({ map: glTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      glitter.rotation.x = -Math.PI / 2; glitter.position.y = -0.07; glitter.renderOrder = 2; scene.add(glitter);

      /* Port City and Colombo to the east: a band of towers across the road, far enough to stay out of
         the camera's way. One mesh (one draw); the windows light up after dark. Nothing on the sea side. */
      skylineMesh = V.skyline(world, { cx: 0, cz: 0, rMin: 420, rMax: 980, count: tier === 0 ? 110 : 170, hMin: 18, hMax: 170, seed: 9,
        skip: (a) => Math.cos(a) < 0.25 });
      skylineMesh.userData.noCast = true;
    } else {
      /* venue only: a ring of trees softening the edge of the lawn into the fog */
      for (let i = 0; i < (tier === 0 ? 30 : 60); i++) {
        const a = rnd() * Math.PI * 2, d = 85 + rnd() * 60;
        palmSpots.push([2 + Math.cos(a) * d, 4 + Math.sin(a) * d, 0.9 + rnd() * 0.5, rnd() > 0.5 ? 'palm' : 'tree']);
      }
    }
    if (SEA) {
      /* beach umbrellas and loungers between the promenade and the water, so the sand isn't empty */
      for (let i = 0; i < (tier === 0 ? 14 : 22); i++) {
        const bx = -62 + rnd() * 13, bz = -70 + rnd() * 150;
        const tilt = (rnd() - 0.5) * 0.25, hue = [0xe8604a, 0xe8b64a, 0xf2f2ee, 0x4a9ab8][i % 4];
        CYL('metal', 0x8a8273, 0.035, 0.035, 2.3, bx, 1.15, bz, 5, 1, 0, tilt);
        push('solid', new THREE.ConeGeometry(1.35, 0.55, 8, 1), hue, 1, bx - tilt * 2.2, 2.25, bz, 0, rnd() * 3, 0);
        for (let j = 0; j < 2; j++) {
          const lx = bx + 0.9 + j * 1.4, ry2 = 0.1 + (rnd() - 0.5) * 0.3;
          BOX('solid', 0xeae0cc, 1.6, 0.14, 0.62, lx, 0.22, bz + (rnd() - 0.5) * 1.2, ry2);
          push('solid', new THREE.BoxGeometry(0.62, 0.14, 0.55), 0xeae0cc, 1, lx - 0.75, 0.42, bz + (rnd() - 0.5) * 1.2, -0.6, ry2, 0);
        }
      }
      /* a few people wandering the sand and the promenade */
      const beachFolk = V.people(world, tier === 0 ? 10 : 18, () => [-62 + rnd() * 18, -90 + rnd() * 190], [-70, 10], 1 / S);
      updaters.push((t) => beachFolk.animate(t));
    }
    while (palmSpots.length > Q.palms + (SEA ? 40 : 60)) palmSpots.splice(Math.floor(rnd() * palmSpots.length), 1);
    V.forest(world, palmSpots);

    /* ================= CROWD ================= */
    const crowd = V.people(world, Q.crowd, () => {
      const x = -14.5 + rnd() * 29, z = -15 + rnd() * 23.5;
      if (Math.hypot(x + 1.55, z - 10) < 3) return null;
      if (x > -7.6 && x < 3 && z > -2.4 && z < 5.4) return null;
      if (x > 14.6 || x < -14.4) return null;
      /* denser near the stage */
      if (rnd() > 0.35 + (1 - (z + 15) / 23.5) * 0.65) return null;
      return [x, z];
    }, [SX, SZ], 1 / S);
    const yardCrowd = V.people(world, Q.yard, () => {
      const x = -14.5 + rnd() * 24, z = 25.6 + rnd() * 7.6;
      if (Math.hypot(x + 1.65, z - 29.75) < 3.0) return null;
      if (Math.hypot(x + 13.85, z - 29.4) < 1.8) return null;
      if (Math.hypot(x - 9.75, z - 26.75) < 1.9) return null;
      return [x, z];
    }, [-1.65, 29.75], 1 / S);
    updaters.push((t) => { crowd.animate(t); yardCrowd.animate(t); });

    /* ================= TEXTURED GROUND ================= */
    GROUND.forEach(([m, w, d, x, y, z]) => V.groundPlane(world, groundMats[m], w, d, x, y, z));

    /* ================= MERGE THE BATCHES ================= */
    const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.05 });
    const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.8 });
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const atlasTex = new THREE.CanvasTexture(acv); atlasTex.anisotropy = V.maxAniso; atlasTex.encoding = THREE.sRGBEncoding;
    const signMat = new THREE.MeshBasicMaterial({ map: atlasTex, alphaTest: 0.35, side: THREE.DoubleSide, vertexColors: true });
    flushBatch('solid', solidMat); flushBatch('metal', metalMat); flushBatch('glow', glowMat);
    const signMesh = flushBatch('sign', signMat); if (signMesh) signMesh.userData.noCast = true;

    /* ---------- baked ground shading ----------
       Painted once into a canvas and laid over the ground: soft shadows under every structure and fence
       (from the collision registry, so nothing is missed), trampled earth where the crowd stands and
       along the walkways, and uneven grass tone. This is what makes the ground look real, and it costs
       one draw on any phone. */
    (function groundShading() {
      const X1 = -46, Z1 = -54, X2 = 50, Z2 = 64, PPU = tier === 0 ? 7 : 11;
      const cw = Math.round((X2 - X1) * PPU), ch = Math.round((Z2 - Z1) * PPU);
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const g2 = cv.getContext('2d');
      const px = (x) => (x - X1) * PPU, pz = (z) => (z - Z1) * PPU;
      const rr = V.rng(23);
      /* uneven ground: large soft blotches, some darker and damp, some dry and pale */
      for (let i = 0; i < 300; i++) {
        const x = rr() * cw, y = rr() * ch, rad = (2.5 + rr() * 13) * PPU;
        const dry = rr() > 0.6;
        const gr = g2.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, dry ? 'rgba(196,182,128,0.055)' : 'rgba(22,26,14,0.06)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, rad, 0, 6.3); g2.fill();
      }
      /* trampled earth: in front of the stage, under the Yard, along the corridor and the entrance walk */
      function worn(x, z, rx, rz, a) {
        const gr = g2.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), Math.max(rx, rz) * PPU);
        gr.addColorStop(0, 'rgba(58,44,28,' + a + ')'); gr.addColorStop(0.7, 'rgba(58,44,28,' + (a * 0.5) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g2.save(); g2.translate(px(x), pz(z)); g2.scale(rx / Math.max(rx, rz), rz / Math.max(rx, rz)); g2.translate(-px(x), -pz(z));
        g2.fillStyle = gr; g2.beginPath(); g2.arc(px(x), pz(z), Math.max(rx, rz) * PPU, 0, 6.3); g2.fill(); g2.restore();
      }
      worn(-2, -9, 14, 11, 0.34);        /* the crowd in front of the stage */
      worn(-2, -19, 8, 4, 0.3);          /* around the stage itself */
      worn(-1.6, 18.4, 3, 7, 0.26);      /* the corridor */
      worn(-1.65, 29.75, 11, 5.5, 0.22); /* the Yard */
      worn(22.95, 42, 2.5, 12, 0.24);    /* the entrance walkway */
      worn(17.3, 30.8, 7, 2, 0.2);
      for (let i = 0; i < 46; i++) worn(-16 + rr() * 32, -34 + rr() * 46, 0.7 + rr() * 1.6, 0.7 + rr() * 1.6, 0.1); /* footprints everywhere inside */
      /* soft shadows: every solid rect, circle and platform throws a patch away from the evening sun */
      const OX = 0.62 * PPU, OZ = -0.22 * PPU;
      const canBlur = 'filter' in g2;
      if (canBlur) g2.filter = 'blur(' + (PPU * 0.55) + 'px)';
      g2.fillStyle = 'rgba(8,8,12,0.34)';
      for (const c of colRects) {
        const w = (c.x2 - c.x1) * PPU, d = (c.z2 - c.z1) * PPU;
        if (w * d <= 0) continue;
        g2.fillRect(px(c.x1) + OX, pz(c.z1) + OZ, w, d);
      }
      for (const c of colCircles) { g2.beginPath(); g2.arc(px(c.x) + OX, pz(c.z) + OZ, c.r * PPU, 0, 6.3); g2.fill(); }
      for (const c of colSegs) {
        g2.save(); g2.translate(px((c.ax + c.bx) / 2) + OX, pz((c.az + c.bz) / 2) + OZ);
        g2.rotate(Math.atan2(c.bz - c.az, c.bx - c.ax));
        const len = Math.hypot(c.bx - c.ax, c.bz - c.az) * PPU;
        g2.fillRect(-len / 2, -c.r * PPU * 0.7, len, c.r * PPU * 1.4); g2.restore();
      }
      /* crowd shade: a soft darkening under the mass of people */
      g2.beginPath(); g2.arc(px(-2) + OX, pz(-8) + OZ, 2.2 * PPU, 0, 6.3);
      if (canBlur) g2.filter = 'blur(' + (PPU * 1.2) + 'px)';
      g2.filter = canBlur ? g2.filter : 'none';
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = V.maxAniso;
      const ov = new THREE.Mesh(new THREE.PlaneGeometry(X2 - X1, Z2 - Z1),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      ov.rotation.x = -Math.PI / 2; ov.position.set((X1 + X2) / 2, 0.045, (Z1 + Z2) / 2);
      ov.renderOrder = 1; ov.userData.noCast = true; world.add(ov);
    })();

    /* ================= SKY ================= */
    /* one dome for both times: a gradient, a sun (or the city glow) and a soft horizon band */
    const skyU = {
      top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(-0.92, 0.1, 0.38).normalize() }, sunCol: { value: new THREE.Color() }, sunSize: { value: 0.9995 }, sunGlow: { value: 1.0 },
    };
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunSize; uniform float sunGlow; varying vec3 vP;',
        'void main(){',
        '  vec3 d = normalize(vP); float h = max(d.y, 0.0);',
        '  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.12, 0.75, h));',
        '  float s = max(dot(d, sunDir), 0.0);',
        '  c += sunCol * (pow(s, 6.0) * 0.35 + pow(s, 40.0) * 0.6) * sunGlow;',
        '  c += sunCol * smoothstep(sunSize, sunSize + 0.0004, s) * 6.0 * sunGlow;',
        '  if (d.y < 0.0) c = horizon * 0.9;',
        '  gl_FragColor = vec4(c, 1.0);',
        '}',
      ].join('\n'),
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(FAR * 0.92, 32, 16), skyMat);
    sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
    /* stars */
    const starN = tier === 0 ? 500 : 1100, sp = new Float32Array(starN * 3), sc = new Float32Array(starN * 3), sr = V.rng(7);
    for (let i = 0; i < starN; i++) {
      const a = sr() * Math.PI * 2, y = 0.1 + sr() * 0.9, s = Math.sqrt(1 - y * y), d = FAR * 0.88;
      sp.set([Math.cos(a) * s * d, y * d, Math.sin(a) * s * d], i * 3);
      const b = 0.4 + Math.pow(sr(), 3) * 1.4; sc.set([b * 0.86, b * 0.92, b], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: phone ? 1.6 : 1.9, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
    stars.frustumCulled = false; stars.renderOrder = -9; scene.add(stars);
    /* a few soft clouds low over the horizon (sprites: nearly free) */
    const clouds = [];
    {
      const ccv = document.createElement('canvas'); ccv.width = 256; ccv.height = 96;
      const c2 = ccv.getContext('2d'), cr = V.rng(13);
      for (let i = 0; i < 26; i++) {
        const x = 24 + cr() * 208, y = 34 + cr() * 34, rad = 12 + cr() * 26;
        const gr = c2.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(255,255,255,' + (0.1 + cr() * 0.16).toFixed(2) + ')');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        c2.fillStyle = gr; c2.beginPath(); c2.arc(x, y, rad, 0, 6.3); c2.fill();
      }
      const ctex = new THREE.CanvasTexture(ccv);
      const crr = V.rng(27);
      for (let i = 0; i < 8; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctex, transparent: true, depthWrite: false, fog: false }));
        const a = crr() * Math.PI * 2, d = FAR * (0.55 + crr() * 0.25);
        sp.position.set(Math.cos(a) * d, FAR * (0.035 + crr() * 0.06), Math.sin(a) * d);
        sp.scale.set(FAR * (0.16 + crr() * 0.14), FAR * 0.05, 1);
        sp.renderOrder = -8; scene.add(sp); clouds.push(sp);
      }
    }

    /* ================= LIGHTS ================= */
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.target.position.set(0, 0, -6 * S); scene.add(sun); scene.add(sun.target);
    if (Q.shadows) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      const sc2 = sun.shadow.camera; sc2.left = -52 * S; sc2.right = 52 * S; sc2.top = 60 * S; sc2.bottom = -60 * S; sc2.near = 10; sc2.far = 260 * S;
      sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    }
    const stageA = new THREE.PointLight(0xffb070, 1, 46 * S, 2); stageA.position.set((SX - 4) * S, 8 * S, (SZ + 5) * S); scene.add(stageA);
    const stageB = new THREE.PointLight(0x9fc8ff, 1, 46 * S, 2); stageB.position.set((SX + 4) * S, 8 * S, (SZ + 5) * S);
    const yardL = new THREE.PointLight(0xffc98a, 1, 26 * S, 2); yardL.position.set(-3 * S, 5 * S, 29.5 * S);
    const fireL = new THREE.PointLight(0xff8a3a, 1, 9 * S, 2); fireL.position.set(-13.85 * S, 1.6 * S, 29.4 * S);
    const entL = new THREE.PointLight(0xffd59a, 1, 26 * S, 2); entL.position.set(22.95 * S, 3.6 * S, 44 * S); scene.add(entL);
    if (Q.points >= 2) scene.add(yardL);
    if (Q.points >= 3) scene.add(stageB);
    if (Q.points >= 4) scene.add(fireL);

    /* everything so far is in screen colours: switch it all to linear light once */
    V.linearize(scene);
    if (Q.shadows) V.shadows(world);
    if (water) water.receiveShadow = false;

    /* reflections: one environment for the evening (the sky itself), one for the night (stage colours) */
    const pm = new THREE.PMREMGenerator(renderer);
    function envFromSky() {
      /* the sky, painted onto a sphere's vertices (dimmed, no sun disc): soft reflections and fill, not a second sun */
      const geo = new THREE.SphereGeometry(10, 48, 24), p = geo.attributes.position, cols = new Float32Array(p.count * 3);
      const top = skyU.top.value, midC = skyU.mid.value, hor = skyU.horizon.value, sunC = skyU.sunCol.value, sd = skyU.sunDir.value;
      const c = new THREE.Color(), d = new THREE.Vector3();
      const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      for (let i = 0; i < p.count; i++) {
        d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
        const h = Math.max(d.y, 0);
        c.copy(hor).lerp(midC, ss(0, 0.18, h)).lerp(top, ss(0.12, 0.75, h));
        const sDot = Math.max(d.dot(sd), 0);
        c.r += sunC.r * Math.pow(sDot, 6) * 0.5; c.g += sunC.g * Math.pow(sDot, 6) * 0.5; c.b += sunC.b * Math.pow(sDot, 6) * 0.5;
        if (d.y < 0) c.copy(hor).multiplyScalar(0.55);
        cols[i * 3] = c.r * 0.4; cols[i * 3 + 1] = c.g * 0.4; cols[i * 3 + 2] = c.b * 0.4;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
      const room = new THREE.Scene(); room.add(new THREE.Mesh(geo, m));
      const t = pm.fromScene(room, 0.02).texture; geo.dispose(); m.dispose(); return t;
    }
    function envNight() {
      const room = new THREE.Scene();
      room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: L(0x02050a), side: THREE.BackSide })));
      const panel = (c, k, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: L(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m); };
      panel(0xffb066, 0.9, 0, 3, -8, 7, 2); panel(0x7fd0ff, 0.5, -7, 2, 3, 2.5, 4); panel(0xff6a3d, 0.5, 7, 2, 3, 2.5, 4); panel(0xdfefff, 0.25, 0, 9, 0, 6, 2);
      return pm.fromScene(room, 0.04).texture;
    }

    /* ================= TIME OF DAY ================= */
    const SUN_DIR = new THREE.Vector3(-0.92, 0.13, 0.38).normalize();       /* sunset: west-south-west, over the sea */
    const CITY_DIR = new THREE.Vector3(0.95, 0.04, -0.3).normalize();      /* at night the horizon glow is the city lights, to the east */
    const MOON_DIR = new THREE.Vector3(-0.6, 0, 0.8).normalize();          /* where the moonlight streak lies on the sea */
    const TIMES = {
      evening: {
        top: 0x22355f, mid: 0x6d6f96, horizon: 0xf3a16b, sunCol: 0xffb36b, sunDir: SUN_DIR, sunSize: 0.9993, sunGlow: 1,
        fog: 0xb88a86, fogNear: SEA ? 160 : 70, fogFar: SEA ? 5200 : 300,
        hemiSky: 0xc9c2e0, hemiGround: 0x7a6248, hemi: 0.75, sun: 0xffb27a, sunI: 3.4, sunPos: SUN_DIR, shadows: true,
        stageA: 1.4, stageB: 1.0, yard: 0.9, fire: 1.0, ent: 0.5, beams: 0.22, glow: 1.0, signs: 1.0, bulbs: 3, windows: 0.35, exposure: 1.18, bloom: 0.5, waterEnv: 2.6, haze: false, stars: 0, glitter: 0.9, cloud: [0xffc2a0, 0.5],
      },
      night: {
        top: 0x02050c, mid: 0x071426, horizon: 0x15304a, sunCol: 0x3a6f9a, sunDir: CITY_DIR, sunSize: 2.0, sunGlow: 0.8,
        fog: 0x0b1828, fogNear: SEA ? 150 : 60, fogFar: SEA ? 3000 : 260,
        hemiSky: 0x5a7aa8, hemiGround: 0x0b0c10, hemi: 0.22, sun: 0xa8bfff, sunI: 0.32, sunPos: new THREE.Vector3(0.4, 0.8, 0.45).normalize(), shadows: false,
        stageA: 3.2, stageB: 2.6, yard: 2.2, fire: 2.0, ent: 1.9, beams: 0.62, glow: 1.6, signs: 1.15, bulbs: 4.5, windows: 1.15, exposure: 1.06, bloom: 0.95, waterEnv: 0.6, haze: true, stars: 1, glitter: 0, cloud: [0x32455e, 0.3],
      },
    };
    const envs = {};
    let time = opts.time === 'night' ? 'night' : 'evening';
    function applyTime() {
      const T = TIMES[time];
      skyU.top.value.copy(L(T.top)); skyU.mid.value.copy(L(T.mid)); skyU.horizon.value.copy(L(T.horizon));
      skyU.sunCol.value.copy(L(T.sunCol)); skyU.sunDir.value.copy(T.sunDir); skyU.sunSize.value = T.sunSize; skyU.sunGlow.value = T.sunGlow;
      if (!envs[time]) envs[time] = time === 'evening' ? envFromSky() : envNight();
      scene.environment = envs[time];
      scene.fog = new THREE.Fog(L(T.fog), T.fogNear, T.fogFar);
      hemi.color.copy(L(T.hemiSky)); hemi.groundColor.copy(L(T.hemiGround)); hemi.intensity = T.hemi;
      sun.color.copy(L(T.sun)); sun.intensity = T.sunI; sun.position.copy(T.sunPos).multiplyScalar(140).add(sun.target.position);
      if (Q.shadows && sun.castShadow !== T.shadows) { sun.castShadow = T.shadows; renderer.shadowMap.needsUpdate = true; }
      stageA.intensity = T.stageA; stageB.intensity = T.stageB; yardL.intensity = T.yard; fireL.intensity = T.fire; entL.intensity = T.ent;
      world.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.strength) o.material.uniforms.strength.value = T.beams; });
      glowMat.color.setScalar(T.glow); signMat.color.setScalar(T.signs);
      bulbMat.color.copy(L(0xffd59a)).multiplyScalar(T.bulbs);
      if (water) water.material.envMapIntensity = T.waterEnv;
      /* the stage screens switch to this time's artwork */
      const art = stage.SCR[time];
      stage.screens.main.map = art.main; stage.screens.header.map = art.header;
      stage.screens.sides[0].map = art.sideL; stage.screens.sides[1].map = art.sideR;
      [stage.screens.main, stage.screens.header, stage.screens.sides[0], stage.screens.sides[1]].forEach((m) => {
        m.color.setScalar(time === 'night' ? 1.35 : 1.15); m.needsUpdate = true;
      });
      stars.visible = !!T.stars;
      clouds.forEach((sp, i) => { sp.material.color.copy(L(T.cloud[0])); sp.material.opacity = T.cloud[1] * (0.7 + (i % 3) * 0.15); });
      if (skylineMesh) skylineMesh.material.emissiveIntensity = T.windows;
      world.traverse((o) => { if (o.isPoints && o.userData.night) o.visible = time === 'night'; });   /* red aircraft lights */
      world.traverse((o) => { if (o.isSprite && o.material.blending === THREE.AdditiveBlending) o.visible = T.haze; });
      if (glitter) {
        glitter.visible = T.glitter > 0;
        glitter.material.color.copy(L(T.sunCol)).multiplyScalar(T.glitter);
        const d = time === 'evening' ? SUN_DIR : MOON_DIR;
        glitter.rotation.z = Math.atan2(d.x, d.z) + Math.PI;
      }
      if (fx) { fx.finish.uniforms.exposure.value = T.exposure; if (fx.bloom) fx.bloom.strength = T.bloom; }
    }

    /* ================= GLOW + FILM FINISH ================= */
    const FINISH = {
      uniforms: { tDiffuse: { value: null }, exposure: { value: 1.0 }, vignette: { value: 0.35 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float exposure; uniform float vignette; varying vec2 vUv;',
        'vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
        'void main(){ vec3 lin = max(texture2D(tDiffuse, vUv).rgb, 0.0) * exposure; vec3 c = pow(aces(lin), vec3(1.0 / 2.2));',
        '  c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.12);',                       /* a touch more colour, like film */
        '  c += (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.035;',   /* fine grain breaks the clean plastic look */
        '  c *= 1.0 - vignette * smoothstep(0.35, 0.9, distance(vUv, vec2(0.5))); gl_FragColor = vec4(c, 1.0); }',
      ].join('\n'),
    };
    const fx = (function () {
      if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.ShaderPass) return null;
      const gl2 = renderer.capabilities.isWebGL2;
      const half = gl2 ? renderer.extensions.has('EXT_color_buffer_float') : renderer.extensions.has('OES_texture_half_float');
      const rt = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: half ? THREE.HalfFloatType : THREE.UnsignedByteType };
      const composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, rt));
      if (gl2 && tier === 2 && THREE.WebGLMultisampleRenderTarget) {
        const ms = new THREE.WebGLMultisampleRenderTarget(1, 1, rt); ms.samples = 4;
        composer.renderTarget2.dispose(); composer.renderTarget2 = composer.readBuffer = ms;
      }
      composer.addPass(new THREE.RenderPass(scene, camera));
      let bloom = null;
      if (Q.bloom && THREE.UnrealBloomPass) {
        bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.9);
        const scale = Q.bloom, base = bloom.setSize.bind(bloom);
        bloom.setSize = (w, h) => base(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
        composer.addPass(bloom);
      }
      const finish = new THREE.ShaderPass(FINISH); composer.addPass(finish);
      return { composer, bloom, finish };
    })();
    if (!fx) { renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; }
    applyTime();

    /* ================= AREAS (from the original plan) ================= */
    const pois = [
      { id: 'washN', name: 'Washrooms · North', dims: 'M × 4 · W × 4', x: -9.4, z: -33.6, r: 4.5, desc: 'Washroom block in the backstage zone, behind the stage.' },
      { id: 'medicN', name: 'Medic · Backstage', dims: 'First aid', x: 12, z: -30.6, r: 1.8, desc: 'First-aid point in the backstage zone.' },
      { id: 'prod', name: 'Production Storage', dims: 'Load-in', x: -21.5, z: -22.6, r: 4, desc: 'Production storage and truck load-in outside the west fence.' },
      { id: 'stage', name: 'Main Stage', dims: 'Facing south', x: -2, z: -17.5, r: 6, h: 11.6, desc: 'The main stage: box-truss roof, a 12-metre LED wall, line arrays and a moving-light rig.' },
      { id: 'gold', name: 'Gold Platform', dims: 'Raised deck', x: -11, z: -20, r: 4, desc: 'Gold viewing platform angled toward the stage, stage left.' },
      { id: 'platinum', name: 'Platinum Platform', dims: 'Raised deck', x: 6.75, z: -20, r: 4, desc: 'Platinum viewing platform angled toward the stage, stage right.' },
      { id: 'secBack', name: 'Security Check · Backstage', dims: 'East gate', x: 17.2, z: -21, r: 2.6, desc: 'Backstage security check where the backstage entrance path joins the festival.' },
      { id: 'foh', name: 'FOH', dims: 'Front of house', x: -2.5, z: -0.25, r: 3, desc: 'Sound and lighting control, barricaded on three sides.' },
      { id: 'viparea', name: 'VIP Area', dims: 'Lounge seating', x: -2.3, z: 2.8, r: 3.6, desc: 'Raised timber VIP lounge directly behind FOH, under festoon lights.' },
      { id: 'washE', name: 'Washrooms · East', dims: 'W × 4 · M × 4', x: 16.3, z: 6.9, r: 3, desc: 'Washroom units along the east fence of the festival floor.' },
      { id: 'medicS', name: 'Medic', dims: 'First aid', x: 7, z: 11.3, r: 2.4, desc: 'Main first-aid tent beside the festival gate.' },
      { id: 'secMain', name: 'Security Check · Festival', dims: 'Main gate', x: -1.55, z: 12.6, r: 2.2, desc: 'Security check at the gate between the flooring corridor and the festival floor.' },
      { id: 'flooring', name: 'Flooring Corridor', dims: 'Festival ↔ Yard', x: -1.55, z: 17.5, r: 3, desc: 'Boardwalk corridor linking the Yard to the festival grounds.' },
      { id: 'secCorr', name: 'Security Check · Backstage Path', dims: 'Corridor', x: 1.4, z: 20.1, r: 1.5, desc: 'Check point where the backstage entrance path leaves the corridor.' },
      { id: 'backPath', name: 'Backstage Entrance', dims: 'Crew & artists', x: 21.6, z: 3, r: 4, desc: 'Path from the corridor to the backstage security check on the east side.' },
      { id: 'pub', name: 'Pub', dims: 'Centre of the Yard', x: -1.65, z: 29.75, r: 3.6, desc: 'Round timber bar under a canvas roof, in the middle of the Yard.' },
      { id: 'setTimes', name: 'Set Times Banner', dims: 'The Yard', x: -9.65, z: 24.6, r: 2.2, desc: 'Set times for the night on a banner by the corridor.' },
      { id: 'mirror', name: 'Mirror', dims: 'The Yard', x: 2.15, z: 24.6, r: 1.4, desc: 'Mirror wall by the corridor exit.' },
      { id: 'photobox', name: 'Photobox', dims: 'The Yard', x: 6.4, z: 24.9, r: 1.6, desc: 'Photo booth in the north-east corner of the Yard.' },
      { id: 'booth360', name: '360 Video Booth', dims: 'The Yard', x: 9.75, z: 26.75, r: 1.8, desc: 'Step on the platform for a 360° video clip.' },
      { id: 'waterY', name: 'Water', dims: 'The Yard', x: -15.6, z: 27.35, r: 1.6, desc: 'Water point on the west side of the Yard.' },
      { id: 'firepit', name: 'Fire Pit', dims: 'The Yard', x: -13.85, z: 29.4, r: 1.8, desc: 'Open fire pit on the west side of the Yard.' },
      { id: 'merch', name: 'Merch', dims: 'The Yard', x: -15.6, z: 31.9, r: 1.6, desc: 'Official merch stand on the west side of the Yard.' },
      { id: 'tattoo', name: 'Tattoo', dims: 'The Yard', x: -14.15, z: 34.4, r: 1.8, desc: 'Tattoo tent along the south edge of the Yard.' },
      { id: 'facepaint', name: 'Face Painting', dims: 'The Yard', x: -8.75, z: 34.4, r: 1.8, desc: 'Face painting tent along the south edge of the Yard.' },
      { id: 'signs', name: 'Signs Backdrop', dims: 'The Yard', x: -0.4, z: 34.9, r: 2.2, desc: 'The We Are Lost photo backdrop along the south edge of the Yard.' },
      { id: 'album', name: 'Album Wall', dims: 'The Yard', x: 6.25, z: 34.9, r: 2.2, desc: 'Album artwork wall along the south edge of the Yard.' },
      { id: 'secYard', name: 'Security Check · Yard', dims: 'East gate', x: 11.75, z: 30.75, r: 1.8, desc: 'Security check where the entrance walkway enters the Yard.' },
      { id: 'confetti', name: 'Confetti', dims: 'Corridor exit', x: -5, z: 22.9, r: 1.2, desc: 'Confetti cannon at the Yard end of the corridor.' },
      { id: 'smoke', name: 'Smoke', dims: 'Corridor exit', x: 2.4, z: 22.9, r: 1.2, desc: 'Smoke machine at the Yard end of the corridor.' },
      { id: 'entrance', name: 'Entrance', dims: '40 ft walkway', x: 22.95, z: 42, r: 4, desc: 'Main entrance walkway: north from the street, then west into the Yard.' },
      { id: 'tickets', name: 'Ticket Lanes', dims: 'VIP · Online · At gate · Invitation · Producers', x: -26, z: 46.6, r: 6, desc: 'Five ticket lanes south-west of the Yard. Tap a counter to see its lane.' },
      { id: 'emergency', name: 'Fire Truck & Ambulances', dims: '1 fire truck · 3 ambulances', x: 33.2, z: -24, r: 5, desc: 'Covered emergency bay beside the road, east of the backstage entrance.' },
    ];
    topRow.forEach((s, i) => pois.push({ id: 'top' + i, name: s, dims: 'Backstage stall row', x: 3.9 + i * 2.2, z: -27.4, r: 1.2, small: true, desc: s.charAt(0) + s.slice(1).toLowerCase() + ' stall behind the stage.' }));
    pois.push({ id: 'kingsN', name: 'KINGSBURY', dims: 'Backstage', x: -5.75, z: -27.4, r: 1.6, small: true, desc: 'Kingsbury stand behind the stage.' });
    sideStalls.forEach((s, i) => ['W', 'E'].forEach((side) => pois.push({ id: 'side' + side + i, name: s, dims: (side === 'W' ? 'West' : 'East') + ' stall column', x: side === 'W' ? -15.9 : 15.9, z: -12.2 + i * 1.45, r: 0.75, small: true, desc: s.charAt(0) + s.slice(1).toLowerCase() + ' stall on the festival floor.' })));
    lanes.forEach((nm, i) => pois.push({ id: 'lane' + i, name: nm, dims: 'Ticket lane', x: -32.6, z: laneZ[i], r: 1.4, small: true, desc: 'The ' + nm.toLowerCase() + ' ticket lane.' }));

    /* one floating label, reused for whichever area is selected */
    const lcv = document.createElement('canvas'); lcv.width = 512; lcv.height = 128;
    const lctx = lcv.getContext('2d'), lTex = new THREE.CanvasTexture(lcv); lTex.encoding = THREE.sRGBEncoding;
    const labelSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lTex, transparent: true, depthWrite: false, depthTest: false, fog: false }));
    labelSp.scale.set(9 / S * 1.15, 2.25 / S * 1.15, 1); labelSp.visible = false; labelSp.renderOrder = 20; world.add(labelSp);
    function showLabel(p) {
      if (!p) { labelSp.visible = false; return; }
      lctx.clearRect(0, 0, 512, 128);
      lctx.font = `700 44px ${FONT}`;
      const text = p.name.toUpperCase(), tw = Math.min(440, lctx.measureText(text).width), bx = (512 - tw) / 2 - 28;
      lctx.fillStyle = 'rgba(2,7,10,.86)'; lctx.beginPath();
      if (lctx.roundRect) lctx.roundRect(bx, 24, tw + 56, 80, 40); else lctx.rect(bx, 24, tw + 56, 80);
      lctx.fill(); lctx.strokeStyle = 'rgba(62,224,255,.85)'; lctx.lineWidth = 3; lctx.stroke();
      lctx.fillStyle = '#f4f8fa'; lctx.textAlign = 'center'; lctx.textBaseline = 'middle'; lctx.fillText(text, 256, 66, 440);
      lTex.needsUpdate = true;
      labelSp.position.set(p.x, p.h || (p.small ? 3.4 : 4.6), p.z); labelSp.visible = mode === 'orbit';
    }

    /* ================= CAMERA ================= */
    let mode = 'orbit';
    const SEGS = {
      all: { t: [2, 2, 2], dist: SEA ? 72 : 88, rx: 0.58, walk: { x: 22.95, z: 50, yaw: Math.PI } },
      festival: { t: [0, 2, -12], dist: 54, rx: 0.55, walk: { x: -1.55, z: 11.8, yaw: Math.PI } },
      yard: { t: [-2.5, 1, 29.5], dist: 34, rx: 0.6, walk: { x: -1.55, z: 25.2, yaw: 0 } },
    };
    const MAXD = SEA ? 150 : 140;
    const tgt = { x: 2, y: 2, z: 2 }, goal = { x: 2, y: 2, z: 2 };
    const calm = mq('(prefers-reduced-motion: reduce)');             /* no automatic turning for people who asked for less motion */
    const portrait = (container.clientHeight || 1) > (container.clientWidth || 1);
    /* on a tall screen, start from the south looking up the field, so the stage sits at the top */
    let goalDist = SEGS.all.dist, dist = goalDist + (calm ? 0 : 30), rotY = portrait ? 0.22 : SEA ? 1.2 : 0.55, rotX = portrait ? 0.5 : SEA ? 0.34 : 0.62, vel = 0, auto = !calm;
    const walk = { x: 22.95, z: 50, yaw: Math.PI, pitch: 0 };
    let keys = {}; const joy = { x: 0, y: 0 }; let activePOI = null;

    function collide() {
      const pad = 0.4;
      for (const c of colCircles) {
        const dx = walk.x - c.x, dz = walk.z - c.z, d = Math.hypot(dx, dz), min = c.r + pad;
        if (d < min && d > 0.001) { walk.x = c.x + dx / d * min; walk.z = c.z + dz / d * min; }
      }
      for (const c of colRects) {
        if (walk.x > c.x1 - pad && walk.x < c.x2 + pad && walk.z > c.z1 - pad && walk.z < c.z2 + pad) {
          const o = [{ v: (c.x1 - pad) - walk.x, a: 'x' }, { v: (c.x2 + pad) - walk.x, a: 'x' }, { v: (c.z1 - pad) - walk.z, a: 'z' }, { v: (c.z2 + pad) - walk.z, a: 'z' }]
            .sort((a, b) => Math.abs(a.v) - Math.abs(b.v))[0];
          walk[o.a] += o.v;
        }
      }
      for (const c of colSegs) {
        const abx = c.bx - c.ax, abz = c.bz - c.az, len2 = abx * abx + abz * abz;
        const t = Math.max(0, Math.min(1, ((walk.x - c.ax) * abx + (walk.z - c.az) * abz) / len2));
        const qx = c.ax + abx * t, qz = c.az + abz * t, ex = walk.x - qx, ez = walk.z - qz, d2 = Math.hypot(ex, ez), m2 = c.r + pad;
        if (d2 < m2 && d2 > 0.001) { walk.x = qx + ex / d2 * m2; walk.z = qz + ez / d2 * m2; }
      }
    }
    function applyOrbit() {
      camera.position.set(tgt.x * S + Math.sin(rotY) * Math.cos(rotX) * dist, tgt.y * S + Math.sin(rotX) * dist, tgt.z * S + Math.cos(rotY) * Math.cos(rotX) * dist);
      camera.lookAt(tgt.x * S, tgt.y * S, tgt.z * S);
    }
    function applyWalk() {
      camera.position.set(walk.x * S, 1.65, walk.z * S);
      camera.lookAt(walk.x * S + Math.sin(walk.yaw) * Math.cos(walk.pitch), 1.65 + Math.sin(walk.pitch), walk.z * S + Math.cos(walk.yaw) * Math.cos(walk.pitch));
    }
    function setActive(p) { if (activePOI === p) return; activePOI = p; showLabel(p); if (typeof opts.onPOI === 'function') opts.onPOI(p); }

    /* ---------- input: mouse, pen and touch (drag, pinch, tap) ---------- */
    const el = renderer.domElement, ptrs = new Map();
    let moved = 0, downT = 0, pinch = 0, idleT;
    const ray = new THREE.Raycaster(), mouseV = new THREE.Vector2(), gPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      auto = false; clearTimeout(idleT); if (ptrs.size === 1) { moved = 0; downT = performance.now(); }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      container.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()], g = Math.hypot(a.x - b.x, a.y - b.y);
        if (mode === 'orbit' && pinch) { goalDist = dist = Math.max(14, Math.min(MAXD, dist * pinch / g)); }
        pinch = g; return;
      }
      if (mode === 'orbit') { rotY -= dx * 0.006; rotX = Math.max(0.06, Math.min(1.35, rotX + dy * 0.004)); vel = -dx * 0.006; }
      else { walk.yaw -= dx * 0.005; walk.pitch = Math.max(-0.9, Math.min(0.9, walk.pitch - dy * 0.004)); }
    });
    const end = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId); if (ptrs.size) return;
      container.style.cursor = 'grab'; pinch = 0;
      if (e.type === 'pointerup' && moved < 8 && performance.now() - downT < 500) {
        const rect = el.getBoundingClientRect();
        mouseV.set((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(mouseV, camera);
        const hit = new THREE.Vector3();
        if (ray.ray.intersectPlane(gPlane, hit)) {
          hit.multiplyScalar(1 / S);
          let best = null, bs = 1e9;
          pois.forEach((p) => { const d = Math.hypot(hit.x - p.x, hit.z - p.z), lim = Math.max(p.r, p.small ? 0.9 : 3); if (d < lim && d / lim < bs) { bs = d / lim; best = p; } });
          setActive(best);
        }
      }
      clearTimeout(idleT); idleT = setTimeout(() => { if (mode === 'orbit' && !calm) auto = true; }, 7000);
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => { if (mode !== 'orbit') return; e.preventDefault(); auto = false; goalDist = dist = Math.max(14, Math.min(MAXD, dist * (1 + e.deltaY * 0.0011))); }, { passive: false });
    const onKeyDown = (e) => { const k = e.key.toLowerCase(); keys[k] = true; if (mode === 'walk' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault(); };
    const onKeyUp = (e) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { keys = {}; });

    /* ---------- size ---------- */
    function resize() {
      const w = W(), h = H();
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
      if (fx) { fx.composer.setPixelRatio(pr); fx.composer.setSize(w, h); }
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container); else window.addEventListener('resize', resize);
    resize();

    /* ---------- the resolution follows the frame rate ---------- */
    const maxPr = Math.min(dpr, Q.pr);
    let fAcc = 0, fN = 0, slowRuns = 0, fastRuns = 0, degraded = 0;
    let warm = 0;
    function adapt(ms) {
      if (warm < 2.5) { warm += ms / 1000; return; }     /* ignore the first seconds: shaders compile, textures upload */
      fAcc += ms; fN++;
      if (fAcc < 1200) return;
      const avg = fAcc / fN; fAcc = 0; fN = 0;
      if (avg > 23) {                       /* under ~43 fps: step the resolution down */
        fastRuns = 0;
        if (pr > Q.minPr + 0.01) { pr = Math.max(Q.minPr, pr * 0.85); resize(); }
        else if (++slowRuns >= 2 && degraded < 2) {           /* already at the floor: drop the costly extras */
          slowRuns = 0; degraded++;
          if (degraded === 1 && fx && fx.bloom) fx.bloom.enabled = false;
          if (degraded === 2) { if (Q.shadows) { sun.castShadow = false; } crowdThin(); }
        }
      } else if (avg < 14.5 && pr < maxPr - 0.01) {            /* over ~69 fps: bring sharpness back */
        if (++fastRuns >= 3) { fastRuns = 0; pr = Math.min(maxPr, pr * 1.1); resize(); }
      } else { slowRuns = 0; fastRuns = 0; }
    }
    function crowdThin() { world.traverse((o) => { if (o.isInstancedMesh && o.count > 40 && o.geometry.attributes.color) o.count = Math.floor(o.count * 0.6); }); }

    /* ---------- loop ---------- */
    let last = performance.now(), running = false, onScreen = true, firstFrame = true, stopped = false;
    const ledEvery = 1 / Q.ledFps;
    let ledLast = -1;
    function loop(now) {
      if (!running) return;
      const ms = now - last, dt = Math.min(0.05, ms / 1000); last = now;
      const t = now * 0.001;
      if (mode === 'orbit') {
        /* easing by time, not by frame, so it feels the same at 30, 60 and 120 frames a second */
        const k = 1 - Math.exp(-3.7 * dt), f60 = dt * 60;
        tgt.x += (goal.x - tgt.x) * k; tgt.y += (goal.y - tgt.y) * k; tgt.z += (goal.z - tgt.z) * k;
        dist += (goalDist * (camera.aspect < 1 ? 1.8 : 1) - dist) * (1 - Math.exp(-3.1 * dt));   /* tall phone screens stand further back */
        if (auto) rotY += dt * 0.045;
        else if (!ptrs.size) { rotY += vel * f60; vel *= Math.pow(0.92, f60); if (Math.abs(vel) < 0.0002) vel = 0; }
        applyOrbit();
      } else {
        let f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) + joy.y;
        let s = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x;
        if (keys.q) walk.yaw += dt * 1.8;
        if (keys.e) walk.yaw -= dt * 1.8;
        f = Math.max(-1, Math.min(1, f)); s = Math.max(-1, Math.min(1, s));
        const spd = (keys.shift ? 14 : 8) * dt / S;
        walk.x += (Math.sin(walk.yaw) * f - Math.cos(walk.yaw) * s) * spd;
        walk.z += (Math.cos(walk.yaw) * f + Math.sin(walk.yaw) * s) * spd;
        walk.x = Math.max(SEA ? -64 : -34, Math.min(38.2, walk.x));
        walk.z = Math.max(-47, Math.min(57.5, walk.z));
        collide();
        let best = null, bd = 1e9;
        pois.forEach((p) => { const d = Math.hypot(walk.x - p.x, walk.z - p.z); if (d < p.r + (p.small ? 0.6 : 0) && d < bd) { bd = d; best = p; } });
        setActive(best);
        applyWalk();
      }
      if (glitter) { const d = time === 'evening' ? SUN_DIR : MOON_DIR; glitter.position.x = camera.position.x + d.x * 900; glitter.position.z = camera.position.z + d.z * 900; }
      sky.position.copy(camera.position); stars.position.copy(camera.position);   /* the sky always surrounds the camera */
      if (t - ledLast > ledEvery) { ledLast = t; for (const l of leds) l.draw(t); }
      stage.rig.animate(t); if (stage.hz && time === 'night') stage.hz.animate(t);
      const fl = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 7.3) * 0.07;
      flame.scale.set(1, fl, 1); flame2.scale.set(1, 1.6 - fl * 0.6, 1); fireL.intensity = TIMES[time].fire * (0.8 + fl * 0.3);
      for (const u of updaters) u(t, dt);
      if (fx) fx.composer.render(dt); else renderer.render(scene, camera);
      if (firstFrame) { firstFrame = false; if (typeof opts.onReady === 'function') opts.onReady(); }
      else adapt(ms);
      requestAnimationFrame(loop);
    }
    /* if the phone takes the graphics memory away (another app, a low-memory moment), pause, then reload when it's back */
    el.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stopped = true; pump(); });
    el.addEventListener('webglcontextrestored', () => location.reload());
    function pump() {
      const want = !stopped && onScreen && !document.hidden;
      if (want === running) return;
      running = want;
      if (running) { last = performance.now(); fAcc = 0; fN = 0; warm = 1.5; requestAnimationFrame(loop); }
    }
    if ('IntersectionObserver' in window) new IntersectionObserver((en) => { onScreen = en[0].isIntersecting; pump(); }, { rootMargin: '200px' }).observe(container);
    document.addEventListener('visibilitychange', pump);
    pump();

    if (/[?&]debug/.test(location.search)) window.__wal = { scene, renderer, fx, camera, TIMES, applyTime, envs, counts: { field: crowd.count, yard: yardCrowd.count },
      pose: (x, z, ry, rx, d) => { goal.x = x; goal.y = 3; goal.z = z; rotY = ry; rotX = rx; goalDist = d; auto = false; vel = 0; } };
    return {
      quality: ['low', 'medium', 'high'][tier],
      setMode(m) { mode = m === 'walk' ? 'walk' : 'orbit'; auto = mode === 'orbit' && !calm; vel = 0; setActive(null); labelSp.visible = false; },
      getMode() { return mode; },
      setTime(t) { time = t === 'night' ? 'night' : 'evening'; applyTime(); },
      getTime() { return time; },
      setJoy(x, y) { joy.x = x; joy.y = y; },
      setSegment(name) {
        const s = SEGS[name] || SEGS.all;
        if (mode === 'orbit') { goal.x = s.t[0]; goal.y = s.t[1]; goal.z = s.t[2]; goalDist = s.dist; rotX = s.rx; vel = 0; }
        else { walk.x = s.walk.x; walk.z = s.walk.z; walk.yaw = s.walk.yaw; walk.pitch = 0; }
        setActive(null);
      },
      getState() { return { mode, x: mode === 'walk' ? walk.x : tgt.x, z: mode === 'walk' ? walk.z : tgt.z, yaw: mode === 'walk' ? walk.yaw : rotY + Math.PI }; },
      mapData: { rects: colRects, paths: pathRects, festival: [-17.1, -36, 17.2, 13], yard: [-17.25, 23.75, 11.75, 35.75], corridor: [-3.8, 13, 0.7, 23.75], sea: SEA ? -66 : null },
      focus(x, z) {
        if (mode === 'walk') { walk.x = x; walk.z = z; collide(); }
        else { goal.x = x; goal.y = 1.5; goal.z = z; goalDist = Math.min(goalDist, 40); auto = false; }
      },
      goTo(id) {
        const p = pois.find((q) => q.id === id); if (!p) return;
        if (mode === 'walk') {
          const a = Math.atan2(walk.x - p.x, walk.z - p.z), rr = p.r + (p.small ? 1.4 : 1.2);
          walk.x = p.x + Math.sin(a) * rr; walk.z = p.z + Math.cos(a) * rr; collide();
          walk.yaw = Math.atan2(p.x - walk.x, p.z - walk.z); walk.pitch = 0;
        } else {
          /* frame the area from the site's centre side, far enough back for the larger venue */
          goal.x = p.x; goal.y = p.h ? 4 : 1.5; goal.z = p.z;
          goalDist = p.small ? 15 : p.h ? 36 : 26;
          rotY = Math.atan2(2 - p.x, 2 - p.z); rotX = Math.min(Math.max(rotX, 0.3), 0.55);
          auto = false; vel = 0;
        }
        activePOI = null; setActive(p);
      },
      stop() { stopped = true; pump(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); },
      pois,
    };
  }

  window.buildVenueWalkthrough = buildVenueWalkthrough;
})();
