import { Nodo, esNum, fraccion } from './ast';

const NOMBRES: Record<string, string> = {
  sin: '\\sin', cos: '\\cos', tan: '\\tan', sec: '\\sec', csc: '\\csc', cot: '\\cot',
  asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan',
  sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh', ln: '\\ln', log: '\\log',
};

function numTex(v: number): string {
  const f = fraccion(v);
  if (f && f[1] !== 1) return `${f[0] < 0 ? '-' : ''}\\frac{${Math.abs(f[0])}}{${f[1]}}`;
  if (f) return String(f[0]);
  return String(Math.round(v * 1e6) / 1e6);
}

const envolver = (s: string) => `\\left(${s}\\right)`;

/** ¿La cadena TeX empieza con un signo menos? */
const empiezaNeg = (s: string) => s.startsWith('-');

function esNegativo(n: Nodo): boolean {
  if (esNum(n)) return n.v < 0;
  if (n.t === 'prod' && esNum(n.a[0])) return n.a[0].v < 0;
  return false;
}

function fnTex(n: Extract<Nodo, { t: 'fn' }>): string {
  const a = aTex(n.a);
  if (n.f === 'abs') return `\\left|${a}\\right|`;
  return `${NOMBRES[n.f] ?? n.f}${envolver(a)}`;
}

/** Factor dentro de un producto: envuelve sumas y negativos. */
function factorTex(n: Nodo): string {
  if (n.t === 'sum') return envolver(aTex(n));
  const s = aTex(n);
  if (empiezaNeg(s) || (esNum(n) && fraccion(n.v)?.[1] !== 1)) return envolver(s);
  return s;
}

function baseTex(b: Nodo): string {
  if (b.t === 'var' || b.t === 'cte' || (esNum(b) && b.v >= 0 && Number.isInteger(b.v))) return aTex(b);
  if (b.t === 'fn') {
    if (b.f === 'abs') return aTex(b);
    return aTex(b);
  }
  return envolver(aTex(b));
}

/** LaTeX de una expresión. */
export function aTex(n: Nodo): string {
  switch (n.t) {
    case 'num': return numTex(n.v);
    case 'var': return n.n;
    case 'cte': return n.n === 'pi' ? '\\pi' : 'e';
    case 'fn': return fnTex(n);
    case 'pot': {
      if (esNum(n.e) && Math.abs(n.e.v - 0.5) < 1e-12) return `\\sqrt{${aTex(n.b)}}`;
      if (esNum(n.e) && Math.abs(n.e.v - 1 / 3) < 1e-12) return `\\sqrt[3]{${aTex(n.b)}}`;
      if (esNum(n.e) && n.e.v < 0)
        return `\\frac{1}{${n.e.v === -1 ? aTex(n.b) : aTex({ t: 'pot', b: n.b, e: { t: 'num', v: -n.e.v } })}}`;
      if (n.b.t === 'fn' && n.b.f !== 'abs' && esNum(n.e) && Number.isInteger(n.e.v) && n.e.v > 0) {
        return `${NOMBRES[n.b.f] ?? n.b.f}^{${aTex(n.e)}}${envolver(aTex(n.b.a))}`;
      }
      return `${baseTex(n.b)}^{${aTex(n.e)}}`;
    }
    case 'sum': {
      let s = '';
      n.a.forEach((t, i) => {
        const ts = aTex(t);
        if (i === 0) s = ts;
        else s += empiezaNeg(ts) ? ` - ${ts.slice(1)}` : ` + ${ts}`;
      });
      return s;
    }
    case 'prod': {
      const arriba: Nodo[] = [];
      const abajo: Nodo[] = [];
      let c = 1;
      for (const f of n.a) {
        if (esNum(f)) c *= f.v;
        else if (f.t === 'pot' && esNum(f.e) && f.e.v < 0)
          abajo.push(f.e.v === -1 ? f.b : { t: 'pot', b: f.b, e: { t: 'num', v: -f.e.v } });
        else arriba.push(f);
      }
      const fr = fraccion(c);
      const signoFinal = c < 0 ? '-' : '';
      let denom = 1;
      let numStr: string | null;
      if (fr) {
        const absN = Math.abs(fr[0]);
        denom = fr[1];
        numStr = absN !== 1 || arriba.length === 0 ? String(absN) : null;
      } else numStr = numTex(Math.abs(c));
      const num_: string[] = numStr ? [numStr] : [];
      const unir = (fs: Nodo[], previos: string[], enFraccion = false) => {
        if (enFraccion && !previos.length && fs.length === 1) return aTex(fs[0]);
        const out = [...previos];
        for (const f of fs) {
          const s = factorTex(f);
          const prev = out[out.length - 1];
          out.push(prev !== undefined && /\d$/.test(prev) && /^\d/.test(s) ? `\\cdot ${s}` : s);
        }
        return out.join(' ');
      };
      const hayFraccion = abajo.length > 0 || denom !== 1;
      const top = unir(arriba, num_, hayFraccion) || '1';
      const dparts: string[] = denom !== 1 ? [String(denom)] : [];
      if (abajo.length || dparts.length) {
        const bot = unir(abajo, dparts, true);
        return `${signoFinal}\\frac{${top}}{${bot}}`;
      }
      return `${signoFinal}${top}`;
    }
  }
}

export { esNegativo };
