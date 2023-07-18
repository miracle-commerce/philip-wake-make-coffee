document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeSection_login', () => {
    return {
      state: 'login',
      init() {
        this.$watch('state', (state) => {
          const container = document.querySelector(`[data-state="${state}"]`);
          if (container) {
            const shouldFocus = container.querySelector('[data-should-focus]');
            if (shouldFocus) {
              this.$nextTick(() => shouldFocus.focus());
            }
          }
        });
        const hash = window.location.hash;

        if (hash === '#recover') {
          this.state = 'recover';
        }
      },
    };
  });
});
