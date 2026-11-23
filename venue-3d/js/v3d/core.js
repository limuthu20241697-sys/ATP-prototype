/* venue3d/core.js — the shared basics every 3D scene uses. Load this file first.

   HOW THE venue3d/ FILES FIT TOGETHER
   The 3D code is split into small files. Each file is wrapped in (function (V) { ... })(window.V3D),
   so its variables stay private. V is one shared object (window.V3D):
     - the first line of a file takes what it needs from V:   const { std, sign } = V;
     - the last line adds what it made to V:                     Object.assign(V, { siteKit });
   So the files must load in order (see ORDER.json). vip-tables.js loads last and publishes the
   public API, window.Venue3D, which the pages call:
     Venue3D.supported()                 → true when WebGL and three.js are available
     Venue3D.venue(el, { venue, mode, items, library, onPOI }) → the 3D venue view ("fly" or "walk");
                                          with items, the fixed grounds plus an organizer's published layout
     Venue3D.has(name) / Venue3D.meta(name, items) → whether a venue has a 3D model, and its area buttons and copy
     Venue3D.editor(el, { venue, items, library, onSelect, onChange }) → the organizer's 3D venue builder
     Venue3D.types() / Venue3D.defaultItems(name) → the builder's toolbar, and a venue's starting layout
     Venue3D.tables(el, { tables, selected, onSelect, tower }) → the VIP table map

   WHAT THIS FILE HAS
     - C / CSS: the brand colours (Midnight, Electric Blue, Cantaloupe Orange) as numbers and as CSS strings
     - supported(): can this browser draw WebGL?
     - makeRenderer() and runner(): create the canvas and run the draw loop only while it's on screen
     - pointerInput(): one helper for mouse, pen and touch (drag, pinch, tap)
     - Orbit: the "fly" camera that circles a target point and eases toward new positions
     - std(), sign(), pillSprite(): a standard material, a text sign, and a floating name label
     - buildTower(), buildStage(), buildCrowd(), buildMotes(): Lotus Tower, a DJ stage, people, floating lights

   Needs three.js r128 loaded on the page first (the <script> tag before this one). */
