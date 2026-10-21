import { Nodo, PI, contiene, div, num, pot, prod, resta, sum, sustituir, vr } from './ast';
import { analizar } from './analisis-funcion';
import { derivar } from './derivadas';
import { ErrorEntrada } from './errores';
import { compilar, valorNumerico } from './evaluar';
import { parsear } from './parser';
import { raizTexCorto } from './raices';
import { Paso, Resultado, resultadoVacio } from './resultado.model';
import { expandir, simplificar } from './simplificar';
import { aTex } from './tex';
import { fmt } from './verificacion';
import { enVariableX } from './variable';

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const f6 = (v: number) => fmt(r6(v));

/** Extremos absolutos de f continua en [a, b]. */
export function resolverExtremosAbsolutos(texto: string, sa: string, sb: string): Resultado {
  const r = resultadoVacio('Extremos absolutos en un intervalo');
  let f: Nodo, a: number, b: number;
  try {
    f = simplificar(enVariableX(parsear(texto)));
    if (!sa?.trim() || !sb?.trim()) throw new ErrorEntrada('Falta uno de los extremos del intervalo [a, b].');
    a = valorNumerico(simplificar(parsear(sa))); b = valorNumerico(simplificar(parsear(sb)));
    if (!Number.isFinite(a) || !Number.isFinite(b)) throw new ErrorEntrada('Los extremos del intervalo deben ser números.');
    if (a === b) throw new ErrorEntrada('Los extremos del intervalo deben ser distintos.');
  } catch (e) {
    r.estado = 'error'; r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Entrada inválida.'); return r;
  }
  if (a > b) { [a, b] = [b, a]; r.advertencias.push('Los extremos estaban invertidos; se usó el intervalo [menor, mayor].'); }
  const F = compilar(f);
  const fx = (x: number) => F({ x, t: x });
  let discontinua = false;
  for (let i = 0; i <= 2000; i++) { const y = fx(a + ((b - a) * i) / 2000); if (!Number.isFinite(y) || Math.abs(y) > 1e9) { discontinua = true; break; } }
  if (discontinua) {
    r.estado = 'no-resuelto';
    r.advertencias.push('La función no es continua (o no está definida) en todo [a, b]: el teorema del valor extremo no aplica.');
    return r;
  }
  r.formula = '\\text{Extremos absolutos} \\in \\{f(a),\\ f(b),\\ f(c) : f\'(c)=0 \\text{ o no existe},\\ c \\in (a, b)\\}';
  r.sustitucion = `f(x) = ${aTex(f)},\\quad [${fmt(a)},\\ ${fmt(b)}]`;
  const A = analizar(f);
  const dentro = A.criticos.filter((c) => c.x.v > a + 1e-9 && c.x.v < b - 1e-9);
  r.pasos.push({ regla: 'Puntos críticos interiores', descripcion: "Se resuelve f′(x) = 0 y se conservan los que están dentro de (a, b).", latex: `f'(x) = ${aTex(A.df)} \\ \\Rightarrow \\ ${dentro.length ? dentro.map((c) => `x = ${raizTexCorto(c.x)}`).join(',\\ ') : '\\text{ninguno en el intervalo}'}` });
  const cand = [{ x: a, label: fmt(a), y: fx(a) }, ...dentro.map((c) => ({ x: c.x.v, label: raizTexCorto(c.x), y: c.y })), { x: b, label: fmt(b), y: fx(b) }];
  r.pasos.push({
    regla: 'Tabla de comparación', descripcion: 'Se evalúa f en los extremos del intervalo y en los puntos críticos.',
    latex: `\\begin{array}{c|c} x & f(x) \\\\ \\hline ${cand.map((c) => `${c.label} & ${f6(c.y)}`).join(' \\\\ ')} \\end{array}`,
  });
  const tol = 1e-9 * Math.max(1, ...cand.map((c) => Math.abs(c.y)));
  const mx = Math.max(...cand.map((c) => c.y)), mn = Math.min(...cand.map((c) => c.y));
  const xs = (v: number) => cand.filter((c) => Math.abs(c.y - v) <= tol).map((c) => c.label);
  const lista = (l: string[]) => l.map((s) => `x = ${s}`).join(' \\text{ y } ');
  r.pasos.push({ regla: 'Conclusión', descripcion: 'El mayor valor es el máximo absoluto; el menor, el mínimo absoluto.', latex: `\\text{máx} = ${f6(mx)},\\quad \\text{mín} = ${f6(mn)}` });
  r.respuesta = { latex: `\\text{Máximo absoluto } ${f6(mx)} \\text{ en } ${lista(xs(mx))};\\quad \\text{mínimo absoluto } ${f6(mn)} \\text{ en } ${lista(xs(mn))}`, texto: `Máximo absoluto ${f6(mx)} (x = ${xs(mx).join(', ')}); mínimo absoluto ${f6(mn)} (x = ${xs(mn).join(', ')})` };
  let gMax = -Infinity, gMin = Infinity;
  for (let i = 0; i <= 20000; i++) { const y = fx(a + ((b - a) * i) / 20000); gMax = Math.max(gMax, y); gMin = Math.min(gMin, y); }
  const ok = Math.abs(gMax - mx) < 1e-3 * Math.max(1, Math.abs(mx)) && Math.abs(gMin - mn) < 1e-3 * Math.max(1, Math.abs(mn));
  r.verificacion = { metodo: 'Barrido numérico del intervalo', coincide: ok, detalle: `Barrido con 20 000 puntos: máx ≈ ${f6(gMax)}, mín ≈ ${f6(gMin)}.` };
  if (!ok) { r.estado = 'advertencia'; r.advertencias.push('El barrido numérico no coincide con la tabla.'); }
  r.interpretacion = `En [${fmt(a)}, ${fmt(b)}] la función nunca supera ${f6(mx)} ni baja de ${f6(mn)}.`;
  return r;
}

