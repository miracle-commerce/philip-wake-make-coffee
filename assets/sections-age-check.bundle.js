/*! js-cookie v3.0.1 | MIT */

/* eslint-disable no-var */
function assign(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      target[key] = source[key];
    }
  }

  return target;
}
/* eslint-enable no-var */

/* eslint-disable no-var */


var defaultConverter = {
  read: function (value) {
    if (value[0] === '"') {
      value = value.slice(1, -1);
    }

    return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
  },
  write: function (value) {
    return encodeURIComponent(value).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent);
  }
};
/* eslint-enable no-var */

/* eslint-disable no-var */

function init(converter, defaultAttributes) {
  function set(key, value, attributes) {
    if (typeof document === 'undefined') {
      return;
    }

    attributes = assign({}, defaultAttributes, attributes);

    if (typeof attributes.expires === 'number') {
      attributes.expires = new Date(Date.now() + attributes.expires * 864e5);
    }

    if (attributes.expires) {
      attributes.expires = attributes.expires.toUTCString();
    }

    key = encodeURIComponent(key).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    var stringifiedAttributes = '';

    for (var attributeName in attributes) {
      if (!attributes[attributeName]) {
        continue;
      }

      stringifiedAttributes += '; ' + attributeName;

      if (attributes[attributeName] === true) {
        continue;
      } // Considers RFC 6265 section 5.2:
      // ...
      // 3.  If the remaining unparsed-attributes contains a %x3B (";")
      //     character:
      // Consume the characters of the unparsed-attributes up to,
      // not including, the first %x3B (";") character.
      // ...


      stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
    }

    return document.cookie = key + '=' + converter.write(value, key) + stringifiedAttributes;
  }

  function get(key) {
    if (typeof document === 'undefined' || arguments.length && !key) {
      return;
    } // To prevent the for loop in the first place assign an empty array
    // in case there are no cookies at all.


    var cookies = document.cookie ? document.cookie.split('; ') : [];
    var jar = {};

    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].split('=');
      var value = parts.slice(1).join('=');

      try {
        var foundKey = decodeURIComponent(parts[0]);
        jar[foundKey] = converter.read(value, foundKey);

        if (key === foundKey) {
          break;
        }
      } catch (e) {}
    }

    return key ? jar[key] : jar;
  }

  return Object.create({
    set: set,
    get: get,
    remove: function (key, attributes) {
      set(key, '', assign({}, attributes, {
        expires: -1
      }));
    },
    withAttributes: function (attributes) {
      return init(this.converter, assign({}, this.attributes, attributes));
    },
    withConverter: function (converter) {
      return init(assign({}, this.converter, converter), this.attributes);
    }
  }, {
    attributes: {
      value: Object.freeze(defaultAttributes)
    },
    converter: {
      value: Object.freeze(converter)
    }
  });
}

var api = init(defaultConverter, {
  path: '/'
});

window['ThemeSection_AgeCheck'] = settings => {
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
    cookie: api.get('ageGateAuthenticated'),
    isSelected: false,

    get fullDate() {
      return `${this.month}/${this.day}/${this.year}`;
    },

    mounted() {
      initTeleport(this.$root);
      Alpine.store('modals').register('ageCheck', 'modal');

      if (this.cookie !== 'true') {
        Alpine.store('modals').open('ageCheck');
      }

      if (this.redirect_url === null) {
        this.redirect_url = 'https://www.google.com';
      }

      if (this.mode === 'dob') {
        this.date = new Date();
        setTimeout(() => this.setUpDOB(), 100);
      }

      document.addEventListener('shopify:section:select', e => {
        if (!e.target.querySelector('[data-section="age-check"]')) return;
        this.showSectionInThemeEditor();
      });

      if (Shopify.designMode && this.isSelected) {
        this.showSectionInThemeEditor();
      }
    },

    showSectionInThemeEditor() {
      this.isSelected = true;
      Alpine.store('modals').open('ageCheck');
    },

    approveEntry() {
      Alpine.store('modals').close('ageCheck');

      if (this.isSelected) {
        api.remove('ageGateAuthenticated');
        return;
      }

      api.set('ageGateAuthenticated', 'true', {
        expires: 30
      });
    },

    denyEntry() {
      window.location = this.redirect_url;
    },

    checkInput(name) {
      switch (name) {
        case 'day':
          return parseInt(this.day) > 0 && parseInt(this.day) < 32 ? true : false;

        case 'month':
          return parseInt(this.month) > 0 && parseInt(this.month) < 13 ? true : false;

        case 'year':
          return parseInt(this.year) < this.date.getFullYear() && parseInt(this.year) > 1900 ? true : false;
      }

      return true;
    },

    checkAge() {
      const current_date = Math.round(this.date.getTime() / 1000);
      const entered_date = Math.round(new Date(`${this.fullDate}`).getTime() / 1000);
      const difference = Math.floor((current_date - entered_date) / 31536000);

      if (difference > parseInt(this.minimum_age, 10)) {
        this.approveEntry();
      } else {
        this.denyEntry();
      }
    },

    setUpDOB() {
      const container = document.getElementById('dob-form');
      container.addEventListener('input', e => {
        const target = e.srcElement || e.target;
        const maxLength = parseInt(target.attributes['maxlength'].value, 10);
        const targetLength = target.value.length;

        if (targetLength >= maxLength) {
          const valid = this.checkInput(target.getAttribute('name'));

          if (!valid) {
            target.value = '';
            return false;
          }

          let next = target.closest('.input-grid-item');

          while (next = next.nextElementSibling) {
            if (next == null) break;
            let input = next.querySelector('input');

            if (input !== null) {
              input.focus();
              break;
            }
          }
        } // Move to previous field if empty (user pressed backspace)
        else if (targetLength === 0) {
          let previous = target.closest('.input-grid-item');

          while (previous = previous.previousElementSibling) {
            if (previous == null) break;
            const input = previous.querySelector('input');

            if (input !== null) {
              input.focus();
              break;
            }
          }
        }

        if (this.checkInput('day') && this.checkInput('month') && this.checkInput('year')) {
          setTimeout(() => this.checkAge(), 500);
        }
      });
    }

  };
};
