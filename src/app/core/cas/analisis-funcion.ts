import { Nodo, contiene, esNum, num, sum, vr } from './ast';
import { enVariableX } from './variable';
import { factorizarSimbolico } from './cas-externo';
import { compilar } from './evaluar';
import { ErrorEntrada } from './errores';
import { derivar } from './derivadas';
import { parsear } from './parser';
import { Raiz, raicesReales, raizTex, raizTexCorto } from './raices';
import { DatosGrafica, Paso, PuntoGrafica, Resultado, resultadoVacio } from './resultado.model';
import { simplificar } from './simplificar';
import { aTex } from './tex';
import { fmt } from './verificacion';

export type TipoCritico = 'max' | 'min' | 'ninguno' | 'borde';

export interface PuntoCritico {
  x: Raiz;
  y: number;
  tipo: TipoCritico;
  criterio: string;
  f2: number | null;
}

export interface IntervaloMonotonia {
  desde: Raiz | null;
  hasta: Raiz | null;
  signo: 1 | -1;
}

export interface Analisis {
  f: Nodo;
  df: Nodo;
  d2f: Nodo;
  criticos: PuntoCritico[];
  inflexiones: { x: Raiz; y: number }[];
  ejeY: number | null;
  ejeX: Raiz[];
  intervalos: IntervaloMonotonia[];
  asintotasV: number[];
  asintotasH: number[];
}

const signo = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v > 0 ? 1 : -1);

/** Expresiones cuyo anulamiento causa una singularidad (denominadores, raíces, valores absolutos). */
function singulares(n: Nodo, acc: Nodo[] = []): Nodo[] {
  switch (n.t) {
    case 'pot':
      if (esNum(n.e) && (n.e.v < 0 || !Number.isInteger(n.e.v)) && contiene(n.b)) acc.push(n.b);
      singulares(n.b, acc); singulares(n.e, acc);
      break;
    case 'fn':
      if (n.f === 'abs' && contiene(n.a)) acc.push(n.a);
      if (['tan', 'sec'].includes(n.f)) acc.push(sum({ t: 'fn', f: 'cos', a: n.a }));
      if (['cot', 'csc'].includes(n.f)) acc.push({ t: 'fn', f: 'sin', a: n.a });
      if (n.f === 'ln' && contiene(n.a)) acc.push(n.a);
      singulares(n.a, acc);
      break;
    case 'sum': case 'prod': n.a.forEach((x) => singulares(x, acc)); break;
  }
  return acc;
}

