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
    mount.innerHTML = '<img src="vertexhomepage.png" alt="Penthia Vertex Elite interactive smartboard" style="width:100%;height:100%;object-fit:contain;" loading="eager" decoding="async" />';
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
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  var keyLight = new THREE.DirectionalLight(0xfff1d4, 1.15); keyLight.position.set(4, 6, 8); scene.add(keyLight);
  var rimLight = new THREE.DirectionalLight(0xc9a84c, 0.6); rimLight.position.set(-6, 2, 5); scene.add(rimLight);
  var fillLight = new THREE.DirectionalLight(0x6f86c9, 0.35); fillLight.position.set(0, -4, 6); scene.add(fillLight);

  // ---- Board group ----
  // boardWrap carries gentle idle motion (float / cursor yaw) AFTER landing;
  // board carries the scroll-scrubbed flight. Separating them means the idle
  // life never fights the timeline — no jitter, clean reversals on scroll-up.
  var boardWrap = new THREE.Group();
  scene.add(boardWrap);
  var board = new THREE.Group();
  boardWrap.add(board);

  var W = 6.4, H = 3.7, DEPTH = 0.22;

  // Rounded-rect extrude for a real bezel silhouette
  function roundedRectShape(w, h, r) {
    var s = new THREE.Shape();
    var x = -w / 2, y = -h / 2;
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

  // Bezel (extruded rounded frame)
  var bezelShape = roundedRectShape(W + 0.34, H + 0.34, 0.22);
  var bezelGeo = new THREE.ExtrudeGeometry(bezelShape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
  bezelGeo.center();
  var bezelMat = new THREE.MeshStandardMaterial({ color: 0x0a0c11, roughness: 0.5, metalness: 0.45 });
  var bezel = new THREE.Mesh(bezelGeo, bezelMat);
  board.add(bezel);

  // Gold trim ring (thin, just inside the bezel)
  var trimShape = roundedRectShape(W + 0.06, H + 0.06, 0.14);
  var trimHole = roundedRectShape(W - 0.04, H - 0.04, 0.1);
  trimShape.holes.push(trimHole);
  var trimGeo = new THREE.ExtrudeGeometry(trimShape, { depth: 0.02, bevelEnabled: false });
  trimGeo.center();
  var trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.25, metalness: 0.9 });
  var trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.z = DEPTH / 2 + 0.01;
  board.add(trim);

  // Screen (dark, wakes to wallpaper)
  var screenMat = new THREE.MeshStandardMaterial({ color: 0x04060b, roughness: 0.85, metalness: 0.1 });
  var screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), screenMat);
  screen.position.z = DEPTH / 2 + 0.012;
  board.add(screen);

  var wallMat = new THREE.MeshBasicMaterial({ map: makeWallpaper(), transparent: true, opacity: 0 });
  var wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
  wall.position.z = DEPTH / 2 + 0.013;
  board.add(wall);

  // Camera module (top center)
  var camModule = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.18, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x070910, roughness: 0.4, metalness: 0.5 })
  );
  camModule.position.set(0, H / 2 + 0.22, DEPTH / 2);
  board.add(camModule);
  var lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.035, 20),
    new THREE.MeshStandardMaterial({ color: 0x1a2740, roughness: 0.2, metalness: 0.7 })
  );
  lens.position.set(0, H / 2 + 0.22, DEPTH / 2 + 0.09);
  board.add(lens);

  // Simple stand silhouette (legs + column), sits behind, faint
  var standMat = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.6, metalness: 0.3 });
  var column = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), standMat);
  column.position.set(0, -H / 2 - 1.1, -0.2);
  board.add(column);
  var footL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.2), standMat);
  footL.position.set(-0.9, -H / 2 - 2.1, -0.2); footL.rotation.y = 0.35; board.add(footL);
  var footR = footL.clone(); footR.position.x = 0.9; footR.rotation.y = -0.35; board.add(footR);

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

    var mat = new THREE.MeshBasicMaterial({ map: makeLetterTile(app.name, app.color), transparent: true, opacity: 0 });
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

  // ---- Scrubbed timeline ----
  var tl = gsap.timeline({ paused: true });

  // Phase A: board flies through space and settles upright as it lands.
  // Multiple waypoints give a "flying through" arc rather than a straight drop.
  tl.to(board.position, { x: 0.6, y: 6, z: 1.5, duration: 0.5, ease: 'power1.inOut' }, 0)
    .to(board.position, { x: -0.4, y: 2.4, z: -0.4, duration: 0.5, ease: 'power1.inOut' }, 0.5)
    .to(board.position, { x: 0, y: 0, z: 0, duration: 0.6, ease: 'power2.out' }, 1.0)
    // banking rotation that resolves to flat/vertical on land
    .to(board.rotation, { x: 0.25, y: Math.PI * 1.2, z: -0.2, duration: 0.5, ease: 'power1.inOut' }, 0)
    .to(board.rotation, { x: -0.15, y: Math.PI * 1.8, z: 0.15, duration: 0.5, ease: 'power1.inOut' }, 0.5)
    .to(board.rotation, { x: 0, y: Math.PI * 2, z: 0, duration: 0.6, ease: 'power3.out' }, 1.0)
    .to(board.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'power2.out' }, 0)
    // small settle
    .to(board.position, { y: 0.12, duration: 0.12, ease: 'power1.out' }, 1.6)
    .to(board.position, { y: 0, duration: 0.4, ease: 'bounce.out' }, 1.72);

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
  window.addEventListener('penthia:quiz-closed', function () { unlocked = true; window.ScrollTrigger.refresh(); });
  setTimeout(function () { if (!quizIsOpen()) unlocked = true; }, 1200);

  // ---- ScrollTrigger pin + scrub ----
  window.ScrollTrigger.create({
    trigger: pinWrap,
    start: 'top top',
    end: '+=2200',        // scroll span (tuned: smooth, moderately slow)
    pin: true,
    scrub: 1.1,           // eased catch-up = smooth
    onUpdate: function (self) {
      if (!unlocked) { tl.progress(0); return; }
      tl.progress(self.progress);
      seqProgress = self.progress;
      // The copy bows out as the board takes the stage; the scroll
      // hint disappears the moment the user starts driving.
      var copy = document.querySelector('.boot-copy');
      var hint = document.querySelector('.boot-hint');
      if (copy) copy.style.opacity = String(Math.max(0, 1 - self.progress * 2.2));
      if (hint) hint.style.opacity = String(Math.max(0, 1 - self.progress * 5));
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
        [bezel, trim, screen, wall, camModule, lens, column, footL, footR].forEach(function (m) { m.visible = false; });
        board.add(real);
      }, undefined, function () { /* keep geometry board */ });
    } catch (e) { /* no loader; keep geometry board */ }
  }

  // ---- Texture helpers ----
  function makeLetterTile(label, hex) {
    var s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    var x = c.getContext('2d');
    x.fillStyle = '#fff'; rr(x, 18, 18, s - 36, s - 36, 52); x.fill();
    x.fillStyle = hex; rr(x, 54, 46, s - 108, s - 132, 34); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 92px Inter, Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(label.charAt(0), s / 2, 108);
    x.fillStyle = '#1a1a1a'; x.font = '600 30px Inter, Arial, sans-serif';
    x.fillText(label, s / 2, s - 34);
    var tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
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
