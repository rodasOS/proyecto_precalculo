import { Nodo, contiene, esNum, fn, igual, neg, num, pot, prod, resta, sum, sustituir, variables, vr, div } from './ast';
import { expandirSimbolico, factorizarSimbolico, resolverSimbolico } from './cas-externo';
import { ErrorEntrada } from './errores';
import { compilar, valorNumerico } from './evaluar';
import { Intervalo, normalizarIntervalos, unionTex, unionTexto } from './intervalos';
import { parsear } from './parser';
import { coeficientes, separarFraccion, unirFracciones } from './polinomios';
import { Raiz, raicesReales, raizTex, raizTexCorto } from './raices';
import { Paso, Resultado, resultadoVacio } from './resultado.model';
import { expandir, simplificar } from './simplificar';
import { aTex } from './tex';
import { equivalentes, fmt } from './verificacion';

const SIGNOS_DES = ['<=', '>=', '≤', '≥', '<', '>'] as const;

/** Separa «izq = der» y lo lleva a f(x) = izq − der. */
function partirIgualdad(texto: string): { izq: Nodo; der: Nodo; hayIgual: boolean } {
  const t = texto.replace(/\s+/g, ' ').trim();
  if (!t) throw new ErrorEntrada('Falta ingresar la ecuación.');
  const partes = t.split('=');
  if (partes.length > 2) throw new ErrorEntrada('La ecuación tiene más de un signo «=».');
  if (partes.length === 1) return { izq: simplificar(parsear(partes[0])), der: num(0), hayIgual: false };
  if (!partes[0].trim() || !partes[1].trim()) throw new ErrorEntrada('Falta uno de los lados de la ecuación.');
  return { izq: simplificar(parsear(partes[0])), der: simplificar(parsear(partes[1])), hayIgual: true };
}

const ladoX = (n: Nodo) => {
  const vs = variables(n);
  if (vs.has('t') && vs.has('x')) throw new ErrorEntrada('Solo se admite una incógnita (x).');
  return vs.has('t') && !vs.has('x') ? sustituir(n, 't', vr('x')) : n;
};

const eq = (n: Nodo) => aTex(n);

