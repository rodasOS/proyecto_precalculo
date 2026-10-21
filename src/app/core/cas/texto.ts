import { Nodo, fraccion } from './ast';

const atomico = (n: Nodo): boolean =>
  n.t === 'var' || n.t === 'cte' || n.t === 'fn' || (n.t === 'num' && n.v >= 0 && Number.isInteger(n.v));

/** Texto en notación de teclado (se puede volver a parsear). */
export function aTexto(n: Nodo): string {
  const p = (x: Nodo) => (atomico(x) ? aTexto(x) : `(${aTexto(x)})`);
  switch (n.t) {
    case 'num': {
      if (Number.isInteger(n.v)) return String(n.v);
      const f = fraccion(n.v);
      return f ? `(${f[0]}/${f[1]})` : String(n.v);
    }
    case 'var': return n.n;
    case 'cte': return n.n;
    case 'fn': return `${n.f}(${aTexto(n.a)})`;
    case 'pot': return `${p(n.b)}^${p(n.e)}`;
    case 'sum': return n.a.map((x) => p(x)).join(' + ');
    case 'prod': return n.a.map((x) => p(x)).join('*');
  }
}
