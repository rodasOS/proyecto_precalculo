import { Nodo, fraccion } from './ast';

export type Entorno = Record<string, number>;

function potencia(b: number, e: number): number {
  if (b < 0 && !Number.isInteger(e)) {
    const f = fraccion(e);
    if (f && Math.abs(f[1]) % 2 === 1) return (Math.abs(f[0]) % 2 === 1 ? -1 : 1) * Math.pow(-b, e);
    return NaN;
  }
  return Math.pow(b, e);
}

const FN: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  ln: Math.log, log: Math.log10, abs: Math.abs,
};

/** Compila el árbol a una función numérica. Devuelve NaN fuera del dominio real. */
export function compilar(n: Nodo): (env: Entorno) => number {
  switch (n.t) {
    case 'num': { const v = n.v; return () => v; }
    case 'var': { const nm = n.n; return (env) => env[nm] ?? NaN; }
    case 'cte': { const v = n.n === 'pi' ? Math.PI : Math.E; return () => v; }
    case 'fn': { const f = FN[n.f]; const a = compilar(n.a); return (env) => f(a(env)); }
    case 'pot': { const b = compilar(n.b); const e = compilar(n.e); return (env) => potencia(b(env), e(env)); }
    case 'sum': { const fs = n.a.map(compilar); return (env) => fs.reduce((s, f) => s + f(env), 0); }
    case 'prod': { const fs = n.a.map(compilar); return (env) => fs.reduce((s, f) => s * f(env), 1); }
  }
}

/** Evalúa en x (y opcionalmente otras variables). */
export function evaluarEn(n: Nodo, x: number, extra: Entorno = {}): number {
  return compilar(n)({ x, t: x, ...extra });
}

/** Valor numérico de una expresión sin variables; NaN si hay alguna. */
export function valorNumerico(n: Nodo): number {
  return compilar(n)({});
}
