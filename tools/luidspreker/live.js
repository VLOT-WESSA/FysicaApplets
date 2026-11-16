// Levend deel van de luidspreker: magneetveld, stroom in de spoel, lorentzkracht, conus en lucht.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const mshell = q("mshell"), mcut = q("mcut"), airG = q("air"), marks = q("marks"), fieldG = q("field"), trace = q("trace"), ftext = q("ftext");
  const P = DATA.P, FR = DATA.FR;
  const at = (p) => iso(p, P);
  const fmt = (v, d = 2) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const onPlane = (a, R, psi) => [FR.o[0] + FR.ax[0] * a + R * Math.sin(psi) * FR.back[0], FR.o[1] + FR.ax[1] * a + R * Math.sin(psi) * FR.back[1], FR.o[2] + R * Math.cos(psi)];
  const PERIOD = 1.6;                       // zichtbare trillingstijd (s)
  const FULL = `0 0 ${DATA.W} ${DATA.H}`;

  let on = false, phase = 0, amp = 0, last = 0, frame = 0, visible = true, drawnD = null, zoom = true, zf = 1, dcVal = 0;
  const ctl = { f: 440, U: 2, mode: "ac" };
  const fOf = (v) => 50 * Math.pow(100, v);
  const pp = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);

  // magnetische veldlijnen: gesloten lussen door magneet, bovenplaat, spleet, poolkern en achterplaat.
  // Binnen de magneet van Z (achter) naar N (voor); in de spleet radiaal naar de as toe.
  let fd = "", gd = "";
  for (const psi of [0, Math.PI]) {
    [[28, 9.5], [35, 6.5], [42, 3.5]].forEach(([Rm, Rp]) => {
      const pts = [[4, Rm], [29, Rm], [29, 13.4], [29, Rp], [3, Rp], [3, Rm]];
      const scr = pts.map(([a, R]) => at(onPlane(a, R, psi)));
      fd += "M" + scr.map(pp).join("L") + "Z";
    });
    for (const a of [25.5, 27.5, 29.5, 31.5, 33.5]) gd += `M${pp(at(onPlane(a, 19.3, psi)))}L${pp(at(onPlane(a, 13.4, psi)))}`;
  }
  // pijltjes: in de magneet naar voren (Z → N), in de spleet naar de as
  let arrows = "";
  for (const psi of [0, Math.PI]) {
    for (const Rm of [28, 35, 42]) arrows += `<path class="loop" marker-end="url(#arrB)" d="M${pp(at(onPlane(11, Rm, psi)))}L${pp(at(onPlane(16, Rm, psi)))}"/>`;
    for (const a of [25.5, 27.5, 29.5, 31.5, 33.5]) arrows += `<path class="gap" marker-end="url(#arrB)" d="M${pp(at(onPlane(a, 19.3, psi)))}L${pp(at(onPlane(a, 13.6, psi)))}"/>`;
  }
  fieldG.innerHTML = `<path class="loop" d="${fd}"/>` + arrows +
    [0, Math.PI].map((psi) => { const c = at(onPlane(10.5, 52, psi)); const d = at(onPlane(19.5, 52, psi)); return `<text class="pole" x="${c[0].toFixed(1)}" y="${(c[1] + (psi ? 14 : -6)).toFixed(1)}">Z</text><text class="pole" x="${d[0].toFixed(1)}" y="${(d[1] + (psi ? 14 : -6)).toFixed(1)}">N</text>`; }).join("");

  const airNodes = DATA.AIR.map(() => { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("r", "1.15"); airG.appendChild(c); return c; });

  function drawMoving(d) {
    if (drawnD !== null && Math.abs(d - drawnD) < 0.04) return;
    drawnD = d;
    const M = moving(d), A = painter(P), B = painter(P);
    const bodies = [["spoel", M.former, "p", "xp"], ["spoel", M.coil, "cu", "xc"], ["ophanging", M.spider, "p", "xp"], ["conus", M.cone, "p", "xp"], ["conus", M.cap, "p", "xp"], ["ophanging", M.surround, "r", "xr"]];
    for (const [part, prof, cls, cut] of bodies) {
      A.setPart(part); halfBody(A, FR, prof, { cls, cuts: false, steps: 22, crease: part === "spoel" ? 0.82 : 0.2, smooth: part !== "spoel" });
      B.setPart(part); halfBody(B, FR, prof, { shells: false, cut });
    }
    // draaddoorsneden in de spoel (twee lagen windingen)
    B.setPart("spoel");
    for (const psi of [0, Math.PI]) for (let a = 25.8; a < 33; a += 1.45) for (const R of [15.5, 17.1]) B.dotAt(onPlane(a + d, R, psi), { size: 0.8, tone: "lo", bias: 5 });
    mshell.innerHTML = A.render(); mcut.innerHTML = B.render();
    const id = document.getElementById("stage").getAttribute("data-sel");
    if (id) [mshell, mcut].forEach((g) => g.querySelectorAll('[data-p="' + id + '"]').forEach((n) => n.classList.add("sel")));
  }

  function lorentzCard(I) {
    // B wijst naar beneden (naar de as), I uit of in het blad, F naar links of rechts (langs de as)
    const g = $("lfig");
    const out = I >= 0, mag = Math.min(1, Math.abs(I) * 1.4);
    const fx = out ? -1 : 1;                // F = I·ℓ × B: stroom uit het blad en B naar de as → F naar achter (naar de magneet)
    g.querySelector("#lI").innerHTML = mag < 0.05 ? "" : out ? '<circle cx="150" cy="62" r="11" class="ci"/><circle cx="150" cy="62" r="3.2" fill="#b07a10"/>' : '<circle cx="150" cy="62" r="11" class="ci"/><path d="M143 55l14 14M157 55l-14 14" stroke="#b07a10" stroke-width="2.2"/>';
    const L = 70 * mag;
    g.querySelector("#lF").setAttribute("d", mag < 0.05 ? "" : `M${150 + fx * 16} 62L${(150 + fx * (16 + L)).toFixed(1)} 62`);
    g.querySelector("#lFt").setAttribute("x", (150 + fx * (24 + L)).toFixed(1));
    g.querySelector("#lFt").style.opacity = mag < 0.05 ? 0 : 1;
    setText("lText", mag < 0.05 ? "Geen stroom: geen kracht." : out ? "Stroom uit het blad (⊙), B naar de as: F duwt de spoel naar achter." : "Stroom in het blad (⊗), B naar de as: F duwt de spoel naar voor.");
  }

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    amp += ((on ? 1 : 0) - amp) * (1 - Math.exp(-dt / 0.25));
    const dc = ctl.mode !== "ac";
    if (!dc) phase += dt / PERIOD * 2 * Math.PI;
    dcVal += ((dc ? (ctl.mode === "dcp" ? 1 : -1) : 0) - dcVal) * (1 - Math.exp(-dt / 0.2));
    const r = response(ctl.U, dc ? 5 : ctl.f);
    const big = ctl.U > 0 ? Math.min(7, 7 * Math.pow(r.x / 1.445e-3, 0.35)) : 0;
    const s = dc ? dcVal : Math.sin(phase);
    const I = amp * s;                         // + : stroom uit het blad bovenaan (⊙)
    const d = -amp * big * s;                  // de conus volgt de kracht (F = −I·ℓ·B langs de as)
    drawMoving(d);
    // lucht: longitudinale golf (bij gelijkstroom alleen een eenmalige duw)
    const kk = 2 * Math.PI * ctl.f / 343000;
    const ea = dc ? 0 : amp * big * 0.55;
    DATA.AIR.forEach(([a, z], i) => {
      const xi = -ea * Math.sin(phase - kk * (a - 90));
      const p = at(onPlane(a + xi, Math.abs(z - FR.o[2]), z >= FR.o[2] ? 0 : Math.PI));
      airNodes[i].setAttribute("cx", p[0].toFixed(1)); airNodes[i].setAttribute("cy", p[1].toFixed(1));
    });
    // stroomzin in de spoel (bovenaan ⊙, onderaan ⊗ of omgekeerd) en kracht op de spoel
    let m = "";
    const vis = Math.min(1, Math.abs(I) * 3);
    if (amp > 0.02 && vis > 0.03) {
      for (const psi of [0, Math.PI]) {
        const c = at(onPlane(29.4 + d, 16.3, psi));
        const out = (I >= 0) === (psi === 0);
        m += `<g opacity="${vis.toFixed(2)}"><circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="6"/>` + (out ? `<circle class="dotc" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="1.9"/>` : `<path class="sym" d="M${(c[0] - 3.6).toFixed(1)} ${(c[1] - 3.6).toFixed(1)}l7.2 7.2M${(c[0] + 3.6).toFixed(1)} ${(c[1] - 3.6).toFixed(1)}l-7.2 7.2"/>`) + `</g>`;
        const f0 = at(onPlane(29.4 + d, 22.5, psi)), f1 = at(onPlane(29.4 + d - I * 30, 22.5, psi));
        if (Math.abs(I) > 0.12) m += `<path class="force" marker-end="url(#arrF)" d="M${pp(f0)}L${pp(f1)}"/><text class="flab" x="${(f1[0] + (I > 0 ? -12 : 6)).toFixed(1)}" y="${(f1[1] + 4).toFixed(1)}">F</text>`;
      }
    }
    marks.innerHTML = m;
    lorentzCard(I);
    // generatorschermpje
    let t = "";
    for (let i = 0; i <= 40; i++) { const x = DATA.SCREEN.x + DATA.SCREEN.w * i / 40, y = DATA.SCREEN.y + 14 - amp * 6 * (dc ? dcVal : Math.sin(phase - i / 40 * 2 * Math.PI * 2)); t += (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2); }
    trace.setAttribute("d", t);
    const fs = dc ? (ctl.mode === "dcp" ? "+" : "−") + fmt(ctl.U, 1) + " V =" : fmt(ctl.f, 0) + " Hz"; if (ftext.textContent !== fs) ftext.textContent = fs;
    // zoom op de motor
    zf += ((zoom ? 1 : 0) - zf) * (1 - Math.exp(-dt / 0.25));
    const Z = DATA.ZOOM, vb = [Z[0] * zf, Z[1] * zf, DATA.W + (Z[2] - DATA.W) * zf, DATA.H + (Z[3] - DATA.H) * zf].map((v) => v.toFixed(1)).join(" ");
    if (svg.getAttribute("viewBox") !== vb) svg.setAttribute("viewBox", vb);
    panels(r, dc);
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const fmtLen = (m) => m >= 1 ? fmt(m, 2) + " m" : m >= 0.01 ? fmt(m * 100, 1) + " cm" : fmt(m * 1000, 1) + " mm";
  const fmtX = (m) => m >= 1e-4 ? fmt(m * 1000, 2) + " mm" : fmt(m * 1e6, 1) + " µm";
  function panels(r, dc) {
    const live = on && ctl.U > 0;
    setText("rI", live ? fmt(r.I, 2) + " A" : "–");
    setText("rF", live ? fmt(r.F, 2) + " N" : "–");
    setText("rX", live ? (dc ? fmtX(r.F / KMS) : fmtX(r.x)) : "–");
    setText("rL", dc ? "geen golf" : fmtLen(r.lambda));
    let st = "Stil";
    if (live && dc) st = ctl.mode === "dcp" ? "Gelijkstroom: de spoel wordt naar achter geduwd en blijft daar" : "Gelijkstroom omgekeerd: de spoel wordt naar voor geduwd";
    else if (live) st = (ctl.f < 200 ? "Lage toon" : ctl.f < 2000 ? "Middentoon" : "Hoge toon") + ": de kracht keert " + fmt(2 * ctl.f, 0) + " keer per seconde om";
    setText("status", st);
    $("dot").style.background = live ? "#27894f" : "#9aa1a9";
    setText("cornerRead", live ? (dc ? "gelijkstroom " + fmt(r.I, 2) + " A" : fmt(ctl.f, 0) + " Hz · λ = " + fmtLen(r.lambda)) : "stil");
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });

  function labels() { setText("vF", fmt(ctl.f, 0) + " Hz"); setText("vU", fmt(ctl.U, 1) + " V"); }
  function syncMode() { [...$("mode").children].forEach((b) => pressBtn(b, b.dataset.m === ctl.mode)); $("freq").disabled = ctl.mode !== "ac"; pressBtn($("zoom"), zoom); }
  $("freq").addEventListener("input", (e) => { ctl.f = Math.round(fOf(+e.target.value) / (ctl.f > 1000 ? 10 : 1)) * (ctl.f > 1000 ? 10 : 1); labels(); });
  $("vol").addEventListener("input", (e) => { ctl.U = +e.target.value; labels(); });
  [...$("mode").children].forEach((b) => { b.className = "toggle"; b.addEventListener("click", () => { ctl.mode = b.dataset.m; syncMode(); }); });
  $("zoom").addEventListener("click", () => { zoom = !zoom; syncMode(); run(); });
  function setOn(v) { on = v; const b = $("run"); b.textContent = on ? "Stroom uit" : "Stroom aan"; b.className = on ? "btn-ink" : "btn-accent"; run(); }
  $("run").addEventListener("click", () => setOn(!on));
  $("reset").addEventListener("click", () => { ctl.f = 440; ctl.U = 2; ctl.mode = "ac"; zoom = true; $("freq").value = Math.log(440 / 50) / Math.log(100); $("vol").value = 2; labels(); syncMode(); setOn(false); parts.select(null); });
  const parts = setupParts(PARTS, svg);
  $("freq").value = Math.log(440 / 50) / Math.log(100);
  labels(); syncMode(); setOn(false);
  window.__ls = { ctl, get amp() { return amp; } };
})();
