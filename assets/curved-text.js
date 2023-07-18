window['ThemeSection_curvedText'] = (text, wave_width, wave_height, direction, speed) => {

  return {
    text: text,
    direction: direction,
    text_offset: 0,
    speed: speed,
    wave_width: wave_width,
    intensity_percentage: 100,
    wave_height: wave_height,
    viewport_width: window.innerWidth,
    path: '',
    straight_path: '',
    total_text_spans: 0,
    original_span: null,
    threshold: 0,
    has_shadow: false,
    previous_window_width: 0,
    get text_length() {
        return this.$refs.textMeasure.getBoundingClientRect().width
    },
    get wave_intensity() {
      return ((this.intensity_percentage * (this.wave_height - this.wave_mid_point)) / 100) + this.wave_mid_point;
    },
    get wave_mid_point() {
      return this.wave_height / 2;
    },
    get half_wave_width() {
      return this.wave_width / 2;
    },
    get total_text_span_length() {
      return this.total_text_spans * this.text_length;
    },
    get total_path_length() {
      return this.$refs.path.getTotalLength();
    },
    get threshold() {
      if(this.direction === 'ltr') {
        return 0;
      } else {
        return this.total_text_span_length/2;
      }
    },
    init() {

      
      if(this.$refs.shadowTextPath !== undefined) {
        this.has_shadow = true;
      }

      this.createPath();
      this.$nextTick(() => {
        this.calculateText();
        this.play();
      });

      const mql = window.matchMedia("(min-width: 990px)");
      mql.onchange = (e) => {
        this.reInit();
      };

      this.previous_window_width = window.innerWidth;
      const resizeHandler = debounce(
        this.resizeComplete.bind(this),
        300
      );
      window.addEventListener("resize", (event) => {
        let window_width = window.innerWidth;
        if(window_width !== this.previous_window_width) {
          this.paused = true;
          this.previous_window_width = window_width;
        };
      });
      window.addEventListener('resize', resizeHandler);
    },
    resizeComplete() {
      if(window.innerWidth > this.viewport_width) {
        this.reInit();
      } else {
        if(this.paused) {
          this.play();
        }
      }
    },
    reInit() {
      this.paused = true;
      this.$refs.textPath.innerHTML = '';
      this.viewport_width = window.innerWidth;
      this.text_offset = 0;

      this.createPath();
      this.$nextTick(() => {
        this.calculateText();
        this.play();
      });
    },
    pause() {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.paused = true;
        }, 0);
      });
    },
    play() {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.paused = false;
            requestAnimationFrame(this.animate.bind(this));
          }, 0);
        });
      }
    },
    createPath() {

      
      this.start_point =  (this.wave_width * 2) * -1;
      this.wave_segments = Math.ceil( (this.viewport_width*3) / this.wave_width)+1;

      this.first_control_point = this.start_point + this.half_wave_width;
      
      this.path = 'M' + this.start_point + ' ' + this.wave_mid_point;
      
      let point = this.start_point;
      for (let i = 0; i < this.wave_segments; i++) {
        point = point + this.wave_width;
        if(i === 0) {
          this.path += ' Q' + (this.start_point + this.half_wave_width) + ' ' + this.wave_intensity + ', ' + point + ' ' + this.wave_mid_point;
        } else {
          this.path += ' T' + point +  ' ' + this.wave_mid_point;
        }
      }

      

    },
    calculateText() {
      this.total_text_spans = Math.ceil(this.total_path_length / this.text_length);
      this.total_text_spans = (this.total_text_spans % 2) !== 0 ? this.total_text_spans + 1 : this.total_text_spans;
      
      let tspanElement;
      for (let i = 0; i < (this.total_text_spans); i++) {
        tspanElement = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspanElement.innerHTML=this.text;
        tspanElement.setAttribute("alignment-baseline","middle");
        tspanElement.setAttribute('aria-hidden', 'true');
        this.$refs.textPath.appendChild(tspanElement);

        if(this.has_shadow) {
          tspanElement = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
          tspanElement.innerHTML=this.text;
          tspanElement.setAttribute("alignment-baseline","middle");
          tspanElement.setAttribute('aria-hidden', 'true');
          this.$refs.shadowTextPath.appendChild(tspanElement);
        }

      }

      this.$nextTick(() => {
        if(this.direction === 'ltr') {
          this.text_offset = (this.total_text_span_length/2) * -1;
        }
      });

    },
    animate() {
      this.text_offset += 1 * this.speed;
      if(this.text_offset > this.threshold) {
        
        if(this.direction === 'ltr') {
          this.text_offset = (this.total_text_span_length/2) * -1;
        } else {
          this.text_offset = 0;
        }
      }
      if(this.direction === 'ltr') {
        this.$refs.textPath.setAttribute('startOffset', this.text_offset);
        if(this.has_shadow) {
          this.$refs.shadowTextPath.setAttribute('startOffset', this.text_offset);
        }
      } else {
        this.$refs.textPath.setAttribute('startOffset', -this.text_offset);
        if(this.has_shadow) {
          this.$refs.shadowTextPath.setAttribute('startOffset', -this.text_offset);
        }
      }
      
      if(!this.paused) {
        requestAnimationFrame(this.animate.bind(this));
      }
    }
  };
};
