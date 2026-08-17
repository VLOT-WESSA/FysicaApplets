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

  window.AppletCore = { fitCanvas: fitCanvas, observe: observe, dpr: dpr, MAX_W: MAX_W };
})();
