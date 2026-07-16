/* ============================================================
   Penthia product image gallery patch
   Adds new product images first in the existing product modal.
   Also supports store.html?product=... deep links.
   ============================================================ */

(function () {
  const NEW_PRODUCT_IMAGES = {
    'pro-max': ['elite.png', 'anotherelite.png'],
    'pro': ['pro2.png', 'prowithcamera.png'],
    'iboard': ['vertexstandard1.png'],
    'qs3': ['qs31.png']
  };

  const PRODUCT_ALIASES = {
    elite: 'pro-max',
    'vertex-elite': 'pro-max',
    'vertex_elite': 'pro-max',
    'pro-max': 'pro-max',
    promax: 'pro-max',
    pro: 'pro',
    'vertex-pro': 'pro',
    'vertex_pro': 'pro',
    standard: 'iboard',
    'vertex-standard': 'iboard',
    'vertex_standard': 'iboard',
    iboard: 'iboard',
    qs3: 'qs3',
    'qs3-series': 'qs3',
    'qs3_series': 'qs3'
  };

  let activeModalImages = [];
  let activeModalIndex = 0;
  let openedUrlProduct = false;

  function imageLabel(src) {
    return src
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function setMainImage() {
    const mainImg = document.getElementById('modalMainImg');
    const thumbs = document.getElementById('galleryThumbs');
    if (!mainImg || !thumbs || !activeModalImages.length) return;

    mainImg.src = activeModalImages[activeModalIndex];
    mainImg.alt = imageLabel(activeModalImages[activeModalIndex]);

    Array.from(thumbs.querySelectorAll('.gallery-thumb')).forEach((thumb, index) => {
      thumb.classList.toggle('active', index === activeModalIndex);
    });
  }

  function renderPatchedGallery(images) {
    const mainImg = document.getElementById('modalMainImg');
    const thumbs = document.getElementById('galleryThumbs');
    if (!mainImg || !thumbs || !images.length) return;

    activeModalImages = images;
    activeModalIndex = 0;
    thumbs.innerHTML = '';

    activeModalImages.forEach((src, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gallery-thumb' + (index === 0 ? ' active' : '');
      button.addEventListener('click', () => {
        activeModalIndex = index;
        setMainImage();
      });

      const img = document.createElement('img');
      img.src = src;
      img.alt = imageLabel(src);
      img.loading = 'lazy';
      img.decoding = 'async';

      button.appendChild(img);
      thumbs.appendChild(button);
    });

    setMainImage();
  }

  function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('product') || params.get('model') || window.location.hash.replace(/^#/, '');
    if (!raw) return '';
    const key = raw.trim().toLowerCase();
    return PRODUCT_ALIASES[key] || key;
  }

  function openProductFromUrl() {
    if (openedUrlProduct || typeof window.openProduct !== 'function') return;
    const productId = getProductIdFromUrl();
    if (!productId) return;
    if (!NEW_PRODUCT_IMAGES[productId] && !['pro-max', 'pro', 'iboard', 'qs3'].includes(productId)) return;

    openedUrlProduct = true;
    setTimeout(() => window.openProduct(productId), 120);
  }

  function patchOpenProduct() {
    if (typeof window.openProduct !== 'function') return false;

    const originalOpenProduct = window.openProduct;

    window.openProduct = function (productId) {
      activeModalImages = [];
      activeModalIndex = 0;

      originalOpenProduct.apply(this, arguments);

      const newImages = NEW_PRODUCT_IMAGES[productId];
      if (!newImages || !newImages.length) return;

      requestAnimationFrame(() => {
        const thumbs = document.getElementById('galleryThumbs');
        const existingImages = thumbs
          ? Array.from(thumbs.querySelectorAll('img'))
              .map(img => img.getAttribute('src'))
              .filter(Boolean)
          : [];

        const combinedImages = [
          ...newImages,
          ...existingImages.filter(src => !newImages.includes(src))
        ];

        renderPatchedGallery(combinedImages);
      });
    };

    return true;
  }

  function patchChangeImage() {
    const originalChangeImage = window.changeImage;

    window.changeImage = function (direction) {
      if (activeModalImages.length) {
        activeModalIndex = (activeModalIndex + direction + activeModalImages.length) % activeModalImages.length;
        setMainImage();
        return;
      }

      if (typeof originalChangeImage === 'function') {
        return originalChangeImage.apply(this, arguments);
      }
    };
  }

  function initProductImagePatch() {
    if (!patchOpenProduct()) {
      setTimeout(initProductImagePatch, 50);
      return;
    }

    patchChangeImage();
    openProductFromUrl();
  }

  initProductImagePatch();
})();
