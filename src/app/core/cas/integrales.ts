import { E, Nodo, contiene, div, esNum, fn, igual, neg, num, pot, prod, raiz, resta, sum, sustituir, vr } from './ast';
import { derivar } from './derivadas';
import { ErrorEntrada, NoResuelto } from './errores';
import { compilar, valorNumerico } from './evaluar';
import { parsear } from './parser';
import { coeficientes, separarFraccion } from './polinomios';
import { Paso, Resultado, resultadoVacio } from './resultado.model';
import { expandir, simplificar } from './simplificar';
import { aTex } from './tex';
import { enVariableX } from './variable';
import { aFuncion, fmt, simpson, verificarAntiderivada, verificarIntegralDefinida } from './verificacion';

const es = (a: Nodo, b: Nodo) => igual(simplificar(a), simplificar(b));

/** Reemplaza subárboles iguales a `patron` por `por`. */
function reemplazar(n: Nodo, patron: Nodo, por: Nodo): Nodo {
  if (igual(n, patron)) return por;
  switch (n.t) {
    case 'fn': return fn(n.f, reemplazar(n.a, patron, por));
    case 'pot': return pot(reemplazar(n.b, patron, por), reemplazar(n.e, patron, por));
    case 'sum': return sum(...n.a.map((x) => reemplazar(x, patron, por)));
    case 'prod': return prod(...n.a.map((x) => reemplazar(x, patron, por)));
    default: return n;
  }
}

function candidatosU(n: Nodo, v: string, acc: Nodo[] = []): Nodo[] {
  const add = (u: Nodo) => {
    const s = simplificar(u);
    if (s.t !== 'var' && s.t !== 'num' && contiene(s, v) && !acc.some((x) => igual(x, s))) acc.push(s);
  };
  switch (n.t) {
    case 'fn': add(n.a); add(n); candidatosU(n.a, v, acc); break;
    case 'pot':
      if (contiene(n.b, v)) add(n.b);
      if (contiene(n.e, v)) add(n.e);
      candidatosU(n.b, v, acc); candidatosU(n.e, v, acc);
      break;
    case 'sum': case 'prod': n.a.forEach((x) => candidatosU(x, v, acc)); break;
  }
  return acc;
}

const intTex = (f: Nodo, v: string) => `\\int ${aTex(f)}\\,d${v}`;

/** ¿n es lineal en v? Devuelve [a, b] con n = a·v + b. */
function lineal(n: Nodo, v: string): [number, number] | null {
  const c = coeficientes(n, v);
  if (!c || c.length > 2) return null;
  return [c[1] ?? 0, c[0] ?? 0];
}

const NO_ELEMENTAL: [(n: Nodo) => boolean, string][] = [
  [(n) => /^\(?sin\(x\)\)?\*x\^\(?-1\)?$/.test(raw(n)) || /^x\^\(?-1\)?\*\(?sin\(x\)\)?$/.test(raw(n)), 'sin(x)/x (integral seno, Si)'],
  [(n) => /^\(?cos\(x\)\)?\*x\^\(?-1\)?$/.test(raw(n)) || /^x\^\(?-1\)?\*\(?cos\(x\)\)?$/.test(raw(n)), 'cos(x)/x (integral coseno, Ci)'],
  [(n) => /^e\^\(?-?x\^2\)?$/.test(raw(n)) || /^e\^\(?-?\(?1\/2\)?\*?x\^2\)?$/.test(raw(n)), 'e^(x²) (función error, erf)'],
  [(n) => /^e\^x\*x\^\(?-1\)?$/.test(raw(n)) || /^x\^\(?-1\)?\*e\^x$/.test(raw(n)), 'eˣ/x (integral exponencial, Ei)'],
  [(n) => /^ln\(x\)\^\(?-1\)?$/.test(raw(n)), '1/ln(x) (logaritmo integral, li)'],
];
const raw = (n: Nodo) => aTexto2(simplificar(n)).replace(/\s/g, '');
import { aTexto as aTexto2 } from './texto';

export interface IntegralConPasos { F: Nodo; pasos: Paso[]; }

