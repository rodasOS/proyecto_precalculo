import { E, Nodo, contiene, div, esNum, fn, igual, neg, num, pot, prod, raiz, resta, sum, sustituir, vr } from './ast';
import { ErrorEntrada, NoResuelto } from './errores';
import { parsear } from './parser';
import { Paso, Resultado, resultadoVacio } from './resultado.model';
import { simplificar } from './simplificar';
import { aTex } from './tex';
import { enVariableX } from './variable';
import { aFuncion, derivadaNumerica, fmt, verificarDerivada, equivalentes } from './verificacion';
import { evaluarEn } from './evaluar';

export interface DerivadaConPasos {
  resultado: Nodo;
  pasos: Paso[];
}

const dTex = (n: Nodo, v: string, orden = 1) =>
  `\\frac{d${orden > 1 ? `^{${orden}}` : ''}}{d${v}${orden > 1 ? `^{${orden}}` : ''}}\\left[${aTex(n)}\\right]`;

/** Derivada de una función elemental f(u) respecto de u. */
function derivadaExterna(f: string, u: Nodo): { d: Nodo; nombre: string } {
  const c = (x: Nodo) => fn('cos', x);
  const s = (x: Nodo) => fn('sin', x);
  switch (f) {
    case 'sin': return { d: c(u), nombre: 'seno' };
    case 'cos': return { d: neg(s(u)), nombre: 'coseno' };
    case 'tan': return { d: pot(c(u), num(-2)), nombre: 'tangente' };
    case 'sec': return { d: prod(fn('sec', u), fn('tan', u)), nombre: 'secante' };
    case 'csc': return { d: neg(prod(fn('csc', u), fn('cot', u))), nombre: 'cosecante' };
    case 'cot': return { d: neg(pot(s(u), num(-2))), nombre: 'cotangente' };
    case 'asin': return { d: pot(resta(num(1), pot(u, num(2))), num(-0.5)), nombre: 'arcoseno' };
    case 'acos': return { d: neg(pot(resta(num(1), pot(u, num(2))), num(-0.5))), nombre: 'arcocoseno' };
    case 'atan': return { d: pot(sum(num(1), pot(u, num(2))), num(-1)), nombre: 'arcotangente' };
    case 'sinh': return { d: fn('cosh', u), nombre: 'seno hiperbólico' };
    case 'cosh': return { d: fn('sinh', u), nombre: 'coseno hiperbólico' };
    case 'tanh': return { d: pot(fn('cosh', u), num(-2)), nombre: 'tangente hiperbólica' };
    case 'ln': return { d: pot(u, num(-1)), nombre: 'logaritmo natural' };
    case 'log': return { d: div(num(1), prod(u, fn('ln', num(10)))), nombre: 'logaritmo base 10' };
    case 'abs': return { d: prod(u, pot(fn('abs', u), num(-1))), nombre: 'valor absoluto' };
    default: throw new ErrorEntrada(`No se sabe derivar la función «${f}».`);
  }
}