/** Módulo Álgebra: ecuaciones. */
export function resolverEcuacion(texto: string): Resultado {
  const r = resultadoVacio('Ecuación');
  let izq: Nodo, der: Nodo, hayIgual: boolean;
  try {
    for (const s of SIGNOS_DES) if (texto.includes(s)) return resolverDesigualdad(texto);
    ({ izq, der, hayIgual } = partirIgualdad(texto));
    izq = ladoX(izq); der = ladoX(der);
  } catch (e) {
    r.estado = 'error';
    r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'No se pudo interpretar la ecuación.');
    return r;
  }
  if (!hayIgual) r.advertencias.push('No escribiste «=»; se interpretó como «expresión = 0».');
  const f = simplificar(resta(izq, der));
  const orig = compilar(sum(izq, neg(der)));
  const original = (x: number) => orig({ x, t: x });
  r.sustitucion = `${eq(izq)} = ${eq(der)}`;
  const pasos: Paso[] = [];
  const unir = unirFracciones(f);
  const { N, D } = separarFraccion(unir);
  const cuerpo = D ? N : f;
  const c = coeficientes(cuerpo);
  pasos.push({ regla: 'Llevar todo a un lado', descripcion: 'Se pasa todo al lado izquierdo para igualar a cero.', latex: `${eq(f)} = 0` });
  if (D) pasos.push({ regla: 'Ecuación racional', descripcion: 'Una fracción vale 0 cuando su numerador es 0 y el denominador no es 0.', latex: `${eq(N)} = 0 \\quad (${eq(D)} \\neq 0)` });

  const tieneAbs = (n: Nodo): boolean => n.t === 'fn' ? n.f === 'abs' || tieneAbs(n.a) : n.t === 'pot' ? tieneAbs(n.b) || tieneAbs(n.e) : n.t === 'sum' || n.t === 'prod' ? n.a.some(tieneAbs) : false;
  const tieneRaiz = (n: Nodo): boolean => n.t === 'pot' ? (esNum(n.e) && !Number.isInteger(n.e.v) && contiene(n.b)) || tieneRaiz(n.b) : n.t === 'fn' ? tieneRaiz(n.a) : n.t === 'sum' || n.t === 'prod' ? n.a.some(tieneRaiz) : false;

  if (c && c.length === 1) {
    r.formula = 'ax + b = 0';
    pasos.push({ regla: 'Sin incógnita', descripcion: Math.abs(c[0]) < 1e-12 ? 'La igualdad se cumple siempre: infinitas soluciones.' : 'La igualdad nunca se cumple: sin solución.', latex: `${fmt(c[0])} = 0` });
    r.pasos = pasos;
    const idem = Math.abs(c[0]) < 1e-12;
    r.respuesta = idem ? { latex: 'x \\in \\mathbb{R}', texto: 'Todos los reales' } : { latex: '\\text{Sin solución}', texto: 'Sin solución' };
    r.estado = idem ? 'advertencia' : 'advertencia';
    r.advertencias.push(idem ? 'Es una identidad: toda x real es solución.' : 'La ecuación no tiene solución.');
    return r;
  }
  if (c && c.length === 2 && !D) {
    r.formula = 'ax + b = 0 \\ \\Rightarrow \\ x = -\\frac{b}{a}';
    const [b, a] = c;
    pasos.push({ regla: 'Ecuación lineal', descripcion: `a = ${fmt(a)}, b = ${fmt(b)}.`, latex: `${fmt(a)}x ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b))} = 0` });
    pasos.push({ regla: 'Despejar x', descripcion: 'Se resta b y se divide entre a.', latex: `x = -\\frac{${fmt(b)}}{${fmt(a)}} = ${aTex(num(-b / a))}` });
  } else if (c && c.length === 3 && !D) {
    const [cc, b, a] = c;
    r.formula = 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    const disc = b * b - 4 * a * cc;
    pasos.push({ regla: 'Identificar coeficientes', descripcion: 'La ecuación tiene la forma ax² + bx + c = 0.', latex: `a = ${fmt(a)},\\ b = ${fmt(b)},\\ c = ${fmt(cc)}` });
    pasos.push({ regla: 'Discriminante', descripcion: 'Δ = b² − 4ac decide cuántas soluciones reales hay.', latex: `\\Delta = (${fmt(b)})^2 - 4(${fmt(a)})(${fmt(cc)}) = ${fmt(disc)}` });
    r.sustitucion += ` \\quad\\Rightarrow\\quad x = \\frac{-(${fmt(b)}) \\pm \\sqrt{${fmt(disc)}}}{2(${fmt(a)})}`;
    if (disc < -1e-12) {
      pasos.push({ regla: 'Δ < 0', descripcion: 'El discriminante es negativo: no hay soluciones reales.', latex: '\\Delta < 0 \\ \\Rightarrow \\ \\text{sin soluciones reales}' });
    } else {
      const sq = simplificar(pot(num(disc), num(0.5)));
      const x1 = simplificar(div(sum(num(-b), neg(sq)), num(2 * a)));
      const x2 = simplificar(div(sum(num(-b), sq), num(2 * a)));
      pasos.push({ regla: 'Aplicar la fórmula general', descripcion: disc === 0 ? 'Δ = 0: una solución doble.' : 'Δ > 0: dos soluciones reales.', latex: disc === 0 ? `x = ${eq(x1)}` : `x_1 = ${eq(x1)},\\quad x_2 = ${eq(x2)}` });
    }
  } else if (c && c.length > 3 && !D) {
    const fac = factorizarSimbolico(expandir(cuerpo));
    r.formula = 'a \\cdot b = 0 \\ \\Rightarrow \\ a = 0 \\ \\text{ o } \\ b = 0';
    if (fac && !igual(simplificar(fac), simplificar(cuerpo)))
      pasos.push({ regla: 'Factorizar', descripcion: 'Se factoriza el polinomio y se iguala a 0 cada factor.', latex: `${eq(fac)} = 0` });
    else pasos.push({ regla: 'Polinomio de grado alto', descripcion: 'No se factoriza con enteros; las raíces se obtienen por método numérico/exacto.', latex: `${eq(cuerpo)} = 0` });
  } else if (tieneAbs(f)) {
    r.formula = '|A| = B \\ \\Rightarrow \\ A = B \\ \\text{ o } \\ A = -B \\ (B \\geq 0)';
    pasos.push({ regla: 'Valor absoluto', descripcion: 'Se consideran los dos casos de la definición |A| = B ⇔ A = B o A = −B.', latex: `${eq(izq)} = ${eq(der)}` });
  } else if (tieneRaiz(f)) {
    r.formula = '\\sqrt{A} = B \\ \\Rightarrow \\ A = B^2 \\ (B \\geq 0)';
    pasos.push({ regla: 'Ecuación con radical', descripcion: 'Se aísla la raíz y se eleva al cuadrado; luego se comprueba cada candidata porque pueden aparecer raíces extrañas.', latex: `${eq(izq)} = ${eq(der)}` });
  }

  // candidatas y comprobación en la ecuación original
  const exactas = c ? [] : resolverSimbolico(cuerpo) ?? [];
  const cand: Raiz[] = [...raicesReales(cuerpo)];
  for (const e of exactas) {
    const v = valorNumerico(e);
    if (Number.isFinite(v) && !cand.some((k) => Math.abs(k.v - v) < 1e-6)) cand.push({ v, ex: simplificar(e) });
  }
  // candidatas extra para radicales: elevar al cuadrado
  if (tieneRaiz(f)) {
    const A = derivarRadical(izq, der);
    if (A) for (const k of raicesReales(A)) {
      if (!cand.some((q) => Math.abs(q.v - k.v) < 1e-6)) cand.push(k);
    }
  }
  const validas: Raiz[] = [];
  const descartadas: Raiz[] = [];
  const denom = D ? compilar(D) : null;
  for (const k of cand) {
    const ok = Math.abs(original(k.v)) < 1e-6 * Math.max(1, Math.abs(k.v)) && Number.isFinite(original(k.v)) && (!denom || Math.abs(denom({ x: k.v, t: k.v })) > 1e-9);
    (ok ? validas : descartadas).push(k);
  }
  validas.sort((a, b) => a.v - b.v);
  for (const d of descartadas) {
    pasos.push({ regla: 'Raíz extraña descartada', descripcion: `x = ${raizTexCorto(d)} no cumple la ecuación original${D && denom && Math.abs(denom({ x: d.v, t: d.v })) <= 1e-9 ? ' (anula el denominador)' : ''}.`, latex: `x = ${raizTexCorto(d)} \\ \\text{(descartada)}` });
    r.advertencias.push(`Se descartó x = ${fmt(Math.round(d.v * 1e4) / 1e4)} por no cumplir la ecuación original${D ? ' o anular el denominador' : ''}.`);
  }
  if (validas.length)
    pasos.push({ regla: 'Comprobación', descripcion: 'Se sustituye cada solución en la ecuación original.', latex: validas.map((v) => `${eq(sustituir(izq, 'x', v.ex ?? num(v.v)))} = ${fmt(Math.round(valorNumerico(simplificar(sustituir(izq, 'x', num(v.v)))) * 1e6) / 1e6)}`).join(',\\quad ') });
  r.pasos = pasos;
  if (!validas.length) {
    r.respuesta = { latex: '\\text{Sin soluciones reales}', texto: 'Sin soluciones reales' };
    if (r.estado === 'ok') r.estado = 'advertencia';
    r.advertencias.push('La ecuación no tiene soluciones reales' + (tieneTrig(f) ? ' en el intervalo explorado [−10, 10].' : '.'));
  } else {
    r.respuesta = { latex: validas.map((v) => `x = ${raizTex(v)}`).join(',\\quad '), texto: validas.map((v) => `x = ${fmt(Math.round(v.v * 1e4) / 1e4)}`).join(', ') };
    if (validas.some((v) => !v.ex)) r.advertencias.push('Algunas soluciones son aproximaciones numéricas.');
    if (tieneTrig(f)) r.advertencias.push('Las funciones trigonométricas tienen infinitas soluciones periódicas; se muestran las de [−10, 10].');
  }
  r.verificacion = {
    metodo: 'Sustitución en la ecuación original',
    coincide: validas.every((v) => Math.abs(original(v.v)) < 1e-6),
    detalle: validas.length ? `Las ${validas.length} solución(es) hacen que ambos lados sean iguales.` : 'No hay soluciones que comprobar.',
  };
  return r;
}

