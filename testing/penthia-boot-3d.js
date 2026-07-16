/* ============================================================
   Penthia — penthia-boot-3d.js  (v2: "flying" board + organic apps)
   Scroll-scrubbed homepage boot sequence.

   Behavior:
   - User STARTS the sequence by scrolling; progress is tied to
     scroll position within the pinned hero (scrub), eased so it
     feels smooth and moderately slow (not sluggish).
   - The board FLIES in: it enters high and off-axis, banking and
     tumbling through space, and only SETTLES to vertical as it
     lands (not rigidly upright the whole way down).
   - App tiles enter from scattered positions with randomized
     paths, timing, and spin — organic, not a straight line.
   - Board is built from rounded 3D geometry (thin bezel, camera
     module, metallic gold trim, screen glow, stand). If a real
     model file 'vertex-elite.glb' is present AND GLTFLoader is
     available, it loads that instead for a photoreal board.
   - Gated: holds on frame 0 until the quiz popup is dismissed.
   - Static image fallback if WebGL / libs / reduced-motion.
   ============================================================ */

(function () {
  var mount = document.getElementById('boot-stage');
  var pinWrap = document.getElementById('boot-pin');
  if (!mount || !pinWrap) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasWebGL = (function () {
    try { var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !hasWebGL || reduceMotion) {
    // Fallback: collapse the tall runway to one screen and show a static
    // board anchored inside the hero (not fixed over the whole page).
    pinWrap.style.height = '100vh';
    mount.style.position = 'absolute';
    mount.innerHTML = '<img src="vertexhomepage.png" alt="Penthia Vertex Elite interactive smartboard" style="width:100%;height:100%;object-fit:contain;padding-top:64px;" loading="eager" decoding="async" />';
    return;
  }

  var THREE = window.THREE;
  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // seeded-ish random so the "random" layout is stable per load
  function rand(min, max) { return min + Math.random() * (max - min); }

  var APPS = [
    { key: 'whiteboard', name: 'Whiteboard', color: '#2f6fed' },
    { key: 'youtube',    name: 'YouTube',    color: '#ff0000' },
    { key: 'meet',       name: 'Meet',       color: '#00832d' },
    { key: 'zoom',       name: 'Zoom',       color: '#2d8cff' },
    { key: 'playstore',  name: 'Play Store', color: '#00c4b3' },
    { key: 'chrome',     name: 'Chrome',     color: '#e8410e' },
    { key: 'drive',      name: 'Drive',      color: '#1fa463' },
    { key: 'docs',       name: 'Docs',       color: '#2a67d8' },
    { key: 'slides',     name: 'Slides',     color: '#f4b400' }
  ];

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  mount.appendChild(renderer.domElement);

  // ---- Studio environment (PMREM) ----
  // A tiny procedural "photo studio" — softbox planes around the origin —
  // baked into an environment map. This is what makes the metal, glass and
  // gold actually REFLECT like a product shot instead of flat plastic.
  (function buildEnv() {
    try {
      var envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x05070c);
      function panel(w, h, color, x, y, z, ry, rx) {
        var m = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide })
        );
        m.position.set(x, y, z);
        if (ry) m.rotation.y = ry;
        if (rx) m.rotation.x = rx;
        envScene.add(m);
      }
      panel(14, 9, 0xffffff, -8, 5, 6, Math.PI / 4, 0);        // big key softbox, upper-left front
      panel(10, 2.2, 0xc9a84c, 9, 1.5, 4, -Math.PI / 3.2, 0);  // warm gold strip, right
      panel(16, 5, 0x1a2130, 0, -8, 2, 0, Math.PI / 2.6);      // cool floor bounce
      panel(8, 8, 0x55617a, 0, 9, -2, 0, -Math.PI / 2.2);      // soft cool top light
      var pmrem = new THREE.PMREMGenerator(renderer);
      var envRT = pmrem.fromScene(envScene, 0.045);
      scene.environment = envRT.texture;
      pmrem.dispose();
    } catch (e) { /* env optional — lights below still carry the scene */ }
  })();

  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  var keyLight = new THREE.DirectionalLight(0xfff1d4, 1.0); keyLight.position.set(4, 6, 8); scene.add(keyLight);
  var rimLight = new THREE.DirectionalLight(0xc9a84c, 0.55); rimLight.position.set(-6, 2, 5); scene.add(rimLight);
  var fillLight = new THREE.DirectionalLight(0x6f86c9, 0.3); fillLight.position.set(0, -4, 6); scene.add(fillLight);

  // ---- Ambient gold dust ----
  // Alive from the very first frame — even while the quiz gate holds the
  // flight at zero, the hero visibly breathes instead of sitting dead.
  var DUST = 160;
  var dustPos = new Float32Array(DUST * 3);
  for (var di = 0; di < DUST; di++) {
    dustPos[di * 3] = rand(-9, 9);
    dustPos[di * 3 + 1] = rand(-5, 5);
    dustPos[di * 3 + 2] = rand(-6, 2);
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xc9a84c, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false
  }));
  scene.add(dust);

  // ---- Board group ----
  // boardWrap carries gentle idle motion (float / cursor yaw) AFTER landing;
  // board carries the scroll-scrubbed flight. Separating them means the idle
  // life never fights the timeline — no jitter, clean reversals on scroll-up.
  var boardWrap = new THREE.Group();
  scene.add(boardWrap);
  var board = new THREE.Group();
  boardWrap.add(board);

  var W = 6.4, H = 3.6, DEPTH = 0.22;           // 16:9 panel, like the real Vertex
  var BZ = 0.09;                                 // thin side/top bezel
  var BOT = 0.34;                                // deeper bottom chin (speakers/ports)
  var FRONT = DEPTH / 2;                         // z of the front face

  // Rounded-rect shape helper (optionally offset vertically)
  function roundedRectShape(w, h, r, cy) {
    var s = new THREE.Shape();
    var x = -w / 2, y = (cy || 0) - h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  // ---- Photoreal face: the REAL Vertex front, cropped from the product
  // render in the repo (face-off.png = bezel + controls with the screen
  // dark). The live screen content then fades in exactly over the screen
  // opening, so the "wake" survives. Dimensions derived from the photo so
  // the bezel proportions are the true ones.
  var FACE_W = 6.646, FACE_H = 3.947, FACE_OY = -0.052;

  // Back shell: graphite slab behind the photo face
  var shellGeo = new THREE.ExtrudeGeometry(roundedRectShape(FACE_W, FACE_H, 0.1, FACE_OY), {
    depth: DEPTH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3
  });
  shellGeo.translate(0, 0, -DEPTH / 2 - 0.03);
  var bezelMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.45, metalness: 0.5 });
  bezelMat.envMapIntensity = 0.45;
  var bezel = new THREE.Mesh(shellGeo, bezelMat);
  board.add(bezel);

  var faceMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false });
  new THREE.TextureLoader().load('face-off.png', function (tex) {
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    faceMat.map = tex; faceMat.needsUpdate = true;
  });
  var face = new THREE.Mesh(new THREE.PlaneGeometry(FACE_W, FACE_H), faceMat);
  face.position.set(0, FACE_OY, FRONT + 0.02);
  board.add(face);

  // Live screen content (real Vertex home screen) — fades in over the
  // photo's dark screen opening on wake.
  var wallMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false });
  new THREE.TextureLoader().load('screen-elite.jpg', function (tex) {
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    wallMat.map = tex; wallMat.needsUpdate = true;
  }, undefined, function () {
    wallMat.map = makeWallpaper(); wallMat.needsUpdate = true;
  });
  var wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
  wall.position.z = FRONT + 0.028;
  board.add(wall);

  // Glass sheen over the screen: keeps a product-shot glint when lit
  var glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.04, metalness: 0,
    clearcoat: 1.0, clearcoatRoughness: 0.04,
    transparent: true, opacity: 0.05, envMapIntensity: 1.5, depthWrite: false
  });
  var glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glassMat);
  glass.position.z = FRONT + 0.031;
  board.add(glass);

  // ---- Camera bar: integrated rounded module on the top edge ----
  var camGroup = new THREE.Group();
  var camY = FACE_OY + FACE_H / 2 + 0.06;
  var camBarGeo = new THREE.ExtrudeGeometry(roundedRectShape(0.92, 0.2, 0.09, 0), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  camBarGeo.translate(0, 0, -0.07);
  var camModule = new THREE.Mesh(camBarGeo, (function(){var m=new THREE.MeshStandardMaterial({ color: 0x080a0f, roughness: 0.4, metalness: 0.55 });m.envMapIntensity=0.5;return m;})());
  camGroup.add(camModule);
  var lensRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.052, 0.012, 10, 28),
    (function () { var m = new THREE.MeshStandardMaterial({ color: 0x394253, roughness: 0.3, metalness: 0.85 }); m.envMapIntensity = 0.6; return m; })()
  );
  lensRing.position.z = 0.095; camGroup.add(lensRing);
  var lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.045, 24),
    new THREE.MeshPhysicalMaterial({ color: 0x0a1322, roughness: 0.05, metalness: 0.4, clearcoat: 1, envMapIntensity: 2 })
  );
  lens.position.z = 0.096; camGroup.add(lens);
  var led = new THREE.Mesh(
    new THREE.CircleGeometry(0.014, 12),
    new THREE.MeshBasicMaterial({ color: 0x35e08f, toneMapped: false })
  );
  led.position.set(0.3, 0, 0.096); camGroup.add(led);
  camGroup.position.set(0, camY, FRONT - 0.06);
  board.add(camGroup);

  // ---- Mobile stand: brushed columns, cross beam, caster feet ----
  var standMat = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.5, metalness: 0.6 });
  standMat.envMapIntensity = 0.5;
  var standGroup = new THREE.Group();
  var colGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.6, 14);
  var column = new THREE.Mesh(colGeo, standMat);           // left column (name kept)
  column.position.set(-W / 2 + 1.1, FACE_OY - FACE_H / 2 - 0.95, -0.3);
  standGroup.add(column);
  var colR = column.clone(); colR.position.x = W / 2 - 1.1; standGroup.add(colR);
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, W - 2.0, 12), standMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, FACE_OY - FACE_H / 2 - 1.42, -0.3);
  standGroup.add(beam);
  function foot(x) {
    var g = new THREE.Group();
    var bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 1.7), standMat);
    g.add(bar);
    [0.72, -0.72].forEach(function (dz) {
      var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 14),
        new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.55, metalness: 0.4 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, -0.11, dz);
      g.add(wheel);
    });
    g.position.set(x, FACE_OY - FACE_H / 2 - 2.28, -0.3);
    return g;
  }
  var footL = foot(-W / 2 + 1.1); standGroup.add(footL);
  var footR = foot(W / 2 - 1.1); standGroup.add(footR);
  board.add(standGroup);

  // ---- App tiles: organic scatter entry ----
  var iconGroup = new THREE.Group();
  board.add(iconGroup);
  var COLS = 5, ICON = 0.8, GAP_X = 1.16, GAP_Y = 1.2;
  var gridW = (COLS - 1) * GAP_X, startX = -gridW / 2, startY = 0.35;
  var loader = new THREE.TextureLoader();
  var icons = [];

  APPS.forEach(function (app, i) {
    var col = i % COLS, row = Math.floor(i / COLS);
    var tx = startX + col * GAP_X;
    var ty = startY - row * GAP_Y;

    var mat = new THREE.MeshBasicMaterial({ map: makeLetterTile(app.name, app.color), transparent: true, opacity: 0, toneMapped: false });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(ICON, ICON), mat);

    loader.load(app.key + '.png',
      function (tex) { tex.anisotropy = 4; mat.map = tex; mat.needsUpdate = true; },
      undefined, function () {});

    // Random scattered start: anywhere around the board, varied depth
    var ang = rand(0, Math.PI * 2);
    var dist = rand(7, 11);
    mesh.userData.start = {
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist * 0.7 + rand(-1, 3),
      z: rand(-2, 4),
      rot: rand(-Math.PI, Math.PI)
    };
    mesh.userData.target = { x: tx, y: ty, z: 0.2 };
    mesh.position.set(mesh.userData.start.x, mesh.userData.start.y, mesh.userData.start.z);
    mesh.rotation.z = mesh.userData.start.rot;
    iconGroup.add(mesh);
    icons.push(mesh);
  });

  // ---- Initial "flying" state: high, banked, tumbling, small ----
  board.position.set(rand(-1.5, 1.5), 12, rand(-3, -1));
  board.rotation.set(rand(-0.5, -0.2), rand(-0.8, 0.8), rand(-0.4, 0.4));
  board.scale.setScalar(0.7);

  // Landing position composes with the sticky headline (lower-left),
  // so the board settles slightly right-of-center on desktop and
  // higher on small screens instead of colliding with the text.
  var narrow = mount.clientWidth < 760;
  var LAND_X = narrow ? 0 : 1.35;
  var LAND_Y = narrow ? 1.05 : 0.25;
  var LAND_S = narrow ? 0.58 : 1;   // shrink to fit phone viewports

  // ---- One seamless cinematic flow ----
  // A single curved motion path carries the board from entry to touchdown
  // (no waypoint stops), while rotation, scale, screen-wake and the icon
  // shower all overlap inside the same gesture. Times in seconds.
  var FLIGHT = 3.6;
  var tl = gsap.timeline({ paused: true });

  if (window.MotionPathPlugin) {
    gsap.registerPlugin(window.MotionPathPlugin);
    tl.to(board.position, {
      motionPath: {
        path: [
          { x: 0.7,           y: 6.2,          z: 1.4 },
          { x: -0.55,         y: 2.7,          z: -0.5 },
          { x: LAND_X - 0.2,  y: LAND_Y + 0.5, z: 0.28 },
          { x: LAND_X,        y: LAND_Y,       z: 0 }
        ],
        curviness: 1.35
      },
      duration: FLIGHT, ease: 'power2.out'
    }, 0);
  } else {
    // graceful degradation if the plugin ever fails to load
    tl.to(board.position, { x: -0.55, y: 2.7, z: -0.5, duration: FLIGHT * 0.5, ease: 'power2.in' }, 0)
      .to(board.position, { x: LAND_X, y: LAND_Y, z: 0, duration: FLIGHT * 0.5, ease: 'power2.out' }, FLIGHT * 0.5);
  }

  // One continuous decelerating tumble that resolves upright exactly at
  // touchdown, and one continuous scale — no piecewise segments.
  tl.to(board.rotation, { x: 0, y: Math.PI * 2, z: 0, duration: FLIGHT, ease: 'power2.out' }, 0)
    .to(board.scale, { x: LAND_S, y: LAND_S, z: LAND_S, duration: FLIGHT, ease: 'power2.out' }, 0);

  // Screen wakes DURING the final approach — light blooms as it glides in
  tl.to(wallMat, { opacity: 0.94, duration: 1.1, ease: 'power2.inOut' }, FLIGHT - 1.35);

  // Apps start streaming in while the board is still finishing its glide,
  // so landing and population read as one continuous shower.
  var order = icons.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
  order.forEach(function (idx, k) {
    var m = icons[idx];
    var at = (FLIGHT - 1.05) + k * rand(0.09, 0.15);
    tl.to(m.position, { x: m.userData.target.x, y: m.userData.target.y, z: m.userData.target.z, duration: rand(1.0, 1.35), ease: 'power3.out' }, at);
    tl.to(m.rotation, { z: 0, duration: rand(1.0, 1.3), ease: 'power2.out' }, at);
    tl.to(m.material, { opacity: 1, duration: 0.5, ease: 'power2.out' }, at);
  });

  tl.eventCallback('onUpdate', function () { seqProgress = tl.progress(); });

  // ---- Quiz gate + one-time scroll trigger ----
  var unlocked = false, started = false;
  function quizIsOpen() {
    var ov = document.getElementById('quiz-popup-overlay');
    return !!(ov && ov.classList.contains('qp-visible'));
  }
  function startFlight() {
    if (started || !unlocked) return;
    started = true;
    tl.play();
    var hint = document.querySelector('.boot-hint');
    if (hint) { hint.style.transition = 'opacity .5s'; hint.style.opacity = '0'; }
  }
  function unlockNow() {
    if (unlocked) return;
    unlocked = true;
    // If they already scrolled while the quiz was up, launch right away.
    if (window.scrollY > 24) startFlight();
  }
  window.addEventListener('penthia:quiz-closed', unlockNow);
  setTimeout(function () { if (!quizIsOpen()) unlockNow(); }, 1200);

  ['wheel', 'touchmove', 'scroll', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (ev === 'keydown') {
        var k = e.key;
        if (k !== 'ArrowDown' && k !== 'PageDown' && k !== ' ') return;
      }
      startFlight();
    }, { passive: true });
  });

  // ---- Scene handoff without vanishing ----
  // The canvas layer is position:fixed. While the hero runway is on screen
  // the landed board holds its place; once the user scrolls past the runway
  // the whole scene translates up in lockstep with the page, so the board
  // scrolls away like normal content instead of fading out.
  function onScrollSync() {
    var leave = window.scrollY - (pinWrap.offsetHeight - window.innerHeight);
    mount.style.transform = leave > 0 ? 'translate3d(0,' + (-leave) + 'px,0)' : '';
  }
  window.addEventListener('scroll', onScrollSync, { passive: true });
  onScrollSync();

  // ---- Render loop ----
  // Skips all GPU work while the hero is off-screen (scrolled past),
  // and gives the board gentle idle life — a soft float and a subtle
  // yaw toward the cursor — only once it has fully landed.
  var t = 0, seqProgress = 0, targetYaw = 0, heroVisible = true;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(pinWrap);
  }

  window.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    targetYaw = nx * 0.08;
  }, { passive: true });

  function render() {
    requestAnimationFrame(render);
    if (!heroVisible) return; // hero off-screen: zero GPU cost
    t += 0.01;
    dust.rotation.y += 0.0006;
    dust.position.y = Math.sin(t * 0.35) * 0.18;
    if (seqProgress > 0.97) {
      boardWrap.position.y = Math.sin(t) * 0.05;
      boardWrap.rotation.x = Math.sin(t * 0.7) * 0.01;
      boardWrap.rotation.y += (targetYaw - boardWrap.rotation.y) * 0.04;
    } else {
      // ease idle offsets back out if the user scrubs backwards
      boardWrap.position.y *= 0.85;
      boardWrap.rotation.x *= 0.85;
      boardWrap.rotation.y *= 0.85;
    }
    renderer.render(scene, camera);
  }
  render();

  window.addEventListener('resize', onResize);
  function onResize() {
    var w = mount.clientWidth, h = mount.clientHeight;
    camera.aspect = w / h;
    camera.position.z = w < 760 ? 13.5 : (w < 1100 ? 11 : 9.5);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  onResize();

  // ---- Optional: load a real .glb model if provided ----
  if (window.THREE && THREE.GLTFLoader) {
    try {
      var gltf = new THREE.GLTFLoader();
      gltf.load('vertex-elite.glb', function (model) {
        // If a real model loads, hide the built board meshes and use it.
        var real = model.scene;
        real.traverse(function (o) { if (o.isMesh) { o.castShadow = false; } });
        real.scale.setScalar(1);
        // Replace visual meshes but keep the animated `board` group as parent.
        [bezel, face, wall, glass, camGroup, standGroup].forEach(function (m) { m.visible = false; });
        board.add(real);
      }, undefined, function () { /* keep geometry board */ });
    } catch (e) { /* no loader; keep geometry board */ }
  }

  // ---- Texture helpers ----
  function makeLetterTile(label, hex) {
    var s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    var x = c.getContext('2d');
    // soft drop shadow
    x.save();
    x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 26; x.shadowOffsetY = 10;
    // squircle tile with a subtle top-lit gradient of the brand color
    var g = x.createLinearGradient(0, 24, 0, s - 24);
    g.addColorStop(0, shade(hex, 0.22)); g.addColorStop(1, shade(hex, -0.14));
    x.fillStyle = g; rr(x, 24, 24, s - 48, s - 48, 62); x.fill();
    x.restore();
    // glass highlight across the top
    var hl = x.createLinearGradient(0, 24, 0, s / 2);
    hl.addColorStop(0, 'rgba(255,255,255,0.32)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = hl; rr(x, 24, 24, s - 48, (s - 48) / 2, 62); x.fill();
    // glyph
    x.fillStyle = '#fff'; x.font = '800 118px Inter, Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,0.25)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
    x.fillText(label.charAt(0), s / 2, s / 2 + 6);
    var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function ch(v) { v = Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)); return Math.max(0, Math.min(255, v)); }
    return 'rgb(' + ch(r) + ',' + ch(g) + ',' + ch(b) + ')';
  }
  function makeWallpaper() {
    var w = 1024, h = 600, c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#243357'); g.addColorStop(0.55, '#5b6884'); g.addColorStop(1, '#aab2c4');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.font = '600 120px Inter, Arial, sans-serif';
    x.textAlign = 'center'; x.fillText('11:27', w / 2, 180);
    var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
})();
