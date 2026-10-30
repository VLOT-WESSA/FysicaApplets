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
  function startNaming() {
    nameButtons(document);
    if (window.MutationObserver) {
      var q = null;
      new MutationObserver(function () {
        if (q) return;
        q = setTimeout(function () { q = null; nameButtons(document); }, 200);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.body) startNaming();
  else document.addEventListener('DOMContentLoaded', startNaming);

  window.AppletCore = { fitCanvas: fitCanvas, observe: observe, dpr: dpr, MAX_W: MAX_W };
})();
