import { Nodo, contiene, esNum, fn, igual, neg, num, pot, prod, resta, sum, sustituir, vr, fraccion } from './ast';
import { factorizarSimbolico } from './cas-externo';
import { derivar } from './derivadas';
import { ErrorEntrada } from './errores';
import { compilar, valorNumerico } from './evaluar';
import { parsear } from './parser';
import { coeficientes, separarFraccion, unirFracciones } from './polinomios';
import { Paso, Resultado, resultadoVacio } from './resultado.model';
import { expandir, simplificar } from './simplificar';
import { aTex } from './tex';
import { aTexto } from './texto';
import { fmt } from './verificacion';
import { enVariableX } from './variable';

export type Lado = 'ambos' | 'izq' | 'der';

type Res =
  | { tipo: 'valor'; v: number; ex: Nodo | null; aprox?: boolean }
  | { tipo: 'inf'; signo: 1 | -1 }
  | { tipo: 'no-existe'; motivo: string }
  | { tipo: 'indeterminado' };

const TOL0 = 1e-9;
const num$ = (v: number): Nodo => num(Math.round(v * 1e9) / 1e9);

const tiene = (n: Nodo, pred: (x: Nodo) => boolean): boolean => {
  if (pred(n)) return true;
  switch (n.t) {
    case 'fn': return tiene(n.a, pred);
    case 'pot': return tiene(n.b, pred) || tiene(n.e, pred);
    case 'sum': case 'prod': return n.a.some((x) => tiene(x, pred));
    default: return false;
  }
};
const hayAbs = (n: Nodo) => tiene(n, (x) => x.t === 'fn' && x.f === 'abs');
const haySqrt = (n: Nodo) => tiene(n, (x) => x.t === 'pot' && esNum(x.e) && Math.abs(x.e.v - 0.5) < 1e-12);

const fx = (n: Nodo) => { const f = compilar(n); return (x: number) => f({ x, t: x }); };

/** Clasifica una sucesión de valores f(x_k) cuando x_k se acerca a la meta. */
export function clasificar(v: number[]): { tipo: 'valor'; v: number; err: number } | { tipo: 'inf'; signo: 1 | -1 } | { tipo: 'indef' } | { tipo: 'oscila' } {
  const u = v.slice(-5);
  if (u.some((y) => Number.isNaN(y))) return { tipo: 'indef' };
  const last = u[u.length - 1];
  if (!Number.isFinite(last)) return { tipo: 'inf', signo: last > 0 ? 1 : -1 };
  const d = u.slice(1).map((y, i) => y - u[i]);
  const dl = Math.abs(d[d.length - 1]);
  if (dl <= 1e-4 * (1 + Math.abs(last)) && dl < Math.abs(d[0])) return { tipo: 'valor', v: last, err: dl };
  const mismoSigno = d.every((x) => x * d[0] > 0);
  if (mismoSigno && Math.abs(last) > 5 && Math.abs(d[d.length - 1]) >= Math.abs(d[d.length - 2]) * 0.5)
    return { tipo: 'inf', signo: last > 0 ? 1 : -1 };
  return { tipo: 'oscila' };
}

export function ladoNumerico(F: (x: number) => number, a: number, s: 1 | -1) {
  const vals = [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7].map((h) => F(a + s * h));
  return clasificar(vals);
}
export function infNumerico(F: (x: number) => number, s: 1 | -1) {
  return clasificar([2, 3, 4, 5, 6, 7].map((k) => F(s * Math.pow(10, k))));
}

function reconocer(v: number, err = 0): Nodo | null {
  const tol = Math.max(1e-9, 5 * err);
  const qmax = tol > 1e-6 ? 60 : 1000;
  for (let q = 1; q <= qmax; q++) {
    const p = Math.round(v * q);
    if (Math.abs(v - p / q) < tol) return num(p / q);
  }
  const f = fraccion(v / Math.PI);
  if (f && Math.abs(f[0]) < 20 && f[1] < 13 && Math.abs(v - (f[0] / f[1]) * Math.PI) < Math.max(1e-6, tol)) return simplificar(prod(num(f[0] / f[1]), { t: 'cte', n: 'pi' }));
  if (Math.abs(v - Math.E) < Math.max(1e-5, tol)) return { t: 'cte', n: 'e' };
  return null;
}

