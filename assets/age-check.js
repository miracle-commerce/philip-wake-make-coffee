window['ThemeSection_AgeCheck'] = (settings) => {
  return {
    authenticated: false,
    mode: settings.mode,
    date_format: settings.date_format,
    minimum_age: settings.minimum_age,
    redirect_url: settings.redirect_url,
    month: '',
    day: '',
    year: '',
    date: '',
    get fullDate() {
      return `${this.month}/${this.day}/${this.year}`;
    },
    mounted() {
      if (this.redirect_url === null) {
        this.redirect_url = 'https://www.google.com';
      }
      if (this.mode === 'dob') {
        this.date = new Date();
        this.setUpDOB();
      }
    },
    approveEntry() {
      this.authenticated = true;
    },
    denyEntry() {
      window.location = this.redirect_url;
    },
    checkInput(name) {
      switch (name) {
        case 'day':
          return parseInt(this.day) > 0 && parseInt(this.day) < 32
            ? true
            : false;
        case 'month':
          return parseInt(this.month) > 0 && parseInt(this.month) < 13
            ? true
            : false;
        case 'year':
          return parseInt(this.year) < this.date.getFullYear() &&
            parseInt(this.year) > 1900
            ? true
            : false;
      }
      return true;
    },
    checkAge() {
      let current_date = Math.round(this.date.getTime() / 1000);
      let entered_date = Math.round(
        new Date(`${this.fullDate}`).getTime() / 1000
      );
      const difference = Math.floor((current_date - entered_date) / 31536000);
      if (difference > parseInt(this.minimum_age)) {
        this.approveEntry();
      } else {
        this.denyEntry();
      }
    },
    setUpDOB() {
      if (this.date_format === 'dd-mm-yyyy') {
        this.$refs.day.focus();
      } else {
        this.$refs.month.focus();
      }
      var container = this.$el.getElementsByClassName('dob-form')[0];
      container.onkeyup = (e) => {
        var code = e.keyCode || e.which;
        if (code == '9') {
          return false;
        }
        var target = e.srcElement || e.target;
        var maxLength = parseInt(target.attributes['maxlength'].value, 10);
        var targetLength = target.value.length;

        if (targetLength >= maxLength) {
          let valid = this.checkInput(target.getAttribute('name'));
          if (!valid) {
            target.value = '';
            return false;
          }

          var next = target.closest('.input-grid-item');
          while ((next = next.nextElementSibling)) {
            if (next == null) break;
            let input = next.querySelector('input');
            if (input !== null) {
              input.focus();
              break;
            }
          }
        }
        // Move to previous field if empty (user pressed backspace)
        else if (targetLength === 0) {
          var previous = target.closest('.input-grid-item');
          while ((previous = previous.previousElementSibling)) {
            if (previous == null) break;
            let input = previous.querySelector('input');
            if (input !== null) {
              input.focus();
              break;
            }
          }
        }
        if (
          this.checkInput('day') &&
          this.checkInput('month') &&
          this.checkInput('year')
        ) {
          this.checkAge();
        }
      };
    },
  };
};