const tieneTrig = (n: Nodo): boolean =>
  n.t === 'fn' ? ['sin', 'cos', 'tan', 'sec', 'csc', 'cot'].includes(n.f) || tieneTrig(n.a) : n.t === 'pot' ? tieneTrig(n.b) || tieneTrig(n.e) : n.t === 'sum' || n.t === 'prod' ? n.a.some(tieneTrig) : false;

/** Para √A = B (cualquier arreglo): devuelve A − B² con B el resto. */
function derivarRadical(izq: Nodo, der: Nodo): Nodo | null {
  const f = simplificar(resta(izq, der));
  const ts = f.t === 'sum' ? f.a : [f];
  const i = ts.findIndex((t) => t.t === 'pot' && esNum(t.e) && Math.abs(t.e.v - 0.5) < 1e-12);
  const j = ts.findIndex((t) => t.t === 'prod' && t.a.length === 2 && esNum(t.a[0]) && t.a[1].t === 'pot' && esNum(t.a[1].e) && Math.abs(t.a[1].e.v - 0.5) < 1e-12);
  const k = i >= 0 ? i : j;
  if (k < 0) return null;
  const rad = ts[k];
  const resto = simplificar(neg(sum(...ts.filter((_, q) => q !== k), num(0))));
  return simplificar(resta(pot(rad, num(2)), pot(resto, num(2))));
}