export function analizar(f0: Nodo): Analisis {
  const f = simplificar(enVariableX(f0));
  const df = derivar(f);
  const d2f = derivar(df);
  const F = compilar(f), D = compilar(df), D2 = compilar(d2f);
  const fx = (x: number) => F({ x, t: x });
  const dx = (x: number) => D({ x, t: x });
  const d2x = (x: number) => D2({ x, t: x });

  const sing = singulares(f);
  const sing2 = singulares(df);
  const puntosSing: Raiz[] = [];
  for (const s of [...sing, ...sing2]) for (const r of raicesReales(s)) if (!puntosSing.some((p) => Math.abs(p.v - r.v) < 1e-6)) puntosSing.push(r);

  // asíntotas verticales: singularidades donde f explota
  const asintotasV = puntosSing
    .map((r) => r.v)
    .filter((x) => {
      const a = Math.abs(fx(x - 1e-7)), b = Math.abs(fx(x + 1e-7));
      return (a > 1e4 && Number.isFinite(a)) || (b > 1e4 && Number.isFinite(b));
    });

  const asintotasH: number[] = [];
  for (const [a, b] of [[1e6, 1e7], [-1e6, -1e7]]) {
    const ya = fx(a), yb = fx(b);
    if (Number.isFinite(ya) && Number.isFinite(yb) && Math.abs(ya - yb) < 1e-4 * Math.max(1, Math.abs(yb))) {
      const L = Math.round(yb * 1e6) / 1e6;
      if (!asintotasH.some((v) => Math.abs(v - L) < 1e-6)) asintotasH.push(L);
    }
  }

  // candidatos críticos
  const candidatos: Raiz[] = [...raicesReales(df)];
  for (const p of puntosSing) {
    if (Number.isFinite(fx(p.v)) && !Number.isFinite(dx(p.v)) && !candidatos.some((c) => Math.abs(c.v - p.v) < 1e-6))
      candidatos.push(p);
  }
  candidatos.sort((a, b) => a.v - b.v);
  const candidatosValidos = candidatos.filter((c) => Number.isFinite(fx(c.v)));

  const todos = [...candidatosValidos.map((c) => c.v), ...asintotasV].sort((a, b) => a - b);
  const holgura = (x: number) => {
    const vec = todos.filter((t) => Math.abs(t - x) > 1e-9).map((t) => Math.abs(t - x));
    return Math.min(1e-3, vec.length ? Math.min(...vec) / 4 : 1e-3);
  };

  const criticos: PuntoCritico[] = candidatosValidos.map((c) => {
    const y = fx(c.v);
    const f2 = d2x(c.v);
    if (Number.isFinite(f2) && Math.abs(f2) > 1e-7 && Number.isFinite(dx(c.v))) {
      return f2 < 0
        ? { x: c, y, tipo: 'max', criterio: `f''(${raizTexCorto(c)}) = ${fmt(Math.round(f2 * 1e6) / 1e6)} < 0`, f2 }
        : { x: c, y, tipo: 'min', criterio: `f''(${raizTexCorto(c)}) = ${fmt(Math.round(f2 * 1e6) / 1e6)} > 0`, f2 };
    }
    const h = holgura(c.v);
    const sl = signo(dx(c.v - h));
    const sr = signo(dx(c.v + h));
    const lado = (v: number) => (v > 0 ? 'positiva' : 'negativa');
    if (!Number.isFinite(dx(c.v - h)) || !Number.isFinite(dx(c.v + h)))
      return { x: c, y, tipo: 'borde', criterio: 'La función solo está definida a un lado: es un extremo del dominio', f2: null };
    const crit = `Criterio de la primera derivada: f′ es ${lado(sl)} a la izquierda y ${lado(sr)} a la derecha`;
    if (sl > 0 && sr < 0) return { x: c, y, tipo: 'max', criterio: crit, f2: Number.isFinite(f2) ? f2 : null };
    if (sl < 0 && sr > 0) return { x: c, y, tipo: 'min', criterio: crit, f2: Number.isFinite(f2) ? f2 : null };
    return { x: c, y, tipo: 'ninguno', criterio: `${crit}: no cambia de signo, no es extremo`, f2: Number.isFinite(f2) ? f2 : null };
  });

  const inflexiones = raicesReales(d2f)
    .filter((r) => Number.isFinite(fx(r.v)))
    .filter((r) => signo(d2x(r.v - 1e-3)) * signo(d2x(r.v + 1e-3)) < 0)
    .map((r) => ({ x: r, y: fx(r.v) }));

  const y0 = fx(0);
  const ejeX = raicesReales(f);

  // monotonía
  const cortes = [...candidatosValidos.map((c) => ({ r: c, asint: false })), ...puntosSing.filter((p) => asintotasV.includes(p.v)).map((r) => ({ r, asint: true }))]
    .sort((a, b) => a.r.v - b.r.v)
    .filter((c, i, arr) => i === 0 || Math.abs(c.r.v - arr[i - 1].r.v) > 1e-6);
  const bordes: (Raiz | null)[] = [null, ...cortes.map((c) => c.r), null];
  const intervalos: IntervaloMonotonia[] = [];
  for (let i = 0; i < bordes.length - 1; i++) {
    const a = bordes[i], b = bordes[i + 1];
    const lo = a ? a.v : (b ? b.v - 2 : -2);
    const hi = b ? b.v : (a ? a.v + 2 : 2);
    const muestras = [0.5, 0.25, 0.75].map((t) => lo + (hi - lo) * t);
    let s = 0;
    for (const m of muestras) { const v = dx(m); if (Number.isFinite(v) && Math.abs(v) > 1e-9) { s = signo(v); break; } }
    if (s === 0) continue;
    const previo = intervalos[intervalos.length - 1];
    const corteAsint = a ? cortes.find((c) => c.r === a)?.asint : false;
    if (previo && previo.signo === s && !corteAsint && previo.hasta === a) previo.hasta = b;
    else intervalos.push({ desde: a, hasta: b, signo: s as 1 | -1 });
  }

  return { f, df, d2f, criticos, inflexiones, ejeY: Number.isFinite(y0) ? y0 : null, ejeX, intervalos, asintotasV, asintotasH };
}

