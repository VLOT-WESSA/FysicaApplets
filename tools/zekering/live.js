// Levend deel van de automatische zekering: knop, contactarm, spoel met anker, veren en (optie) bimetaal.
(function () {
  const $ = (id) => document.getElementById(id);
  const svg = document.querySelector("#stage svg");
  const fig = svg.querySelector(".fig");
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const movG = q("moving"), pathI = q("pathI"), arcG = q("arc");
  const P = DATA.P;
  const w3 = ([x, z], y) => [x * DATA.K + DATA.MX, y * DATA.K + DATA.MY, z * DATA.K + DATA.MZ];
  const prism = eval("(" + prismSrc.toString() + ")");
  const amp = (I) => (I >= 100 ? fmt(I, 0) : fmt(I, 1)) + " A";
  const fmt = (v, d = 1) => v.toLocaleString("nl-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const setText = (id, t) => { const n = $(id); if (n.textContent !== t) n.textContent = t; };
  const sp = (p, y = -16) => iso(w3(p, y), P);
  const pathD = (pts, y) => "M" + pts.map((p) => { const v = sp(p, y); return v[0].toFixed(1) + " " + v[1].toFixed(1); }).join("L");
  const IN = 16, TAU = 20, TRIP_T = 1.28;
  const smooth = (pts, it = 4) => {
    let p = pts;
    for (let k = 0; k < it; k++) {
      const q = [p[0]];
      for (let i = 0; i + 1 < p.length; i++) { const a = p[i], b = p[i + 1]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      q.push(p[p.length - 1]); p = q;
    }
    return p;
  };
  const LOADS = [["Waterkoker", 2000], ["Kachel", 2000], ["Microgolf", 1200], ["Stofzuiger", 900]];
  const s = { type: "veer", iTrip: 20, closed: false, open: 1, lift: 0, theta: 0, loads: [true, false, false, false], shortT: 0, arc: 0, msg: "", tripT: -9, tripI: 0 };
  let last = 0, frame = 0, visible = true, drawn = "", flowOff = 0, why = "", t = 0, dir = 1, shownStep = -1;

  function current() {
    if (!s.closed) return 0;
    const sum = LOADS.reduce((a, [, p], i) => a + (s.loads[i] ? p : 0), 0);
    return sum / 230 + (s.shortT > 0 ? 800 : 0);
  }
  function draw(I) {
    const bend = s.type === "thermisch" ? Math.min(1.4, s.theta / TRIP_T) : 0;
    const fieldA = Math.min(1, I / magTrip());
    const key = [s.open.toFixed(3), s.lift.toFixed(3), bend.toFixed(2), s.type, fieldA.toFixed(2), fieldA > 0.02 ? dir : 0].join(",");
    if (key === drawn) return;
    drawn = key;
    const m = mechanism(s.open, s.lift);
    const A = PA.painter(P);
    A.setPart("anker"); prism(A, m.leverBar, -24, -14, "lk"); prism(A, m.foot, -24, -14, "lk"); prism(A, m.post, -24, -14, "lk"); prism(A, m.plate, -28, -8, "fe");
    A.setPart("contact"); prism(A, m.arm, -22, -14, "ar");
    A.setPart("knop"); prism(A, m.link, -20, -12, "lk"); prism(A, m.knob, -27, -9, "kn");
    let bmTop = null;
    if (s.type === "thermisch") { const bm = bimetal(bend); A.setPart("bimetaal"); prism(A, bm.strip, -24, -12, "bm"); bmTop = bm.top; }
    let extra = "";
    extra += `<path data-p="contact" class="wire" d="${pathD(m.hook, -12)}"/>`;
    extra += `<path data-p="veren" class="spring" d="${pathD(springPath(SPRING_TOP, m.springTopEnd, 10, 6), -16)}"/>`;
    extra += `<path data-p="veren" class="spring" d="${pathD(springPath(SPRING_BOT, m.springBotEnd, 8, 5), -16)}"/>`;
    // soepel gevlochten draadje: hangt in een losse boog van de arm naar het bovenste lipje van de spoel
    const armLead = [ARM_PIVOT[0] + 50 * Math.cos(m.aArm), ARM_PIVOT[1] + 50 * Math.sin(m.aArm)];
    const topTab = [COIL.cx - 16, COIL.z1 + 6];
    // losse lus: eerst een stukje omlaag, dan in een ruime boog naar het lipje (lengte blijft ongeveer gelijk)
    const leadPts = smooth([armLead, [armLead[0] - 4, armLead[1] - 16], [armLead[0] + 4, topTab[1] - 22], [topTab[0] - 10, topTab[1] - 14], [topTab[0], topTab[1] - 6], topTab]);
    extra += `<path data-p="contact" class="lead" d="${pathD(leadPts, -12)}"/>`;
    // vaste draad van het onderste lipje van de spoel: langs de bodem van het huis naar de onderste klem (of naar de top van het bimetaal)
    const botTab = [COIL.cx + COIL.r + 6, COIL.z0 + 3];
    const out = s.type === "thermisch"
      ? smooth([botTab, [botTab[0] + 12, botTab[1] + 2], [bmTop[0] + 4, bmTop[1] + 18], [bmTop[0], bmTop[1] + 6], [bmTop[0], bmTop[1] + 1]])
      : smooth([botTab, [botTab[0] + 16, botTab[1]], [262, 70], [292, 58], [312, 54], [322, 54]]);
    extra += `<path data-p="spoel" class="wire" d="${pathD(out, -12)}"/>`;
    const bmFoot = smooth([[252, 62], [254, 52], [270, 46], [300, 50], [322, 54]]);
    if (s.type === "thermisch") extra += `<path data-p="bimetaal" class="wire" d="${pathD(bmFoot, -12)}"/>`;
    // soldeerlipjes op de flenzen van de spoel
    extra += `<path data-p="spoel" class="wire" d="${pathD([[topTab[0], topTab[1] - 2], [topTab[0], topTab[1] + 4]], -14)}"/><path data-p="spoel" class="wire" d="${pathD([[botTab[0] - 6, botTab[1]], [botTab[0], botTab[1]]], -14)}"/>`;
    if (fieldA > 0.02) {
      const C = COIL, lp = (dx) => [[C.cx, C.z1 + 4], [C.cx + dx * 0.4, C.z1 + 26], [C.cx + dx, C.z1 + 10], [C.cx + dx * 1.05, (C.z0 + C.z1) / 2], [C.cx + dx, C.z0 - 6], [C.cx + dx * 0.4, m.plateTop[1] - 10], [C.cx, m.plateTop[1] + 2]];
      // veldlijnen met een pijl halverwege; de zin keert om met de wisselstroom
      let d = "", heads = "";
      const f1 = (v) => v.toFixed(1);
      for (const dx of [-34, -48, 34, 48]) {
        const pts = lp(dx); d += pathD(pts, -4);
        const a = sp(pts[2], -4), b = sp(pts[4], -4), c = sp(pts[3], -4), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const ux = dir * (b[0] - a[0]) / l, uy = dir * (b[1] - a[1]) / l;
        heads += `M${f1(c[0] + ux * 7)} ${f1(c[1] + uy * 7)}L${f1(c[0] - ux * 4 - uy * 4.5)} ${f1(c[1] - uy * 4 + ux * 4.5)}L${f1(c[0] - ux * 4 + uy * 4.5)} ${f1(c[1] - uy * 4 - ux * 4.5)}Z`;
      }
      const op = (0.25 + 0.75 * fieldA).toFixed(2);
      extra += `<path data-p="spoel" class="bfield" d="${d}" style="opacity:${op}"/><path data-p="spoel" class="bhead" d="${heads}" style="opacity:${op}"/>`;
    }
    const kTag = sp([m.knob[1][0] - 14, m.knob[1][1] + 12], -9), sTag = sp([COIL.cx + 30, COIL.z1 - 24], -8), pTag = sp([m.plateTop[0] + 26, m.plateTop[1] - 8], -8);
    extra += `<text class="tagk" x="${kTag[0].toFixed(1)}" y="${kTag[1].toFixed(1)}">(k)</text><text class="tagk" x="${sTag[0].toFixed(1)}" y="${sTag[1].toFixed(1)}">(s)</text><text class="tagk" x="${pTag[0].toFixed(1)}" y="${pTag[1].toFixed(1)}">(p)</text>`;
    movG.innerHTML = A.render() + extra;
    const sel = document.getElementById("stage").getAttribute("data-sel");
    if (sel) movG.querySelectorAll('[data-p="' + sel + '"]').forEach((n) => n.classList.add("sel"));
    // stroompad: over de strip, door de arm, het draadje, de spoel (in een schroeflijn gesuggereerd door rechte lijn) en de draad naar de klem
    const along = (n) => Array.from({ length: n + 1 }, (_, i) => [armLead[0] + (m.tip[0] - armLead[0]) * (1 - i / n), armLead[1] + (m.tip[1] - armLead[1]) * (1 - i / n)]);
    const path = [[344, 270], [212, 269], m.tip, ...along(4).slice(1), ...leadPts.slice(1), [COIL.cx, COIL.z1], [COIL.cx, COIL.z0], botTab, ...out.slice(1), ...(s.type === "thermisch" ? bmFoot.slice(1) : []), [344, 54]];
    pathI.setAttribute("d", pathD(path, -2));
  }
  function trip(kind, I) { why = kind; s.tripI = I; s.closed = false; s.tripT = t; s.arc = 1; syncLever(); }
  const magTrip = () => s.type === "thermisch" ? 5 * IN : s.iTrip;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now; t += dt;
    s.shortT = Math.max(0, s.shortT - dt);
    const I = current();
    const ratio = Math.min(3, I / IN);
    if (s.type === "thermisch") s.theta += (ratio * ratio - s.theta) * dt / TAU; else s.theta += (0 - s.theta) * dt / TAU;
    const wantLift = s.closed ? Math.min(0.3, 0.3 * (I / magTrip()) ** 2) : (t - s.tripT < 0.5 && why === "magnetisch" ? 1 : 0);
    s.lift += (wantLift - s.lift) * (1 - Math.exp(-dt / (wantLift > s.lift ? 0.03 : 0.25)));
    if (s.closed && I > magTrip()) trip("magnetisch", I);
    else if (s.closed && s.type === "thermisch" && s.theta > TRIP_T) trip("thermisch", I);
    s.open += ((s.closed ? 0 : 1) - s.open) * (1 - Math.exp(-dt / (s.closed ? 0.15 : 0.04)));
    s.arc = Math.max(0, s.arc - dt / 0.45);
    // wisselstroom, sterk vertraagd getoond: stroom en veld keren elke seconde om
    const ac = Math.sin(Math.PI * t);
    dir = ac >= 0 ? 1 : -1;
    draw(I);
    flowOff -= dt * 1.5 * ac * Math.min(80, 8 + I * 1.5);
    pathI.style.opacity = I > 0 ? Math.min(1, 0.4 + I / 25).toFixed(2) : "0";
    pathI.style.strokeDashoffset = flowOff.toFixed(1);
    const hot = Math.min(1, s.theta / TRIP_T), hq = Math.round(hot * 25) * 4;
    setVar(fig, "--bm", `color-mix(in oklab, #c9ced4, #c55a3c ${hq}%)`);
    setVar(fig, "--bm-side", `color-mix(in oklab, #aeb5bd, #9c3f26 ${hq}%)`);
    if (s.arc > 0.02) { const c = sp([206 - 10 * (1 - s.arc), 262 - 14 * (1 - s.arc)], -10); arcG.innerHTML = `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(14 + 26 * s.arc).toFixed(1)}" opacity="${s.arc.toFixed(2)}"/>`; }
    else if (arcG.innerHTML) arcG.innerHTML = "";
    setText("rI", s.closed ? amp(I) : why ? "0 A · was " + amp(s.tripI) : "0 A");
    const pct = Math.min(100, 100 * (I / magTrip()) ** 2);
    setText("rBl", s.type === "thermisch" ? "Spoel / bimetaal" : "Kracht van de spoel op het anker");
    setText("rB", s.type === "thermisch" ? fmt(pct, 0) + " % van de veer · bimetaal " + (hot >= 1 ? "heet" : hot > 0.6 ? "warm" : hot > 0.2 ? "lauw" : "koud") : fmt(pct, 0) + " % van de veerkracht");
    let tt = "meteen zodra I > " + fmt(magTrip(), 0) + " A";
    const eq = ratio * ratio;
    if (s.type === "thermisch" && s.closed && eq > TRIP_T && I <= magTrip()) tt = "bimetaal: na ≈ " + fmt(Math.max(0, -TAU * Math.log((eq - TRIP_T) / (eq - s.theta))), 0) + " s";
    setText("rT", tt);
    let st, col, step = 0;
    if (s.closed && pct > 50) { st = "Ingeschakeld: de spoel trekt aan het anker, de veer houdt het nog tegen"; col = "#c9822c"; step = 2; }
    else if (s.closed && s.type === "thermisch" && eq > TRIP_T) { st = "Ingeschakeld: overbelasting, het bimetaal warmt op"; col = "#c9822c"; step = 1; }
    else if (s.closed) { st = "Ingeschakeld: de stroom loopt"; col = "#27894f"; step = 1; }
    else if (t - s.tripT < 2.5 && why) { st = why === "thermisch" ? "Uitgeschakeld door het bimetaal (overbelasting)" : "Uitgeschakeld: de spoel won het van de veer"; col = "#b8311f"; step = 3; }
    else { st = why ? (why === "thermisch" ? "Uitgeschakeld door het bimetaal" : "Uitgeschakeld door de spoel") : "Uitgeschakeld"; col = why ? "#b8311f" : "#9aa1a9"; step = 0; }
    if (s.msg) { st = s.msg; col = "#c9822c"; }
    setText("status", st); $("dot").style.background = col;
    [...$("steps").children].forEach((li, i) => { if (i === step) li.setAttribute("data-on", ""); else li.removeAttribute("data-on"); });
    if (step !== shownStep) { shownStep = step; nowNum.textContent = String(step + 1); nowText.textContent = $("steps").children[step].textContent; }
    setText("cornerRead", s.closed ? fmt(I, 1) + " A · ingeschakeld" : "uit");
    frame = visible ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }).observe($("stage"));
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });
  let msgTimer = 0;
  function flash(text) { s.msg = text; clearTimeout(msgTimer); msgTimer = setTimeout(() => (s.msg = ""), 2500); run(); }
  function syncLever() { const b = $("lever"); b.textContent = s.closed ? "Knop uittrekken (uitschakelen)" : "Knop indrukken (inschakelen)"; b.className = s.closed ? "btn-ink" : "btn-accent"; }
  $("lever").addEventListener("click", () => {
    s.msg = "";
    if (s.closed) { s.closed = false; why = ""; }
    else if (s.type === "thermisch" && s.theta > 1.05) flash("Het bimetaal is nog te warm: wacht even");
    else { s.closed = true; why = ""; }
    syncLever(); run();
  });
  $("short").addEventListener("click", () => { if (s.closed) s.shortT = 0.3; else flash("Schakel eerst de zekering in: zonder stroom is er geen kortsluiting"); });
  LOADS.forEach(([name, p], i) => {
    const b = document.createElement("button"); b.className = "toggle"; b.textContent = name + " " + p + " W";
    b.addEventListener("click", () => { s.loads[i] = !s.loads[i]; syncLoads(); });
    $("loads").appendChild(b);
  });
  function syncLoads() { [...$("loads").children].forEach((b, i) => { pressBtn(b, s.loads[i]); q("plug" + i).setAttribute("opacity", s.loads[i] ? "1" : "0"); }); }
  function syncType() { [...$("type").children].forEach((b) => pressBtn(b, b.dataset.t === s.type)); $("springCtl").style.display = s.type === "veer" ? "" : "none"; $("bmInfo").style.display = s.type === "thermisch" ? "" : "none"; drawn = ""; }
  [...$("type").children].forEach((b) => { b.className = "toggle"; b.addEventListener("click", () => { s.type = b.dataset.t; syncType(); }); });
  $("itrip").addEventListener("input", (e) => { s.iTrip = +e.target.value; setText("vTrip", fmt(s.iTrip, 0) + " A"); });
  $("reset").addEventListener("click", () => { Object.assign(s, { type: "veer", iTrip: 20, closed: false, open: 1, lift: 0, theta: 0, loads: [true, false, false, false], shortT: 0, arc: 0, msg: "", tripT: -9, tripI: 0 }); why = ""; $("itrip").value = 20; setText("vTrip", "20 A"); syncType(); syncLoads(); syncLever(); parts.select(null); });
  // de actieve stap staat ook onder de tekening, zodat hij zichtbaar blijft als de zijbalk gescrold is
  const now = document.createElement("div"), nowNum = document.createElement("b"), nowText = document.createElement("span");
  now.className = "now"; now.setAttribute("aria-live", "polite"); now.append(nowNum, nowText);
  document.querySelector(".legend").before(now);
  const parts = setupParts(PARTS, svg);
  syncType(); syncLoads(); syncLever(); run();
  window.__mcb = s;
})();
