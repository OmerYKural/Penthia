/* ============================================================
   Penthia product image gallery patch
   Adds new product images first in the existing product modal.
   ============================================================ */

(function () {
  const NEW_PRODUCT_IMAGES = {
    'pro-max': ['elite.png', 'anotherelite.png'],
    'pro': ['pro2.png', 'prowithcamera.png'],
    'iboard': ['vertexstandard1.png'],
    'qs3': ['qs31.png']
  };

  let activeModalImages = [];
  let activeModalIndex = 0;

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
  }

  initProductImagePatch();
})();