function reemplazarAbs(n: Nodo, a: number, s: 1 | -1): Nodo {
  switch (n.t) {
    case 'fn': {
      const arg = reemplazarAbs(n.a, a, s);
      if (n.f === 'abs') {
        const val = fx(arg)(a + s * 1e-7);
        return val >= 0 ? arg : neg(arg);
      }
      return fn(n.f, arg);
    }
    case 'pot': return pot(reemplazarAbs(n.b, a, s), reemplazarAbs(n.e, a, s));
    case 'sum': return sum(...n.a.map((x) => reemplazarAbs(x, a, s)));
    case 'prod': return prod(...n.a.map((x) => reemplazarAbs(x, a, s)));
    default: return n;
  }
}

const limTex = (f: Nodo, aT: string, lado: -1 | 0 | 1) =>
  `\\lim_{x \\to ${aT}${lado > 0 ? '^{+}' : lado < 0 ? '^{-}' : ''}} ${aTex(f)}`;
const resTex = (r: Res): string =>
  r.tipo === 'valor' ? (r.ex ? aTex(r.ex) : fmt(r.v)) : r.tipo === 'inf' ? (r.signo > 0 ? '+\\infty' : '-\\infty') : '\\text{no existe}';

interface Ctx { pasos: Paso[]; }

/** Notables trigonométricos en a = 0. Devuelve el valor o null. */
function notable(N: Nodo, D: Nodo, ctx: Ctx): Nodo | null {
  const razon = (A: Nodo, B: Nodo): number | null => {
    const g = fx(simplificar(prod(A, pot(B, num(-1)))));
    const xs = [0.013, 0.027, -0.019];
    const vs = xs.map(g);
    return vs.every((v) => Number.isFinite(v) && Math.abs(v - vs[0]) < 1e-6) ? vs[0] : null;
  };
  const coefDe = (n: Nodo, f: string): { c: number; A: Nodo } | null => {
    if (n.t === 'fn' && n.f === f) return { c: 1, A: n.a };
    if (n.t === 'prod' && n.a.length === 2 && esNum(n.a[0]) && n.a[1].t === 'fn' && n.a[1].f === f) return { c: n.a[0].v, A: n.a[1].a };
    return null;
  };
  for (const f of ['sin', 'tan']) {
    const nn = coefDe(N, f);
    if (nn && !contiene(D, 'x') === false) {
      const r = razon(nn.A, D);
      if (r !== null && Math.abs(fx(nn.A)(0)) < 1e-12) {
        ctx.pasos.push({ regla: `Límite notable ${f}(u)/u → 1`, descripcion: `Con u = ${aTex(simplificar(nn.A))} → 0: ${f}(u)/u → 1, y queda el factor ${fmt(r)}.`, latex: `\\lim \\frac{${f}(u)}{u} = 1 \\ \\Rightarrow \\ ${aTex(simplificar(prod(num(nn.c * r))))}` });
        return num$(nn.c * r);
      }
    }
    const dd = coefDe(D, f);
    if (dd && Math.abs(fx(dd.A)(0)) < 1e-12) {
      const r = razon(N, dd.A);
      if (r !== null) {
        ctx.pasos.push({ regla: `Límite notable u/${f}(u) → 1`, descripcion: `Con u = ${aTex(simplificar(dd.A))} → 0.`, latex: `\\lim \\frac{u}{${f}(u)} = 1 \\ \\Rightarrow \\ ${fmt(r / dd.c)}` });
        return num$(r / dd.c);
      }
    }
  }
  // (1 − cos A)/B
  if (N.t === 'sum' && N.a.length === 2) {
    const c1 = N.a.find((t) => esNum(t) && t.v === 1);
    const c2 = N.a.find((t) => t.t === 'prod' && t.a.length === 2 && esNum(t.a[0]) && t.a[0].v === -1 && t.a[1].t === 'fn' && t.a[1].f === 'cos');
    if (c1 && c2 && c2.t === 'prod' && c2.a[1].t === 'fn') {
      const A = c2.a[1].a;
      const r1 = razon(A, D);
      if (r1 !== null) {
        ctx.pasos.push({ regla: 'Límite notable (1 − cos u)/u → 0', descripcion: 'Con u → 0 el cociente tiende a 0.', latex: '\\lim \\frac{1-\\cos u}{u} = 0' });
        return num(0);
      }
      const r2 = razon(prod(A, A), D);
      if (r2 !== null) {
        ctx.pasos.push({ regla: 'Límite notable (1 − cos u)/u² → 1/2', descripcion: `Con u = ${aTex(simplificar(A))} → 0.`, latex: `\\lim \\frac{1-\\cos u}{u^2} = \\frac{1}{2} \\ \\Rightarrow \\ ${fmt(r2 / 2)}` });
        return num$(r2 / 2);
      }
    }
  }
  return null;
}

