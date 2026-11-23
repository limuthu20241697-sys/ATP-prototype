/* venue3d/realism.js — the "looks real" kit for the fans' 3D view (viewer.js). The editor doesn't use it.
     - linearize(): switches a finished scene to real-world light maths (linear colour), so lighting,
       the photo sky and the film finish behave like a camera. Run it once, after everything is built.
     - loadDaySky(): the daytime photo sky (an HDRI from Poly Haven), used as the background and as the light
       that bounces off everything
     - sun(): the sun, with soft shadows; shadows() turns shadows on for every solid object
     - groundMaterial() / groundPlane() / worldUV(): real grass, concrete and asphalt textures, tiled in metres
     - waterMaterial(): a lake surface that reflects the sky, with moving ripples
     - people(): a crowd with real body shapes, skin tones and outfits, some with their hands up
     - forest(): broadleaf trees and coconut palms, with leaves that let light through
   Files in assets/3d come from Poly Haven (CC0, free to use). */
(function (V) {
  'use strict';
  const { rng } = V;
  const small = () => window.matchMedia('(max-width: 900px)').matches;
  const ASSETS = 'assets/3d/';

  /* ---------- colour ---------- */
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  /* Our colours are written as screen colours (sRGB). Real light maths needs them linear, so convert each
     colour, light, texture and vertex colour once. Flags stop anything being converted twice. */
  function linearize(scene) {
    const done = new Set(), fixed = new Set();
    /* some materials expose one colour twice (e.g. line materials: .color is also a uniform), so track each colour */
    const fix = (c) => { if (c && c.isColor && !fixed.has(c)) { fixed.add(c); c.convertSRGBToLinear(); } };
    const fixArray = (a) => { for (let i = 0; i < a.length; i++) a[i] = toLin(a[i]); };
    scene.traverse((o) => {
      if (o.isLight && !o.userData.linear) { fix(o.color); if (o.groundColor) fix(o.groundColor); o.userData.linear = true; }
      if (o.isInstancedMesh && o.instanceColor && !o.userData.linear) { fixArray(o.instanceColor.array); o.instanceColor.needsUpdate = true; o.userData.linear = true; }
      const g = o.geometry;
      if (g && g.attributes && g.attributes.color && !g.userData.linear) { fixArray(g.attributes.color.array); g.attributes.color.needsUpdate = true; g.userData.linear = true; }
      const mats = !o.material ? [] : Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (done.has(m) || m.userData.linear) continue;
        done.add(m); m.userData.linear = true;
        fix(m.color); fix(m.emissive);
        /* a texture still downloading updates itself when it arrives; flagging it early just logs a warning */
        ['map', 'emissiveMap'].forEach((k) => { if (m[k] && !m[k].isDataTexture) { m[k].encoding = THREE.sRGBEncoding; if (m[k].image) m[k].needsUpdate = true; } });
        if (m.uniforms) for (const k in m.uniforms) fix(m.uniforms[k].value);
        m.needsUpdate = true;
      }
    });
    if (scene.fog) fix(scene.fog.color);
  }
  const linColor = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  /* ---------- sky and sun ---------- */
  /* calls done({ background, env }) with the photo sky, or done(null) if it can't load */
  function loadDaySky(renderer, done) {
    if (!THREE.RGBELoader) { done(null); return; }
    new THREE.RGBELoader().setDataType(THREE.HalfFloatType).load(ASSETS + 'sky_day_2k.hdr', (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer);
      const env = pm.fromEquirectangular(tex).texture;
      pm.dispose();
      done({ background: tex, env });
    }, undefined, () => done(null));
  }

  /* The sun, with soft shadows over the area around (cx, cz). size = half the width the shadows cover. */
  function sun(scene, o) {
    const s = new THREE.DirectionalLight(0xfff0dc, o.intensity || 3.2);
    s.position.set(o.cx + o.dir[0] * o.dist, o.dir[1] * o.dist, o.cz + o.dir[2] * o.dist);
    s.target.position.set(o.cx, 0, o.cz);
    s.castShadow = true;
    const map = small() ? 2048 : 4096;
    s.shadow.mapSize.set(map, map);
    const cam = s.shadow.camera;
    cam.left = -o.size; cam.right = o.size; cam.top = o.size; cam.bottom = -o.size;
    cam.near = 1; cam.far = o.dist * 2.2;
    s.shadow.bias = -0.0003; s.shadow.normalBias = o.normalBias || 0.03; s.shadow.radius = 3;
    scene.add(s); scene.add(s.target);
    return s;
  }
  /* every solid object casts and receives shadows (glows, beams, sprites and the sky don't) */
  function shadows(scene) {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const solid = m && (m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial) && !(m.transparent && m.opacity < 0.9);
      if (!solid) return;
      o.receiveShadow = true;
      if (!o.userData.noCast) o.castShadow = true;
    });
  }

  /* ---------- ground ---------- */
  /* name: 'leafy_grass' | 'concrete_pavement' | 'asphalt_02'; tile = how many metres one copy of the texture covers.
     The material expects world-space UVs (1 = 1 unit), so one material tiles evenly on any size of ground. */
  const groundCache = {};
  function groundMaterial(name, tile, o) {
    const key = name + tile + JSON.stringify(o || {});
    if (groundCache[key]) return groundCache[key];
    const L = new THREE.TextureLoader();
    const load = (map, srgb) => {
      const t = L.load(`${ASSETS}${name}_${map}_${V.lite && map === 'diff' ? '512' : '1k'}.jpg`);   /* phones get the small colour files */
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1 / tile, 1 / tile);
      t.anisotropy = V.maxAniso || 8;     /* keeps the ground sharp when you look along it */
      if (srgb) t.encoding = THREE.sRGBEncoding;
      return t;
    };
    /* V.lite (phones and slow laptops): colour map only, so the page downloads and draws less */
    const mat = new THREE.MeshStandardMaterial(Object.assign(V.lite
      ? { map: load('diff', true), roughness: 0.95, metalness: 0 }
      : { map: load('diff', true), normalMap: load('nor_gl'), roughnessMap: load('rough'), roughness: 1, metalness: 0 }, o || {}));
    mat.userData.linear = true;            /* textures are already set up; nothing to convert */
    if (o && o.color !== undefined) mat.color = linColor(o.color);
    groundCache[key] = mat;
    return mat;
  }
  /* sets a geometry's UVs from its x/z positions (after any rotate/translate on the geometry) */
  function worldUV(geo, ox, oz) {
    const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) + (ox || 0); uv[i * 2 + 1] = -(p.getZ(i) + (oz || 0)); }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  }
  /* a flat rectangle of ground at height y, centred on (x, z) */
  function groundPlane(parent, mat, w, d, x, y, z) {
    const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2); geo.translate(x, y, z);
    const m = new THREE.Mesh(worldUV(geo), mat); m.userData.noCast = true; parent.add(m); return m;
  }
  function groundDisc(parent, mat, r, x, y, z) {
    const geo = new THREE.CircleGeometry(r, 64); geo.rotateX(-Math.PI / 2); geo.translate(x, y, z);
    const m = new THREE.Mesh(worldUV(geo), mat); m.userData.noCast = true; parent.add(m); return m;
  }

  /* ---------- water ---------- */
  /* a tiling ripple normal map, made from layered soft noise */
  function rippleTexture() {
    const N = 256, h = new Float32Array(N * N), r = rng(9);
    for (let k = 0; k < 90; k++) {                       /* soft round bumps, wrapped at the edges */
      const cx = r() * N, cy = r() * N, rad = 6 + r() * 26, amp = (r() - 0.5) * 2;
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
        const d = Math.hypot(x, y) / rad; if (d > 1) continue;
        const px = ((Math.round(cx + x) % N) + N) % N, py = ((Math.round(cy + y) % N) + N) % N;
        h[py * N + px] += amp * (Math.cos(d * Math.PI) + 1) * 0.5;
      }
    }
    const img = new Uint8Array(N * N * 4);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)];
      const dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
      const nx = -dx * 0.6, ny = -dy * 0.6, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * N + x) * 4;
      img[i] = (nx / l * 0.5 + 0.5) * 255; img[i + 1] = (ny / l * 0.5 + 0.5) * 255; img[i + 2] = (nz / l * 0.5 + 0.5) * 255; img[i + 3] = 255;
    }
    const t = new THREE.DataTexture(img, N, N, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  /* glossy water: it mirrors the sky (from the environment light) and the ripples move */
  function waterMaterial(tile) {
    const n1 = rippleTexture(); n1.repeat.set(1 / tile, 1 / tile);
    const mat = new THREE.MeshStandardMaterial({ color: linColor(0x0f3440), roughness: 0.06, metalness: 0.0, normalMap: n1, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.2 });
    mat.userData.linear = true;
    return { mat, animate(ts) { n1.offset.set(ts * 0.004, ts * 0.0025); } };
  }

  /* ---------- geometry helper ---------- */
  /* merges [geometry, colour] pairs into one geometry with vertex colours (so a whole person is one draw) */
  function mergeColored(parts) {
    const pos = [], nor = [], col = [], uvs = [], idx = [];
    const c = new THREE.Color();
    for (const [g, hex] of parts) {
      const base = pos.length / 3, p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
      c.setHex(hex);
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); col.push(c.r, c.g, c.b);
        uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
      else for (let i = 0; i < p.count; i++) idx.push(base + i);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    out.setIndex(idx);
    return out;
  }
  const M4 = () => new THREE.Matrix4();
  const at = (g, x, y, z, rx, ry, rz, sx, sy, sz) => {
    const m = M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
    return g.clone().applyMatrix4(m);
  };

  /* ---------- people ---------- */
  const SKIN = [0x8d5524, 0xa86b3c, 0xc68642, 0x6b4423, 0x9a6440, 0xe0ac69, 0x7a4b2a];
  const SHIRT = [0xf2f2f0, 0x1c1c1e, 0x2f5d8a, 0xb8322d, 0x3d7a4f, 0xe8c547, 0xd96fa0, 0x8a8f96, 0xf08a3c, 0x9cc3e6, 0x5b3f8c, 0xffffff];
  const PANTS = [0x34495e, 0x2b2b2d, 0xc8b79a, 0x6b4f3a, 0x23324a, 0xe9e4da, 0x3b3b3b];
  const HAIR = [0x1a1410, 0x2b1d14, 0x0d0d0d, 0x3a2a1c];
  /* One person, about 1.15 units (1.72 m) tall, feet at y = 0, facing +z.
     pose: 0 arms down, 1 right hand up, 2 both hands up */
  function personGeometry(pose, skin, shirt, pants, hair, shoe, r) {
    const lo = V.lite;                                   /* phones: about a third of the triangles per person */
    const cyl = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, lo ? 5 : 8, 1);
    const parts = [];
    [-1, 1].forEach((s) => {
      parts.push([at(cyl(0.06, 0.045, 0.52), s * 0.066, 0.29, 0), pants]);                   /* legs */
      parts.push([at(new THREE.BoxGeometry(0.085, 0.05, 0.16), s * 0.066, 0.025, 0.03), shoe]); /* shoes */
    });
    parts.push([at(cyl(0.125, 0.12, 0.12), 0, 0.58, 0, 0, 0, 0, 1, 1, 0.75), pants]);         /* hips */
    parts.push([at(cyl(0.15, 0.125, 0.36), 0, 0.8, 0, 0, 0, 0, 1, 1, 0.66), shirt]);          /* torso */
    parts.push([at(cyl(0.042, 0.045, 0.06), 0, 1.0, 0), skin]);                               /* neck */
    parts.push([at(new THREE.SphereGeometry(0.088, lo ? 6 : 12, lo ? 5 : 10), 0, 1.09, 0.005, 0, 0, 0, 0.9, 1.06, 0.98), skin]); /* head */
    parts.push([at(new THREE.SphereGeometry(0.092, lo ? 6 : 12, lo ? 4 : 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 1.1, -0.006, -0.15, 0, 0, 0.94, 1.02, 1), hair]);
    [-1, 1].forEach((s) => {
      const up = pose === 2 || (pose === 1 && s > 0);
      /* shoulder at (±0.165, 0.95): an arm hangs down, or swings up past the head */
      const a = up ? Math.PI - 0.25 - r() * 0.3 : 0.1 + r() * 0.06;
      const len = 0.5, cx = s * (0.165 + Math.sin(a) * len / 2), cy = 0.95 - Math.cos(a) * len / 2;
      parts.push([at(cyl(0.036, 0.03, len), cx, cy, 0, 0, 0, s * a), up ? skin : shirt]);
      parts.push([at(new THREE.SphereGeometry(0.034, lo ? 4 : 8, lo ? 3 : 6), s * (0.165 + Math.sin(a) * len), 0.95 - Math.cos(a) * len, 0), skin]);
    });
    return mergeColored(parts);
  }
  /* A crowd: `count` people placed by place() → [x, z] (or null to retry), facing faceZ (or [x, z]).
     Built as 18 outfit variants, each one InstancedMesh, so 1,000 people take 18 draws. They bounce to the music.
     scale: 1 where 1 unit = 1.5 m (Lotus Tower); 1.5 where 1 unit = 1 m (Nelum Pokuna). */
  function people(parent, count, place, faceZ, scale) {
    const k = scale || 1;
    const r = rng(17), VARS = 18;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
    const groups = [];
    for (let v = 0; v < VARS; v++) {
      const pose = v % 6 === 0 ? 2 : v % 3 === 0 ? 1 : 0;
      const pick = (a) => a[Math.floor(r() * a.length)];
      groups.push({ geo: personGeometry(pose, pick(SKIN), pick(SHIRT), pick(PANTS), pick(HAIR), r() > 0.5 ? 0x1a1a1a : 0xe8e8e8, r), list: [] });
    }
    for (let i = 0, tries = 0; i < count && tries < count * 8; tries++) {
      const pos = place(); if (!pos) continue;
      const ry = Array.isArray(faceZ) ? Math.atan2(faceZ[0] - pos[0], faceZ[1] - pos[1]) : Math.atan2(-pos[0] * 0.15, faceZ - pos[1]);
      groups[Math.floor(Math.random() * VARS)].list.push({ x: pos[0], z: pos[1], ry: ry + (Math.random() - 0.5) * 0.5, s: (0.92 + Math.random() * 0.18) * k, ph: Math.random() * 6.28, amp: (Math.random() < 0.55 ? 0.04 + Math.random() * 0.1 : 0.01) * k, spd: 4.2 + Math.random() * 2 });
      i++;
    }
    const meshes = groups.filter((g) => g.list.length).map((g) => {
      const im = new THREE.InstancedMesh(g.geo, mat, g.list.length);
      im.frustumCulled = false; parent.add(im);
      return { im, list: g.list };
    });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    function pose(ts) {
      for (const { im, list } of meshes) {
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          q.setFromAxisAngle(up, p.ry); sc.setScalar(p.s);
          v3.set(p.x, Math.abs(Math.sin(ts * p.spd + p.ph)) * p.amp, p.z);
          m.compose(v3, q, sc); im.setMatrixAt(i, m);
        }
        im.instanceMatrix.needsUpdate = true;
      }
    }
    pose(0);
    return { animate: pose, count: meshes.reduce((n, x) => n + x.list.length, 0) };
  }

  /* ---------- trees ---------- */
  /* leaves drawn on a see-through canvas: many small leaves in several greens */
  function leafTexture(seed, palm) {
    const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const cx = cv.getContext('2d'), r = rng(seed);
    if (palm) {
      /* a palm frond: a central rib with long thin leaflets */
      cx.strokeStyle = '#5b6b2a'; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(N / 2, N); cx.lineTo(N / 2, 0); cx.stroke();
      for (let y = 6; y < N; y += 7) {
        const len = (N / 2 - 6) * Math.sin(Math.PI * (1 - y / N)) * (0.75 + r() * 0.25);
        [-1, 1].forEach((s) => {
          const g = 90 + Math.floor(r() * 60);
          cx.strokeStyle = `rgb(${40 + Math.floor(r() * 30)},${g},${30 + Math.floor(r() * 20)})`; cx.lineWidth = 3.2;
          cx.beginPath(); cx.moveTo(N / 2, y); cx.quadraticCurveTo(N / 2 + s * len * 0.6, y - 6, N / 2 + s * len, y + 10); cx.stroke();
        });
      }
    } else {
      for (let k = 0; k < 230; k++) {
        const x = 16 + r() * (N - 32), y = 16 + r() * (N - 32), a = r() * Math.PI * 2, l = 10 + r() * 12;
        const g = 70 + Math.floor(r() * 80), light = 1 - y / N * 0.35;
        cx.fillStyle = `rgb(${Math.floor((25 + r() * 35) * light)},${Math.floor(g * light)},${Math.floor((20 + r() * 25) * light)})`;
        cx.save(); cx.translate(x, y); cx.rotate(a); cx.beginPath(); cx.ellipse(0, 0, l, l * 0.42, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
      }
    }
    const t = new THREE.CanvasTexture(cv);
    t.anisotropy = 4;
    return t;
  }
  /* a broadleaf tree: trunk + branches (bark) and a crown of leaf cards whose light comes from the crown's
     centre outwards, so the foliage shades softly like a real canopy */
  function broadleafGeometry(r) {
    const bark = [], leaves = [];
    const h = 3.0 + r() * 1.2;
    bark.push(at(new THREE.CylinderGeometry(0.13, 0.26, h, 9), 0, h / 2, 0));
    for (let b = 0; b < 4; b++) {
      const a = b / 4 * Math.PI * 2 + r(), tilt = 0.55 + r() * 0.35, len = 1.3 + r() * 0.8;
      bark.push(at(new THREE.CylinderGeometry(0.05, 0.1, len, 6), Math.cos(a) * Math.sin(tilt) * len / 2, h - 0.4 + Math.cos(tilt) * len / 2, Math.sin(a) * Math.sin(tilt) * len / 2, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt));
    }
    const cy = h + 1.1, rx = 2.1 + r() * 0.6, ryy = 1.5 + r() * 0.4, card = new THREE.PlaneGeometry(1.7, 1.7);
    const centre = new THREE.Vector3(0, cy, 0);
    for (let k = 0; k < 34; k++) {
      const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = Math.pow(r(), 0.5);
      const g = at(card, Math.cos(u) * Math.sin(v) * rx * d, cy + Math.cos(v) * ryy * d, Math.sin(u) * Math.sin(v) * rx * d, r() * 6.28, r() * 6.28, r() * 6.28);
      const p = g.attributes.position, n = g.attributes.normal, tmp = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { tmp.set(p.getX(i), p.getY(i), p.getZ(i)).sub(centre).normalize(); n.setXYZ(i, tmp.x, tmp.y * 1.2 + 0.2, tmp.z); }
      leaves.push(g);
    }
    return { bark: mergeColored(bark.map((g) => [g, 0x5a4636])), leaves: mergeColored(leaves.map((g) => [g, 0xffffff])) };
  }
  /* a coconut palm: a gently curved ringed trunk and a crown of arching fronds */
  function palmGeometry(r) {
    const bark = [], leaves = [];
    const h = 6 + r() * 2.5, lean = (r() - 0.5) * 1.4, segs = 8;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      const x0 = lean * t0 * t0, x1 = lean * t1 * t1, y0 = h * t0, y1 = h * t1, len = Math.hypot(x1 - x0, y1 - y0);
      bark.push(at(new THREE.CylinderGeometry(0.15 - t1 * 0.04, 0.17 - t0 * 0.04, len, 8), (x0 + x1) / 2, (y0 + y1) / 2, 0, 0, 0, -Math.atan2(x1 - x0, y1 - y0)));
    }
    const top = new THREE.Vector3(lean, h, 0);
    for (let f = 0; f < 13; f++) {
      const a = f / 13 * Math.PI * 2 + r() * 0.3, len = 3.2 + r() * 0.8, droop = 0.5 + r() * 0.6;
      const g = new THREE.PlaneGeometry(1.1, len, 1, 8); g.translate(0, len / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = y / len; p.setXYZ(i, p.getX(i), y * Math.cos(t * droop), -y * Math.sin(t * droop) * 1.6); }
      g.computeVertexNormals();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.55, a, 0, 'YXZ'));
      g.applyMatrix4(M4().compose(top, q, new THREE.Vector3(1, 1, 1)));
      const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setY(i, Math.abs(n.getY(i)) + 0.3);
      leaves.push(g);
    }
    return { bark: mergeColored(bark.map((g) => [g, 0x7a6a55])), leaves: mergeColored(leaves.map((g) => [g, 0xffffff])) };
  }
  /* forest(parent, spots): spots = [[x, z, scale, kind]] with kind 'palm' or 'tree'.
     Three variants of each kind; every variant is two InstancedMeshes (bark, leaves). */
  function forest(parent, spots) {
    const r = rng(41);
    const barkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const make = (kind, seed) => {
      const tex = leafTexture(seed, kind === 'palm');
      const leafMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.82, vertexColors: true });
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.45 });
      return { geo: kind === 'palm' ? palmGeometry(r) : broadleafGeometry(r), leafMat, depth, list: [] };
    };
    const kinds = { tree: [make('tree', 3), make('tree', 5), make('tree', 8)], palm: [make('palm', 11), make('palm', 13), make('palm', 19)] };
    spots.forEach(([x, z, s, kind], i) => kinds[kind === 'palm' ? 'palm' : 'tree'][i % 3].list.push([x, z, s]));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    Object.values(kinds).flat().forEach((k) => {
      if (!k.list.length) return;
      const bark = new THREE.InstancedMesh(k.geo.bark, barkMat, k.list.length);
      const leaves = new THREE.InstancedMesh(k.geo.leaves, k.leafMat, k.list.length);
      leaves.customDepthMaterial = k.depth;           /* shadows follow the leaf shapes, not the square cards */
      k.list.forEach(([x, z, s], i) => {
        q.setFromAxisAngle(up, (i * 2.399) % 6.283); sc.setScalar(s); v.set(x, 0, z);
        m.compose(v, q, sc); bark.setMatrixAt(i, m); leaves.setMatrixAt(i, m);
      });
      bark.frustumCulled = leaves.frustumCulled = false;
      parent.add(bark); parent.add(leaves);
    });
  }

  /* ---------- city ---------- */
  /* A city around the venue: a grid of blocks with streets between them. Most lots get low-rise
     buildings (3–10 storeys), some get towers (more of them near the centre), and some are small parks.
     Every building is in one mesh (one draw): facades lit by the sun by day, windows glowing at night.
     o: { cx, cz, rMin, rMax, block, unit (metres per unit), avoid(x, z), seed }
     Returns tree spots ([x, z, scale, kind]) for the parks and the streets, to pass to forest(). */
  function city(parent, o) {
    const r = rng(o.seed || 77), B = o.block || 70, mPer = o.unit || 1.5;
    const road = 12 / mPer;                                      /* a 12 m street, in units */
    const storey = 3.3 / mPer;                                   /* one floor, in units */
    const pos = [], uv = [], col = [], idx = [], trees = [];
    const box = (x, z, w, d, h, ry) => {
      const tint = V.TINTS[Math.floor(r() * V.TINTS.length)], u0 = Math.floor(r() * 8) / 8;
      const c = Math.cos(ry), s = Math.sin(ry);
      const P = (lx, y, lz) => [x + lx * c - lz * s, y, z + lx * s + lz * c];
      /* the window picture has 32 rows (one per floor) and 12 columns (about 3.5 m each) */
      const hw = w / 2, hd = d / 2, Vt = h / storey / 32, U = (len) => len * mPer / 42;
      const quad = (a, b, cc, dd, u, v, t) => {
        const k = pos.length / 3; pos.push(...a, ...b, ...cc, ...dd);
        uv.push(u0, 0, u0 + u, 0, u0 + u, v, u0, v);
        for (let i = 0; i < 4; i++) col.push(...t);
        idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
      };
      quad(P(-hw, 0, hd), P(hw, 0, hd), P(hw, h, hd), P(-hw, h, hd), U(w), Vt, tint);
      quad(P(hw, 0, -hd), P(-hw, 0, -hd), P(-hw, h, -hd), P(hw, h, -hd), U(w), Vt, tint);
      quad(P(hw, 0, hd), P(hw, 0, -hd), P(hw, h, -hd), P(hw, h, hd), U(d), Vt, tint);
      quad(P(-hw, 0, -hd), P(-hw, 0, hd), P(-hw, h, hd), P(-hw, h, -hd), U(d), Vt, tint);
      const roof = tint.map((t) => t * 0.62);
      quad(P(-hw, h, hd), P(hw, h, hd), P(hw, h, -hd), P(-hw, h, -hd), 0.01, 0.01, roof);
    };
    const n = Math.ceil(o.rMax / B);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const bx = o.cx + i * B, bz = o.cz + j * B, dist = Math.hypot(bx - o.cx, bz - o.cz);
        if (dist < o.rMin || dist > o.rMax || (o.avoid && o.avoid(bx, bz))) continue;
        const inner = B - road, near = 1 - (dist - o.rMin) / (o.rMax - o.rMin);
        /* trees along the street on two sides of the block */
        for (let t = -inner / 2; t < inner / 2; t += 14 / mPer) { if (r() > 0.45) trees.push([bx + t, bz + inner / 2 + road * 0.3, 0.8 + r() * 0.4, r() > 0.75 ? 'palm' : 'tree']); }
        if (r() < 0.07) {                                          /* a small park */
          for (let k = 0; k < 6; k++) trees.push([bx + (r() - 0.5) * inner, bz + (r() - 0.5) * inner, 0.9 + r() * 0.6, r() > 0.6 ? 'palm' : 'tree']);
          continue;
        }
        const nx = 2 + Math.floor(r() * 2), nz = 2 + Math.floor(r() * 2), lw = inner / nx, ld = inner / nz;
        for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
          const lx = bx - inner / 2 + lw * (a + 0.5), lz = bz - inner / 2 + ld * (b + 0.5);
          const tower = r() < 0.04 + near * 0.12;
          const floors = tower ? 18 + Math.floor(Math.pow(r(), 1.5) * 42) : 2 + Math.floor(Math.pow(r(), 1.8) * 9);
          const fw = lw * (tower ? 0.6 : 0.78 + r() * 0.15), fd = ld * (tower ? 0.6 : 0.78 + r() * 0.15);
          box(lx, lz, fw, fd, floors * storey, (r() - 0.5) * 0.04);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: V.windowsTexture(true), emissiveMap: V.windowsTexture(false), emissive: 0xffffff, emissiveIntensity: 1.3,
      vertexColors: true, roughness: 0.5, metalness: 0.2,
    }));
    mesh.userData.cityWindows = true; mesh.userData.noCast = true;
    parent.add(mesh);
    return trees;
  }

  /* An organic lake outline: a straight edge on the west (the promenade), wobbly elsewhere.
     o: { x1, z1, x2, z2 } the lake's box. Returns a flat ground mesh using the given material. */
  function lake(parent, mat, o) {
    const pts = [], cz = (o.z1 + o.z2) / 2, hx = (o.x2 - o.x1) / 2, hz = (o.z2 - o.z1) / 2;
    pts.push([o.x1, o.z2], [o.x1, o.z1]);                          /* the straight promenade edge */
    for (let k = 1; k < 60; k++) {                                 /* a smooth, gently bulging shoreline */
      const a = -Math.PI / 2 + Math.PI * k / 60, w = 0.88 + 0.08 * Math.sin(k * 0.31) + 0.04 * Math.sin(k * 0.83 + 1);
      pts.push([o.x1 + Math.cos(a) * hx * 2 * w, cz + Math.sin(a) * hz * Math.min(1, w + 0.1)]);
    }
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(sh, 4); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(worldUV(geo), mat); m.position.y = 0.1; m.userData.noCast = true; parent.add(m);
    return m;
  }

  Object.assign(V, { city, lake, linearize, linColor, loadDaySky, sun, shadows, groundMaterial, worldUV, groundPlane, groundDisc, waterMaterial, mergeColored, people, forest });
})(window.V3D = window.V3D || {});
