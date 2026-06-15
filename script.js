/* ============================================================
   Penthia Solutions — script.js v2
   ============================================================ */

/* ── Social icons ── */
const SOCIAL_HTML = `
  <a href="https://www.youtube.com/@PenthiaSolutions" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="YouTube">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  </a>
  <a href="https://www.linkedin.com/company/penthia-solutions/?viewAsMember=true" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="LinkedIn">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  </a>
  <a href="https://www.twitter.com" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="X (Twitter)">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  </a>
  <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" class="social-icon" aria-label="Instagram">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
  </a>`;

document.querySelectorAll('.social-icons-target').forEach(el => { el.innerHTML = SOCIAL_HTML; });

/* ── Active nav ── */
(function() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || 'index.html';
  const map = { 'index.html':'nav-home','':'nav-home','about.html':'nav-about','store.html':'nav-store','compare.html':'nav-compare','contact.html':'nav-contact' };
  const mmap = { 'index.html':'mnav-home','':'mnav-home','about.html':'mnav-about','store.html':'mnav-store','compare.html':'mnav-compare','contact.html':'mnav-contact' };
  const el = document.getElementById(map[filename]); if (el) el.classList.add('active');
  const mel = document.getElementById(mmap[filename]); if (mel) mel.classList.add('active');
})();

/* ── FAQ ── */
function toggleFaq(btn) { btn.parentElement.classList.toggle('open'); }

/* ── Product modal ── */
const productImages = {
  'pro-max': ['vertexelite%231.png','vertexelite%232.png','vertexelite%233.png'],
  'pro': ['iBoardWebsite,androidbackground,withstandtoholdup.png','iBoardWebsite,windowsbackgroundiboardpro.png','iBoardWebsite,androidbackgroundiboardpro.png'],
  'iboard': ['iBoardWebsite,androidbackgroundiboardpro.png','iBoardWebsite,androidbackground,withstandtoholdup.png','iBoardWebsite,windowsbackgroundiboardpro.png'],
  'qs3': ['penthianosoftwareboard.png']
};

const products = {
  'pro-max': {
    badge: 'Flagship Model', title: 'Penthia Vertex Elite',
    desc: 'The Penthia Vertex Elite is the flagship model in the Vertex family. Based on the RK3588 platform with Android 15, 16GB RAM, 256GB storage, 4K UHD visuals, 50-point touch, and Google Play Store and Google services support on supported configurations.',
    bullets: ['RK3588 platform','Android 15','16GB RAM / 256GB storage','Google Play Store + Google account on supported configurations','4K UHD anti-glare display','50-point IR touch, ~6ms response','20W × 2 speakers + 20W subwoofer','Full-function USB-C, 65W charging','Optional 48MP / 48MP AI camera + 8-mic array','Optional Windows OPS module','Available: 65", 75", 86", 98", 110"','iMagic MDM supported','1-year panel, 3-year component warranty'],
    display:['4K UHD','350 nits standard','Anti-glare 7H glass'], os:['Android 15','Optional Windows OPS'],
    storage:['16GB RAM / 256GB'], support:['65" 75" 86" 98" 110"','Deployment support'],
    input:['50-point IR touch','Stylus support','Full-function USB-C'],
    note:'Contact Penthia for current pricing, size availability, Google service configuration details, and deployment options.'
  },
  'pro': {
    badge: 'Recommended Model', title: 'Penthia Vertex Pro',
    desc: 'The Penthia Vertex Pro is the recommended model for most schools. 311D2 platform, Android 14, 8GB/128GB standard, Google Play Store and Google services support on supported configurations, with optional 16GB/256GB upgrade and optional Windows OPS.',
    bullets: ['311D2 Android 14 platform','Android 14','8GB / 128GB standard; optional 16GB / 256GB upgrade','Google Play Store + Google account on supported configurations','4K UHD anti-glare display','50-point IR touch, ~6ms response','20W × 2 speakers + 20W subwoofer','Full-function USB-C, 65W charging','Optional 48MP / 48MP AI camera + 8-mic array','Optional Windows OPS module','Available: 65", 75", 86", 98", 110"','iMagic MDM supported','1-year panel, 3-year component warranty'],
    display:['4K UHD','350 nits standard','Anti-glare 7H glass'], os:['Android 14','Optional Windows OPS'],
    storage:['8GB / 128GB standard','Optional 16GB / 256GB'], support:['65" 75" 86" 98" 110"','Deployment support'],
    input:['50-point IR touch','Stylus support','Full-function USB-C'],
    note:'Contact Penthia for current pricing, upgrade options, Google configuration details, and deployment support.'
  },
  'iboard': {
    badge: 'Essential Classroom Model', title: 'Penthia Vertex Standard',
    desc: 'The Penthia Vertex Standard is the cost-effective option for schools needing the essential smartboard experience. T985 platform, Android 14, 8GB/128GB, 4K UHD, 50-point touch, anti-glare glass, and USB-C connectivity.',
    bullets: ['T985 platform','Android 14','8GB RAM / 128GB storage','Google Play Store may be configurable on supported setups','4K UHD anti-glare display','50-point touch','USB-C connectivity','Available: 65", 75", 86", 98", 110"','1-year panel, 3-year component warranty','Best positioned as essential classroom and cost-effective deployment option'],
    display:['4K UHD','350 nits standard','Anti-glare glass'], os:['Android 14'],
    storage:['8GB RAM / 128GB'], support:['65" 75" 86" 98" 110"','Deployment support'],
    input:['50-point touch','Stylus support','USB-C'],
    note:'Contact Penthia to confirm current configuration, Google Play Store availability, size options, and deployment details.'
  },
  'qs3': {
    badge: 'Professional Display', title: 'Penthia QS3 Series',
    desc: 'The Penthia QS3 Series is a professional non-Android display for customers who already use external computers. Pairs with Windows, Mac, Linux, or OPS devices for 4K display, touch, annotation, and collaboration.',
    bullets: ['No built-in Android system','4K UHD display','20-point IR touch','Anti-glare glass','15W × 2 speakers (optional YL7W upgrade)','Works with Windows, Mac, Linux, or OPS devices','USB-C / HDMI / touch USB connectivity','WPA2/WPA3 Enterprise network support','Best for setups with existing external computers'],
    display:['4K UHD','Anti-glare glass'], os:['No built-in Android','External device required'],
    storage:['N/A — external device'], support:['Windows','Mac','Linux','OPS devices'],
    input:['20-point IR touch','External-device workflow'],
    note:'Contact Penthia for current QS3 size options, connectivity details, audio options, and deployment support.'
  }
};

