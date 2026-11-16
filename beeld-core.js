/* beeld-core.js — gedeelde rekenkern voor de applets over digitale beeldverwerking
 * (Spatiale filters, Frequentiefilters).
 *
 * Beelden zijn Float32Array's van N×N grijswaarden (0–255), rij voor rij:
 * index = x·N + y, met x de rij (naar onder) en y de kolom (naar rechts), zoals in de cursus.
 */
(function () {
  var BC = {};

  /* ---------- toeval (herhaalbaar) ---------- */
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function gauss(r) { var u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); }
  BC.rng = rng;

  /* ---------- canvas -> grijswaarden ---------- */
  function work(N) {
    var c = document.createElement('canvas'); c.width = N; c.height = N;
    return c;
  }
  function readGray(c, N) {
    var d = c.getContext('2d').getImageData(0, 0, N, N).data, out = new Float32Array(N * N);
    for (var i = 0; i < N * N; i++) out[i] = 0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2];
    return out;
  }
  function g(v) { v = Math.round(v); return 'rgb(' + v + ',' + v + ',' + v + ')'; }

  /* ---------- testbeelden ---------- */
  function stad(N) {
    var c = work(N), x = c.getContext('2d'), s = N / 256, r = rng(7);
    x.scale(s, s);
    var sky = x.createLinearGradient(0, 0, 0, 150);
    sky.addColorStop(0, g(225)); sky.addColorStop(1, g(185));
    x.fillStyle = sky; x.fillRect(0, 0, 256, 256);
    x.fillStyle = g(245); x.beginPath(); x.arc(204, 40, 16, 0, 2 * Math.PI); x.fill();
    // achterste gebouwen
    var back = [[0, 92, 40, 70], [38, 70, 34, 120], [70, 104, 30, 60], [150, 80, 40, 110], [188, 96, 34, 70], [220, 74, 36, 120]];
    back.forEach(function (b) { x.fillStyle = g(150 + r() * 25); x.fillRect(b[0], b[1], b[2], 256); });
    // voorste gebouwen met ramen
    var front = [[6, 124, 58, 105], [64, 110, 44, 100], [108, 136, 46, 92], [154, 116, 52, 112], [206, 130, 50, 98]];
    front.forEach(function (b, i) {
      var base = 95 + r() * 60;
      x.fillStyle = g(base); x.fillRect(b[0], b[1], b[2], 256);
      x.fillStyle = g(base - 30); x.fillRect(b[0], b[1], b[2], 3);
      if (i === 2) { x.fillStyle = g(base - 25); x.beginPath(); x.moveTo(b[0] - 2, b[1]); x.lineTo(b[0] + b[2] / 2, b[1] - 22); x.lineTo(b[0] + b[2] + 2, b[1]); x.fill(); }
      for (var yy = b[1] + 9; yy < 200; yy += 16) for (var xx = b[0] + 6; xx + 7 < b[0] + b[2] - 3; xx += 12) {
        x.fillStyle = r() < 0.25 ? g(235) : g(base - 55);
        x.fillRect(xx, yy, 7, 9);
      }
    });
    // straat en kasseien
    x.fillStyle = g(105); x.fillRect(0, 200, 256, 56);
    for (var yy = 204; yy < 256; yy += 6) for (var xx = ((yy / 6) % 2) * 4 - 4; xx < 256; xx += 8) {
      x.fillStyle = g(85 + r() * 50); x.fillRect(xx, yy, 7, 5);
    }
    // tramsporen en bovenleiding
    x.strokeStyle = g(210); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(60, 256); x.lineTo(128, 200); x.moveTo(110, 256); x.lineTo(150, 200); x.stroke();
    x.strokeStyle = g(30); x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, 58); x.lineTo(256, 30); x.moveTo(0, 66); x.lineTo(256, 44); x.stroke();
    // lantaarnpaal
    x.fillStyle = g(40); x.fillRect(178, 150, 3, 56); x.fillRect(172, 148, 15, 4);
    return readGray(c, N);
  }
  function blur(src, N, sigma) {
    var rad = Math.ceil(sigma * 3), k = [], sum = 0, i;
    for (i = -rad; i <= rad; i++) { var v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); sum += v; }
    k = k.map(function (v) { return v / sum; });
    var tmp = new Float32Array(N * N), out = new Float32Array(N * N), a, b, j;
    for (a = 0; a < N; a++) for (b = 0; b < N; b++) {
      var s = 0; for (j = -rad; j <= rad; j++) { var bb = Math.min(N - 1, Math.max(0, b + j)); s += k[j + rad] * src[a * N + bb]; }
      tmp[a * N + b] = s;
    }
    for (a = 0; a < N; a++) for (b = 0; b < N; b++) {
      var t = 0; for (j = -rad; j <= rad; j++) { var aa = Math.min(N - 1, Math.max(0, a + j)); t += k[j + rad] * tmp[aa * N + b]; }
      out[a * N + b] = t;
    }
    return out;
  }
  BC.blur = blur;

  function field(N, fn) {
    var out = new Float32Array(N * N);
    for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) out[a * N + b] = fn(a / N, b / N, a, b);
    return out;
  }
  function shapes(N, draw) {
    var c = work(N), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.fillStyle = '#fff'; x.strokeStyle = '#fff';
    draw(x, N);
    return readGray(c, N);
  }

  BC.IMAGES = {
    stad: { name: 'Stad', make: stad },
    wazig: { name: 'Wazige stad', make: function (N) { return blur(stad(N), N, 1.6 * N / 256); } },
    lijnen: { name: 'Dunne lijnen', make: function (N) {
      var c = work(N), x = c.getContext('2d'), s = N / 256;
      x.fillStyle = g(120); x.fillRect(0, 0, N, N);
      x.translate(0.5, 0.5); x.lineWidth = 1;
      x.strokeStyle = g(230);
      x.beginPath(); x.moveTo(0, Math.round(40 * s)); x.lineTo(N, Math.round(40 * s)); x.stroke();
      x.beginPath(); x.moveTo(Math.round(40 * s), 0); x.lineTo(Math.round(40 * s), N); x.stroke();
      x.strokeStyle = g(20);
      x.beginPath(); x.moveTo(0, Math.round(88 * s)); x.lineTo(N, Math.round(88 * s)); x.stroke();
      x.beginPath(); x.moveTo(Math.round(88 * s), 0); x.lineTo(Math.round(88 * s), N); x.stroke();
      x.lineWidth = 1.2;
      x.strokeStyle = g(230); x.beginPath(); x.moveTo(110 * s, 250 * s); x.lineTo(250 * s, 110 * s); x.stroke();
      x.strokeStyle = g(20); x.beginPath(); x.moveTo(110 * s, 110 * s); x.lineTo(250 * s, 250 * s); x.stroke();
      x.fillStyle = g(200); x.fillRect(130 * s, 10 * s, 110 * s, 70 * s);
      x.fillStyle = g(50); x.beginPath(); x.arc(60 * s, 190 * s, 36 * s, 0, 7); x.fill();
      return readGray(c, N);
    } },
    vierkant: { name: 'Vierkant', make: function (N) { return shapes(N, function (x, N) { var w = N / 16; x.fillRect(N / 2 - w / 2, N / 2 - w / 2, w, w); }); } },
    balk: { name: 'Smalle balk', make: function (N) { return shapes(N, function (x, N) { x.fillRect(N / 2 - N / 32, N / 4, N / 16, N / 2); }); } },
    strepen: { name: 'Verticale strepen', make: function (N) { return field(N, function (u, v) { return 128 + 100 * Math.sin(2 * Math.PI * 16 * v); }); } },
    schuin: { name: 'Schuine strepen', make: function (N) { return field(N, function (u, v) { return 128 + 100 * Math.sin(2 * Math.PI * (12 * u + 20 * v)); }); } },
    schaakbord: { name: 'Schaakbord', make: function (N) { var q = N / 8; return field(N, function (u, v, a, b) { return ((Math.floor(a / q) + Math.floor(b / q)) % 2) ? 230 : 25; }); } },
    zoneplaat: { name: 'Zoneplaat', make: function (N) { return field(N, function (u, v) { var dx = u - 0.5, dy = v - 0.5; return 128 + 110 * Math.cos(Math.PI * N * 0.9 * (dx * dx + dy * dy)); }); } },
    periodiek: { name: 'Stad met periodieke ruis', make: function (N) {
      var f = stad(N);
      for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) f[a * N + b] += 38 * Math.sin(2 * Math.PI * (a * 22 + b * 30) / N);
      return f;
    } },
  };

  /* Eigen foto: vierkant uitsnijden (midden) en schalen naar N×N. */
  BC.fromImage = function (img, N) {
    var c = work(N), x = c.getContext('2d'), w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, m = Math.min(w, h);
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, (w - m) / 2, (h - m) / 2, m, m, 0, 0, N, N);
    return readGray(c, N);
  };
  BC.loadFile = function (file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('Dit bestand kon niet als afbeelding geopend worden.')); };
      img.src = url;
    });
  };

  /* Ruis: 'gauss' (σ = amt) of 'zp' (zout en peper, amt = percentage pixels). */
  BC.addNoise = function (src, N, type, amt, seed) {
    var out = new Float32Array(src), r = rng(seed || 99), i;
    if (type === 'gauss') for (i = 0; i < out.length; i++) out[i] = src[i] + amt * gauss(r);
    else if (type === 'zp') for (i = 0; i < out.length; i++) { var p = r(); if (p < amt / 200) out[i] = 0; else if (p < amt / 100) out[i] = 255; }
    for (i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, out[i]));
    return out;
  };

  /* ---------- spatiale bewerkingen ---------- */
  // waarde op (a, b), met padding 'zero' (nullen) of 'rep' (randpixels herhalen)
  BC.at = function (f, N, a, b, pad) {
    if (a < 0 || b < 0 || a >= N || b >= N) {
      if (pad === 'zero') return 0;
      a = Math.min(N - 1, Math.max(0, a)); b = Math.min(N - 1, Math.max(0, b));
    }
    return f[a * N + b];
  };
  // kernel 180° draaien
  BC.rot180 = function (w) { return w.slice().reverse(); };
  // correlatie: g(x,y) = Σ w(i,j)·f(x+i, y+j); convolutie: eerst de kernel 180° draaien
  BC.filter = function (f, N, w, k, conv, pad) {
    var ww = conv ? BC.rot180(w) : w, r = (k - 1) >> 1, out = new Float32Array(N * N), at = BC.at;
    for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) {
      var s = 0, idx = 0, inside = a >= r && b >= r && a < N - r && b < N - r;
      for (var i = -r; i <= r; i++) for (var j = -r; j <= r; j++, idx++) {
        var c = ww[idx]; if (c === 0) continue;
        s += c * (inside ? f[(a + i) * N + b + j] : at(f, N, a + i, b + j, pad));
      }
      out[a * N + b] = s;
    }
    return out;
  };
  BC.median = function (f, N, k, pad) {
    var r = (k - 1) >> 1, out = new Float32Array(N * N), buf = new Float32Array(k * k), mid = (k * k) >> 1;
    for (var a = 0; a < N; a++) for (var b = 0; b < N; b++) {
      var n = 0;
      for (var i = -r; i <= r; i++) for (var j = -r; j <= r; j++) buf[n++] = BC.at(f, N, a + i, b + j, pad);
      buf.sort();
      out[a * N + b] = buf[mid];
    }
    return out;
  };

  /* Uitkomst naar 0–255 voor weergave: 'clamp' (begrenzen), 'norm' (min–max) of 'abs' (|g|, begrensd). */
  BC.toU8 = function (arr, mode) {
    var out = new Uint8ClampedArray(arr.length), i, mn = Infinity, mx = -Infinity;
    if (mode === 'norm') {
      for (i = 0; i < arr.length; i++) { if (arr[i] < mn) mn = arr[i]; if (arr[i] > mx) mx = arr[i]; }
      var sc = mx > mn ? 255 / (mx - mn) : 0;
      for (i = 0; i < arr.length; i++) out[i] = Math.round((arr[i] - mn) * sc);
      out.min = mn; out.max = mx;
    } else if (mode === 'abs') for (i = 0; i < arr.length; i++) out[i] = Math.round(Math.abs(arr[i]));
    else for (i = 0; i < arr.length; i++) out[i] = Math.round(arr[i]);
    return out;
  };
  BC.mapValue = function (v, mode, mn, mx) {
    if (mode === 'norm') return mx > mn ? Math.round((v - mn) * 255 / (mx - mn)) : 0;
    if (mode === 'abs') v = Math.abs(v);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  BC.threshold = function (u8, T) {
    var out = new Uint8ClampedArray(u8.length);
    for (var i = 0; i < u8.length; i++) out[i] = u8[i] >= T ? 255 : 0;
    return out;
  };
  BC.histogram = function (u8) {
    var h = new Uint32Array(256);
    for (var i = 0; i < u8.length; i++) h[u8[i]]++;
    return h;
  };
  BC.equalize = function (f) {
    var u8 = BC.toU8(f, 'clamp'), h = BC.histogram(u8), cdf = new Float64Array(256), c = 0, n = u8.length, i;
    for (i = 0; i < 256; i++) { c += h[i]; cdf[i] = c; }
    var c0 = 0; for (i = 0; i < 256; i++) if (cdf[i] > 0) { c0 = cdf[i]; break; }
    var out = new Float32Array(n);
    for (i = 0; i < n; i++) out[i] = n > c0 ? Math.round((cdf[u8[i]] - c0) / (n - c0) * 255) : u8[i];
    return out;
  };

  /* ---------- FFT ---------- */
  function fft1(re, im, n, inv) {
    var i, j, k, m;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (m = 2; m <= n; m <<= 1) {
      var ang = (inv ? 2 : -2) * Math.PI / m, wr = Math.cos(ang), wi = Math.sin(ang), h = m >> 1;
      for (i = 0; i < n; i += m) {
        var cr = 1, ci = 0;
        for (k = 0; k < h; k++) {
          var a = i + k, b = a + h;
          var tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
    if (inv) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }
  // 2D-FFT in place; re, im: Float64Array(N*N)
  BC.fft2 = function (re, im, N, inv) {
    var rr = new Float64Array(N), ii = new Float64Array(N), a, b;
    for (a = 0; a < N; a++) {
      for (b = 0; b < N; b++) { rr[b] = re[a * N + b]; ii[b] = im[a * N + b]; }
      fft1(rr, ii, N, inv);
      for (b = 0; b < N; b++) { re[a * N + b] = rr[b]; im[a * N + b] = ii[b]; }
    }
    for (b = 0; b < N; b++) {
      for (a = 0; a < N; a++) { rr[a] = re[a * N + b]; ii[a] = im[a * N + b]; }
      fft1(rr, ii, N, inv);
      for (a = 0; a < N; a++) { re[a * N + b] = rr[a]; im[a * N + b] = ii[a]; }
    }
  };
  // gecentreerde frequentie van index u (0..N-1) -> -N/2..N/2-1
  BC.freq = function (u, N) { return u < N / 2 ? u : u - N; };

  /* ---------- tekenen ---------- */
  var cache = {};
  function off(N) {
    if (!cache[N]) { var c = work(N); cache[N] = { c: c, x: c.getContext('2d'), img: c.getContext('2d').createImageData(N, N) }; }
    return cache[N];
  }
  // grijswaarden (Uint8) of RGB-functie op een canvas tekenen, scherp opgeschaald
  BC.drawGray = function (cv, u8, N) {
    if (!cv) return;
    var o = off(N), d = o.img.data;
    for (var i = 0; i < N * N; i++) { var v = u8[i]; d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v; d[4 * i + 3] = 255; }
    o.x.putImageData(o.img, 0, 0);
    var x = cv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.imageSmoothingEnabled = false;
    x.drawImage(o.c, 0, 0, cv.width, cv.height);
  };
  // RGBA-buffer (N*N*4) op een canvas tekenen, scherp opgeschaald
  BC.drawRGBA = function (cv, rgba, N) {
    if (!cv) return;
    var o = off(N);
    o.img.data.set(rgba);
    o.x.putImageData(o.img, 0, 0);
    var x = cv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.imageSmoothingEnabled = false;
    x.drawImage(o.c, 0, 0, cv.width, cv.height);
  };
  BC.drawHist = function (cv, h, opts) {
    if (!cv) return;
    opts = opts || {};
    var dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    var W = Math.max(50, Math.round(r.width)), H = Math.max(30, Math.round(r.height));
    if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    var x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    var top = 4, bot = H - 14, L = 2, R = W - 2, mx = 0, i;
    for (i = 0; i < 256; i++) if (h[i] > mx) mx = h[i];
    var ref = mx || 1;
    x.fillStyle = '#efe9dd'; x.fillRect(L, top, R - L, bot - top);
    x.fillStyle = '#3a4757';
    var bw = (R - L) / 256;
    for (i = 0; i < 256; i++) {
      if (!h[i]) continue;
      var hh = Math.min(1, h[i] / ref) * (bot - top);
      x.fillRect(L + i * bw, bot - hh, Math.max(1, bw), hh);
    }
    if (opts.T != null) {
      x.strokeStyle = opts.col || '#b8472f'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(L + opts.T * bw, top); x.lineTo(L + opts.T * bw, bot); x.stroke();
    }
    x.fillStyle = '#4f5b69'; x.font = '10px "IBM Plex Mono", monospace'; x.textBaseline = 'top';
    x.textAlign = 'left'; x.fillText('0', L, bot + 2);
    x.textAlign = 'right'; x.fillText('255', R, bot + 2);
    x.textAlign = 'center'; x.fillText('grijswaarde', (L + R) / 2, bot + 2);
  };

  /* Kleine opmaak voor formules: G_x, x^2, _{...}, ^{...} worden sub/sup. */
  BC.fm = function (str) {
    var h = React.createElement, parts = String(str).split(/(_\{[^}]*\}|_[A-Za-z0-9]|\^\{[^}]*\}|\^[A-Za-z0-9])/), out = [];
    parts.forEach(function (p, i) {
      if (!p) return;
      if (p[0] === '_' || p[0] === '^') {
        var t = p[1] === '{' ? p.slice(2, -1) : p.slice(1);
        out.push(h(p[0] === '_' ? 'sub' : 'sup', { key: i }, t));
      } else out.push(p);
    });
    return h(React.Fragment, null, out);
  };
  // getal met decimale komma
  BC.nl = function (v, d) {
    if (!isFinite(v)) return '–';
    var s = (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d == null ? 0 : d);
    if (d) s = s.replace(/\.?0+$/, '');
    return s.replace('.', ',').replace('-', '−');
  };
  // "1/9", "-0,5", "2" -> getal (NaN bij ongeldige invoer)
  BC.parse = function (s) {
    s = String(s).trim().replace(',', '.').replace('−', '-');
    if (s === '') return NaN;
    var m = /^(-?\d*\.?\d+)\s*\/\s*(\d*\.?\d+)$/.exec(s);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    return /^-?\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN;
  };

  window.BeeldCore = BC;
})();
