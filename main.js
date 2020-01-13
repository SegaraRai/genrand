(() => {
  const defaultParam = {
    size: '100',
    length: '8',
    preset: 'di,lc,uc',
    supplement: '',
  };

  const bufferLength = 256;
  const baseMax = Math.pow(2, 32);

  class RNG {
    /**
     * @param {number} m
     */
    constructor(m) {
      if (m < 1) {
        throw new Error('m must be greater than 0');
      }

      this.m = m;
      this.buffer = new Uint32Array(bufferLength);
      this.offset = 0;
      /** @type {number[]} */
      this.stack = [];

      this.cutoff = m;
      this.unit = 1;
      while (this.cutoff * m < baseMax) {
        this.cutoff *= m;
        this.unit++;
      }
      this.mod = this.cutoff;
      while (this.cutoff + this.mod < baseMax) {
        this.cutoff += this.mod;
      }

      //console.log(this.m, this.mod, this.cutoff, baseMax, this.unit);
    }

    /**
     * @returns {number}
     */
    generate() {
      while (this.stack.length === 0) {
        if (this.offset === 0) {
          crypto.getRandomValues(this.buffer);
          this.offset = this.buffer.length;
        }

        let value = this.buffer[--this.offset];
        if (value >= this.cutoff) {
          continue;
        }

        value %= this.mod;

        for (let i = 0; i < this.unit; i++) {
          this.stack.push(value % this.m);
          value = Math.floor(value / this.m);
        }
      }

      return this.stack.shift();
    }
  }

  function parseUrlParams(str) {
    return str
      .replace(/^#/, '')
      .split('&')
      .map(entry => entry.split('=').map(decodeURIComponent))
      .reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value,
      }), {});
  }


  function createUrlParams(object) {
    return Object.entries(object)
      .map(e => e.map(encodeURIComponent))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  }


  function applyParam(param) {
    const presetSet = new Set(Array.from(param.preset.split(',')));

    for (const element of Array.from(document.querySelectorAll('.chars-checkbox'))) {
      element.checked = presetSet.has(element.dataset.name)
    }

    document.getElementById('size').value = param.size;
    document.getElementById('length').value = param.length;
    document.getElementById('chars-supplement').value = param.supplement;
  }


  function getParam() {
    return {
      size: document.getElementById('size').value,
      length: document.getElementById('length').value,
      preset: Array.from(document.querySelectorAll('.chars-checkbox:checked')).map(element => element.dataset.name).sort().join(','),
      supplement: document.getElementById('chars-supplement').value,
    };
  }


  let gChars = '';
  let gRng = null;

  function generate() {
    const size = parseInt(document.getElementById('size').value, 10);
    const length = parseInt(document.getElementById('length').value, 10);

    let list = [];
    if (gChars) {
      for (let i = 0; i < size; i++) {
        let text = '';
        for (let j = 0; j < length; j++) {
          text += gChars[gRng.generate()];
        }
        list.push(text);
      }
    }

    document.getElementById('list').value = list.join('\n');
  }

  function updateRng() {
    const tempChars = Array.from(document.querySelectorAll('.chars-checkbox:checked')).map(element => element.dataset.chars).join('') + document.getElementById('chars-supplement').value;

    const charSet = new Set([...tempChars]);
    charSet.delete('\u0008');
    charSet.delete('\u000a');
    charSet.delete('\u000c');
    charSet.delete('\u000d');
    charSet.delete('\u0085');
    charSet.delete('\u2028');
    charSet.delete('\u2029');

    gChars = Array.from(charSet).join('');
    gRng = gChars ? new RNG(gChars.length) : null;

    generate();
  }

  //

  function onElementChange() {
    location.hash = '#' + createUrlParams(getParam());
    document.getElementById('parmanentlink').value = location.href;

    updateRng();
  }

  for (const element of Array.from(document.querySelectorAll('.chars-observe'))) {
    element.addEventListener('change', () => {
      onElementChange();
    });
  }

  //

  function onHashChange() {
    applyParam({
      ...defaultParam,
      ...parseUrlParams(location.hash),
    });

    onElementChange();
  }

  window.addEventListener('hashchange', () => {
    onHashChange();
  });

  //

  document.getElementById('generate').addEventListener('click', () => {
    generate();
  });

  onHashChange();
})();