function conjugado(N: Nodo): { conj: Nodo; prodN: Nodo } | null {
  if (N.t !== 'sum') return null;
  const i = N.a.findIndex((t) => haySqrt(t) && (t.t === 'pot' || (t.t === 'prod' && t.a.some((x) => x.t === 'pot' && esNum(x.e) && x.e.v === 0.5))));
  if (i < 0) return null;
  const conj = simplificar(sum(...N.a.map((t, j) => (j === i ? neg(t) : t))));
  return { conj, prodN: expandir(prod(N, conj)) };
}

function limiteFinito(f0: Nodo, a: number, aN: Nodo, lado: -1 | 0 | 1, ctx: Ctx, prof = 0): Res {
  let f = simplificar(f0);
  const aT = aTex(aN);
  if (prof > 5) return { tipo: 'indeterminado' };

  if (lado !== 0 && hayAbs(f)) {
    const g = simplificar(reemplazarAbs(f, a, lado));
    ctx.pasos.push({ regla: 'Valor absoluto', descripcion: `Cerca de ${aT} por ${lado > 0 ? 'la derecha' : 'la izquierda'} se reescribe sin barras según el signo de lo de adentro.`, latex: `${aTex(f)} = ${aTex(g)}` });
    f = g;
  }
  const F = fx(f);

  if (lado === 0 && hayAbs(f)) {
    ctx.pasos.push({ regla: 'Límites laterales', descripcion: 'Con valor absoluto se analiza cada lado por separado.', latex: limTex(f, aT, 0) });
    const L = limiteFinito(f, a, aN, -1, ctx, prof + 1);
    const R = limiteFinito(f, a, aN, 1, ctx, prof + 1);
    return combinarLaterales(L, R);
  }

  // continuidad: sustitución directa
  const v0 = F(a);
  const izq = F(a - 1e-7), der = F(a + 1e-7);
  const ok = (y: number) => Number.isFinite(y) && Math.abs(y - v0) <= 1e-4 * (1 + Math.abs(v0));
  const lados = lado === 0 ? ok(izq) && ok(der) : lado < 0 ? ok(izq) : ok(der);
  if (Number.isFinite(v0) && lados) {
    const ex = simplificar(sustituir(f, 'x', aN));
    ctx.pasos.push({ regla: 'Sustitución directa', descripcion: `La función es continua en x = ${aT}, así que se sustituye.`, latex: `${limTex(f, aT, lado)} = ${aTex(sustituir(f, 'x', aN))} = ${aTex(ex)}` });
    return { tipo: 'valor', v: valorNumerico(ex), ex };
  }

  // dominio a un solo lado
  if (lado === 0 && (!Number.isFinite(izq) || !Number.isFinite(der)) && (Number.isFinite(izq) || Number.isFinite(der))) {
    ctx.pasos.push({ regla: 'Dominio', descripcion: `La función solo está definida a un lado de x = ${aT}.`, latex: limTex(f, aT, 0) });
    return { tipo: 'no-existe', motivo: 'la función no está definida a ambos lados del punto' };
  }

  const g = unirFracciones(f);
  const { N, D } = separarFraccion(g);
  if (D) {
    const nv = fx(N)(a), dv = fx(D)(a);
    if (Math.abs(dv) < TOL0 && Math.abs(nv) < TOL0) {
      ctx.pasos.push({ regla: 'Forma indeterminada 0/0', descripcion: 'Al sustituir, numerador y denominador valen 0: hay que transformar la expresión.', latex: `\\frac{${aTex(simplificar(sustituir(N, 'x', aN)))}}{${aTex(simplificar(sustituir(D, 'x', aN)))}} = \\frac{0}{0}` });
      if (Math.abs(a) < 1e-12) {
        const nt = notable(N, D, ctx);
        if (nt) return { tipo: 'valor', v: valorNumerico(nt), ex: nt };
      }
      // factorizar y simplificar
      const Nf = factorizarSimbolico(expandir(N));
      const Df = factorizarSimbolico(expandir(D));
      if (Nf && Df) {
        const g2 = simplificar(prod(Nf, pot(Df, num(-1))));
        if (aTexto(g2) !== aTexto(g)) {
          ctx.pasos.push({ regla: 'Factorizar y simplificar', descripcion: 'Se factorizan numerador y denominador y se cancela el factor común.', latex: `\\frac{${aTex(Nf)}}{${aTex(Df)}} = ${aTex(g2)}` });
          const r = limiteFinito(g2, a, aN, lado, ctx, prof + 1);
          if (r.tipo !== 'indeterminado') return r;
        }
      }
      // conjugado
      const cj = conjugado(N);
      if (cj) {
        const g2 = simplificar(prod(cj.prodN, pot(simplificar(prod(D, cj.conj)), num(-1))));
        const g3 = (factorizarSimbolico(expandir(cj.prodN)) && factorizarSimbolico(expandir(D)))
          ? simplificar(prod(factorizarSimbolico(expandir(cj.prodN)) as Nodo, pot(prod(factorizarSimbolico(expandir(D)) as Nodo, cj.conj), num(-1))))
          : g2;
        ctx.pasos.push({ regla: 'Multiplicar por el conjugado', descripcion: `Se multiplica numerador y denominador por ${aTex(cj.conj)} para eliminar la raíz.`, latex: `\\frac{${aTex(N)}}{${aTex(D)}}\\cdot\\frac{${aTex(cj.conj)}}{${aTex(cj.conj)}} = ${aTex(g3)}` });
        const r = limiteFinito(g3, a, aN, lado, ctx, prof + 1);
        if (r.tipo !== 'indeterminado') return r;
      }
      // L'Hôpital
      const dN = derivar(N), dD = derivar(D);
      const g2 = simplificar(prod(dN, pot(dD, num(-1))));
      ctx.pasos.push({ regla: "Regla de L'Hôpital", descripcion: 'Forma 0/0: se derivan numerador y denominador por separado.', latex: `\\lim \\frac{f}{g} = \\lim \\frac{f'}{g'} = \\lim ${aTex(g2)}` });
      return limiteFinito(g2, a, aN, lado, ctx, prof + 1);
    }
    if (Math.abs(dv) < TOL0) {
      ctx.pasos.push({ regla: 'Cociente con denominador → 0', descripcion: `El denominador tiende a 0 y el numerador a ${fmt(nv)} ≠ 0: el límite es infinito o no existe; se analizan los lados.`, latex: `\\frac{${fmt(nv)}}{0}` });
      const L = lado <= 0 ? ladoNumerico(F, a, -1) : null;
      const R = lado >= 0 ? ladoNumerico(F, a, 1) : null;
      return combinarLaterales(L ? aRes(L) : null, R ? aRes(R) : null);
    }
  }

  // respaldo numérico
  const L = lado <= 0 ? ladoNumerico(F, a, -1) : null;
  const R = lado >= 0 ? ladoNumerico(F, a, 1) : null;
  const l = L ? aRes(L) : null;
  const r = R ? aRes(R) : null;
  const res = combinarLaterales(l, r);
  if (res.tipo === 'valor') res.aprox = true;
  ctx.pasos.push({ regla: 'Análisis numérico', descripcion: 'No se encontró una transformación algebraica; se estudian los valores de f cerca del punto.', latex: limTex(f, aT, lado) });
  return res;
}

