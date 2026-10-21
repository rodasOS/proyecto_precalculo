import nerdamer from 'nerdamer';
import { Nodo } from './ast';
import { esNum } from './ast';
import { ErrorEntrada } from './errores';
import { parsear } from './parser';
import { simplificar } from './simplificar';
import { aTexto } from './texto';

/** nerdamer puede tardar muchísimo con exponentes enormes o expresiones gigantes: se evita. */
function peligroso(n: Nodo): boolean {
  let tam = 0;
  const rec = (x: Nodo): boolean => {
    if (++tam > 400) return true;
    switch (x.t) {
      case 'pot':
        if (esNum(x.e)) return Math.abs(x.e.v) > 40 || rec(x.b);
        // exponente variable: solo se admite e^(expresión corta); torres como x^x^x cuelgan a nerdamer
        return !(x.b.t === 'cte' && (x.e.t === 'var' || (x.e.t === 'prod' && x.e.a.length <= 2 && x.e.a.every((y) => y.t === 'var' || y.t === 'num')))) ;
      case 'fn': return rec(x.a);
      case 'sum': case 'prod': return x.a.some(rec);
      default: return false;
    }
  };
  return rec(n);
}

const paraNerdamer = (n: Nodo) => aTexto(n).replace(/\bln\(/g, 'log(');
const deNerdamer = (s: string) => simplificar(parsear(s.replace(/\blog\(/g, 'ln(').replace(/\*\*/g, '^')));

/** Raíces simbólicas de n = 0 devueltas por nerdamer; descarta las no reales o no interpretables. */
export function resolverSimbolico(n: Nodo, v = 'x'): Nodo[] | null {
  if (peligroso(n)) return null;
  try {
    const sols = nerdamer.solve(`${paraNerdamer(n)}=0`, v);
    const txt = sols.toString().replace(/^[\[{]|[\]}]$/g, '');
    if (!txt.trim()) return [];
    const partes = trocear(txt);
    const out: Nodo[] = [];
    for (const p of partes) {
      try { out.push(deNerdamer(p)); } catch (e) { if (!(e instanceof ErrorEntrada)) throw e; }
    }
    return out;
  } catch {
    return null;
  }
}

function trocear(s: string): string[] {
  const out: string[] = [];
  let nivel = 0;
  let ini = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') nivel++;
    else if (s[i] === ')') nivel--;
    else if (s[i] === ',' && nivel === 0) { out.push(s.slice(ini, i)); ini = i + 1; }
  }
  out.push(s.slice(ini));
  return out.map((x) => x.trim()).filter(Boolean);
}

/** Factorización simbólica; null si no se pudo. */
export function factorizarSimbolico(n: Nodo): Nodo | null {
  if (peligroso(n)) return null;
  try {
    return deNerdamer(nerdamer(`factor(${paraNerdamer(n)})`).toString());
  } catch {
    return null;
  }
}

export function expandirSimbolico(n: Nodo): Nodo | null {
  if (peligroso(n)) return null;
  try {
    return deNerdamer(nerdamer(`expand(${paraNerdamer(n)})`).toString());
  } catch {
    return null;
  }
}
