// Levend deel van de MRI-scanner: spins in het fantoom, RF-puls, relaxatie en signaal.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const q = (name) => document.querySelector('[data-part="' + name + '"]');
  const spinG = q("spins"), rfG = q("rfglow"), b0 = q("b0");
  const P = DATA.P, PF = DATA.PF, PH = DATA.PH, FR = DATA.FR;
  const fmt = (v, d = 1) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const TISSUE = { water: { T1: 3.0, T2: 1.6, name: "water" }, vet: { T1: 0.26, T2: 0.08, name: "vet" }, grijs: { T1: 1.3, T2: 0.11, name: "grijze stof" } };
  const s = { B: 1.5, tissue: "water", tPulse: -1, grad: false, nproj: 1 };
  const W_VIS = 2 * Math.PI * 0.7;                // zichtbare precessie (rad/s)
  const up = [0, 0, 1], bk = PF.back, ax = PF.ax;
  // spins in het snijvlak van het fantoom
  const SP = [];
  for (const a of [48, 60, 70, 83, 96, 108, 120]) for (const z of [-20, -8, 4, 16]) {
    if (a > 72 && a < 94 && z > -16 && z < 16) continue;
    SP.push({ a, z, dw: 0, ph0: Math.random() * Math.PI * 2, tilt0: 0.25 + Math.random() * 0.2 });
  }
  const gw = (p) => (s.grad ? 1.6 * (p.a - (PH.a0 + PH.a1) / 2) / (PH.a1 - PH.a0) : 0);   // extra hoeksnelheid door de gradiënt
  const at = (p) => iso(p, P);
  const pt = (a, z, b = 0) => [PF.o[0] + ax[0] * a + bk[0] * b, PF.o[1] + ax[1] * a + bk[1] * b, PF.o[2] + z];
  let last = 0, frame = 0, visible = true, t = 0, hist = [];
  const reseed = () => { const T2 = TISSUE[s.tissue].T2; SP.forEach((p) => { p.dw = (Math.random() - 0.5) * 2 * (4 / T2) * 0.35; }); };

  // B0-veldlijn langs de as van de tunnel (pijl in de richting van het veld)
  { const p0 = at([FR.o[0] + ax[0] * -30, FR.o[1] + ax[1] * -30, FR.o[2] + 50]), p1 = at([FR.o[0] + ax[0] * (DATA.LEN + 30), FR.o[1] + ax[1] * (DATA.LEN + 30), FR.o[2] + 50]); b0.setAttribute("d", `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`); b0.setAttribute("marker-end", "url(#arrB)"); }

  function spinVec(p, tp) {
    const T = TISSUE[s.tissue];
    let mz, mt, ph;
    const w = W_VIS * (1 + gw(p));
    if (tp < 0) { mz = Math.cos(p.tilt0); mt = Math.sin(p.tilt0); ph = p.ph0 + w * t; }
    else {
      mz = 1 - (1 - 0) * Math.exp(-tp / T.T1);
      mt = Math.exp(-tp / T.T2) + (1 - Math.exp(-tp / T.T2)) * Math.sin(p.tilt0) * 0.6;
      ph = w * t + p.dw * tp + (1 - Math.exp(-tp / T.T2)) * p.ph0;
    }
    const n = Math.hypot(mz, mt) || 1;
    mz /= n; mt /= n;
    return [ax[0] * mz + (up[0] * Math.cos(ph) + bk[0] * Math.sin(ph)) * mt, ax[1] * mz + (up[1] * Math.cos(ph) + bk[1] * Math.sin(ph)) * mt, ax[2] * mz + (up[2] * Math.cos(ph) + bk[2] * Math.sin(ph)) * mt];
  }
  function draw() {
    const tp = s.tPulse < 0 ? -1 : t - s.tPulse;
    let d = "", net = [0, 0, 0];
    for (const p of SP) {
      const v = spinVec(p, tp);
      net = [net[0] + v[0], net[1] + v[1], net[2] + v[2]];
      const c = pt(p.a, p.z), L = 9;
      const a = at(c), b = at([c[0] + v[0] * L, c[1] + v[1] * L, c[2] + v[2] * L]);
      d += `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" style="stroke:${colOf(p)}" marker-end="url(#arrS)"/>`;
    }
    net = net.map((x) => x / SP.length);
    // netto magnetisatie vooraan op het fantoom
    const c = pt(PH.a1 + 18, 0), Ln = 26;
    const a = at(c), b = at([c[0] + net[0] * Ln, c[1] + net[1] * Ln, c[2] + net[2] * Ln]);
    spinG.innerHTML = d + `<path class="net" d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" marker-end="url(#arrM)"/>`;
    return { net, tp };
  }
  // kleur per frequentie (alleen met gradiënt), dezelfde als in het profiel
  const colOf = (p) => s.grad ? `hsl(${(200 - 180 * (p.a - PH.a0) / (PH.a1 - PH.a0)).toFixed(0)} 70% 45%)` : "#c8534a";
  function graph() { return; 
    const T = TISSUE[s.tissue], X = 278 / 6;
    let f = "", e = "", m = "";
    if (s.tPulse >= 0) {
      const tp = t - s.tPulse;
      for (let i = 0; i <= 300; i++) {
        const tt = i / 300 * Math.min(6, tp);
        const env = Math.exp(-tt / T.T2), sig = env * Math.cos(W_VIS * 3 * tt);
        f += (i ? "L" : "M") + (12 + tt * X).toFixed(1) + " " + (40 - 24 * sig).toFixed(1);
        e += (i ? "L" : "M") + (12 + tt * X).toFixed(1) + " " + (40 - 24 * env).toFixed(1);
        m += (i ? "L" : "M") + (12 + tt * X).toFixed(1) + " " + (96 - 30 * (1 - Math.exp(-tt / T.T1))).toFixed(1);
      }
    }
    $("fidTrace").setAttribute("d", f); $("fidEnv").setAttribute("d", e); $("mzTrace").setAttribute("d", m);
  }
  // profiel: signaal per frequentie. Fantoom langs de as: water van a0 tot a1, met het blok (minder water) van 74 tot 92.
  function waterAt(a) { if (a < PH.a0 || a > PH.a1) return 0; return a > 74 && a < 92 ? 1 - 28 / (2 * PH.r) : 1; }
  function profile() {
    const x0 = 20, x1 = 290;
    const bl = s.grad ? `M${x0} 52L${x1} 24` : `M${x0} 38L${x1} 38`;
    $("bLine").setAttribute("d", bl);
    let g = "";
    const n = 45;
    if (s.grad) {
      for (let i = 0; i < n; i++) {
        const a = PH.a0 + (PH.a1 - PH.a0) * (i + 0.5) / n, h = 46 * waterAt(a);
        const x = x0 + (x1 - x0) * i / n;
        g += `<rect x="${x.toFixed(1)}" y="${(140 - h).toFixed(1)}" width="${((x1 - x0) / n - 1).toFixed(1)}" height="${h.toFixed(1)}" fill="hsl(${(200 - 180 * (i + 0.5) / n).toFixed(0)} 70% 45%)"/>`;
      }
    } else g = `<rect x="${(x0 + (x1 - x0) / 2 - 4).toFixed(1)}" y="92" width="8" height="48" fill="#c8534a"/>`;
    $("bars").innerHTML = g;
    $("gradHelp").textContent = s.grad ? "Met de gradiënt is het veld (en dus de larmorfrequentie) aan de ene kant iets groter dan aan de andere. Elke frequentie hoort bij één plaats: het spectrum is een profiel van het fantoom. Waar het kunststof blok zit, is er minder signaal." : "Zonder gradiënt hebben alle spins dezelfde larmorfrequentie: je meet één piek en weet niet waar het signaal vandaan komt.";
  }
  // reconstructie uit projecties (gefilterde terugprojectie) van de doorsnede van het fantoom
  const NG = 96;
  const truth = new Float32Array(NG * NG);
  for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
    const x = (i + 0.5) / NG, y = (j + 0.5) / NG;
    const inBottle = x > 0.1 && x < 0.9 && y > 0.28 && y < 0.72;
    const inBlock = x > 0.1 + 0.8 * (74 - PH.a0) / (PH.a1 - PH.a0) && x < 0.1 + 0.8 * (92 - PH.a0) / (PH.a1 - PH.a0) && y > 0.36 && y < 0.64;
    truth[j * NG + i] = inBottle && !inBlock ? 1 : 0;
  }
  function recon() {
    const N = s.nproj, img = new Float32Array(NG * NG), M = NG, half = NG / 2;
    const ker = []; for (let k = -M; k <= M; k++) ker.push(-2 / (Math.PI * Math.PI * (4 * k * k - 1)));   // Shepp-Logan
    for (let q = 0; q < N; q++) {
      const th = Math.PI * q / N, c = Math.cos(th), sn = Math.sin(th);
      const proj = new Float32Array(2 * M + 2);
      for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
        const v = truth[j * NG + i]; if (!v) continue;
        const x = (i - half + 0.5) * c + (j - half + 0.5) * sn + M, i0 = Math.floor(x), f = x - i0;
        proj[i0] += v * (1 - f); proj[i0 + 1] += v * f;
      }
      let use = proj;
      if (N > 1) { use = new Float32Array(2 * M + 2); for (let a = 0; a < 2 * M + 2; a++) { let acc = 0; for (let k = -M; k <= M; k++) { const b = a - k; if (b >= 0 && b < 2 * M + 2) acc += proj[b] * ker[k + M]; } use[a] = acc; } }
      for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
        const x = (i - half + 0.5) * c + (j - half + 0.5) * sn + M, i0 = Math.floor(x), f = x - i0;
        img[j * NG + i] += use[i0] * (1 - f) + use[i0 + 1] * f;
      }
    }
    let mx = 0, mn = 0; for (const v of img) { mx = Math.max(mx, v); mn = Math.min(mn, v); }
    const lo = N > 1 ? 0 : mn;
    const cx = $("recon").getContext("2d"), id = cx.createImageData(NG, NG);
    for (let k = 0; k < NG * NG; k++) { const v = Math.max(0, Math.min(255, 255 * (img[k] - lo) / ((mx - lo) || 1))); id.data[4 * k] = id.data[4 * k + 1] = id.data[4 * k + 2] = v; id.data[4 * k + 3] = 255; }
    cx.putImageData(id, 0, 0);
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now; t += dt;
    const { tp } = draw();
    // RF-puls: korte gloed in de RF-spoel
    const glow = s.tPulse >= 0 && tp < 0.6 ? Math.sin(Math.PI * tp / 0.6) : 0;
    if (glow > 0.01) {
      let d = "";
      for (let i = 0; i < 4; i++) { const r = 64 - 8 - i * 6 - (tp / 0.6) * 10; if (r < 30) continue; const pts = []; for (let j = 0; j <= 16; j++) { const psi = Math.PI * j / 16; pts.push(at([FR.o[0] + ax[0] * 90 + r * Math.sin(psi) * bk[0], FR.o[1] + ax[1] * 90 + r * Math.sin(psi) * bk[1], FR.o[2] + r * Math.cos(psi)])); } d += "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L"); }
      rfG.innerHTML = `<path d="${d}"/>`; rfG.setAttribute("opacity", glow.toFixed(2));
    } else if (rfG.getAttribute("opacity") !== "0") rfG.setAttribute("opacity", "0");
    graph();
    const T = TISSUE[s.tissue];
    setText("rR", fmt(T.T1, 2) + " s / " + fmt(T.T2, 2) + " s");
    setText("rT", s.tPulse < 0 ? "–" : fmt(tp, 1) + " s");
    let st = "Spins in evenwicht langs B₀", col = "#9aa1a9";
    if (s.tPulse >= 0) {
      if (tp < 0.6) { st = "RF-puls: de spins kantelen 90°"; col = "#e0a020"; }
      else if (Math.exp(-tp / T.T2) > 0.1) { st = "De spins draaien samen rond: signaal in de spoel"; col = "#27894f"; }
      else if (1 - Math.exp(-tp / T.T1) < 0.95) { st = "Uit de pas (T₂); ze richten zich weer langs B₀ (T₁)"; col = "#c9822c"; }
      else { st = "Terug in evenwicht: klaar voor een nieuwe puls"; col = "#9aa1a9"; }
    }
    setText("status", st); $("dot").style.background = col;
    setText("cornerRead", "B₀ = " + fmt(s.B, 1) + " T · f = " + fmt(42.58 * s.B, 1) + " MHz");
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
  function sync() {
    [...$("field").children].forEach((b) => pressBtn(b, +b.dataset.b === s.B));
    [...$("tissue").children].forEach((b) => pressBtn(b, b.dataset.t === s.tissue));
    setText("rF", fmt(42.58 * s.B, 1) + " MHz");
  }
  [...$("field").children].forEach((b) => { b.className = "toggle"; b.addEventListener("click", () => { s.B = +b.dataset.b; sync(); }); });
  [...$("tissue").children].forEach((b) => { b.className = "toggle"; b.addEventListener("click", () => { s.tissue = b.dataset.t; reseed(); s.tPulse = -1; sync(); }); });
  $("pulse").addEventListener("click", () => { reseed(); s.tPulse = t; });
  $("grad").addEventListener("click", () => { s.grad = !s.grad; pressBtn($("grad"), s.grad); profile(); });
  $("nproj").addEventListener("input", (e) => { s.nproj = +e.target.value; setText("vN", String(s.nproj)); recon(); });
  $("reset").addEventListener("click", () => { s.B = 1.5; s.tissue = "water"; s.tPulse = -1; s.grad = false; s.nproj = 1; $("nproj").value = 1; setText("vN", "1"); pressBtn($("grad"), false); reseed(); sync(); profile(); recon(); parts.select(null); });
  const parts = setupParts(PARTS, svg);
  pressBtn($("grad"), false); reseed(); sync(); profile(); recon(); run();
  window.__mri = s;
})();
