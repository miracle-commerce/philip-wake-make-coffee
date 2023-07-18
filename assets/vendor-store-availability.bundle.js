const StoreAvailability = function () {
  /**
   * @constructor
   * StoreAvailability constructor
   *
   * @param {HTMLElement} container An HTML container
   */
  function StoreAvailability(container) {
    this.container = container;
    window.Spruce.store("availability").product_title = this.container.dataset.productTitle;
  }

  StoreAvailability.prototype = Object.assign({}, StoreAvailability.prototype, {
    /**
     * @description
     * Gets information about a variant’s store
     * pickup availability from its section response,
     * and replaces the inner HTML of the container element
     * with the one from the section response
     *
     * @param {Number} variantId The ID of the variant
     */
    fetchContent: function (variant) {
      if (window.Spruce.store("availability").availability[variant.id]) {
        window.Spruce.store("availability").current_variant = variant;
        return;
      } else {
        let baseUrl = this.container.dataset.baseUrl;

        if (!baseUrl.endsWith("/")) {
          baseUrl = baseUrl + "/";
        }

        const variantSectionUrl = baseUrl + "variants/" + variant.id + "/?section_id=store-availability";
        window.Spruce.store("availability").loading = true;
        return fetch(variantSectionUrl).then(function (response) {
          return response.text();
        }).then(function (storeAvailabilityHTML) {
          // todo: think we can refactor this to be a little cleaner but right now i want this to work with both json and non json content
          window.Spruce.store("availability").loading = false;
          window.Spruce.store("availability").current_variant = variant;
          let data = "";
          const parser = new DOMParser();
          const html = parser.parseFromString(storeAvailabilityHTML, "text/html");
          const dataWrapper = html.querySelector("[data-availability-json]");

          if (dataWrapper) {
            data = JSON.parse(dataWrapper.innerHTML);
          }

          window.Spruce.store("availability").availability[data.variant] = data.availability;
        });
      }
    }
  });
  return StoreAvailability;
}();

window.StoreAvailability = StoreAvailability;