/** Deriva respecto de v registrando los pasos con la regla aplicada. */
export function derivarConPasos(raw: Nodo, v = 'x'): DerivadaConPasos {
  const pasos: Paso[] = [];

  const registrar = (regla: string, descripcion: string, entrada: Nodo, calcular: () => Nodo): Nodo => {
    const idx = pasos.length;
    pasos.push({ regla, descripcion, latex: '' });
    const r = calcular();
    pasos[idx].latex = `${dTex(entrada, v)} = ${aTex(simplificar(r))}`;
    return r;
  };

  let visitas = 0;
  const d = (n: Nodo): Nodo => {
    if (++visitas > 1500) throw new NoResuelto('La expresión es demasiado compleja para derivarla paso a paso.');
    if (!contiene(n, v)) {
      if (n.t === 'num' || n.t === 'cte') return num(0);
      return registrar('Regla de la constante', 'La derivada de una constante es 0.', n, () => num(0));
    }
    switch (n.t) {
      case 'var': return num(1);
      case 'sum':
        return registrar('Regla de la suma', 'Se deriva cada término por separado.', n, () => sum(...n.a.map(d)));
      case 'prod': return derivarProducto(n);
      case 'pot': return derivarPotencia(n);
      case 'fn': return derivarFuncion(n);
      default: return num(0);
    }
  };

  const derivarProducto = (n: Extract<Nodo, { t: 'prod' }>): Nodo => {
    const ctes = n.a.filter((f) => !contiene(f, v));
    const vars = n.a.filter((f) => contiene(f, v));
    if (ctes.length) {
      const k = ctes.length === 1 ? ctes[0] : prod(...ctes);
      const resto = vars.length === 1 ? vars[0] : prod(...vars);
      return registrar('Múltiplo constante', `La constante ${aTex(simplificar(k))} sale de la derivada: (k·f)′ = k·f′.`, n, () =>
        prod(k, d(resto)));
    }
    // cociente: algún factor es g^(-p) con g que depende de v y hay numerador que depende de v
    const idxDen = vars.findIndex((f) => f.t === 'pot' && esNum(f.e) && f.e.v < 0);
    if (idxDen >= 0) {
      const den = vars[idxDen] as Extract<Nodo, { t: 'pot' }>;
      const numer = vars.filter((_, i) => i !== idxDen);
      const w = simplificar(pot(den.b, num(-(den.e as { v: number }).v)));
      const u = numer.length === 1 ? numer[0] : prod(...numer);
      return registrar('Regla del cociente', `Se identifica u = ${aTex(simplificar(u))} y w = ${aTex(w)}; (u/w)′ = (u′w − u·w′)/w².`, n, () => {
        const du = d(u);
        const dw = d(w);
        return div(resta(prod(du, w), prod(u, dw)), pot(w, num(2)));
      });
    }
    const [u, ...otros] = vars;
    const w = otros.length === 1 ? otros[0] : prod(...otros);
    return registrar('Regla del producto', `Se identifica u = ${aTex(simplificar(u))} y w = ${aTex(simplificar(w))}; (u·w)′ = u′·w + u·w′.`, n, () => {
      const du = d(u);
      const dw = d(w);
      return sum(prod(du, w), prod(u, dw));
    });
  };

  const derivarPotencia = (n: Extract<Nodo, { t: 'pot' }>): Nodo => {
    const bv = contiene(n.b, v);
    const ev = contiene(n.e, v);
    if (bv && !ev) {
      if (n.b.t === 'var') {
        return registrar('Regla de la potencia', `(x^n)′ = n·x^(n−1) con n = ${aTex(simplificar(n.e))}.`, n, () =>
          prod(n.e, pot(n.b, sum(n.e, num(-1)))));
      }
      return registrar('Regla de la cadena (potencia)', `Con u = ${aTex(simplificar(n.b))}: (u^n)′ = n·u^(n−1)·u′, n = ${aTex(simplificar(n.e))}.`, n, () =>
        prod(n.e, pot(n.b, sum(n.e, num(-1))), d(n.b)));
    }
    if (!bv && ev) {
      if (igual(n.b, E)) {
        return registrar('Derivada de la exponencial', `(e^u)′ = e^u·u′ con u = ${aTex(simplificar(n.e))}.`, n, () =>
          prod(n, d(n.e)));
      }
      return registrar('Derivada de la exponencial general', `(a^u)′ = a^u·ln(a)·u′ con a = ${aTex(simplificar(n.b))}.`, n, () =>
        prod(n, fn('ln', n.b), d(n.e)));
    }
    return registrar('Derivación logarítmica', 'Con base y exponente variables: (u^w)′ = u^w·(w′·ln u + w·u′/u).', n, () =>
      prod(n, sum(prod(d(n.e), fn('ln', n.b)), prod(n.e, d(n.b), pot(n.b, num(-1))))));
  };

  const derivarFuncion = (n: Extract<Nodo, { t: 'fn' }>): Nodo => {
    const { d: ext, nombre } = derivadaExterna(n.f, n.a);
    if (n.a.t === 'var') {
      return registrar(`Derivada del ${nombre}`, `Derivada básica de ${aTex(n)}.`, n, () => ext);
    }
    return registrar('Regla de la cadena', `Función externa: ${nombre}; interna u = ${aTex(simplificar(n.a))}; (f(u))′ = f′(u)·u′.`, n, () =>
      prod(ext, d(n.a)));
  };

  const raw0 = d(raw);
  return { resultado: simplificar(raw0), pasos };
}

/** Derivada simbólica simplificada, sin pasos. */
export function derivar(n: Nodo, v = 'x'): Nodo {
  return derivarConPasos(n, v).resultado;
}

export interface OpcionesDerivada {
  orden?: number;
  punto?: string;
}

