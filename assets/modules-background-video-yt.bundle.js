import { L as LibraryLoader } from './shared-import-index.bundle.js';
/**
 * Video Component Observer
 *
 * Creates a global instance of IntersectionObserver,
 * with a rootMargin tuned for pausing out-of-viewport
 * video components
 *
 * @fires VideoComponentObserver#`${namespace}:video-component:visible`
 * @fires VideoComponentObserver#`${namespace}:video-component:not-visible`
 */

const VideoComponentObserver = function () {
  function VideoComponentObserver() {
    let globalThemeName;

    if (THEMENAME) {
      globalThemeName = THEMENAME;
    } else if (theme.info.name) {
      globalThemeName = theme.info.name;
    } else {
      globalThemeName = 'theme';
    }

    const namespace = globalThemeName.toLowerCase();
    this.options = {
      rootMargin: "25% 0px 75% 0px"
    };

    this.callback = function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.dispatchEvent(new CustomEvent(`${namespace}:video-component:visible`, {
            bubbles: false,
            cancelable: false
          }));
        } else {
          entry.target.dispatchEvent(new CustomEvent(`${namespace}:video-component:not-visible`, {
            bubbles: false,
            cancelable: false
          }));
        }
      });
    };

    this._observedElementsCount = 0;
  }

  VideoComponentObserver.prototype = Object.assign({}, VideoComponentObserver.prototype, {
    _init: function () {
      if (!('IntersectionObserver' in window)) {
        return;
      }

      this._observer = new IntersectionObserver(this.callback, this.options);
    },
    _isInitialized: function () {
      if (this._observedElementsCount > 0) {
        return true;
      }

      return false;
    },

    /**
     * Start observing the video section
     *
     * @param {HTMLElement} containerEl The video section’s container element
     */
    observe: function (containerEl) {
      try {
        if (!this._isInitialized()) {
          this._init();
        }

        this._observer.observe(containerEl);

        this._observedElementsCount++;
      } catch (e) {
        console.error(e);
      }
    },

    /**
     * Stop observing the video section
     *
     * @param {HTMLElement} containerEl The video section’s container element
     */
    unobserve: function (containerEl) {
      if (this._observer) {
        this._observer.unobserve(containerEl);

        this._observedElementsCount--;

        if (this._observedElementsCount === 0) {
          this._deInit();
        }
      }
    },
    _deInit: function () {
      this._observer.disconnect();
    }
  });
  return VideoComponentObserver;
}();

