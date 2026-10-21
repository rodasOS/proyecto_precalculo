import { Nodo, E, esNum, fraccion, igual, num, pot, prod, sum } from './ast';
import { aTexto } from './texto';
import { valorNumerico } from './evaluar';

const clave = (n: Nodo) => aTexto(n);

function grado(n: Nodo): number {
  switch (n.t) {
    case 'var': return 1;
    case 'pot': return n.b.t === 'var' && esNum(n.e) ? n.e.v : 0;
    case 'prod': return n.a.reduce((s, x) => s + grado(x), 0);
    default: return 0;
  }
}

function rango(n: Nodo): number {
  switch (n.t) {
    case 'cte': case 'var': return 0;
    case 'pot': return n.b.t === 'var' || n.b.t === 'cte' ? 0 : n.b.t === 'sum' ? 1 : 2;
    case 'sum': return 1;
    case 'fn': return 2;
    default: return 3;
  }
}

function coeficiente(n: Nodo): [number, Nodo | null] {
  if (esNum(n)) return [n.v, null];
  if (n.t === 'prod') {
    let c = 1;
    const resto: Nodo[] = [];
    for (const f of n.a) (esNum(f) ? (c *= f.v) : resto.push(f));
    if (!resto.length) return [c, null];
    return [c, resto.length === 1 ? resto[0] : { t: 'prod', a: resto }];
  }
  return [1, n];
}

const casiEntero = (v: number) => Math.abs(v - Math.round(v)) < 1e-12;
const limpiar = (v: number) => (casiEntero(v) ? Math.round(v) : v);

function exacto(f: string, arg: Nodo): Nodo | null {
  if (arg.t === 'var') return null;
  const v = valorNumerico(arg);
  if (!Number.isFinite(v)) return null;
  if (f === 'sin' || f === 'cos' || f === 'tan') {
    const k = v / (Math.PI / 2);
    if (casiEntero(k)) {
      const r = ((Math.round(k) % 4) + 4) % 4;
      if (f === 'sin') return num([0, 1, 0, -1][r]);
      if (f === 'cos') return num([1, 0, -1, 0][r]);
      return r % 2 === 0 ? num(0) : null;
    }
  }
  if (f === 'abs') return num(Math.abs(v));
  return null;
}

