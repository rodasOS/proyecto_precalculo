/** Árbol de expresiones del motor de cálculo. */
export type Nodo =
  | { t: 'num'; v: number }
  | { t: 'var'; n: string }
  | { t: 'cte'; n: 'pi' | 'e' }
  | { t: 'sum'; a: Nodo[] }
  | { t: 'prod'; a: Nodo[] }
  | { t: 'pot'; b: Nodo; e: Nodo }
  | { t: 'fn'; f: string; a: Nodo };

export const FUNCIONES = [
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'ln', 'log', 'abs',
] as const;

export const num = (v: number): Nodo => ({ t: 'num', v });
export const vr = (n = 'x'): Nodo => ({ t: 'var', n });
export const E: Nodo = { t: 'cte', n: 'e' };
export const PI: Nodo = { t: 'cte', n: 'pi' };
export const sum = (...a: Nodo[]): Nodo => ({ t: 'sum', a });
export const prod = (...a: Nodo[]): Nodo => ({ t: 'prod', a });
export const pot = (b: Nodo, e: Nodo): Nodo => ({ t: 'pot', b, e });
export const fn = (f: string, a: Nodo): Nodo => ({ t: 'fn', f, a });
export const neg = (a: Nodo): Nodo => prod(num(-1), a);
export const resta = (a: Nodo, b: Nodo): Nodo => sum(a, neg(b));
export const div = (a: Nodo, b: Nodo): Nodo => prod(a, pot(b, num(-1)));
export const raiz = (a: Nodo): Nodo => pot(a, num(0.5));

export const esNum = (n: Nodo): n is { t: 'num'; v: number } => n.t === 'num';

export function igual(a: Nodo, b: Nodo): boolean {
  if (a.t !== b.t) return false;
  switch (a.t) {
    case 'num': return Math.abs(a.v - (b as typeof a).v) < 1e-12;
    case 'var': return a.n === (b as typeof a).n;
    case 'cte': return a.n === (b as typeof a).n;
    case 'fn': return a.f === (b as typeof a).f && igual(a.a, (b as typeof a).a);
    case 'pot': return igual(a.b, (b as typeof a).b) && igual(a.e, (b as typeof a).e);
    default: {
      const bb = b as typeof a;
      return a.a.length === bb.a.length && a.a.every((x, i) => igual(x, bb.a[i]));
    }
  }
}

/** ¿La expresión contiene la variable v? */
export function contiene(n: Nodo, v = 'x'): boolean {
  switch (n.t) {
    case 'num': case 'cte': return false;
    case 'var': return n.n === v;
    case 'fn': return contiene(n.a, v);
    case 'pot': return contiene(n.b, v) || contiene(n.e, v);
    default: return n.a.some((x) => contiene(x, v));
  }
}

export function variables(n: Nodo, acc = new Set<string>()): Set<string> {
  switch (n.t) {
    case 'var': acc.add(n.n); break;
    case 'fn': variables(n.a, acc); break;
    case 'pot': variables(n.b, acc); variables(n.e, acc); break;
    case 'sum': case 'prod': n.a.forEach((x) => variables(x, acc)); break;
  }
  return acc;
}

export function sustituir(n: Nodo, v: string, por: Nodo): Nodo {
  switch (n.t) {
    case 'var': return n.n === v ? por : n;
    case 'num': case 'cte': return n;
    case 'fn': return fn(n.f, sustituir(n.a, v, por));
    case 'pot': return pot(sustituir(n.b, v, por), sustituir(n.e, v, por));
    case 'sum': return sum(...n.a.map((x) => sustituir(x, v, por)));
    case 'prod': return prod(...n.a.map((x) => sustituir(x, v, por)));
  }
}

/** Aproxima un real como fracción p/q (q ≤ 10000) si es exacta a 1e-12. */
export function fraccion(v: number): [number, number] | null {
  if (!Number.isFinite(v)) return null;
  if (Number.isInteger(v)) return [v, 1];
  for (let q = 2; q <= 10000; q++) {
    const p = Math.round(v * q);
    if (Math.abs(v - p / q) < 1e-12) return [p, q];
  }
  return null;
}
