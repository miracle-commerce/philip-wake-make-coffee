document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeModule_ModalCart', ({ openOnAddToCart }) => {
    return {
      init() {
        if (openOnAddToCart === true) {
          document.body.addEventListener(
            'shapes:modalcart:afteradditem',
            () => {
              Alpine.store('modals').open('cart');
            }
          );
        }

        Alpine.store('modals').register('cart', 'rightDrawer');
      },
    };
  });
});