/** Desigualdades polinomiales y racionales. */
export function resolverDesigualdad(texto: string): Resultado {
  const r = resultadoVacio('Desigualdad');
  let signo: (typeof SIGNOS_DES)[number] | null = null;
  for (const s of SIGNOS_DES) if (texto.includes(s)) { signo = s; break; }
  if (!signo) { r.estado = 'error'; r.advertencias.push('No se encontró ningún signo de desigualdad (<, >, ≤, ≥).'); return r; }
  const [a, b, ...resto] = texto.split(signo);
  let f: Nodo;
  try {
    if (resto.length) throw new ErrorEntrada('Solo se admite un signo de desigualdad.');
    if (!a?.trim() || !b?.trim()) throw new ErrorEntrada('Falta uno de los lados de la desigualdad.');
    f = simplificar(resta(ladoX(parsear(a)), ladoX(parsear(b))));
  } catch (e) {
    r.estado = 'error';
    r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Desigualdad inválida.');
    return r;
  }
  const inc = signo === '<=' || signo === '≤' || signo === '>=' || signo === '≥';
  const mayor = signo === '>' || signo === '>=' || signo === '≥';
  const F = compilar(f);
  const fx = (x: number) => F({ x, t: x });
  r.formula = 'f(x) \\gtrless 0 \\ \\Rightarrow \\ \\text{analizar el signo de } f \\text{ entre sus ceros y asíntotas}';
  r.sustitucion = `${aTex(f)} ${mayor ? (inc ? '\\geq' : '>') : inc ? '\\leq' : '<'} 0`;
  const g = unirFracciones(f);
  const { N, D } = separarFraccion(g);
  const ceros = raicesReales(N);
  const huecos = D ? raicesReales(D) : [];
  const puntos = [...ceros.map((c) => ({ ...c, tipo: 'cero' as const })), ...huecos.map((c) => ({ ...c, tipo: 'hueco' as const }))]
    .sort((p, q) => p.v - q.v)
    .filter((p, i, arr) => i === 0 || Math.abs(p.v - arr[i - 1].v) > 1e-9);
  const fac = factorizarSimbolico(expandir(N));
  r.pasos.push({ regla: 'Llevar a cero', descripcion: 'Se pasa todo a un lado y se compara con 0.', latex: r.sustitucion });
  r.pasos.push({ regla: 'Puntos críticos', descripcion: 'Son los ceros del numerador y los valores que anulan el denominador.', latex: `${fac ? `${aTex(fac)}${D ? ` / ${aTex(D)}` : ''}: ` : ''}${puntos.length ? puntos.map((p) => `x = ${raizTexCorto(p)}`).join(',\\ ') : '\\text{sin puntos críticos}'}` });

  const cumple = (y: number) => (mayor ? y > 1e-12 : y < -1e-12);
  const bordes = [-Infinity, ...puntos.map((p) => p.v), Infinity];
  const tramos: Intervalo[] = [];
  const signos: string[] = [];
  for (let i = 0; i < bordes.length - 1; i++) {
    const lo = bordes[i], hi = bordes[i + 1];
    const m = Number.isFinite(lo) && Number.isFinite(hi) ? (lo + hi) / 2 : Number.isFinite(lo) ? lo + 1 : Number.isFinite(hi) ? hi - 1 : 0;
    const y = fx(m);
    signos.push(Number.isFinite(y) ? (y > 0 ? '+' : '-') : '?');
    if (Number.isFinite(y) && cumple(y)) {
      tramos.push({ lo, hi, loInc: false, hiInc: false, loTex: puntos[i - 1] && raizTexCorto(puntos[i - 1]), hiTex: puntos[i] && raizTexCorto(puntos[i]) });
    }
  }
  r.pasos.push({
    regla: 'Tabla de signos',
    descripcion: 'Se evalúa el signo de f en un punto de cada intervalo.',
    latex: `\\begin{array}{c|${'c'.repeat(signos.length)}} \\text{Intervalo} & ${signos.map((_, i) => `\\left(${bordes[i] === -Infinity ? '-\\infty' : raizTexCorto(puntos[i - 1])},\\ ${bordes[i + 1] === Infinity ? '\\infty' : raizTexCorto(puntos[i])}\\right)`).join(' & ')} \\\\ \\hline \\text{Signo de } f & ${signos.join(' & ')} \\end{array}`,
  });
  // puntos aislados / extremos incluidos
  const extra: Intervalo[] = [];
  if (inc) {
    for (const p of ceros) {
      const y = fx(p.v);
      if (Number.isFinite(y) && Math.abs(y) < 1e-9 && !huecos.some((h) => Math.abs(h.v - p.v) < 1e-9))
        extra.push({ lo: p.v, hi: p.v, loInc: true, hiInc: true, loTex: raizTexCorto(p), hiTex: raizTexCorto(p) });
    }
  }
  const todos = normalizarIntervalos([...tramos, ...extra]);
  // un extremo con fx = 0 y relación inclusiva pertenece al intervalo
  for (const t of todos) {
    if (inc) {
      const lo = ceros.find((c) => Math.abs(c.v - t.lo) < 1e-9 && !huecos.some((h) => Math.abs(h.v - c.v) < 1e-9));
      const hi = ceros.find((c) => Math.abs(c.v - t.hi) < 1e-9 && !huecos.some((h) => Math.abs(h.v - c.v) < 1e-9));
      if (lo) t.loInc = true;
      if (hi) t.hiInc = true;
    }
  }
  const final = normalizarIntervalos(todos);
  r.pasos.push({ regla: 'Conjunto solución', descripcion: `Se eligen los intervalos donde f ${mayor ? 'es positiva' : 'es negativa'}${inc ? ' (y donde f = 0)' : ''}.`, latex: unionTex(final) });
  r.respuesta = { latex: `x \\in ${unionTex(final)}`, texto: `x ∈ ${unionTexto(final)}` };
  if (!final.length) { r.estado = 'advertencia'; r.advertencias.push('La desigualdad no tiene solución real.'); }
  // verificación: puntos de muestra
  const enSol = (x: number) => final.some((i) => (x > i.lo || (x === i.lo && i.loInc)) && (x < i.hi || (x === i.hi && i.hiInc)));
  const malo = [-7.3, -3.1, -1.7, -0.4, 0.3, 1.1, 2.6, 4.9, 8.2].find((x) => Number.isFinite(fx(x)) && enSol(x) !== (mayor ? fx(x) > (inc ? -1e-12 : 1e-12) : fx(x) < (inc ? 1e-12 : -1e-12)));
  r.verificacion = { metodo: 'Evaluación en puntos de prueba', coincide: malo === undefined, detalle: malo === undefined ? 'Los puntos de prueba dentro y fuera del conjunto cumplen (o no) la desigualdad como se espera.' : `Discrepancia en x = ${malo}.` };
  return r;
}

