import { f as focusable, t as trapFocus } from './shared-import-theme-a11y.bundle.js';

window.ThemeComponent_PredictiveSearch = resources => {
  return {
    cachedResults: {},
    loading: false,
    resultsOpen: false,
    rawQuery: '',
    results: false,
    resultsMarkup: null,
    resources: resources,

    get trimmedQuery() {
      return this.rawQuery.trim();
    },

    get queryKey() {
      return this.trimmedQuery.replace(' ', '-').toLowerCase();
    },

    mounted() {
      this.cachedResults = {};
      const toggles = document.querySelectorAll('[data-open-search]');
      toggles.forEach(toggle => {
        toggle.setAttribute('role', 'button');
      });
      document.addEventListener('keyup', event => {
        if (event.key === 'Escape') {
          this.close(false);
        }
      });
      this.$watch('searchOpen', value => {
        if (value === true) {
          this.onOpen();
        }
      });
    },

    close() {
      let clearSearchTerm = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
      this.closeResults(clearSearchTerm);
      this.closePredictiveSearch();
    },

    closePredictiveSearch() {
      document.body.dispatchEvent(new CustomEvent('shapes:search:closebutton'));
    },

    closeResults() {
      let clearSearchTerm = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      this.resultsOpen = false;

      if (clearSearchTerm) {
        this.rawQuery = '';
      }

      const selected = this.$root.querySelector('[aria-selected="true"]');
      if (selected) selected.setAttribute('aria-selected', false);
      this.$refs.input.setAttribute('aria-activedescendant', '');
      this.$refs.input.setAttribute('aria-expanded', false);
      document.documentElement.style.overflowY = 'auto';
    },

    getSearchResults() {
      this.loading = true;
      liveRegion(window.theme.strings.loading);
      fetch(`${window.theme.routes.predictive_search_url}?q=${encodeURIComponent(this.trimmedQuery)}&${encodeURIComponent('resources[type]')}=${this.resources}&section_id=predictive-search`).then(response => {
        this.loading = false;

        if (!response.ok) {
          var error = new Error(response.status);
          this.close(true);
          throw error;
        }

        return response.text();
      }).then(text => {
        this.results = true;
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;
        const liveRegionText = new DOMParser().parseFromString(text, 'text/html').querySelector('#predictive-search-count').textContent;
        this.cachedResults[this.queryKey] = resultsMarkup;
        this.renderSearchResults(resultsMarkup);
        liveRegion(liveRegionText);
      }).catch(error => {
        this.close(true);
        throw error;
      });
    },

    onChange() {
      if (!this.trimmedQuery.length) {
        this.closeResults();
      } else {
        this.openResults();
        this.getSearchResults();
      }
    },

    onFocus() {
      if (!this.trimmedQuery.length) return;

      if (this.results === true) {
        this.openResults();
      } else {
        this.getSearchResults();
      }
    },

    onFocusOut() {
      // If search bar is open, trap focus in it until it is closed
      if (this.searchOpen) {
        setTimeout(() => {
          if (!this.$refs.searchFieldComponent.contains(document.activeElement)) {
            focusable(this.$root)[0].focus();
          }
        });
      }
    },

    onFormSubmit(event) {
      if (!this.trimmedQuery.length || this.$root.querySelector('[aria-selected="true"] a')) event.preventDefault();
    },

    onKeyup(event) {
      event.preventDefault();

      switch (event.code) {
        case 'ArrowUp':
          this.switchOption('up');
          break;

        case 'ArrowDown':
          this.switchOption('down');
          break;

        case 'Enter':
          this.selectOption();
          break;
      }
    },

    onKeydown(event) {
      if (event.code === 'Escape' && this.trimmedQuery.length) {
        event.preventDefault();
      } // Prevent the cursor from moving in the input when using the up and down arrow keys


      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
      }
    },

    onOpen() {
      if (this.trimmedQuery.length) {
        this.openResults();
        this.$nextTick(() => {
          if (this.cachedResults[this.queryKey]) {
            this.renderSearchResults(this.cachedResults[this.queryKey]);
          } else {
            this.getSearchResults();
          }
        });
      }
    },

    openResults() {
      this.resultsOpen = true;
      this.$refs.input.setAttribute('aria-expanded', true);
      document.documentElement.style.overflowY = 'hidden';
    },

    renderSearchResults(resultsMarkup) {
      this.$refs.results.innerHTML = resultsMarkup;
      this.results = true;
      this.openResults();
      setTimeout(() => {
        trapFocus(this.$root);
        this.$refs.input.focus();
      }, 300);
    },

    selectOption() {
      const selectedProduct = this.$root.querySelector('[aria-selected="true"] a, [aria-selected="true"] button');
      if (selectedProduct) selectedProduct.click();
    },

    switchOption(direction) {
      if (!this.resultsOpen) return;
      const moveUp = direction === 'up';
      const selectedElement = this.$root.querySelector('[aria-selected="true"]');
      const allElements = Array.from(this.$root.querySelectorAll('.predictive-search__option'));
      let activeElement = this.$root.querySelector('.predictive-search__option');
      if (moveUp && !allElements.length) return;

      if (!moveUp && selectedElement) {
        activeElement = allElements[allElements.indexOf(selectedElement) + 1] || allElements[0];
      } else if (moveUp) {
        activeElement = allElements[allElements.indexOf(selectedElement) - 1] || allElements[allElements.length - 1];
      }

      if (activeElement === selectedElement) return;
      activeElement.setAttribute('aria-selected', true);
      if (selectedElement) selectedElement.setAttribute('aria-selected', false);
      this.$refs.input.setAttribute('aria-activedescendant', activeElement.id);
      activeElement.scrollIntoView(false, {
        behavior: 'smooth'
      });
    }

  };
};
