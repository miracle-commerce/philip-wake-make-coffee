document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeModule_CartNote', () => {
    return {
      updating: false,
      updateNote() {
        this.updating = true;
        fetch(theme.routes.cart_update_url, {
          method: 'POST',
          body: JSON.stringify({
            note: this.$root.value,
          }),
          credentials: 'same-origin',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json;',
            Accept: 'application/json',
          },
        }).then(() => {
          this.updating = false;
        });
      },
    };
  });
});
