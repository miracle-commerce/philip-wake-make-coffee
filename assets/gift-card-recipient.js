document.addEventListener('alpine:init', () => {
  Alpine.data('Theme_GiftCardRecipient', () => ({
    expanded: false,
    recipientMessage: '',
    get messageLength() {
      return this.recipientMessage.length;
    },
    errorMessage: null,
    errors: null,
    init() {
      document.body.addEventListener('shapes:cart:adderror', (e) => {
        if (
          e.detail.source === 'product-form' &&
          e.detail.sourceId === this.$root.closest('form').getAttribute('id')
        ) {
          this.errorMessage = e.detail.errorMessage;
          this.errors = e.detail.errors;
          this.expanded = true;
        }
      });
    },
  }));
});
