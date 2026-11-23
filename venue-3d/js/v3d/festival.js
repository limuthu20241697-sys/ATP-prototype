/* venue3d/festival.js — the festival look, as seen in stage-reveal videos rendered in Blender.
   Every piece here is built for a live browser scene (60 frames a second, on phones too):
     - nightSky(): a deep-blue sky dome with a glow on the horizon, stars and matching fog
     - skyline(): a ring of city towers with lit windows, far away in the fog
     - stageEnvironment(): soft coloured reflections, so metal truss and glossy floors pick up the stage lights
     - trussKit(): real box truss (four chords and zig-zag bracing), all drawn in one GPU call
     - ledTexture() / ledPanel(): LED screens with a pixel grid, showing moving visuals
     - glowSign(): a lit sign (the event name over the stage)
     - beamRig(): soft volumetric light beams that sweep over the crowd
     - fabricCanopy(): rows of wavy fabric ruffles hanging above the front of the stage
     - haze(): soft clouds of stage smoke, lit from behind
     - confetti(): drifting confetti over the floor
   The bright parts are drawn brighter than white on purpose: the glow (postFX in core.js) picks them up. */
(function (V) {
  'use strict';
  const { C, FONT, std, reduced, whenFontReady } = V;
  const small = () => window.matchMedia('(max-width: 900px)').matches;

  /* the same "random" numbers every time, so the scene always looks the same */
  function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  /* ---------- sky ---------- */
  /* o: { radius, horizon (fog colour), top, glow, stars, fogNear, fogFar } */
  function nightSky(scene, o) {
    const R = o.radius, horizon = new THREE.Color(o.horizon || 0x0a2036);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(o.top || 0x010409) }, horizon: { value: horizon }, glow: { value: new THREE.Color(o.glow || 0x2a6f9a) } },
      vertexShader: 'varying vec3 vP; void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 top; uniform vec3 horizon; uniform vec3 glow; varying vec3 vP;',
        'void main() {',
        '  float h = clamp(vP.y, 0.0, 1.0);',
        '  vec3 c = mix(horizon, top, smoothstep(0.0, 0.55, h));',
        '  c += glow * pow(1.0 - h, 8.0) * 0.55;',  /* city light glowing on the horizon */
        '  gl_FragColor = vec4(c, 1.0);',
        '}',
      ].join('\n'),
    }));
    dome.renderOrder = -10; dome.frustumCulled = false; dome.userData.night = true; scene.add(dome);

    /* stars, upper sky only, a few brighter than the rest */
    const n = o.stars || 900, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), r = rng(7);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, y = 0.12 + r() * 0.88, s = Math.sqrt(1 - y * y), d = R * 0.94;
      pos.set([Math.cos(a) * s * d, y * d, Math.sin(a) * s * d], i * 3);
      const b = 0.35 + Math.pow(r(), 3) * 1.4; col.set([b * 0.85, b * 0.92, b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: small() ? 1.6 : 1.9, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
    stars.renderOrder = -9; stars.frustumCulled = false; stars.userData.night = true; scene.add(stars);

    /* fog the same colour as the horizon, so far things melt into the sky */
    scene.fog = new THREE.Fog(horizon, o.fogNear, o.fogFar);
    return dome;
  }

  /* ---------- city skyline ---------- */
  /* night: dark towers with lit windows; day: pale concrete and glass */
  function windowsTexture(day) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
    const cx = cv.getContext('2d'), r = rng(3);
    cx.fillStyle = day ? '#b9bec2' : '#03080d'; cx.fillRect(0, 0, 128, 256);
    for (let y = 6; y < 250; y += 8) {
      for (let x = 6; x < 122; x += 10) {
        if (day) {
          const v = 70 + Math.floor(r() * 50);
          cx.fillStyle = `rgb(${v - 10},${v + 8},${v + 22})`; cx.fillRect(x, y, 7, 5);
          continue;
        }
        if (r() > 0.42) continue;
        const warm = r() > 0.35, a = (0.35 + r() * 0.65).toFixed(2);
        cx.fillStyle = warm ? `rgba(255,205,140,${a})` : `rgba(170,215,255,${a})`;
        cx.fillRect(x, y, 5, 4);
      }
    }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  /* o: { cx, cz, rMin, rMax, count, hMin, hMax, skip(angle) } — a ring of towers facing the centre */
  /* The towers are lit like real buildings (concrete and glass in the sun); their windows glow at night.
     Each tower gets its own tint and window pattern offset, so no two look the same. */
  const TINTS = [[0.95, 0.95, 0.93], [0.8, 0.86, 0.92], [0.92, 0.88, 0.8], [0.7, 0.76, 0.82], [0.98, 0.96, 0.9], [0.62, 0.7, 0.78]];
  function skyline(parent, o) {
    const r = rng(o.seed || 21), pos = [], uv = [], col = [], idx = [], tops = [];
    let tint = TINTS[0], u0 = 0;
    const quad = (a, b, c, d, u, v) => {
      const k = pos.length / 3;
      pos.push(...a, ...b, ...c, ...d); uv.push(u0, 0, u0 + u, 0, u0 + u, v, u0, v);
      for (let i = 0; i < 4; i++) col.push(...tint);
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    };
    for (let i = 0; i < o.count; i++) {
      const ang = r() * Math.PI * 2;
      if (o.skip && o.skip(ang)) continue;
      const d = o.rMin + r() * (o.rMax - o.rMin);
      const h = o.hMin + Math.pow(r(), 2.2) * (o.hMax - o.hMin), w = 10 + r() * 22, dp = 10 + r() * 18;
      const x = (o.cx || 0) + Math.cos(ang) * d, z = (o.cz || 0) + Math.sin(ang) * d, ry = -ang;
      if (o.avoid && o.avoid(x, z)) continue;               /* e.g. not in the lake */
      const c = Math.cos(ry), s = Math.sin(ry);
      const P = (lx, y, lz) => [x + lx * c - lz * s, y, z + lx * s + lz * c];
      const hw = w / 2, hd = dp / 2, U = w / 14, UD = dp / 14, Vt = h / 18;
      tint = TINTS[Math.floor(r() * TINTS.length)]; u0 = Math.floor(r() * 8) / 8;
      quad(P(-hw, 0, hd), P(hw, 0, hd), P(hw, h, hd), P(-hw, h, hd), U, Vt);
      quad(P(hw, 0, -hd), P(-hw, 0, -hd), P(-hw, h, -hd), P(hw, h, -hd), U, Vt);
      quad(P(hw, 0, hd), P(hw, 0, -hd), P(hw, h, -hd), P(hw, h, hd), UD, Vt);
      quad(P(-hw, 0, -hd), P(-hw, 0, hd), P(-hw, h, hd), P(-hw, h, -hd), UD, Vt);
      /* flat roof */
      const k = pos.length / 3; tint = tint.map((t) => t * 0.7);
      pos.push(...P(-hw, h, hd), ...P(hw, h, hd), ...P(hw, h, -hd), ...P(-hw, h, -hd)); uv.push(0, 0, 0.01, 0, 0.01, 0.01, 0, 0.01);
      for (let q = 0; q < 4; q++) col.push(...tint);
      idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
      if (h > o.hMax * 0.55) tops.push(x, h + 1.5, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    /* day: the facade picture, lit by the sun; night: the lit-window picture glows (emissive).
       Default is night (the editor has no day mode); the fans' view switches with setTime(). */
    const city = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: windowsTexture(true), emissiveMap: windowsTexture(false), emissive: 0xffffff, emissiveIntensity: 1.3,
      vertexColors: true, roughness: 0.45, metalness: 0.25, side: THREE.DoubleSide,
    }));
    city.userData.cityWindows = true; city.userData.noCast = true;
    parent.add(city);
    /* red aircraft lights on the tall towers */
    if (tops.length) {
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tops, 3));
      const lights = new THREE.Points(tg, new THREE.PointsMaterial({ color: 0xff3b2e, size: 3, sizeAttenuation: false, fog: false }));
      lights.material.color.multiplyScalar(2); lights.userData.night = true; parent.add(lights);
    }
    return city;
  }

  /* ---------- reflections ---------- */
  /* A tiny "room" of stage lights, turned into an environment map: glossy and metal surfaces
     (truss, stage floor, the tower) reflect coloured light instead of looking flat. */
  function stageEnvironment(renderer, scene) {
    if (!THREE.PMREMGenerator) return;
    const room = new THREE.Scene();
    /* kept dark on purpose: it's night, so reflections should be small coloured highlights, not daylight */
    room.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x010306, side: THREE.BackSide })));
    const panel = (color, k, x, y, z, w, h) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.material.color.multiplyScalar(k); m.position.set(x, y, z); m.lookAt(0, 0, 0); room.add(m);
    };
    panel(0xffb066, 0.9, 0, 3, -8, 7, 2);     /* warm stage wash */
    panel(C.blue, 0.7, -7, 2, 3, 2.5, 4);     /* blue side light */
    panel(0xff6a3d, 0.6, 7, 2, 3, 2.5, 4);    /* orange side light */
    panel(0xdfefff, 0.35, 0, 9, 0, 6, 2);     /* cool light from above */
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(room, 0.04).texture;
    pm.dispose();
    return scene.environment;
  }

  /* ---------- truss ---------- */
  /* trussKit(parent): call run(a, b, size) for each straight piece of truss, tower(x, z, h) for a
     vertical one, then finish() once: every tube becomes one instance of a single InstancedMesh. */
  function trussKit(parent) {
    const tubes = [];
    const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), U = new THREE.Vector3(), W = new THREE.Vector3();
    const tube = (a, b, t) => tubes.push([a.clone(), b.clone(), t]);
    function run(a, b, size) {
      const s = size || 0.55, h = s / 2;
      A.fromArray(a); B.fromArray(b); D.subVectors(B, A);
      const len = D.length(); D.normalize();
      U.set(0, 1, 0); if (Math.abs(D.y) > 0.9) U.set(1, 0, 0);
      W.crossVectors(D, U).normalize(); U.crossVectors(W, D).normalize();
      const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([i, j]) => new THREE.Vector3().addScaledVector(U, i * h).addScaledVector(W, j * h));
      const n = Math.max(1, Math.round(len / s));
      const at = (k, c) => A.clone().addScaledVector(D, (len * k) / n).add(c);
      corners.forEach((c) => tube(at(0, c), at(n, c), 0.045));                  /* the four main chords */
      for (let k = 0; k <= n; k++) {
        for (let ci = 0; ci < 4; ci++) {
          const c1 = corners[ci], c2 = corners[(ci + 1) % 4];
          if (k % 2 === 0) tube(at(k, c1), at(k, c2), 0.025);                    /* rungs */
          if (k < n) tube(at(k, c1), at(k + 1, c2), 0.022);                      /* zig-zag bracing */
        }
      }
    }
    const tower = (x, z, h, size) => run([x, 0, z], [x, h, z], size || 0.7);
    function finish() {
      const mat = std(0xc9d2d8, { metalness: 0.85, roughness: 0.3, emissive: 0x0b141b });
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1), mat, tubes.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), mid = new THREE.Vector3(), sc = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      tubes.forEach(([a, b, t], i) => {
        dir.subVectors(b, a); const len = dir.length(); dir.normalize();
        q.setFromUnitVectors(up, dir); mid.addVectors(a, b).multiplyScalar(0.5); sc.set(t, len, t);
        m.compose(mid, q, sc); mesh.setMatrixAt(i, m);
      });
      parent.add(mesh);
      return mesh;
    }
    return { run, tower, finish };
  }

  /* ---------- LED screens ---------- */
  /* Moving visuals for the LED screens, redrawn about 15 times a second.
     kind: 'flow' (red and orange liquid shapes), 'blue' (blue waves), 'logo' (the brand mark pulsing). */
  function ledTexture(kind, w, h) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    const grid = () => {                                       /* the LED pixel grid */
      cx.fillStyle = 'rgba(0,0,0,0.38)';
      for (let x = 0; x < w; x += 4) cx.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 4) cx.fillRect(0, y, w, 1);
    };
    const draw = (t) => {
      if (kind === 'logo') {
        cx.fillStyle = '#02070a'; cx.fillRect(0, 0, w, h);
        const p = 0.5 + 0.5 * Math.sin(t * 2.2);
        const g = cx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.6);
        g.addColorStop(0, `rgba(2,151,222,${(0.35 + p * 0.4).toFixed(2)})`); g.addColorStop(1, 'rgba(2,7,10,0)');
        cx.fillStyle = g; cx.fillRect(0, 0, w, h);
        cx.fillStyle = '#f4f8fa'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.font = `700 ${Math.round(h * 0.26)}px ${FONT}`;
        cx.fillText(V.LOGO || 'WE ARE LOST', w / 2, h / 2);
        cx.fillStyle = '#fc734d'; cx.fillRect(w * 0.3, h * 0.68, w * 0.4 * (0.3 + p * 0.7), h * 0.05);
      } else {
        const warm = kind === 'flow';
        cx.fillStyle = warm ? '#1a0302' : '#010a14'; cx.fillRect(0, 0, w, h);
        cx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const x = w * (0.5 + 0.45 * Math.sin(t * 0.6 + i * 1.7)), y = h * (0.5 + 0.42 * Math.sin(t * 0.85 + i * 2.3));
          const rad = h * (0.35 + 0.2 * Math.sin(t * 1.3 + i));
          const g = cx.createRadialGradient(x, y, 0, x, y, rad);
          const c = warm ? (i % 3 === 0 ? '255,190,90' : '235,40,20') : (i % 3 === 0 ? '160,230,255' : '2,120,222');
          g.addColorStop(0, `rgba(${c},0.85)`); g.addColorStop(1, `rgba(${c},0)`);
          cx.fillStyle = g; cx.fillRect(0, 0, w, h);
        }
        cx.globalCompositeOperation = 'source-over';
        cx.strokeStyle = warm ? 'rgba(10,0,0,0.55)' : 'rgba(0,5,15,0.5)'; cx.lineWidth = 3;
        for (let k = 0; k < 4; k++) {                          /* dark veins, like the reel's liquid look */
          cx.beginPath();
          for (let x = 0; x <= w; x += 8) { const y = h * (0.2 + k * 0.2) + Math.sin(x * 0.03 + t * 1.4 + k) * h * 0.09; if (x) cx.lineTo(x, y); else cx.moveTo(x, y); }
          cx.stroke();
        }
      }
      grid();
      tex.needsUpdate = true;
    };
    draw(0);
    if (kind === 'logo') whenFontReady(() => draw(0));
    return { tex, draw, last: -1 };
  }
  /* redraws a scene's LED textures, about 15 times a second (call from the scene's animate) */
  function animateLeds(leds, ts) {
    for (const l of leds) if (Math.abs(ts - l.last) > 1 / 15) { l.last = ts; l.draw(ts); }
  }
  /* A screen: the picture, a black frame around it. ry turns it, tilt leans it forward. */
  function ledPanel(parent, led, w, h, x, y, z, ry, tilt) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; g.rotation.x = tilt || 0; parent.add(g);
    const mat = new THREE.MeshBasicMaterial({ map: led.tex }); mat.color.setScalar(1.6);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); scr.position.z = 0.06; g.add(scr);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, h + 0.25, 0.1), std(0x07090b, { roughness: 0.6, metalness: 0.4 })));
    return g;
  }

  /* ---------- lit sign ---------- */
  function glowSign(parent, text, w, h, x, y, z, ry) {
    const cw = 1024, ch = Math.round(cw * h / w);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const cx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    const draw = () => {
      cx.clearRect(0, 0, cw, ch);
      let fs = ch * 0.72; cx.font = `800 ${fs}px ${FONT}`;
      while (cx.measureText(text).width > cw * 0.94 && fs > 10) { fs *= 0.94; cx.font = `800 ${fs}px ${FONT}`; }
      const g = cx.createLinearGradient(0, ch * 0.15, 0, ch * 0.85);
      g.addColorStop(0, '#fff6e8'); g.addColorStop(1, '#ffb066');
      cx.fillStyle = g; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(text, cw / 2, ch / 2);
      tex.needsUpdate = true;
    };
    draw(); whenFontReady(draw);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    mat.color.setScalar(2.2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry || 0; parent.add(m);
    return m;
  }

  /* ---------- light beams ---------- */
  /* A soft beam: bright at the lamp, fading along its length and towards its edges,
     so it reads as light in smoky air rather than a solid cone. */
  function beamMaterial(color, strength) {
    return new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength } },
      vertexShader: [
        'varying float vAlong; varying vec3 vN; varying vec3 vView;',
        'void main() {',
        '  vAlong = uv.y;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 color; uniform float strength; varying float vAlong; varying vec3 vN; varying vec3 vView;',
        'void main() {',
        '  float edge = pow(abs(dot(normalize(vN), normalize(vView))), 2.2);',
        '  float along = pow(max(vAlong, 0.0), 1.8);',   /* max(): a slightly negative value here would make an invalid (black) pixel */
        '  gl_FragColor = vec4(color * strength * edge * along, 1.0);',
        '}',
      ].join('\n'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    });
  }
  /* beams: [{ x, y, z, color, pitch, yaw, swing, len, width, speed }] — pitch 0 points straight down,
     Math.PI straight up. Each beam sweeps side to side around its yaw. */
  function beamRig(parent, beams, strength) {
    const k = strength || 0.55;
    const rig = beams.map((b, i) => {
      const len = b.len || 26, geo = new THREE.ConeGeometry(b.width || 1.6, len, 28, 1, true);
      geo.translate(0, -len / 2, 0);                         /* the tip (the lamp) sits at the pivot */
      const yawG = new THREE.Group(); yawG.position.set(b.x, b.y, b.z); yawG.rotation.y = b.yaw || 0; yawG.userData.night = true; parent.add(yawG);
      const pivot = new THREE.Group(); yawG.add(pivot);
      pivot.add(new THREE.Mesh(geo, beamMaterial(b.color, k)));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshBasicMaterial({ color: b.color }));
      lamp.material.color.multiplyScalar(3); pivot.add(lamp);
      return { pivot, pitch: b.pitch || 0.5, swing: b.swing === undefined ? 0.45 : b.swing, speed: b.speed || 0.9, phase: i * 0.63 };
    });
    return {
      animate(ts) {
        for (const b of rig) {
          b.pivot.rotation.x = b.pitch + Math.sin(ts * b.speed * 0.7 + b.phase) * 0.12;
          b.pivot.rotation.z = Math.sin(ts * b.speed + b.phase) * b.swing;
        }
      },
    };
  }

  /* ---------- fabric canopy ---------- */
  /* Rows of white fabric hanging from the roof truss, each one rippled into waves, with a scalloped
     lower edge: the ruffled ceiling from the stage reveal. o: { x1, x2, z1, z2, top, drop, rows } */
  function fabricCanopy(parent, o) {
    const mat = std(0xf1e8da, { roughness: 0.9, metalness: 0, side: THREE.DoubleSide, emissive: 0x30261c, emissiveIntensity: 0.6 });
    const rows = o.rows || 7, w = o.x2 - o.x1, segs = small() ? 60 : 110;
    for (let r = 0; r < rows; r++) {
      const z = o.z1 + (o.z2 - o.z1) * (r / Math.max(1, rows - 1));
      const geo = new THREE.PlaneGeometry(w, o.drop, segs, 6), p = geo.attributes.position;
      const f = 0.9 + (r % 3) * 0.15, ph = r * 1.3;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), v = (o.drop / 2 - y) / o.drop;  /* 0 at the top, 1 at the hem */
        const wave = Math.sin(x * f + ph) * (0.35 + v * 0.25);
        const hem = v > 0.99 ? Math.abs(Math.sin(x * f * 0.5 + ph)) * o.drop * 0.35 : 0;
        p.setXYZ(i, x, y + hem, wave);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      m.position.set((o.x1 + o.x2) / 2, o.top - o.drop / 2, z); parent.add(m);
    }
  }

  /* ---------- haze ---------- */
  let smokeTex = null;
  function smokeTexture() {
    if (smokeTex) return smokeTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'), g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
    smokeTex = new THREE.CanvasTexture(cv);
    return smokeTex;
  }
  /* spots: [[x, y, z, size, color]] */
  function haze(parent, spots) {
    const clouds = spots.map(([x, y, z, s, color], i) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexture(), color: color || 0x7fb6e0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      sp.position.set(x, y, z); sp.scale.set(s, s * 0.6, 1); sp.userData.night = true; parent.add(sp);
      return { sp, x, phase: i * 1.9 };
    });
    return { animate(ts) { for (const c of clouds) { c.sp.position.x = c.x + Math.sin(ts * 0.15 + c.phase) * 1.5; c.sp.material.opacity = 0.17 + Math.sin(ts * 0.4 + c.phase) * 0.05; } } };
  }

  /* ---------- confetti ---------- */
  /* o: { x1, x2, z1, z2, top, count } */
  function confetti(parent, o) {
    const n = small() ? Math.round(o.count * 0.5) : o.count, r = rng(5);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), drift = [];
    const palette = [[1, 0.45, 0.3], [0.1, 0.6, 0.95], [1, 1, 1], [1, 0.8, 0.35]];
    for (let i = 0; i < n; i++) {
      pos.set([o.x1 + r() * (o.x2 - o.x1), r() * o.top, o.z1 + r() * (o.z2 - o.z1)], i * 3);
      const c = palette[i % palette.length]; col.set([c[0] * 1.6, c[1] * 1.6, c[2] * 1.6], i * 3);
      drift.push(0.6 + r() * 0.9, r() * Math.PI * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    parent.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false })));
    return {
      animate(ts, dt) {
        if (reduced()) return;
        const a = g.attributes.position.array;
        for (let i = 0; i < n; i++) {
          const k = i * 3, sp = drift[i * 2], ph = drift[i * 2 + 1];
          a[k + 1] -= dt * sp;
          a[k] += Math.sin(ts * 1.7 + ph) * dt * 0.6;
          if (a[k + 1] < 0) a[k + 1] = o.top;
        }
        g.attributes.position.needsUpdate = true;
      },
    };
  }

  Object.assign(V, { rng, windowsTexture, TINTS, nightSky, skyline, stageEnvironment, trussKit, ledTexture, animateLeds, ledPanel, glowSign, beamMaterial, beamRig, fabricCanopy, haze, confetti });
})(window.V3D = window.V3D || {});