export function integrarConPasos(f0: Nodo, v = 'x'): IntegralConPasos {
  const pasos: Paso[] = [];
  const f = simplificar(f0);
  for (const [chk, nombre] of NO_ELEMENTAL) {
    if (v === 'x' && chk(f)) throw new NoResuelto(`La integral de ${nombre} no tiene antiderivada elemental.`);
  }

  const reg = (regla: string, descripcion: string, entrada: Nodo, vv: string, calc: () => Nodo): Nodo => {
    const idx = pasos.length;
    pasos.push({ regla, descripcion, latex: '' });
    const r = calc();
    pasos[idx].latex = `${intTex(entrada, vv)} = ${aTex(simplificar(r))}${vv === 'x' || true ? '' : ''}`;
    return r;
  };

  const I = (n0: Nodo, vv: string, prof: number): Nodo => {
    if (prof > 7) throw new NoResuelto('La integral requiere demasiados pasos de sustitución.');
    const n = simplificar(n0);
    if (!contiene(n, vv)) return reg('Integral de una constante', '∫ k dx = k·x', n, vv, () => prod(n, vr(vv)));
    if (n.t === 'sum') return reg('Linealidad', 'La integral de una suma es la suma de las integrales.', n, vv, () => sum(...n.a.map((t) => I(t, vv, prof + 1))));
    if (n.t === 'prod') return integrarProducto(n, vv, prof);
    if (n.t === 'var') return reg('Regla de la potencia', '∫ x dx = x²/2', n, vv, () => div(pot(n, num(2)), num(2)));
    if (n.t === 'pot') return integrarPotencia(n, vv, prof);
    if (n.t === 'fn') return integrarFuncion(n, vv, prof);
    throw new NoResuelto('No se reconoce la forma del integrando.');
  };

  const sustitucion = (n: Nodo, vv: string, prof: number): Nodo | null => {
    for (const u of candidatosU(n, vv)) {
      const du = derivar(u, vv);
      if (es(du, num(0))) continue;
      const r = simplificar(prod(n, pot(du, num(-1))));
      const g = simplificar(reemplazar(r, u, vr('u')));
      if (contiene(g, vv) || !contiene(g, 'u')) continue;
      // evita bucles: g no debe contener a u de forma que repita la misma forma
      const idx = pasos.length;
      pasos.push({ regla: 'Sustitución', descripcion: `Sea u = ${aTex(u)}; entonces du = ${aTex(du)}\\,d${vv}.`, latex: '' });
      try {
        const G = I(g, 'u', prof + 1);
        const res = simplificar(sustituir(G, 'u', u));
        pasos.splice(idx + 1, 0, { regla: 'Regreso a la variable original', descripcion: `Se reemplaza u = ${aTex(u)}.`, latex: `${aTex(simplificar(G))} \\ \\to \\ ${aTex(res)}` });
        pasos[idx].latex = `u = ${aTex(u)},\\quad du = ${aTex(du)}\\,d${vv} \\ \\Rightarrow \\ ${intTex(g, 'u')}`;
        return res;
      } catch (e) {
        if (!(e instanceof NoResuelto)) throw e;
        pasos.splice(idx);
      }
    }
    return null;
  };

  const integrarProducto = (n: Extract<Nodo, { t: 'prod' }>, vv: string, prof: number): Nodo => {
    const ctes = n.a.filter((x) => !contiene(x, vv));
    const vars = n.a.filter((x) => contiene(x, vv));
    if (ctes.length) {
      const k = ctes.length === 1 ? ctes[0] : prod(...ctes);
      const resto = vars.length === 1 ? vars[0] : prod(...vars);
      return reg('Constante fuera de la integral', `∫ k·f dx = k·∫ f dx con k = ${aTex(simplificar(k))}.`, n, vv, () => prod(k, I(resto, vv, prof + 1)));
    }
    const rc = racionalCuadratica(n, vv);
    if (rc) return rc;
    const ex = expandir(n);
    if (ex.t === 'sum' && !igual(ex, n) && vars.every((f) => f.t === 'sum' || (f.t === 'pot' && f.b.t === 'sum' && esNum(f.e) && f.e.v > 0 && Number.isInteger(f.e.v)) || coeficientes(f, vv)))
      return reg('Desarrollar el producto', 'Se multiplica para obtener una suma de términos.', n, vv, () => I(ex, vv, prof + 1));
    const s = sustitucion(n, vv, prof);
    if (s) return s;
    const p = porPartes(n, vv, prof);
    if (p) return p;
    throw new NoResuelto('No se encontró una técnica elemental (tabla, sustitución o partes) para esta integral.');
  };

  const racionalCuadratica = (n: Nodo, vv: string): Nodo | null => {
    const { N, D } = separarFraccion(n);
    if (!D || contiene(N, vv)) return null;
    const c = coeficientes(D, vv);
    if (!c || c.length !== 3) return null;
    const [cc, b, a] = c;
    const k = valorNumerico(N);
    const disc = b * b - 4 * a * cc;
    const L = vr(vv);
    const lin = simplificar(sum(prod(num(2 * a), L), num(b)));
    if (disc < -1e-12) {
      const s = Math.sqrt(-disc);
      return reg('Completar el cuadrado (arcotangente)', `El discriminante ${fmt(disc)} < 0: ∫ dx/(ax²+bx+c) = (2/√(4ac−b²))·arctan((2ax+b)/√(4ac−b²)).`, n, vv, () =>
        prod(num((2 * k) / s), fn('atan', simplificar(div(lin, num(s))))));
    }
    if (disc > 1e-12) {
      const s = Math.sqrt(disc);
      return reg('Fracciones parciales (logaritmos)', `El discriminante ${fmt(disc)} > 0: el denominador tiene dos raíces reales distintas.`, n, vv, () =>
        prod(num(k / s), fn('ln', fn('abs', simplificar(div(sum(lin, num(-s)), sum(lin, num(s))))))));
    }
    return reg('Cuadrado perfecto', 'El discriminante es 0: ∫ dx/(ax²+bx+c) = −2/(2ax+b).', n, vv, () => prod(num(-2 * k), pot(lin, num(-1))));
  };

  const porPartes = (n: Extract<Nodo, { t: 'prod' }>, vv: string, prof: number): Nodo | null => {
    if (n.a.length !== 2) return null;
    for (const [P, G] of [[n.a[0], n.a[1]], [n.a[1], n.a[0]]]) {
      const cp = coeficientes(P, vv);
      if (!cp || cp.length < 2) continue;
      const esExp = G.t === 'pot' && igual(G.b, E) && lineal(G.e, vv) !== null;
      const esTrig = G.t === 'fn' && ['sin', 'cos', 'sinh', 'cosh'].includes(G.f) && lineal(G.a, vv) !== null;
      const esLn = G.t === 'fn' && G.f === 'ln' && G.a.t === 'var';
      if (esExp || esTrig) {
        return reg('Integración por partes', `∫ u dv = u·v − ∫ v du con u = ${aTex(simplificar(P))}, dv = ${aTex(G)}\\,d${vv}.`, n, vv, () => {
          const Gint = I(G, vv, prof + 1);
          const rest = simplificar(prod(derivar(P, vv), Gint));
          return resta(prod(P, Gint), I(rest, vv, prof + 1));
        });
      }
      if (esLn) {
        return reg('Integración por partes', `u = ln x, dv = ${aTex(simplificar(P))}\\,dx.`, n, vv, () => {
          const Q = I(P, vv, prof + 1);
          const rest = simplificar(prod(Q, pot(vr(vv), num(-1))));
          return resta(prod(G, Q), I(rest, vv, prof + 1));
        });
      }
    }
    return null;
  };

  const integrarPotencia = (n: Extract<Nodo, { t: 'pot' }>, vv: string, prof: number): Nodo => {
    const bv = contiene(n.b, vv), ev = contiene(n.e, vv);
    if (bv && !ev && n.b.t === 'var') {
      const e = n.e;
      if (esNum(e) && e.v === -1)
        return reg('Integral de 1/x', '∫ 1/x dx = ln|x| + C (la regla de la potencia no aplica con exponente −1).', n, vv, () => fn('ln', fn('abs', n.b)));
      return reg('Regla de la potencia', `∫ x^n dx = x^(n+1)/(n+1) con n = ${aTex(simplificar(e))}.`, n, vv, () =>
        div(pot(n.b, sum(e, num(1))), sum(e, num(1))));
    }
    if (bv && !ev && esNum(n.e) && n.e.v < 0) {
      const rc = racionalCuadratica(n, vv);
      if (rc) return rc;
    }
    if (bv && !ev && (n.b.t === 'fn') && esNum(n.e) && Number.isInteger(n.e.v)) {
      const f = n.b;
      const lin = lineal(f.a, vv);
      if (lin && n.e.v === 2 && (f.f === 'sin' || f.f === 'cos')) {
        return reg('Identidad de reducción de potencia', f.f === 'sin' ? 'sin²u = (1 − cos 2u)/2' : 'cos²u = (1 + cos 2u)/2', n, vv, () => {
          const dos = fn('cos', prod(num(2), f.a));
          return I(prod(num(0.5), f.f === 'sin' ? resta(num(1), dos) : sum(num(1), dos)), vv, prof + 1);
        });
      }
      if (lin && n.e.v === -2 && (f.f === 'cos' || f.f === 'sin')) {
        return reg(f.f === 'cos' ? 'Integral de sec²' : 'Integral de csc²', f.f === 'cos' ? '∫ sec²u du = tan u' : '∫ csc²u du = −cot u', n, vv, () =>
          prod(num(1 / lin[0]), f.f === 'cos' ? fn('tan', f.a) : neg(fn('cot', f.a))));
      }
    }
    if (!bv && ev) {
      const lin = lineal(n.e, vv);
      if (lin && lin[0] !== 0) {
        if (igual(n.b, E)) return reg('Integral de la exponencial', `∫ e^(ax+b) dx = e^(ax+b)/a con a = ${fmt(lin[0])}.`, n, vv, () => prod(num(1 / lin[0]), n));
        return reg('Integral de la exponencial general', '∫ a^u du = a^u / ln a.', n, vv, () => prod(num(1 / lin[0]), n, pot(fn('ln', n.b), num(-1))));
      }
    }
    const s = sustitucion(n, vv, prof);
    if (s) return s;
    if (bv && !ev && n.b.t === 'sum' && esNum(n.e) && Number.isInteger(n.e.v) && n.e.v > 1)
      return reg('Desarrollar la potencia', 'Se expande el binomio/polinomio.', n, vv, () => I(expandir(n), vv, prof + 1));
    throw new NoResuelto('No se encontró una técnica elemental para esta integral.');
  };

  const integrarFuncion = (n: Extract<Nodo, { t: 'fn' }>, vv: string, prof: number): Nodo => {
    const lin = lineal(n.a, vv);
    const u = n.a;
    if (lin && lin[0] !== 0) {
      const k = 1 / lin[0];
      const base = (primitiva: Nodo, nombre: string) =>
        reg(`Integral del ${nombre}`, lin[0] === 1 && lin[1] === 0 ? `Integral básica de ${aTex(n)}.` : `Con u = ${aTex(simplificar(u))}, du = ${fmt(lin[0])}\\,d${vv}: se divide entre ${fmt(lin[0])}.`, n, vv, () => prod(num(k), primitiva));
      switch (n.f) {
        case 'sin': return base(neg(fn('cos', u)), 'seno');
        case 'cos': return base(fn('sin', u), 'coseno');
        case 'tan': return base(neg(fn('ln', fn('abs', fn('cos', u)))), 'tangente');
        case 'sinh': return base(fn('cosh', u), 'seno hiperbólico');
        case 'cosh': return base(fn('sinh', u), 'coseno hiperbólico');
        case 'ln':
          if (n.a.t === 'var')
            return reg('Integración por partes', 'u = ln x, dv = dx ⇒ ∫ ln x dx = x ln x − x.', n, vv, () => resta(prod(vr(vv), n), vr(vv)));
          break;
      }
    }
    if (n.f === 'ln' && lin && lin[0] !== 0) {
      return reg('Sustitución lineal y por partes', `Con u = ${aTex(simplificar(u))}: ∫ ln u du = u ln u − u.`, n, vv, () => prod(num(1 / lin[0]), resta(prod(u, n), u)));
    }
    const s = sustitucion(n, vv, prof);
    if (s) return s;
    throw new NoResuelto('No se encontró una técnica elemental para esta integral.');
  };

  const F = I(f, v, 0);
  return { F: simplificar(F), pasos };
}

