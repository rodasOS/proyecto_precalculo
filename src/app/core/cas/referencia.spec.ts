import { describe, expect, it } from 'vitest';
import casos from '../../data/casos-referencia.json';
import { resolverEcuacion } from './algebra';
import { analizar } from './analisis-funcion';
import { derivar } from './derivadas';
import { evaluarEn } from './evaluar';
import { resolverIntegral } from './integrales';
import { resolverLimite } from './limites';
import { parsear } from './parser';

/** Comparación contra SymPy (tools/generar_referencia.py). */
const entrada = (s: string) => s.replace(/Abs\(/g, 'abs(');
const cerca = (a: number, b: number, tol = 1e-5) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

describe('referencia SymPy: derivadas', () => {
  for (const c of casos.derivadas) {
    it(c.f, () => {
      const d = derivar(parsear(entrada(c.f)));
      for (const [x, v] of c.valores as [number, number][]) expect(cerca(evaluarEn(d, x), v, 1e-6), `x=${x}: ${evaluarEn(d, x)} vs ${v}`).toBe(true);
    });
  }
});

describe('referencia SymPy: integrales definidas', () => {
  for (const c of casos.integrales) {
    it(`${c.f} [${c.a}, ${c.b}]`, () => {
      const r = resolverIntegral(entrada(c.f), c.a, c.b);
      expect(r.estado, r.advertencias.join('|')).toBe('ok');
      expect(cerca(parseFloat(r.respuesta.texto), c.valor as number, 1e-5), `${r.respuesta.texto} vs ${c.valor}`).toBe(true);
    });
  }
});

describe('referencia SymPy: límites', () => {
  for (const c of casos.limites) {
    it(`${c.f} → ${c.a}`, () => {
      const r = resolverLimite(entrada(c.f), c.a);
      expect(r.estado, r.advertencias.join('|')).not.toBe('error');
      if (c.tipo === 'valor') expect(cerca(parseFloat(r.respuesta.texto), c.valor as number, 1e-4), `${r.respuesta.texto} vs ${c.valor}`).toBe(true);
      else if (c.tipo === 'inf+') expect(r.respuesta.texto).toBe('+∞');
      else if (c.tipo === 'inf-') expect(r.respuesta.texto).toBe('−∞');
      else expect(r.respuesta.texto).toMatch(/no existe/i);
    });
  }
});

describe('referencia SymPy: ecuaciones', () => {
  for (const c of casos.ecuaciones) {
    it(c.f, () => {
      const r = resolverEcuacion(`${entrada(c.f)} = 0`);
      const got = (r.respuesta.texto.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).sort((a, b) => a - b);
      const esperado = (c.soluciones ?? []) as number[];
      expect(got.length, `${r.respuesta.texto} vs ${esperado}`).toBe(esperado.length);
      got.forEach((v, i) => expect(cerca(v, esperado[i], 1e-3)).toBe(true));
    });
  }
});

describe('referencia SymPy: extremos', () => {
  for (const c of casos.extremos) {
    it(c.f, () => {
      const a = analizar(parsear(entrada(c.f)));
      const esperado = c.criticos as { x: number; y: number; tipo: string }[];
      expect(a.criticos.length).toBe(esperado.length);
      a.criticos.forEach((k, i) => {
        expect(cerca(k.x.v, esperado[i].x, 1e-6)).toBe(true);
        expect(cerca(k.y, esperado[i].y, 1e-6)).toBe(true);
        expect(k.tipo).toBe(esperado[i].tipo);
      });
    });
  }
});
