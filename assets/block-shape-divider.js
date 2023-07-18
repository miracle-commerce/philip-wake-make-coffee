window['ThemeComponent_ShapeDivider'] = () => {
  return {
    mounted() {
      const el = this.$el;

      const resizeHandler = (e) => {
        this.$refs['animation-container'].style.display = 'none';
        this.$refs['animation-container'].style.animation = 'none';
        this.$refs['animation-container'].offsetHeight; // no need to store this anywhere, the reference is enough
        this.$refs['animation-container'].style.display = '';
        setTimeout(() => {
          this.$refs['animation-container'].style.animation = null;
        }, 100);
      };
      const _debouncedResizeHandler = debounce(resizeHandler, 150);
      window.addEventListener('resize', _debouncedResizeHandler);
    },
  };
};
