/* Open Air Colombo — shared 3D venue scene.
   Builds the Lotus Tower (orange petals) with a festival party area
   (stage, crowd, sweeping lights) in front of it.
   Requires THREE (r128) on the global scope.
   Usage: window.buildLotusScene(containerEl, { onActivate, immersive, autoRotate }) */
(function () {
  function buildLotusScene(container, opts) {
    opts = opts || {};
    if (typeof THREE === 'undefined' || !container) return null;
    var immersive = !!opts.immersive;

    var W = function () { return container.clientWidth || 800; };
    var H = function () { return container.clientHeight || 560; };

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a1f20, 46, 130);

    var camera = new THREE.PerspectiveCamera(immersive ? 40 : 34, W() / H(), 0.1, 400);

    // Phones run the same scene, just cheaper: MSAA off and a lower pixel-ratio
    // ceiling. Fragment cost scales with the square of the ratio, so 3x on a modern
    // handset would be ~4x the work of 1.5x for a decorative model at this size.
    var small = window.matchMedia('(max-width: 900px)').matches;
    var renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5));
    renderer.setSize(W(), H());
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
    container.appendChild(renderer.domElement);

    var spin = new THREE.Group(); scene.add(spin);
    var world = new THREE.Group(); world.position.y = -9; spin.add(world);

    /* ---------- lighting ---------- */
    scene.add(new THREE.AmbientLight(0x2c544e, 1.0));
    var key = new THREE.DirectionalLight(0xffe9c4, 1.15); key.position.set(9, 22, 16); scene.add(key);
    var rim = new THREE.DirectionalLight(0x7fe3c0, 0.5); rim.position.set(-13, 8, -12); scene.add(rim);
    var budGlow = new THREE.PointLight(0xf4a93a, 1.7, 80); budGlow.position.set(0, 17, 5); scene.add(budGlow);
    var budGlow2 = new THREE.PointLight(0xe07b30, 0.9, 60); budGlow2.position.set(0, 14, -4); scene.add(budGlow2);
    var stageGlow = new THREE.PointLight(0xef9a4e, 1.3, 60); stageGlow.position.set(0, 6, 12); scene.add(stageGlow);

    /* ---------- materials ---------- */
    var matShaft  = new THREE.MeshStandardMaterial({ color: 0xeef3f0, roughness: 0.5, metalness: 0.18 });
    var matBase   = new THREE.MeshStandardMaterial({ color: 0xc9d6cf, roughness: 0.72, metalness: 0.1 });
    var matPetal  = new THREE.MeshStandardMaterial({ color: 0xe8902c, emissive: 0xc4571a, emissiveIntensity: 0.5, roughness: 0.34, metalness: 0.2, side: THREE.DoubleSide });
    var matPetalIn= new THREE.MeshStandardMaterial({ color: 0xf6b54e, emissive: 0xe8902c, emissiveIntensity: 0.72, roughness: 0.3, metalness: 0.22, side: THREE.DoubleSide });
    var matGold   = new THREE.MeshStandardMaterial({ color: 0xedae42, emissive: 0xedae42, emissiveIntensity: 0.6, roughness: 0.28, metalness: 0.6 });

    /* ================= LOTUS TOWER ================= */
    var tower = new THREE.Group(); world.add(tower);

    function tier(y, h, rt, rb) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 44), matBase); m.position.y = y + h / 2; tower.add(m); }
    tier(0, 1.2, 4.2, 5.3); tier(1.2, 0.8, 3.4, 4.2); tier(2.0, 0.6, 2.1, 3.4);

    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.95, 9.4, 56), matShaft);
    shaft.position.y = 2.6 + 9.4 / 2; tower.add(shaft);
    for (var r = 0; r < 18; r++) {
      var ra = r / 18 * Math.PI * 2;
      var rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 9.4, 0.12), matShaft);
      rib.position.set(Math.cos(ra) * 1.62, 2.6 + 9.4 / 2, Math.sin(ra) * 1.62); rib.rotation.y = -ra; tower.add(rib);
    }
    var collar = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 1.3, 0.7, 56), matShaft);
    collar.position.y = 12.0; tower.add(collar);

    var profRaw = [[0.2, 12.0], [1.7, 12.6], [2.6, 13.8], [3.1, 15.0], [2.9, 16.3], [2.2, 17.6], [1.35, 18.8], [0.55, 19.9], [0.05, 20.6]];
    var prof = profRaw.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
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

    /* ================= PARTY AREA (in front of the tower) ================= */
    var party = new THREE.Group(); world.add(party);
    var bobbers = []; var beams = [];

    /* grounds */
    var ground = new THREE.Mesh(new THREE.CircleGeometry(44, 64), new THREE.MeshStandardMaterial({ color: 0x0d2628, roughness: 0.95, metalness: 0.05 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.0; party.add(ground);
    var floor = new THREE.Mesh(new THREE.CircleGeometry(12.5, 48), new THREE.MeshStandardMaterial({ color: 0x281a14, emissive: 0xe8902c, emissiveIntensity: 0.22, roughness: 0.6, metalness: 0.3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.02, 17); party.add(floor);
    var floorRing = new THREE.Mesh(new THREE.RingGeometry(12.4, 13.2, 64), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xedae42, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    floorRing.rotation.x = -Math.PI / 2; floorRing.position.set(0, 0.03, 17); party.add(floorRing);

    /* stage */
    var matStage = new THREE.MeshStandardMaterial({ color: 0x14292b, roughness: 0.7, metalness: 0.2 });
    var stage = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 3.6), matStage); stage.position.set(0, 0.6, 8); party.add(stage);
    var stageEdge = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.18, 3.8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe07b30, emissiveIntensity: 0.7 }));
    stageEdge.position.set(0, 1.22, 8); party.add(stageEdge);
    var booth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, 1.4), matStage); booth.position.set(0, 1.85, 8.4); party.add(booth);
    var boothFace = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.0, 0.12), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xf4a93a, emissiveIntensity: 0.8 }));
    boothFace.position.set(0, 1.9, 7.72); party.add(boothFace);

    /* speaker stacks */
    function speaker(x) {
      var g = new THREE.Group();
      var mat = new THREE.MeshStandardMaterial({ color: 0x10211f, roughness: 0.85, metalness: 0.1 });
      for (var i = 0; i < 3; i++) { var b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.6), mat); b.position.y = 1.3 + i * 1.32; g.add(b); }
      g.position.set(x, 0, 8); party.add(g);
    }
    speaker(-8.6); speaker(8.6);

    /* truss + light bar over the stage */
    var matTruss = new THREE.MeshStandardMaterial({ color: 0x223a3a, roughness: 0.6, metalness: 0.5 });
    function post(x) { var p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 9.2, 10), matTruss); p.position.set(x, 4.6, 8); party.add(p); }
    post(-8); post(8);
    var bar = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.4, 0.4), matTruss); bar.position.set(0, 9.0, 8); party.add(bar);

    /* sweeping light beams */
    var beamColors = [0xf4a93a, 0x5dcaa5, 0xedae42, 0xe8902c, 0x7fb8ff, 0xf4a93a];
    for (var bI = 0; bI < 6; bI++) {
      var bx = -6 + bI * 2.4;
      var pivot = new THREE.Group(); pivot.position.set(bx, 8.9, 8);
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.7, 11, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: beamColors[bI], transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      cone.position.y = -5.5;            /* hang downward from the pivot */
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: beamColors[bI] }));
      pivot.add(cone); pivot.add(head);
      pivot.rotation.x = 0.5;            /* angle out toward the crowd */
      party.add(pivot);
      beams.push({ pivot: pivot, phase: bI * 0.7, swing: 0.35 + (bI % 3) * 0.08 });
    }

    /* crowd */
    var crowdColors = [0xf4a93a, 0x5dcaa5, 0xedae42, 0xffffff, 0x7fb8ff, 0xff8a5d, 0x7fe3c0, 0x7fe3c0];
    var bodyGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.95, 8);
    var headGeo = new THREE.SphereGeometry(0.17, 10, 10);
    var headMat = new THREE.MeshStandardMaterial({ color: 0x2b2226, roughness: 0.9 });
    for (var c = 0; c < 90; c++) {
      var ang = Math.random() * Math.PI * 2;
      var rad = 2.4 + Math.random() * 10.4;
      var px2 = Math.sin(ang) * rad;
      var pz2 = 17 - Math.cos(ang) * rad * 0.92;
      if (pz2 < 11) pz2 = 11 + Math.random() * 2;      /* keep crowd off the stage */
      var person = new THREE.Group();
      var bmat = new THREE.MeshStandardMaterial({ color: crowdColors[(Math.random() * crowdColors.length) | 0], emissive: 0x120a10, roughness: 0.7, metalness: 0.1 });
      var body = new THREE.Mesh(bodyGeo, bmat); body.position.y = 0.5; person.add(body);
      var head = new THREE.Mesh(headGeo, headMat); head.position.y = 1.12; person.add(head);
      var s = 0.85 + Math.random() * 0.5; person.scale.setScalar(s);
      person.position.set(px2, 0, pz2);
      person.rotation.y = Math.atan2(0 - px2, 8 - pz2);  /* face the stage */
      party.add(person);
      bobbers.push({ obj: person, base: 0, phase: Math.random() * Math.PI * 2, amp: 0.12 + Math.random() * 0.16, spd: 4 + Math.random() * 3 });
    }

    /* embers */
    var N = 140, arr = new Float32Array(N * 3);
    for (var e = 0; e < N; e++) { arr[e * 3] = (Math.random() - 0.5) * 50; arr[e * 3 + 1] = Math.random() * 30; arr[e * 3 + 2] = (Math.random() - 0.5) * 50 + 6; }
    var sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    var sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xf6c878, size: 0.2, transparent: true, opacity: 0.5, depthWrite: false }));
    world.add(sparks);

    /* ---------- camera framing ---------- */
    function frame() {
      var asp = W() / H(); camera.aspect = asp;
      var fitH = immersive ? 15.5 : 14.5;
      var dist = fitH / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      if (asp < 1) dist /= asp;
      camera.position.set(0, 6.5, dist);
      camera.lookAt(0, 1.8, 3);
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    }
    if ('ResizeObserver' in window) { new ResizeObserver(frame).observe(container); }
    else { window.addEventListener('resize', frame); }
    frame();

    /* ---------- interaction ---------- */
    var auto = opts.autoRotate !== false;
    var dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0, moved = 0, vel = 0, idleT, rotY = 0.0, rotX = 0.06;
    var el = renderer.domElement;
    function gx(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
    function gy(e) { return e.touches ? e.touches[0].clientY : e.clientY; }
    function down(e) { dragging = true; auto = false; clearTimeout(idleT); lastX = downX = gx(e); lastY = downY = gy(e); downT = Date.now(); moved = 0; container.style.cursor = 'grabbing'; }
    function move(e) {
      if (!dragging) return;
      var cx = gx(e), cy = gy(e), dx = cx - lastX, dy = cy - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      rotY += dx * 0.008; rotX += dy * 0.005; rotX = Math.max(-0.4, Math.min(0.5, rotX));
      vel = dx * 0.008; lastX = cx; lastY = cy;
      if (e.cancelable && e.touches) e.preventDefault();
    }
    function up(e) {
      if (!dragging) return; dragging = false; container.style.cursor = 'grab';
      var dist = Math.abs(gx(e || {}) - downX) + Math.abs(gy(e || {}) - downY);
      if (moved < 8 && dist < 8 && (Date.now() - downT) < 450 && typeof opts.onActivate === 'function') { opts.onActivate(); }
      clearTimeout(idleT); idleT = setTimeout(function () { auto = opts.autoRotate !== false; }, 4500);
    }
    el.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: true }); el.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);

    /* ---------- render loop ---------- */
    var t0 = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      var ts = now * 0.001;
      if (auto) { var target = Math.sin(now * 0.00017) * 0.5; rotY += (target - rotY) * Math.min(1, dt * 1.4); rotX += (0.06 - rotX) * Math.min(1, dt * 1.4); }
      else { rotY += vel; vel *= 0.92; if (Math.abs(vel) < 0.0002) vel = 0; }
      spin.rotation.y = rotY; spin.rotation.x = rotX;

      budGlow.intensity = 1.45 + Math.sin(ts * 1.5) * 0.35;
      stageGlow.intensity = 1.1 + Math.abs(Math.sin(ts * 3.0)) * 0.6;
      floor.material.emissiveIntensity = 0.18 + Math.abs(Math.sin(ts * 2.2)) * 0.22;

      for (var i = 0; i < beams.length; i++) {
        var bm = beams[i];
        bm.pivot.rotation.z = Math.sin(ts * 1.3 + bm.phase) * bm.swing;
        bm.pivot.rotation.x = 0.5 + Math.sin(ts * 0.9 + bm.phase) * 0.18;
      }
      for (var j = 0; j < bobbers.length; j++) {
        var bo = bobbers[j];
        bo.obj.position.y = Math.abs(Math.sin(ts * bo.spd + bo.phase)) * bo.amp;
      }
      sparks.rotation.y = now * 0.00003;
      var pa = sparks.geometry.attributes.position;
      for (var k = 1; k < pa.array.length; k += 3) { pa.array[k] += dt * 0.5; if (pa.array[k] > 30) pa.array[k] = 0; }
      pa.needsUpdate = true;

      renderer.render(scene, camera);
      if (running) requestAnimationFrame(loop);
    }

    // The loop used to run at 60fps forever — including while the canvas was
    // several screens away or the tab was in the background. Render only when the
    // scene is actually on screen and the tab is visible.
    var running = false;
    var onScreen = true;
    var pump = function () {
      var want = onScreen && !document.hidden;
      if (want === running) return;
      running = want;
      if (running) requestAnimationFrame(loop);
    };
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        pump();
      }, { rootMargin: '200px' }).observe(container);
    }
    document.addEventListener('visibilitychange', pump);
    pump();

    return { scene: scene, camera: camera, renderer: renderer };
  }

  window.buildLotusScene = buildLotusScene;
})();