const ytPlayers = [];
document.addEventListener('alpine:init', () => {
  Alpine.data('ThemeModule_BackgroundVideoYT', _ref => {
    let {
      videoType,
      videoId
    } = _ref;
    return {
      init() {
        if (!videoType || !videoId) {
          this._showFallBackImage();

          return;
        }

        this.componentId = this.$root.id;
        this.videoProvider = videoType;
        this.videoId = videoId;
        this.playerId = `player-${this.componentId}`;
        this.YTReady = false;
        this.selectors = {
          fallBackImage: '[data-fallback-image]',
          player: `#${this.playerId}`
        };
        this.classes = {
          isPlaying: 'is-playing',
          hidden: 'hidden',
          errorElClass: 'background-video__error',
          tallIframeClass: 'background-video-iframe--tall'
        };
        this.eventHandlers = {};

        if (Shopify.designMode) {
          document.addEventListener('shopify:section:unload', e => {
            if (e.target.contains(this.$root)) {
              this.deinit();
            }
          });
        }

        this._init();
      },

      _onPlayerStateChange(playerState) {
        const thisPlayer = ytPlayers[this.playerId];

        if (playerState === 1) {
          this._hideFallBackImage();

          this.$root.classList.add(this.classes.isPlaying);
        }

        if (playerState === -1) {
          this.$root.classList.remove(this.classes.isPlaying);

          if (thisPlayer.didBuffer === true) {
            // Loading or playing failed
            this._showFallBackImage();
          }
        }

        if (playerState === 3) {
          thisPlayer.didBuffer = true;
        }
      },

      _init() {
        if (this.videoProvider === 'youtube') {
          if (typeof YT !== 'undefined') {
            this._initYTVideo();
          } else {
            document.body.addEventListener('youtubeiframeapiready', () => {
              this._initYTVideo();
            });
            LibraryLoader.load('youtubeSdk');
          }
        } else {
          this.htmlVideoEl = this.$root.querySelector('video');
          this.htmlVideoEl.id = this.playerId;

          this._initVideoContainerObserver();
        }

        this.fallBackImageEl = this.$root.querySelector(this.selectors.fallBackImage);
        this.playerEl = this.$root.querySelector(this.selectors.player);
        this.eventHandlers.inView = this._inView.bind(this);
        this.eventHandlers.outOfView = this._outOfView.bind(this);
        this.$root.addEventListener('shapes:video-component:visible', this.eventHandlers.inView);
        this.$root.addEventListener('shapes:video-component:not-visible', this.eventHandlers.outOfView);
      },

      _showFallBackImage() {
        if (!this.fallBackImageEl) return;
        this.fallBackImageEl.classList.remove(this.classes.hidden);
        if (!this.playerEl) return;
        this.playerEl.classList.add(this.classes.hidden);
      },

      _hideFallBackImage() {
        if (!this.fallBackImageEl) return;
        this.fallBackImageEl.classList.add(this.classes.hidden);
        if (!this.playerEl) return;
        this.playerEl.classList.remove(this.classes.hidden);
      },

      _showErrorMessage(errorMessage) {
        const existingErrorEl = this.$root.querySelector(`.${this.classes.errorElClass}`);

        if (existingErrorEl !== null) {
          existingErrorEl.remove();
        }

        const errorEl = document.createElement('div');
        errorEl.classList.add(this.classes.errorElClass);
        errorEl.innerText = errorMessage;
        this.$root.prepend(errorEl);
      },

      _onYTPlayerError(e) {
        let errorMessage = '';

        switch (e.data) {
          case 2:
            errorMessage = 'shapes Background Video: Invalid parameter value';
            break;

          case 100:
            errorMessage = 'shapes Background Video: Video not found';
            break;

          case 101:
          case 150:
            errorMessage = 'shapes Background Video: Video owner does not permit embedding';
            break;

          default:
            errorMessage = 'shapes Background Video: An error occurred';
        }

        if (errorMessage !== '') {
          console.error(errorMessage);

          if (Shopify.designMode) {
            this._showErrorMessage(errorMessage);
          }
        }

        if (!Shopify.designMode) {
          this._showFallBackImage();
        }
      },

      _onYTPlayerReady() {
        if (this.YTReady === true) {
          this._play();
        } else {
          this.YTReady = true;

          this._initResponsiveVideoContainer();

          this._initVideoContainerObserver();
        }
      },

      _initYTVideo() {
        ytPlayers[this.playerId] = new YT.Player(this.playerId, {
          videoId: this.videoId,
          width: 1280,
          height: 720,
          events: {
            onError: function (e) {
              this._onYTPlayerError(e);
            }.bind(this),
            onReady: function (e) {
              this._onYTPlayerReady(e);
            }.bind(this),
            onStateChange: function (e) {
              // Loop; call method on player
              // directly to minimize brief flash
              if (e.data === 0) {
                e.target.seekTo(0);
              }

              this._onPlayerStateChange(e.data);
            }.bind(this)
          },
          playerVars: {
            autohide: 0,
            branding: 0,
            cc_load_policy: 0,
            controls: 0,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            quality: 'hd720',
            rel: 0,
            showinfo: 0,
            wmode: 'opaque'
          }
        });
        document.getElementById(this.playerId).setAttribute('tabindex', '-1');
      },

      _inView() {
        this._play();
      },

      _outOfView() {
        this._pause();
      },

      _play() {
        if (this.videoProvider === 'youtube') {
          if (this.YTReady === true) {
            const ytPlayer = ytPlayers[this.playerId];
            ytPlayer.mute();
            ytPlayer.playVideo();
          }
        } else {
          this.htmlVideoEl.play();
        }
      },

      _pause() {
        if (this.videoProvider === 'youtube') {
          if (this.YTReady === true) {
            ytPlayers[this.playerId].pauseVideo();
          }
        } else {
          this.htmlVideoEl.pause();
        }
      },

      /**
       * Watch the aspect ratio of the container
       * and assign classes accordingly; for tall
       * iframes, calculate width and left offset
       */
      _checkContainerSize() {
        const playerEl = document.getElementById(this.playerId);
        /**
         * Assume 16/9 ratio
         */

        const videoRatio = (16 / 9).toFixed(2);
        const containerAspectRatio = (this.$root.clientWidth / this.$root.clientHeight).toFixed(2);
        playerEl.classList.remove(this.classes.tallIframeClass);
        playerEl.style.width = '';
        playerEl.style.left = '';

        if (containerAspectRatio < videoRatio) {
          playerEl.classList.add(this.classes.tallIframeClass);
          const newWidth = (videoRatio / containerAspectRatio * 100).toFixed(2);
          const newLeft = (newWidth - 100) / 2;
          playerEl.style.width = `${newWidth}%`;
          playerEl.style.left = `-${newLeft}%`;
        }
      },

      _initResponsiveVideoContainer() {
        this._checkContainerSize();

        this._debouncedCheckContainerSize = debounce(this._checkContainerSize.bind(this), 300);
        window.addEventListener('resize', this._debouncedCheckContainerSize);
      },

      _initVideoContainerObserver() {
        if (typeof window._videoComponentObserver === 'undefined') {
          window._videoComponentObserver = new VideoComponentObserver();
        }

        window._videoComponentObserver.observe(this.$root);
      },

      deinit() {
        window._videoComponentObserver.unobserve(this.$root);

        window.removeEventListener('resize', this._debouncedCheckContainerSize);
        this.$root.removeEventListener('shapes:video-component:visible', this.eventHandlers.inView);
        this.$root.removeEventListener('shapes:video-component:not-visible', this.eventHandlers.outOfView);
        window.removeEventListener('resize', this._debouncedCheckContainerSize);
        ytPlayers[this.playerId].destroy();
      }

    };
  });
});
