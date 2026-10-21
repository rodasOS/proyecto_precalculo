import { Nodo, fraccion } from '../cas/ast';
import { derivar, resolverDerivada } from '../cas/derivadas';
import { resolverEcuacion, resolverFactorizacion } from '../cas/algebra';
import { resolverDominio, rango } from '../cas/funciones';
import { resolverIntegral, integrar } from '../cas/integrales';
import { resolverLimite } from '../cas/limites';
import { resolverAnalisis } from '../cas/analisis-funcion';
import { resolverOptimizacion, resolverRazonRelacionada } from '../cas/aplicaciones';
import { evaluarEn, valorNumerico } from '../cas/evaluar';
import { igualesIntervalos, parsearIntervalos, Intervalo } from '../cas/intervalos';
import { parsear } from '../cas/parser';
import { Resultado } from '../cas/resultado.model';
import { simplificar } from '../cas/simplificar';
import { aTex } from '../cas/tex';
import { aleatorio, equivalentes, fmt } from '../cas/verificacion';
import { enVariableX } from '../cas/variable';

export type Modulo = 'algebra' | 'graficas' | 'limites' | 'derivadas' | 'integrales' | 'aplicaciones';
export type Nivel = 'basico' | 'intermedio';
export const MODULOS: { id: Modulo; nombre: string }[] = [
  { id: 'algebra', nombre: 'Álgebra y funciones' }, { id: 'graficas', nombre: 'Gráficas' }, { id: 'limites', nombre: 'Límites' },
  { id: 'derivadas', nombre: 'Derivadas' }, { id: 'integrales', nombre: 'Integrales' }, { id: 'aplicaciones', nombre: 'Aplicaciones' },
];

export type FormatoRespuesta = 'expresion' | 'antiderivada' | 'numero' | 'lista' | 'intervalo';

export interface Calificacion {
  estado: 'correcta' | 'incorrecta' | 'invalida';
  mensaje: string;
}

export interface Ejercicio {
  id: string;
  modulo: Modulo;
  nivel: Nivel;
  titulo: string;
  enunciadoLatex: string;
  formato: FormatoRespuesta;
  ayudaFormato: string;
  pista: string;
  /** Solución completa generada por el motor (se calcula al pedirla). */
  resolver: () => Resultado;
  /** Respuesta correcta en texto, para mostrar. */
  respuestaTexto: string;
  calificar: (respuesta: string) => Calificacion;
}

const TOL = 1e-3;
const cercano = (a: number, b: number) => Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b));

function leerNumero(txt: string): number {
  const t = txt.trim().replace(/^[a-zA-Z]\s*=\s*/, '');
  return valorNumerico(simplificar(parsear(t)));
}

function calificarNumero(correcto: number): Ejercicio['calificar'] {
  return (resp) => {
    if (!resp.trim()) return { estado: 'invalida', mensaje: 'Escribe una respuesta antes de calificar.' };
    let v: number;
    try { v = leerNumero(resp); } catch (e) { return { estado: 'invalida', mensaje: `No se entendió la respuesta: ${(e as Error).message}` }; }
    if (!Number.isFinite(v)) return { estado: 'invalida', mensaje: 'La respuesta debe ser un número (puedes usar fracciones, sqrt(), pi…).' };
    return cercano(v, correcto)
      ? { estado: 'correcta', mensaje: '¡Correcto!' }
      : { estado: 'incorrecta', mensaje: 'La respuesta numérica no coincide.' };
  };
}

