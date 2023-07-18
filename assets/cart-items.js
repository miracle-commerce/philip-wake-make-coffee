document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeModule_CartItems', () => {
    return {
      itemsRoot: null,
      locked: null,
      init() {
        this.itemsRoot = this.$root;

        window.addEventListener('shapes:modalcart:afteradditem', (e) => {
          Alpine.morph(
            this.itemsRoot,
            querySelectorInHTMLString(
              '[data-cart-items]',
              e.detail.response.sections['cart-items']
            ).outerHTML
          );
        });

        window.addEventListener('shapes:modalcart:cartqtychange', (e) => {
          Alpine.morph(
            this.itemsRoot,
            querySelectorInHTMLString(
              '[data-cart-items]',
              e.detail.response.sections['cart-items']
            ).outerHTML
          );

          this.$nextTick(() => {
            this.itemsRoot.querySelectorAll('input').forEach((inputEl) => {
              inputEl.value = inputEl.getAttribute('value');
            });
          });

          const liveRegionText = parseDOMFromString(
            e.detail.response.sections['cart-live-region']
          ).firstElementChild.textContent;

          const cartStatus = document.getElementById('cart-live-region-text');

          cartStatus.textContent = liveRegionText;

          cartStatus.setAttribute('aria-hidden', false);

          if (e.detail.originalTarget) {
            this.$nextTick(() => {
              if (!this.itemsRoot.contains(e.detail.originalTarget)) {
                let focusRoot;

                if (this.itemsRoot.closest('[role="dialog"]')) {
                  focusRoot =
                    this.itemsRoot.closest('[role="dialog"]').parentNode;
                } else {
                  focusRoot = this.itemsRoot;
                }

                this.$focus.within(focusRoot).first();
              }
            });
          }
        });
      },
      itemQuantityChange(key, value) {
        if (this.locked) return;

        const lineItemEl = this.$el.closest('li[data-cart-item-key]');
        const id = key ? key : lineItemEl.getAttribute('data-cart-item-key'),
          quantity = parseInt(!isNaN(value) ? value : this.$el.value, 10),
          sections = 'cart-items,cart-footer,cart-item-count,cart-live-region';

        const config = fetchConfigDefaults();

        config.body = JSON.stringify({
          id,
          quantity,
          sections,
          sections_url: window.location.pathname,
        });

        const lastValue = parseInt(this.$el.dataset.lastValue, 10);

        if (quantity !== lastValue) {
          lineItemEl.classList.add('opacity-50', 'cursor-progress');

          const currentCount = Alpine.raw(Alpine.store('cart_count').count);

          this.locked = lineItemEl;

          fetch(theme.routes.cart_change_url, config)
            .then((res) => res.json())
            .then((data) => {
              if (data.item_count === currentCount) {
                // Quantity change had no effect -- most likely, there is no more inventory
                const errorEl = lineItemEl.querySelector(
                  '[data-cart-quantity-error]'
                );

                errorEl.textContent = theme.strings.cartAddError.replace(
                  '{{ title }}',
                  errorEl.dataset.itemTitle
                );

                errorEl.classList.remove('hidden');
              } else {
                document.body.dispatchEvent(
                  new CustomEvent('shapes:modalcart:cartqtychange', {
                    bubbles: true,
                    detail: { response: data, originalTarget: lineItemEl },
                  })
                );
              }
            })
            .catch(() => {
              document.getElementById('cart-errors').textContent =
                theme.strings.cartError;
            })
            .finally(() => {
              this.locked = null;
            });
        }
      },
      removeItem(key) {
        this.itemQuantityChange(key, 0);
      },
      _adjustQty(el, operation) {
        const inputEl = el
          .closest('li[key]')
          .querySelector('input[type="number"]');

        const lastValue = parseInt(inputEl.dataset.lastValue, 10);

        let newValue;

        if (operation == 'increment') {
          newValue = lastValue + 1;
        }

        if (operation == 'decrement') {
          if (lastValue > 1) {
            newValue = lastValue - 1;
          } else {
            newValue = 1;
          }
        }

        if (operation == 'remove') {
          newValue = 0;
        }

        inputEl.value = newValue;

        // this.$nextTick(() => {
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        // });
      },
      increment() {
        this._adjustQty(this.$el, 'increment');
      },
      decrement() {
        this._adjustQty(this.$el, 'decrement');
      },
      remove() {
        this._adjustQty(this.$el, 'remove');
      },
    };
  });
});