function aRes(c: ReturnType<typeof clasificar>): Res {
  if (c.tipo === 'valor') { const ex = reconocer(c.v, c.err); return { tipo: 'valor', v: ex ? valorNumerico(ex) : c.v, ex }; }
  if (c.tipo === 'inf') return { tipo: 'inf', signo: c.signo };
  return { tipo: 'no-existe', motivo: c.tipo === 'oscila' ? 'la función oscila' : 'la función no está definida cerca del punto' };
}

function igualesRes(a: Res, b: Res): boolean {
  if (a.tipo !== b.tipo) return false;
  if (a.tipo === 'valor' && b.tipo === 'valor') return Math.abs(a.v - b.v) < 1e-6 * Math.max(1, Math.abs(a.v));
  if (a.tipo === 'inf' && b.tipo === 'inf') return a.signo === b.signo;
  return false;
}

function combinarLaterales(L: Res | null, R: Res | null): Res {
  if (L && !R) return L;
  if (R && !L) return R;
  if (!L || !R) return { tipo: 'indeterminado' };
  if (igualesRes(L, R)) return L;
  const d = (x: Res) => (x.tipo === 'valor' ? fmt(x.v) : x.tipo === 'inf' ? (x.signo > 0 ? '+∞' : '−∞') : '?');
  return { tipo: 'no-existe', motivo: `los límites laterales son distintos: por la izquierda ${d(L)} y por la derecha ${d(R)}` };
}

