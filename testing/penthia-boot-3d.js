/* ============================================================
   Penthia — penthia-boot-3d.js
   Signature homepage "boot sequence":
   The Vertex board flies in from the top, performs a 360° spin,
   lands, then app tiles fly in FROM THE SIDES and fill the screen.

   KEY BEHAVIOR (per brief):
   - The whole sequence is SCROLL-SCRUBBED: the user's scroll
     position within the pinned hero drives the animation timeline.
     Scroll down = progress forward; scroll up = reverse.
   - It does NOT start until the first-visit quiz popup has been
     dismissed (window event 'penthia:quiz-closed' or absence of
     the popup). Until then the hero holds on frame 0.
   - App tiles use real logo image files if present in the folder
     (whiteboard.png, youtube.png, meet.png, zoom.png, playstore.png,
     chrome.png, drive.png, docs.png, slides.png). Missing files
     fall back to a clean lettered tile automatically.
   - Three.js for the 3D board + lighting/depth. GSAP + ScrollTrigger
     for the scrubbed choreography. Static fallback if WebGL/libs
     are unavailable or reduced-motion is requested.
   ============================================================ */

(function () {
  const mount = document.getElementById('boot-stage');
  const pinWrap = document.getElementById('boot-pin');
  if (!mount || !pinWrap) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasWebGL = (function () {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  if (!window.THREE || !window.gsap || !window.ScrollTrigger || !hasWebGL || reduceMotion) {
    staticFallback();
    return;
  }

  const THREE = window.THREE;
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  // ---- Apps (label + brand color for the fallback tile) ----
  const APPS = [
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

  // ---- Renderer / scene / camera ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = false;
  mount.appendChild(renderer.domElement);

  // ---- Lighting ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xfff1d4, 1.15); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xc9a84c, 0.55); rim.position.set(-6, 2, 4); scene.add(rim);

  // ---- Board ----
  const board = new THREE.Group();
  scene.add(board);

  const W = 6.6, H = 3.9, BEZEL = 0.22;

  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(W + BEZEL, H + BEZEL, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.55, metalness: 0.4 })
  );
  board.add(bezel);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.02, H + 0.02, 0.30),
    new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.28, metalness: 0.85, transparent: true, opacity: 0.9 })
  );
  trim.position.z = 0.006; board.add(trim);

  const screenMat = new THREE.MeshStandardMaterial({ color: 0x04060b, roughness: 0.9 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W, H), screenMat);
  screen.position.z = 0.152; board.add(screen);

  const wallTex = makeWallpaper();
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex, transparent: true, opacity: 0 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
  wall.position.z = 0.153; board.add(wall);

  const nub = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x080a0e, roughness: 0.5, metalness: 0.4 })
  );
  nub.position.set(0, H / 2 + 0.12, 0.16); board.add(nub);

  // ---- App tiles ----
  const iconGroup = new THREE.Group(); board.add(iconGroup);
  const COLS = 5, ICON = 0.82, GAP_X = 1.18, GAP_Y = 1.25;
  const gridW = (COLS - 1) * GAP_X, startX = -gridW / 2, startY = 0.35;
  const loader = new THREE.TextureLoader();
  const icons = [];

  APPS.forEach(function (app, i) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const tx = startX + col * GAP_X;
    const ty = startY - row * GAP_Y;

    const mat = new THREE.MeshBasicMaterial({ map: makeLetterTile(app.name, app.color), transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ICON, ICON), mat);

    // Try to load the real logo file; swap in if it exists.
    loader.load(
      app.key + '.png',
      function (tex) { tex.anisotropy = 4; mat.map = tex; mat.needsUpdate = true; },
      undefined,
      function () { /* keep lettered fallback */ }
    );

    // Fly-in origin: ALTERNATE SIDES (left/right), per brief.
    const fromLeft = (i % 2 === 0);
    mesh.position.set(fromLeft ? -9 : 9, ty, 0.2);
    mesh.userData.target = { x: tx, y: ty };
    mesh.userData.fromLeft = fromLeft;
    iconGroup.add(mesh);
    icons.push(mesh);
  });

  // ---- Initial state ----
  board.position.y = 11;
  board.rotation.y = 0;
  board.scale.setScalar(0.88);

  // ---- Build the scrubbed timeline (paused; ScrollTrigger drives it) ----
  const tl = gsap.timeline({ paused: true });

  // Phase A: board descends + 360 + scale settle (0 → 0.45 of timeline)
  tl.to(board.position, { y: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
    .to(board.rotation, { y: Math.PI * 2, duration: 1.4, ease: 'power1.inOut' }, 0)
    .to(board.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'power2.out' }, 0);

  // Phase B: screen wakes (0.4 → 0.55)
  tl.to(wallMat, { opacity: 0.92, duration: 0.4, ease: 'power2.out' }, 1.2);

  // Phase C: apps fly in from the sides, staggered (0.5 → 1.0)
  icons.forEach(function (m, i) {
    const at = 1.5 + i * 0.12;
    tl.to(m.position, { x: m.userData.target.x, y: m.userData.target.y, duration: 0.9, ease: 'power3.out' }, at);
    tl.to(m.material, { opacity: 1, duration: 0.5, ease: 'power2.out' }, at);
  });

  const TL_END = 1.5 + icons.length * 0.12 + 0.9;

  // ---- Gate: don't allow progress until the quiz popup is closed ----
  let unlocked = false;
  function quizIsOpen() {
    const ov = document.getElementById('quiz-popup-overlay');
    return !!(ov && ov.classList.contains('qp-visible'));
  }
  function tryUnlock() {
    if (!quizIsOpen()) unlocked = true;
  }
  // If the quiz never shows (returning visitor), unlock shortly after load.
  window.addEventListener('penthia:quiz-closed', function () { unlocked = true; ScrollTrigger.refresh(); });
  setTimeout(tryUnlock, 1200);

  // ---- ScrollTrigger: pin the hero and scrub the timeline with scroll ----
  const st = ScrollTrigger.create({
    trigger: pinWrap,
    start: 'top top',
    end: '+=2600',            // scroll distance the sequence spans (slower = larger)
    pin: true,
    scrub: 1,                 // smooth catch-up scrubbing
    onUpdate: function (self) {
      // Hold on frame 0 until unlocked (quiz dismissed).
      if (!unlocked) { tl.progress(0); return; }
      tl.progress(self.progress);
    }
  });

  // Idle shimmer on the gold trim (very subtle, always-on)
  let t = 0;
  function render() {
    requestAnimationFrame(render);
    t += 0.01;
    trim.material.opacity = 0.82 + Math.sin(t) * 0.08;
    renderer.render(scene, camera);
  }
  render();

  // ---- Resize ----
  window.addEventListener('resize', onResize);
  function onResize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    camera.aspect = w / h;
    camera.position.z = w < 760 ? 13 : (w < 1100 ? 10.6 : 9);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    ScrollTrigger.refresh();
  }
  onResize();

  // ---- Texture helpers ----
  function makeLetterTile(label, hex) {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; rr(x, 18, 18, s - 36, s - 36, 52); x.fill();
    x.fillStyle = hex; rr(x, 54, 46, s - 108, s - 132, 34); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 92px Inter, Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(label.charAt(0), s / 2, 108);
    x.fillStyle = '#1a1a1a'; x.font = '600 30px Inter, Arial, sans-serif';
    x.fillText(label, s / 2, s - 34);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
  }
  function makeWallpaper() {
    const w = 1024, h = 600, c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#243357'); g.addColorStop(0.55, '#5b6884'); g.addColorStop(1, '#aab2c4');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.font = '600 120px Inter, Arial, sans-serif';
    x.textAlign = 'center'; x.fillText('11:27', w / 2, 180);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function staticFallback() {
    mount.innerHTML = '<img src="vertexhomepage.png" alt="Penthia Vertex Elite interactive smartboard" ' +
      'style="width:100%;height:100%;object-fit:contain;" loading="eager" decoding="async" />';
  }
})();
