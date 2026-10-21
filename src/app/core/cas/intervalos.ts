import { fmt } from './verificacion';

export interface Intervalo {
  lo: number;
  hi: number;
  loInc: boolean;
  hiInc: boolean;
  /** Texto LaTeX de los extremos (exactos si se conocen). */
  loTex?: string;
  hiTex?: string;
}

/** Une intervalos contiguos y ordena; descarta vacíos. */
export function normalizarIntervalos(xs: Intervalo[]): Intervalo[] {
  const v = xs.filter((i) => i.lo < i.hi || (i.lo === i.hi && i.loInc && i.hiInc)).sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  const out: Intervalo[] = [];
  for (const i of v) {
    const p = out[out.length - 1];
    if (p && (Math.abs(p.hi - i.lo) < 1e-9) && (p.hiInc || i.loInc)) {
      p.hi = i.hi; p.hiInc = i.hiInc; p.hiTex = i.hiTex;
    } else out.push({ ...i });
  }
  return out;
}

const ext = (v: number, tx: string | undefined) =>
  v === -Infinity ? '-\\infty' : v === Infinity ? '\\infty' : (tx ?? fmt(Math.round(v * 1e4) / 1e4));

export function intervaloTex(i: Intervalo): string {
  if (i.lo === i.hi) return `\\left\\{${ext(i.lo, i.loTex)}\\right\\}`;
  const a = i.loInc && Number.isFinite(i.lo) ? '[' : '(';
  const b = i.hiInc && Number.isFinite(i.hi) ? ']' : ')';
  return `${a}${ext(i.lo, i.loTex)},\\ ${ext(i.hi, i.hiTex)}${b}`;
}

export function unionTex(xs: Intervalo[]): string {
  return xs.length ? xs.map(intervaloTex).join(' \\cup ') : '\\emptyset';
}

export function intervaloTexto(i: Intervalo): string {
  const t = (v: number) => (v === -Infinity ? '−∞' : v === Infinity ? '∞' : fmt(Math.round(v * 1e4) / 1e4));
  if (i.lo === i.hi) return `{${t(i.lo)}}`;
  return `${i.loInc && Number.isFinite(i.lo) ? '[' : '('}${t(i.lo)}, ${t(i.hi)}${i.hiInc && Number.isFinite(i.hi) ? ']' : ')'}`;
}

export const unionTexto = (xs: Intervalo[]) => (xs.length ? xs.map(intervaloTexto).join(' ∪ ') : '∅');

/** Lee un conjunto de intervalos escrito por el usuario: «[1, 3) U (3, inf)», «(-inf, 2]», «todos los reales»… */
export function parsearIntervalos(texto: string): Intervalo[] | null {
  const t = texto.toLowerCase().replace(/−/g, '-').replace(/∞/g, 'inf').replace(/∪/g, 'u').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (/^(r|reales|todos los reales|ℝ)$/.test(t)) return [{ lo: -Infinity, hi: Infinity, loInc: false, hiInc: false }];
  const trozos = t.split(/\s*(?:u|o)\s*/).filter(Boolean);
  const out: Intervalo[] = [];
  for (const tr of trozos) {
    const m = tr.match(/^([[(])\s*([^,;]+?)\s*[,;]\s*([^,;]+?)\s*([\])])$/);
    if (!m) return null;
    const val = (s: string) => {
      s = s.replace(/^\+/, '');
      if (s === 'inf' || s === 'infinito') return Infinity;
      if (s === '-inf' || s === '-infinito') return -Infinity;
      const n = Number(s.replace(',', '.'));
      if (Number.isFinite(n)) return n;
      const f = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
      return f ? Number(f[1]) / Number(f[2]) : NaN;
    };
    const lo = val(m[2]), hi = val(m[3]);
    if (Number.isNaN(lo) || Number.isNaN(hi)) return null;
    out.push({ lo, hi, loInc: m[1] === '[', hiInc: m[4] === ']' });
  }
  return normalizarIntervalos(out);
}

export function igualesIntervalos(a: Intervalo[], b: Intervalo[]): boolean {
  const A = normalizarIntervalos(a), B = normalizarIntervalos(b);
  if (A.length !== B.length) return false;
  const eq = (x: number, y: number) => x === y || Math.abs(x - y) < 1e-6;
  return A.every((i, k) => eq(i.lo, B[k].lo) && eq(i.hi, B[k].hi) && (i.loInc === B[k].loInc || !Number.isFinite(i.lo)) && (i.hiInc === B[k].hiInc || !Number.isFinite(i.hi)));
}