function calificarLista(correctos: number[]): Ejercicio['calificar'] {
  return (resp) => {
    if (!resp.trim()) return { estado: 'invalida', mensaje: 'Escribe una respuesta antes de calificar.' };
    let vs: number[];
    try { vs = resp.split(/[,;]|\sy\s/i).map((s) => s.trim()).filter(Boolean).map(leerNumero); } catch (e) { return { estado: 'invalida', mensaje: `No se entendió la respuesta: ${(e as Error).message}` }; }
    if (!vs.length || vs.some((v) => !Number.isFinite(v))) return { estado: 'invalida', mensaje: 'Escribe los valores separados por comas, por ejemplo: 2, 3' };
    const a = [...new Set(vs.map((v) => Math.round(v * 1e6) / 1e6))].sort((p, q) => p - q);
    const b = [...correctos].sort((p, q) => p - q);
    return a.length === b.length && a.every((v, i) => cercano(v, b[i]))
      ? { estado: 'correcta', mensaje: '¡Correcto!' }
      : { estado: 'incorrecta', mensaje: a.length < b.length ? 'Faltan soluciones.' : a.length > b.length ? 'Hay valores de más.' : 'Alguna solución no es correcta.' };
  };
}

function calificarExpresion(correcta: Nodo, modo: 'expresion' | 'antiderivada', integrando?: Nodo): Ejercicio['calificar'] {
  return (resp) => {
    if (!resp.trim()) return { estado: 'invalida', mensaje: 'Escribe una respuesta antes de calificar.' };
    let e: Nodo;
    try {
      const limpia = modo === 'antiderivada' ? resp.replace(/\+\s*c\s*$/i, '').replace(/^\s*[fF]\s*\(x\)\s*=\s*/, '') : resp.replace(/^\s*[a-zA-Z]'?\s*\(x\)\s*=\s*/, '');
      e = enVariableX(parsear(limpia));
    } catch (err) { return { estado: 'invalida', mensaje: `No se entendió la respuesta: ${(err as Error).message}` }; }
    const ok = modo === 'antiderivada' && integrando ? equivalentes(derivar(e), integrando) : equivalentes(e, correcta);
    return ok ? { estado: 'correcta', mensaje: modo === 'antiderivada' ? '¡Correcto! Su derivada es el integrando (cualquier constante C sirve).' : '¡Correcto! Tu expresión es equivalente a la solución.' }
      : { estado: 'incorrecta', mensaje: modo === 'antiderivada' ? 'Al derivar tu respuesta no se obtiene el integrando.' : 'Tu expresión no es equivalente a la solución.' };
  };
}

function calificarIntervalo(correcto: Intervalo[]): Ejercicio['calificar'] {
  return (resp) => {
    if (!resp.trim()) return { estado: 'invalida', mensaje: 'Escribe una respuesta antes de calificar.' };
    const p = parsearIntervalos(resp);
    if (!p) return { estado: 'invalida', mensaje: 'Escribe intervalos como [1, 3) U (3, inf).' };
    return igualesIntervalos(p, correcto) ? { estado: 'correcta', mensaje: '¡Correcto!' } : { estado: 'incorrecta', mensaje: 'El conjunto no coincide (revisa los extremos abiertos y cerrados).' };
  };
}

const textoFrac = (p: number, q: number) => { const f = fraccion(p / q); return !f ? fmt(p / q) : f[1] === 1 ? (f[0] === 1 ? '' : String(f[0])) : `(${f[0]}/${f[1]})`; };
const sg = (n: number) => (n < 0 ? `- ${-n}` : `+ ${n}`);
const coef = (k: number, v: string) => (k === 1 ? v : k === -1 ? `-${v}` : `${k}${v}`);

type Gen = (r: () => number, ent: (a: number, b: number) => number, nz: (a: number, b: number) => number) => Omit<Ejercicio, 'id' | 'modulo' | 'nivel'>;

const GENERADORES: Record<Modulo, Record<Nivel, Gen[]>> = {
  algebra: {
    basico: [
      (_r, ent, nz) => {
        const a = nz(2, 6), x = ent(-6, 8), b = ent(-9, 9), c = a * x + b;
        const txt = `${coef(a, 'x')} ${sg(b)} = ${c}`;
        return { titulo: 'Resuelve la ecuación', enunciadoLatex: `${a === 1 ? '' : a}x ${sg(b)} = ${c}`, formato: 'numero', ayudaFormato: 'Escribe el valor de x.', pista: 'Pasa el término independiente al otro lado y divide entre el coeficiente de x.', resolver: () => resolverEcuacion(txt), respuestaTexto: `x = ${x}`, calificar: calificarNumero(x) };
      },
      (_r, ent) => {
        const p = ent(2, 7), q = ent(-7, -1);
        const f = `x^2 - ${p * p}`; void q;
        return { titulo: 'Factoriza', enunciadoLatex: `x^{2} - ${p * p}`, formato: 'expresion', ayudaFormato: 'Escribe el producto de factores, por ejemplo (x-1)(x+1).', pista: 'Es una diferencia de cuadrados: a² − b² = (a − b)(a + b).', resolver: () => resolverFactorizacion(f), respuestaTexto: `(x - ${p})(x + ${p})`, calificar: calificarExpresion(parsear(`(x-${p})(x+${p})`), 'expresion') };
      },
    ],
    intermedio: [
      (_r, ent) => {
        let r1 = ent(-6, 6), r2 = ent(-6, 6);
        if (r1 === r2) r2 += 1;
        const b = -(r1 + r2), c = r1 * r2;
        const txt = `x^2 ${sg(b)}x ${sg(c)} = 0`;
        return { titulo: 'Resuelve la ecuación cuadrática', enunciadoLatex: `x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x ${c < 0 ? '-' : '+'} ${Math.abs(c)} = 0`, formato: 'lista', ayudaFormato: 'Escribe las soluciones separadas por comas: 2, 3', pista: 'Busca dos números que sumen b y multipliquen c, o usa la fórmula general con el discriminante.', resolver: () => resolverEcuacion(txt), respuestaTexto: `x = ${Math.min(r1, r2)}, x = ${Math.max(r1, r2)}`, calificar: calificarLista([r1, r2]) };
      },
      (_r, ent, nz) => {
        const a = nz(1, 4), b = ent(-6, 6);
        const f = `sqrt(${coef(a, 'x')} ${sg(b)})`;
        const lim = -b / a;
        const correcto: Intervalo[] = [{ lo: lim, hi: Infinity, loInc: true, hiInc: false }];
        return { titulo: 'Halla el dominio', enunciadoLatex: `f(x) = \\sqrt{${a === 1 ? '' : a}x ${sg(b)}}`, formato: 'intervalo', ayudaFormato: 'Usa notación de intervalos: [2, inf)', pista: 'El radicando debe ser mayor o igual que 0: resuelve la desigualdad.', resolver: () => resolverDominio(f), respuestaTexto: `[${fmt(lim)}, ∞)`, calificar: calificarIntervalo(correcto) };
      },
    ],
  },
  graficas: {
    basico: [
      (_r, ent, nz) => {
        const m = nz(-4, 4), x0 = ent(-6, 6), b = -m * x0;
        const f = `${coef(m, 'x')} ${sg(b)}`;
        return { titulo: 'Intersección con el eje x', enunciadoLatex: `f(x) = ${m === 1 ? '' : m === -1 ? '-' : m}x ${sg(b)}`, formato: 'numero', ayudaFormato: 'Escribe la abscisa x del punto donde la gráfica corta el eje x.', pista: 'La gráfica corta el eje x donde f(x) = 0.', resolver: () => resolverEcuacion(`${f} = 0`), respuestaTexto: `x = ${x0}`, calificar: calificarNumero(x0) };
      },
    ],
    intermedio: [
      (_r, ent, nz) => {
        const h = ent(-4, 4), k = ent(-5, 8), a = nz(1, 3);
        const f = `-${a}(x ${sg(-h)})^2 ${sg(k)}`;
        return { titulo: 'Máximo de una parábola', enunciadoLatex: `f(x) = -${a === 1 ? '' : a}(x ${sg(-h)})^{2} ${sg(k)}`, formato: 'numero', ayudaFormato: 'Escribe el valor máximo de f (la coordenada y del vértice).', pista: 'La parábola está en forma canónica: el vértice es (h, k) y abre hacia abajo.', resolver: () => resolverAnalisis(f), respuestaTexto: `${k}`, calificar: calificarNumero(k) };
      },
      (_r, ent) => {
        const c1 = ent(-3, 1) * 2 + 0, c2 = c1 + 2 * ent(1, 3), k0 = ent(-4, 6);
        const b = (-3 * (c1 + c2)) / 2, c = 3 * c1 * c2;
        const f = `x^3 ${sg(b)}x^2 ${sg(c)}x ${sg(k0)}`;
        return { titulo: 'Mínimo relativo de una cúbica', enunciadoLatex: `f(x) = x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}x^{2} ${c < 0 ? '-' : '+'} ${Math.abs(c)}x ${k0 < 0 ? '-' : '+'} ${Math.abs(k0)}`, formato: 'numero', ayudaFormato: 'Escribe el valor de x donde f tiene un mínimo relativo.', pista: 'Resuelve f′(x) = 0 y usa la segunda derivada: f″ > 0 indica mínimo.', resolver: () => resolverAnalisis(f), respuestaTexto: `x = ${Math.max(c1, c2)}`, calificar: calificarNumero(Math.max(c1, c2)) };
      },
    ],
  },
  limites: {
    basico: [
      (_r, ent, nz) => {
        const a = nz(1, 4), b = ent(-5, 5), x0 = ent(-3, 3), c = ent(-5, 5);
        const f = `${coef(a, 'x')}^2 ${sg(b)}x ${sg(c)}`;
        return { titulo: 'Calcula el límite', enunciadoLatex: `\\lim_{x \\to ${x0}} \\left(${a === 1 ? '' : a}x^{2} ${sg(b)}x ${sg(c)}\\right)`, formato: 'numero', ayudaFormato: 'Escribe el valor del límite.', pista: 'El polinomio es continuo: sustituye directamente.', resolver: () => resolverLimite(f, String(x0)), respuestaTexto: `${a * x0 * x0 + b * x0 + c}`, calificar: calificarNumero(a * x0 * x0 + b * x0 + c) };
      },
    ],
    intermedio: [
      (_r, ent) => {
        const a = ent(1, 6);
        const f = `(x^2 - ${a * a})/(x - ${a})`;
        return { titulo: 'Límite con forma 0/0', enunciadoLatex: `\\lim_{x \\to ${a}} \\frac{x^{2} - ${a * a}}{x - ${a}}`, formato: 'numero', ayudaFormato: 'Escribe el valor del límite.', pista: 'Al sustituir queda 0/0: factoriza el numerador y simplifica.', resolver: () => resolverLimite(f, String(a)), respuestaTexto: `${2 * a}`, calificar: calificarNumero(2 * a) };
      },
      (_r, ent, nz) => {
        const a = nz(1, 6), c = nz(1, 6), b = ent(-5, 5), d = ent(1, 9);
        const f = `(${a}x^2 ${sg(b)}x)/(${c}x^2 + ${d})`;
        return { titulo: 'Límite en el infinito', enunciadoLatex: `\\lim_{x \\to \\infty} \\frac{${a}x^{2} ${sg(b)}x}{${c}x^{2} + ${d}}`, formato: 'numero', ayudaFormato: 'Escribe el valor del límite (puedes usar fracciones).', pista: 'Grados iguales: el límite es el cociente de los coeficientes principales.', resolver: () => resolverLimite(f, 'inf'), respuestaTexto: fmt(a / c), calificar: calificarNumero(a / c) };
      },
    ],
  },
  derivadas: {
    basico: [
      (_r, ent, nz) => {
        const a = nz(1, 6), n = ent(2, 5), b = nz(-6, 6), c = ent(-5, 5);
        const f = `${a}x^${n} ${sg(b)}x ${sg(c)}`;
        const df = `${a * n}x^${n - 1} + ${b}`;
        return { titulo: 'Deriva la función', enunciadoLatex: `f(x) = ${a === 1 ? '' : a}x^{${n}} ${sg(b)}x ${sg(c)}`, formato: 'expresion', ayudaFormato: 'Escribe f′(x), por ejemplo 6x^2 + 1.', pista: 'Regla de la potencia en cada término; la derivada de una constante es 0.', resolver: () => resolverDerivada(f), respuestaTexto: df.replace('+ -', '- '), calificar: calificarExpresion(parsear(df), 'expresion') };
      },
    ],
    intermedio: [
      (_r, ent, nz) => {
        const a = nz(2, 5), b = ent(-4, 4), n = ent(3, 5);
        const f = `(${a}x ${sg(b)})^${n}`;
        return { titulo: 'Regla de la cadena', enunciadoLatex: `f(x) = (${a}x ${sg(b)})^{${n}}`, formato: 'expresion', ayudaFormato: 'Escribe f′(x).', pista: 'Regla de la cadena: n·(interna)^(n−1)·(derivada de la interna).', resolver: () => resolverDerivada(f), respuestaTexto: `${a * n}(${a}x ${sg(b)})^${n - 1}`, calificar: calificarExpresion(parsear(`${a * n}(${a}x ${sg(b)})^${n - 1}`), 'expresion') };
      },
      (_r, ent, nz) => {
        const a = nz(1, 4), p = ent(1, 3);
        const f = `x^2*e^(${a}x)`;
        const val = (2 * p + a * p * p) * Math.exp(a * p);
        return { titulo: 'Evalúa la derivada', enunciadoLatex: `f(x) = x^{2}e^{${a === 1 ? '' : a}x},\\quad f'(${p}) = \\ ?`, formato: 'numero', ayudaFormato: 'Escribe el valor numérico (≈ con 2 o más decimales).', pista: 'Regla del producto: (x²)′·eᵃˣ + x²·(eᵃˣ)′.', resolver: () => resolverDerivada(f, { punto: String(p) }), respuestaTexto: fmt(Math.round(val * 1e4) / 1e4), calificar: calificarNumero(val) };
      },
    ],
  },
  integrales: {
    basico: [
      (_r, ent, nz) => {
        const a = nz(1, 6), n = ent(2, 4), b = nz(-6, 6);
        const f = `${a}x^${n} ${sg(b)}`;
        return { titulo: 'Integral indefinida', enunciadoLatex: `\\int \\left(${a === 1 ? '' : a}x^{${n}} ${sg(b)}\\right) dx`, formato: 'antiderivada', ayudaFormato: 'Escribe la antiderivada (con o sin + C), por ejemplo x^3 + 2x.', pista: 'Regla de la potencia: ∫xⁿ dx = xⁿ⁺¹/(n+1).', resolver: () => resolverIntegral(f), respuestaTexto: `${textoFrac(a, n + 1)}x^${n + 1} ${sg(b)}x + C`, calificar: calificarExpresion(parsear(f), 'antiderivada', parsear(f)) };
      },
    ],
    intermedio: [
      (_r, ent, nz) => {
        const k = nz(1, 4), b = ent(1, 3);
        const f = `${k * 3}x^2`;
        const val = k * (b ** 3);
        return { titulo: 'Integral definida', enunciadoLatex: `\\int_{0}^{${b}} ${k * 3}x^{2}\\,dx`, formato: 'numero', ayudaFormato: 'Escribe el valor de la integral.', pista: 'Teorema fundamental: F(b) − F(a) con F(x) = ∫ f(x) dx.', resolver: () => resolverIntegral(f, '0', String(b)), respuestaTexto: `${val}`, calificar: calificarNumero(val) };
      },
      (_r, ent, nz) => {
        const a = nz(2, 5), n = ent(2, 4);
        const f = `${a * n}x^${n - 1}*cos(x^${n})`;
        return { titulo: 'Integral por sustitución', enunciadoLatex: `\\int ${a * n}x^{${n - 1}}\\cos\\left(x^{${n}}\\right) dx`, formato: 'antiderivada', ayudaFormato: 'Escribe la antiderivada, por ejemplo sin(x^2).', pista: `Sea u = x^${n}; entonces du = ${n}x^${n - 1} dx.`, resolver: () => resolverIntegral(f), respuestaTexto: `${a}sin(x^${n}) + C`, calificar: calificarExpresion(parsear(f), 'antiderivada', parsear(f)) };
      },
    ],
  },
  aplicaciones: {
    basico: [
      (_r, ent) => {
        const P = 4 * ent(3, 15);
        return { titulo: 'Área máxima', enunciadoLatex: `\\text{Un rectángulo tiene perímetro } ${P}\\ \\text{m. ¿Cuál es su área máxima (m²)?}`, formato: 'numero', ayudaFormato: 'Escribe el área máxima en m².', pista: 'Plantea A = x(P/2 − x), deriva y resuelve A′ = 0.', resolver: () => resolverOptimizacion('rectangulo-perimetro', { P }), respuestaTexto: `${(P / 4) ** 2} m²`, calificar: calificarNumero((P / 4) ** 2) };
      },
    ],
    intermedio: [
      (_r, ent) => {
        const v = ent(2, 10) * 50;
        const rr = ent(2, 9);
        const exp = v / (4 * Math.PI * rr * rr);
        return { titulo: 'Razones de cambio relacionadas', enunciadoLatex: `\\text{El volumen de una esfera crece a } ${v}\\ \\text{cm}^3/\\text{s}. \\text{ ¿A qué razón crece el radio cuando } r = ${rr}\\ \\text{cm? (cm/s)}`, formato: 'numero', ayudaFormato: 'Escribe dr/dt en cm/s (decimal o fracción con pi).', pista: 'V = (4/3)πr³ ⇒ dV/dt = 4πr²·dr/dt.', resolver: () => resolverRazonRelacionada('esfera', 'Q', v, rr), respuestaTexto: `${fmt(Math.round(exp * 1e5) / 1e5)} cm/s`, calificar: calificarNumero(exp) };
      },
      (_r, ent) => {
        const c1 = ent(-3, 1) * 2, c2 = c1 + 2 * ent(1, 2), k0 = ent(-3, 5);
        const b = (-3 * (c1 + c2)) / 2, c = 3 * c1 * c2;
        const f = `x^3 ${sg(b)}x^2 ${sg(c)}x ${sg(k0)}`;
        const F = (x: number) => x ** 3 + b * x ** 2 + c * x + k0;
        return { titulo: 'Valor del máximo relativo', enunciadoLatex: `f(x) = x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}x^{2} ${c < 0 ? '-' : '+'} ${Math.abs(c)}x ${k0 < 0 ? '-' : '+'} ${Math.abs(k0)}`, formato: 'numero', ayudaFormato: 'Escribe el valor de f en su máximo relativo.', pista: 'Halla los puntos críticos, clasifica con f″ y evalúa f en el máximo.', resolver: () => resolverAnalisis(f), respuestaTexto: `${F(Math.min(c1, c2))}`, calificar: calificarNumero(F(Math.min(c1, c2))) };
      },
    ],
  },
};

/** Genera un ejercicio nuevo de forma determinista a partir de la semilla. */
export function generarEjercicio(modulo: Modulo, nivel: Nivel, semilla: number): Ejercicio {
  const rnd = aleatorio(semilla);
  const ent = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const nz = (a: number, b: number) => { let v = 0; for (let i = 0; i < 50 && v === 0; i++) v = ent(a, b); return v || 1; };
  const gens = GENERADORES[modulo][nivel];
  const gen = gens[Math.floor(rnd() * gens.length)];
  const base = gen(rnd, ent, nz);
  return { ...base, id: `${modulo}-${nivel}-${semilla}`, modulo, nivel };
}

export { aTex, evaluarEn, rango };