function limiteInfinito(f0: Nodo, s: 1 | -1, ctx: Ctx): Res {
  const f = simplificar(f0);
  const sT = s > 0 ? '\\infty' : '-\\infty';
  const g = unirFracciones(f);
  const { N, D } = separarFraccion(g);
  const pn = coeficientes(N);
  const pd = D ? coeficientes(D) : [1];
  if (pn && pd && (D || pn.length > 0)) {
    const dn = pn.length - 1, dd = pd.length - 1;
    const ln = pn[dn], ld = pd[dd];
    if (D) {
      ctx.pasos.push({ regla: 'Comparación de grados', descripcion: `Se divide numerador y denominador entre x^${dd}, la mayor potencia del denominador. Grado del numerador: ${dn}; del denominador: ${dd}.`, latex: `\\lim_{x \\to ${sT}} \\frac{${aTex(N)}}{${aTex(D)}}` });
    } else {
      ctx.pasos.push({ regla: 'Término dominante', descripcion: `En un polinomio manda el término de mayor grado (${dn}).`, latex: `\\lim_{x \\to ${sT}} ${aTex(N)} = \\lim ${aTex(simplificar(prod(num(ln), pot(vr(), num(dn)))))}` });
    }
    if (dn < dd) { ctx.pasos.push({ regla: 'Grado menor', descripcion: 'Si el grado del numerador es menor, el cociente tiende a 0.', latex: `\\text{resultado} = 0` }); return { tipo: 'valor', v: 0, ex: num(0) }; }
    if (dn === dd) {
      const v = ln / ld;
      ctx.pasos.push({ regla: 'Grados iguales', descripcion: 'El límite es el cociente de los coeficientes principales.', latex: `\\frac{${fmt(ln)}}{${fmt(ld)}} = ${aTex(num(v))}` });
      return { tipo: 'valor', v, ex: num(v) };
    }
    const signo = Math.sign(ln / ld) * (s < 0 && (dn - dd) % 2 === 1 ? -1 : 1);
    ctx.pasos.push({ regla: 'Grado mayor', descripcion: 'El numerador crece más rápido: el límite es infinito; el signo depende del coeficiente y de la paridad de la diferencia de grados.', latex: `\\text{resultado} = ${signo > 0 ? '+' : '-'}\\infty` });
    return { tipo: 'inf', signo: signo > 0 ? 1 : -1 };
  }
  const c = infNumerico(fx(f), s);
  ctx.pasos.push({ regla: 'Dominancia de términos', descripcion: 'Se comparan las tasas de crecimiento de los términos (exponencial > polinomio > logaritmo) y se confirma con valores grandes de |x|.', latex: `\\lim_{x \\to ${sT}} ${aTex(f)}` });
  const r = aRes(c);
  if (r.tipo === 'valor') r.aprox = r.ex === null;
  return r;
}