/** Razón de cambio promedio (entre a y b) e instantánea (en p). */
export function resolverRazonCambio(texto: string, sa: string, sb: string, sp: string, unidadY = '', unidadX = ''): Resultado {
  const r = resultadoVacio('Razón de cambio');
  let f: Nodo, a: number, b: number, p: number;
  try {
    f = simplificar(enVariableX(parsear(texto)));
    const num_ = (s: string, n: string) => {
      if (!s?.trim()) throw new ErrorEntrada(`Falta ${n}.`);
      const v = valorNumerico(simplificar(parsear(s)));
      if (!Number.isFinite(v)) throw new ErrorEntrada(`${n[0].toUpperCase() + n.slice(1)} debe ser un número.`);
      return v;
    };
    a = num_(sa, 'el valor inicial a'); b = num_(sb, 'el valor final b'); p = num_(sp, 'el punto para la razón instantánea');
    if (a === b) throw new ErrorEntrada('Los valores a y b deben ser distintos.');
  } catch (e) {
    r.estado = 'error'; r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Entrada inválida.'); return r;
  }
  const F = compilar(f);
  const fx = (x: number) => F({ x, t: x });
  if (![a, b, p].every((x) => Number.isFinite(fx(x)))) {
    r.estado = 'advertencia'; r.advertencias.push('La función no está definida en alguno de los valores indicados.'); return r;
  }
  const u = unidadY && unidadX ? ` ${unidadY}/${unidadX}` : unidadY ? ` ${unidadY}` : '';
  r.formula = "\\text{promedio} = \\frac{f(b) - f(a)}{b - a},\\qquad \\text{instantánea} = f'(p)";
  r.sustitucion = `\\frac{f(${fmt(b)}) - f(${fmt(a)})}{${fmt(b)} - ${fmt(a)}}`;
  const prom = (fx(b) - fx(a)) / (b - a);
  r.pasos.push({ regla: 'Razón de cambio promedio', descripcion: 'Cambio de f dividido entre el cambio de x en el intervalo.', latex: `\\frac{${f6(fx(b))} - ${f6(fx(a))}}{${fmt(b)} - ${fmt(a)}} = ${f6(prom)}` });
  const df = derivar(f);
  const inst = valorNumerico(simplificar(sustituir(df, 'x', num(p))));
  r.pasos.push({ regla: 'Derivada', descripcion: 'La razón de cambio instantánea es la derivada.', latex: `f'(x) = ${aTex(df)}` });
  r.pasos.push({ regla: 'Razón de cambio instantánea', descripcion: `Se evalúa f′ en x = ${fmt(p)}.`, latex: `f'(${fmt(p)}) = ${f6(inst)}` });
  r.respuesta = { latex: `\\text{promedio} = ${f6(prom)}${u ? `\\ \\text{${u.trim()}}` : ''},\\quad \\text{instantánea en } ${fmt(p)} = ${f6(inst)}${u ? `\\ \\text{${u.trim()}}` : ''}`, texto: `Promedio ${f6(prom)}${u}; instantánea en x = ${fmt(p)}: ${f6(inst)}${u}` };
  r.interpretacion = `Entre ${fmt(a)} y ${fmt(b)}, f cambia en promedio ${f6(prom)}${u} por unidad; justo en ${fmt(p)} lo hace a razón de ${f6(inst)}${u}.${Math.abs(prom - inst) < 1e-9 ? ' Coinciden porque f es lineal o p es el punto medio de una cuadrática (teorema del valor medio).' : ''}`;
  const h = 1e-5;
  const num_d = (fx(p + h) - fx(p - h)) / (2 * h);
  r.verificacion = { metodo: 'Cociente incremental', coincide: Math.abs(num_d - inst) < 1e-4 * Math.max(1, Math.abs(inst)), detalle: `Cociente incremental simétrico en ${fmt(p)}: ≈ ${f6(num_d)}.` };
  return r;
}

