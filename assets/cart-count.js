document.addEventListener('alpine:init', () => {
  Alpine.store('cart_count', {
    count: (window.theme && window.theme.cartItemCount) || 0,
    init() {
      window.addEventListener('shapes:modalcart:afteradditem', (e) => {
        this._setFromFetchedSection(e.detail.response);
      });

      window.addEventListener('shapes:modalcart:cartqtychange', (e) => {
        this._setFromFetchedSection(e.detail.response);
      });
    },
    _setFromFetchedSection(data) {
      const countSectionHTML = data.sections['cart-item-count'];

      this.count = parseInt(
        parseDOMFromString(countSectionHTML).firstElementChild.innerText.trim(),
        10
      );
    },
    countWithText() {
      let string = theme.strings.itemCountOther;

      if (this.count === 1) {
        string = theme.strings.itemCountOne;
      }

      return string.replace('{{ count }}', this.count);
    },
  });
});
