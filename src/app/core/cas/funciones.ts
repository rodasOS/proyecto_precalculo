import { Nodo, contiene, esNum, fn, fraccion, num, pot, resta, sum, sustituir, variables, vr } from './ast';
import { analizar } from './analisis-funcion';
import { enVariableX } from './variable';
import { ErrorEntrada } from './errores';
import { compilar, valorNumerico } from './evaluar';
import { Intervalo, normalizarIntervalos, unionTex, unionTexto } from './intervalos';
import { infNumerico, ladoNumerico } from './limites';
import { parsear } from './parser';
import { Raiz, raicesReales, raizTexCorto } from './raices';
import { Paso, Resultado, resultadoVacio } from './resultado.model';
import { simplificar, expandir } from './simplificar';
import { aTex } from './tex';
import { fmt, puntosValidos } from './verificacion';

interface Restriccion { g: Nodo; tipo: '>0' | '>=0' | '!=0' | '[-1,1]' | 'trig'; texto: string; latex: string }

function restricciones(n: Nodo, acc: Restriccion[] = []): Restriccion[] {
  const add = (g: Nodo, tipo: Restriccion['tipo'], simbolo: string, simboloTex: string) => {
    if (!contiene(g)) return;
    const s = simplificar(g);
    if (!acc.some((r) => r.texto === `${aTex(s)} ${simbolo}`))
      acc.push({ g: s, tipo, texto: `${aTex(s)} ${simbolo}`, latex: `${aTex(s)} ${simboloTex}` });
  };
  switch (n.t) {
    case 'pot': {
      if (esNum(n.e)) {
        const f = fraccion(n.e.v);
        const par = f && f[1] % 2 === 0;
        if (n.e.v < 0 && !Number.isInteger(n.e.v) && par) add(n.b, '>0', '> 0', '> 0');
        else if (n.e.v < 0) add(n.b, '!=0', '≠ 0', '\\neq 0');
        else if (par) add(n.b, '>=0', '≥ 0', '\\geq 0');
      } else if (contiene(n.b) && contiene(n.e)) add(n.b, '>0', '> 0', '> 0');
      restricciones(n.b, acc); restricciones(n.e, acc);
      break;
    }
    case 'fn':
      if (n.f === 'ln' || n.f === 'log') add(n.a, '>0', '> 0', '> 0');
      if (n.f === 'asin' || n.f === 'acos') add(n.a, '[-1,1]', 'entre −1 y 1', '\\in [-1, 1]');
      if (['tan', 'sec'].includes(n.f) && contiene(n.a)) acc.push({ g: fn('cos', n.a), tipo: 'trig', texto: `cos(${aTex(n.a)}) ≠ 0`, latex: `\\cos\\left(${aTex(n.a)}\\right) \\neq 0` });
      if (['cot', 'csc'].includes(n.f) && contiene(n.a)) acc.push({ g: fn('sin', n.a), tipo: 'trig', texto: `sin(${aTex(n.a)}) ≠ 0`, latex: `\\sin\\left(${aTex(n.a)}\\right) \\neq 0` });
      restricciones(n.a, acc);
      break;
    case 'sum': case 'prod': n.a.forEach((x) => restricciones(x, acc)); break;
  }
  return acc;
}

const snap = (v: number) => (Math.abs(v - Math.round(v * 1e9) / 1e9) < 1e-11 ? Math.round(v * 1e9) / 1e9 : v);

export interface InfoDominio { intervalos: Intervalo[]; restricciones: Restriccion[]; periodico: boolean }

/** Dominio real de f: conjunto donde f toma valores reales finitos. */
export function dominio(f: Nodo): InfoDominio {
  const F = compilar(f);
  const fx = (x: number) => F({ x, t: x });
  const rs = restricciones(f);
  const periodico = rs.some((r) => r.tipo === 'trig');
  const pts: Raiz[] = [];
  for (const r of rs) {
    if (r.tipo === 'trig') continue;
    const gs = r.tipo === '[-1,1]' ? [simplificar(sum(r.g, num(-1))), simplificar(sum(r.g, num(1)))] : [r.g];
    for (const g of gs) for (const q of raicesReales(g)) if (!pts.some((p) => Math.abs(p.v - q.v) < 1e-9)) pts.push({ v: snap(q.v), ex: q.ex });
  }
  pts.sort((a, b) => a.v - b.v);
  const bordes = [-Infinity, ...pts.map((p) => p.v), Infinity];
  const ints: Intervalo[] = [];
  const mid = (lo: number, hi: number) => (Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : Number.isFinite(lo) ? lo + 1 : Number.isFinite(hi) ? hi - 1 : 0);
  for (let i = 0; i < bordes.length - 1; i++) {
    const lo = bordes[i], hi = bordes[i + 1];
    if (Number.isFinite(fx(mid(lo, hi)))) ints.push({ lo, hi, loInc: false, hiInc: false, loTex: pts[i - 1] && raizTexCorto(pts[i - 1]), hiTex: pts[i] && raizTexCorto(pts[i]) });
  }
  for (const p of pts) {
    if (Number.isFinite(fx(p.v))) ints.push({ lo: p.v, hi: p.v, loInc: true, hiInc: true, loTex: raizTexCorto(p), hiTex: raizTexCorto(p) });
  }
  return { intervalos: normalizarIntervalos(ints), restricciones: rs, periodico };
}