// ───────────────────────── Optimización ─────────────────────────

export interface EntradaPlantilla { id: string; label: string; unidad: string; ejemplo: number }

interface ConstruidoOpt {
  objetivo: Nodo;           // función de x
  lo: number; hi: number; loCerrado: boolean; hiCerrado: boolean;
  objetivoLatex: string; restriccion: string; reduccion: string;
  variable: string; nombreObjetivo: string; unidadObjetivo: string; unidadX: string;
  conclusion: (x: number, v: number) => string;
}

export interface PlantillaOpt {
  id: string; titulo: string; enunciado: string; tipo: 'max' | 'min';
  entradas: EntradaPlantilla[];
  construir: (v: Record<string, number>) => ConstruidoOpt;
}

const X = vr('x');

export const PLANTILLAS_OPT: PlantillaOpt[] = [
  {
    id: 'rectangulo-perimetro', titulo: 'Rectángulo de área máxima con perímetro dado', tipo: 'max',
    enunciado: 'Entre todos los rectángulos con un perímetro fijo, ¿cuál tiene el área máxima?',
    entradas: [{ id: 'P', label: 'Perímetro', unidad: 'm', ejemplo: 40 }],
    construir: ({ P }) => ({
      objetivo: simplificar(prod(X, sum(num(P / 2), prod(num(-1), X)))), lo: 0, hi: P / 2, loCerrado: false, hiCerrado: false,
      objetivoLatex: 'A = x\\,y', restriccion: `2x + 2y = ${fmt(P)} \\ \\Rightarrow \\ y = ${fmt(P / 2)} - x`,
      reduccion: `A(x) = x(${fmt(P / 2)} - x)`, variable: 'x (largo)', nombreObjetivo: 'área', unidadObjetivo: 'm²', unidadX: 'm',
      conclusion: (x, v) => `El área máxima es ${f6(v)} m², con largo ${f6(x)} m y ancho ${f6(P / 2 - x)} m${Math.abs(x - P / 4) < 1e-9 ? ' (un cuadrado)' : ''}.`,
    }),
  },
  {
    id: 'cerca-rio', titulo: 'Corral junto a un río (3 lados de cerca)', tipo: 'max',
    enunciado: 'Se dispone de cerca para tres lados de un corral rectangular; el cuarto lado es un río. ¿Qué dimensiones dan el área máxima?',
    entradas: [{ id: 'F', label: 'Longitud de cerca', unidad: 'm', ejemplo: 100 }],
    construir: ({ F }) => ({
      objetivo: simplificar(prod(X, sum(num(F), prod(num(-2), X)))), lo: 0, hi: F / 2, loCerrado: false, hiCerrado: false,
      objetivoLatex: 'A = x\\,y', restriccion: `2x + y = ${fmt(F)} \\ \\Rightarrow \\ y = ${fmt(F)} - 2x`,
      reduccion: `A(x) = x(${fmt(F)} - 2x)`, variable: 'x (lado perpendicular al río)', nombreObjetivo: 'área', unidadObjetivo: 'm²', unidadX: 'm',
      conclusion: (x, v) => `El área máxima es ${f6(v)} m², con lados de ${f6(x)} m (dos) y ${f6(F - 2 * x)} m (paralelo al río).`,
    }),
  },
  {
    id: 'caja-abierta', titulo: 'Caja abierta de volumen máximo', tipo: 'max',
    enunciado: 'De una lámina cuadrada se recortan cuadrados iguales en las esquinas y se doblan los lados para formar una caja sin tapa.',
    entradas: [{ id: 'L', label: 'Lado de la lámina', unidad: 'cm', ejemplo: 12 }],
    construir: ({ L }) => ({
      objetivo: simplificar(prod(X, pot(sum(num(L), prod(num(-2), X)), num(2)))), lo: 0, hi: L / 2, loCerrado: false, hiCerrado: false,
      objetivoLatex: 'V = x\\,(L - 2x)^2', restriccion: `\\text{base: } ${fmt(L)} - 2x \\text{ por } ${fmt(L)} - 2x,\\ \\text{altura } x`,
      reduccion: `V(x) = x(${fmt(L)} - 2x)^2`, variable: 'x (lado del recorte = altura)', nombreObjetivo: 'volumen', unidadObjetivo: 'cm³', unidadX: 'cm',
      conclusion: (x, v) => `El volumen máximo es ${f6(v)} cm³, recortando cuadrados de ${f6(x)} cm de lado (base de ${f6(L - 2 * x)} cm).`,
    }),
  },
  {
    id: 'rectangulo-area-perimetro-min', titulo: 'Rectángulo de perímetro mínimo con área dada', tipo: 'min',
    enunciado: 'Entre todos los rectángulos con un área fija, ¿cuál tiene el menor perímetro?',
    entradas: [{ id: 'A', label: 'Área', unidad: 'm²', ejemplo: 100 }],
    construir: ({ A }) => ({
      objetivo: simplificar(prod(num(2), sum(X, prod(num(A), pot(X, num(-1)))))), lo: 0, hi: Infinity, loCerrado: false, hiCerrado: false,
      objetivoLatex: 'P = 2x + 2y', restriccion: `x\\,y = ${fmt(A)} \\ \\Rightarrow \\ y = \\frac{${fmt(A)}}{x}`,
      reduccion: `P(x) = 2\\left(x + \\frac{${fmt(A)}}{x}\\right)`, variable: 'x (largo)', nombreObjetivo: 'perímetro', unidadObjetivo: 'm', unidadX: 'm',
      conclusion: (x, v) => `El perímetro mínimo es ${f6(v)} m, con lados de ${f6(x)} m y ${f6(A / x)} m.`,
    }),
  },
  {
    id: 'ingreso-maximo', titulo: 'Ingreso máximo con demanda lineal', tipo: 'max',
    enunciado: 'El precio depende de la cantidad vendida según p = a − b·q. ¿Qué cantidad maximiza el ingreso?',
    entradas: [{ id: 'a', label: 'Precio máximo a (con q = 0)', unidad: 'Q', ejemplo: 100 }, { id: 'b', label: 'Pendiente b', unidad: 'Q/unidad', ejemplo: 2 }],
    construir: ({ a, b }) => ({
      objetivo: simplificar(prod(X, sum(num(a), prod(num(-b), X)))), lo: 0, hi: a / b, loCerrado: true, hiCerrado: true,
      objetivoLatex: 'I = p\\,q', restriccion: `p = ${fmt(a)} - ${fmt(b)}q`,
      reduccion: `I(q) = q(${fmt(a)} - ${fmt(b)}q)`, variable: 'q (cantidad)', nombreObjetivo: 'ingreso', unidadObjetivo: 'Q', unidadX: 'unidades',
      conclusion: (x, v) => `El ingreso máximo es Q ${f6(v)}, vendiendo ${f6(x)} unidades a un precio de Q ${f6(a - b * x)}.`,
    }),
  },
  {
    id: 'lata-cilindro', titulo: 'Lata cilíndrica de superficie mínima', tipo: 'min',
    enunciado: 'Una lata cilíndrica cerrada debe tener un volumen dado. ¿Qué radio minimiza el material?',
    entradas: [{ id: 'V', label: 'Volumen', unidad: 'cm³', ejemplo: 500 }],
    construir: ({ V }) => ({
      objetivo: simplificar(sum(prod(num(2), PI, pot(X, num(2))), prod(num(2 * V), pot(X, num(-1))))), lo: 0, hi: Infinity, loCerrado: false, hiCerrado: false,
      objetivoLatex: 'S = 2\\pi r^2 + 2\\pi r h', restriccion: `\\pi r^2 h = ${fmt(V)} \\ \\Rightarrow \\ h = \\frac{${fmt(V)}}{\\pi r^2}`,
      reduccion: `S(r) = 2\\pi r^2 + \\frac{${fmt(2 * V)}}{r}`, variable: 'r (radio)', nombreObjetivo: 'superficie', unidadObjetivo: 'cm²', unidadX: 'cm',
      conclusion: (x, v) => `La superficie mínima es ${f6(v)} cm², con radio ${f6(x)} cm y altura ${f6(V / (Math.PI * x * x))} cm (h = 2r).`,
    }),
  },
];