let currentKey = null, currentImgIndex = 0;

function setChips(id, values) { const el = document.getElementById(id); if (!el) return; el.innerHTML = values.map(v=>`<span class="chip">${v}</span>`).join(''); }
function setImage(index) {
  const imgs = productImages[currentKey]||[]; if(!imgs.length) return;
  currentImgIndex = (index+imgs.length)%imgs.length;
  const main = document.getElementById('modalMainImg'); if(main) main.src = imgs[currentImgIndex];
  document.querySelectorAll('.gallery-thumb').forEach((t,i)=>t.classList.toggle('active',i===currentImgIndex));
}
function changeImage(dir) { setImage(currentImgIndex+dir); }
function renderThumbs(key) {
  const imgs = productImages[key]||[]; const el = document.getElementById('galleryThumbs'); if(!el) return;
  el.innerHTML = imgs.map((src,i)=>`<div class="gallery-thumb ${i===0?'active':''}" onclick="setImage(${i})"><img src="${src}" alt="View ${i+1}"></div>`).join('');
}
function openProduct(key) {
  const p = products[key]; if(!p) return;
  currentKey=key; currentImgIndex=0;
  document.getElementById('modalBadge').textContent=p.badge;
  document.getElementById('modalTitle').textContent=p.title;
  document.getElementById('modalDesc').textContent=p.desc;
  document.getElementById('modalBullets').innerHTML=p.bullets.map(b=>`<li>${b}</li>`).join('');
  document.getElementById('buyboxPrice').textContent='Request Pricing';
  document.getElementById('buyboxSub').textContent=`Contact Penthia for ${p.title} purchasing details, configurations, and deployment discussions.`;
  document.getElementById('buyboxNote').textContent=p.note;
  setChips('variantDisplay',p.display); setChips('variantOS',p.os);
  setChips('variantStorage',p.storage); setChips('variantSupport',p.support); setChips('variantInput',p.input);
  renderThumbs(key); setImage(0);
  document.getElementById('modal').classList.add('active'); document.body.style.overflow='hidden';
}
function closeModal() { const m=document.getElementById('modal'); if(m) m.classList.remove('active'); document.body.style.overflow=''; }
function handleModalClick(e) { if(e.target.id==='modal') closeModal(); }
function openContactForm(type) {
  const title = currentKey&&products[currentKey]?products[currentKey].title:'';
  closeModal(); window.location.href=`contact.html?subject=${encodeURIComponent(type+' | '+title)}`;
}
document.addEventListener('keydown', e => {
  const modal = document.getElementById('modal');
  if(e.key==='Escape'&&modal) closeModal();
  if(!modal||!modal.classList.contains('active')) return;
  if(e.key==='ArrowLeft') changeImage(-1);
  if(e.key==='ArrowRight') changeImage(1);
});

/* ── Product search ── */
function filterProducts(q) {
  q=q.trim().toLowerCase();
  document.querySelectorAll('#productGrid .prod-card').forEach(card => {
    const h=((card.dataset.search||'')+' '+card.textContent).toLowerCase();
    card.style.display=!q||h.includes(q)?'':'none';
  });
}
const productSearchEl = document.getElementById('productSearch');
if(productSearchEl) productSearchEl.addEventListener('input', function(){ filterProducts(this.value); });
const siteSearchEl = document.getElementById('siteSearch');
if(siteSearchEl) siteSearchEl.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); window.location.href=`store.html?q=${encodeURIComponent(this.value)}`; } });

/* ── Contact form pre-fill ── */
(function() {
  const msg = document.getElementById('message'); if(!msg) return;
  const params = new URLSearchParams(window.location.search);
  const subject = params.get('subject'); if(subject) msg.value=subject;
})();

/* ── Contact form submit ── */
const contactForm = document.getElementById('contactForm');
if(contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email=document.getElementById('email').value.trim();
    const phone=document.getElementById('phone').value.trim();
    const emailValid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneValid=/^\+?[0-9\s\-()]{7,}$/.test(phone);
    if(!email&&!phone){alert('Please provide at least an email or phone number.');return;}
    if(email&&!emailValid){alert('Please enter a valid email address.');return;}
    if(phone&&!phoneValid){alert('Please enter a valid phone number.');return;}
    const submitBtn=this.querySelector('button[type="submit"]');
    submitBtn.disabled=true; submitBtn.textContent='Sending…';
    try{ const data=new FormData(this); await fetch('https://formspree.io/f/xnjoppqk',{method:'POST',body:data,headers:{'Accept':'application/json'}}); }catch(_){}
    document.getElementById('contactFormWrap').style.display='none';
    document.getElementById('contactThankyou').style.display='flex';
  });
}
