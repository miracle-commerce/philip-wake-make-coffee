window['ThemeSection_Product'] = ({
  product,
  variant,
  featuredMediaID,
  template,
  thumbnailsPosition,
  showThumbnailsOnMobile,
}) => {
  return {
    productRoot: null,
    product: product,
    current_variant: variant,
    featured_media_id: featuredMediaID,
    current_media_id: featuredMediaID,
    loading: false,
    quantity: '1',
    options: [],
    optionHandles: [],
    storeAvailability: null,
    addedToCart: false,
    stickyAddToCartShown: false,
    template: template,
    thumbnailsPosition: thumbnailsPosition,
    showThumbnailsOnMobile: showThumbnailsOnMobile,
    get addToCartText() {
      if (this.current_variant) {
        if (this.loading) {
          return window.theme.strings.loading;
        }
        if (!this.loading && this.current_variant.available) {
          if (this.template === 'product.preorder') {
            return window.theme.strings.preOrder;
          } else {
            return window.theme.strings.addToCart;
          }
        }
        if (!this.loading && !this.current_variant.available) {
          return window.theme.strings.soldOut;
        }
      } else {
        return window.theme.strings.unavailable;
      }
    },
    get currentVariantId() {
      if (this.current_variant) {
        return this.current_variant.id;
      } else {
        return null;
      }
    },
    get currentVariantAvailabilityClosestLocation() {
      // this is on a lag to the actual current variant so that we can display an intermediary state while the fetch request is happening
      if (!Alpine.store('availability')) return null;

      const id = this.currentVariantId;
      const storeData = Alpine.store('availability').availability[id];
      if (storeData) {
        return storeData.closest_location;
      } else {
        return null;
      }
    },
    get currentVariantAvailable() {
      if (this.current_variant) {
        return this.current_variant.available;
      } else {
        return null;
      }
    },
    get currentVariantTitle() {
      if (this.current_variant && this.current_variant.title) {
        if (!this.current_variant.title.includes('Default')) {
          return this.current_variant.title;
        }
      }
      return '';
    },
    get current_price() {
      return this.current_variant.price;
    },
    get isUsingSlideshowToDisplayMedia() {
      const splideEl = this.productRoot.querySelector('.splide--product');

      if (window.Splide && this.productRoot && splideEl) {
        if (
          window.slideshows &&
          window.slideshows[`${splideEl.id}`] &&
          !window.slideshows[`${splideEl.id}`].state.is(
            window.Splide.STATES.DESTROYED
          )
        ) {
          return true;
        }
      }

      return false;
    },
    formatMoney(price) {
      return formatMoney(price, theme.moneyFormat);
    },
    init() {
      // Set a product root for nested components
      // to use instead of $root (which refers to their root)
      this.productRoot = this.$root;

      if (this.$refs.productForm) {
        this.$refs.productForm.addEventListener(
          'submit',
          this.submitForm.bind(this)
        );
      }

      this.getOptions();
      this.getAddToCartButtonHeight();

      this.$watch('current_media_id', (value, oldValue) => {
        if (showThumbnailsOnMobile) {
          this.$root.dispatchEvent(
            new CustomEvent('shapes:product:mediachange', {
              bubbles: true,
              detail: {
                media_id: this.current_media_id,
                slideshow_id:
                  this.productRoot.querySelector('.splide--product')?.id,
              },
            })
          );
        }
        if (this.isUsingSlideshowToDisplayMedia) return;
        this.$root
          .querySelector(`[data-product-single-media-wrapper="${oldValue}"]`)
          .dispatchEvent(new CustomEvent('mediaHidden'));
        this.$root
          .querySelector(`[data-product-single-media-wrapper="${value}"]`)
          .dispatchEvent(new CustomEvent('mediaVisible'));
      });

      this.updateStoreAvailability(this.current_variant);
    },
    getAddToCartButtonHeight() {
      window.onload = function () {
        const height = document.querySelector('.add-to-cart-btn').offsetHeight;
        document.documentElement.style.setProperty(
          '--payment-button-height',
          `${height}px`
        );
      };
    },
    updateStoreAvailability(variant) {
      if (!this.$refs.storeAvailabilityContainer) return;
      this.storeAvailability =
        this.storeAvailability ||
        new StoreAvailability(this.$refs.storeAvailabilityContainer);

      if (this.storeAvailability && variant) {
        this.storeAvailability.fetchContent(variant);
      }
    },
    optionChange() {
      this.getOptions();

      const matchedVariant = ShopifyProduct.getVariantFromOptionArray(
        this.product,
        this.options
      );

      this.current_variant = matchedVariant;

      if (this.current_variant) {
        variantLiveRegion(this.current_variant);
        this.updateStoreAvailability(this.current_variant);

        if (this.current_variant.featured_media) {
          this.current_media_id = this.current_variant.featured_media.id;
        }
        const url = ShopifyProductForm.getUrlWithVariant(
          window.location.href,
          this.current_variant.id
        );

        window.history.replaceState({ path: url }, '', url);
        this.$refs.singleVariantSelector.dispatchEvent(
          new Event('change', { bubbles: true })
        );
        this.$root.dispatchEvent(
          new CustomEvent('shapes:product:variantchange', {
            bubbles: true,
            detail: { variant: this.current_variant },
          })
        );
      }
    },
    getOptions() {
      this.options = [];
      this.optionHandles = [];

      let selectors = this.$root.querySelectorAll(
        '[data-single-option-selector]'
      );

      selectors.forEach((selector) => {
        if (selector.nodeName === 'SELECT') {
          const value = selector.value;
          this.options.push(value);
          this.optionHandles.push(
            selector.options[selector.selectedIndex].dataset.handle
          );
        } else {
          if (selector.checked) {
            console;
            const value = selector.value;
            this.options.push(value);
            this.optionHandles.push(selector.dataset.handle);
          }
        }
      });
    },
    changeMedia(direction) {
      this.$root.dispatchEvent(
        new CustomEvent('shapes:product:arrow-change', {
          bubbles: true,
          detail: { direction: direction },
        })
      );
      if (this.thumbnailsPosition == 'under') {
        const currentThumbnail = this.$root.querySelector(
          '.product-thumbnail-list-item--active'
        );
        const nextElement =
          direction == 'prev'
            ? currentThumbnail.previousElementSibling
            : currentThumbnail.nextElementSibling;
        if (nextElement !== null) {
          nextElement.querySelector('.media-thumbnail').click();
        }
      }
    },
    submitForm(evt) {
      evt.preventDefault();
      this.loading = true;

      liveRegion(window.theme.strings.loading);

      const formData = new FormData(this.$refs.productForm);
      const formId = this.$refs.productForm.getAttribute('id');

      let modalCart = theme.settings.cart_type === 'modal';

      const config = fetchConfigDefaults('javascript');

      if (modalCart) {
        formData.append('sections', 'cart-items,cart-footer,cart-item-count');
        formData.append('sections_url', window.location.pathname);
      }

      config.body = formData;

      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];
      fetch(`${theme.routes.cart_add_url}`, config)
        .then((res) => res.json())
        .then((data) => {
          if (data.status) {
            this.loading = false;
            document.body.dispatchEvent(
              new CustomEvent('shapes:cart:adderror', {
                detail: {
                  source: 'product-form',
                  sourceId: formId,
                  variantId: formData.get('id'),
                  errors: data.description,
                  errorMessage: data.message,
                },
              })
            );
            return;
          }
          this.loading = false;
          this.addedToCart = true;

          if (modalCart) {
            document.body.dispatchEvent(
              new CustomEvent('shapes:modalcart:afteradditem', {
                bubbles: true,
                detail: { response: data },
              })
            );
          }

          if (!document.querySelector('[data-show-on-add="true"]')) {
            if (this.$refs.added)
              this.$nextTick(() => this.$refs.added.focus());
          }
        })
        .catch((error) => {
          console.error(error);
        });
    },
    openZoom(id) {
      const imageZoomDataEl = this.productRoot.querySelector(
        '[data-photoswipe-images]'
      );

      if (!imageZoomDataEl) return;

      const imageZoomData = JSON.parse(imageZoomDataEl.innerHTML);

      const imageMediaIDsArray = Object.keys(imageZoomData);

      const index = imageMediaIDsArray.indexOf(id);

      this.$refs.photoSwipeComponent.dispatchEvent(
        new CustomEvent('shapes:photoswipe:open', {
          detail: {
            index: index,
          },
        })
      );
    },
  };
};

window['productThumbnails'] = () => {
  return {
    firstVisible: true,
    lastVisible: false,
    mounted() {
      const firstThumbnail = this.$refs.firstThumbnail;
      const lastThumbnail = this.$refs.lastThumbnail;
      const options = {
        root: this.$root.querySelector('.splide__track'),
        rootMargin: '0px',
        threshold: 1.0,
      };
      const firstThumbnailObserver = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.firstVisible = true;
          } else {
            this.firstVisible = false;
          }
        },
        options
      );
      const lastThumbnailObserver = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.lastVisible = true;
          } else {
            this.lastVisible = false;
          }
        },
        options
      );
      firstThumbnailObserver.observe(firstThumbnail);
      lastThumbnailObserver.observe(lastThumbnail);
    },
  };
};
