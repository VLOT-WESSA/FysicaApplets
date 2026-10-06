/* Gedeelde logica voor booleanalgebra en Karnaugh: parser, herschrijfregels, Quine-McCluskey, weergave. */
(function () {
  const B = {};
  const V = v => ({ t: 'var', v }), C = v => ({ t: 'const', v }), N = x => ({ t: 'not', x });
  B.V = V; B.C = C; B.N = N;
  function mk(t, xs) {
    const fl = [];
    xs.forEach(c => { if (c.t === t) fl.push(...c.xs); else fl.push(c); });
    if (!fl.length) return C(t === 'and' ? 1 : 0);
    if (fl.length === 1) return fl[0];
    return { t, xs: fl };
  }
  B.mk = mk;
  function flatten(n) {
    if (n.t === 'not') return N(flatten(n.x));
    if (n.t === 'and' || n.t === 'or') return mk(n.t, n.xs.map(flatten));
    return n;
  }
  B.flatten = flatten;
  function key(n) {
    if (n.t === 'var') return 'v' + n.v;
    if (n.t === 'const') return '' + n.v;
    if (n.t === 'not') return '!' + key(n.x);
    return (n.t === 'and' ? '&(' : '|(') + n.xs.map(key).sort().join(',') + ')';
  }
  B.key = key;
  const eq = (a, b) => key(a) === key(b);
  const isNegOf = (x, y) => (x.t === 'not' && eq(x.x, y)) || (y.t === 'not' && eq(y.x, x));

  // ---------- parser
  B.parse = function (src) {
    const toks = [];
    for (const ch of String(src)) {
      if (/\s/.test(ch)) continue;
      if (/[a-zA-Z]/.test(ch)) toks.push({ k: 'v', v: ch.toLowerCase() });
      else if (ch === '0' || ch === '1') toks.push({ k: 'c', v: +ch });
      else if ('!\u00ac~'.includes(ch)) toks.push({ k: 'not' });
      else if ("'\u2019".includes(ch)) toks.push({ k: 'post' });
      else if ('+|\u2228'.includes(ch)) toks.push({ k: 'or' });
      else if ('*\u00b7.&\u2227\u2022'.includes(ch)) toks.push({ k: 'and' });
      else if (ch === '(') toks.push({ k: 'l' });
      else if (ch === ')') toks.push({ k: 'r' });
      else throw new Error('Onbekend teken \u201c' + ch + '\u201d.');
    }
    if (!toks.length) throw new Error('Voer een uitdrukking in.');
    let p = 0;
    const peek = () => toks[p];
    const startsFactor = t => t && (t.k === 'v' || t.k === 'c' || t.k === 'not' || t.k === 'l');
    function pOr() {
      const xs = [pAnd()];
      while (peek() && peek().k === 'or') { p++; xs.push(pAnd()); }
      return xs.length === 1 ? xs[0] : { t: 'or', xs };
    }
    function pAnd() {
      const xs = [pUn()];
      for (;;) {
        const t = peek();
        if (t && t.k === 'and') { p++; xs.push(pUn()); }
        else if (startsFactor(t)) xs.push(pUn());
        else break;
      }
      return xs.length === 1 ? xs[0] : { t: 'and', xs };
    }
    function pUn() {
      const t = peek();
      if (!t) throw new Error('De uitdrukking is onvolledig.');
      if (t.k === 'not') { p++; return N(pUn()); }
      let n;
      if (t.k === 'v') { p++; n = V(t.v); }
      else if (t.k === 'c') { p++; n = C(t.v); }
      else if (t.k === 'l') {
        p++; n = pOr();
        if (!peek() || peek().k !== 'r') throw new Error('Haakje sluiten ontbreekt.');
        p++;
      } else throw new Error('Onverwacht symbool.');
      while (peek() && peek().k === 'post') { p++; n = N(n); }
      return n;
    }
    const node = pOr();
    if (p < toks.length) throw new Error(toks[p].k === 'r' ? 'Haakje openen ontbreekt.' : 'Onverwacht symbool.');
    return flatten(node);
  };
  B.vars = function (n, s) {
    s = s || new Set();
    if (n.t === 'var') s.add(n.v); else if (n.t === 'not') B.vars(n.x, s); else if (n.xs) n.xs.forEach(c => B.vars(c, s));
    return [...s].sort();
  };
  B.evalNode = function (n, env) {
    switch (n.t) {
      case 'var': return env[n.v] ? 1 : 0;
      case 'const': return n.v;
      case 'not': return B.evalNode(n.x, env) ? 0 : 1;
      case 'and': return n.xs.every(c => B.evalNode(c, env)) ? 1 : 0;
      default: return n.xs.some(c => B.evalNode(c, env)) ? 1 : 0;
    }
  };
  B.lits = n => n.t === 'var' ? 1 : n.t === 'not' ? B.lits(n.x) : n.xs ? n.xs.reduce((s, c) => s + B.lits(c), 0) : 0;
  B.envOf = (vars, idx) => { const e = {}; vars.forEach((v, i) => { e[v] = (idx >> (vars.length - 1 - i)) & 1; }); return e; };

  // ---------- regels
  B.RULES = {
    dubbel: ['Dubbele negatie', '!!a = a'],
    not0: ['NOT', '!0 = 1'], not1: ['NOT', '!1 = 0'],
    dm1: ['De Morgan', '!(a+b) = !a\u00b7!b'], dm2: ['De Morgan', '!(a\u00b7b) = !a+!b'],
    nul1: ['Nulelement', 'a\u00b70 = 0'], nul2: ['Nulelement', '!a\u00b7a = 0'],
    een1: ['Eenheidselement', 'a+1 = 1'], een2: ['Eenheidselement', '!a+a = 1'],
    id1: ['Identiteit', 'a\u00b71 = a'], id2: ['Identiteit', 'a+0 = a'],
    her1: ['Herhaling', 'a\u00b7a = a'], her2: ['Herhaling', 'a+a = a'],
    abs1: ['Absorptie', 'a+!a\u00b7b = a+b'], abs2: ['Absorptie', '!a+a\u00b7b = !a+b'],
    abs3: ['Absorptie', 'a\u00b7(!a+b) = a\u00b7b'], abs4: ['Absorptie', '!a\u00b7(a+b) = !a\u00b7b'],
    abs5: ['Absorptie (afgeleid)', 'a+a\u00b7b = a'], abs6: ['Absorptie (afgeleid)', 'a\u00b7(a+b) = a'],
    combo1: ['Distributiviteit, eenheidselement, identiteit', 'a\u00b7b+a\u00b7!b = a\u00b7(b+!b) = a\u00b71 = a'],
    combo2: ['Distributiviteit, nulelement, identiteit', '(a+b)\u00b7(a+!b) = a+b\u00b7!b = a+0 = a'],
    qm: ['Distributiviteit, eenheidselement, identiteit', 'a\u00b7b+a\u00b7!b = a'],
  };

  function rewriteAt(node) {
    if (node.t === 'not') {
      const x = node.x;
      if (x.t === 'not') return { node: x.x, id: 'dubbel' };
      if (x.t === 'const') return { node: C(x.v ? 0 : 1), id: x.v ? 'not1' : 'not0' };
      if (x.t === 'or') return { node: mk('and', x.xs.map(N)), id: 'dm1' };
      if (x.t === 'and') return { node: mk('or', x.xs.map(N)), id: 'dm2' };
      return null;
    }
    if (node.t !== 'and' && node.t !== 'or') return null;
    const t = node.t, and = t === 'and', xs = node.xs, od = and ? 'or' : 'and';
    const ab = and ? 0 : 1, idc = and ? 1 : 0;
    if (xs.some(c => c.t === 'const' && c.v === ab)) return { node: C(ab), id: and ? 'nul1' : 'een1' };
    const ci = xs.findIndex(c => c.t === 'const' && c.v === idc);
    if (ci >= 0) return { node: mk(t, xs.filter((_, i) => i !== ci)), id: and ? 'id1' : 'id2' };
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++)
      if (eq(xs[i], xs[j])) return { node: mk(t, xs.filter((_, k) => k !== j)), id: and ? 'her1' : 'her2' };
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++)
      if (isNegOf(xs[i], xs[j])) return { node: C(ab), id: and ? 'nul2' : 'een2' };
    for (let i = 0; i < xs.length; i++) for (let j = 0; j < xs.length; j++) {
      if (i === j || xs[j].t !== od) continue;
      const x = xs[i], ys = xs[j].xs;
      const k = ys.findIndex(y => isNegOf(y, x));
      if (k >= 0) {
        const nx = xs.slice(); nx[j] = mk(od, ys.filter((_, m) => m !== k));
        return { node: mk(t, nx), id: and ? (x.t === 'not' ? 'abs4' : 'abs3') : (x.t === 'not' ? 'abs2' : 'abs1') };
      }
      if (ys.some(y => eq(y, x))) return { node: mk(t, xs.filter((_, m) => m !== j)), id: and ? 'abs6' : 'abs5' };
    }
    const ls = xs.map(c => c.t === od ? c.xs : [c]);
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
      const L1 = ls[i], L2 = ls[j];
      if (L1.length !== L2.length || (L1.length === 1 && L2.length === 1)) continue;
      const k2 = new Set(L2.map(key)), k1 = new Set(L1.map(key));
      const d1 = L1.filter(x => !k2.has(key(x))), d2 = L2.filter(x => !k1.has(key(x)));
      if (d1.length === 1 && d2.length === 1 && isNegOf(d1[0], d2[0])) {
        const common = L1.filter(x => k2.has(key(x)));
        const nx = xs.filter((_, m) => m !== i && m !== j); nx.splice(i, 0, mk(od, common));
        return { node: mk(t, nx), id: and ? 'combo2' : 'combo1' };
      }
    }
    return null;
  }
  function find(node) {
    const r = rewriteAt(node);
    if (r) return r;
    if (node.t === 'not') { const s = find(node.x); return s && { node: N(s.node), id: s.id }; }
    if (node.xs) for (let i = 0; i < node.xs.length; i++) {
      const s = find(node.xs[i]);
      if (s) { const nx = node.xs.slice(); nx[i] = s.node; return { node: mk(node.t, nx), id: s.id }; }
    }
    return null;
  }

  // ---------- Quine-McCluskey
  const pop = x => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
  B.covers = (imp, m) => (m & ~imp.dc) === imp.val;
  B.qm = function (n, ones, dcs) {
    dcs = dcs || [];
    let cur = new Map();
    ones.concat(dcs).forEach(m => cur.set(m + ':0', { val: m, dc: 0, used: false }));
    const primes = [];
    while (cur.size) {
      const next = new Map(), list = [...cur.values()];
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.dc !== b.dc) continue;
        const d = a.val ^ b.val;
        if (d && !(d & (d - 1))) {
          a.used = b.used = true;
          const imp = { val: a.val & ~d, dc: a.dc | d, used: false };
          next.set(imp.val + ':' + imp.dc, imp);
        }
      }
      list.forEach(a => { if (!a.used) primes.push({ val: a.val, dc: a.dc }); });
      cur = next;
    }
    const lit = p => n - pop(p.dc);
    let best = null, guard = 0;
    const need = ones.slice();
    function rec(unc, chosen) {
      if (++guard > 20000) return;
      if (!unc.length) {
        const cost = [chosen.length, chosen.reduce((s, p) => s + lit(p), 0)];
        if (!best || cost[0] < best.cost[0] || (cost[0] === best.cost[0] && cost[1] < best.cost[1])) best = { cost, sel: chosen.slice() };
        return;
      }
      if (best && chosen.length >= best.cost[0]) return;
      const m = unc[0];
      primes.filter(p => B.covers(p, m)).sort((a, b) => lit(a) - lit(b)).forEach(p => {
        chosen.push(p); rec(unc.filter(x => !B.covers(p, x)), chosen); chosen.pop();
      });
    }
    rec(need, []);
    return { primes, cover: best ? best.sel : [] };
  };
  // implicant -> knoop. sop: product van literalen; pos: som van omgekeerde literalen (voor nullen)
  B.impNode = function (imp, n, names, pos) {
    const xs = [];
    for (let i = 0; i < n; i++) {
      const bit = (imp.val >> (n - 1 - i)) & 1;
      if ((imp.dc >> (n - 1 - i)) & 1) continue;
      const v = V(names[i]);
      xs.push(pos ? (bit ? N(v) : v) : (bit ? v : N(v)));
    }
    return mk(pos ? 'or' : 'and', xs);
  };
  B.coverNode = function (cover, n, names, pos) {
    if (!cover.length) return C(pos ? 1 : 0);
    return mk(pos ? 'and' : 'or', cover.map(p => B.impNode(p, n, names, pos)));
  };
  B.minimal = function (names, vals) {
    const n = names.length, ones = [], zeros = [];
    vals.forEach((v, i) => (v ? ones : zeros).push(i));
    if (!ones.length) return C(0);
    if (!zeros.length) return C(1);
    return B.coverNode(B.qm(n, ones, []).cover, n, names, false);
  };

  // ---------- vereenvoudigen met regelvermelding
  B.simplify = function (src) {
    const orig = B.parse(src), vars = B.vars(orig);
    if (vars.length > 5) throw new Error('Maximaal 5 verschillende variabelen.');
    let cur = orig;
    const steps = [{ id: null, node: cur }];
    for (let g = 0; g < 80; g++) {
      const r = find(cur);
      if (!r) break;
      cur = flatten(r.node);
      steps.push({ id: r.id, node: cur });
    }
    const N2 = 1 << vars.length;
    const rows = [];
    const ov = [];
    for (let i = 0; i < N2; i++) ov.push(B.evalNode(orig, B.envOf(vars, i)));
    const mn = vars.length ? B.minimal(vars, ov) : C(B.evalNode(orig, {}));
    if (B.lits(mn) < B.lits(cur) && !(cur.t === 'const')) steps.push({ id: 'qm', node: mn });
    const fin = steps[steps.length - 1].node;
    let ok = true;
    for (let i = 0; i < N2; i++) {
      const env = B.envOf(vars, i), f = B.evalNode(fin, env);
      if (f !== ov[i]) ok = false;
      rows.push({ bits: vars.map(v => env[v]), o: ov[i], f });
    }
    return { vars, steps, orig, fin, rows, ok };
  };

  // ---------- weergave (React-elementen); h = React.createElement
  B.view = function (node, h) {
    function v(n, prec) {
      if (n.t === 'var') return h('span', null, n.v);
      if (n.t === 'const') return h('span', null, String(n.v));
      if (n.t === 'not') return h('span', { style: { display: 'inline-block', borderTop: '1.7px solid currentColor', paddingTop: '1px', lineHeight: '1.15' } }, v(n.x, 0));
      const and = n.t === 'and', parts = [];
      n.xs.forEach((c, i) => {
        if (i) parts.push(and ? '\u00b7' : ' + ');
        parts.push(v(c, and ? 2 : 1));
      });
      const need = and ? prec > 2 : prec > 1;
      return h('span', null, ...(need ? ['(', ...parts, ')'] : parts));
    }
    return v(node, 0);
  };
  B.formula = function (str, h) {
    const parts = str.split('=').map(s => B.view(B.parse(s.trim()), h));
    const out = [];
    parts.forEach((p, i) => { if (i) out.push(' = '); out.push(p); });
    return h('span', null, ...out);
  };
  window.BoolCore = B;
})();
