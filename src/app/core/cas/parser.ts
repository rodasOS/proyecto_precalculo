import { E, Nodo, PI, fn, neg, num, pot, prod, raiz, sum, vr, FUNCIONES } from './ast';
import { ErrorEntrada } from './errores';

type Tok =
  | { k: 'num'; v: number; p: number }
  | { k: 'id'; v: string; p: number }
  | { k: 'op'; v: string; p: number }
  | { k: 'fin'; p: number };

const VARIABLES = new Set(['x', 't']);
const SUP: Record<string, string> = { '²': '^2', '³': '^3', '⁴': '^4', '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9' };

/** Convierte símbolos tipográficos y coma decimal a la notación de teclado. */
export function normalizar(s: string): string {
  let r = s
    .replace(/[−–—]/g, '-')
    .replace(/[×·⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/\*\*/g, '^')
    .replace(/[²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUP[c])
    .replace(/(\d),(\d)/g, '$1.$2');
  r = r.replace(/\s+/g, ' ').trim();
  return r;
}

function tokenizar(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      if (s[j] === '.') { j++; while (j < s.length && /[0-9]/.test(s[j])) j++; }
      const txt = s.slice(i, j);
      if (txt === '.' || (txt.match(/\./g) ?? []).length > 1)
        throw new ErrorEntrada(`Número mal escrito «${txt}».`, i);
      out.push({ k: 'num', v: parseFloat(txt), p: i });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const run = s.slice(i, j);
      let p = 0;
      const nombres = [...FUNCIONES, 'sqrt', 'cbrt', 'exp', 'log10', 'pi'].sort((a, b) => b.length - a.length);
      while (p < run.length) {
        const resto = run.slice(p).toLowerCase();
        const cand = nombres.find((nm) => resto.startsWith(nm));
        if (cand === 'pi') {
          out.push({ k: 'id', v: 'pi', p: i + p });
          p += 2;
        } else if (cand) {
          const fin = p + cand.length === run.length;
          if (!(fin && s[j] === '('))
            throw new ErrorEntrada(`Escribe la función con paréntesis, por ejemplo ${cand}(x).`, i + p);
          out.push({ k: 'id', v: cand, p: i + p });
          p += cand.length;
        } else {
          out.push({ k: 'id', v: run[p].toLowerCase(), p: i + p });
          p++;
        }
      }
      i = j;
      continue;
    }
    if (c === '√') { out.push({ k: 'id', v: 'sqrt', p: i }); i++; continue; }
    if ('+-*/^()|'.includes(c)) { out.push({ k: 'op', v: c, p: i }); i++; continue; }
    if (c === '=' || c === '<' || c === '>')
      throw new ErrorEntrada(`El símbolo «${c}» no se admite en una expresión; usa el campo correspondiente.`, i);
    throw new ErrorEntrada(`Símbolo no soportado «${c}».`, i);
  }
  out.push({ k: 'fin', p: s.length });
  return out;
}

class Parser {
  private i = 0;
  constructor(private toks: Tok[]) {}
  private get t(): Tok { return this.toks[this.i]; }
  private op(v: string): boolean { return this.t.k === 'op' && this.t.v === v; }

  parse(): Nodo {
    if (this.t.k === 'fin') throw new ErrorEntrada('Falta ingresar la expresión.', 0);
    const r = this.expr();
    if ((this.t as Tok).k !== 'fin') {
      if (this.op(')')) throw new ErrorEntrada('Hay un paréntesis «)» sin abrir.', this.t.p);
      throw new ErrorEntrada('No se entiende la expresión a partir de aquí.', this.t.p);
    }
    return r;
  }

  private expr(): Nodo {
    const terms: Nodo[] = [this.term()];
    while (this.op('+') || this.op('-')) {
      const o = (this.t as { v: string }).v;
      this.i++;
      if (this.t.k === 'fin' || this.op(')')) throw new ErrorEntrada(`Falta un término después de «${o}».`, this.t.p);
      const x = this.term();
      terms.push(o === '-' ? neg(x) : x);
    }
    return terms.length === 1 ? terms[0] : sum(...terms);
  }

