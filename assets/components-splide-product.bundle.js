import { E as EventInterface } from './shared-import-splide.esm.bundle.js';

const applyInert = function (slides) {
  slides.forEach(slide => {
    const slideEl = slide.slide;

    if (slideEl.matches('.is-visible')) {
      slideEl.removeAttribute('inert');
    } else {
      slideEl.setAttribute('inert', '');
    }
  });
};

function SplideProduct(Splide) {
  const {
    on,
    off,
    bind,
    unbind
  } = EventInterface(Splide);
  Splide.root.addEventListener('click', event => {
    if (event.target.classList.contains('splide__pagination__page')) {
      Splide.paginationClicked = true;
    }
  });

  function _goToFirstSlideForMediaWithId(mediaId) {
    const targetSlides = Splide.Components.Slides.filter(slide => slide.slide.dataset.mediaId === mediaId.toString());
    if (!targetSlides.length) return;
    Splide.go(targetSlides[0].index);
  }

  bind(document.body, 'shapes:product:variantchange', e => {
    if (!e.target.contains(Splide.root)) return;
    const mediaId = e.detail.variant.featured_media.id;

    _goToFirstSlideForMediaWithId(mediaId);
  });

  function _resizeTrackForSlideAtIndex(index) {
    const slides = Splide.Components.Slides;
    const targetSlideObject = slides.getAt(index);
    if (!targetSlideObject) return;
    const targetSlide = targetSlideObject.slide;
    const targetSlideMedia = targetSlide.querySelector('[data-product-single-media-wrapper]');
    let newHeight = targetSlideMedia.offsetHeight;

    if (Splide.root.hasAttribute('data-two-slides-visible-on-mobile') && window.matchMedia('(max-width: 989px').matches) {
      //get height of next slide
      const nextSlide = targetSlide.nextElementSibling;

      if (nextSlide !== null) {
        const nextSlideHeight = nextSlide.querySelector('[data-product-single-media-wrapper]').offsetHeight;
        newHeight = nextSlideHeight > newHeight ? nextSlideHeight : newHeight;
      }
    } // Splide.root.dispatchEvent(new CustomEvent('productSplideChange'));


    Splide.root.querySelector('.splide__track').style.maxHeight = newHeight + 'px'; // Splide.refresh();
  }

  const resizeHandler = e => {
    _resizeTrackForSlideAtIndex(Splide.index);
  };

  const _debouncedResizeHandler = debounce(resizeHandler, 150);

  bind(window, 'resize', _debouncedResizeHandler);

  function handleDestroy() {
    Splide.root.querySelectorAll('[inert]').forEach(inertEl => {
      inertEl.removeAttribute('inert');
    });
    Splide.root.querySelectorAll('[aria-hidden]').forEach(ariaHiddenEl => {
      ariaHiddenEl.removeAttribute('aria-hidden');
    });
    unbind(document.body, 'shapes:product:variantchange');
  }

  function handleMountedMoved() {
    if (Splide.options.destroy === true) {
      handleDestroy();
    } else {
      applyInert(Splide.Components.Slides.get());
    }
  }

  function optionsUpdated(options) {
    if (options.destroy === true) {
      handleDestroy();
    }
  }

  function handleMounted() {
    if (Splide.root.dataset.firstMedia) {
      _goToFirstSlideForMediaWithId(Splide.root.dataset.firstMedia);
    }

    _resizeTrackForSlideAtIndex(Splide.index);
  }

  function handleMoved(newIndex, oldIndex) {
    applyInert(Splide.Components.Slides.get());
    const slides = Splide.Components.Slides;
    const oldSlide = slides.getAt(oldIndex).slide.querySelector('[data-product-single-media-wrapper]');
    const newSlide = slides.getAt(newIndex).slide.querySelector('[data-product-single-media-wrapper]');
    if (oldSlide) oldSlide.dispatchEvent(new CustomEvent('mediaHidden'));
    if (newSlide) newSlide.dispatchEvent(new CustomEvent('mediaVisible'));
  }

  function handleMove(newIndex
  /* , oldIndex */
  ) {
    _resizeTrackForSlideAtIndex(newIndex);
  }

  return {
    mount() {
      on('mounted', handleMounted);
      on('mounted moved', handleMountedMoved);
      on('moved', handleMoved);
      on('move', handleMove);
      on('destroy', handleDestroy);
      on('updated', optionsUpdated);
    }

  };
}

export { SplideProduct };
