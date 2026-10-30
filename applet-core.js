/* applet-core.js — gedeelde canvas- en schaalhelper voor alle fysica-applets.
 *
 * Waarom: elke applet tekent in een vaste ontwerpruimte (bv. 880x560) en zette de
 * canvasbuffer op ontwerpgrootte x min(2, dpr). CSS blies dat op naar de echte
 * breedte, dus op grote/hoge-dpi schermen werd de tekening geinterpoleerd (pixelig).
 *
 * fitCanvas() zet de buffer op de ECHTE weergavegrootte x devicePixelRatio en geeft
 * de totale schaalfactor terug. Tekencode blijft in ontwerpcoordinaten werken zolang
 * ze begint met:  ctx.setTransform(s, 0, 0, s, 0, 0)  met s = die schaalfactor.
 */
(function () {
  var MAX_W = 1400; // tekening schaalt mee tot deze breedte, daarna gecentreerd

  function fitCanvas(c, W, H, opts) {
    if (!c) return 1;
    opts = opts || {};
    var maxW = opts.maxWidth || MAX_W;

    if (!c.style.aspectRatio) c.style.aspectRatio = W + ' / ' + H;
    if (!c.style.objectFit) c.style.objectFit = 'contain';
    if (!c.dataset.acCapped) {
      c.dataset.acCapped = '1';
      c.style.maxWidth = maxW + 'px';
      c.style.maxHeight = Math.round(maxW * H / W) + 'px';
      c.style.marginLeft = 'auto';
      c.style.marginRight = 'auto';
    }

    var r = c.getBoundingClientRect();
    var k;
    if (r.width > 1 && r.height > 1) k = Math.min(r.width / W, r.height / H);
    else if (r.width > 1) k = r.width / W;
    else k = 1;

    var s = k * (window.devicePixelRatio || 1);
    if (!(s > 0)) s = 1;

    var bw = Math.max(1, Math.round(W * s));
    var bh = Math.max(1, Math.round(H * s));
    if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }

    c._scale = s;
    return s;
  }

  /* Roept cb aan bij elke maatverandering van el (of van de pagina) en bij
   * dpr-wijzigingen (zoom, ander scherm). Geeft een opruimfunctie terug. */
  function observe(el, cb) {
    var ro = null, mq = null, t = null;
    var fire = function () {
      if (t) cancelAnimationFrame(t);
      t = requestAnimationFrame(function () { t = null; cb(); });
    };
    if (el && window.ResizeObserver) { ro = new ResizeObserver(fire); ro.observe(el); }
    window.addEventListener('resize', fire);
    try {
      mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
      mq.addEventListener('change', fire);
    } catch (e) { mq = null; }
    return function () {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', fire);
      if (mq) { try { mq.removeEventListener('change', fire); } catch (e) {} }
      if (t) cancelAnimationFrame(t);
    };
  }

  function dpr() { return window.devicePixelRatio || 1; }

  /* Minimale leesbare canvastekst. Applets tekenen in ontwerpcoördinaten en het canvas krimpt mee
   * met het scherm, waardoor een label van 11 px op een laptop of gsm 4 à 8 px wordt. Bij elke
   * ctx.font-toewijzing rekenen we de grootte om naar echte schermpixels en tillen we ze op tot
   * minstens MIN_FONT (hooguit ×1,6, zodat de opmaak van de tekening heel blijft).
   * Pagina's met heel krappe tekeningen zetten window.NO_FONT_FLOOR = true vóór dit script. */
  var MIN_FONT = 12;
  (function () {
    if (window.NO_FONT_FLOOR || !window.CanvasRenderingContext2D) return;
    var proto = CanvasRenderingContext2D.prototype;
    var d = Object.getOwnPropertyDescriptor(proto, 'font');
    if (!d || !d.set || !proto.getTransform) return;
    Object.defineProperty(proto, 'font', {
      configurable: true, enumerable: d.enumerable, get: d.get,
      set: function (v) {
        var m = /(\d+(?:\.\d+)?)px/.exec(v);
        if (m) {
          var t = this.getTransform(), css = Math.hypot(t.a, t.b) / (window.devicePixelRatio || 1);
          var px = +m[1];
          if (css > 0 && px * css < MIN_FONT && px < 40) {
            v = v.replace(m[0], Math.min(px * 1.6, MIN_FONT / css).toFixed(1) + 'px');
          }
        }
        d.set.call(this, v);
      }
    });
  })();

  /* Toegankelijke naam voor knoppen die alleen een symbool tonen (◀ ▶ − + ↻ …).
   * De focusstijl zelf staat in applet.css. */
  var NAMES = {
    '◀': 'Vorige', '◂': 'Vorige', '‹': 'Vorige', '←': 'Vorige',
    '▶': 'Volgende', '▸': 'Volgende', '›': 'Volgende', '→': 'Volgende',
    '−': 'Verklein', '-': 'Verklein', '+': 'Vergroot',
    '↻': 'Opnieuw', '⟲': 'Opnieuw', '⇆': 'Wissel', '×': 'Sluiten', '✕': 'Sluiten'
  };
  function nameButtons(root) {
    var bs = (root.querySelectorAll ? root : document).querySelectorAll('button:not([aria-label])');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i], t = (b.textContent || '').trim();
      if (!t || /[A-Za-z0-9À-ɏ]{2}/.test(t)) continue;
      var n = b.title || NAMES[t];
      if (n) b.setAttribute('aria-label', n);
    }
  }
  function text(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }

  /* Schuifregelaars staan in elke applet onder een rij "label … waarde". Die rij wordt de
   * toegankelijke naam, en de waarde met eenheid wordt voorgelezen in plaats van het ruwe getal. */
  function labelRow(r) {
    var host = r.parentElement && r.parentElement.children.length === 1 ? r.parentElement : r;
    var row = host.previousElementSibling;
    while (row && !text(row)) row = row.previousElementSibling;
    if (!row || row.tagName === 'INPUT' || row.tagName === 'BUTTON') return null;
    return row;
  }
  function nameRanges() {
    var rs = document.querySelectorAll('input[type=range]');
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i], row = labelRow(r);
      if (!row) continue;
      // naam = eerste stukje tekst in de rij (kleurblokjes overslaan), waarde = de rest (getal + eenheid)
      var parts = Array.prototype.filter.call(row.querySelectorAll('span'), function (sp) {
        return text(sp) && !sp.querySelector('span');
      });
      var name = parts.length >= 2 ? text(parts[0]) : text(row);
      var val = parts.slice(1).map(text).join(' ');
      if (name && !r.hasAttribute('aria-label')) r.setAttribute('aria-label', name);
      if (val) r.setAttribute('aria-valuetext', val); else r.removeAttribute('aria-valuetext');
    }
  }

  /* Schakelaars en segmentknoppen tonen hun toestand alleen met een vulling. Een knop in een
   * groep van gelijke knoppen die gevuld is (witte tekst op kleur) geldt als ingedrukt. */
  var ACTION = /^(start|stop|pauze|loslaten|reset|nul|wis|opnieuw|meting noteren|kopieer|gekopieerd|gooi|scram|[▶■]|.*\b(kiezen|laden|opslaan|toevoegen|verwijderen|exporteren|plaats|plaatsen|zet|meten|ijken)\b|[+−-]\s?\d)/i;
  // De toestand staat in de inline stijl die de applet zelf zet. De berekende stijl loopt tijdens
  // een kleurovergang nog achter, dus die wordt alleen gebruikt als de inline stijl niets zegt.
  var probe = document.createElement('span');
  function rgb(v) {
    if (!v) return null;
    probe.style.color = ''; probe.style.color = v;
    if (!probe.style.color) return null;
    if (!probe.isConnected) { probe.style.display = 'none'; (document.body || document.documentElement).appendChild(probe); }
    return getComputedStyle(probe).color.match(/\d+(\.\d+)?/g);
  }
  function isFilled(b) {
    var inlineBg = b.style.backgroundColor || b.style.background, inlineC = b.style.color;
    if (inlineBg && inlineC) {
      var c0 = rgb(inlineC), bg0 = rgb(inlineBg.split(' ')[0]);
      if (c0 && bg0) {
        var w = +c0[0] > 235 && +c0[1] > 235 && +c0[2] > 235;
        var l = +bg0[0] > 235 && +bg0[1] > 235 && +bg0[2] > 225;
        return w && !l && !(bg0.length === 4 && +bg0[3] === 0);
      }
    }
    var cs = getComputedStyle(b), c = cs.color.match(/\d+/g), bg = cs.backgroundColor.match(/\d+(\.\d+)?/g);
    if (!c || !bg) return false;
    var white = +c[0] > 235 && +c[1] > 235 && +c[2] > 235;
    var light = +bg[0] > 235 && +bg[1] > 235 && +bg[2] > 225;
    var transparent = bg.length === 4 && +bg[3] === 0;
    return white && !light && !transparent;
  }
  function markToggles() {
    var groups = new Set(), bs = document.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) if (bs[i].parentElement) groups.add(bs[i].parentElement);
    groups.forEach(function (g) {
      var kids = Array.prototype.filter.call(g.children, function (k) { return k.tagName === 'BUTTON'; });
      if (kids.length < 2 || kids.some(function (k) { return ACTION.test(text(k)); })) return;
      kids.forEach(function (k) { k.setAttribute('aria-pressed', isFilled(k) ? 'true' : 'false'); });
    });
  }

  /* Het canvas is de figuur van de applet: geef het een naam, zodat een schermlezer het meldt. */
  function nameCanvas() {
    var h = text(document.querySelector('h1'));
    var cs = document.querySelectorAll('canvas:not([aria-label])');
    for (var i = 0; i < cs.length; i++) {
      cs[i].setAttribute('role', 'img');
      cs[i].setAttribute('aria-label', 'Simulatie: ' + (h || 'tekening'));
    }
  }

  /* Aan/uit-pillen ("Uit", "Open") krijgen de naam van hun rij erbij: "Elektronenstroom: uit". */
  function namePills() {
    var bs = document.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i], t = text(b);
      if (!/^(aan|uit|open|gesloten)$/i.test(t)) continue;
      var row = b.parentElement, lab = row && row.firstElementChild !== b ? text(row.firstElementChild) : '';
      if (lab) b.setAttribute('aria-label', lab + ': ' + t.toLowerCase());
    }
  }

  function enhance() { nameButtons(document); nameRanges(); markToggles(); namePills(); nameCanvas(); }
  function startNaming() {
    enhance();
    if (window.MutationObserver) {
      var q = null;
      new MutationObserver(function () {
        if (q) return;
        q = setTimeout(function () { q = null; enhance(); }, 150);
      }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'] });
    }
    document.addEventListener('input', function (e) { if (e.target.type === 'range') setTimeout(nameRanges, 0); }, true);
  }
  /* Canvassen tekenen soms vóór de webfonts binnen zijn; een resize laat elke applet
   * opnieuw tekenen zodra Atkinson Hyperlegible geladen is. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { window.dispatchEvent(new Event('resize')); });
  }

  if (document.body) startNaming();
  else document.addEventListener('DOMContentLoaded', startNaming);

  window.AppletCore = { fitCanvas: fitCanvas, observe: observe, dpr: dpr, MAX_W: MAX_W };
})();