export function integrar(f: Nodo, v = 'x'): Nodo {
  return integrarConPasos(f, v).F;
}

/** Singularidades (denominador 0, ln de 0...) del integrando dentro de [a, b]. */
function discontinuidades(f: Nodo, a: number, b: number): number[] {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const F = aFuncion(f);
  const out: number[] = [];
  const N = 4000;
  let prev = F(lo);
  for (let i = 1; i <= N; i++) {
    const x = lo + ((hi - lo) * i) / N;
    const y = F(x);
    if (Number.isFinite(prev) && Number.isFinite(y) && Math.abs(y) > 1e6 && Math.abs(prev) < 1e5) out.push(x);
    else if ((!Number.isFinite(y) || Math.abs(y) > 1e8) && !out.length) out.push(x);
    prev = y;
  }
  return out;
}

const parseLimite = (s: string, nombre: string): number => {
  if (!s || !s.trim()) throw new ErrorEntrada(`Falta el límite ${nombre} de integración.`);
  const v = valorNumerico(simplificar(parsear(s)));
  if (!Number.isFinite(v)) throw new ErrorEntrada(`El límite ${nombre} debe ser un número.`);
  return v;
};

/** Módulo Integrales: indefinida (sin límites) o definida (con a y b). */
export function resolverIntegral(texto: string, a?: string, b?: string): Resultado {
  const r = resultadoVacio('Integral');
  const definida = (a !== undefined && a.trim() !== '') || (b !== undefined && b.trim() !== '');
  let f: Nodo;
  let lo = 0, hi = 0;
  try {
    f = simplificar(enVariableX(parsear(texto)));
    if (definida) { lo = parseLimite(a ?? '', 'inferior'); hi = parseLimite(b ?? '', 'superior'); }
  } catch (e) {
    r.estado = 'error';
    r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Entrada inválida.');
    return r;
  }
  r.formula = definida ? '\\int_a^b f(x)\\,dx = F(b) - F(a)' : '\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\ (n \\neq -1)';
  r.sustitucion = definida ? `\\int_{${fmt(lo)}}^{${fmt(hi)}} ${aTex(f)}\\,dx` : intTex(f, 'x');

  if (definida) {
    const disc = lo === hi ? [] : discontinuidades(f, lo, hi);
    if (disc.length) {
      r.estado = 'advertencia';
      r.advertencias.push(`El integrando no está acotado o definido en x ≈ ${fmt(Math.round(disc[0] * 1e4) / 1e4)} dentro del intervalo [${fmt(Math.min(lo, hi))}, ${fmt(Math.max(lo, hi))}]: es una integral impropia y no se puede aplicar el teorema fundamental directamente.`);
      r.respuesta = { latex: '\\text{No calculada}', texto: 'No calculada (integral impropia)' };
      return r;
    }
  }

  let res: IntegralConPasos;
  try {
    res = integrarConPasos(f);
  } catch (e) {
    if (e instanceof NoResuelto) {
      r.estado = 'no-resuelto';
      r.advertencias.push(e.message);
      r.respuesta = { latex: '\\text{Sin antiderivada elemental conocida}', texto: 'No resuelta' };
      if (definida) {
        const aprox = simpson(aFuncion(f), lo, hi);
        if (Number.isFinite(aprox)) r.interpretacion = `Aproximación numérica (no exacta) del área: ≈ ${fmt(Math.round(aprox * 1e6) / 1e6)}.`;
      }
      return r;
    }
    throw e;
  }
  r.pasos = res.pasos;
  const Fx = res.F;
  const verInd = verificarAntiderivada(f, Fx);

  if (!definida) {
    r.respuesta = { latex: `${intTex(f, 'x')} = ${aTex(Fx)} + C`, texto: `${aTex(Fx)} + C` };
    r.verificacion = verInd;
    r.interpretacion = 'La antiderivada es única salvo una constante C: cualquier valor de C da una función cuya derivada es el integrando.';
  } else {
    const Fb = simplificar(sustituir(Fx, 'x', num(hi)));
    const Fa = simplificar(sustituir(Fx, 'x', num(lo)));
    const val = valorNumerico(simplificar(resta(Fb, Fa)));
    const exacto = simplificar(resta(Fb, Fa));
    r.pasos.push({ regla: 'Teorema fundamental del cálculo', descripcion: 'Se evalúa la antiderivada en los límites y se resta.', latex: `F(x) = ${aTex(Fx)}` });
    r.pasos.push({ regla: 'Evaluación', descripcion: `F(${fmt(hi)}) − F(${fmt(lo)})`, latex: `F(${fmt(hi)}) - F(${fmt(lo)}) = ${aTex(Fb)} - \\left(${aTex(Fa)}\\right) = ${aTex(exacto)}` });
    if (lo > hi) r.advertencias.push('El límite inferior es mayor que el superior: el resultado cambia de signo respecto a integrar de menor a mayor.');
    r.respuesta = { latex: `${r.sustitucion} = ${aTex(exacto)}${esNum(exacto) && !Number.isInteger(exacto.v) ? ` \\approx ${fmt(Math.round(val * 1e6) / 1e6)}` : ''}`, texto: fmt(Math.round(val * 1e6) / 1e6) };
    r.verificacion = verificarIntegralDefinida(f, lo, hi, val);
    const sinSigno = cambiaSigno(f, lo, hi);
    r.interpretacion = `El valor es el área neta con signo entre la curva y el eje x.${sinSigno ? ' La función cambia de signo en el intervalo: las áreas por debajo del eje restan.' : ''}`;
    if (!verInd.coincide) r.verificacion = verInd;
  }
  if (!r.verificacion?.coincide) {
    r.estado = 'advertencia';
    r.advertencias.push('Resultado no verificado: la comprobación numérica no coincide.');
  }
  return r;
}

function cambiaSigno(f: Nodo, a: number, b: number): boolean {
  const F = aFuncion(f);
  let pos = false, negv = false;
  for (let i = 0; i <= 200; i++) {
    const y = F(Math.min(a, b) + ((Math.abs(b - a)) * i) / 200);
    if (y > 1e-9) pos = true;
    if (y < -1e-9) negv = true;
  }
  return pos && negv;
}

export { raiz, compilar };