export function resolverOptimizacion(id: string, valores: Record<string, number | string>): Resultado {
  const r = resultadoVacio('Optimización');
  const pl = PLANTILLAS_OPT.find((p) => p.id === id);
  if (!pl) { r.estado = 'error'; r.advertencias.push('Plantilla de optimización desconocida.'); return r; }
  const v: Record<string, number> = {};
  for (const e of pl.entradas) {
    const raw = valores[e.id];
    if (raw === undefined || raw === null || String(raw).trim() === '') { r.estado = 'error'; r.advertencias.push(`Falta el dato «${e.label}».`); return r; }
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
    if (!Number.isFinite(n)) { r.estado = 'error'; r.advertencias.push(`«${e.label}» debe ser un número.`); return r; }
    if (n <= 0) { r.estado = 'error'; r.advertencias.push(`«${e.label}» debe ser positivo (mayor que 0); no se calculó.`); return r; }
    v[e.id] = n;
  }
  r.titulo = pl.titulo;
  const c = pl.construir(v);
  r.formula = `\\text{Optimizar } ${c.objetivoLatex} \\text{ sujeto a la restricción}`;
  r.sustitucion = pl.entradas.map((e) => `${e.id} = ${fmt(v[e.id])}\\ \\text{${e.unidad}}`).join(',\\quad ');
  const pasos: Paso[] = [];
  pasos.push({ regla: 'Función objetivo', descripcion: `Se quiere ${pl.tipo === 'max' ? 'maximizar' : 'minimizar'} el ${c.nombreObjetivo}.`, latex: c.objetivoLatex });
  pasos.push({ regla: 'Restricción', descripcion: 'Relaciona las variables con los datos del problema.', latex: c.restriccion });
  pasos.push({ regla: 'Reducir a una variable', descripcion: `Se sustituye la restricción en la función objetivo; variable: ${c.variable}.`, latex: c.reduccion + ` = ${aTex(c.objetivo)}` });
  const dom = `${c.loCerrado ? '[' : '('}${fmt(c.lo)},\\ ${Number.isFinite(c.hi) ? fmt(c.hi) : '\\infty'}${c.hiCerrado && Number.isFinite(c.hi) ? ']' : ')'}`;
  pasos.push({ regla: 'Dominio práctico', descripcion: 'Las medidas físicas deben ser positivas y la restricción debe poder cumplirse.', latex: `x \\in ${dom}` });
  const A = analizar(c.objetivo);
  pasos.push({ regla: 'Derivar e igualar a 0', descripcion: 'Los óptimos ocurren donde la derivada vale 0.', latex: `f'(x) = ${aTex(A.df)} = 0` });
  const dentro = A.criticos.filter((k) => k.x.v > c.lo + 1e-9 - (c.loCerrado ? 1e-9 : 0) && k.x.v < c.hi - 1e-9);
  const fuera = A.criticos.filter((k) => !dentro.includes(k));
  pasos.push({ regla: 'Puntos críticos', descripcion: 'Soluciones de f′(x) = 0.', latex: A.criticos.length ? A.criticos.map((k) => `x = ${raizTexCorto(k.x)}`).join(',\\ ') : '\\text{ninguno}' });
  for (const k of fuera) {
    pasos.push({ regla: 'Descartado', descripcion: `x = ${fmt(r4(k.x.v))} está fuera del dominio práctico.`, latex: `x = ${raizTexCorto(k.x)} \\notin ${dom}` });
    r.advertencias.push(`Se descartó x = ${fmt(r4(k.x.v))}: queda fuera del dominio práctico.`);
  }
  const buscado = pl.tipo;
  const mejor = dentro.filter((k) => k.tipo === buscado).sort((p, q) => (buscado === 'max' ? q.y - p.y : p.y - q.y))[0];
  if (!mejor) {
    // evaluar los extremos del dominio
    const F = compilar(c.objetivo);
    const ev = (x: number) => F({ x, t: x });
    const bordes: { x: number; y: number }[] = [];
    if (c.loCerrado) bordes.push({ x: c.lo, y: ev(c.lo) });
    if (c.hiCerrado && Number.isFinite(c.hi)) bordes.push({ x: c.hi, y: ev(c.hi) });
    pasos.push({ regla: 'Extremos del dominio', descripcion: 'Sin un punto crítico válido, se revisan los extremos del dominio.', latex: bordes.length ? bordes.map((b) => `f(${fmt(b.x)}) = ${f6(b.y)}`).join(',\\ ') : '\\text{el dominio es abierto: no hay extremos que evaluar}' });
    r.pasos = pasos;
    r.estado = 'advertencia';
    if (bordes.length) {
      const b = bordes.sort((p, q) => (buscado === 'max' ? q.y - p.y : p.y - q.y))[0];
      r.respuesta = { latex: `x = ${fmt(b.x)},\\quad f = ${f6(b.y)}`, texto: `Óptimo en x = ${fmt(b.x)}: ${f6(b.y)}` };
      r.interpretacion = c.conclusion(b.x, b.y);
    } else {
      r.respuesta = { latex: '\\text{Sin óptimo en el dominio}', texto: 'Sin óptimo en el dominio' };
      r.advertencias.push('El problema no tiene un óptimo dentro del dominio práctico.');
    }
    return r;
  }
  pasos.push({ regla: mejor.f2 !== null ? 'Segunda derivada' : 'Criterio de la primera derivada', descripcion: mejor.criterio.replace(/f''/g, 'f″') + (mejor.tipo === 'max' ? ': es un máximo.' : ': es un mínimo.'), latex: `f''(x) = ${aTex(A.d2f)}` });
  pasos.push({ regla: 'Valor óptimo', descripcion: `Se evalúa la función objetivo en x = ${fmt(r4(mejor.x.v))}.`, latex: `f\\left(${raizTexCorto(mejor.x)}\\right) = ${f6(mejor.y)}` });
  // comparar con bordes (límites) para asegurar que es absoluto
  const F = compilar(c.objetivo);
  const ev = (x: number) => F({ x, t: x });
  const eps = 1e-6;
  const lim = [c.lo + eps, Number.isFinite(c.hi) ? c.hi - eps : 1e6].map(ev);
  const esAbs = lim.every((y) => (buscado === 'max' ? y <= mejor.y + 1e-6 : y >= mejor.y - 1e-6));
  if (!esAbs) r.advertencias.push('El punto crítico es un óptimo local pero no el absoluto: en el borde del dominio el valor es mejor.');
  r.pasos = pasos;
  r.respuesta = { latex: `x = ${raizTexCorto(mejor.x)}\\ \\text{${c.unidadX}},\\quad ${c.nombreObjetivo} = ${f6(mejor.y)}\\ \\text{${c.unidadObjetivo}}`, texto: `x = ${f6(mejor.x.v)} ${c.unidadX}; ${c.nombreObjetivo} = ${f6(mejor.y)} ${c.unidadObjetivo}` };
  r.interpretacion = c.conclusion(mejor.x.v, mejor.y);
  // verificación por barrido del dominio
  let best = buscado === 'max' ? -Infinity : Infinity;
  const lo = c.lo + 1e-6, hi = Number.isFinite(c.hi) ? c.hi - 1e-6 : Math.max(10 * mejor.x.v, 1000);
  for (let i = 0; i <= 50000; i++) { const y = ev(lo + ((hi - lo) * i) / 50000); if (Number.isFinite(y)) best = buscado === 'max' ? Math.max(best, y) : Math.min(best, y); }
  const ok = Math.abs(best - mejor.y) <= 1e-4 * Math.max(1, Math.abs(mejor.y)) && esAbs;
  r.verificacion = { metodo: 'Barrido numérico del dominio', coincide: ok, detalle: `El mejor valor hallado en 50 000 puntos es ≈ ${f6(best)}; la respuesta es ${f6(mejor.y)}.` };
  if (!ok) { r.estado = 'advertencia'; r.advertencias.push('Resultado no verificado por el barrido numérico.'); }
  return r;
}

