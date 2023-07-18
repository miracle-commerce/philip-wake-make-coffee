// Custom alpine directives go here
//
// For example, `x-uppercase`:
//
// Alpine.directive('uppercase', (el) => {
//   el.textContent = el.textContent.toUpperCase();
// });
Alpine.magic('fetchedSection', () => {
  return (url, selector) => {
    return async () => {
      return await fetchSectionHTML(url, selector);
    };
  };
});

document.addEventListener('DOMContentLoaded', () => {
  Alpine.start();
});
