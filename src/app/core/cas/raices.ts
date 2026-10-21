import { Nodo, contiene, div, neg, num, pot, sum } from './ast';
import { coeficientes } from './polinomios';
import { resolverSimbolico } from './cas-externo';
import { compilar, valorNumerico } from './evaluar';
import { aTex } from './tex';
import { simplificar } from './simplificar';
import { fmt } from './verificacion';

export interface Raiz {
  v: number;
  /** Forma exacta (p. ej. 3 − √3) cuando se conoce. */
  ex: Nodo | null;
}

export interface OpcionesRaices {
  lo?: number;
  hi?: number;
}

const tieneTrig = (n: Nodo): boolean => {
  switch (n.t) {
    case 'fn': return ['sin', 'cos', 'tan', 'sec', 'csc', 'cot'].includes(n.f) || tieneTrig(n.a);
    case 'pot': return tieneTrig(n.b) || tieneTrig(n.e);
    case 'sum': case 'prod': return n.a.some(tieneTrig);
    default: return false;
  }
};


const mcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : mcd(b, a % b));

function divisores(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d * d <= n; d++) if (n % d === 0) { out.push(d); if (d * d !== n) out.push(n / d); }
  return out;
}

/** Raíces exactas de un polinomio: racionales (Gauss) y las de un cociente cuadrático final. */
export function raicesExactasPolinomio(c0: number[]): { raices: Raiz[]; gradoResto: number } {
  let c = [...c0];
  const resultado: Raiz[] = [];
  // a enteros
  let k = 1;
  for (let q = 1; q <= 1000; q++) if (c.every((v) => Math.abs(v * q - Math.round(v * q)) < 1e-9)) { k = q; break; }
  c = c.map((v) => Math.round(v * k));
  if (c.some((v) => !Number.isSafeInteger(v) || Math.abs(v) > 1e9)) return { raices: [], gradoResto: 99 };
  while (c.length > 1 && c[0] === 0) { resultado.push({ v: 0, ex: num(0) }); c = c.slice(1); }
  const intentar = (p: number, q: number): boolean => {
    // evalúa c en p/q exactamente: sum c_i p^i q^(n-i)
    const n = c.length - 1;
    let acc = 0;
    for (let i = 0; i <= n; i++) acc += c[i] * Math.pow(p, i) * Math.pow(q, n - i);
    return Math.abs(acc) < 0.5;
  };
  let seguir = true;
  while (c.length > 3 && seguir) {
    seguir = false;
    const a0 = Math.abs(c[0]), an = Math.abs(c[c.length - 1]);
    if (a0 === 0 || a0 > 1e7 || an > 1e7) break;
    outer: for (const p of divisores(a0)) for (const q of divisores(an)) {
      if (mcd(p, q) !== 1) continue;
      for (const sg of [1, -1]) {
        if (intentar(sg * p, q)) {
          resultado.push({ v: (sg * p) / q, ex: num((sg * p) / q) });
          const n = c.length - 1;
          const r = (sg * p) / q;
          const b = new Array(n).fill(0);
          b[n - 1] = c[n];
          for (let i = n - 2; i >= 0; i--) b[i] = c[i + 1] + r * b[i + 1];
          c = b.map((v) => (Math.abs(v - Math.round(v)) < 1e-7 ? Math.round(v) : v));
          seguir = true;
          break outer;
        }
      }
    }
  }
  if (c.length === 3) {
    const [cc, b, a] = c;
    const disc = b * b - 4 * a * cc;
    if (disc > 1e-12) {
      const sq = simplificar(pot(num(disc), num(0.5)));
      for (const sg of [-1, 1]) {
        const ex = simplificar(div(sum(num(-b), sg < 0 ? neg(sq) : sq), num(2 * a)));
        resultado.push({ v: valorNumerico(ex), ex });
      }
    } else if (Math.abs(disc) <= 1e-12) resultado.push({ v: -b / (2 * a), ex: simplificar(num(-b / (2 * a))) });
  } else if (c.length === 2) {
    const ex = simplificar(num(-c[0] / c[1]));
    resultado.push({ v: valorNumerico(ex), ex });
  }
  const unicas: Raiz[] = [];
  for (const r of resultado) if (!unicas.some((u) => Math.abs(u.v - r.v) < 1e-9)) unicas.push(r);
  return { raices: unicas, gradoResto: c.length - 1 };
}