// ───────────────────────── Razones relacionadas ─────────────────────────

export interface PlantillaRazon {
  id: string; titulo: string; enunciado: string;
  relTex: string;
  /** Q = g(X) expresado en x. */
  relacion: (p: Record<string, number>) => Nodo;
  Q: { nombre: string; latex: string; unidad: string };
  X: { nombre: string; latex: string; unidad: string };
  params: EntradaPlantilla[];
  /** Valida y devuelve un mensaje si el valor de X0 no tiene sentido físico. */
  valida?: (x0: number, p: Record<string, number>) => string | null;
}

export const PLANTILLAS_RAZON: PlantillaRazon[] = [
  {
    id: 'esfera', titulo: 'Esfera: volumen y radio', enunciado: 'El volumen V y el radio r de una esfera cambian con el tiempo.',
    relTex: 'V = \\frac{4}{3}\\pi r^3', relacion: () => prod(num(4 / 3), PI, pot(X, num(3))),
    Q: { nombre: 'V', latex: 'V', unidad: 'cm³' }, X: { nombre: 'r', latex: 'r', unidad: 'cm' }, params: [],
  },
  {
    id: 'circulo', titulo: 'Círculo: área y radio', enunciado: 'El área A y el radio r de un círculo cambian con el tiempo.',
    relTex: 'A = \\pi r^2', relacion: () => prod(PI, pot(X, num(2))),
    Q: { nombre: 'A', latex: 'A', unidad: 'cm²' }, X: { nombre: 'r', latex: 'r', unidad: 'cm' }, params: [],
  },
  {
    id: 'cubo', titulo: 'Cubo: volumen y arista', enunciado: 'El volumen V y la arista s de un cubo cambian con el tiempo.',
    relTex: 'V = s^3', relacion: () => pot(X, num(3)),
    Q: { nombre: 'V', latex: 'V', unidad: 'cm³' }, X: { nombre: 's', latex: 's', unidad: 'cm' }, params: [],
  },
  {
    id: 'escalera', titulo: 'Escalera que se desliza', enunciado: 'Una escalera apoyada en una pared se desliza: la base se aleja x de la pared y la parte alta baja a altura y.',
    relTex: 'x^2 + y^2 = L^2 \\ \\Rightarrow \\ y = \\sqrt{L^2 - x^2}', relacion: (p) => pot(sum(num(p['L'] ** 2), prod(num(-1), pot(X, num(2)))), num(0.5)),
    Q: { nombre: 'y', latex: 'y', unidad: 'm' }, X: { nombre: 'x', latex: 'x', unidad: 'm' },
    params: [{ id: 'L', label: 'Longitud de la escalera', unidad: 'm', ejemplo: 5 }],
    valida: (x0, p) => (x0 >= p['L'] ? 'La distancia x debe ser menor que la longitud de la escalera.' : null),
  },
  {
    id: 'cono', titulo: 'Tanque cónico: volumen y altura del agua', enunciado: 'Un tanque cónico (vértice abajo) se llena de agua: el volumen V y la altura h del agua cambian con el tiempo.',
    relTex: 'V = \\frac{\\pi}{3}\\left(\\frac{R}{H}\\right)^2 h^3', relacion: (p) => prod(num(1 / 3), PI, num((p['R'] / p['H']) ** 2), pot(X, num(3))),
    Q: { nombre: 'V', latex: 'V', unidad: 'm³' }, X: { nombre: 'h', latex: 'h', unidad: 'm' },
    params: [{ id: 'R', label: 'Radio de la tapa del tanque', unidad: 'm', ejemplo: 2 }, { id: 'H', label: 'Altura del tanque', unidad: 'm', ejemplo: 4 }],
    valida: (x0, p) => (x0 > p['H'] ? 'La altura del agua no puede superar la altura del tanque.' : null),
  },
];