const ptTex = (x: Raiz, y: number) => `\\left(${raizTexCorto(x)},\\ ${fmt(Math.round(y * 1e6) / 1e6)}\\right)`;
const extremo = (r: Raiz | null, lado: 'a' | 'b') => (r ? raizTexCorto(r) : lado === 'a' ? '-\\infty' : '\\infty');
const intervaloTex = (i: IntervaloMonotonia) => `\\left(${extremo(i.desde, 'a')},\\ ${extremo(i.hasta, 'b')}\\right)`;
const union = (ints: IntervaloMonotonia[]) => (ints.length ? ints.map(intervaloTex).join(' \\cup ') : '\\emptyset');

/** Módulo Gráficas / análisis: extremos, monotonía, inflexión e intersecciones, con pasos. */
export function resolverAnalisis(texto: string): Resultado {
  const r = resultadoVacio('Análisis de la función');
  let a: Analisis;
  try {
    a = analizar(parsear(texto));
  } catch (e) {
    r.estado = 'error';
    r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'No se pudo analizar la expresión.');
    return r;
  }
  if (!contiene(a.f)) {
    r.estado = 'advertencia';
    r.advertencias.push('La expresión es constante: no tiene puntos críticos ni cambia de valor.');
  }
  r.formula = "f'(x) = 0 \\ \\Rightarrow \\text{puntos críticos};\\quad f''(c) > 0 \\Rightarrow \\text{mínimo},\\ f''(c) < 0 \\Rightarrow \\text{máximo}";
  r.sustitucion = `f(x) = ${aTex(a.f)}`;
  const pasos: Paso[] = [];
  pasos.push({ regla: 'Primera derivada', descripcion: 'Se deriva la función.', latex: `f'(x) = ${aTex(a.df)}` });

  const fac = factorizarSimbolico(a.df);
  const rdf = a.criticos;
  const listaX = rdf.map((c) => `x = ${raizTexCorto(c.x)}`).join(',\\ ');
  pasos.push({
    regla: 'Puntos críticos',
    descripcion: 'Se resuelve f′(x) = 0 (y se buscan los puntos donde f′ no existe).',
    latex: `${fac ? `f'(x) = ${aTex(fac)} = 0` : `f'(x) = 0`}${rdf.length ? ` \\ \\Rightarrow \\ ${listaX}` : ' \\ \\Rightarrow \\ \\text{sin soluciones reales}'}`,
  });
  pasos.push({ regla: 'Segunda derivada', descripcion: 'Se deriva de nuevo para clasificar.', latex: `f''(x) = ${aTex(a.d2f)}` });
  for (const c of a.criticos) {
    const nombre = c.tipo === 'max' ? 'máximo relativo' : c.tipo === 'min' ? 'mínimo relativo' : c.tipo === 'borde' ? 'extremo del dominio' : 'no es extremo';
    pasos.push({
      regla: c.f2 !== null && /f''/.test(c.criterio) ? 'Criterio de la segunda derivada' : 'Criterio de la primera derivada',
      descripcion: c.criterio.replace(/f''/g, 'f″'),
      latex: `f\\left(${raizTexCorto(c.x)}\\right) = ${fmt(Math.round(c.y * 1e6) / 1e6)} \\ \\Rightarrow \\ \\text{${nombre}}\\ ${ptTex(c.x, c.y)}`,
    });
  }
  const crece = a.intervalos.filter((i) => i.signo > 0);
  const decrece = a.intervalos.filter((i) => i.signo < 0);
  pasos.push({ regla: 'Signo de f′', descripcion: 'Se evalúa el signo de f′ en cada intervalo entre puntos críticos.', latex: `\\text{crece: } ${union(crece)};\\quad \\text{decrece: } ${union(decrece)}` });
  if (a.inflexiones.length)
    pasos.push({ regla: 'Puntos de inflexión', descripcion: 'f″ cambia de signo.', latex: a.inflexiones.map((p) => ptTex(p.x, p.y)).join(',\\ ') });
  if (a.ejeY !== null) pasos.push({ regla: 'Intersección con el eje y', descripcion: 'Se evalúa f(0).', latex: `f(0) = ${fmt(Math.round(a.ejeY * 1e6) / 1e6)} \\Rightarrow \\left(0,\\ ${fmt(Math.round(a.ejeY * 1e6) / 1e6)}\\right)` });
  pasos.push({ regla: 'Intersecciones con el eje x', descripcion: 'Se resuelve f(x) = 0.', latex: a.ejeX.length ? a.ejeX.map((x) => `\\left(${raizTex(x)},\\ 0\\right)`).join(',\\ ') : '\\text{no corta el eje } x' });
  r.pasos = pasos;

  const maxs = a.criticos.filter((c) => c.tipo === 'max');
  const mins = a.criticos.filter((c) => c.tipo === 'min');
  const partes: string[] = [];
  if (maxs.length) partes.push(`\\text{Máximo relativo: } ${maxs.map((c) => ptTex(c.x, c.y)).join(',\\ ')}`);
  if (mins.length) partes.push(`\\text{Mínimo relativo: } ${mins.map((c) => ptTex(c.x, c.y)).join(',\\ ')}`);
  if (!partes.length) partes.push('\\text{No tiene extremos relativos}');
  r.respuesta = { latex: partes.join(';\\quad '), texto: partes.join('; ') };

  const interp: string[] = [];
  if (crece.length) interp.push('crece en ' + crece.map(descrip).join(' y '));
  if (decrece.length) interp.push('decrece en ' + decrece.map(descrip).join(' y '));
  r.interpretacion = interp.length ? `La función ${interp.join(' y ')}.` : 'La función es constante.';
  if (a.asintotasV.length) r.interpretacion += ` Tiene asíntota(s) vertical(es) en x = ${a.asintotasV.map((v) => fmt(Math.round(v * 1e4) / 1e4)).join(', ')}.`;
  if (a.asintotasH.length) r.interpretacion += ` Tiene asíntota horizontal en y = ${a.asintotasH.map(fmt).join(', ')}.`;

  // verificación numérica: un máximo debe superar a sus vecinos, un mínimo ser menor
  const F = compilar(a.f);
  const fx = (x: number) => F({ x, t: x });
  const malos = [...maxs, ...mins].filter((c) => {
    const h = 1e-3;
    const v = c.y, l = fx(c.x.v - h), rr = fx(c.x.v + h);
    return c.tipo === 'max' ? !(v >= l - 1e-9 && v >= rr - 1e-9) : !(v <= l + 1e-9 && v <= rr + 1e-9);
  });
  r.verificacion = {
    metodo: 'Comparación con valores vecinos',
    coincide: malos.length === 0,
    detalle: malos.length ? 'Algún extremo no supera a sus valores vecinos.' : 'Cada máximo supera y cada mínimo es menor que los valores de f a ambos lados.',
  };
  if (malos.length) { r.estado = 'advertencia'; r.advertencias.push('Resultado no verificado numéricamente.'); }

  r.grafica = datosGrafica(a);
  return r;
}

