/* Anjunadeep Open Air Colombo — full venue walkthrough scene.
   Builds the Lotus Tower + entire festival grounds from the site plan:
   stage, backstage, artist rooms, VIP platforms, 360 bar, FOH, vendor stalls,
   checkpoints, entrance walkway, gates, parking, ambulances, fire truck,
   washrooms, lake. Two camera modes: orbit + first-person walk.
   Requires THREE (r128). Usage: window.buildVenueWalkthrough(el, {onPOI}) */
(function () {
  function buildVenueWalkthrough(container, opts) {
    opts = opts || {};
    if (typeof THREE === 'undefined' || !container) return null;
    var W = function () { return container.clientWidth || 800; };
    var H = function () { return container.clientHeight || 560; };

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a1f20, 60, 190);
    var camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 500);
    var small = window.matchMedia('(max-width: 900px)').matches;
    var renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
    renderer.setSize(W(), H());
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
    container.appendChild(renderer.domElement);

    var world = new THREE.Group(); scene.add(world);

    /* ---------- lighting (same palette as lotus-scene) ---------- */
    scene.add(new THREE.AmbientLight(0x2c544e, 1.05));
    var key = new THREE.DirectionalLight(0xffe9c4, 1.1); key.position.set(30, 60, 40); scene.add(key);
    var rim = new THREE.DirectionalLight(0x7fe3c0, 0.45); rim.position.set(-40, 25, -30); scene.add(rim);
    var budGlow = new THREE.PointLight(0xf4a93a, 1.7, 120); budGlow.position.set(0, 17, -30); scene.add(budGlow);
    var stageGlow = new THREE.PointLight(0xef9a4e, 1.4, 70); stageGlow.position.set(0, 7, -18); scene.add(stageGlow);
    var barGlow = new THREE.PointLight(0xe8902c, 1.0, 40); barGlow.position.set(0, 4, -2); scene.add(barGlow);

    /* ---------- materials ---------- */
    function std(c, o) { var m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.15 }, o || {})); return m; }
    var matShaft = std(0xeef3f0, { roughness: 0.5, metalness: 0.18 });
    var matBase = std(0xc9d6cf, { roughness: 0.72, metalness: 0.1 });
    var matPetal = std(0xe8902c, { emissive: 0xc4571a, emissiveIntensity: 0.5, roughness: 0.34, metalness: 0.2, side: THREE.DoubleSide });
    var matPetalIn = std(0xf6b54e, { emissive: 0xe8902c, emissiveIntensity: 0.72, roughness: 0.3, metalness: 0.22, side: THREE.DoubleSide });
    var matGold = std(0xedae42, { emissive: 0xedae42, emissiveIntensity: 0.6, roughness: 0.28, metalness: 0.6 });
    var matDark = std(0x14292b, { roughness: 0.7, metalness: 0.2 });
    var matTruss = std(0x223a3a, { roughness: 0.6, metalness: 0.5 });
    var matFence = std(0x1c3a3a, { roughness: 0.6, metalness: 0.4 });
    var matCream = std(0xf3e4c2, { roughness: 0.6 });
    var matBrown = std(0x9a5b23, { emissive: 0x5a3010, emissiveIntensity: 0.25 });
    var matPurple = std(0x1c4a44, { emissive: 0x0e2a26, emissiveIntensity: 0.3 });
    var matCyan = std(0xedae42, { emissive: 0xc4571a, emissiveIntensity: 0.55 });

    function box(mat, w, h, d, x, y, z, ry, parent) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z); if (ry) m.rotation.y = ry; (parent || world).add(m); return m;
    }
    /* canvas text sign plane */
    function sign(text, w, h, bg, fg, x, y, z, ry, parent, glow) {
      var res = 96, cw = Math.max(2, Math.round(w * res)), ch = Math.round(h * res);
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var cx = cv.getContext('2d');
      cx.fillStyle = bg; cx.fillRect(0, 0, cw, ch);
      cx.fillStyle = fg; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      var fs = ch * 0.44;
      cx.font = '700 ' + fs + 'px -apple-system,Segoe UI,sans-serif';
      while (cx.measureText(text).width > cw * 0.88 && fs > 8) { fs *= 0.92; cx.font = '700 ' + fs + 'px -apple-system,Segoe UI,sans-serif'; }
      cx.fillText(text, cw / 2, ch / 2 + fs * 0.04);
      var tx = new THREE.CanvasTexture(cv);
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tx, transparent: false }));
      m.position.set(x, y, z); if (ry) m.rotation.y = ry; (parent || world).add(m); return m;
    }
    /* floating label sprite (always faces camera) */
    function label(text, x, y, z) {
      var cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      var cx = cv.getContext('2d');
      cx.fillStyle = 'rgba(10,31,32,.78)';
      var tw; cx.font = '700 54px -apple-system,Segoe UI,sans-serif'; tw = cx.measureText(text).width;
      var bx = (512 - tw) / 2 - 26;
      cx.beginPath();
      if (cx.roundRect) cx.roundRect(bx, 18, tw + 52, 92, 46); else cx.rect(bx, 18, tw + 52, 92);
      cx.fill();
      cx.strokeStyle = 'rgba(237,174,66,.8)'; cx.lineWidth = 3; cx.stroke();
      cx.fillStyle = '#eafaf1'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(text, 256, 66);
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
      sp.scale.set(9, 2.25, 1); sp.position.set(x, y, z); world.add(sp); return sp;
    }

    /* ================= GROUNDS ================= */
    box(std(0x0d2628, { roughness: 0.95 }), 130, 0.2, 130, -8, -0.1, 0);       /* base ground */
    box(std(0x0b2123, { roughness: 0.9 }), 36, 0.24, 46, 0, -0.08, -2);        /* festival floor */
    var floorRing = new THREE.Mesh(new THREE.RingGeometry(11.6, 12.3, 64),
      std(0x000000, { emissive: 0xedae42, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    floorRing.rotation.x = -Math.PI / 2; floorRing.position.set(0, 0.1, -8); world.add(floorRing);

    /* lake (east) */
    var lake = new THREE.Mesh(new THREE.PlaneGeometry(46, 130),
      std(0x123f40, { roughness: 0.28, metalness: 0.5, emissive: 0x0b2c2c, emissiveIntensity: 0.35 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(43, 0.02, 0); world.add(lake);
    box(std(0x8a7a5a, { roughness: 0.9 }), 1.6, 0.5, 130, 20, 0.25, 0);        /* boardwalk edge */

    /* road (west) */
    box(std(0x181d1e, { roughness: 0.95 }), 6, 0.06, 130, -44, 0.03, 0);
    for (var rd = -60; rd < 62; rd += 6) box(std(0xcfd8d2, { emissive: 0x9aa8a0, emissiveIntensity: 0.2 }), 0.3, 0.07, 2.4, -44, 0.07, rd);

    /* ================= LOTUS TOWER (north) ================= */
    var tower = new THREE.Group(); tower.position.set(0, 0, -34); world.add(tower);
    function tier(y, h, rt, rb) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 44), matBase); m.position.y = y + h / 2; tower.add(m); }
    tier(0, 1.2, 4.2, 5.3); tier(1.2, 0.8, 3.4, 4.2); tier(2.0, 0.6, 2.1, 3.4);
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.95, 9.4, 56), matShaft);
    shaft.position.y = 2.6 + 4.7; tower.add(shaft);
    for (var r = 0; r < 18; r++) {
      var ra = r / 18 * Math.PI * 2;
      var rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 9.4, 0.12), matShaft);
      rib.position.set(Math.cos(ra) * 1.62, 7.3, Math.sin(ra) * 1.62); rib.rotation.y = -ra; tower.add(rib);
    }
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 1.3, 0.7, 56), matShaft); collar.position.y = 12.0; tower.add(collar);
    var prof = [[0.2, 12.0], [1.7, 12.6], [2.6, 13.8], [3.1, 15.0], [2.9, 16.3], [2.2, 17.6], [1.35, 18.8], [0.55, 19.9], [0.05, 20.6]]
      .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    tower.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 56), matPetalIn));
    function petalGeo(len, wid, cup, bow) {
      var g = new THREE.PlaneGeometry(wid, len, 8, 16); var p = g.attributes.position;
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), y = p.getY(i);
        var v = Math.min(0.999, Math.max(0.001, (y + len / 2) / len));
        var u = x / (wid / 2);
        var wf = Math.pow(Math.sin(Math.PI * v), 0.62);
        var nz = -cup * (1 - u * u) * wf + bow * Math.sin(Math.PI * v);
        p.setXYZ(i, u * (wid / 2) * wf, v * len, nz);
      }
      g.computeVertexNormals(); return g;
    }
    function petalRing(count, len, wid, cup, bow, baseY, baseR, tilt, mat, phase) {
      for (var i = 0; i < count; i++) {
        var a = phase + i / count * Math.PI * 2;
        var mesh = new THREE.Mesh(petalGeo(len, wid, cup, bow), mat);
        mesh.position.z = baseR; mesh.rotation.x = tilt;
        var pivot = new THREE.Group(); pivot.position.y = baseY; pivot.rotation.y = a; pivot.add(mesh); tower.add(pivot);
      }
    }
    petalRing(8, 7.6, 3.3, 0.85, 0.55, 12.4, 1.45, 0.58, matPetal, 0);
    petalRing(8, 7.0, 2.8, 0.95, 0.62, 13.0, 1.05, 0.34, matPetal, Math.PI / 8);
    petalRing(7, 6.4, 2.3, 1.0, 0.68, 13.7, 0.65, 0.16, matPetalIn, 0.4);
    petalRing(6, 5.6, 1.8, 1.0, 0.74, 14.5, 0.36, 0.05, matPetalIn, 0.9);
    var finial = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 1.2, 18), matGold); finial.position.y = 20.7; tower.add(finial);
    var orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), matGold); orb.position.y = 21.4; tower.add(orb);
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 3.2, 12), matGold); mast.position.y = 23.1; tower.add(mast);

    /* ================= BACK OF HOUSE ================= */
    /* artist rooms row (green/editing/security/team) */
    var roomNames = ['GREEN ROOM', 'EDITING', 'SECURITY', 'TEAM ROOM'];
    for (var rn = 0; rn < 4; rn++) {
      var rx = 8 + rn * 3.1;
      box(std(0x1c4a44, { emissive: 0x0e2a26, emissiveIntensity: 0.25 }), 2.7, 2.2, 2.4, rx, 1.1, -31);
      sign(roomNames[rn], 2.5, 0.6, '#14332f', '#aef3d4', rx, 1.7, -29.75, 0);
    }
    /* artist room */
    box(std(0x1c4a44, { emissive: 0x0e2a26, emissiveIntensity: 0.25 }), 4.4, 2.4, 2.6, 0, 1.2, -28.6);
    sign('ARTIST ROOM', 4, 0.7, '#14332f', '#aef3d4', 0, 1.9, -27.25, 0);
    /* artist entrance kiosk (west) */
    box(matBrown, 2.2, 3.2, 1.2, -13, 1.6, -28);
    sign('ENTRANCE', 2, 0.6, '#9a5b23', '#fff3df', -13, 2.4, -27.35, 0);
    /* backstage */
    box(std(0xc4571a, { emissive: 0x6e2c0a, emissiveIntensity: 0.3 }), 13, 1.6, 2.4, 0, 0.8, -25.4);
    sign('BACKSTAGE', 6, 0.9, '#c4571a', '#fdf0dc', 0, 1.1, -24.15, 0);

    /* ================= STAGE ================= */
    var stageZ = -21;
    box(matDark, 18, 1.2, 4.6, 0, 0.6, stageZ);
    var stageEdge = box(std(0x000000, { emissive: 0xe07b30, emissiveIntensity: 0.7 }), 18.2, 0.18, 4.8, 0, 1.22, stageZ);
    box(matDark, 3.4, 1.3, 1.4, 0, 1.85, stageZ + 0.5);
    var boothFace = box(std(0x000000, { emissive: 0xf4a93a, emissiveIntensity: 0.8 }), 3.5, 1.0, 0.12, 0, 1.9, stageZ + 1.22);
    function speaker(x) {
      var mat = std(0x10211f, { roughness: 0.85 });
      for (var i = 0; i < 3; i++) box(mat, 1.8, 1.3, 1.6, x, 1.3 + i * 1.32, stageZ);
    }
    speaker(-9.6); speaker(9.6);
    function post(x) { var p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9.2, 10), matTruss); p.position.set(x, 4.6, stageZ); world.add(p); }
    post(-9); post(9);
    box(matTruss, 18.6, 0.4, 0.4, 0, 9.0, stageZ);
    var beams = [], beamColors = [0xf4a93a, 0x5dcaa5, 0xedae42, 0xe8902c, 0x7fb8ff, 0xf4a93a];
    for (var bI = 0; bI < 6; bI++) {
      var pivot = new THREE.Group(); pivot.position.set(-7 + bI * 2.8, 8.9, stageZ);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 12, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: beamColors[bI], transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      cone.position.y = -6;
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: beamColors[bI] }));
      pivot.add(cone); pivot.add(head); pivot.rotation.x = 0.5; world.add(pivot);
      beams.push({ pivot: pivot, phase: bI * 0.7, swing: 0.35 + (bI % 3) * 0.08 });
    }

    /* ================= VIP PLATFORMS ================= */
    function vip(x, ry, nm) {
      var g = new THREE.Group(); g.position.set(x, 0, -11); g.rotation.y = ry; world.add(g);
      box(matDark, 12.4, 0.9, 3.2, 0, 0.45, 0, 0, g);
      box(matCream, 12, 0.24, 2.8, 0, 1.0, 0, 0, g);
      for (var i = 0; i <= 6; i++) {                      /* railing */
        var p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 8), matTruss);
        p.position.set(-6 + i * 2, 1.6, -1.4); g.add(p);
        var p2 = p.clone(); p2.position.z = 1.4; g.add(p2);
      }
      box(matTruss, 12.2, 0.08, 0.08, 0, 2.1, -1.4, 0, g);
      box(matTruss, 12.2, 0.08, 0.08, 0, 2.1, 1.4, 0, g);
      sign('VIP PLATFORM', 5, 0.7, '#f3e4c2', '#5a3c10', 0, 1.9, 0, 0, g);
    }
    vip(-10.5, 0.6); vip(10.5, -0.6);

    /* ================= 360 BAR ================= */
    var barG = new THREE.Group(); barG.position.set(0, 0, -1); world.add(barG);
    var barRing = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.15, 40, 1, true),
      std(0xe8902c, { emissive: 0xc4571a, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
    barRing.position.y = 0.58; barG.add(barRing);
    var barTop = new THREE.Mesh(new THREE.RingGeometry(2.55, 3.3, 40), std(0xf6b54e, { emissive: 0xe8902c, emissiveIntensity: 0.4, side: THREE.DoubleSide }));
    barTop.rotation.x = -Math.PI / 2; barTop.position.y = 1.16; barG.add(barTop);
    var backbar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 20), matDark); backbar.position.y = 1.3; barG.add(backbar);
    var barSign = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.5, 20),
      std(0x000000, { emissive: 0xf4a93a, emissiveIntensity: 0.9 })); barSign.position.y = 2.85; barG.add(barSign);
    sign('360 BAR', 2.6, 0.55, '#e8902c', '#231106', 0, 2.85, 1.28, 0, barG);
    sign('360 BAR', 2.6, 0.55, '#e8902c', '#231106', 0, 2.85, -1.28, Math.PI, barG);

    /* ================= FOH ================= */
    var fohG = new THREE.Group(); fohG.position.set(0, 0, 8); world.add(fohG);
    box(matDark, 4.6, 0.7, 3, 0, 0.35, 0, 0, fohG);
    box(std(0x1c4a44, { emissive: 0x0e2a26, emissiveIntensity: 0.3 }), 4.2, 1.1, 2.6, 0, 1.25, 0, 0, fohG);
    sign('FOH', 2, 0.7, '#14332f', '#edae42', 0, 1.35, 1.33, 0, fohG);
    for (var fb = 0; fb < 4; fb++) {                       /* barrier square */
      var seg = box(matFence, 6.4, 0.5, 0.1, 0, 0.55, 0, 0, fohG);
      seg.rotation.y = fb * Math.PI / 2;
      seg.position.set(Math.sin(fb * Math.PI / 2) * 3.2, 0.55, Math.cos(fb * Math.PI / 2) * 3.2);
    }

    /* ================= VENDOR STALLS (east row) ================= */
    var stalls = [
      ['RED BULL', '#14332f', '#f2c76a'], ['JUICE', '#b0762c', '#231106'], ['FOOD', '#c4571a', '#fdf0dc'],
      ['BEER', '#7a5420', '#f0dfb4'], ['BAR', '#e8902c', '#231106'], ['WATER', '#1c4a44', '#aef3d4'],
      ['MEDICAL HELP', '#7a2d22', '#fdf0dc'], ['HELP DESK', '#14332f', '#aef3d4']
    ];
    for (var st = 0; st < stalls.length; st++) {
      var sz = -3 + st * 2.6, sx = 17;
      box(matDark, 2.2, 1.9, 2.2, sx, 0.95, sz);
      box(std(0x223a3a), 2.5, 0.15, 2.5, sx, 2.0, sz);
      sign(stalls[st][0], 2.1, 0.55, stalls[st][1], stalls[st][2], sx - 1.12, 1.45, sz, -Math.PI / 2);
    }
    sign('TAP A STALL TO SEE ITS NAME', 7, 0.7, '#14332f', '#edae42', 15.6, 3.3, 3.5, -Math.PI / 2);

    /* ================= SOUTH FENCE + WASHROOMS ================= */
    function fenceRun(x1, z1, x2, z2) {
      var dx = x2 - x1, dz = z2 - z1, len = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.round(len / 2));
      var ang = Math.atan2(dx, dz);
      for (var i = 0; i <= n; i++) {
        var p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), matFence);
        p.position.set(x1 + dx * i / n, 0.65, z1 + dz * i / n); world.add(p);
      }
      var rail = box(matFence, 0.1, 0.08, len, x1 + dx / 2, 1.2, z1 + dz / 2);
      rail.rotation.y = ang;
      var rail2 = rail.clone(); rail2.position.y = 0.6; world.add(rail2);
    }
    fenceRun(-18, 20, -1, 20); fenceRun(1, 20, 18, 20);     /* south fence w/ 8ft gap */
    fenceRun(-18, -33, -18, -2); fenceRun(-18, 10, -18, 20); /* west perimeter w/ checkpoint gap */
    fenceRun(18, -33, 18, -10); fenceRun(18.6, -10, 18.6, 20); /* east perimeter, full lakeside cover */
    fenceRun(-18, -33, 6, -33); fenceRun(10, -33, 18, -33);

    box(std(0x1c4a44, { emissive: 0x0e2a26, emissiveIntensity: 0.3 }), 5, 2.2, 2.4, 3, 1.1, 24);
    box(std(0xb0762c, { emissive: 0x5e3a12, emissiveIntensity: 0.3 }), 5, 2.2, 2.4, 8.2, 1.1, 24);
    sign('WASHROOM AREA', 7, 0.8, '#14332f', '#f2c76a', 5.6, 2.75, 24, Math.PI);
    sign('M', 1, 0.8, '#1c4a44', '#aef3d4', 3, 1.2, 22.75, Math.PI);
    sign('W', 1, 0.8, '#b0762c', '#fdf0dc', 8.2, 1.2, 22.75, Math.PI);

    /* ================= ENTRANCE / CHECKPOINTS / GATES ================= */
    /* cyan festival-entrance walkway: gate01 -> east -> north -> checkpoints */
    function walkSeg(w, d, x, z) { box(matCyan, w, 0.1, d, x, 0.06, z); }
    walkSeg(12, 2.2, -33, 26);                             /* gate 02 → east */
    walkSeg(2.2, 25.4, -27, 14.4);                         /* bend 1: north */
    walkSeg(6, 2.2, -24.5, 3);                             /* bend 2: into checkpoints */
    /* festival entrance arch over the walkway */
    box(matTruss, 0.22, 3.4, 0.22, -34, 1.7, 24.4);
    box(matTruss, 0.22, 3.4, 0.22, -34, 1.7, 27.6);
    box(matTruss, 0.3, 0.3, 3.6, -34, 3.4, 26);
    sign('FESTIVAL ENTRANCE', 3.4, 0.7, '#edae42', '#231106', -34.16, 2.85, 26, -Math.PI / 2);

    /* checkpoints: 2 purple booths + crossed barriers */
    function checkpoint(z) {
      var g = new THREE.Group(); g.position.set(-20, 0, z); world.add(g);
      box(matPurple, 1.4, 2.6, 3.4, 0, 1.3, 0, 0, g);
      sign('CHECK POINT', 3, 0.55, '#14332f', '#edae42', 0, 2.15, 0, Math.PI / 2, g);
      for (var i = 0; i < 3; i++) {
        var xx = 1.8 + i * 1.4;
        var b1 = box(matTruss, 0.12, 1.5, 0.12, xx, 0.75, -0.8, 0, g); b1.rotation.z = 0.5;
        var b2 = box(matTruss, 0.12, 1.5, 0.12, xx, 0.75, -0.8, 0, g); b2.rotation.z = -0.5;
        var b3 = b1.clone(); b3.position.z = 0.8; g.add(b3);
        var b4 = b2.clone(); b4.position.z = 0.8; g.add(b4);
      }
    }
    checkpoint(1); checkpoint(6);

    /* gates + exit */
    function gate(z, nm) {
      box(matBrown, 0.6, 3.4, 0.6, -39, 1.7, z - 2.2); box(matBrown, 0.6, 3.4, 0.6, -39, 1.7, z + 2.2);
      box(matBrown, 0.5, 0.6, 5.2, -39, 3.5, z);
      sign(nm, 3.4, 0.7, '#9a5b23', '#fff3df', -38.7, 3.5, z, Math.PI / 2);
    }
    gate(8, 'GATE 01'); gate(26, 'GATE 02');

    /* ticket & merch stalls between gate 01 and gate 02 */
    var tixStalls = ['INVITATION', 'AT GATE', 'ONLINE TIX', 'VIP', 'MERCH'];
    for (var ln = 0; ln < tixStalls.length; ln++) {
      var lz = 10.5 + ln * 2.6;
      box(matDark, 2.2, 1.9, 2.2, -35.5, 0.95, lz);
      box(std(0x223a3a), 2.5, 0.15, 2.5, -35.5, 2.0, lz);
      sign(tixStalls[ln], 2.1, 0.55, '#9a5b23', '#fdf0dc', -34.38, 1.45, lz, Math.PI / 2);
    }
    sign('TAP A STALL TO SEE ITS NAME', 7, 0.7, '#14332f', '#edae42', -34.1, 3.3, 15.7, Math.PI / 2);

    /* ================= VEHICLES ================= */
    function car(x, z, c) {
      var g = new THREE.Group(); g.position.set(x, 0, z); world.add(g);
      box(std(c, { roughness: 0.4, metalness: 0.5 }), 2.6, 0.6, 1.3, 0, 0.5, 0, 0, g);
      box(std(c, { roughness: 0.4, metalness: 0.5 }), 1.4, 0.5, 1.15, -0.1, 1.0, 0, 0, g);
      for (var wi = 0; wi < 4; wi++) {
        var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12), std(0x111516));
        wh.rotation.x = Math.PI / 2; wh.position.set(wi < 2 ? -0.85 : 0.85, 0.26, wi % 2 ? 0.62 : -0.62); g.add(wh);
      }
      return g;
    }
    /* ambulances (x3) */
    function ambulance(x) {
      var g = new THREE.Group(); g.position.set(x, 0, 24); g.rotation.y = Math.PI / 2; world.add(g);
      box(std(0xf2f4f0, { roughness: 0.5 }), 3.4, 1.5, 1.7, 0, 0.95, 0, 0, g);
      box(std(0xf2f4f0, { roughness: 0.5 }), 1.1, 1.1, 1.6, 2.0, 0.75, 0, 0, g);
      box(std(0xb83a28, { emissive: 0x5a170c, emissiveIntensity: 0.25 }), 3.5, 0.3, 1.72, 0, 1.0, 0, 0, g);
      box(std(0xb83a28, { emissive: 0xb83a28, emissiveIntensity: 0.6 }), 0.5, 0.2, 0.5, 0, 1.8, 0, 0, g);
      sign('AMBULANCE', 2.6, 0.5, '#f2f4f0', '#b83a28', 0, 1.45, 0.87, 0, g);
      for (var wi = 0; wi < 4; wi++) {
        var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), std(0x111516));
        wh.rotation.x = Math.PI / 2; wh.position.set(wi < 2 ? -1.1 : 1.4, 0.32, wi % 2 ? 0.82 : -0.82); g.add(wh);
      }
    }
    ambulance(-15); ambulance(-11); ambulance(-7);
    /* ambulance bay canopy */
    (function () {
      var g = new THREE.Group(); g.position.set(-11, 0, 24); world.add(g);
      for (var i = 0; i < 4; i++) {
        var p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 10), matTruss);
        p.position.set(i < 2 ? -5.4 : 5.4, 1.3, i % 2 ? -1.6 : 1.6); g.add(p);
      }
      box(std(0xf2f4f0, { roughness: 0.6 }), 11.6, 0.14, 3.8, 0, 2.66, 0, 0, g);
      box(std(0xb83a28, { emissive: 0x5a170c, emissiveIntensity: 0.35 }), 11.6, 0.28, 0.16, 0, 2.5, 1.92, 0, g);
      sign('AMBULANCE BAY', 5, 0.6, '#f2f4f0', '#b83a28', 0, 2.1, 1.94, 0, g);
    })();

    /* fire truck (NW) */
    var ft = new THREE.Group(); ft.position.set(-24, 0, -22); ft.rotation.y = 0.3; world.add(ft);
    box(std(0xb83a28, { emissive: 0x5a170c, emissiveIntensity: 0.25, roughness: 0.4, metalness: 0.3 }), 5.2, 1.7, 2.0, 0, 1.05, 0, 0, ft);
    box(std(0xb83a28, { emissive: 0x5a170c, emissiveIntensity: 0.25 }), 1.4, 1.3, 1.9, 3.0, 0.85, 0, 0, ft);
    var ladder = box(std(0xcfd8d2, { metalness: 0.6, roughness: 0.35 }), 4.6, 0.16, 0.5, -0.4, 2.1, 0, 0, ft); ladder.rotation.z = 0.1;
    box(std(0xffd23e, { emissive: 0xffd23e, emissiveIntensity: 0.7 }), 0.5, 0.2, 0.5, 3.0, 1.6, 0, 0, ft);
    sign('FIRE TRUCK', 3, 0.55, '#b83a28', '#f4e9e2', 0, 1.05, 1.02, 0, ft);
    for (var fw = 0; fw < 6; fw++) {
      var wh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12), std(0x111516));
      wh2.rotation.x = Math.PI / 2; wh2.position.set(-1.8 + fw % 3 * 1.8 + (fw < 3 ? 0 : 0), 0.36, fw < 3 ? -0.95 : 0.95);
      wh2.position.x = -1.8 + (fw % 3) * 2.2; ft.add(wh2);
    }

    /* ================= CROWD + EMBERS ================= */
    var bobbers = [];
    var crowdColors = [0xf4a93a, 0x5dcaa5, 0xedae42, 0xffffff, 0x7fb8ff, 0xff8a5d, 0x7fe3c0];
    var bodyGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.95, 8);
    var headGeo = new THREE.SphereGeometry(0.17, 10, 10);
    var headMat = std(0x2b2226, { roughness: 0.9 });
    for (var c = 0; c < 110; c++) {
      var px = (Math.random() - 0.5) * 26;
      var pz = -16 + Math.random() * 20;
      if (Math.abs(px) < 4.5 && pz > -5.5 && pz < 3.5) continue;      /* keep off the bar */
      if (Math.hypot(px - (-10.5), pz - (-11)) < 7.2) continue;       /* keep off VIP west */
      if (Math.hypot(px - 10.5, pz - (-11)) < 7.2) continue;          /* keep off VIP east */
      if (Math.hypot(px, pz - 8) < 4.2) continue;                     /* keep off FOH */
      var person = new THREE.Group();
      var bmat = std(crowdColors[(Math.random() * crowdColors.length) | 0], { emissive: 0x120a10, roughness: 0.7 });
      var body = new THREE.Mesh(bodyGeo, bmat); body.position.y = 0.5; person.add(body);
      var head = new THREE.Mesh(headGeo, headMat); head.position.y = 1.12; person.add(head);
      person.scale.setScalar(0.85 + Math.random() * 0.5);
      person.position.set(px, 0, pz);
      person.rotation.y = Math.atan2(0 - px, stageZ - pz) + Math.PI;
      world.add(person);
      bobbers.push({ obj: person, phase: Math.random() * Math.PI * 2, amp: 0.12 + Math.random() * 0.16, spd: 4 + Math.random() * 3 });
    }
    var N = 160, arr = new Float32Array(N * 3);
    for (var e = 0; e < N; e++) { arr[e * 3] = (Math.random() - 0.5) * 70 - 5; arr[e * 3 + 1] = Math.random() * 30; arr[e * 3 + 2] = (Math.random() - 0.5) * 70; }
    var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    var sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf6c878, size: 0.2, transparent: true, opacity: 0.5, depthWrite: false }));
    world.add(sparks);

    /* ================= POIs ================= */
    var pois = [
      { id: 'stage', name: 'Main Stage', dims: '98 ft frontage', x: 0, z: -19, r: 8, desc: 'The heart of the night — full production stage facing the Lotus Tower floor, flanked by speaker stacks and a moving-light truss.' },
      { id: 'backstage', name: 'Backstage', dims: 'Crew & artists only', x: 0, z: -25, r: 4, desc: 'Restricted area directly behind the main stage, connecting to the artist room and production suites.' },
      { id: 'vipw', name: 'VIP Platform · West', dims: '50 ft × 10 ft', x: -10.5, z: -11, r: 6, desc: 'Raised viewing deck angled at the stage, with dedicated water, food, beer and bar service points.' },
      { id: 'vipe', name: 'VIP Platform · East', dims: '50 ft × 10 ft', x: 10.5, z: -11, r: 6, desc: 'Raised viewing deck angled at the stage, with dedicated water, food, beer and bar service points.' },
      { id: 'bar', name: '360 Bar', dims: 'Centre of the floor', x: 0, z: -1, r: 5.5, desc: 'A fully circular bar in the middle of the dancefloor — service on all sides so nobody queues with their back to the stage.' },
      { id: 'foh', name: 'FOH', dims: 'Front of house', x: 0, z: 8, r: 5, desc: 'Sound and lighting control riser, barricaded on all four sides. Best-mixed spot on the floor is right beside it.' },
      { id: 'stallrow', name: 'Food & Drink Stalls', dims: 'Red Bull · Juice · Food · Beer · Bar · Water', x: 17, z: 3.5, r: 7, desc: 'Vendor row along the lakeside edge of the floor — energy drinks, juice, food, beer, bar and free water.' },
      { id: 'medical', name: 'Medical & Help Desk', dims: 'First aid · Lost + found', x: 17, z: 14, r: 4, desc: 'On-site medics and the help desk at the south end of the vendor row. Three ambulances on standby by the exit.' },
      { id: 'wash', name: 'Washroom Area', dims: '40 ft + 40 ft blocks', x: 5.6, z: 24, r: 6.5, desc: 'Two washroom blocks just south of the floor, through the 8 ft fence gap.' },
      { id: 'checkpoint', name: 'Check Points', dims: '2 lanes · 6 scanners', x: -20, z: 3.5, r: 6, desc: 'Ticket scan and security search lanes. Invitation, at-gate, online-tix, VIP and merch queues feed in from the gates.' },
      { id: 'walkway', name: 'Festival Entrance', dims: '120 ft walkway', x: -27, z: 16, r: 6, desc: 'The lit entrance walkway — straight in from Gate 02, two bends to the checkpoints.' },
      { id: 'tix', name: 'Ticket & Merch Stalls', dims: 'Invitation · At gate · Online · VIP · Merch', x: -35.5, z: 15.5, r: 6, desc: 'Ticket lanes and merch booths between Gate 01 and Gate 02 — sort your wristband before the checkpoints.' },
      { id: 'gate1', name: 'Gate 01', dims: 'Main entry gate', x: -38, z: 8, r: 5, desc: 'Primary entry from Lotus Road. Ticket queues start here.' },
      { id: 'gate2', name: 'Gate 02', dims: 'Entry & exit gate', x: -38, z: 26, r: 5, desc: 'Second gate onto Lotus Road, connected straight to the festival entrance walkway, next to the ambulance bay.' },
      { id: 'ambu', name: 'Ambulance Bay', dims: '3 units · covered bay', x: -11, z: 24, r: 5.5, desc: 'Three ambulances under a covered standby bay between Gate 02 and the washrooms, with a clear run to the exit.' },
      { id: 'fire', name: 'Fire Truck', dims: 'On standby', x: -24, z: -22, r: 5, desc: 'Dedicated fire tender positioned northwest of the floor with a clear run to the stage and tower.' },
      { id: 'tower', name: 'Lotus Tower', dims: '350 m — South Asia\u2019s tallest', x: 0, z: -34, r: 9, desc: 'Sri Lanka\u2019s iconic lotus-bud tower, lit in festival orange, rising directly behind the stage.' },
      { id: 'lake', name: 'Beira Lake', dims: '387 ft shoreline', x: 20, z: 4, r: 5, desc: 'The venue sits on the Beira Lake waterfront — the whole east edge of the floor opens onto the water.' }
    ];
    /* per-stall POIs — tap any stall to see its name */
    var vendorDescs = {
      'RED BULL': 'Energy drink stall on the vendor row.', 'JUICE': 'Fresh juice stall on the vendor row.',
      'FOOD': 'Food stall on the vendor row.', 'BEER': 'Beer stall on the vendor row.',
      'BAR': 'Bar service point on the vendor row.', 'WATER': 'Free water point on the vendor row.',
      'MEDICAL HELP': 'First-aid point at the south end of the vendor row.', 'HELP DESK': 'Help desk and lost + found.'
    };
    stalls.forEach(function (s, i) {
      pois.push({ id: 'stall' + i, name: s[0], dims: 'Vendor stall', x: 17, z: -3 + i * 2.6, r: 1.3, small: true, desc: vendorDescs[s[0]] || 'Vendor stall.' });
    });
    tixStalls.forEach(function (nm, i) {
      pois.push({ id: 'tix' + i, name: nm, dims: 'Ticket & merch counter', x: -35.5, z: 10.5 + i * 2.6, r: 1.3, small: true, desc: 'The ' + nm.toLowerCase() + ' counter between Gate 01 and Gate 02.' });
    });
    /* markers + labels */
    var markerMat = new THREE.MeshBasicMaterial({ color: 0xedae42, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    pois.forEach(function (p) {
      var mk = new THREE.Mesh(new THREE.RingGeometry(p.small ? 0.3 : 0.55, p.small ? 0.42 : 0.75, 28), markerMat);
      mk.rotation.x = -Math.PI / 2; mk.position.set(p.x, 0.14, p.z); world.add(mk);
      p.marker = mk;
      p.label = label(p.name, p.x, p.id === 'tower' ? 25 : 3.6, p.z);
      p.labelScale = { x: p.label.scale.x, y: p.label.scale.y };
    });
    function updateLabels() {
      for (var i = 0; i < pois.length; i++) {
        var p = pois[i], L = p.label;
        /* sprites only in orbit mode; walk mode relies on the info card */
        if (mode !== 'orbit' || p !== activePOI) { L.visible = false; continue; }
        L.visible = true;
        L.material.opacity = 1; L.scale.set(p.labelScale.x, p.labelScale.y, 1);
      }
    }

    /* ---------- camera state ---------- */
    var mode = 'orbit';
    var rotY = 0, rotX = 0.42, dist = 62, vel = 0, auto = true;
    var walk = { x: -33, z: 26, yaw: Math.PI / 2, pitch: 0 };   /* spawn on entrance walkway at gate 02 */
    var keys = {}, joy = { x: 0, y: 0 };
    var activePOI = null;

    /* ---------- walk-mode collision ---------- */
    var colCircles = [
      { x: 0, z: -34, r: 6.0 },   /* tower */
      { x: 0, z: -1, r: 3.8 },    /* 360 bar */
      { x: 0, z: 8, r: 3.7 },     /* FOH */
      { x: -20, z: 1, r: 1.9 }, { x: -20, z: 6, r: 1.9 },   /* checkpoint booths */
      { x: -15, z: 24, r: 2.1 }, { x: -11, z: 24, r: 2.1 }, { x: -7, z: 24, r: 2.1 }, /* ambulances */
      { x: -24, z: -22, r: 3.2 }, /* fire truck */
      { x: -13, z: -28, r: 1.6 }  /* artist entrance kiosk */
    ];
    var colRects = [
      { x1: -10, z1: -23.8, x2: 10, z2: -18.2 },   /* stage + speakers */
      { x1: -7.5, z1: -32.6, x2: 16, z2: -24 },    /* backstage + rooms */
      { x1: 15.2, z1: -4.6, x2: 18.6, z2: 15.6 },  /* vendor stalls */
      { x1: -36.7, z1: 9.3, x2: -34.3, z2: 22.1 }, /* ticket & merch stalls */
      { x1: 0.2, z1: 22.6, x2: 11, z2: 25.4 },     /* washrooms */
      { x1: -18.3, z1: 19.7, x2: -0.9, z2: 20.3 }, /* south fence W */
      { x1: 0.9, z1: 19.7, x2: 18.3, z2: 20.3 },   /* south fence E */
      { x1: -18.3, z1: -33, x2: -17.7, z2: -2 },   /* west fence N */
      { x1: -18.3, z1: 10, x2: -17.7, z2: 20 },    /* west fence S */
      { x1: 17.7, z1: -33, x2: 18.3, z2: -10 },    /* east fence N */
      { x1: 18.3, z1: -10, x2: 18.9, z2: 20 }      /* east fence lakeside */
    ];
    var vipSegs = [-10.5, 10.5].map(function (cx) {
      var ry = cx < 0 ? 0.6 : -0.6;
      return { ax: cx - Math.cos(ry) * 6.2, az: -11 + Math.sin(ry) * 6.2, bx: cx + Math.cos(ry) * 6.2, bz: -11 - Math.sin(ry) * 6.2, r: 2.2 };
    });
    function collide() {
      var i, c, pad = 0.5;
      for (i = 0; i < colCircles.length; i++) {
        c = colCircles[i];
        var dx = walk.x - c.x, dz = walk.z - c.z, d = Math.hypot(dx, dz), min = c.r + pad;
        if (d < min && d > 0.001) { walk.x = c.x + dx / d * min; walk.z = c.z + dz / d * min; }
      }
      for (i = 0; i < colRects.length; i++) {
        c = colRects[i];
        if (walk.x > c.x1 - pad && walk.x < c.x2 + pad && walk.z > c.z1 - pad && walk.z < c.z2 + pad) {
          var pushes = [
            { v: (c.x1 - pad) - walk.x, ax: 'x' }, { v: (c.x2 + pad) - walk.x, ax: 'x' },
            { v: (c.z1 - pad) - walk.z, ax: 'z' }, { v: (c.z2 + pad) - walk.z, ax: 'z' }
          ].sort(function (a, b) { return Math.abs(a.v) - Math.abs(b.v); })[0];
          walk[pushes.ax] += pushes.v;
        }
      }
      for (i = 0; i < vipSegs.length; i++) {
        c = vipSegs[i];
        var abx = c.bx - c.ax, abz = c.bz - c.az, len2 = abx * abx + abz * abz;
        var t = Math.max(0, Math.min(1, ((walk.x - c.ax) * abx + (walk.z - c.az) * abz) / len2));
        var px2 = c.ax + abx * t, pz2 = c.az + abz * t;
        var dx2 = walk.x - px2, dz2 = walk.z - pz2, d2 = Math.hypot(dx2, dz2), min2 = c.r + pad;
        if (d2 < min2 && d2 > 0.001) { walk.x = px2 + dx2 / d2 * min2; walk.z = pz2 + dz2 / d2 * min2; }
      }
    }

    function applyOrbit() {
      var ty = 2.5;
      camera.position.set(Math.sin(rotY) * Math.cos(rotX) * dist, Math.sin(rotX) * dist + ty, Math.cos(rotY) * Math.cos(rotX) * dist - 6);
      camera.lookAt(0, ty, -6);
    }
    function applyWalk() {
      camera.position.set(walk.x, 1.65, walk.z);
      var lx = walk.x + Math.sin(walk.yaw) * Math.cos(walk.pitch);
      var lz = walk.z + Math.cos(walk.yaw) * Math.cos(walk.pitch);
      camera.lookAt(lx, 1.65 + Math.sin(walk.pitch), lz);
    }

    /* ---------- input ---------- */
    var dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0, moved = 0, idleT;
    var el = renderer.domElement;
    function gx(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
    function gy(e) { return e.touches ? e.touches[0].clientY : e.clientY; }
    function down(e) { dragging = true; auto = false; clearTimeout(idleT); lastX = downX = gx(e); lastY = downY = gy(e); downT = Date.now(); moved = 0; container.style.cursor = 'grabbing'; }
    function move(e) {
      if (!dragging) return;
      var cx = gx(e), cy = gy(e), dx = cx - lastX, dy = cy - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (mode === 'orbit') {
        rotY -= dx * 0.006; rotX += dy * 0.004; rotX = Math.max(0.08, Math.min(1.2, rotX)); vel = -dx * 0.006;
      } else {
        walk.yaw -= dx * 0.005; walk.pitch -= dy * 0.004;
        walk.pitch = Math.max(-0.9, Math.min(0.9, walk.pitch));
      }
      lastX = cx; lastY = cy;
      if (e.cancelable && e.touches) e.preventDefault();
    }
    var ray = new THREE.Raycaster(), mouseV = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function up(e) {
      if (!dragging) return; dragging = false; container.style.cursor = 'grab';
      if (moved < 8 && (Date.now() - downT) < 500) {
        var rect = el.getBoundingClientRect();
        var px = ((e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - rect.left) / rect.width * 2 - 1;
        var py = -(((e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - rect.top) / rect.height) * 2 + 1;
        mouseV.set(px, py); ray.setFromCamera(mouseV, camera);
        var hit = new THREE.Vector3();
        if (ray.ray.intersectPlane(groundPlane, hit)) {
          var best = null, bd = 1e9;
          pois.forEach(function (p) {
            var d = Math.hypot(hit.x - p.x, hit.z - p.z);
            if (d < Math.max(p.r, p.small ? 1.6 : 4) && d < bd) { bd = d; best = p; }
          });
          setActive(best);
        }
      }
      clearTimeout(idleT); idleT = setTimeout(function () { if (mode === 'orbit') auto = true; }, 5000);
    }
    el.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: true }); el.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
    el.addEventListener('wheel', function (e) { if (mode !== 'orbit') return; e.preventDefault(); dist = Math.max(18, Math.min(95, dist + e.deltaY * 0.05)); }, { passive: false });
    window.addEventListener('keydown', function (e) { keys[e.key.toLowerCase()] = true; if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(e.key.toLowerCase()) >= 0) e.preventDefault(); });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

    function setActive(p) {
      if (activePOI === p) return;
      activePOI = p;
      if (typeof opts.onPOI === 'function') opts.onPOI(p);
    }

    /* ---------- resize ---------- */
    function frame() { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); }
    if ('ResizeObserver' in window) new ResizeObserver(frame).observe(container); else window.addEventListener('resize', frame);
    frame();

    /* ---------- loop ---------- */
    var t0 = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      var ts = now * 0.001;
      if (mode === 'orbit') {
        if (auto) rotY += dt * 0.06;
        else { rotY += vel; vel *= 0.92; if (Math.abs(vel) < 0.0002) vel = 0; }
        applyOrbit();
      } else {
        var f = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0) + joy.y;
        var s = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0) + joy.x;
        f = Math.max(-1, Math.min(1, f)); s = Math.max(-1, Math.min(1, s));
        var sp = (keys['shift'] ? 13 : 8) * dt;
        walk.x += (Math.sin(walk.yaw) * f + Math.sin(walk.yaw - Math.PI / 2) * s) * sp;
        walk.z += (Math.cos(walk.yaw) * f + Math.cos(walk.yaw - Math.PI / 2) * s) * sp;
        walk.x = Math.max(-41, Math.min(19.4, walk.x));
        walk.z = Math.max(-31.5, Math.min(28, walk.z));
        collide();
        /* proximity POI */
        var best = null, bd = 1e9;
        pois.forEach(function (p) {
          var d = Math.hypot(walk.x - p.x, walk.z - p.z);
          if (d < p.r && d < bd) { bd = d; best = p; }
        });
        setActive(best);
        applyWalk();
      }

      budGlow.intensity = 1.45 + Math.sin(ts * 1.5) * 0.35;
      stageGlow.intensity = 1.1 + Math.abs(Math.sin(ts * 3.0)) * 0.6;
      boothFace.material.emissiveIntensity = 0.6 + Math.abs(Math.sin(ts * 2.4)) * 0.5;
      markerMat.opacity = 0.35 + Math.abs(Math.sin(ts * 1.8)) * 0.35;
      updateLabels();
      for (var i = 0; i < beams.length; i++) {
        var bm = beams[i];
        bm.pivot.rotation.z = Math.sin(ts * 1.3 + bm.phase) * bm.swing;
        bm.pivot.rotation.x = 0.5 + Math.sin(ts * 0.9 + bm.phase) * 0.18;
      }
      for (var j = 0; j < bobbers.length; j++) {
        var bo = bobbers[j];
        bo.obj.position.y = Math.abs(Math.sin(ts * bo.spd + bo.phase)) * bo.amp;
      }
      var pa = sparks.geometry.attributes.position;
      for (var k = 1; k < pa.array.length; k += 3) { pa.array[k] += dt * 0.5; if (pa.array[k] > 30) pa.array[k] = 0; }
      pa.needsUpdate = true;

      renderer.render(scene, camera);
      if (running) requestAnimationFrame(loop);
    }
    var running = false, onScreen = true;
    var pump = function () {
      var want = onScreen && !document.hidden;
      if (want === running) return;
      running = want; if (running) requestAnimationFrame(loop);
    };
    if (window.IntersectionObserver) new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; pump(); }, { rootMargin: '200px' }).observe(container);
    document.addEventListener('visibilitychange', pump);
    pump();

    return {
      setMode: function (m) {
        mode = m === 'walk' ? 'walk' : 'orbit';
        auto = mode === 'orbit';
        if (mode === 'walk') setActive(null);
      },
      getMode: function () { return mode; },
      setJoy: function (x, y) { joy.x = x; joy.y = y; },
      goTo: function (id) {
        var p = null; pois.forEach(function (q) { if (q.id === id) p = q; });
        if (!p) return;
        if (mode === 'walk') {
          var a = Math.atan2(walk.x - p.x, walk.z - p.z);
          walk.x = p.x + Math.sin(a) * (p.r + 1.2); walk.z = p.z + Math.cos(a) * (p.r + 1.2);
          collide();
          walk.yaw = Math.atan2(p.x - walk.x, p.z - walk.z);
        }
        setActive(p);
      },
      pois: pois
    };
  }
  window.buildVenueWalkthrough = buildVenueWalkthrough;
})();