/**
 * Razón de cambio relacionada. Si `conocida` es 'X', se conoce dX/dt y se pide dQ/dt;
 * si es 'Q', se conoce dQ/dt y se pide dX/dt.
 */
export function resolverRazonRelacionada(id: string, conocida: 'X' | 'Q', tasa: number | string, x0: number | string, params: Record<string, number | string> = {}, unidadTiempo = 's'): Resultado {
  const r = resultadoVacio('Razones de cambio relacionadas');
  const pl = PLANTILLAS_RAZON.find((p) => p.id === id);
  if (!pl) { r.estado = 'error'; r.advertencias.push('Plantilla desconocida.'); return r; }
  r.titulo = pl.titulo;
  const aNum = (v: number | string, nombre: string) => {
    if (v === undefined || v === null || String(v).trim() === '') throw new ErrorEntrada(`Falta el dato «${nombre}».`);
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (!Number.isFinite(n)) throw new ErrorEntrada(`«${nombre}» debe ser un número.`);
    return n;
  };
  let t: number, x: number;
  const p: Record<string, number> = {};
  try {
    t = aNum(tasa, 'razón de cambio conocida'); x = aNum(x0, `valor de ${pl.X.nombre}`);
    for (const e of pl.params) { p[e.id] = aNum(params[e.id], e.label); if (p[e.id] <= 0) throw new ErrorEntrada(`«${e.label}» debe ser positivo.`); }
    if (x <= 0) throw new ErrorEntrada(`El valor de ${pl.X.nombre} debe ser positivo.`);
    const msg = pl.valida?.(x, p);
    if (msg) throw new ErrorEntrada(msg);
  } catch (e) {
    r.estado = 'error'; r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Entrada inválida.'); return r;
  }
  const g = simplificar(pl.relacion(p));
  const dg = derivar(g);
  const dgx = valorNumerico(simplificar(sustituir(dg, 'x', num(x))));
  const Q = pl.Q, Xv = pl.X;
  r.formula = `${pl.relTex} \\ \\Rightarrow \\ \\frac{d${Q.latex}}{dt} = \\frac{d${Q.latex}}{d${Xv.latex}}\\cdot\\frac{d${Xv.latex}}{dt}`;
  r.sustitucion = `\\frac{d${conocida === 'X' ? Xv.latex : Q.latex}}{dt} = ${f6(t)},\\quad ${Xv.latex} = ${fmt(x)}${pl.params.map((q) => `,\\ ${q.id} = ${fmt(p[q.id])}`).join('')}`;
  const pasos: Paso[] = [];
  pasos.push({ regla: 'Relación entre las cantidades', descripcion: 'Se escribe la ecuación que liga las variables.', latex: pl.relTex });
  pasos.push({ regla: 'Derivar respecto al tiempo', descripcion: 'Regla de la cadena: todas las variables dependen de t.', latex: `\\frac{d${Q.latex}}{dt} = ${aTex(dg).replace(/x/g, Xv.latex)}\\cdot\\frac{d${Xv.latex}}{dt}` });
  if (Math.abs(dgx) < 1e-12 && conocida === 'Q') { r.estado = 'error'; r.advertencias.push(`En ${Xv.nombre} = ${fmt(x)} la derivada es 0: no se puede despejar la razón pedida.`); r.pasos = pasos; return r; }
  const sust = `${f6(dgx)}`;
  const uQ = `${Q.unidad}/${unidadTiempo}`, uX = `${Xv.unidad}/${unidadTiempo}`;
  let res: number;
  if (conocida === 'X') {
    res = dgx * t;
    pasos.push({ regla: 'Sustituir valores', descripcion: `En ${Xv.nombre} = ${fmt(x)}: d${Q.nombre}/d${Xv.nombre} = ${sust}.`, latex: `\\frac{d${Q.latex}}{dt} = ${sust}\\cdot ${f6(t)} = ${f6(res)}` });
    r.respuesta = { latex: `\\frac{d${Q.latex}}{dt} = ${f6(res)}\\ \\text{${uQ}}`, texto: `d${Q.nombre}/dt = ${f6(res)} ${uQ}` };
    r.interpretacion = `Cuando ${Xv.nombre} = ${fmt(x)} ${Xv.unidad}, ${Q.nombre} ${res >= 0 ? 'aumenta' : 'disminuye'} a razón de ${f6(Math.abs(res))} ${uQ}.`;
  } else {
    res = t / dgx;
    pasos.push({ regla: 'Despejar la razón pedida', descripcion: `En ${Xv.nombre} = ${fmt(x)}: d${Q.nombre}/d${Xv.nombre} = ${sust}.`, latex: `\\frac{d${Xv.latex}}{dt} = \\frac{${f6(t)}}{${sust}} = ${f6(res)}` });
    r.respuesta = { latex: `\\frac{d${Xv.latex}}{dt} = ${f6(res)}\\ \\text{${uX}}`, texto: `d${Xv.nombre}/dt = ${f6(res)} ${uX}` };
    r.interpretacion = `Cuando ${Xv.nombre} = ${fmt(x)} ${Xv.unidad}, ${Xv.nombre} ${res >= 0 ? 'aumenta' : 'disminuye'} a razón de ${f6(Math.abs(res))} ${uX}.`;
  }
  r.pasos = pasos;
  const G = compilar(g);
  const h = 1e-5 * Math.max(1, x);
  const dnum = (G({ x: x + h }) - G({ x: x - h })) / (2 * h);
  r.verificacion = { metodo: 'Derivada numérica de la relación', coincide: Math.abs(dnum - dgx) < 1e-4 * Math.max(1, Math.abs(dgx)), detalle: `d${Q.nombre}/d${Xv.nombre} ≈ ${f6(dnum)} por cociente incremental.` };
  if (!r.verificacion.coincide) { r.estado = 'advertencia'; r.advertencias.push('Resultado no verificado.'); }
  return r;
}

export { div, resta, contiene, expandir };
