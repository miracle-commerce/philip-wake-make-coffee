import { t as trapFocus, r as removeTrapFocus } from './shared-import-theme-a11y.bundle.js';

window['ThemeComponent_PopUp'] = id => {
  const popUpId = 'ThemePopUp_' + id;
  Alpine.store(popUpId, {
    open: false
  });
  return {
    undoTrappings: [],
    modal: null,
    close: null,
    loaded: false,

    get open() {
      return this.$store[popUpId].open;
    },

    mounted() {
      this.$nextTick(() => {
        this.modal = document.getElementById(popUpId);
        this.close = document.getElementById(popUpId + '_CloseBtn');
      });
      Alpine.effect(() => {
        const value = Alpine.store(popUpId).open;

        if (this.loaded) {
          value ? this.openModal() : this.closeModal();
        }

        this.loaded = true;
      });
    },

    openModal() {
      document.documentElement.style.overflowY = 'hidden';
      setTimeout(() => {
        trapFocus(this.modal);
        this.close.focus();
      }, 300);
    },

    closeModal() {
      document.documentElement.style.overflowY = 'auto';
      removeTrapFocus(); //focus back on the trigger

      setTimeout(() => {
        this.$refs.trigger.focus();
      }, 300);
    },

    openButton() {
      this.$store[popUpId].open = true;
    }

  };
};
