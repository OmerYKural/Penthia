/* ============================================================
   Penthia Solutions — penthia-hero-3d.js
   Signature homepage hero:
   1. An empty smartboard flies in from the top of the screen
   2. It performs a smooth 360° spin
   3. It lands gracefully, centered, with a settle
   4. App icons fly in from the edges and fill the screen in a grid

   Built with Three.js (3D board + depth/lighting) and GSAP
   (timing/choreography). Fully responsive, respects
   prefers-reduced-motion, and degrades to a static board if
   WebGL or the libraries are unavailable.
   ============================================================ */

(function () {
  const mount = document.getElementById('hero-3d');
  if (!mount) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasWebGL = (function () {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) { return false; }
  })();

  // Graceful fallback: if libraries or WebGL missing, show a clean static board.
  if (!window.THREE || !window.gsap || !hasWebGL) {
    renderStaticFallback();
    return;
  }

  const THREE = window.THREE;
  const gsap = window.gsap;

  // ---- App set (matches the Vertex Elite home screen) ----
  const APPS = [
    { name: 'Whiteboard', color: '#2f6fed' },
    { name: 'YouTube',    color: '#ff0000' },
    { name: 'Meet',       color: '#00832d' },
    { name: 'Zoom',       color: '#2d8cff' },
    { name: 'Play Store', color: '#00c4b3' },
    { name: 'Chrome',     color: '#e8410e' },
    { name: 'Drive',      color: '#1fa463' },
    { name: 'Docs',       color: '#2a67d8' },
    { name: 'Slides',     color: '#f4b400' }
  ];

  // ---- Scene / camera / renderer ----
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.shadowMap.enabled = false; // keep shadow cost off for performance
  mount.appendChild(renderer.domElement);

  // ---- Lighting: ambient + directional for a realistic look ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const keyLight = new THREE.DirectionalLight(0xfff2d6, 1.1);
  keyLight.position.set(4, 6, 8);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xc9a84c, 0.5);
  rimLight.position.set(-6, 2, 4);
  scene.add(rimLight);

  // ---- Board group (bezel + screen) ----
  const board = new THREE.Group();
  scene.add(board);

  const BOARD_W = 6.6;
  const BOARD_H = 3.9;
  const BEZEL = 0.22;

  // Bezel (dark frame)
  const bezelGeo = new THREE.BoxGeometry(BOARD_W + BEZEL, BOARD_H + BEZEL, 0.28);
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0c0e13, roughness: 0.55, metalness: 0.35 });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  board.add(bezel);

  // Thin gold trim just inside the bezel edge
  const trimGeo = new THREE.BoxGeometry(BOARD_W + 0.02, BOARD_H + 0.02, 0.30);
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a84c, roughness: 0.3, metalness: 0.8, transparent: true, opacity: 0.9 });
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.z = 0.005;
  board.add(trim);

  // Screen — starts dark ("empty background board"), then a subtle wallpaper glow fades in
  const screenGeo = new THREE.PlaneGeometry(BOARD_W, BOARD_H);
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x05070c, roughness: 0.9, metalness: 0.0 });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = 0.152;
  board.add(screen);

  // Wallpaper glow layer (gradient-ish via a soft radial texture) — hidden until landed
  const wallTex = makeWallpaperTexture();
  const wallMat = new THREE.MeshBasicMaterial({ map: wallTex, transparent: true, opacity: 0 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W, BOARD_H), wallMat);
  wall.position.z = 0.153;
  board.add(wall);

  // Camera nub at top of bezel (small detail from the product)
  const nub = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.16, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.5, metalness: 0.4 })
  );
  nub.position.set(0, BOARD_H / 2 + 0.12, 0.16);
  board.add(nub);

  // ---- App icon tiles (built as small rounded planes with a letter) ----
  const iconGroup = new THREE.Group();
  board.add(iconGroup);

  const COLS = 5;
  const ROWS = 2;
  const ICON = 0.82;              // tile size
  const GAP_X = 1.18;             // horizontal spacing
  const GAP_Y = 1.25;             // vertical spacing
  const gridW = (COLS - 1) * GAP_X;
  const startX = -gridW / 2;
  const startY = 0.35;            // push grid slightly below screen center

  const icons = [];
  APPS.forEach(function (app, i) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const targetX = startX + col * GAP_X;
    const targetY = startY - row * GAP_Y;

    const tex = makeIconTexture(app.name, app.color);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ICON, ICON), mat);

    // Start off-screen (fly-in origin alternates around the edges)
    const edge = i % 4;
    const off = 7;
    if (edge === 0) mesh.position.set(targetX, off, 0.2);        // from top
    else if (edge === 1) mesh.position.set(off, targetY, 0.2);   // from right
    else if (edge === 2) mesh.position.set(targetX, -off, 0.2);  // from bottom
    else mesh.position.set(-off, targetY, 0.2);                  // from left

    mesh.userData.target = { x: targetX, y: targetY, z: 0.2 };
    iconGroup.add(mesh);
    icons.push(mesh);
  });

  // ---- Initial board state: up high, spun, invisible-ish ----
  board.position.y = 10;          // starts above the screen
  board.rotation.y = 0;
  board.scale.setScalar(0.9);

  // ---- Render loop ----
  let idleT = 0;
  let landed = false;
  function animate() {
    requestAnimationFrame(animate);
    idleT += 0.01;
    if (landed) {
      // gentle idle float once everything has landed
      board.position.y = Math.sin(idleT) * 0.06;
      board.rotation.x = Math.sin(idleT * 0.7) * 0.015;
      board.rotation.y += (targetYaw - board.rotation.y) * 0.05;
    }
    renderer.render(scene, camera);
  }
  animate();

  // Pointer parallax (subtle) after landing
  let targetYaw = 0;
  window.addEventListener('pointermove', function (e) {
    if (!landed) return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    targetYaw = nx * 0.12;
  }, { passive: true });

  // ---- The choreographed intro (GSAP timeline) ----
  function playIntro() {
    if (reduceMotion) {
      // Reduced motion: just place everything in final state, fade in.
      board.position.y = 0;
      board.rotation.y = Math.PI * 2;
      board.scale.setScalar(1);
      gsap.to(wallMat, { opacity: 0.9, duration: 0.6 });
      icons.forEach(function (m) {
        m.position.set(m.userData.target.x, m.userData.target.y, m.userData.target.z);
        gsap.to(m.material, { opacity: 1, duration: 0.5 });
      });
      landed = true;
      return;
    }

    const tl = gsap.timeline();

    // 1) Board flies in from the top + 360° spin + scale settle
    tl.to(board.position, { y: 0, duration: 1.5, ease: 'power3.out' }, 0)
      .to(board.rotation, { y: Math.PI * 2, duration: 1.7, ease: 'power2.inOut' }, 0)
      .to(board.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: 'back.out(1.5)' }, 0)
      // a small settle bounce at the end of the landing
      .to(board.position, { y: 0.14, duration: 0.18, ease: 'power1.out' }, 1.5)
      .to(board.position, { y: 0, duration: 0.5, ease: 'bounce.out' }, 1.68);

    // 2) Screen wakes up (wallpaper glow fades in) just as it lands
    tl.to(wallMat, { opacity: 0.92, duration: 0.7, ease: 'power2.out' }, 1.4);

    // 3) Apps fly in from the edges into their grid slots, staggered
    tl.add(function () { landed = true; }, 1.7);
    icons.forEach(function (m, i) {
      const t = 1.75 + i * 0.09;
      tl.to(m.position, { x: m.userData.target.x, y: m.userData.target.y, z: m.userData.target.z, duration: 0.7, ease: 'back.out(2)' }, t);
      tl.to(m.material, { opacity: 1, duration: 0.4, ease: 'power2.out' }, t);
      // tiny spin as each app flies in
      tl.fromTo(m.rotation, { z: (i % 2 ? 1 : -1) * 0.8 }, { z: 0, duration: 0.7, ease: 'back.out(2)' }, t);
    });

    // Reveal the hero text overlay after the board lands
    tl.add(function () {
      document.querySelectorAll('.hero3d-reveal').forEach(function (el, idx) {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8, delay: idx * 0.08, ease: 'power3.out' });
      });
    }, 1.5);
  }

  // Kick off once fonts/layout settle
  setTimeout(playIntro, 250);

  // ---- Resize handling ----
  window.addEventListener('resize', onResize);
  function onResize() {
    const w = mount.clientWidth, h = mount.clientHeight;
    camera.aspect = w / h;
    // On narrow screens, pull the camera back so the whole board stays in frame
    camera.position.z = w < 760 ? 12.5 : (w < 1100 ? 10.5 : 9);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  onResize();

  // ---- Texture helpers ----
  function makeIconTexture(label, hex) {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    // rounded white tile
    const r = 52;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 18, 18, size - 36, size - 36, r);
    ctx.fill();

    // colored glyph area
    ctx.fillStyle = hex;
    roundRect(ctx, 54, 46, size - 108, size - 132, 34);
    ctx.fill();

    // first letter of the app as a simple, legible mark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.charAt(0), size / 2, 108);

    // label under the tile
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '600 30px Inter, Arial, sans-serif';
    ctx.fillText(label, size / 2, size - 34);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function makeWallpaperTexture() {
    const w = 1024, h = 600;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b3a63');
    g.addColorStop(0.55, '#63708f');
    g.addColorStop(1, '#b9c0cf');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // soft time text feel (purely decorative)
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '600 120px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('11:27', w / 2, 180);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- Static fallback (no WebGL / libs) ----
  function renderStaticFallback() {
    mount.innerHTML = '<img src="vertexhomepage.png" alt="Penthia Vertex Elite interactive smartboard" ' +
      'style="width:100%;height:100%;object-fit:contain;" loading="eager" decoding="async" />';
    document.querySelectorAll('.hero3d-reveal').forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
})();