/** Módulo Álgebra: factorización con técnica nombrada y comprobación. */
export function resolverFactorizacion(texto: string): Resultado {
  const r = resultadoVacio('Factorización');
  let f: Nodo;
  try {
    f = ladoX(simplificar(parsear(texto)));
  } catch (e) {
    r.estado = 'error';
    r.advertencias.push(e instanceof ErrorEntrada ? e.message : 'Expresión inválida.');
    return r;
  }
  const c = coeficientes(f);
  if (!c) {
    r.estado = 'no-resuelto';
    r.advertencias.push('Solo se factorizan polinomios en x con coeficientes numéricos.');
    return r;
  }
  r.sustitucion = `P(x) = ${aTex(expandir(f))}`;
  const exp = expandir(f);
  const grado = c.length - 1;
  const tecnicas: string[] = [];
  const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
  const enteros = c.every((k) => Number.isInteger(k));
  const g = enteros ? c.reduce((m, k) => gcd(m, k), 0) : 1;
  const menor = c.findIndex((k) => k !== 0);
  const terms = c.filter((k) => k !== 0).length;
  if (grado === 0) { r.estado = 'advertencia'; r.advertencias.push('Es una constante: no hay nada que factorizar.'); r.respuesta = { latex: aTex(exp), texto: aTex(exp) }; return r; }
  if (g > 1 || menor > 0) tecnicas.push('Factor común');
  const sinComun = c.slice(menor).map((k) => k / (g || 1));
  if (grado - menor === 2 && sinComun.length === 3 && sinComun[1] === 0 && sinComun[0] * sinComun[2] < 0 && Math.sqrt(Math.abs(sinComun[0])) % 1 === 0 && Math.sqrt(Math.abs(sinComun[2])) % 1 === 0) tecnicas.push('Diferencia de cuadrados');
  else if (grado - menor === 2 && sinComun.length === 3 && sinComun[1] !== 0) tecnicas.push('Trinomio de la forma ax² + bx + c');
  else if (terms === 2 && grado - menor === 3) tecnicas.push(c[grado] * c[menor] > 0 ? 'Suma de cubos' : 'Diferencia de cubos');
  else if (terms === 4) tecnicas.push('Agrupación de términos');
  else if (grado - menor >= 3) tecnicas.push('Teorema de las raíces racionales (probar divisores de c/a)');

  let fac = factorizarSimbolico(exp);
  const irreducibleQ = !fac || igual(simplificar(fac), simplificar(exp));
  if (irreducibleQ && grado === 2) {
    const [cc, b, a] = c;
    const disc = b * b - 4 * a * cc;
    if (disc > 0) {
      const s = simplificar(pot(num(disc), num(0.5)));
      const x1 = simplificar(div(sum(num(-b), neg(s)), num(2 * a)));
      const x2 = simplificar(div(sum(num(-b), s), num(2 * a)));
      fac = simplificar(prod(num(a), sum(vr(), neg(x1)), sum(vr(), neg(x2))));
      tecnicas.splice(0, tecnicas.length, 'Raíces por fórmula general (no son enteras)');
      r.pasos.push({ regla: 'Raíces con fórmula general', descripcion: `Δ = ${fmt(disc)} > 0 pero no es cuadrado perfecto: las raíces son irracionales.`, latex: `x_1 = ${aTex(x1)},\\ x_2 = ${aTex(x2)}` });
    }
  }
  const sinFactorizar = !fac || igual(simplificar(fac), simplificar(exp));
  if (sinFactorizar) {
    r.estado = 'advertencia';
    const enReales = grado === 2 ? 'irreducible en los reales (Δ < 0)' : 'no se factoriza con coeficientes racionales; no se inventan factores';
    r.advertencias.push(`El polinomio es ${enReales}.`);
    r.pasos.push({ regla: 'Irreducible', descripcion: `Se probaron las técnicas: ${tecnicas.join(', ') || 'ninguna aplica'}.`, latex: `${aTex(exp)}` });
    r.respuesta = { latex: `${aTex(exp)}\\ \\text{(irreducible)}`, texto: 'Irreducible' };
    r.formula = '';
    return r;
  }
  r.formula = tecnicas.length ? `\\text{Técnica: ${tecnicas.join(' + ')}}` : '';
  r.pasos.push({ regla: tecnicas[0] ?? 'Factorización', descripcion: descTecnica(tecnicas[0]), latex: `${aTex(exp)} = ${aTex(fac!)}` });
  for (const t of tecnicas.slice(1)) r.pasos.push({ regla: t, descripcion: descTecnica(t), latex: `${aTex(exp)} = ${aTex(fac!)}` });
  const prodExp = expandirSimbolico(fac!) ?? expandir(fac!);
  r.pasos.push({ regla: 'Comprobación', descripcion: 'Se multiplican los factores y debe recuperarse el polinomio original.', latex: `${aTex(fac!)} = ${aTex(simplificar(prodExp))}` });
  const ok = equivalentes(fac!, exp) && equivalentes(prodExp, exp);
  r.verificacion = { metodo: 'Multiplicar los factores', coincide: ok, detalle: ok ? 'El producto de los factores coincide con el polinomio original.' : 'El producto no coincide.' };
  if (!ok) { r.estado = 'advertencia'; r.advertencias.push('Resultado no verificado.'); }
  r.respuesta = { latex: `${aTex(exp)} = ${aTex(fac!)}`, texto: aTex(fac!) };
  return r;
}

function descTecnica(t?: string): string {
  switch (t) {
    case 'Factor común': return 'Se extrae el mayor factor que divide a todos los términos.';
    case 'Diferencia de cuadrados': return 'a² − b² = (a − b)(a + b).';
    case 'Trinomio de la forma ax² + bx + c': return 'Se buscan dos números que multiplicados den a·c y sumados den b.';
    case 'Suma de cubos': return 'a³ + b³ = (a + b)(a² − ab + b²).';
    case 'Diferencia de cubos': return 'a³ − b³ = (a − b)(a² + ab + b²).';
    case 'Agrupación de términos': return 'Se agrupan los términos de dos en dos y se extrae factor común de cada grupo.';
    case 'Teorema de las raíces racionales (probar divisores de c/a)': return 'Las raíces racionales p/q cumplen que p divide al término independiente y q al coeficiente principal.';
    default: return 'Se factoriza el polinomio.';
  }
}

export { fn };
