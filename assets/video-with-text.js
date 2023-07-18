document.addEventListener('alpine:init', () => {
  Alpine.data('Theme_VideoWithText', (enabled) => ({
    enabled: enabled,
    init() {
      if (enabled === true) {
        this.setUpVideo();
      }

      this.$watch('enabled', (value) => {
        if (value === true) {
          this.$nextTick(() => {
            this.setUpVideo();
          });
        }
      });
    },
    setUpVideo() {
      this.$nextTick(() => {
        const videoEl = this.$root.querySelector('video');

        if (videoEl.hasAttribute('muted')) {
          videoEl.muted = true;
        }

        if (videoEl.hasAttribute('autoplay')) {
          videoEl.autoplay = true;

          videoEl.play();
        }
      });
    },
  }));
});
