import { describe, expect, it } from 'vitest';
import { resolverComposicion, resolverDominio, resolverRango } from './funciones';

describe('dominio', () => {
  it('raíz y denominador', () => expect(resolverDominio('sqrt(x-1)/(x-3)').respuesta.texto).toBe('Dom(f) = [1, 3) ∪ (3, ∞)'));
  it('polinomio', () => expect(resolverDominio('x^2+1').respuesta.texto).toBe('Dom(f) = (−∞, ∞)'));
  it('logaritmo', () => expect(resolverDominio('ln(x+2)').respuesta.texto).toBe('Dom(f) = (-2, ∞)'));
  it('racional', () => expect(resolverDominio('1/(x^2-4)').respuesta.texto).toBe('Dom(f) = (−∞, -2) ∪ (-2, 2) ∪ (2, ∞)'));
  it('error', () => expect(resolverDominio('sqrt(').estado).toBe('error'));
});

describe('rango', () => {
  it('parábola', () => expect(resolverRango('x^2 + 1').respuesta.texto).toBe('Rango(f) = [1, ∞)'));
  it('raíz', () => expect(resolverRango('sqrt(x)').respuesta.texto).toBe('Rango(f) = [0, ∞)'));
  it('racional con asíntota', () => expect(resolverRango('1/x').respuesta.texto).toBe('Rango(f) = (−∞, 0) ∪ (0, ∞)'));
  it('cúbica', () => expect(resolverRango('x^3').respuesta.texto).toBe('Rango(f) = (−∞, ∞)'));
  it('seno', () => expect(resolverRango('sin(x)').respuesta.texto).toBe('Rango(f) = [-1, 1]'));
  it('no determinado en lugar de inventar', () => expect(resolverRango('x*sin(x)').estado).toBe('no-resuelto'));
});

describe('composición', () => {
  it('f∘g con evaluación', () => {
    const r = resolverComposicion('x^2 + 1', '2x - 3', '2');
    expect(r.respuesta.texto).toContain('4 x^{2} - 12 x + 10');
    expect(r.pasos.some((p) => p.latex.includes('(f \\circ g)(2) = 2'))).toBe(true);
    expect(r.verificacion?.coincide).toBe(true);
  });
  it('faltan datos', () => expect(resolverComposicion('x', '').estado).toBe('error'));
});
