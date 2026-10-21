import { Nodo } from './ast';
import { compilar } from './evaluar';
import { Verificacion } from './resultado.model';

/** Generador pseudoaleatorio determinista (misma entrada → mismo resultado). */
export function aleatorio(semilla = 12345): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type FuncionNum = (x: number) => number;
export const aFuncion = (n: Nodo, v = 'x'): FuncionNum => {
  const f = compilar(n);
  return (x) => f({ [v]: x, x, t: x });
};

const finito = (v: number) => Number.isFinite(v);

/** Puntos de prueba donde todas las funciones dadas son finitas. */
export const RANGOS_AMPLIOS: [number, number][] = [[-8, 8], [0.05, 9], [-3, 3], [1.01, 12], [-12, -0.05]];
/** Rangos moderados para comprobaciones con derivadas numéricas (evitan oscilaciones extremas). */
export const RANGOS_MODERADOS: [number, number][] = [[-2.5, 2.5], [0.05, 3], [-3, -0.05], [1.01, 4]];

export function puntosValidos(fs: FuncionNum[], cuantos = 12, semilla = 7, rangos: [number, number][] = RANGOS_AMPLIOS): number[] {
  const rnd = aleatorio(semilla);
  const out: number[] = [];
  for (let intento = 0; intento < 400 && out.length < cuantos; intento++) {
    const [a, b] = rangos[intento % rangos.length];
    const x = Math.round((a + (b - a) * rnd()) * 1e4) / 1e4;
    if (fs.every((f) => finito(f(x)))) out.push(x);
  }
  return out;
}

/** Derivada numérica de cinco puntos. */
export function derivadaNumerica(f: FuncionNum, x: number): number {
  const h = 1e-4;
  return (f(x - 2 * h) - 8 * f(x - h) + 8 * f(x + h) - f(x + 2 * h)) / (12 * h);
}

const cercano = (a: number, b: number, tol = 1e-5) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

export function verificarDerivada(f: Nodo, df: Nodo): Verificacion {
  const F = aFuncion(f);
  const D = aFuncion(df);
  const pts = puntosValidos([F, D, (x) => derivadaNumerica(F, x)], 8, 7, RANGOS_MODERADOS);
  if (pts.length < 3)
    return { metodo: 'Cociente incremental', coincide: false, detalle: 'No se hallaron suficientes puntos del dominio para comprobar numéricamente.' };
  const malos = pts.filter((x) => !cercano(derivadaNumerica(F, x), D(x)));
  const x0 = pts[0];
  const detalle = `En x = ${fmt(x0)}: cociente incremental ≈ ${fmt(derivadaNumerica(F, x0))} y f′ = ${fmt(D(x0))}. Comprobado en ${pts.length} puntos.`;
  return { metodo: 'Cociente incremental', coincide: malos.length === 0, detalle: malos.length ? `Discrepancia en x = ${fmt(malos[0])}.` : detalle };
}

export function verificarAntiderivada(integrando: Nodo, F: Nodo): Verificacion {
  const f = aFuncion(integrando);
  const Fn = aFuncion(F);
  const pts = puntosValidos([f, Fn, (x) => derivadaNumerica(Fn, x)], 8, 7, RANGOS_MODERADOS);
  if (pts.length < 3)
    return { metodo: 'Derivar la antiderivada', coincide: false, detalle: 'No se hallaron suficientes puntos del dominio para comprobar.' };
  const malos = pts.filter((x) => !cercano(derivadaNumerica(Fn, x), f(x), 1e-4));
  return {
    metodo: 'Derivar la antiderivada',
    coincide: malos.length === 0,
    detalle: malos.length
      ? `La derivada de la respuesta no coincide con el integrando en x = ${fmt(malos[0])}.`
      : `La derivada de la respuesta coincide con el integrando en ${pts.length} puntos.`,
  };
}

/** Regla de Simpson compuesta; NaN si hay valores no finitos. */
export function simpson(f: FuncionNum, a: number, b: number, n = 4000): number {
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  const r = (s * h) / 3;
  return finito(r) ? r : NaN;
}

export function verificarIntegralDefinida(integrando: Nodo, a: number, b: number, exacto: number): Verificacion {
  const aprox = simpson(aFuncion(integrando), a, b);
  return {
    metodo: 'Aproximación numérica (Simpson)',
    coincide: finito(aprox) && cercano(aprox, exacto, 1e-6),
    detalle: finito(aprox) ? `Simpson ≈ ${fmt(aprox)}; valor exacto ≈ ${fmt(exacto)}.` : 'No se pudo aproximar numéricamente la integral.',
  };
}

export interface FilaLimite { x: number; fx: number }

export function tablaLimite(f: FuncionNum, x0: number, lado: 'izq' | 'der'): FilaLimite[] {
  return [1e-1, 1e-2, 1e-3, 1e-4, 1e-5].map((d) => {
    const x = lado === 'izq' ? x0 - d : x0 + d;
    return { x, fx: f(x) };
  });
}

export function equivalentes(a: Nodo, b: Nodo): boolean {
  const fa = aFuncion(a);
  const fb = aFuncion(b);
  const pts = puntosValidos([fa, fb], 25, 99);
  if (pts.length < 5) return false;
  return pts.every((x) => cercano(fa(x), fb(x), 1e-8));
}

export function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 1e6) / 1e6);
}
