document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeModule_BackgroundVideo', () => ({
    playing: false,
    player: {
      ['x-ref']: 'video',
      [':class']: `{ 'opacity-0': !playing, 'opacity-100': playing }`,
    },
    init() {
      this.$nextTick(() => {
        this.$refs.video.addEventListener('play', () => {
          this.playing = true;
        });

        this.$refs.video.addEventListener('pause', () => {
          this.playing = false;
        });

        // Safari won't autoplay inserted videos
        if (this.$refs.video.autoplay) {
          this.$nextTick(() => {
            this.$refs.video.play();
          });
        }
      });
    },
    play() {
      this.$refs.video.play();
    },
    pause() {
      this.$refs.video.pause();
    },
  }));
});