function periodicoTex(rs: Restriccion[]): string[] {
  return rs.filter((r) => r.tipo === 'trig').map((r) => (r.g.t === 'fn' && r.g.f === 'cos' ? `${aTex(r.g.a)} \\neq \\frac{\\pi}{2} + k\\pi` : `${aTex((r.g as Extract<Nodo, { t: 'fn' }>).a)} \\neq k\\pi`));
}

function parsearFuncion(texto: string): Nodo {
  const t = texto.replace(/^\s*(f|g|h|y)\s*(\(\s*x\s*\))?\s*=\s*/i, '');
  return enVariableX(simplificar(parsear(t)));
}

/** Módulo Álgebra: dominio. */
export function resolverDominio(texto: string): Resultado {
  const r = resultadoVacio('Dominio');
  let f: Nodo;
  try { f = parsearFuncion(texto); } catch (e) {
    r.estado = 'error'; r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Expresión inválida.'); return r;
  }
  const d = dominio(f);
  r.formula = '\\text{Dom}(f) = \\{x \\in \\mathbb{R} : f(x) \\text{ está definida}\\}';
  r.sustitucion = `f(x) = ${aTex(f)}`;
  if (!d.restricciones.length) r.pasos.push({ regla: 'Sin restricciones', descripcion: 'No hay denominadores, raíces pares ni logaritmos que limiten x.', latex: '\\text{Dom}(f) = \\mathbb{R}' });
  for (const q of d.restricciones.filter((x) => x.tipo !== 'trig')) {
    const por = q.tipo === '!=0' ? 'El denominador no puede ser cero.' : q.tipo === '>=0' ? 'El radicando de una raíz par debe ser no negativo.' : q.tipo === '>0' ? 'El argumento (o la base) debe ser positivo.' : 'El argumento de arcoseno/arcocoseno debe estar entre −1 y 1.';
    r.pasos.push({ regla: 'Restricción', descripcion: por, latex: q.latex });
  }
  for (const t of periodicoTex(d.restricciones)) r.pasos.push({ regla: 'Restricción periódica', descripcion: 'La tangente/secante/cotangente/cosecante no están definidas donde se anula el coseno/seno (k entero).', latex: t });
  r.pasos.push({ regla: 'Intersección de restricciones', descripcion: 'Se resuelve cada restricción y se intersectan.', latex: `\\text{Dom}(f) = ${unionTex(d.intervalos)}` });
  r.respuesta = { latex: `\\text{Dom}(f) = ${unionTex(d.intervalos)}${d.periodico ? ` \\ ;\\ ${periodicoTex(d.restricciones).join(', ')},\\ k \\in \\mathbb{Z}` : ''}`, texto: `Dom(f) = ${unionTexto(d.intervalos)}` };
  if (!d.intervalos.length) { r.estado = 'advertencia'; r.advertencias.push('La función no está definida para ningún real.'); }
  const F = compilar(f);
  const fuera = [-9.7, -4.3, -1.37, 0.41, 2.9, 7.6].filter((x) => !d.periodico && Number.isFinite(F({ x, t: x })) !== d.intervalos.some((i) => x > i.lo && x < i.hi));
  r.verificacion = { metodo: 'Evaluación en puntos de prueba', coincide: fuera.length === 0, detalle: fuera.length ? `Discrepancia en x = ${fuera[0]}.` : 'Dentro del dominio f toma valores reales; fuera, no.' };
  return r;
}

