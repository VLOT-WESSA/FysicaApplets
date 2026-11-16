import * as k from "./iso-kit.mjs";
// ---------------------------------------------------------------- schilder
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function painter(P) {
  const cam = k.cameraOf(P);
  const V = [cam.cosA * cam.cosE, cam.sinA * cam.cosE, cam.sinE];
  const L = unit([-cam.sinA, cam.cosA, 0.9]);
  const items = [];
  let part = "";
  const setPart = (p) => { part = p; };
  const depth = (p) => dot(p, V);
  const tone = (n) => {
    if (n[2] > 0.8) return "t";
    const s = (dot(n, L) + 1) / 2;
    return String(Math.min(3, Math.max(0, Math.floor(s * 4.2 - 0.3))));
  };

  // Een raster van vierhoeken (u, v) → punt. De normaal wijst naar buiten als (pu × pv) dat doet;
  // met flip: true andersom. Randlijnen: silhouet, open rand en knik.
  function patch(fn, nu, nv, { keep = null, toward = null, wrapU = false, wrapV = false, flip = false, cls = "m", crease = 0.82, edges = true, bias = 0, edgeTone = "hi", creaseTone = "mid", hideEdges = {} } = {}) {
    const pts = [];
    for (let i = 0; i <= nu; i++) {
      const row = [];
      for (let j = 0; j <= nv; j++) row.push(fn(i / nu, j / nv));
      pts.push(row);
    }
    const F = [];
    for (let i = 0; i < nu; i++) {
      F.push([]);
      for (let j = 0; j < nv; j++) {
        const a = pts[i][j], b = pts[i + 1][j], c = pts[i + 1][j + 1], d = pts[i][j + 1];
        let n = unit(cross(sub(c, a), sub(d, b)));
        if (flip) n = [-n[0], -n[1], -n[2]];
        if (toward) {
          const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
          if (dot(n, toward(m)) < 0) n = [-n[0], -n[1], -n[2]];
        }
        const vis = dot(n, V) > 1e-6;
        F[i].push({ quad: [a, b, c, d], n, vis });
      }
    }
    const get = (i, j) => {
      if (wrapU) i = (i + nu) % nu; if (wrapV) j = (j + nv) % nv;
      if (i < 0 || j < 0 || i >= nu || j >= nv) return null;
      return F[i][j];
    };
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const f = F[i][j];
      if (!f.vis) continue;
      if (keep && !keep(f.quad)) continue;
      const [a, b, c, d] = f.quad;
      const lines = [];
      if (edges) {
        // randen: (a,b)=j-zijde, (b,c)=i+1-zijde, (c,d)=j+1-zijde, (d,a)=i-zijde
        const sides = [[[a, b], get(i, j - 1), "j0"], [[b, c], get(i + 1, j), "i1"], [[c, d], get(i, j + 1), "j1"], [[d, a], get(i - 1, j), "i0"]];
        for (const [seg, nb, side] of sides) {
          if (!nb) { if (!hideEdges[side]) lines.push([seg, edgeTone]); }
          else if (!nb.vis) lines.push([seg, edgeTone]);
          else if (dot(nb.n, f.n) < crease) lines.push([seg, creaseTone]);
        }
      }
      const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
      items.push({ key: depth(mid) + bias, poly: [a, b, c, d], cls: cls + tone(f.n), lines, part });
    }
  }

  // Een vlakke veelhoek (bv. een snijvlak) in stukken, met één klasse en optionele randlijnen.
  function poly(points, { cls = "m", n = null, lines = [], bias = 0, keyAt = null } = {}) {
    const nn = n || unit(cross(sub(points[1], points[0]), sub(points[2], points[0])));
    if (dot(nn, V) <= 1e-6) return;
    const mid = keyAt || points.reduce((s, p) => [s[0] + p[0] / points.length, s[1] + p[1] / points.length, s[2] + p[2] / points.length], [0, 0, 0]);
    items.push({ key: depth(mid) + bias, poly: points, cls: cls.endsWith("!") ? cls.slice(0, -1) : cls + tone(nn), lines, part });
  }

  // Lijnen op een vlak (naden, bouten): gesorteerd per stukje, net vóór hun vlak.
  function line(points, { tone: t = "lo", n = null, bias = 0.35, dots = false } = {}) {
    if (n && dot(n, V) <= 0.02) return;
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i], b = points[i + 1];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
      items.push({ key: depth(mid) + bias, poly: null, lines: [[[a, b], t]], part });
    }
  }
  function dotAt(p, { n = null, size = 0.5, tone: t = "mid", bias = 0.4 } = {}) {
    if (n && dot(n, V) <= 0.05) return;
    items.push({ key: depth(p) + bias, dot: p, size, tone: t, part });
  }
  function raw(svg, key) { items.push({ key, svg: `<g data-p="${part}">${svg}</g>` }); }

  function render() {
    items.sort((p, q) => p.key - q.key);
    const out = [];
    const r1 = (v) => Math.round(v * 10) / 10;
    // relatieve padcommando's op tienden: kleiner bestand, zelfde tekening
    const compact = (pts) => {
      let px = Math.round(pts[0][0] * 10), py = Math.round(pts[0][1] * 10);
      let d = "M" + px / 10 + " " + py / 10;
      for (let i = 1; i < pts.length; i++) {
        const x = Math.round(pts[i][0] * 10), y = Math.round(pts[i][1] * 10);
        d += (i === 1 ? "l" : " ") + (x - px) / 10 + " " + (y - py) / 10;
        px = x; py = y;
      }
      return d.replace(/ -/g, "-").replace(/l-/g, "l-");
    };
    const flat = (pts) => {
      let s = pts.map((p) => k.iso(p, P));
      // tegenwijzerzin op het scherm, zodat samengevoegde vlakken elkaar nooit uitsparen
      let area = 0;
      for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; area += a[0] * b[1] - b[0] * a[1]; }
      if (area < 0) s = s.reverse();
      return compact(s) + "z";
    };
    let run = null;
    const flush = () => { if (run) { out.push(`<path class="${run.cls}" data-p="${run.part}" d="${run.d.join("")}"/>`); run = null; } };
    let lineRun = null;
    const flushLines = () => { if (lineRun) { out.push(`<path class="l${lineRun.tone[0]}" data-p="${lineRun.part}" d="${lineRun.d.join("")}"/>`); lineRun = null; } };
    for (const it of items) {
      if (it.svg) { flush(); flushLines(); out.push(it.svg); continue; }
      if (it.dot) {
        flush(); flushLines();
        const [x, y] = k.iso(it.dot, P);
        out.push(`<circle class="dt" data-p="${it.part}" data-tone="${it.tone}" cx="${r1(x)}" cy="${r1(y)}" r="${it.size}"/>`);
        continue;
      }
      if (it.poly) {
        flushLines();
        if (!run || run.cls !== it.cls || run.part !== it.part) { flush(); run = { cls: it.cls, part: it.part, d: [] }; }
        run.d.push(flat(it.poly));
      }
      if (it.lines.length) {
        flush();
        for (const [[a, b], t] of it.lines) {
          if (!lineRun || lineRun.tone !== t || lineRun.part !== it.part) { flushLines(); lineRun = { tone: t, part: it.part, d: [] }; }
          lineRun.d.push(compact([k.iso(a, P), k.iso(b, P)]));
        }
        if (it.poly) flushLines();
      }
    }
    flush(); flushLines();
    return out.join("");
  }
  return { patch, poly, line, dotAt, raw, render, items, V, depth, setPart };
}
