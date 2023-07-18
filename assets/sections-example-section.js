document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeSection_exampleSection', () => ({
    message: 'this is a message',
  }))
});