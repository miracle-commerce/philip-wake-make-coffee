const registerAvailabilityStore = () => {
  Alpine.store('availability', {
    loading: false,
    current_variant: null,
    availability: {},
  });
};

document.addEventListener('alpine:init', () => {
  registerAvailabilityStore();
});

document.addEventListener('shapes:productquickbuy:willadd', () => {
  registerAvailabilityStore();
});

document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeComponent_StoreAvailabilityDrawer', () => {
    return {
      init() {
        Alpine.store('modals').register('availability', 'rightDrawer');

        initTeleport(this.$root);
      },
      get currentVariantAvailabilityList() {
        // this is on a lag to the actual current variant so that we can display an intermediary state while the fetch request is happening
        if (window.Alpine.store('availability').current_variant) {
          const id = window.Alpine.store('availability').current_variant;
          const storeData =
            window.Alpine.store('availability').availability[id];
          if (storeData) {
            return storeData.list;
          }
        }
        return [];
      },
    };
  });
});
