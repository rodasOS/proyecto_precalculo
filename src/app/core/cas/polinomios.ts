import { Nodo, esNum, num, pot, prod, sum, vr, contiene } from './ast';
import { expandir, simplificar } from './simplificar';

const tieneExponenteGrande = (n: Nodo): boolean =>
  n.t === 'pot' ? (esNum(n.e) && Math.abs(n.e.v) > 60) || tieneExponenteGrande(n.b) : n.t === 'sum' || n.t === 'prod' ? n.a.some(tieneExponenteGrande) : n.t === 'fn' ? tieneExponenteGrande(n.a) : false;

/** Coeficientes [c0, c1, c2, …] si n es un polinomio en v con coeficientes numéricos; si no, null. */
export function coeficientes(n: Nodo, v = 'x'): number[] | null {
  if (tieneExponenteGrande(n)) return null;
  const e = expandir(n);
  const terminos = e.t === 'sum' ? e.a : [e];
  const c: number[] = [];
  for (const t of terminos) {
    let coef = 1;
    let grado = 0;
    const fs = t.t === 'prod' ? t.a : [t];
    for (const f of fs) {
      if (esNum(f)) coef *= f.v;
      else if (f.t === 'var' && f.n === v) grado += 1;
      else if (f.t === 'pot' && f.b.t === 'var' && f.b.n === v && esNum(f.e) && Number.isInteger(f.e.v) && f.e.v >= 0) grado += f.e.v;
      else return null;
    }
    c[grado] = (c[grado] ?? 0) + coef;
  }
  for (let i = 0; i < c.length; i++) c[i] = c[i] ?? 0;
  while (c.length > 1 && Math.abs(c[c.length - 1]) < 1e-12) c.pop();
  return c.length ? c : [0];
}

export function desdeCoeficientes(c: number[], v = 'x'): Nodo {
  const ts: Nodo[] = [];
  c.forEach((k, g) => {
    if (Math.abs(k) < 1e-12) return;
    ts.push(g === 0 ? num(k) : prod(num(k), g === 1 ? vr(v) : pot(vr(v), num(g))));
  });
  return simplificar(ts.length ? sum(...ts) : num(0));
}

/** Separa f en numerador y denominador (factores con exponente negativo). */
export function separarFraccion(f: Nodo): { N: Nodo; D: Nodo | null } {
  const fs = f.t === 'prod' ? f.a : [f];
  const N: Nodo[] = [];
  const D: Nodo[] = [];
  for (const x of fs) {
    if (x.t === 'pot' && esNum(x.e) && x.e.v < 0) D.push(x.e.v === -1 ? x.b : pot(x.b, num(-x.e.v)));
    else N.push(x);
  }
  return { N: N.length ? simplificar(prod(...N)) : num(1), D: D.length ? simplificar(prod(...D)) : null };
}

/** Si f es suma de fracciones, las junta en una sola N/D. */
export function unirFracciones(f: Nodo): Nodo {
  if (f.t !== 'sum') return f;
  const partes = f.a.map(separarFraccion);
  if (partes.every((p) => p.D === null)) return f;
  const dens = partes.map((p) => p.D ?? num(1));
  const comun = simplificar(prod(...dens));
  const numer = partes.map((p, i) => prod(p.N, ...dens.filter((_, j) => j !== i)));
  return simplificar(prod(expandir(sum(...numer)), pot(comun, num(-1))));
}

export const dependeDe = contiene;
