import { L as LibraryLoader } from './shared-import-index.bundle.js';

window['ThemeModule_Video'] = (id, type, host, autoplay) => {
  return {
    enabled: false,
    shown: false,
    id: id,
    type: type,
    host: host,
    youtubeReady: false,
    productMediaWrapper: null,
    ytPlayer: null,
    vimeoPlayer: null,
    autoPlayOnDesktop: autoplay,
    playing: false,

    init() {
      this.$watch('enabled', value => {
        this.$nextTick(() => {
          this.shown = value;
        });
      });
      document.addEventListener('touchstart', function () {
        window.setTouch();
      });
      document.body.addEventListener('pauseAllMedia', e => {
        if (e.detail !== null) {
          if (e.detail.id !== this.id) {
            this.pause();
          }
        } else {
          this.pause();
        }
      });

      if (this.host === 'youtube') {
        document.body.addEventListener('youtubeiframeapiready', () => {
          this.youtubeReady = true;
        });
        LibraryLoader.load('youtubeSdk');
      }

      if (this.host === 'vimeo') {
        LibraryLoader.load('vimeoSdk');
      } // check if this is product media


      this.productMediaWrapper = this.$root.closest('[data-product-single-media-wrapper]');

      if (this.productMediaWrapper !== null) {
        this.setUpProductMediaListeners();
      }
    },

    enableVideo() {
      this.enabled = true;
      let $root = this.$root;
      this.$nextTick(() => {
        if (this.type === 'video') {
          const video = $root.querySelector('.video');

          video.onplay = () => {
            this.playing = true;
            this.dispatchPauseEvent();
          };
        } else {
          if (this.host === 'youtube') {
            const youtubeFrame = $root.querySelector('.js-youtube');
            this.ytPlayer = new YT.Player(youtubeFrame, {
              events: {
                onStateChange: function (e) {
                  if (e.data === 1) {
                    this.playing = true;
                    this.dispatchPauseEvent();
                  }
                }.bind(this)
              }
            });
          }

          if (this.host === 'vimeo') {
            const vimeoFrame = $root.querySelector('.js-vimeo');
            this.vmPlayer = new Vimeo.Player(vimeoFrame);
            Alpine.raw(this.vmPlayer).on('play', () => {
              this.playing = true;
              this.dispatchPauseEvent();
            });
          }
        }
      });
    },

    dispatchPauseEvent() {
      document.body.dispatchEvent(new CustomEvent('pauseAllMedia', {
        detail: {
          id: this.id
        }
      }));
    },

    pause() {
      if (!this.enabled) {
        return false;
      }

      if (this.type === 'video') {
        this.$root.querySelector('video').pause();
      } else {
        switch (this.host) {
          case 'youtube':
            this.ytPlayer.pauseVideo();
            break;

          case 'vimeo':
            Alpine.raw(this.vmPlayer).pause();
            break;
        }
      }

      this.playing = false;
    },

    play() {
      if (!this.enabled) {
        return false;
      }

      if (this.type === 'video') {
        this.$root.querySelector('video').play();
      } else {
        switch (this.host) {
          case 'youtube':
            this.ytPlayer.playVideo();
            break;

          case 'vimeo':
            Alpine.raw(this.vmPlayer).play();
            break;
        }
      }

      this.playing = true;
      this.dispatchPauseEvent();
    },

    setUpProductMediaListeners() {
      this.productMediaWrapper.addEventListener('mediaHidden', () => {
        this.pause();
      });
      this.productMediaWrapper.addEventListener('xrLaunch', () => {
        this.pause();
      });
      this.productMediaWrapper.addEventListener('mediaVisible', () => {
        if (window.isTouch()) return;

        if (!this.enabled && this.autoPlayOnDesktop) {
          this.enableVideo();
        } else {
          this.play();
        }
      });
    }

  };
};