/** Raíces reales de n(x) = 0 en [lo, hi]: exactas con nerdamer y barrido numérico de respaldo. */
export function raicesReales(n: Nodo, op: OpcionesRaices = {}): Raiz[] {
  const f0 = compilar(n);
  const f = (x: number) => f0({ x, t: x });
  const ventana = tieneTrig(n) ? 10 : 60;
  const lo = op.lo ?? -ventana;
  const hi = op.hi ?? ventana;
  // función idénticamente nula: todo x es raíz; no se enumeran
  if ([-7.3, -1.1, 0.37, 2.9, 11.2, 31.7].every((x) => f(x) === 0)) return [];
  const escala = Math.max(1, ...[-5, -1, 0, 1, 5].map((x) => Math.abs(f(x))).filter(Number.isFinite));
  const cerca = (x: number) => Math.abs(f(x)) <= 1e-7 * escala;
  const res: Raiz[] = [];
  const agregar = (v: number, ex: Nodo | null) => {
    if (v < lo - 1e-9 || v > hi + 1e-9) return;
    const vr = Math.abs(v) < 1e-12 ? 0 : v;
    const ya = res.find((r) => Math.abs(r.v - vr) < 1e-6);
    if (ya) { if (!ya.ex && ex) ya.ex = ex; return; }
    if (res.length >= 200) return;
    res.push({ v: vr, ex });
  };

  // 1) exactas
  const cp = contiene(n, 'x') ? coeficientes(n) : null;
  let completo = false;
  if (cp && cp.length > 1) {
    const ex = raicesExactasPolinomio(cp);
    for (const rr of ex.raices) if (Number.isFinite(rr.v) && cerca(rr.v)) agregar(rr.v, rr.ex);
    completo = ex.gradoResto <= 2 && op.lo === undefined && op.hi === undefined;
  } else if (contiene(n, 'x')) {
    for (const e of resolverSimbolico(n) ?? []) {
      const v = valorNumerico(e);
      if (Number.isFinite(v) && cerca(v)) agregar(v, simplificar(e));
    }
  }

  // 2) barrido numérico por cambios de signo y mínimos de |f| (innecesario si el polinomio quedó resuelto)
  if (completo) { res.sort((p, q) => p.v - q.v); return res; }
  const N = 12000;
  const paso = (hi - lo) / N;
  let xa = lo;
  let fa = f(xa);
  for (let i = 1; i <= N; i++) {
    const xb = lo + i * paso;
    const fb = f(xb);
    if (Number.isFinite(fa) && Number.isFinite(fb)) {
      if (fa === 0) agregar(xa, null);
      else if (fa * fb < 0) {
        let a = xa, b = xb, fa2 = fa;
        for (let k = 0; k < 80; k++) {
          const m = (a + b) / 2;
          const fm = f(m);
          if (fm === 0) { a = b = m; break; }
          if (fa2 * fm < 0) b = m; else { a = m; fa2 = fm; }
        }
        const r = (a + b) / 2;
        // descarta cambios de signo por asíntotas (|f| enorme)
        if (cerca(r) || Math.abs(f(r)) < 1e-6 * escala) agregar(r, null);
      }
    }
    xa = xb; fa = fb;
  }
  // raíces dobles (toque sin cambio de signo): mínimos de |f| casi cero
  for (let i = 1; i < N; i++) {
    const x0 = lo + (i - 1) * paso, x1 = x0 + paso, x2 = x1 + paso;
    const a = Math.abs(f(x0)), b = Math.abs(f(x1)), c = Math.abs(f(x2));
    if (b < a && b <= c && Number.isFinite(a + b + c) && b < 1e-3 * escala) {
      let L = x0, R = x2;
      for (let k = 0; k < 100; k++) {
        const m1 = L + (R - L) / 3, m2 = R - (R - L) / 3;
        if (Math.abs(f(m1)) < Math.abs(f(m2))) R = m2; else L = m1;
      }
      const r = (L + R) / 2;
      if (Math.abs(f(r)) < 1e-9 * escala) agregar(r, null);
    }
  }
  res.sort((p, q) => p.v - q.v);
  return res;
}

/** Texto LaTeX de una raíz: exacta (con aproximación si no es racional) o decimal. */
export function raizTex(r: Raiz): string {
  if (r.ex) {
    const t = aTex(r.ex);
    const entero = Math.abs(r.v - Math.round(r.v)) < 1e-12;
    if (entero || /^-?\\frac\{\d+\}\{\d+\}$/.test(t)) return t;
    return `${t} \\approx ${fmt(Math.round(r.v * 1e4) / 1e4)}`;
  }
  return fmt(Math.round(r.v * 1e4) / 1e4);
}

/** Texto LaTeX de la raíz sin aproximación. */
export function raizTexCorto(r: Raiz): string {
  if (r.ex) return aTex(r.ex);
  return fmt(Math.round(r.v * 1e4) / 1e4);
}
