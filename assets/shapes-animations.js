if (!window.theme.shapesAnimationsInitialized) {
  Number.prototype.map = function (in_min, in_max, out_min, out_max) {
    return (
      ((this - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min
    );
  };

  class ShapesAnimations {
    setPosition() {
      let oldPosition = this.position;
      this.position =
        (document.documentElement || document.body.parentNode || document.body)
          .scrollTop || window.pageYOffset;

      if (oldPosition != this.position) {
        // scroll changed, return true
        return true;
      }
      return false;
    }

    updatePosition(percentage, speed) {
      let value = speed * (100 * (1 - percentage));
      return Math.round(value);
    }

    cacheParallaxContainers() {
      for (var i = 0; i < this.parallaxContainers.length; i++) {
        var item = this.createParallaxItem(this.parallaxContainers[i]);
        this.parallaxItems.push(item);
      }
    }

    inViewport(element) {
      if (!element) return false;
      if (1 !== element.nodeType) return false;

      var html = document.documentElement;
      var rect = element.getBoundingClientRect();

      return (
        !!rect &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.left <= html.clientWidth &&
        rect.top <= html.clientHeight
      );
    }

    createParallaxItem(el) {
      const id = el.getAttribute('data-parallax-id');
      const container = el;
      const item = el.querySelector('[data-parallax-element]');
      let speed = parseInt(el.getAttribute('data-parallax-speed'));

      speed = speed * -1;

      const blockHeight =
        item.clientHeight || item.offsetHeight || item.scrollHeight;
      const isInViewPort = this.inViewport(el);

      return {
        id: id,
        container: container,
        item: item,
        height: blockHeight,
        speed: speed,
        visible: isInViewPort,
        item: item,
      };
    }

    observeItems() {
      this.parallaxObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const parallaxItemIndex = this.parallaxItems.findIndex(
              (item) =>
                item.id === entry.target.getAttribute('data-parallax-id')
            );
            if (parallaxItemIndex > -1) {
              this.parallaxItems[parallaxItemIndex].visible =
                entry.isIntersecting;
            }
          });
        },
        {
          rootMargin: '0px 0px 20% 0px',
          threshold: 0,
        }
      );

      for (var i = 0; i < this.items.length; i++) {
        this.parallaxObserver.observe(this.items[i]);
      }
    }

    animate() {
      for (var i = 0; i < this.parallaxContainers.length; i++) {
        if (this.parallaxItems[i].visible) {
          const scrollPercentage =
            (this.screenHeight -
              this.parallaxItems[i].container.getBoundingClientRect().top) /
              (this.screenHeight + this.parallaxItems[i].height) -
            0.5;

          const baseValue =
            this.intensity *
            (this.parallaxItems[i].speed * (scrollPercentage * 100));

          const valueY = Math.round(baseValue * 100 + Number.EPSILON) / 100;

          this.parallaxItems[
            i
          ].item.style.transform = `translateY(${valueY}px)`;
        }
        this.parallaxContainers[i].classList.add('animated');
      }
      for (var i = 0; i < this.rotateItems.length; i++) {
        this.rotateItems[i].style.transform =
          'rotate(' + window.pageYOffset / 3 + 'deg)';
      }
      this.firstAnimate = true;
    }

    initParallax() {
      this.screenHeight = window.innerHeight;
      this.parallaxItems = [];
      this.parallaxContainers = document.querySelectorAll(
        '[data-parallax-container]'
      );

      this.setPosition();
      this.cacheParallaxContainers();

      this.intensity =
        window.theme.settings.parallax_intensity.map(0, 100, 1, 110) / 100;

      this.animate();
      document.addEventListener(
        'scroll',
        () => {
          if (this.setPosition()) {
            requestAnimationFrame(this.animate.bind(this));
          }
        },
        { passive: true }
      );
    }

    init() {
      this.items = document.querySelectorAll('[data-parallax-container]');
      this.rotateItems = document.querySelectorAll(
        '.sticker-rotate-when-scrolling'
      );

      this.observeItems();
      this.initParallax();

      window.addEventListener('resize', () => {
        if (this.enable_parallax) {
          this.initParallax();
        }
      });

      window.addEventListener(
        'shapes:section:hasmutated',
        debounce(() => {
          this.init();
        }, 300)
      );
    }
  }

  const shapesAnimations = new ShapesAnimations();

  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    document.addEventListener('DOMContentLoaded', function () {
      shapesAnimations.init();
    });

    document.addEventListener('shopify:section:load', () => {
      shapesAnimations.init();
    });

    const mutationHandler = debounce(() => {
      shapesAnimations.init();
    }, 500);

    document.addEventListener('dev:hotreloadmutation', mutationHandler);
  }
}

window.theme.shapesAnimationsInitialized = true;