/** Interpreta el punto de aproximación escrito por el usuario. */
export function parsearPunto(s: string): { inf: 1 | -1 } | { v: number; nodo: Nodo } {
  const t = s.trim().toLowerCase().replace(/\s+/g, '');
  if (!t) throw new ErrorEntrada('Falta indicar a qué valor tiende x.');
  if (['inf', '+inf', 'infinito', '+infinito', '∞', '+∞', 'oo', '+oo'].includes(t)) return { inf: 1 };
  if (['-inf', '-infinito', '-∞', '-oo', '−inf', '−∞'].includes(t)) return { inf: -1 };
  const nodo = simplificar(parsear(s));
  const v = valorNumerico(nodo);
  if (!Number.isFinite(v)) throw new ErrorEntrada('El valor al que tiende x debe ser un número (o ∞, -∞).');
  return { v, nodo };
}

function tablaTex(f: Nodo, a: number | null, s: 1 | -1 | 0): string {
  const F = fx(f);
  const filas: [number, number][] = [];
  if (a === null) for (const k of [1, 2, 3, 4, 5]) filas.push([s * Math.pow(10, k), F(s * Math.pow(10, k))]);
  else for (const h of [1e-1, 1e-2, 1e-3, 1e-4]) {
    if (s <= 0) filas.push([a - h, F(a - h)]);
    if (s >= 0) filas.push([a + h, F(a + h)]);
  }
  filas.sort((p, q) => p[0] - q[0]);
  const c = (v: number) => (Number.isFinite(v) ? fmt(Math.round(v * 1e6) / 1e6) : '\\text{indef.}');
  return `\\begin{array}{c|c} x & f(x) \\\\ \\hline ${filas.map(([x, y]) => `${c(x)} & ${c(y)}`).join(' \\\\ ')} \\end{array}`;
}

/** Módulo Límites. */
export function resolverLimite(texto: string, punto: string, lado: Lado = 'ambos'): Resultado {
  const r = resultadoVacio('Límite');
  let f: Nodo;
  let p: ReturnType<typeof parsearPunto>;
  try {
    f = simplificar(enVariableX(parsear(texto)));
    p = parsearPunto(punto);
  } catch (e) {
    r.estado = 'error';
    r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Entrada inválida.');
    return r;
  }
  const ctx: Ctx = { pasos: [] };
  const l: -1 | 0 | 1 = lado === 'izq' ? -1 : lado === 'der' ? 1 : 0;
  r.formula = "\\lim_{x \\to a} f(x) = L \\iff \\lim_{x \\to a^-} f(x) = \\lim_{x \\to a^+} f(x) = L";
  let res: Res;
  let aT: string;
  let tabla: string;
  if ('inf' in p) {
    aT = p.inf > 0 ? '\\infty' : '-\\infty';
    r.sustitucion = limTex(f, aT, 0);
    if (lado !== 'ambos') r.advertencias.push('Con x → ±∞ no se usan límites laterales; se ignoró el lado elegido.');
    res = limiteInfinito(f, p.inf, ctx);
    tabla = tablaTex(f, null, p.inf);
  } else {
    aT = aTex(p.nodo);
    r.sustitucion = limTex(f, aT, l);
    res = limiteFinito(f, p.v, p.nodo, l, ctx);
    tabla = tablaTex(f, p.v, l);
  }
  r.pasos = ctx.pasos;
  r.pasos.push({ regla: 'Tabla de aproximación', descripcion: 'Valores de f(x) cerca del punto (verificación numérica).', latex: tabla });

  switch (res.tipo) {
    case 'valor': {
      const t = res.ex ? aTex(res.ex) : fmt(Math.round(res.v * 1e6) / 1e6);
      r.respuesta = { latex: `${limTex(f, aT, 'inf' in p ? 0 : l)} = ${res.aprox ? '\\approx ' : ''}${t}`, texto: fmt(Math.round(res.v * 1e6) / 1e6) };
      if (res.aprox) { r.estado = 'advertencia'; r.advertencias.push('Valor obtenido por análisis numérico (aproximado); no se halló una demostración algebraica.'); }
      if ('inf' in p) r.interpretacion = `Hay una asíntota horizontal en y = ${fmt(res.v)} cuando x → ${p.inf > 0 ? '+∞' : '−∞'}.`;
      else r.interpretacion = `Cuando x se acerca a ${fmt(p.v)}, f(x) se acerca a ${fmt(res.v)}.`;
      break;
    }
    case 'inf':
      r.respuesta = { latex: `${limTex(f, aT, 'inf' in p ? 0 : l)} = ${res.signo > 0 ? '+\\infty' : '-\\infty'}`, texto: res.signo > 0 ? '+∞' : '−∞' };
      r.interpretacion = 'inf' in p ? 'La función crece (o decrece) sin cota.' : `Hay una asíntota vertical en x = ${fmt(p.v)}.`;
      break;
    case 'no-existe':
      r.respuesta = { latex: `${limTex(f, aT, 'inf' in p ? 0 : l)} \\ \\text{no existe}`, texto: 'El límite no existe' };
      r.interpretacion = `El límite no existe: ${res.motivo}.`;
      break;
    default:
      r.estado = 'no-resuelto';
      r.respuesta = { latex: '\\text{No determinado}', texto: 'No determinado' };
      r.advertencias.push('No se pudo determinar el límite con los métodos disponibles. Revisa la tabla de valores.');
  }
  r.verificacion = verificarLimite(f, 'inf' in p ? null : p.v, 'inf' in p ? p.inf : 0, l, res);
  if (res.tipo !== 'indeterminado' && !r.verificacion.coincide) {
    r.estado = 'advertencia';
    r.advertencias.push('Resultado no verificado: la tabla numérica contradice el resultado simbólico.');
  }
  return r;
}

