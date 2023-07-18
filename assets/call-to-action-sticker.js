window['CallToActionSticker'] = () => {
  return {
    show: false,
    mounted() {
      const el = document.getElementById('MainContent');
      const firstSection = el.querySelector('.shopify-section');
      const observer = new window.IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.show = false;
            return;
          }
          this.show = true;
        },
        {
          root: null,
          threshold: 0,
        }
      );
      observer.observe(firstSection);
    },
  };
};