function descrip(i: IntervaloMonotonia): string {
  const e = (x: Raiz | null, l: 'a' | 'b') => (x ? raizTexCorto(x).replace(/\\/g, '') : l === 'a' ? '−∞' : '∞');
  return `(${e(i.desde, 'a')}, ${e(i.hasta, 'b')})`;
}

export function datosGrafica(a: Analisis, texto?: string): DatosGrafica {
  const puntos: PuntoGrafica[] = [];
  for (const c of a.criticos) puntos.push({ x: c.x.v, y: c.y, etiqueta: `${c.tipo === 'max' ? 'Máx' : c.tipo === 'min' ? 'Mín' : 'Crítico'} (${fmt(round(c.x.v))}, ${fmt(round(c.y))})`, tipo: c.tipo === 'max' ? 'maximo' : c.tipo === 'min' ? 'minimo' : 'otro' });
  for (const p of a.inflexiones) puntos.push({ x: p.x.v, y: p.y, etiqueta: `Inflexión (${fmt(round(p.x.v))}, ${fmt(round(p.y))})`, tipo: 'inflexion' });
  if (a.ejeY !== null) puntos.push({ x: 0, y: a.ejeY, etiqueta: `(0, ${fmt(round(a.ejeY))})`, tipo: 'interseccion' });
  for (const x of a.ejeX) puntos.push({ x: x.v, y: 0, etiqueta: `(${fmt(round(x.v))}, 0)`, tipo: 'interseccion' });
  const xs = [0, ...puntos.map((p) => p.x), ...a.asintotasV];
  const mn = Math.min(...xs), mx = Math.max(...xs);
  const span = Math.max(mx - mn, 4);
  const pad = span * 0.4;
  return {
    funciones: [{ texto: texto ?? aTex(a.f), latex: aTex(a.f) }],
    puntos,
    asintotasVerticales: a.asintotasV,
    asintotasHorizontales: a.asintotasH,
    xmin: Math.floor((mn - pad) * 2) / 2,
    xmax: Math.ceil((mx + pad) * 2) / 2,
  };
}
const round = (v: number) => Math.round(v * 1e4) / 1e4;

export { num, vr, enVariableX };
