// Levend deel van de bel: model.mjs (hierboven) drijft anker, stroom, veld, vonk en geluid.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const arm = q("armature"), fieldG = q("field"), sparkG = q("spark"), wavesG = q("waves"), gong = q("gong"), cap = q("cap");
  const flows = [...svg.querySelectorAll(".flow")];
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const P = DATA.P, D = DATA;
  const at = (p) => iso(p, P);
  const fmt = (v, d = 2) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };

  let s = { y: 0, v: 0, I: 0, pressed: false, closed: false };
  let slow = true, last = 0, frame = 0, visible = true, flowOff = 0;
  let peakI = 0, hits = [], waves = [], sparks = [], shake = 0, simTime = 0, wasClosed = false;

  const pt = (sArm, w, th) => [D.PIVOT[0] + sArm * Math.cos(th) - w * Math.sin(th), D.PIVOT[1] + sArm * Math.sin(th) + w * Math.cos(th)];
  const box = (s0, s1, w0, w1, th) => [pt(s0, w0, th), pt(s1, w0, th), pt(s1, w1, th), pt(s0, w1, th)];

  function drawArmature() {
    const th = Math.asin(Math.max(-1, Math.min(1, s.y / D.BALL.s)));
    const keep = extrude(box(D.KEEP.s0, D.KEEP.s1, D.KEEP.w0, D.KEEP.w1, th), D.KEEP.z0, D.KEEP.z1 - D.KEEP.z0, P, { bevel: 0.4 });
    const bar = extrude(box(D.BAR.s0, D.BAR.s1, D.BAR.w0, D.BAR.w1, th), D.BAR.z0, D.BAR.z1 - D.BAR.z0, P, { bevel: 0.4 });
    const rivet = extrude(box(D.RIVET.s - 2, D.RIVET.s + 2, D.BAR.w0 - 0.9, D.BAR.w0, th), D.BALL.z - 2, 4, P);
    const stalk = extrude(box(D.BAR.s1 - 2, D.BALL.s, D.BALL.w - 0.8, D.BALL.w + 0.8, th), D.BALL.z - 0.8, 1.6, P);
    const [bx, by] = pt(D.BALL.s, D.BALL.w, th);
    const [cx, cy] = at([bx, by, D.BALL.z]);
    const r = D.BALL.r * P.scale * Math.sqrt(1.6);
    arm.innerHTML =
      solidSvg(keep, { tone: "mid", className: "iron" }) + solidSvg(bar, { tone: "mid", className: "iron" }) +
      solidSvg(rivet, { tone: "hi", className: "silver" }) + solidSvg(stalk, { tone: "mid" }) +
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#ballGrad)" stroke="var(--anatomy-hi)" stroke-width="0.7" vector-effect="non-scaling-stroke"/>`;
    // veldlijnen in de spleet tussen de polen en het weekijzer
    const strength = Math.min(1, (s.I / (U / R)) ** 2);
    let d = "";
    if (strength > 0.02) {
      for (const lx of D.LEGS) for (const dx of [-4.5, 0, 4.5]) for (const z of [D.CORE_Z - 4, D.CORE_Z + 4]) {
        const x = lx + dx, sA = x - D.PIVOT[0];
        const ky = D.PIVOT[1] + sA * Math.sin(th) + D.KEEP.w1 * Math.cos(th);
        const a = at([x, D.POLE_Y, z]), b = at([x, ky, z]);
        d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      }
    }
    fieldG.innerHTML = d ? `<path d="${d}" opacity="${strength.toFixed(2)}"/>` : "";
    return th;
  }

  const ringPath = (r, z) => { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(at([D.GONG[0] + r * Math.cos(a), D.GONG[1] + r * Math.sin(a), z])); } return "M" + pts.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L"); };

  function effects(dtReal) {
    // geluidsgolven rond de bel (in schermtijd, zodat ze ook vertraagd te zien zijn)
    for (const w of waves) w.age += dtReal;
    waves = waves.filter((w) => w.age < 1.1);
    wavesG.innerHTML = waves.map((w) => { const t = w.age / 1.1; return `<path d="${ringPath(36 + 46 * t, 14)}" opacity="${(0.55 * (1 - t) * w.a).toFixed(2)}"/>`; }).join("");
    shake *= Math.exp(-dtReal / 0.18);
    const j = shake * Math.sin(performance.now() / 9);
    gong.setAttribute("transform", `translate(${(j * 0.8).toFixed(2)} 0)`);
    for (const sp of sparks) sp.age += dtReal;
    sparks = sparks.filter((sp) => sp.age < 0.35);
    const tip = at([D.SCREW.x, D.PIVOT[1] + D.BAR.w0 - 0.9, D.BALL.z]);
    sparkG.innerHTML = sparks.map((sp) => { const t = sp.age / 0.35, r = 2 + 5 * t; return `<circle cx="${tip[0].toFixed(1)}" cy="${tip[1].toFixed(1)}" r="${r.toFixed(1)}" fill="#ffd25a" stroke="#e0a020" stroke-width="0.8" opacity="${(0.95 * (1 - t)).toFixed(2)}"/>`; }).join("");
  }

  function panels() {
    peakI = Math.max(s.I, peakI * 0.97);
    setText("rI", fmt(peakI, 2) + " A");
    setText("rC", s.y < OPEN ? "gesloten" : "open (spleet " + fmt(Math.max(0, s.y - OPEN) * 0.674, 1) + " mm)");
    const h = hits.slice(-4), gapT = h.length > 2 ? (h[h.length - 1] - h[0]) / (h.length - 1) : 0;
    setText("rF", s.pressed && gapT > 0 && simTime - h[h.length - 1] < 0.2 ? "≈ " + fmt(1 / gapT, 0) + " Hz" : "–");
    let status, col, step = -1;
    if (!s.pressed) { status = "Kring open: de bel zwijgt"; col = "#9aa1a9"; }
    else {
      status = "De bel rinkelt"; col = "#27894f";
      if (s.closed) step = s.y < 0.3 ? 0 : 1; else step = s.v > 0 || s.y >= HIT - 0.01 ? 2 : 3;
    }
    setText("status", status); $("dot").style.background = col;
    [...$("steps").children].forEach((li, i) => { if (i === step) li.setAttribute("data-on", ""); else li.removeAttribute("data-on"); });
    // de actieve stap staat ook onder de tekening, zodat hij zichtbaar blijft als de zijbalk gescrold is
    const cap = !s.pressed ? -1 : slow || still.matches ? step : -2;
    if (cap !== shownStep) {
      shownStep = cap;
      nowNum.textContent = cap >= 0 ? String(cap + 1) : "";
      nowText.textContent = cap >= 0 ? $("steps").children[cap].textContent : cap === -1 ? "Druk op de knop K om de kring te sluiten." : "Zet ‘Vertraagd’ aan om de vier stappen één voor één te volgen.";
    }
    setText("cornerRead", !s.pressed ? "kring open" : (s.closed ? "kring gesloten · " : "kring onderbroken · ") + fmt(s.I, 2) + " A");
  }

  function tick(now) {
    const dtReal = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    const factor = slow || still.matches ? 1 / 40 : 1;
    let simDt = dtReal * factor;
    const H_STEP = 1e-5;
    while (simDt > 0) {
      const h = Math.min(H_STEP, simDt); simDt -= h; simTime += h;
      s = step(s, h);
      if (s.hit > 40) { hits.push(simTime); waves.push({ age: 0, a: Math.min(1, s.hit / 160) }); shake = Math.min(1.6, shake + s.hit / 120); }
      if (wasClosed && !s.closed && s.I > 0.3) sparks.push({ age: 0 });
      wasClosed = s.closed;
    }
    if (hits.length > 400) hits = hits.slice(-200);
    drawArmature();
    effects(dtReal);
    flowOff -= dtReal * 40 * (s.I / (U / R));
    for (const f of flows) { f.style.opacity = Math.min(1, s.I / (U / R)).toFixed(2); f.style.strokeDashoffset = flowOff.toFixed(1); }
    cap.setAttribute("transform", translateAlong(P, [0, 0, s.pressed ? -2.2 : 0]));
    panels();
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });

  // kogel met een zachte glans
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = '<radialGradient id="ballGrad" cx="35%" cy="32%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d3d7dc"/><stop offset="1" stop-color="#9aa2ab"/></radialGradient>';
  svg.prepend(defs);

  function press(on) {
    s.pressed = on; if (!on) hits = [];
    const b = $("run");
    b.textContent = on ? "Drukknop loslaten" : "Drukknop indrukken";
    b.className = on ? "btn-ink" : "btn-accent";
    run();
  }
  $("run").addEventListener("click", () => press(!s.pressed));
  $("reset").addEventListener("click", () => { s = { y: 0, v: 0, I: 0, pressed: false, closed: false }; hits = []; waves = []; sparks = []; shake = 0; press(false); parts.select(null); });
  $("slow").addEventListener("click", () => { slow = !slow; pressBtn($("slow"), slow); });
  pressBtn($("slow"), slow);
  cap.addEventListener("click", (ev) => { ev.stopPropagation(); press(!s.pressed); });
  document.addEventListener("keydown", (ev) => { if (ev.key === " " && ev.target === document.body) { ev.preventDefault(); press(!s.pressed); } });
  const now = document.createElement("div"), nowNum = document.createElement("b"), nowText = document.createElement("span");
  now.className = "now"; now.setAttribute("aria-live", "polite"); now.append(nowNum, nowText);
  document.querySelector(".legend").before(now);
  let shownStep = null;
  const parts = setupParts(PARTS, svg);
  press(false);
  window.__bel = { get s() { return s; } };
})();
