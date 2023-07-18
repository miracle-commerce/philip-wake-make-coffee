window['ThemeComponent_OffsetGalleryItem'] = () => {
  return {
    tabIndex: -1,
    mounted() {
      const el = this.$el;
      const observer = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.tabIndex = 0;
            return;
          }
          this.isVisible = -1;
        },
        {
          root: null,
          threshold: 0,
        }
      );
      observer.observe(el);
    },
    focused() {
      const container = this.$el.closest('.offset-gallery-container');
      container.scrollTop = 0;
      container.scrollLeft = 0;
    },
  };
};