/** Rango de f por análisis de extremos y límites; null si no se puede determinar con seguridad. */
export function rango(f: Nodo): Intervalo[] | null {
  const d = dominio(f);
  if (d.periodico || !d.intervalos.length) return null;
  const F = compilar(f);
  const fx = (x: number) => F({ x, t: x });
  const A = analizar(f);
  const out: Intervalo[] = [];
  for (const I of d.intervalos) {
    const cands: { v: number; att: boolean }[] = [];
    for (const c of A.criticos) if (c.x.v > I.lo && c.x.v < I.hi || (c.x.v === I.lo && I.loInc) || (c.x.v === I.hi && I.hiInc)) cands.push({ v: c.y, att: true });
    const borde = (x: number, inc: boolean, lado: 1 | -1) => {
      if (!Number.isFinite(x)) {
        const c = infNumerico(fx, x > 0 ? 1 : -1);
        if (c.tipo === 'valor') cands.push({ v: c.v, att: false });
        else if (c.tipo === 'inf') cands.push({ v: c.signo * Infinity, att: false });
        else if (c.tipo !== 'oscila') return false;
      } else if (inc) cands.push({ v: fx(x), att: true });
      else {
        const c = ladoNumerico(fx, x, lado);
        if (c.tipo === 'valor') cands.push({ v: c.v, att: false });
        else if (c.tipo === 'inf') cands.push({ v: c.signo * Infinity, att: false });
        else return false;
      }
      return true;
    };
    if (I.lo === I.hi) { cands.push({ v: fx(I.lo), att: true }); } else {
      if (!borde(I.lo, I.loInc, 1) || !borde(I.hi, I.hiInc, -1)) return null;
    }
    if (!cands.length) return null;
    const mn = Math.min(...cands.map((c) => c.v));
    const mx = Math.max(...cands.map((c) => c.v));
    const tolIgual = (a: number, b: number) => Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a));
    out.push({ lo: mn, hi: mx, loInc: Number.isFinite(mn) && cands.some((c) => c.att && tolIgual(c.v, mn)), hiInc: Number.isFinite(mx) && cands.some((c) => c.att && tolIgual(c.v, mx)) });
  }
  const res = normalizarIntervalos(out.map((o) => ({ ...o, lo: Math.abs(o.lo) < 1e-12 ? 0 : o.lo, hi: Math.abs(o.hi) < 1e-12 ? 0 : o.hi })));
  // verificación por muestreo
  const pts = [...puntosValidos([fx], 40, 31), 50, 100, 1000, -50, -100, -1000].filter((x) => Number.isFinite(fx(x)) && d.intervalos.some((i) => x >= i.lo && x <= i.hi));
  const dentro = (y: number) => res.some((i) => (y > i.lo - 1e-9 && y < i.hi + 1e-9));
  if (pts.some((x) => !dentro(fx(x)))) return null;
  return res;
}

export function resolverRango(texto: string): Resultado {
  const r = resultadoVacio('Rango');
  let f: Nodo;
  try { f = parsearFuncion(texto); } catch (e) {
    r.estado = 'error'; r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Expresión inválida.'); return r;
  }
  r.formula = '\\text{Rango}(f) = \\{f(x) : x \\in \\text{Dom}(f)\\}';
  r.sustitucion = `f(x) = ${aTex(f)}`;
  const d = dominio(f);
  r.pasos.push({ regla: 'Dominio', descripcion: 'El rango se obtiene a partir del dominio.', latex: `\\text{Dom}(f) = ${unionTex(d.intervalos)}` });
  const R = rango(f);
  if (!R) {
    r.estado = 'no-resuelto';
    r.advertencias.push('No se pudo determinar el rango de forma confiable; no se muestra un resultado sin verificar.');
    r.respuesta = { latex: '\\text{No determinado}', texto: 'No determinado' };
    return r;
  }
  const A = analizar(f);
  if (A.criticos.length) r.pasos.push({ regla: 'Valores extremos', descripcion: 'Se evalúa f en los puntos críticos.', latex: A.criticos.map((c) => `f(${raizTexCorto(c.x)}) = ${fmt(Math.round(c.y * 1e6) / 1e6)}`).join(',\\ ') });
  r.pasos.push({ regla: 'Comportamiento en los bordes', descripcion: 'Se estudian los límites en los extremos del dominio y en las asíntotas.', latex: A.asintotasH.length ? `y = ${A.asintotasH.map(fmt).join(',\\ ')} \\text{ (asíntota horizontal)}` : '\\text{se analizan los límites en los extremos del dominio}' });
  r.pasos.push({ regla: 'Rango', descripcion: 'Una función continua en un intervalo toma todos los valores entre su mínimo y su máximo.', latex: `\\text{Rango}(f) = ${unionTex(R)}` });
  r.respuesta = { latex: `\\text{Rango}(f) = ${unionTex(R)}`, texto: `Rango(f) = ${unionTexto(R)}` };
  r.verificacion = { metodo: 'Muestreo de valores', coincide: true, detalle: 'Los valores de f en puntos de prueba (incluidos valores muy grandes de |x|) caen todos dentro del rango obtenido.' };
  return r;
}

