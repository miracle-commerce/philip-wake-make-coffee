/**
 * Observe mutations in sections and fire an event
 * when they are added, removed, reordered or
 * have blocks added, removed, or reordered
 */

// const mainContent = document.getElementById('MainContent');

// window.mainContentMO = new MutationObserver(() => {
//   document.body.dispatchEvent(
//     new CustomEvent('shapes:childlistmutation:main', { bubbles: true })
//   );
// });

// window.mainContentMO.observe(mainContent, { childList: true });

/**
 * Slideshow management
 */

document.addEventListener('shopify:section:load', (e) => {
  if (!e.target.querySelector('.splide')) return;

  e.target.querySelectorAll('.splide').forEach((splideRoot) => {
    makeSlideshow(splideRoot);
  });
});

document.addEventListener('shopify:section:unload', (e) => {
  if (!e.target.querySelector('.splide')) return;

  e.target.querySelectorAll('.splide').forEach((splideRoot) => {
    destroySlideshow(splideRoot);
  });
});

document.addEventListener('shopify:block:select', (e) => {
  const block = e.target,
    splideRoot = e.target.closest('.splide');

  if (!splideRoot) return;

  const slideIndex = Array.from(
    block.closest('.splide__list').children
  ).indexOf(block);

  window.slideshows[splideRoot.id].go(slideIndex);
});

/**
 * Sidebar management
 */

document.addEventListener('shopify:section:select', (e) => {
  if (!e.target.querySelector('[x-data="ThemeSection_Sidebar"]')) return;

  Alpine.store('modals').open('nav');
});

document.addEventListener('shopify:section:deselect', (e) => {
  if (!e.target.querySelector('[x-data="ThemeSection_Sidebar"]')) return;

  Alpine.store('modals').close('nav');
});