/** Módulo Derivadas: derivada (de cualquier orden) con pasos, evaluación y verificación. */
export function resolverDerivada(texto: string, op: OpcionesDerivada = {}): Resultado {
  const r = resultadoVacio('Derivada');
  const orden = op.orden ?? 1;
  if (!Number.isInteger(orden) || orden < 1 || orden > 4) {
    r.estado = 'error';
    r.advertencias.push('El orden de la derivada debe ser un entero entre 1 y 4.');
    return r;
  }
  let f: Nodo;
  try {
    f = simplificar(enVariableX(parsear(texto)));
  } catch (e) {
    r.estado = 'error';
    r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'No se pudo interpretar la expresión.');
    return r;
  }
  let punto: number | null = null;
  if (op.punto !== undefined && op.punto.trim() !== '') {
    try {
      punto = evaluarEn(parsear(op.punto), 0);
      if (!Number.isFinite(punto)) throw new ErrorEntrada('El punto de evaluación debe ser un número.');
    } catch (e) {
      r.estado = 'error';
      r.advertencias.push(e instanceof ErrorEntrada ? `Punto de evaluación: ${e.message}` : 'Punto de evaluación inválido.');
      return r;
    }
  }

  r.formula = "(u \\pm w)' = u' \\pm w', \\quad (uw)' = u'w + uw', \\quad \\left(\\frac{u}{w}\\right)' = \\frac{u'w - uw'}{w^2}, \\quad [f(g(x))]' = f'(g(x))\\,g'(x)";
  r.sustitucion = `f(x) = ${aTex(f)}`;

  let actual = f;
  let ultima: Nodo = f;
  for (let i = 1; i <= orden; i++) {
    let resultado: Nodo, pasos: Paso[];
    try {
      ({ resultado, pasos } = derivarConPasos(actual));
    } catch (e) {
      if (e instanceof NoResuelto) { r.estado = 'no-resuelto'; r.advertencias.push(e.message); r.pasos = []; return r; }
      throw e;
    }
    if (orden > 1) r.pasos.push({ regla: `Derivada de orden ${i}`, descripcion: `Se deriva la expresión anterior.`, latex: `f${"'".repeat(i)}(x) = ${aTex(resultado)}` });
    r.pasos.push(...pasos);
    ultima = resultado;
    actual = resultado;
  }
  const marca = orden === 1 ? "f'(x)" : orden === 2 ? "f''(x)" : orden === 3 ? "f'''(x)" : 'f^{(4)}(x)';
  r.respuesta = { latex: `${marca} = ${aTex(ultima)}`, texto: `${marca} = ${aTex(ultima)}` };

  const ver = orden === 1 ? verificarDerivada(f, ultima) : verificarOrdenSuperior(f, ultima, orden);
  r.verificacion = ver;
  if (!ver.coincide) {
    r.estado = 'advertencia';
    r.advertencias.push('Resultado no verificado: la comprobación numérica no coincide. Revisa la expresión.');
  }

  if (punto !== null) {
    const F = aFuncion(f);
    const valorF = F(punto);
    if (!Number.isFinite(valorF)) {
      r.estado = 'advertencia';
      r.advertencias.push(`La función no está definida en x = ${fmt(punto)}: no se puede evaluar la derivada ahí.`);
    } else if (orden === 1 && !derivableEn(F, punto)) {
      r.estado = 'advertencia';
      r.advertencias.push(`No existe la derivada en x = ${fmt(punto)} (la función tiene una esquina, cúspide o discontinuidad).`);
    } else {
      const val = evaluarEn(ultima, punto);
      if (!Number.isFinite(val)) {
        r.estado = 'advertencia';
        r.advertencias.push(`La derivada no está definida en x = ${fmt(punto)}.`);
      } else {
        r.pasos.push({ regla: 'Evaluación', descripcion: `Se sustituye x = ${fmt(punto)} en ${marca}.`, latex: `${marca.replace('(x)', `(${fmt(punto)})`)} = ${aTex(simplificar(sustituir(ultima, 'x', num(punto))))} = ${fmt(val)}` });
        r.respuesta.latex += `, \\quad ${marca.replace('(x)', `(${fmt(punto)})`)} = ${fmt(val)}`;
        r.respuesta.texto += `; ${marca.replace('(x)', `(${fmt(punto)})`)} = ${fmt(val)}`;
        if (orden === 1) {
          const b = valorF - val * punto;
          r.pasos.push({ regla: 'Recta tangente', descripcion: `y − f(a) = f′(a)(x − a) con a = ${fmt(punto)}, f(a) = ${fmt(valorF)}.`, latex: `y = ${aTex(simplificar(sum(prod(num(val), vr('x')), num(b))))}` });
          r.interpretacion = `La pendiente de la recta tangente en x = ${fmt(punto)} es ${fmt(val)}; la recta es y = ${aTex(simplificar(sum(prod(num(val), vr('x')), num(b))))}.`;
        }
      }
    }
  }
  return r;
}

function derivableEn(F: (x: number) => number, a: number): boolean {
  const h = 1e-6;
  const der = (F(a + h) - F(a)) / h;
  const izq = (F(a) - F(a - h)) / h;
  if (!Number.isFinite(der) || !Number.isFinite(izq)) return false;
  return Math.abs(der - izq) <= 1e-3 * Math.max(1, Math.abs(der), Math.abs(izq));
}

function verificarOrdenSuperior(f: Nodo, d: Nodo, orden: number) {
  // comparar contra derivadas numéricas sucesivas es inestable; se verifica derivando la penúltima simbólicamente
  let prev = f;
  for (let i = 1; i < orden; i++) prev = derivar(prev);
  return verificarDerivada(prev, d);
}

/** ¿La derivada propuesta por el usuario equivale a la correcta? */
export function comprobarDerivadaPropuesta(textoF: string, textoPropuesta: string): { correcta: boolean; esperada: Nodo } {
  const f = enVariableX(parsear(textoF));
  const p = enVariableX(parsear(textoPropuesta));
  const esperada = derivar(f);
  return { correcta: equivalentes(esperada, p), esperada };
}

export { raiz, derivadaNumerica };