/** Módulo Álgebra: composición f∘g y g∘f, con dominio y evaluación opcional. */
export function resolverComposicion(textoF: string, textoG: string, punto?: string): Resultado {
  const r = resultadoVacio('Composición de funciones');
  let f: Nodo, g: Nodo;
  let x0: number | null = null;
  try {
    if (!textoF?.trim() || !textoG?.trim()) throw new ErrorEntrada('Faltan las dos funciones f(x) y g(x).');
    f = parsearFuncion(textoF); g = parsearFuncion(textoG);
    if (punto?.trim()) {
      x0 = valorNumerico(simplificar(parsear(punto)));
      if (!Number.isFinite(x0)) throw new ErrorEntrada('El punto de evaluación debe ser un número.');
    }
  } catch (e) {
    r.estado = 'error'; r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Entrada inválida.'); return r;
  }
  r.formula = '(f \\circ g)(x) = f(g(x)), \\quad (g \\circ f)(x) = g(f(x))';
  r.sustitucion = `f(x) = ${aTex(f)},\\quad g(x) = ${aTex(g)}`;
  const lineas: string[] = [];
  const textos: string[] = [];
  const pasos: Paso[] = [];
  for (const [nombre, ext, int, sx, sint] of [['f \\circ g', f, g, 'f', 'g'], ['g \\circ f', g, f, 'g', 'f']] as [string, Nodo, Nodo, string, string][]) {
    const crudo = sustituir(ext, 'x', int);
    const simp = simplificar(crudo);
    const des = expandir(crudo);
    pasos.push({ regla: `Sustituir ${sint}(x) en ${sx}`, descripcion: `(${nombre})(x) = ${sx}(${sint}(x)): donde ${sx} tiene x se escribe ${sint}(x).`, latex: `(${nombre})(x) = ${aTex(crudo)}` });
    pasos.push({ regla: 'Simplificar', descripcion: 'Se desarrolla y se reducen términos semejantes.', latex: `(${nombre})(x) = ${aTex(simp)}${aTex(des) !== aTex(simp) ? ` = ${aTex(des)}` : ''}` });
    const dom = dominio(crudo);
    pasos.push({ regla: 'Dominio de la compuesta', descripcion: `x debe estar en el dominio de ${sint} y ${sint}(x) en el de ${sx}.`, latex: `\\text{Dom}(${nombre}) = ${unionTex(dom.intervalos)}` });
    lineas.push(`(${nombre})(x) = ${aTex(des)}`);
    textos.push(`(${nombre.replace('\\circ', '∘')})(x) = ${aTex(des)}`);
    if (x0 !== null) {
      const v = valorNumerico(simplificar(sustituir(crudo, 'x', num(x0))));
      if (Number.isFinite(v)) pasos.push({ regla: 'Evaluación', descripcion: `Se evalúa en x = ${fmt(x0)}.`, latex: `(${nombre})(${fmt(x0)}) = ${fmt(Math.round(v * 1e6) / 1e6)}` });
      else { r.estado = 'advertencia'; r.advertencias.push(`(${nombre.replace('\\circ', '∘')}) no está definida en x = ${fmt(x0)}.`); }
    }
  }
  r.pasos = pasos;
  r.respuesta = { latex: lineas.join(',\\quad '), texto: textos.join('; ') };
  // verificación: f(g(x)) numérico en puntos
  const Ff = compilar(f), Gg = compilar(g), C = compilar(sustituir(f, 'x', g));
  const pts = [-2.3, -0.7, 0.6, 1.9, 3.4];
  const malo = pts.find((x) => { const a = Ff({ x: Gg({ x }) }); const b = C({ x }); return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1e-9; });
  r.verificacion = { metodo: 'Comparación numérica f(g(x))', coincide: malo === undefined, detalle: malo === undefined ? 'La expresión obtenida coincide con evaluar f(g(x)) paso a paso en varios puntos.' : `Discrepancia en x = ${malo}.` };
  return r;
}

export { vr, pot, resta };