(function (V) {
  'use strict';
  /* ---------- palette (mirrors styles.css :root) ---------- */
  const C = {
    midnight: 0x02070a, surface: 0x0a1a23, surface2: 0x14303e,
    blue: 0x0297de, orange: 0xfc734d, ink: 0xf4f8fa, muted: 0xb4c4ce,
    blueSoft: 0x7fd0ff, orangeSoft: 0xffa58a, blueDeep: 0x02344f, orangeDeep: 0x8a3218,
  };
  const CSS = {
    midnight: '#02070a', surface: '#0a1a23', surface2: '#14303e', blue: '#0297de',
    orange: '#fc734d', ink: '#f4f8fa', muted: '#b4c4ce', blueSoft: '#9fd8f5',
  };
  const FONT = '"Albert Sans","Segoe UI",system-ui,sans-serif';
  /* Canvas text can't swap fonts by itself; redraw labels once Albert Sans is ready. */
  const fontReady = document.fonts && document.fonts.load
    ? document.fonts.load('600 32px "Albert Sans"').catch(() => {}) : null;
  const whenFontReady = (fn) => { if (fontReady) fontReady.then(fn); };
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;
  const coarse = () => window.matchMedia('(pointer: coarse)').matches;

  function supported() {
    if (typeof THREE === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }

  /* ---------- shared plumbing ---------- */
  function makeRenderer(host) {
    const small = window.matchMedia('(max-width: 900px)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'v3d-canvas';
    host.prepend(renderer.domElement);
    return renderer;
  }

  /* ---------- the festival look: glow (bloom) and a film-style finish ----------
     postFX() draws the scene into an off-screen image, adds a glow around everything bright
     (LED screens, beams, lit signs), then finishes it like a film camera: soft highlights (ACES
     tone mapping) and darker corners. It needs the three.js post-processing add-ons on the page
     (EffectComposer, RenderPass, ShaderPass, UnrealBloomPass); without them it returns null and
     the scene is drawn plainly. */
  const FINISH_SHADER = {
    uniforms: { tDiffuse: { value: null }, exposure: { value: 1.0 }, vignette: { value: 0.4 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDiffuse; uniform float exposure; uniform float vignette; varying vec2 vUv;',
      'vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }',
      /* the scene is drawn in linear light (see linearize() in realism.js): apply the film curve,
         then convert to screen colour (gamma 2.2) */
      'void main() {',
      '  vec3 lin = max(texture2D(tDiffuse, vUv).rgb, 0.0) * exposure;',
      '  vec3 c = pow(aces(lin), vec3(1.0 / 2.2));',
      '  c *= 1.0 - vignette * smoothstep(0.3, 0.85, distance(vUv, vec2(0.5)));',
      '  gl_FragColor = vec4(c, 1.0);',
      '}',
    ].join('\n'),
  };
  function postFX(renderer, scene, camera, o) {
    if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.ShaderPass || !THREE.UnrealBloomPass) return null;
    o = o || {};
    const small = window.matchMedia('(max-width: 900px)').matches;
    /* half-float keeps colours brighter than white, so the glow and the finish have room to work
       (only where the GPU can draw into half-float images); on WebGL 2 the first image is also
       anti-aliased (smooth truss edges) */
    const gl2 = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
    const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: gl2 ? THREE.HalfFloatType : THREE.UnsignedByteType };
    /* GPU memory: two working images at screen size. Only the one the scene is drawn into (readBuffer)
       is anti-aliased; the other stays plain. At 1600×1000 that's about 75 MB in total. */
    const composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, rtOpts));
    if (gl2 && !small && THREE.WebGLMultisampleRenderTarget) {
      const ms = new THREE.WebGLMultisampleRenderTarget(1, 1, rtOpts); ms.samples = 4;
      composer.renderTarget2.dispose();
      composer.renderTarget2 = composer.readBuffer = ms;
    }
    composer.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), o.strength || 0.75, o.radius || 0.5, o.threshold || 0.85);
    /* the glow is soft anyway, so draw it at a lower resolution: much cheaper, looks the same */
    const bloomScale = small ? 0.4 : 0.6, bloomSize = bloom.setSize.bind(bloom);
    bloom.setSize = (w, h) => bloomSize(Math.max(1, Math.round(w * bloomScale)), Math.max(1, Math.round(h * bloomScale)));
    composer.addPass(bloom);
    const finish = new THREE.ShaderPass(FINISH_SHADER);
    finish.uniforms.exposure.value = o.exposure || 1.0;
    composer.addPass(finish);

    return {
      composer, bloom, finish,
      setSize(w, h) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); },
      render(dt) { composer.render(dt); },
      dispose() { composer.renderTarget1.dispose(); composer.renderTarget2.dispose(); },
    };
  }

  /* Resize + a render loop that only runs while the scene is on screen and the tab is visible.
     fx (optional) is a postFX() result: it then draws the frame instead of the plain renderer. */
  function runner(host, renderer, scene, camera, tick, onSize, fx) {
    let running = false, onScreen = true, dead = false, raf = 0, last = performance.now();
    const size = () => {
      const w = host.clientWidth || 800, h = host.clientHeight || 480;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      if (fx) fx.setSize(w, h);
      if (onSize) onSize(w, h);
    };
    const ro = 'ResizeObserver' in window ? new ResizeObserver(size) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', size);
    size();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      tick(dt, now / 1000);
      if (fx) fx.render(dt); else renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(frame);
    }
    function pump() {
      const want = !dead && onScreen && !document.hidden;
      if (want === running) return;
      running = want;
      if (running) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
    }
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver((en) => { onScreen = en[0].isIntersecting; pump(); }, { rootMargin: '120px' }) : null;
    if (io) io.observe(host);
    document.addEventListener('visibilitychange', pump);
    pump();
    return {
      stop() {
        dead = true; pump();
        if (io) io.disconnect();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', size);
        document.removeEventListener('visibilitychange', pump);
      },
    };
  }

  /* Pointer input: one-pointer drag, two-pointer pinch, tap and hover. Works for mouse, pen and touch. */
  function pointerInput(el, h) {
    const pts = new Map();
    let moved = 0, t0 = 0, pinch = 0;
    const gap = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    const down = (e) => {
      if (e.button > 0) return;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { moved = 0; t0 = performance.now(); if (h.start) h.start(e); }
      if (pts.size === 2) pinch = gap();
    };
    const move = (e) => {
      const p = pts.get(e.pointerId);
      if (!p) { if (h.hover) h.hover(e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (h.drag) h.drag(dx, dy, e); }
      else if (pts.size === 2) { const d = gap(); if (pinch && h.pinch) h.pinch(pinch / d); pinch = d; moved += 99; }
    };
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      if (e.type === 'pointerup' && pts.size === 1 && moved < 7 && performance.now() - t0 < 500 && h.tap) h.tap(e);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (!pts.size && h.end) h.end(e);
    };
    const leave = (e) => { if (!pts.size && h.leave) h.leave(e); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
    };
  }

  /* Orbit camera with eased goals, so buttons and taps glide instead of jumping. */
  function Orbit(camera, o) {
    this.cam = camera;
    this.t = new THREE.Vector3().fromArray(o.target); this.gt = this.t.clone();
    this.theta = this.gTheta = o.theta; this.phi = this.gPhi = o.phi; this.r = this.gR = o.r;
    this.minR = o.minR; this.maxR = o.maxR; this.minPhi = o.minPhi; this.maxPhi = o.maxPhi;
    this.home = { target: o.target.slice(), theta: o.theta, phi: o.phi, r: o.r };
  }
  Orbit.prototype.rotate = function (dTheta, dPhi) {
    this.gTheta += dTheta;
    this.gPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.gPhi + dPhi));
  };
  Orbit.prototype.zoom = function (k) { this.gR = Math.max(this.minR, Math.min(this.maxR, this.gR * k)); };
  Orbit.prototype.to = function (v) {
    if (v.target) this.gt.fromArray(v.target);
    if (v.theta !== undefined) {
      /* take the short way round */
      let d = v.theta - this.gTheta; d = Math.atan2(Math.sin(d), Math.cos(d)); this.gTheta += d;
    }
    if (v.phi !== undefined) this.gPhi = Math.max(this.minPhi, Math.min(this.maxPhi, v.phi));
    if (v.r !== undefined) this.gR = Math.max(this.minR, Math.min(this.maxR, v.r));
  };
  Orbit.prototype.reset = function () { this.to(this.home); };
  Orbit.prototype.update = function (dt, snap) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    this.theta += (this.gTheta - this.theta) * k;
    this.phi += (this.gPhi - this.phi) * k;
    this.r += (this.gR - this.r) * k;
    this.t.lerp(this.gt, k);
    const s = Math.sin(this.phi);
    this.cam.position.set(this.t.x + this.r * s * Math.sin(this.theta), this.t.y + this.r * Math.cos(this.phi), this.t.z + this.r * s * Math.cos(this.theta));
    this.cam.lookAt(this.t);
  };

  function std(color, o) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.15 }, o || {}));
  }

  /* Text on a plane (signs on stalls, gates, rooms). */
  function sign(parent, text, w, h, bg, fg, x, y, z, ry) {
    const res = 96, cw = Math.max(2, Math.round(w * res)), ch = Math.round(h * res);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const cx = cv.getContext('2d');
    const draw = () => {
      cx.fillStyle = bg; cx.fillRect(0, 0, cw, ch);
      cx.fillStyle = fg; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      let fs = ch * 0.44;
      cx.font = `600 ${fs}px ${FONT}`;
      while (cx.measureText(text).width > cw * 0.88 && fs > 8) { fs *= 0.92; cx.font = `600 ${fs}px ${FONT}`; }
      cx.fillText(text, cw / 2, ch / 2 + fs * 0.04);
    };
    draw();
    const tx = new THREE.CanvasTexture(cv);
    whenFontReady(() => { draw(); tx.needsUpdate = true; });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx }));
    m.position.set(x, y, z); if (ry) m.rotation.y = ry; parent.add(m); return m;
  }

  /* Rounded pill label that always faces the camera. */
  function pillSprite(text, border, opts) {
    opts = opts || {};
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: opts.depthTest !== false }));
    sp.userData.draw = (label, edge, fill, ink) => {
      const cx = cv.getContext('2d');
      cx.clearRect(0, 0, 512, 128);
      cx.font = `600 ${opts.size || 54}px ${FONT}`;
      const tw = Math.min(460, cx.measureText(label).width);
      const bx = (512 - tw) / 2 - 26;
      cx.beginPath();
      if (cx.roundRect) cx.roundRect(bx, 18, tw + 52, 92, 46); else cx.rect(bx, 18, tw + 52, 92);
      cx.fillStyle = fill || 'rgba(2,7,10,.86)'; cx.fill();
      cx.strokeStyle = edge; cx.lineWidth = 4; cx.stroke();
      cx.fillStyle = ink || CSS.ink; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(label, 256, 66, 460);
      sp.material.map.needsUpdate = true;
    };
    sp.userData.draw(text, border);
    /* redraw with the brand font once it has loaded, keeping the latest colours */
    const first = sp.userData.draw;
    let last = [text, border];
    sp.userData.draw = (...args) => { last = args; first(...args); };
    whenFontReady(() => first(...last));
    return sp;
  }

  /* The Lotus Tower: plinth, ribbed shaft and a lotus bud of orange petals. */
  function buildTower(parent) {
    const tower = new THREE.Group(); parent.add(tower);
    const matShaft = std(0xe6eef3, { roughness: 0.5, metalness: 0.18 });
    const matBase = std(0xa9bac5, { roughness: 0.72, metalness: 0.1 });
    const matPetal = std(C.orange, { emissive: C.orangeDeep, emissiveIntensity: 0.55, roughness: 0.34, metalness: 0.2, side: THREE.DoubleSide });
    const matPetalIn = std(C.orangeSoft, { emissive: C.orange, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.22, side: THREE.DoubleSide });
    const matTip = std(C.blueSoft, { emissive: C.blue, emissiveIntensity: 0.9, roughness: 0.28, metalness: 0.6 });
    const tier = (y, h, rt, rb) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 44), matBase); m.position.y = y + h / 2; tower.add(m); };
    tier(0, 1.2, 4.2, 5.3); tier(1.2, 0.8, 3.4, 4.2); tier(2.0, 0.6, 2.1, 3.4);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.95, 9.4, 56), matShaft);
    shaft.position.y = 7.3; tower.add(shaft);
    for (let r = 0; r < 18; r++) {
      const a = r / 18 * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 9.4, 0.12), matShaft);
      rib.position.set(Math.cos(a) * 1.62, 7.3, Math.sin(a) * 1.62); rib.rotation.y = -a; tower.add(rib);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 1.3, 0.7, 56), matShaft); collar.position.y = 12; tower.add(collar);
    const prof = [[0.2, 12], [1.7, 12.6], [2.6, 13.8], [3.1, 15], [2.9, 16.3], [2.2, 17.6], [1.35, 18.8], [0.55, 19.9], [0.05, 20.6]]
      .map((p) => new THREE.Vector2(p[0], p[1]));
    tower.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 56), matPetalIn));
    function petalGeo(len, wid, cup, bow) {
      const g = new THREE.PlaneGeometry(wid, len, 8, 16), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const v = Math.min(0.999, Math.max(0.001, (y + len / 2) / len)), u = x / (wid / 2);
        const wf = Math.pow(Math.sin(Math.PI * v), 0.62);
        p.setXYZ(i, u * (wid / 2) * wf, v * len, -cup * (1 - u * u) * wf + bow * Math.sin(Math.PI * v));
      }
      g.computeVertexNormals(); return g;
    }
    function ring(count, len, wid, cup, bow, baseY, baseR, tilt, mat, phase) {
      const geo = petalGeo(len, wid, cup, bow);
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat); mesh.position.z = baseR; mesh.rotation.x = tilt;
        const pivot = new THREE.Group(); pivot.position.y = baseY; pivot.rotation.y = phase + i / count * Math.PI * 2;
        pivot.add(mesh); tower.add(pivot);
      }
    }
    ring(8, 7.6, 3.3, 0.85, 0.55, 12.4, 1.45, 0.58, matPetal, 0);
    ring(8, 7.0, 2.8, 0.95, 0.62, 13.0, 1.05, 0.34, matPetal, Math.PI / 8);
    ring(7, 6.4, 2.3, 1.0, 0.68, 13.7, 0.65, 0.16, matPetalIn, 0.4);
    ring(6, 5.6, 1.8, 1.0, 0.74, 14.5, 0.36, 0.05, matPetalIn, 0.9);
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 1.2, 18), matTip); finial.position.y = 20.7; tower.add(finial);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), matTip); orb.position.y = 21.4; tower.add(orb);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 3.2, 12), matTip); mast.position.y = 23.1; tower.add(mast);
    return tower;
  }

  /* Stage rig: deck, glowing edge, DJ booth, speaker stacks, truss and swinging light beams. */
  function buildStage(parent, z, width) {
    const matDark = std(0x0d2230, { roughness: 0.7, metalness: 0.2 });
    const matTruss = std(0x1d3a4a, { roughness: 0.6, metalness: 0.5 });
    const box = (mat, w, h, d, x, y, zz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, zz); parent.add(m); return m; };
    box(matDark, width, 1.2, 4.6, 0, 0.6, z);
    box(std(0x000000, { emissive: C.blue, emissiveIntensity: 0.85 }), width + 0.2, 0.18, 4.8, 0, 1.22, z);
    box(matDark, 3.4, 1.3, 1.4, 0, 1.85, z + 0.5);
    const booth = box(std(0x000000, { emissive: C.orange, emissiveIntensity: 0.8 }), 3.5, 1.0, 0.12, 0, 1.9, z + 1.22);
    const half = width / 2;
    const spk = std(0x081520, { roughness: 0.85 });
    [-half - 0.6, half + 0.6].forEach((x) => { for (let i = 0; i < 3; i++) box(spk, 1.8, 1.3, 1.6, x, 1.3 + i * 1.32, z); });
    [-half, half].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9.2, 10), matTruss); p.position.set(x, 4.6, z); parent.add(p); });
    box(matTruss, width + 0.6, 0.4, 0.4, 0, 9.0, z);
    const beams = [], colors = [C.blue, C.orange, C.ink, C.blue, C.orange, C.blueSoft];
    for (let i = 0; i < 6; i++) {
      const pivot = new THREE.Group(); pivot.position.set(-half + 2 + i * ((width - 4) / 5), 8.9, z);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 12, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      cone.position.y = -6;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: colors[i] }));
      pivot.add(cone); pivot.add(head); pivot.rotation.x = 0.5; parent.add(pivot);
      beams.push({ pivot, phase: i * 0.7, swing: 0.35 + (i % 3) * 0.08 });
    }
    return {
      animate(ts) {
        booth.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(ts * 2.4)) * 0.5;
        for (const b of beams) { b.pivot.rotation.z = Math.sin(ts * 1.3 + b.phase) * b.swing; b.pivot.rotation.x = 0.5 + Math.sin(ts * 0.9 + b.phase) * 0.18; }
      },
    };
  }

  /* Crowd of simple figures that bob to the music. */
  function buildCrowd(parent, count, place, faceZ) {
    const colors = [C.blue, C.orange, C.ink, C.blueSoft, C.orangeSoft, C.muted, 0x2b6f95];
    const bodyGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.95, 8), headGeo = new THREE.SphereGeometry(0.17, 10, 10);
    const headMat = std(0x1a2328, { roughness: 0.9 });
    const mats = colors.map((c) => std(c, { emissive: 0x050a10, roughness: 0.7 }));
    const people = [];
    for (let i = 0, tries = 0; i < count && tries < count * 6; tries++) {
      const pos = place();
      if (!pos) continue;
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, mats[(Math.random() * mats.length) | 0]); body.position.y = 0.5; g.add(body);
      const head = new THREE.Mesh(headGeo, headMat); head.position.y = 1.12; g.add(head);
      g.scale.setScalar(0.85 + Math.random() * 0.5);
      g.position.set(pos[0], pos[2] || 0, pos[1]);
      g.rotation.y = Math.atan2(-pos[0], faceZ - pos[1]);
      parent.add(g);
      people.push({ g, base: pos[2] || 0, phase: Math.random() * Math.PI * 2, amp: 0.12 + Math.random() * 0.16, spd: 4 + Math.random() * 3 });
      i++;
    }
    return { animate(ts) { for (const p of people) p.g.position.y = p.base + Math.abs(Math.sin(ts * p.spd + p.phase)) * p.amp; } };
  }

  /* Floating light motes in brand blue. */
  function buildMotes(parent, n, spread, cx) {
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * spread + (cx || 0); arr[i * 3 + 1] = Math.random() * 30; arr[i * 3 + 2] = (Math.random() - 0.5) * spread; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfe6ff, size: 0.2, transparent: true, opacity: 0.45, depthWrite: false }));
    parent.add(pts);
    return { animate(dt) { const a = g.attributes.position.array; for (let k = 1; k < a.length; k += 3) { a[k] += dt * 0.5; if (a[k] > 30) a[k] = 0; } g.attributes.position.needsUpdate = true; } };
  }


  Object.assign(V, { C, CSS, FONT, fontReady, whenFontReady, RM, reduced, coarse, supported, makeRenderer, postFX, runner, pointerInput, Orbit, std, sign, pillSprite, buildTower, buildStage, buildCrowd, buildMotes });
})(window.V3D = window.V3D || {});