  private empiezaFactor(): boolean {
    const t = this.t;
    return t.k === 'num' || t.k === 'id' || (t.k === 'op' && (t.v === '(' ));
  }

  private term(): Nodo {
    const fs: Nodo[] = [this.unary()];
    for (;;) {
      if (this.op('*')) { this.i++; this.requiereFactor('*'); fs.push(this.unary()); }
      else if (this.op('/')) { this.i++; this.requiereFactor('/'); fs.push(pot(this.unary(), num(-1))); }
      else if (this.empiezaFactor()) fs.push(this.unary());
      else break;
    }
    return fs.length === 1 ? fs[0] : prod(...fs);
  }

  private requiereFactor(o: string): void {
    if (this.t.k === 'fin' || this.op(')') || this.op('*') || this.op('/') || this.op('^'))
      throw new ErrorEntrada(`Falta un valor después de «${o}».`, this.t.p);
  }

  private unary(): Nodo {
    if (this.op('-')) { this.i++; return neg(this.unary()); }
    if (this.op('+')) { this.i++; return this.unary(); }
    return this.power();
  }

  private power(): Nodo {
    const b = this.atom();
    if (this.op('^')) {
      this.i++;
      if (this.t.k === 'fin' || this.op(')')) throw new ErrorEntrada('Falta el exponente después de «^».', this.t.p);
      const e = this.op('-') ? (this.i++, neg(this.powerOperand())) : this.powerOperand();
      return pot(b, e);
    }
    return b;
  }

  private powerOperand(): Nodo { return this.power(); }

  private atom(): Nodo {
    const t = this.t;
    if (t.k === 'num') { this.i++; return num(t.v); }
    if (t.k === 'id') {
      this.i++;
      const nm = t.v;
      if (nm === 'pi') return PI;
      if (nm === 'e') return E;
      if (VARIABLES.has(nm)) return vr(nm);
      const esFn = (FUNCIONES as readonly string[]).includes(nm) || ['sqrt', 'cbrt', 'exp', 'log10'].includes(nm);
      if (esFn) {
        let arg: Nodo;
        if (this.op('(')) arg = this.atom();
        else if (nm === 'sqrt' && (this.t.k === 'num' || this.t.k === 'id')) arg = this.atom();
        else throw new ErrorEntrada(`Escribe la función con paréntesis, por ejemplo ${nm}(x).`, t.p);
        switch (nm) {
          case 'sqrt': return raiz(arg);
          case 'cbrt': return pot(arg, num(1 / 3));
          case 'exp': return pot(E, arg);
          case 'log10': return fn('log', arg);
          default: return fn(nm, arg);
        }
      }
      throw new ErrorEntrada(`«${nm}» no es una variable ni función conocida (se admiten x y t).`, t.p);
    }
    if (t.k === 'op' && t.v === '(') {
      this.i++;
      if (this.op(')')) throw new ErrorEntrada('Hay paréntesis vacíos «()».', t.p);
      const r = this.expr();
      if (!this.op(')')) throw new ErrorEntrada('Falta cerrar un paréntesis «)».', t.p);
      this.i++;
      return r;
    }
    if (t.k === 'op' && t.v === '|') {
      this.i++;
      const r = this.expr();
      if (!this.op('|')) throw new ErrorEntrada('Falta cerrar el valor absoluto «|».', t.p);
      this.i++;
      return fn('abs', r);
    }
    if (t.k === 'fin') throw new ErrorEntrada('La expresión está incompleta.', t.p);
    if (t.k === 'op' && t.v === ')') throw new ErrorEntrada('Hay un paréntesis «)» sin abrir.', t.p);
    throw new ErrorEntrada(`Operador «${(t as { v: string }).v}» en un lugar inesperado.`, t.p);
  }
}

/** Analiza un texto escrito por el usuario y devuelve el árbol. Lanza ErrorEntrada. */
export function parsear(texto: string): Nodo {
  const s = normalizar(texto ?? '');
  if (!s) throw new ErrorEntrada('Falta ingresar la expresión.', 0);
  return new Parser(tokenizar(s)).parse();
}
