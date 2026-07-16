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

  // Face outline: extends BZ above/left/right of the screen, BOT below.
  var faceW = W + BZ * 2, faceH = H + BZ + BOT, faceCY = (BZ - BOT) / 2;

  // ---- Back shell: anodized graphite slab behind everything ----
  var shellGeo = new THREE.ExtrudeGeometry(roundedRectShape(faceW, faceH, 0.12, faceCY), {
    depth: DEPTH, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3
  });
  shellGeo.translate(0, 0, -DEPTH / 2 - 0.03);
  var bezelMat = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.42, metalness: 0.55 });
  bezelMat.envMapIntensity = 0.5;
  var bezel = new THREE.Mesh(shellGeo, bezelMat);   // (name kept for GLB-swap list)
  board.add(bezel);

  // ---- Front bezel frame: matte black, machined edge around the glass ----
  var frameShape = roundedRectShape(faceW, faceH, 0.12, faceCY);
  frameShape.holes.push(roundedRectShape(W, H, 0.03, 0));
  var frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  frameGeo.translate(0, 0, FRONT - 0.02);
  var frameMat = new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 0.55, metalness: 0.4 });
  frameMat.envMapIntensity = 0.4;
  var trim = new THREE.Mesh(frameGeo, frameMat);    // main visible bezel (name kept)
  board.add(trim);

  // ---- Gold pinstripe: thin brushed-gold edge around the outer rim ----
  var stripeShape = roundedRectShape(faceW + 0.045, faceH + 0.045, 0.135, faceCY);
  stripeShape.holes.push(roundedRectShape(faceW - 0.01, faceH - 0.01, 0.115, faceCY));
  var stripeGeo = new THREE.ExtrudeGeometry(stripeShape, { depth: 0.055, bevelEnabled: false });
  stripeGeo.translate(0, 0, FRONT - 0.01);
  var goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.28, metalness: 1.0 });
  goldMat.envMapIntensity = 0.8;
  var stripe = new THREE.Mesh(stripeGeo, goldMat);
  board.add(stripe);

  // ---- Screen: off = deep glossy black; on = the REAL Vertex home screen ----
  var screenMat = new THREE.MeshPhysicalMaterial({
    color: 0x03040a, roughness: 0.14, metalness: 0.0,
    clearcoat: 1.0, clearcoatRoughness: 0.14, envMapIntensity: 0.55
  });
  var screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), screenMat);
  screen.position.z = FRONT + 0.028;
  board.add(screen);

  // Real UI texture (extracted from the actual product render). Falls back
  // to the canvas wallpaper if the image is missing.
  var wallMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false });
  new THREE.TextureLoader().load('screen-elite.jpg', function (tex) {
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    wallMat.map = tex; wallMat.needsUpdate = true;
  }, undefined, function () {
    wallMat.map = makeWallpaper(); wallMat.needsUpdate = true;
  });
  var wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
  wall.position.z = FRONT + 0.03;
  board.add(wall);

  // Glass sheen: a barely-there reflective layer OVER the lit screen,
  // so the display keeps a product-shot glint even when powered on.
  var glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.04, metalness: 0,
    clearcoat: 1.0, clearcoatRoughness: 0.04,
    transparent: true, opacity: 0.05, envMapIntensity: 1.6, depthWrite: false
  });
  var glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glassMat);
  glass.position.z = FRONT + 0.032;
  board.add(glass);

  // ---- Bottom chin details: speaker grilles + PENTHIA wordmark ----
  var chinY = -H / 2 - BOT / 2 + 0.02;
  function grilleTexture() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 64;
    var x = c.getContext('2d');
    x.clearRect(0, 0, 512, 64);
    x.fillStyle = 'rgba(210,220,235,0.5)';
    for (var gy = 10; gy < 60; gy += 12) {
      for (var gx = 6; gx < 508; gx += 12) {
        x.beginPath(); x.arc(gx, gy, 2.1, 0, Math.PI * 2); x.fill();
      }
    }
    var t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  var grilleMat = new THREE.MeshBasicMaterial({ map: grilleTexture(), transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false });
  var grilleL = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.16), grilleMat);
  grilleL.position.set(-W / 2 + 0.95, chinY, FRONT + 0.044);
  board.add(grilleL);
  var grilleR = grilleL.clone();
  grilleR.position.x = W / 2 - 0.95;
  board.add(grilleR);

  var wordmark = null;
  new THREE.TextureLoader().load('penthia-wordmark.png', function (tex) {
    tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    var ar = tex.image.width / tex.image.height;
    var wmH = 0.13, wmMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false });
    wordmark = new THREE.Mesh(new THREE.PlaneGeometry(wmH * ar, wmH), wmMat);
    wordmark.position.set(0, chinY, FRONT + 0.045);
    board.add(wordmark);
  }, undefined, function () {});

  // ---- Camera bar: integrated rounded module on the top edge ----
  var camGroup = new THREE.Group();
  var camY = H / 2 + BZ + 0.03;
  var camBarGeo = new THREE.ExtrudeGeometry(roundedRectShape(0.92, 0.2, 0.09, 0), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  camBarGeo.translate(0, 0, -0.07);
  var camModule = new THREE.Mesh(camBarGeo, (function(){var m=new THREE.MeshStandardMaterial({ color: 0x080a0f, roughness: 0.4, metalness: 0.55 });m.envMapIntensity=0.5;return m;})());
  camGroup.add(camModule);
  var lensRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.052, 0.012, 10, 28),
    goldMat
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
  column.position.set(-W / 2 + 1.1, -H / 2 - BOT - 0.9, -0.3);
  standGroup.add(column);
  var colR = column.clone(); colR.position.x = W / 2 - 1.1; standGroup.add(colR);
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, W - 2.0, 12), standMat);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, -H / 2 - BOT - 1.35, -0.3);
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
    g.position.set(x, -H / 2 - BOT - 2.2, -0.3);
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

  // ---- Scrubbed timeline ----
  var tl = gsap.timeline({ paused: true });

  // Phase A: board flies through space and settles upright as it lands.
  // Multiple waypoints give a "flying through" arc rather than a straight drop.
  tl.to(board.position, { x: 0.6, y: 6, z: 1.5, duration: 0.5, ease: 'power1.inOut' }, 0)
    .to(board.position, { x: -0.4, y: 2.4, z: -0.4, duration: 0.5, ease: 'power1.inOut' }, 0.5)
    .to(board.position, { x: LAND_X, y: LAND_Y, z: 0, duration: 0.6, ease: 'power2.out' }, 1.0)
    // banking rotation that resolves to flat/vertical on land
    .to(board.rotation, { x: 0.25, y: Math.PI * 1.2, z: -0.2, duration: 0.5, ease: 'power1.inOut' }, 0)
    .to(board.rotation, { x: -0.15, y: Math.PI * 1.8, z: 0.15, duration: 0.5, ease: 'power1.inOut' }, 0.5)
    .to(board.rotation, { x: 0, y: Math.PI * 2, z: 0, duration: 0.6, ease: 'power3.out' }, 1.0)
    .to(board.scale, { x: LAND_S, y: LAND_S, z: LAND_S, duration: 1.1, ease: 'power2.out' }, 0)
    // small settle
    .to(board.position, { y: LAND_Y + 0.12, duration: 0.12, ease: 'power1.out' }, 1.6)
    .to(board.position, { y: LAND_Y, duration: 0.4, ease: 'bounce.out' }, 1.72);

  // Phase B: screen wakes
  tl.to(wallMat, { opacity: 0.92, duration: 0.4, ease: 'power2.out' }, 1.5);

  // Phase C: apps fly in from scattered positions, randomized timing/spin
  var order = icons.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
  order.forEach(function (idx, k) {
    var m = icons[idx];
    var at = 1.7 + k * rand(0.08, 0.16);
    tl.to(m.position, { x: m.userData.target.x, y: m.userData.target.y, z: m.userData.target.z, duration: rand(0.7, 1.05), ease: 'power3.out' }, at);
    tl.to(m.rotation, { z: 0, duration: rand(0.7, 1.0), ease: 'back.out(2)' }, at);
    tl.to(m.material, { opacity: 1, duration: 0.5, ease: 'power2.out' }, at);
  });

  // ---- Quiz gate ----
  var unlocked = false;
  function quizIsOpen() {
    var ov = document.getElementById('quiz-popup-overlay');
    return !!(ov && ov.classList.contains('qp-visible'));
  }
  function unlockNow() {
    if (unlocked) return;
    unlocked = true;
    // Snap the flight to wherever the user has already scrolled,
    // so closing the quiz mid-page doesn't leave a stale frame.
    if (st) {
      var p = Math.min(st.progress / 0.85, 1);
      tl.progress(p); seqProgress = p;
    }
    window.ScrollTrigger.refresh();
  }
  window.addEventListener('penthia:quiz-closed', unlockNow);
  setTimeout(function () { if (!quizIsOpen()) unlockNow(); }, 1200);

  // ---- ScrollTrigger: no pin. The page scrolls naturally over the
  //      fixed background scene; scroll position through the tall hero
  //      runway drives the flight. The last 15% of the runway fades the
  //      whole scene out so content takes the stage cleanly.
  var FLIGHT_END = 0.85; // flight completes here; fade happens after
  var st = window.ScrollTrigger.create({
    trigger: pinWrap,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.1,
    onUpdate: function (self) {
      if (!unlocked) { tl.progress(0); return; }
      var flightP = Math.min(self.progress / FLIGHT_END, 1);
      tl.progress(flightP);
      seqProgress = flightP;
      // Scene handoff: fade the canvas as the runway ends.
      var fade = self.progress <= FLIGHT_END ? 1
        : Math.max(0, 1 - (self.progress - FLIGHT_END) / (1 - FLIGHT_END));
      mount.style.opacity = String(fade);
      // The scroll hint disappears the moment the user starts driving.
      var hint = document.querySelector('.boot-hint');
      if (hint) hint.style.opacity = String(Math.max(0, 1 - self.progress * 6));
    }
  });

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
    window.ScrollTrigger.refresh();
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
        [bezel, trim, stripe, screen, wall, glass, grilleL, grilleR, camGroup, standGroup].forEach(function (m) { m.visible = false; });
        if (wordmark) wordmark.visible = false;
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