export function verificarLimite(f: Nodo, a: number | null, s: number, lado: -1 | 0 | 1, res: Res) {
  const F = fx(f);
  let cls: ReturnType<typeof clasificar>[];
  if (a === null) cls = [infNumerico(F, s as 1 | -1)];
  else {
    cls = [];
    if (lado <= 0) cls.push(ladoNumerico(F, a, -1));
    if (lado >= 0) cls.push(ladoNumerico(F, a, 1));
  }
  const metodo = 'Tabla de aproximación numérica';
  if (res.tipo === 'indeterminado') return { metodo, coincide: false, detalle: 'Sin resultado que verificar.' };
  if (res.tipo === 'valor') {
    const bien = cls.every((c) => c.tipo === 'valor' && Math.abs(c.v - res.v) < 1e-3 * (1 + Math.abs(res.v)));
    return { metodo, coincide: bien, detalle: bien ? `Los valores de f se acercan a ${fmt(res.v)} desde ${a === null ? 'valores grandes de |x|' : 'los lados analizados'}.` : 'Los valores de la tabla no se acercan al resultado.' };
  }
  if (res.tipo === 'inf') {
    const bien = cls.every((c) => c.tipo === 'inf' && c.signo === res.signo);
    return { metodo, coincide: bien, detalle: bien ? 'Los valores de |f| crecen sin cota con el signo indicado.' : 'La tabla no muestra divergencia con ese signo.' };
  }
  const distintos = cls.length === 2 && (cls[0].tipo !== cls[1].tipo || (cls[0].tipo === 'valor' && cls[1].tipo === 'valor' && Math.abs(cls[0].v - cls[1].v) > 1e-3) || (cls[0].tipo === 'inf' && cls[1].tipo === 'inf' && cls[0].signo !== cls[1].signo));
  const sinLim = cls.some((c) => c.tipo === 'oscila' || c.tipo === 'indef');
  return { metodo, coincide: distintos || sinLim, detalle: distintos || sinLim ? 'La tabla confirma que los lados no coinciden o no se estabilizan.' : 'La tabla sugiere que sí existe límite.' };
}

export { igual, resta };