export function simplificar(n: Nodo): Nodo {
  switch (n.t) {
    case 'num': return num(limpiar(n.v) === 0 ? 0 : limpiar(n.v));
    case 'var': case 'cte': return n;
    case 'fn': {
      const a = simplificar(n.a);
      const nn: Nodo = { t: 'fn', f: n.f, a };
      if (n.f === 'ln') {
        if (esNum(a) && a.v === 1) return num(0);
        if (a.t === 'cte' && a.n === 'e') return num(1);
        if (a.t === 'pot' && igual(a.b, E)) return a.e;
      }
      if (n.f === 'abs' && a.t === 'fn' && a.f === 'abs') return a;
      if (esNum(a) && n.f !== 'abs' && a.v === 0) {
        if (['sin', 'tan', 'asin', 'atan', 'sinh', 'tanh'].includes(n.f)) return num(0);
        if (['cos', 'cosh'].includes(n.f)) return num(1);
      }
      const ex = exacto(n.f, a);
      return ex ?? nn;
    }
    case 'pot': {
      const b = simplificar(n.b);
      const e = simplificar(n.e);
      if (esNum(e)) {
        if (e.v === 0) return num(1);
        if (e.v === 1) return b;
        if (esNum(b)) {
          if (b.v === 0 && e.v > 0) return num(0);
          if (b.v >= 0 || Number.isInteger(e.v)) {
            const r = Math.pow(b.v, e.v);
            if (Number.isFinite(r) && (Number.isInteger(e.v) || fraccion(r) !== null)) return num(limpiar(r));
          }
          if (Math.abs(e.v - 0.5) < 1e-12 && Number.isInteger(b.v) && b.v > 1) {
            let k = 1, m = b.v;
            for (let q = Math.floor(Math.sqrt(b.v)); q >= 2; q--) if (m % (q * q) === 0) { k = q; m = m / (q * q); break; }
            if (k > 1) return simplificar(prod(num(k), pot(num(m), e)));
          }
        }
        if (b.t === 'prod' && Number.isInteger(e.v)) return simplificar(prod(...b.a.map((f) => pot(f, e))));
        if (b.t === 'pot' && Number.isInteger(e.v)) return simplificar(pot(b.b, prod(b.e, e)));
      }
      if (esNum(b) && b.v === 1) return num(1);
      if (b.t === 'cte' && b.n === 'e' && e.t === 'fn' && e.f === 'ln') return e.a;
      return { t: 'pot', b, e };
    }
    case 'sum': {
      const planos: Nodo[] = [];
      const aplanar = (x: Nodo) => {
        const s = simplificar(x);
        if (s.t === 'sum') s.a.forEach((y) => planos.push(y));
        else planos.push(s);
      };
      n.a.forEach(aplanar);
      let cte = 0;
      const mapa = new Map<string, { c: number; r: Nodo }>();
      for (const t of planos) {
        const [c, r] = coeficiente(t);
        if (r === null) { cte += c; continue; }
        const k = clave(r);
        const ya = mapa.get(k);
        if (ya) ya.c += c; else mapa.set(k, { c, r });
      }
      const items: { t: Nodo; g: number; k: string }[] = [];
      for (const [k, { c, r }] of mapa) {
        const cc = limpiar(c);
        if (cc === 0) continue;
        const t = cc === 1 ? r : simplificar(prod(num(cc), r));
        items.push({ t, g: grado(t), k });
      }
      items.sort((a, b) => b.g - a.g || a.k.localeCompare(b.k));
      const res = items.map((i) => i.t);
      if (limpiar(cte) !== 0) res.push(num(limpiar(cte)));
      if (res.length === 0) return num(0);
      return res.length === 1 ? res[0] : { t: 'sum', a: res };
    }
    case 'prod': {
      const planos: Nodo[] = [];
      const aplanar = (x: Nodo) => {
        const s = simplificar(x);
        if (s.t === 'prod') s.a.forEach((y) => planos.push(y));
        else planos.push(s);
      };
      n.a.forEach(aplanar);
      let c = 1;
      const grupos = new Map<string, { b: Nodo; es: Nodo[] }>();
      for (const f of planos) {
        if (esNum(f)) { c *= f.v; continue; }
        const [b, e] = f.t === 'pot' ? [f.b, f.e] : [f, num(1)];
        const k = clave(b);
        const g = grupos.get(k);
        if (g) g.es.push(e); else grupos.set(k, { b, es: [e] });
      }
      if (c === 0) return num(0);
      const fs: Nodo[] = [];
      for (const { b, es } of grupos.values()) {
        const ex = simplificar(es.length === 1 ? es[0] : { t: 'sum', a: es });
        const r = simplificar(pot(b, ex));
        if (esNum(r)) c *= r.v;
        else if (r.t === 'prod') {
          for (const y of r.a) (esNum(y) ? (c *= y.v) : fs.push(y));
        } else fs.push(r);
      }
      fs.sort((a, b) => rango(a) - rango(b) || clave(a).localeCompare(clave(b)));
      c = limpiar(c);
      if (!fs.length) return num(c);
      if (c === 1) return fs.length === 1 ? fs[0] : { t: 'prod', a: fs };
      return { t: 'prod', a: [num(c), ...fs] };
    }
  }
}

/** Desarrolla productos de sumas y potencias enteras de sumas. */
export function expandir(n: Nodo): Nodo {
  const rec = (x: Nodo): Nodo => {
    switch (x.t) {
      case 'sum': return simplificar(sum(...x.a.map(rec)));
      case 'pot': {
        const b = rec(x.b);
        if (esNum(x.e) && Number.isInteger(x.e.v) && x.e.v > 1 && x.e.v <= 12 && b.t === 'sum') {
          let r: Nodo = b;
          for (let i = 1; i < x.e.v; i++) r = mult(r, b);
          return r;
        }
        return simplificar(pot(b, rec(x.e)));
      }
      case 'prod': return x.a.map(rec).reduce((a, b) => mult(a, b));
      case 'fn': return simplificar({ t: 'fn', f: x.f, a: rec(x.a) });
      default: return x;
    }
  };
  const mult = (a: Nodo, b: Nodo): Nodo => {
    const A = a.t === 'sum' ? a.a : [a];
    const B = b.t === 'sum' ? b.a : [b];
    const ts: Nodo[] = [];
    for (const p of A) for (const q of B) ts.push(prod(p, q));
    return simplificar(sum(...ts));
  };
  return simplificar(rec(simplificar(n)));
}

